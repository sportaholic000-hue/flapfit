import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from 'expo-modules-core';
import { getProcessingChoiceRevision, getProcessingInputs, hydrateProcessingAccess } from './processingAccess';
import type { ProcessingChoice } from './processingPolicy';
import { withdrawAdvertisingConsent } from './privacyRights';
import { REQUEST_ID_PATTERN, verifySupportResponse } from './supportResponseSignature';

const STORAGE_KEY = '@flapfit/privacy-support-request-v1';
type Request = { version: 1; id: string; choice: ProcessingChoice };
let operation: Promise<unknown> = Promise.resolve();
function serial<T>(action: () => Promise<T>): Promise<T> {
  const next = operation.then(action, action);
  operation = next.catch(() => undefined);
  return next;
}
function bounded<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Device storage did not respond. Please try again.')), 10_000);
    void promise.then(value => { clearTimeout(timeout); resolve(value); }, error => { clearTimeout(timeout); reject(error); });
  });
}
async function ready(): Promise<void> {
  await bounded(hydrateProcessingAccess());
  if (!getProcessingInputs().hydrated) throw new Error('Your saved choices could not be read. Please restart and try again.');
}
async function readRequest(): Promise<Request | null> {
  const stored = await bounded(AsyncStorage.getItem(STORAGE_KEY));
  if (!stored) return null;
  const data: Request = JSON.parse(stored);
  if (data?.version !== 1 || !REQUEST_ID_PATTERN.test(data.id) ||
      !['unset', 'granted', 'denied'].includes(data.choice?.decision) || !Number.isInteger(data.choice?.noticeVersion) ||
      !(data.choice.decidedAt === null || (typeof data.choice.decidedAt === 'string' && Number.isFinite(Date.parse(data.choice.decidedAt))))) {
    throw new Error('The saved request could not be read. Contact support for help.');
  }
  return data;
}
function matches(request: Request): boolean {
  const choice = getProcessingInputs().choices.ads;
  return choice.decision === request.choice.decision && choice.noticeVersion === request.choice.noticeVersion && choice.decidedAt === request.choice.decidedAt;
}
/** A request ID alone does nothing to processing. No network or startup work. */
export function preparePrivacySupportRequest(): Promise<string> {
  return serial(async () => {
    await ready();
    const previous = await readRequest();
    if (previous && (matches(previous) || getProcessingInputs().choices.ads.decision === 'denied')) return previous.id;
    const request: Request = { version: 1, id: uuid.v4(), choice: getProcessingInputs().choices.ads };
    if (!REQUEST_ID_PATTERN.test(request.id)) throw new Error('The device could not create a request. Please try again.');
    await bounded(AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(request)));
    return request.id;
  });
}
/** Only a signed response to this device's request can reach the existing refusal.
 * Later affirmative choices invalidate old responses; failed refusal saves can retry. */
export function applyPrivacySupportResponse(code: string) {
  const startingRevision = getProcessingChoiceRevision('ads');
  return serial(async () => {
    await ready();
    const request = await readRequest();
    if (!request || !verifySupportResponse(code, request.id)) {
      throw new Error('This response is invalid, expired, or belongs to another device. Contact support for a replacement.');
    }
    if (getProcessingChoiceRevision('ads') !== startingRevision ||
        (!matches(request) && getProcessingInputs().choices.ads.decision !== 'denied')) {
      throw new Error('Your choices have changed since this request. Contact support with a new request ID.');
    }
    // No await between the current-choice check and the synchronous refusal.
    return withdrawAdvertisingConsent();
  });
}
