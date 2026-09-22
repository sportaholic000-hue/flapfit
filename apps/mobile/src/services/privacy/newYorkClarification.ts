import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyNewYorkContext, getAgeVerificationRevision, getProcessingInputs, hydrateProcessingAccess } from './processingAccess';

const KEY = '@flapfit/new-york-eligibility-v1';
type Answer = 'present' | 'not-present';
let savedAnswer: Answer | null = null;
let readConfirmed = false;
let protectedHistory = false;
let pendingRead: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
let revision = 0;
let changing = false;
let saveUnconfirmed = false;

/** Both explicit answers persist locally. A declaration is not a live location,
 * consent grant or age record. Preserve legacy positive protection history. */
export async function restoreNewYorkClarification(): Promise<void> {
  await hydrateProcessingAccess();
  const current = getProcessingInputs().launch;
  protectedHistory ||= current?.options.newYorkProtectedHistory === true || current?.plan?.newYorkKnownContext === true;
  if (!readConfirmed && !pendingRead) {
    applyNewYorkContext({ newYorkHistoryReadConfirmed: false });
    pendingRead = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const value = raw === null ? null : JSON.parse(raw);
        if (raw !== null) {
          if ((value?.version !== 1 && value?.version !== 2) || typeof value.protectedHistory !== 'boolean' ||
              (value.version === 2 && !['present', 'not-present'].includes(value.answer))) throw new Error('Invalid regional answer');
          protectedHistory ||= value.protectedHistory === true || value.answer === 'present';
          savedAnswer = value.version === 2 ? value.answer : value.protectedHistory ? 'present' : null;
        }
        readConfirmed = true;
      } catch { /* Unknown saved answers never enable processing. Retry is explicit. */ }
    })().finally(() => { pendingRead = null; });
  }
  await pendingRead;
  applyNewYorkContext({ newYorkProtectedHistory: protectedHistory, newYorkHistoryReadConfirmed: readConfirmed,
    ...(getProcessingInputs().launch?.country === 'US' && !changing && !saveUnconfirmed
      ? { newYorkPresence: readConfirmed ? savedAnswer ?? 'unknown' : 'unknown' } : {}) });
}

export function hasNewYorkClarificationControl(): boolean {
  const input = getProcessingInputs();
  return input.hydrated && !!input.launch?.current && input.launch.country === 'US' &&
    input.launch.plan?.ageEligibility === 'allowed' && input.launch.plan.treatment !== 'unspecified' &&
    input.launch.options.connecticutResidency === 'not-resident' && !input.appleAccessRestricted;
}
export function hasSavedNewYorkAnswer(): boolean {
  return readConfirmed && savedAnswer !== null && !saveUnconfirmed;
}
export function needsNewYorkClarification(): boolean {
  return hasNewYorkClarificationControl() && (changing || !hasSavedNewYorkAnswer());
}
export function getSavedNewYorkPresence(): Answer | null {
  return !readConfirmed || changing || saveUnconfirmed ? null : savedAnswer;
}
export function newYorkClarificationStatus(): string {
  if (saveUnconfirmed) return 'Answer save not confirmed · retry loading or saving your answer';
  if (changing) return 'Saving your answer';
  if (!readConfirmed) return 'Saved regional status unavailable · retry loading';
  return savedAnswer === null ? 'Not answered' :
    `Saved answer: ${savedAnswer === 'present' ? 'Yes' : 'No'}. Update it here if your situation changes.`;
}
export const hasNewYorkReadError = () => !readConfirmed;

export async function saveNewYorkPresence(answer: Answer): Promise<void> {
  if (!['present', 'not-present'].includes(answer)) throw new Error('Choose Yes or No.');
  if (!hasNewYorkClarificationControl()) throw new Error('Privacy settings changed. Reopen Info to review your answer.');
  const token = ++revision;
  const ageRevision = getAgeVerificationRevision();
  changing = true;
  // A positive answer closes providers immediately; No cannot erase known history.
  if (answer === 'present') {
    protectedHistory = true;
    applyNewYorkContext({ newYorkPresence: 'present', newYorkProtectedHistory: true });
  } else applyNewYorkContext({ newYorkPresence: 'unknown' });
  const operation = writes.catch(() => undefined).then(async () => {
    await restoreNewYorkClarification();
    if (!readConfirmed) throw new Error('Saved regional status could not be read. Retry loading before answering.');
    await AsyncStorage.setItem(KEY, JSON.stringify({ version: 2, answer, protectedHistory }));
    if (token !== revision) return;
    savedAnswer = answer;
    saveUnconfirmed = false;
    if (ageRevision === getAgeVerificationRevision() && hasNewYorkClarificationControl()) {
      applyNewYorkContext({ newYorkPresence: answer, newYorkProtectedHistory: protectedHistory });
    }
  });
  writes = operation;
  try { await operation; }
  catch {
    if (token === revision) saveUnconfirmed = true;
    throw new Error('Your answer is not confirmed. Retry loading or saving in Info.');
  } finally { if (token === revision) changing = false; }
}
