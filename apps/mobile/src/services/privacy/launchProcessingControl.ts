import { prepareAppleAgeControl, requestLaunchAppleAgeEvidence } from './appleAgeControl';
import { getPrivacyCountrySnapshot, subscribePrivacyCountry } from './privacyCountry';
import { restoreRegionalClarification } from './regionalClarification';
import { restoreLocalAgeAnswer } from './localAgeAnswer';
import { restoreNewYorkClarification } from './newYorkClarification';
import { getAgeVerificationRevision, getProcessingInputs, setLaunchProcessingCountry, setLaunchProcessingPlan, verifyLaunchAgeEvidence } from './processingAccess';
import { launchAppleAgeGates, resolveVerifiedAdultLaunchPlan, refineLaunchProcessingPlan } from './launchProcessingPolicy';

let consumers = 0;
let removeCountryListener: (() => void) | null = null;
let pending: Promise<void> | null = null;
let attemptedKey: string | null = null;
export function getLaunchProcessingStatus() { return getProcessingInputs().launch ?? null; }
/** Only an explicit user retry may repeat an optional Apple response. */
export function retryLaunchAgeCheck(): void { attemptedKey = null; }
/** Root-owned subscription blocks stale country processing immediately. It never
 * displays UI, invents a province/residence, marks a notice, or changes user choices. */
export function startLaunchProcessing(): () => void {
  ++consumers;
  if (consumers === 1) {
    const apply = () => {
      const country = getPrivacyCountrySnapshot();
      const changed = setLaunchProcessingCountry(country.status === 'resolved' ? country.country : null, country.status === 'resolved');
      if (changed) { attemptedKey = null; void prepareAppleAgeControl(); }
    };
    removeCountryListener = subscribePrivacyCountry(apply);
    apply();
  }
  let stopped = false;
  return () => { if (stopped) return; stopped = true; if (--consumers === 0) { removeCountryListener?.(); removeCountryListener = null; setLaunchProcessingCountry(null, false); } };
}
export type LaunchProcessingPresentation = {
  canPresent: () => boolean;
  present: <T>(operation: () => Promise<T>) => Promise<T>;
};
export async function prepareLaunchProcessing(options: LaunchProcessingPresentation): Promise<void> {
  await restoreRegionalClarification();
  await restoreNewYorkClarification();
  await restoreLocalAgeAnswer();
  if (pending) return pending;
  const input = getProcessingInputs();
  const launch = input.launch;
  if (!launch?.current || !launch.country || !input.hydrated || input.appleAccessRestricted ||
    input.appleRequirement === 'pending' || input.appleRequirement === 'error' ||
    input.appleRequirement === 'unsupported' || !options.canPresent()) return Promise.resolve();
  if (launch.plan && input.verification?.mandatoryCheckSatisfied) return Promise.resolve();
  if (input.verification?.mandatoryCheckSatisfied && input.verification.treatment === 'unspecified') {
    const resolved = resolveVerifiedAdultLaunchPlan({ ...launch.options, country: launch.country, subdivision: null,
      choices: input.choices, notices: { ads: false, analytics: false, competition: false } });
    const { decisions: _decisions, ...plan } = resolved;
    setLaunchProcessingPlan(plan, getAgeVerificationRevision());
    return Promise.resolve();
  }
  const country = launch.country;
  const key = country + ':' + getAgeVerificationRevision();
  if (attemptedKey === key) return Promise.resolve();
  pending = Promise.resolve().then(async () => {
    await options.present(async () => {
      if (!options.canPresent() || getProcessingInputs().launch?.country !== country || !getProcessingInputs().launch?.current) return;
      const observed = getPrivacyCountrySnapshot();
      const outcome = await requestLaunchAppleAgeEvidence(country, launchAppleAgeGates(country), (age, revision) => verifyLaunchAgeEvidence(age, country, revision));
      if (outcome.status !== 'stale' && getPrivacyCountrySnapshot() === observed &&
        getProcessingInputs().launch?.current && getProcessingInputs().launch?.country === country) {
        attemptedKey = country + ':' + getAgeVerificationRevision();
      }
    });
  }).catch(() => undefined).finally(() => { pending = null; });
  return pending;
}
/** Called only by a specifically approved regional clarification. No country is
 * inferred from the answer; the existing verified same-country policy is refined. */
export function applyLaunchSubdivision(subdivision: string): boolean {
  const input = getProcessingInputs();
  if (!input.launch?.current || !input.launch.country || !input.launch.plan) return false;
  const resolved = refineLaunchProcessingPlan(input.launch.plan, { ...input.launch.options, country: input.launch.country, subdivision,
    choices: input.choices, notices: { ads: false, analytics: false, competition: false } });
  const { decisions: _decisions, ...plan } = resolved;
  return setLaunchProcessingPlan(plan, getAgeVerificationRevision());
}
