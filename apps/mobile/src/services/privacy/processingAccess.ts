import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AgeEvidence, AppleRequirement, evaluateVerifiedProcessing, initialProcessingRuntimeInputs, verifyTransientAge,
  PROCESSING_NOTICE_VERSION, ProcessingChoice, ProcessingRuntimeInputs, PrivacyRegion, Purpose, PurposeRequirement,
} from './processingPolicy';

const STORAGE_KEY = '@flapfit/processing-choices-v1';
let input = initialProcessingRuntimeInputs();
let revision = 0;
let snapshot = evaluateVerifiedProcessing(input, revision);
let hydration: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const purposeRevision: Record<Purpose, number> = { ads: 0, analytics: 0, competition: 0 };
let regionRevision = 0;
let verificationRevision = 0;
let choicesRevision = 0;
let durable = { region: input.region, choices: input.choices };
export const getProcessingAccess = () => snapshot;
export function getProcessingInputs(): ProcessingRuntimeInputs {
  return {
    ...input, verification: input.verification ? { ...input.verification } : null,
    requirements: { ...input.requirements },
    choices: {
      ads: { ...input.choices.ads }, analytics: { ...input.choices.analytics },
      competition: { ...input.choices.competition },
    },
  };
}
export function subscribeProcessingAccess(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(next: ProcessingRuntimeInputs): void {
  input = next;
  snapshot = evaluateVerifiedProcessing(next, ++revision);
  listeners.forEach((listener) => {
    try { listener(); } catch { /* A failing subscriber cannot prevent other withdrawals. */ }
  });
}
function validChoice(value: unknown): value is ProcessingChoice {
  if (!value || typeof value !== 'object') return false;
  const c = value as ProcessingChoice;
  return ['unset', 'granted', 'denied'].includes(c.decision) &&
    Number.isInteger(c.noticeVersion) &&
    (c.decidedAt === null || (typeof c.decidedAt === 'string' && Number.isFinite(Date.parse(c.decidedAt))));
}
function validRegion(value: unknown): value is PrivacyRegion {
  return ['us', 'ca-quebec', 'ca-other', 'other', 'unknown'].includes(value as string);
}
function persist(): Promise<void> {
  const operation = writes.catch(() => undefined).then(async () => {
    try {
      // Serialize intentions at execution time; never restore a superseded grant.
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...durable }));
    } catch (error) {
      const denied: ProcessingChoice = {
        decision: 'denied', noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: new Date().toISOString(),
      };
      ++choicesRevision;
      (['ads', 'analytics', 'competition'] as const).forEach((purpose) => { ++purposeRevision[purpose]; });
      durable = { ...durable, choices: { ads: { ...denied }, analytics: { ...denied }, competition: { ...denied } } };
      publish({ ...input, choices: durable.choices });
      // Cleanup precedes later writes. An unsaved withdrawal is never reported as successful.
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
      throw error;
    }
  });
  writes = operation;
  return operation;
}
export function hydrateProcessingAccess(): Promise<void> {
  if (hydration) return hydration;
  const before = choicesRevision;
  hydration = (async () => {
    let restored: typeof durable | null = null;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data?.version === 1 && validRegion(data.region) &&
          validChoice(data.choices?.ads) && validChoice(data.choices?.analytics) &&
          validChoice(data.choices?.competition)) {
        const choice = (purpose: Purpose): ProcessingChoice => ({
          decision: data.choices[purpose].decision,
          noticeVersion: data.choices[purpose].noticeVersion,
          decidedAt: data.choices[purpose].decidedAt,
        });
        restored = { region: data.region, choices: {
          ads: choice('ads'), analytics: choice('analytics'), competition: choice('competition'),
        } };
      }
    } catch { /* Unreadable storage leaves all purposes off. */ }
    if (before === choicesRevision && restored) {
      const changedRegion = input.region !== restored.region;
      if (changedRegion) ++verificationRevision;
      durable = restored;
      publish({ ...input, ...restored, hydrated: true,
        verification: changedRegion ? null : input.verification });
    } else {
      publish({ ...input, hydrated: true });
    }
  })();
  return hydration;
}
export async function setPrivacyRegion(region: PrivacyRegion): Promise<void> {
  if (!validRegion(region)) throw new Error('Invalid privacy region');
  ++choicesRevision;
  const generation = ++regionRevision;
  ++verificationRevision;
  durable = { ...durable, region };
  publish({ ...input, region: 'unknown', verification: null, appleRequirement: 'pending',
    requirements: { ads: 'unresolved', analytics: 'unresolved', competition: 'unresolved' },
    presentedNoticeVersion: null });
  await persist();
  if (generation === regionRevision) publish({ ...input, region, hydrated: true });
}
/** Changing jurisdiction or Apple duty invalidates every outstanding verification callback. */
export const getAgeVerificationRevision = () => verificationRevision;
export function clearAgeVerification(): void {
  ++verificationRevision;
  publish({ ...input, verification: null });
}
export function setAppleAgeRequirement(requirement: AppleRequirement): void {
  ++verificationRevision;
  publish({ ...input, appleRequirement: requirement, verification: null });
}
/** Consume evidence synchronously. Never keep, return, persist, or publish its raw range/source.
 * The caller must discard its response after this returns. Region must be established first.
 * Call setPrivacyRegion even when a finer jurisdiction changes within the same coarse region. */
export function verifyTransientAgeEvidence(
  age: AgeEvidence,
  appleCheckSatisfied = false,
  expectedRevision = verificationRevision,
  requirements?: Record<Purpose, PurposeRequirement>,
): boolean {
  if (expectedRevision !== verificationRevision || input.region === 'unknown') return false;
  const verification = verifyTransientAge({
    ...input, age, appleAgeCheckSatisfied: appleCheckSatisfied,
  });
  publish({ ...input, verification,
    requirements: requirements ? { ...requirements } : input.requirements });
  return expectedRevision === verificationRevision;
}
export function setAppleRescissionPending(pending: boolean): void {
  if (input.appleRescissionPending === pending) return;
  publish({ ...input, appleRescissionPending: pending });
}
export function setAppleAccessRestricted(restricted: boolean): void {
  if (restricted) ++verificationRevision;
  publish({ ...input, appleAccessRestricted: restricted,
    verification: restricted ? null : input.verification });
}
export async function setProcessingChoice(purpose: Purpose, decision: 'granted' | 'denied'): Promise<void> {
  ++choicesRevision;
  const generation = ++purposeRevision[purpose];
  const choice: ProcessingChoice = {
    decision, noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: new Date().toISOString(),
  };
  durable = { ...durable, choices: { ...durable.choices, [purpose]: choice } };
  if (decision === 'denied') {
    publish({ ...input, choices: { ...input.choices, [purpose]: choice } });
  }
  await persist();
  if (decision === 'granted' && generation === purposeRevision[purpose]) {
    publish({ ...input, choices: { ...input.choices, [purpose]: choice } });
  }
}

/** Internal legal-policy resolution, not a user toggle or evidence of consent.
 * No production caller selects a policy until its region rules and flow are approved. */
export function setProcessingRequirements(requirements: Record<Purpose, PurposeRequirement>): void {
  publish({ ...input, requirements: { ...requirements } });
}
export function markProcessingNoticePresented(version: number): void {
  publish({ ...input, presentedNoticeVersion: version });
}
