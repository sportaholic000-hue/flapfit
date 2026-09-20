import { evaluateLaunchProcessingPlan, resolveLaunchProcessingPolicy, type LaunchProcessingPlan, type LaunchProcessingOptions } from './launchProcessingPolicy';
import type { LaunchCountry } from './privacyCountry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AgeEvidence, AppleRequirement, EuropeanProviderDecisions, evaluateVerifiedProcessing, initialProcessingRuntimeInputs, verifyTransientAge,
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
    ...(input.launch ? { launch: JSON.parse(JSON.stringify(input.launch)) as ProcessingRuntimeInputs['launch'] } : {}),
    ...(input.europeanProvider ? { europeanProvider: { ads: { ...input.europeanProvider.ads }, analytics: { ...input.europeanProvider.analytics }, competition: { ...input.europeanProvider.competition } } } : {}),
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
  if (next.launch?.plan) {
    const noticed = next.presentedNoticeVersion === PROCESSING_NOTICE_VERSION;
    const competitionNoticed = next.choices.competition.decision === 'granted' && next.choices.competition.noticeVersion === PROCESSING_NOTICE_VERSION;
    next = { ...next, launch: { ...next.launch, resolution: evaluateLaunchProcessingPlan(next.launch.plan, { ads: noticed, analytics: noticed, competition: competitionNoticed }, next.choices, next.launch.options) } };
  }
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
function persist(changedPurpose?: Purpose): Promise<void> {
  const operation = writes.catch(() => undefined).then(async () => {
    try {
      // Serialize intentions at execution time; never restore a superseded grant.
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...durable }));
    } catch (error) {
      const denied: ProcessingChoice = {
        decision: 'denied', noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: new Date().toISOString(),
      };
      ++choicesRevision;
      const choices = { ...input.choices };
      (['ads', 'analytics', 'competition'] as const).forEach((purpose) => {
        // Cancel unsaved grants, but a reporting write failure cannot revoke
        // an independently established advertising or competition choice.
        if (!changedPurpose || purpose === changedPurpose ||
            durable.choices[purpose] !== input.choices[purpose]) {
          ++purposeRevision[purpose];
          choices[purpose] = { ...denied };
        }
      });
      durable = { ...durable, choices };
      publish({ ...input, choices: durable.choices });
      // Preserve the last successful record, especially unrelated saved refusals.
      // Deleting it would leave the separate notice acknowledged but erase those
      // refusals on restart. The failed operation still rejects and can be retried;
      // no unconfirmed withdrawal is reported as durable.
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
  publish({ ...input, region: 'unknown', verification: null, europeanProvider: undefined, launch: undefined, appleRequirement: 'pending',
    requirements: { ads: 'unresolved', analytics: 'unresolved', competition: 'unresolved' },
    presentedNoticeVersion: null });
  await persist();
  if (generation === regionRevision) publish({ ...input, region, hydrated: true });
}
/** Changing jurisdiction or Apple duty invalidates every outstanding verification callback. */
export const getAgeVerificationRevision = () => verificationRevision;
export function clearAgeVerification(): void {
  ++verificationRevision;
  publish({ ...input, verification: null, launch: input.launch ? { ...input.launch, plan: null, resolution: null } : undefined });
}
export function setAppleAgeRequirement(requirement: AppleRequirement): void {
  ++verificationRevision;
  publish({ ...input, appleRequirement: requirement, verification: null, europeanProvider: undefined, launch: input.launch ? { ...input.launch, plan: null, resolution: null } : undefined });
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
/** Satisfy only the mandatory Apple check before a regional processing policy
 * is known. The raw response is consumed immediately. This deliberately records
 * no regional policy, notice, purpose grant, location or parental data-use consent. */
export function verifyMandatoryAppleAgeEvidence(age: AgeEvidence, expectedRevision: number): boolean {
  if (expectedRevision !== verificationRevision || input.appleRequirement !== 'required') return false;
  const verification = verifyTransientAge({
    ...input, region: 'unknown', age, appleAgeCheckSatisfied: age.status === 'shared',
  });
  publish({ ...input, verification,
    requirements: { ads: 'unresolved', analytics: 'unresolved', competition: 'unresolved' } });
  return expectedRevision === verificationRevision;
}
export function setAppleRescissionPending(pending: boolean): void {
  if (input.appleRescissionPending === pending) return;
  publish({ ...input, appleRescissionPending: pending });
}
export function setAppleAccessRestricted(restricted: boolean): void {
  if (restricted) ++verificationRevision;
  publish({ ...input, appleAccessRestricted: restricted,
    verification: restricted ? null : input.verification,
    europeanProvider: restricted ? undefined : input.europeanProvider,
    launch: restricted && input.launch ? { ...input.launch, plan: null, resolution: null } : input.launch });
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
  await persist(purpose);
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

const unresolvedProvider = (): EuropeanProviderDecisions => ({
  ads: { allowed: false, reason: 'policy-unresolved' },
  analytics: { allowed: false, reason: 'policy-unresolved' },
  competition: { allowed: false, reason: 'policy-unresolved' },
});
/** A successful fresh UMP update can establish this treatment regime, never a country.
 * This is runtime-only and creates no processing grant or persistent age profile. */
export function beginEuropeanProviderProcessing(): number | null {
  if (!input.hydrated || input.appleAccessRestricted || input.appleRequirement === 'pending' || input.appleRequirement === 'error') return null;
  publish({ ...input, europeanProvider: unresolvedProvider() });
  return verificationRevision;
}
export function verifyEuropeanAppleAgeEvidence(age: AgeEvidence, expectedRevision: number): boolean {
  if (expectedRevision !== verificationRevision || !input.europeanProvider || input.appleAccessRestricted) return false;
  const verification = verifyTransientAge({ ...input, region: 'unknown', age, appleAgeCheckSatisfied: age.status === 'shared' });
  publish({ ...input, verification });
  return expectedRevision === verificationRevision;
}
/** Refusals remain in independent durable choices and always override these signals. */
export function setEuropeanProviderDecisions(decisions: EuropeanProviderDecisions, expectedRevision: number): boolean {
  if (expectedRevision !== verificationRevision || !input.europeanProvider || input.appleAccessRestricted) return false;
  publish({ ...input, europeanProvider: { ads: { ...decisions.ads }, analytics: { ...decisions.analytics }, competition: { ...decisions.competition } } });
  return expectedRevision === verificationRevision;
}
/** Close affected gates synchronously before reading replacement provider choices. */
export function invalidateEuropeanProviderDecisions(preserveCompetition = false): void {
  if (!input.europeanProvider) return;
  const next = unresolvedProvider();
  if (preserveCompetition) next.competition = { ...input.europeanProvider.competition };
  publish({ ...input, europeanProvider: next });
}

/** Country freshness is independent of age verification: a same-country foreground
 * refresh closes processing temporarily without erasing its already verified plan. */
export function setLaunchProcessingCountry(country: LaunchCountry | null, current: boolean): boolean {
  const previous = input.launch;
  const changed = country !== null && previous?.country != null && previous.country !== country;
  if (changed) ++verificationRevision;
  const nextCountry = country ?? previous?.country ?? null;
  if (previous && previous.country === nextCountry && previous.current === current && !changed) return false;
  publish({ ...input, europeanProvider: undefined, verification: changed ? null : input.verification,
    launch: { country: nextCountry, current, plan: changed ? null : previous?.plan ?? null,
      resolution: changed ? null : previous?.resolution ?? null, options: changed ? {} : previous?.options ?? {} } });
  return changed;
}
export function setLaunchProcessingPlan(plan: LaunchProcessingPlan, expectedRevision: number): boolean {
  if (expectedRevision !== verificationRevision || !input.launch?.current || !input.verification?.mandatoryCheckSatisfied) return false;
  publish({ ...input, launch: { ...input.launch, plan: JSON.parse(JSON.stringify(plan)) as LaunchProcessingPlan, resolution: null } });
  return expectedRevision === verificationRevision;
}
/** Only the serialized native Apple consumer supplies this transient evidence. */
export function verifyLaunchAgeEvidence(age: AgeEvidence, country: LaunchCountry, expectedRevision: number): boolean {
  if (expectedRevision !== verificationRevision || !input.launch?.current || input.launch.country !== country || input.appleAccessRestricted) return false;
  const verification = verifyTransientAge({ ...input, region: 'unknown', age, appleAgeCheckSatisfied: age.status === 'shared' && age.source === 'apple' });
  const resolved = resolveLaunchProcessingPolicy({ country, subdivision: null, age,
    choices: input.choices, notices: { ads: false, analytics: false, competition: false } });
  const { decisions: _decisions, ...plan } = resolved;
  publish({ ...input, verification, launch: { ...input.launch, plan, resolution: null } });
  return expectedRevision === verificationRevision;
}
/** Separate verified purpose controls; no change is inferred from UMP or download permission. */
export function setLaunchProcessingOptions(options: LaunchProcessingOptions): void {
  if (!input.launch) return;
  publish({ ...input, launch: { ...input.launch, options: JSON.parse(JSON.stringify(options)) as LaunchProcessingOptions } });
}
