import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  clearAgeVerification, getAgeVerificationRevision, getProcessingInputs, hydrateProcessingAccess,
  verifyLocalLaunchAgeEvidence,
} from './processingAccess';
import type { AgeEvidence } from './processingPolicy';

const KEY = '@flapfit/local-age-answer-v1';
const BANDS = {
  'under-13': { label: 'Under 13', lowerBound: 0, upperBound: 12 },
  '13': { label: '13', lowerBound: 13, upperBound: 13 },
  '13-14': { label: '13–14', lowerBound: 13, upperBound: 14 },
  '13-17': { label: '13–17', lowerBound: 13, upperBound: 17 },
  '14-17': { label: '14–17', lowerBound: 14, upperBound: 17 },
  '15-17': { label: '15–17', lowerBound: 15, upperBound: 17 },
  '18-plus': { label: '18 or older', lowerBound: 18, upperBound: null },
} as const;
export type LocalAgeAnswer = keyof typeof BANDS;
const validAnswer = (value: unknown): value is LocalAgeAnswer =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(BANDS, value);
let answer: LocalAgeAnswer | null = null;
let readConfirmed = false;
let readFailed = false;
let reading: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
let intent = 0;
let saving = false;
let saveUnconfirmed = false;

export function hasLocalAgeControl(): boolean {
  const input = getProcessingInputs();
  return Platform.OS === 'ios' && input.hydrated && input.appleRequirement === 'unsupported' && !input.appleAccessRestricted &&
    !!input.launch?.current && !!input.launch.country;
}
export function needsLocalAgeAnswer(): boolean {
  return hasLocalAgeControl() && !getProcessingInputs().verification?.localCheckSatisfied;
}
export function localAgeOptions(): { value: LocalAgeAnswer; label: string }[] {
  const country = getProcessingInputs().launch?.country;
  const values: LocalAgeAnswer[] = country === 'CA'
    ? ['under-13', '13', '14-17', '18-plus']
    : country === 'AU' ? ['under-13', '13-14', '15-17', '18-plus']
      : ['under-13', '13-17', '18-plus'];
  return values.map(value => ({ value, label: BANDS[value].label }));
}
export function getSavedLocalAgeAnswer(): LocalAgeAnswer | null {
  return !readConfirmed || readFailed || saving || saveUnconfirmed ? null : answer;
}
export function localAgeAnswerStatus(): string {
  if (saveUnconfirmed) return 'Age answer save not confirmed · select your answer again to retry';
  if (saving) return 'Saving age answer';
  if (readFailed) return 'Saved age answer could not be read · retry loading before changing it';
  return answer === null ? 'Age range not answered' : `Saved on this device: ${BANDS[answer].label}`;
}
export const hasLocalAgeReadError = () => readFailed;
function evidence(value: LocalAgeAnswer): AgeEvidence {
  return { source: 'self', status: 'shared', lowerBound: BANDS[value].lowerBound, upperBound: BANDS[value].upperBound };
}
/** Read the existing local answer independently of optional country/ad setup.
 * Missing or unreadable data is unknown, never evidence that someone is under 13. */
async function readSavedLocalAgeAnswer(): Promise<void> {
  if (!readConfirmed && !reading) {
    reading = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const value = raw === null ? null : JSON.parse(raw);
        if (raw !== null && (value?.version !== 1 || !validAnswer(value.answer))) throw new Error('Invalid age answer');
        // Every writer awaits this read before persisting. A new save intent must
        // not discard the durable answer if that later write fails.
        answer = value?.answer ?? null;
        readConfirmed = true; readFailed = false;
      } catch { readFailed = true; }
    })().finally(() => { reading = null; });
  }
  await reading;
}
/** Enforce only the owner's existing minimum age; this does not grant processing
 * permission, request an age answer, or satisfy an Apple authorization check. */
export async function hasSavedUnder13Answer(): Promise<boolean> {
  await readSavedLocalAgeAnswer();
  return answer === 'under-13';
}
/** Only the locally supplied band is saved. Apple's age response is never stored
 * here, and this answer is never sent to an advertising or competition provider. */
export async function restoreLocalAgeAnswer(): Promise<void> {
  await hydrateProcessingAccess();
  if (!hasLocalAgeControl()) return;
  if (getProcessingInputs().verification?.localCheckSatisfied && !saving && !saveUnconfirmed) return;
  const revision = getAgeVerificationRevision();
  const country = getProcessingInputs().launch!.country!;
  await readSavedLocalAgeAnswer();
  if (answer !== null && readConfirmed && !readFailed && !saving && !saveUnconfirmed && hasLocalAgeControl()) {
    verifyLocalLaunchAgeEvidence(evidence(answer), country, revision);
  }
}
export async function saveLocalAgeAnswer(value: LocalAgeAnswer): Promise<void> {
  if (!validAnswer(value) || !hasLocalAgeControl()) throw new Error('Age eligibility changed. Reopen Privacy & choices.');
  const token = ++intent;
  saving = true; saveUnconfirmed = false;
  // An in-flight or failed correction must not continue using an older adult answer.
  clearAgeVerification();
  const revision = getAgeVerificationRevision();
  const country = getProcessingInputs().launch!.country!;
  const operation = writes.catch(() => undefined).then(async () => {
    await restoreLocalAgeAnswer();
    if (!readConfirmed || readFailed) throw new Error('Unread saved age answer');
    if (token !== intent) return;
    await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, answer: value }));
    answer = value;
    if (token === intent && hasLocalAgeControl()) verifyLocalLaunchAgeEvidence(evidence(value), country, revision);
  });
  writes = operation;
  try { await operation; }
  catch {
    if (token === intent) saveUnconfirmed = true;
    throw new Error('The age answer was not confirmed as saved. Select your answer again to retry.');
  } finally { if (token === intent) saving = false; }
}
