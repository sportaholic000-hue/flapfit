import { evaluateVerifiedProcessing, initialProcessingRuntimeInputs, PROCESSING_NOTICE_VERSION, type ProcessingRuntimeInputs } from '../processingPolicy';
import { resolveLaunchProcessingPolicy } from '../launchProcessingPolicy';
import { resolveReleaseEligibility } from '../releaseEligibility';

function input(country: 'CA' | 'US' | 'AU' | 'MX', lowerBound = 18, options = {}): ProcessingRuntimeInputs {
  const value = initialProcessingRuntimeInputs();
  const resolution = resolveLaunchProcessingPolicy({ country, subdivision: null,
    age: { source: 'apple', status: 'shared', lowerBound, upperBound: lowerBound < 13 ? 12 : lowerBound < 18 ? 17 : null },
    notices: { ads: true, analytics: true, competition: true }, choices: value.choices, ...options });
  return { ...value, hydrated: true, appleRequirement: 'not-required', appleRescissionPending: false,
    verification: { eligibility: 'allowed', mandatoryCheckSatisfied: true, treatment: resolution.treatment, underAgeOfConsent: resolution.underAgeOfConsent },
    launch: { country, current: true, options, plan: resolution, resolution }, presentedNoticeVersion: PROCESSING_NOTICE_VERSION };
}


test.each([
  ['Quebec adult', 'CA', 18, { quebecResidency: 'resident' }],
  ['Quebec age 13', 'CA', 13, { quebecResidency: 'resident' }],
  ['Connecticut teen', 'US', 13, { connecticutResidency: 'resident' }],
  ['New York teen', 'US', 15, { connecticutResidency: 'not-resident', newYorkPresence: 'present' }],
  ['New York history in Canada', 'CA', 15, { quebecResidency: 'not-resident', newYorkProtectedHistory: true }],
  ['Australia age 13', 'AU', 13, {}],
  ['Mexico age 17', 'MX', 17, {}],
] as const)('%s can play while ads and reporting stay disabled even with legacy grants', (_name,country,age,options) => {
  const value=input(country,age,options);
  for(const purpose of ['ads','analytics'] as const) value.choices[purpose]={ decision:'granted', noticeVersion:1, decidedAt:'2026-09-21T00:00:00Z' };
  expect(resolveReleaseEligibility(value)).toEqual({status:'available'});
  expect(evaluateVerifiedProcessing(value)).toMatchObject({ads:{allowed:false},revenueCat:{allowed:false}});
});
test.each(['US','AU','MX','CA'] as const)('%s adult gameplay remains available',country=>{
  expect(resolveReleaseEligibility(input(country))).toEqual({status:'available'});
});
test.each(['province','state','new-york','notice','saved-choices','country','age'] as const)('missing optional %s evidence does not block gameplay',missing=>{
  const value=input(missing==='province'?'CA':'US',15,{connecticutResidency:'not-resident'});
  if(missing==='notice')value.presentedNoticeVersion=null;
  if(missing==='saved-choices')value.hydrated=false;
  if(missing==='country')value.launch!.current=false;
  if(missing==='age'){value.launch!.plan=null;value.verification=null;}
  expect(resolveReleaseEligibility(value)).toEqual({status:'available'});
});
test('known under-13 and Apple access restrictions remain independent of advertising',()=>{
  expect(resolveReleaseEligibility(input('US',12))).toEqual({status:'unavailable',reason:'age'});
  const value=input('US');value.appleAccessRestricted=true;
  expect(resolveReleaseEligibility(value)).toEqual({status:'unavailable',reason:'apple'});
  value.appleAccessRestricted=false;value.appleRequirement='required';value.verification!.mandatoryCheckSatisfied=false;
  expect(resolveReleaseEligibility(value)).toEqual({status:'unanswered',reason:'age'});
  value.verification!.mandatoryCheckSatisfied=true;value.appleRescissionPending=true;
  expect(resolveReleaseEligibility(value)).toEqual({status:'unanswered',reason:'age'});
  value.appleRescissionPending=false;
  expect(resolveReleaseEligibility(value)).toEqual({status:'available'});
});
test.each(['ads','analytics','competition'] as const)('%s refusal does not block gameplay',purpose=>{
  const value=input('CA',18,{quebecResidency:'not-resident'});value.choices[purpose].decision='denied';
  expect(resolveReleaseEligibility(value)).toEqual({status:'available'});
});
