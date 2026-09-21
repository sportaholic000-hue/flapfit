import { initialProcessingRuntimeInputs, PROCESSING_NOTICE_VERSION, type ProcessingRuntimeInputs } from '../processingPolicy';
import { resolveLaunchProcessingPolicy } from '../launchProcessingPolicy';
import { resolveReleaseEligibility } from '../releaseEligibility';

function input(country: 'CA' | 'US' | 'AU' | 'MX', lowerBound = 18, options = {}): ProcessingRuntimeInputs {
  const value = initialProcessingRuntimeInputs();
  const resolution = resolveLaunchProcessingPolicy({ country, subdivision: null,
    age: { source: 'apple', status: 'shared', lowerBound, upperBound: lowerBound < 18 ? 17 : null },
    notices: { ads: true, analytics: true, competition: true }, choices: value.choices, ...options });
  return { ...value, hydrated: true, appleRequirement: 'not-required', appleRescissionPending: false,
    verification: { eligibility: 'allowed', mandatoryCheckSatisfied: true, treatment: resolution.treatment, underAgeOfConsent: resolution.underAgeOfConsent },
    launch: { country, current: true, options, plan: resolution, resolution }, presentedNoticeVersion: PROCESSING_NOTICE_VERSION };
}

test.each(['US', 'AU', 'MX'] as const)('%s adults remain available without a state question', country => {
  expect(resolveReleaseEligibility(input(country))).toEqual({ status: 'available' });
});
test('Canada has three distinct eligibility outcomes; Quebec exclusion is independent of consent', () => {
  expect(resolveReleaseEligibility(input('CA'))).toEqual({ status: 'unanswered', reason: 'province' });
  expect(resolveReleaseEligibility(input('CA', 18, { quebecResidency: 'not-resident' }))).toEqual({ status: 'available' });
  for (const decision of ['unset', 'granted', 'denied'] as const) {
    const value = input('CA', 18, { quebecResidency: 'resident', quebecFunctionsActivated: { ads: true, analytics: true } });
    value.choices.ads.decision = decision;
    expect(resolveReleaseEligibility(value)).toEqual({ status: 'unavailable', reason: 'quebec' });
  }
});
test.each(['ads', 'analytics', 'competition'] as const)('%s refusal is never an access restriction', purpose => {
  const value = input('CA', 18, { quebecResidency: 'not-resident' });
  value.choices[purpose].decision = 'denied';
  expect(resolveReleaseEligibility(value)).toEqual({ status: 'available' });
});
test('US teen needs separate current NY location after a non-CT residence answer', () => {
  expect(resolveReleaseEligibility(input('US', 13))).toEqual({ status: 'unanswered', reason: 'state' });
  expect(resolveReleaseEligibility(input('US', 13, { connecticutResidency: 'not-resident' }))).toEqual({ status: 'unanswered', reason: 'new-york' });
  expect(resolveReleaseEligibility(input('US', 13, { connecticutResidency: 'not-resident', newYorkPresence: 'not-present' }))).toEqual({ status: 'available' });
});
test('confirmed CT and NY protected teens are unavailable regardless of an ad grant', () => {
  expect(resolveReleaseEligibility(input('US', 13, { connecticutResidency: 'resident' }))).toEqual({ status: 'unavailable', reason: 'connecticut-minor' });
  expect(resolveReleaseEligibility(input('US', 13, { connecticutResidency: 'not-resident', newYorkPresence: 'present' }))).toEqual({ status: 'unavailable', reason: 'new-york-minor' });
});
test.each(['CA', 'AU', 'MX'] as const)('known NY history is not erased by current %s location', country => {
  const value = input(country, country === 'MX' ? 18 : 15, { newYorkProtectedHistory: true, quebecResidency: 'not-resident' });
  expect(resolveReleaseEligibility(value).status).toBe(country === 'MX' ? 'available' : 'unavailable');
});
test('foreign teen eligibility does not invent NY coverage or a wholly-outside exemption', () => {
  for (const country of ['CA', 'AU'] as const) {
    const value = input(country, 15, { quebecResidency: 'not-resident' });
    expect(resolveReleaseEligibility(value)).toEqual({ status: 'available' });
    expect(value.launch?.resolution?.requirements.ads).toBe('notice-and-opt-out');
    expect(value.launch?.options).not.toHaveProperty('newYorkApplicability');
  }
});
test('national authority limits and unread history remain distinct from consent', () => {
  expect(resolveReleaseEligibility(input('AU', 13))).toEqual({ status: 'unavailable', reason: 'age' });
  expect(resolveReleaseEligibility(input('MX', 17))).toEqual({ status: 'unavailable', reason: 'age' });
  expect(resolveReleaseEligibility(input('AU', 15, { newYorkHistoryReadConfirmed: false }))).toEqual({ status: 'unanswered', reason: 'saved-status' });
});
