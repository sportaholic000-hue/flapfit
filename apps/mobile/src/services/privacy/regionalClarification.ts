import AsyncStorage from '@react-native-async-storage/async-storage';
import { residencyName } from '@/config/residency';
import {
  applyConnecticutResidency, applyQuebecResidency, getAgeVerificationRevision, getProcessingInputs, hydrateProcessingAccess,
} from './processingAccess';
type RegionalAnswer = 'resident' | 'not-resident';

const KEY = '@flapfit/connecticut-residency-v1';
let answer: RegionalAnswer | null = null;
let stateCode: string | null = null;
let hydration: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
let revision = 0;
let changing = false;
let saveUnconfirmed = false;
const validAnswer = (value: unknown): value is RegionalAnswer =>
  value === 'resident' || value === 'not-resident';
// Read old unknown records without interpreting them as an answer or rewriting choices.
const validStored = (value: unknown) => validAnswer(value) || value === 'unknown';

function savedCode(region: 'province' | 'state', value: { code?: unknown; answer?: unknown }): string | null {
  const code = value.code;
  if (typeof code !== 'string' || !residencyName(region, code)) return null;
  return (code === (region === 'province' ? 'QC' : 'CT') ? 'resident' : 'not-resident') === value.answer ? code : null;
}
/** Province/state selections stay on this device; the policy still uses the
 * existing residency answer. Neither selection is sent to advertising providers. */
async function restoreConnecticutClarification(): Promise<void> {
  if (!hydration) hydration = (async () => {
    await hydrateProcessingAccess();
    const before = revision;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const value = raw ? JSON.parse(raw) : null;
      if (before === revision && value?.version === 1 && validStored(value.answer)) {
        answer = validAnswer(value.answer) ? value.answer : null;
        stateCode = savedCode('state', value);
      }
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
  return hasConnecticutClarificationControl() && (changing || saveUnconfirmed || !validAnswer(input.launch?.options.connecticutResidency)) &&
    !input.launch?.options.newYorkProtectedHistory && !input.launch?.plan?.newYorkKnownContext;
}
/** Confirmed saved answer for UI selection only; never infer it from protection state. */
export function getSavedConnecticutResidency(): RegionalAnswer | null {
  return changing || saveUnconfirmed ? null : answer;
}
export function getSavedStateName(): string | null {
  const saved = getSavedConnecticutResidency();
  if (!saved) return null;
  return residencyName('state', stateCode) ?? (saved === 'resident' ? 'Connecticut' : 'Saved answer');
}
export function saveStateSelection(code: string): Promise<void> {
  if (!residencyName('state', code)) return Promise.reject(new Error('Choose a state or territory.'));
  return saveConnecticutResidency(code === 'CT' ? 'resident' : 'not-resident', code);
}
export function connecticutClarificationStatus(): string {
  if (saveUnconfirmed) return 'Answer save not confirmed · choose your answer again to retry';
  if (changing) return 'Saving your answer';
  return getSavedStateName() ?? 'Not answered';
}

export async function saveConnecticutResidency(value: RegionalAnswer, code?: string): Promise<void> {
  if (code !== undefined && savedCode('state', { code, answer: value }) === null) throw new Error('Choose a state or territory.');
  if (!validAnswer(value)) throw new Error('Choose Yes or No for the regional question.');
  if (!hasConnecticutClarificationControl()) throw new Error('Privacy eligibility changed. Reopen Info to review your choices.');
  const token = ++revision;
  const ageRevision = getAgeVerificationRevision();
  changing = true;
  saveUnconfirmed = false;
  // Close the affected route synchronously. An unsaved permissive answer never
  // enables processing; changing residency never changes an independent refusal.
  applyConnecticutResidency(value === 'resident' ? 'resident' : 'unknown');
  const operation = writes.catch(() => undefined).then(async () => {
    await restoreRegionalClarification();
    await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, answer: value, ...(code ? { code } : {}) }));
    answer = value;
    stateCode = savedCode('state', { code, answer: value });
    if (token === revision && ageRevision === getAgeVerificationRevision() && hasConnecticutClarificationControl()) {
      applyConnecticutResidency(value);
    }
  });
  writes = operation;
  try { await operation; }
  catch { if (token === revision) saveUnconfirmed = true; throw new Error('Your answer could not be saved. Choose your answer again to retry.'); }
  finally { if (token === revision) changing = false; }
}

const QUEBEC_KEY = '@flapfit/quebec-residency-v1';
let quebecAnswer: RegionalAnswer | null = null;
let provinceCode: string | null = null;
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
        if (raw !== null && (value?.version !== 1 || !validStored(value.answer))) throw new Error('Invalid regional answer');
        if (before === quebecRevision) {
          quebecAnswer = validAnswer(value?.answer) ? value.answer : null;
          provinceCode = value ? savedCode('province', value) : null;
        }
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
  return hasQuebecClarificationControl() && (quebecChanging || quebecSaveUnconfirmed || !validAnswer(input.launch?.options.quebecResidency)) &&
    !(input.launch?.plan?.treatment !== 'unspecified' &&
      (input.launch?.options.newYorkProtectedHistory || input.launch?.plan?.newYorkKnownContext));
}
export function getSavedQuebecResidency(): RegionalAnswer | null {
  return !quebecReadConfirmed || quebecReadFailed || quebecChanging || quebecSaveUnconfirmed ? null : quebecAnswer;
}
export function getSavedProvinceName(): string | null {
  const saved = getSavedQuebecResidency();
  if (!saved) return null;
  return residencyName('province', provinceCode) ?? (saved === 'resident' ? 'Quebec' : 'Saved answer');
}
export function saveProvinceSelection(code: string): Promise<void> {
  if (!residencyName('province', code)) return Promise.reject(new Error('Choose a province or territory.'));
  return saveQuebecResidency(code === 'QC' ? 'resident' : 'not-resident', code);
}
export function quebecClarificationStatus(): string {
  if (quebecSaveUnconfirmed) return 'Answer save not confirmed · choose your answer again to retry';
  if (quebecChanging) return 'Saving your answer';
  if (quebecReadFailed) return 'Saved answer unavailable · choose your answer again';
  return getSavedProvinceName() ?? 'Not answered';
}
export async function saveQuebecResidency(value: RegionalAnswer, code?: string): Promise<void> {
  if (code !== undefined && savedCode('province', { code, answer: value }) === null) throw new Error('Choose a province or territory.');
  if (!validAnswer(value)) throw new Error('Choose Yes or No for the regional question.');
  if (!hasQuebecClarificationControl()) throw new Error('Privacy eligibility changed. Reopen Info to review your choices.');
  const token = ++quebecRevision;
  const ageRevision = getAgeVerificationRevision();
  quebecChanging = true;
  quebecSaveUnconfirmed = false;
  // Close the affected route before an asynchronous save. Preserve all refusals.
  applyQuebecResidency(value === 'resident' ? 'resident' : 'unknown');
  const operation = quebecWrites.catch(() => undefined).then(async () => {
    await restoreQuebecClarification();
    await AsyncStorage.setItem(QUEBEC_KEY, JSON.stringify({ version: 1, answer: value, ...(code ? { code } : {}) }));
    quebecAnswer = value;
    provinceCode = savedCode('province', { code, answer: value });
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
