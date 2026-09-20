import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyConnecticutResidency, getAgeVerificationRevision, getProcessingInputs, hydrateProcessingAccess,
} from './processingAccess';
import type { ConnecticutResidency } from './launchProcessingPolicy';

const KEY = '@flapfit/connecticut-residency-v1';
let answer: ConnecticutResidency | null = null;
let hydration: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
let revision = 0;
let changing = false;
let saveUnconfirmed = false;
const valid = (value: unknown): value is ConnecticutResidency =>
  value === 'resident' || value === 'not-resident' || value === 'unknown';

/** Stores only the user's minimal residency answer. No age bounds, precise
 * location, device identity or purpose permission is stored or transmitted. */
export async function restoreRegionalClarification(): Promise<void> {
  if (!hydration) hydration = (async () => {
    await hydrateProcessingAccess();
    const before = revision;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const value = raw ? JSON.parse(raw) : null;
      if (before === revision && value?.version === 1 && valid(value.answer)) answer = value.answer;
    } catch { /* Unreadable evidence cannot clear a regional restriction. */ }
  })();
  await hydration;
  if (answer !== null && !changing && !saveUnconfirmed) applyConnecticutResidency(answer);
}

export function hasConnecticutClarificationControl(): boolean {
  const input = getProcessingInputs();
  return !!input.launch?.current && input.launch.country === 'US' &&
    input.launch.plan?.ageEligibility === 'allowed' && input.launch.plan.treatment !== 'unspecified' &&
    !input.appleAccessRestricted;
}
export function needsConnecticutClarification(): boolean {
  const input = getProcessingInputs();
  return hasConnecticutClarificationControl() && input.launch?.options.connecticutResidency === undefined &&
    (input.choices.ads.decision !== 'denied' || input.choices.analytics.decision !== 'denied');
}
export function connecticutClarificationStatus(): string {
  if (saveUnconfirmed) return 'Answer save not confirmed · choose your answer again to retry';
  if (changing) return 'Saving your answer';
  const value = getProcessingInputs().launch?.options.connecticutResidency;
  return value === 'resident' ? 'Connecticut resident' : value === 'not-resident' ? 'Not a Connecticut resident' :
    value === 'unknown' ? 'Not sure · regional restrictions remain' : 'Not answered';
}

export async function saveConnecticutResidency(value: ConnecticutResidency): Promise<void> {
  if (!valid(value) || !hasConnecticutClarificationControl()) throw new Error('Privacy eligibility changed. Reopen Info to review your choices.');
  const token = ++revision;
  const ageRevision = getAgeVerificationRevision();
  changing = true;
  saveUnconfirmed = false;
  // Close the affected route synchronously. An unsaved permissive answer never
  // enables processing; changing residency never changes an independent refusal.
  applyConnecticutResidency(value === 'resident' ? 'resident' : 'unknown');
  const operation = writes.catch(() => undefined).then(async () => {
    await restoreRegionalClarification();
    await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, answer: value }));
    answer = value;
    if (token === revision && ageRevision === getAgeVerificationRevision() && hasConnecticutClarificationControl()) {
      applyConnecticutResidency(value);
    }
  });
  writes = operation;
  try { await operation; }
  catch { if (token === revision) saveUnconfirmed = true; throw new Error('Your answer could not be saved. Advertising and reporting stay restricted for now. Choose your answer again to retry.'); }
  finally { if (token === revision) changing = false; }
}
