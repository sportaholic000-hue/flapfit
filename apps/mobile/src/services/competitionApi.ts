import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';
import 'react-native-url-polyfill/auto';
import { ONLINE_SERVICES } from '@/config/release';
import { COMPETITION_TERMS_VERSION, useGameStore } from '@/utils/game/store';

const FUNCTION_NAME = 'flapfit-game';

let client: SupabaseClient | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export class CompetitionUnavailableError extends Error {
  constructor(message = 'Online competition is not available yet.') {
    super(message);
    this.name = 'CompetitionUnavailableError';
  }
}

export class CompetitionTermsRequiredError extends Error {
  constructor(message = 'Accept the online competition terms before using Compete.') {
    super(message);
    this.name = 'CompetitionTermsRequiredError';
  }
}

export const competitionIsConfigured = Boolean(
  ONLINE_SERVICES.supabaseUrl && ONLINE_SERVICES.supabasePublishableKey
);

function updateAutoRefresh(state: AppStateStatus) {
  if (!client) return;
  if (state === 'active') client.auth.startAutoRefresh();
  else client.auth.stopAutoRefresh();
}

function getClient(): SupabaseClient {
  if (!competitionIsConfigured) throw new CompetitionUnavailableError();
  if (client) return client;

  client = createClient(ONLINE_SERVICES.supabaseUrl, ONLINE_SERVICES.supabasePublishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  appStateSubscription ??= AppState.addEventListener('change', updateAutoRefresh);
  updateAutoRefresh(AppState.currentState);
  return client;
}

async function anonymousUser(): Promise<{ client: SupabaseClient; user: User }> {
  const supabase = getClient();
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw sessionResult.error;
  if (sessionResult.data.session?.user) {
    return { client: supabase, user: sessionResult.data.session.user };
  }

  const signInResult = await supabase.auth.signInAnonymously();
  if (signInResult.error || !signInResult.data.user || !signInResult.data.session) {
    throw signInResult.error ?? new Error('Could not create an anonymous game profile.');
  }
  return { client: supabase, user: signInResult.data.user };
}

type CompetitionRequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
};

export async function competitionRequest<T>(
  path: string,
  options: CompetitionRequestOptions = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const requiresCurrentTerms = !(method === 'DELETE' && path === '/me');
  if (
    requiresCurrentTerms &&
    useGameStore.getState().competitionTermsVersion !== COMPETITION_TERMS_VERSION
  ) {
    throw new CompetitionTermsRequiredError();
  }

  const { client: supabase } = await anonymousUser();
  const sessionResult = await supabase.auth.getSession();
  const accessToken = sessionResult.data.session?.access_token;
  if (!accessToken) throw new CompetitionUnavailableError('Online session could not be started.');

  const response = await fetch(
    `${ONLINE_SERVICES.supabaseUrl}/functions/v1/${FUNCTION_NAME}${path}`,
    {
      method,
      headers: {
        apikey: ONLINE_SERVICES.supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(requiresCurrentTerms ? { 'X-FlapFit-Terms-Version': COMPETITION_TERMS_VERSION } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }
  );

  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Online request failed (${response.status}).`);
  }
  if (payload == null) throw new Error('Online service returned an empty response.');
  return payload;
}

export async function deleteCompetitionIdentity(): Promise<void> {
  if (!competitionIsConfigured) return;
  const supabase = getClient();
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw sessionResult.error;
  if (!sessionResult.data.session?.user) return;

  await competitionRequest<{ deleted: true }>('/me', { method: 'DELETE' });
  await supabase.auth.signOut({ scope: 'local' });
}
