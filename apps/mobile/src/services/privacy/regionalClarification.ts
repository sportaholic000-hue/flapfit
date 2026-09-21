import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyConnecticutResidency, applyQuebecResidency, getAgeVerificationRevision, getProcessingInputs, hydrateProcessingAccess,
} from './processingAccess';
import type { ConnecticutResidency, QuebecResidency } from './launchProcessingPolicy';

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
async function restoreConnecticutClarification(): Promise<void> {
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

const QUEBEC_KEY = '@flapfit/quebec-residency-v1';
let quebecAnswer: QuebecResidency | null = null;
let quebecHydration: Promise<void> | null = null;
let quebecReadConfirmed = false;
let quebecReadFailed = false;
let quebecWrites: Promise<void> = Promise.resolve();
let quebecRevision = 0;
let quebecChanging = false;
let quebecSaveUnconfirmed = false;

async function restoreQuebecClarification(): Promise<void> {
  await hydrateProcessingAccess();
  if (!quebecReadConfirmed && !quebecHydration) {
    const before = quebecRevision;
    quebecHydration = (async () => {
      try {
        const raw = await AsyncStorage.getItem(QUEBEC_KEY);
        const value = raw === null ? null : JSON.parse(raw);
        if (raw !== null && (value?.version !== 1 || !valid(value.answer))) throw new Error('Invalid regional answer');
        if (before === quebecRevision) quebecAnswer = value?.answer ?? null;
        quebecReadConfirmed = true;
        quebecReadFailed = false;
      } catch { quebecReadFailed = true; }
    })().finally(() => { quebecHydration = null; });
  }
  await quebecHydration;
  if (quebecAnswer !== null && !quebecChanging && !quebecSaveUnconfirmed && !quebecReadFailed) applyQuebecResidency(quebecAnswer);
}
export async function restoreRegionalClarification(): Promise<void> {
  await Promise.all([restoreConnecticutClarification(), restoreQuebecClarification()]);
}
export function hasQuebecClarificationControl(): boolean {
  const input = getProcessingInputs();
  return input.hydrated && !!input.launch?.current && input.launch.country === 'CA' &&
    input.launch.plan?.ageEligibility === 'allowed' && !input.appleAccessRestricted;
}
export function needsQuebecClarification(): boolean {
  const input = getProcessingInputs();
  return hasQuebecClarificationControl() && input.launch?.options.quebecResidency === undefined &&
    (input.choices.ads.decision !== 'denied' || input.choices.analytics.decision !== 'denied');
}
export function quebecClarificationStatus(): string {
  if (quebecSaveUnconfirmed) return 'Answer save not confirmed · choose your answer again to retry';
  if (quebecChanging) return 'Saving your answer';
  if (quebecReadFailed) return 'Saved answer unavailable · choose your answer again';
  const value = getProcessingInputs().launch?.options.quebecResidency;
  return value === 'resident' ? 'Quebec resident' : value === 'not-resident' ? 'Canadian resident outside Quebec' :
    value === 'unknown' ? 'Province not confirmed · choose an answer to apply regional rules' : 'Not answered';
}
export async function saveQuebecResidency(value: QuebecResidency): Promise<void> {
  if (!valid(value) || !hasQuebecClarificationControl()) throw new Error('Privacy eligibility changed. Reopen Info to review your choices.');
  const token = ++quebecRevision;
  const ageRevision = getAgeVerificationRevision();
  quebecChanging = true;
  quebecSaveUnconfirmed = false;
  // Close the affected route before an asynchronous save. Preserve all refusals.
  applyQuebecResidency(value === 'resident' ? 'resident' : 'unknown');
  const operation = quebecWrites.catch(() => undefined).then(async () => {
    await restoreQuebecClarification();
    await AsyncStorage.setItem(QUEBEC_KEY, JSON.stringify({ version: 1, answer: value }));
    quebecAnswer = value;
    quebecReadConfirmed = true;
    quebecReadFailed = false;
    if (token === quebecRevision && ageRevision === getAgeVerificationRevision() && hasQuebecClarificationControl()) applyQuebecResidency(value);
  });
  quebecWrites = operation;
  try { await operation; }
  catch {
    if (token === quebecRevision) quebecSaveUnconfirmed = true;
    throw new Error('Your province answer could not be saved. Choose your answer again to retry.');
  } finally { if (token === quebecRevision) quebecChanging = false; }
}
