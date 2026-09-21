import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyNewYorkContext, getAgeVerificationRevision, getProcessingInputs, hydrateProcessingAccess } from './processingAccess';

const KEY = '@flapfit/new-york-eligibility-v1';
let readConfirmed = false;
let protectedHistory = false;
let pendingRead: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
let revision = 0;
let changing = false;
let saveUnconfirmed = false;

/** Only a local yes/history bit is stored. No location coordinates, raw Apple
 * age range, ad permission or provider identifier belongs in this record. */
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
        if (raw !== null && (value?.version !== 1 || typeof value.protectedHistory !== 'boolean')) throw new Error('Invalid eligibility record');
        protectedHistory ||= value?.protectedHistory === true;
        readConfirmed = true;
      } catch { /* Retry remains available; unread history never becomes a clean history. */ }
    })().finally(() => { pendingRead = null; });
  }
  await pendingRead;
  applyNewYorkContext({ newYorkProtectedHistory: protectedHistory, newYorkHistoryReadConfirmed: readConfirmed });
}

export function hasNewYorkClarificationControl(): boolean {
  const input = getProcessingInputs();
  return input.hydrated && !!input.launch?.current && input.launch.country === 'US' &&
    input.launch.plan?.ageEligibility === 'allowed' && input.launch.plan.treatment !== 'unspecified' &&
    input.launch.options.connecticutResidency === 'not-resident' &&
    !input.appleAccessRestricted;
}
export function needsNewYorkClarification(): boolean {
  const input = getProcessingInputs();
  return hasNewYorkClarificationControl() && (saveUnconfirmed || changing || !readConfirmed ||
    (!input.launch?.options.newYorkProtectedHistory && input.launch?.options.newYorkPresence !== 'not-present'));
}
export function newYorkClarificationStatus(): string {
  if (saveUnconfirmed) return 'Answer save not confirmed · retry loading or saving your answer';
  if (changing) return 'Saving your answer';
  if (!readConfirmed) return 'Saved regional status unavailable · retry loading';
  const context = getProcessingInputs().launch?.options;
  if (context?.newYorkProtectedHistory) return 'New York protections retained for this age group';
  return context?.newYorkPresence === 'not-present' ? 'Outside New York for this session' : 'Not answered';
}
export const hasNewYorkReadError = () => !readConfirmed;

export async function saveNewYorkPresence(answer: 'present' | 'not-present'): Promise<void> {
  if (!['present', 'not-present'].includes(answer)) throw new Error('Choose Yes or No.');
  if (!hasNewYorkClarificationControl()) throw new Error('Eligibility changed. Reopen Info to review your answer.');
  const token = ++revision;
  const ageRevision = getAgeVerificationRevision();
  changing = true;
  // A No never clears an existing protection or a failed Yes save.
  if (answer === 'present') {
    protectedHistory = true;
    applyNewYorkContext({ newYorkPresence: 'present', newYorkProtectedHistory: true });
  } else applyNewYorkContext({ newYorkPresence: 'unknown' });
  const operation = writes.catch(() => undefined).then(async () => {
    await restoreNewYorkClarification();
    if (!readConfirmed) throw new Error('Saved regional status could not be read. Retry loading before answering.');
    if (protectedHistory) await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, protectedHistory: true }));
    if (token !== revision) return;
    saveUnconfirmed = false;
    if (ageRevision === getAgeVerificationRevision() && hasNewYorkClarificationControl()) {
      applyNewYorkContext({ newYorkPresence: answer, newYorkProtectedHistory: protectedHistory });
    }
  });
  writes = operation;
  try { await operation; }
  catch {
    if (token === revision) saveUnconfirmed = true;
    throw new Error('Your answer is not confirmed. Retry loading or saving in Info. An unanswered question does not allow advertising.');
  } finally { if (token === revision) changing = false; }
}
