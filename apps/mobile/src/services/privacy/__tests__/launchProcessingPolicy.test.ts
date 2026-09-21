import { PROCESSING_NOTICE_VERSION, type ProcessingChoice } from '../processingPolicy';
import { validateAppleAgeGates } from '../../../../modules/flap-fit-age-range/src/gates';
import {
  evaluateLaunchProcessingPlan, launchAppleAgeGates, resolveLaunchProcessingPolicy,
  resolveVerifiedAdultLaunchPlan, refineLaunchProcessingPlan,
  type LaunchProcessingInput,
} from '../launchProcessingPolicy';
const unset = (): ProcessingChoice => ({ decision: 'unset', noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: null });
const grant = (): ProcessingChoice => ({ decision: 'granted', noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: '2026-09-20T00:00:00Z' });
const deny = (): ProcessingChoice => ({ decision: 'denied', noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: '2026-09-20T00:00:00Z' });
const outside = {
  status: 'wholly-outside' as const, collectedOutsideNewYork: true, noUseInNewYork: true, noNewYorkCollectedDataUsed: true,
};
function input(overrides: Partial<LaunchProcessingInput> = {}): LaunchProcessingInput {
  return {
    country: 'US', subdivision: 'CA',
    age: { source: 'apple', status: 'shared', lowerBound: 18, upperBound: null },
    notices: { ads: true, analytics: true, competition: true },
    choices: { ads: unset(), analytics: unset(), competition: unset() },
    quebecFunctionsActivated: { ads: false, analytics: false },
    newYorkApplicability: { ads: outside, analytics: outside },
    ...overrides,
  };
}
const teen = { source: 'apple' as const, status: 'shared' as const, lowerBound: 14, upperBound: 17 };
test.each(['US', 'AU', 'MX'])('%s adults use notice route without an optional ads consent switch', country => {
  const result = resolveLaunchProcessingPolicy(input({ country, subdivision: null }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.allowed).toBe(true);
  expect(result.decisions.competition.reason).toBe('permission-needed');
  expect(result.treatment).toBe('unspecified');
});
test('each notice is independently required', () => {
  const result = resolveLaunchProcessingPolicy(input({ notices: { ads: true, analytics: false, competition: true } }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.reason).toBe('notice-needed');
});
test('Canadian non-Quebec teenager fourteen plus has independent notice route', () => {
  const result = resolveLaunchProcessingPolicy(input({ country: 'CA', subdivision: 'CA-ON', age: teen }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.allowed).toBe(true);
  expect(result.treatment).toBe('teen');
});
test('unknown Canadian province does not disable requested competition fourteen plus', () => {
  const result = resolveLaunchProcessingPolicy(input({
    country: 'CA', subdivision: null, age: teen,
    choices: { ads: grant(), analytics: grant(), competition: grant() },
  }));
  expect(result.decisions.ads.allowed).toBe(false);
  expect(result.decisions.analytics.allowed).toBe(false);
  expect(result.missingFacts.ads).toContain('province');
  expect(result.decisions.competition.allowed).toBe(true);
});
test('exact current Quebec activation satisfies that function for confirmed Quebec', () => {
  const result = resolveLaunchProcessingPolicy(input({
    country: 'CA', subdivision: 'QC',
    quebecFunctionsActivated: { ads: true, analytics: false },
  }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.allowed).toBe(false);
  expect(result.missingFacts.ads).not.toContain('province');
});
test('generic grant is not Quebec identification/profiling activation', () => {
  const result = resolveLaunchProcessingPolicy(input({
    country: 'CA', subdivision: 'QC', choices: { ads: grant(), analytics: grant(), competition: grant() },
  }));
  expect(result.decisions.ads.allowed).toBe(false);
  expect(result.decisions.analytics.allowed).toBe(false);
  expect(result.reasons.analytics).toBe('quebec-activation-required');
});
test('Quebec analytics activation does not activate ads', () => {
  const result = resolveLaunchProcessingPolicy(input({
    country: 'CA', subdivision: 'QC', quebecFunctionsActivated: { ads: false, analytics: true },
  }));
  expect(result.decisions.analytics.allowed).toBe(true);
  expect(result.decisions.ads.allowed).toBe(false);
});
test('Quebec thirteen-year-old requires purpose-specific guardian authority', () => {
  const result = resolveLaunchProcessingPolicy(input({
    country: 'CA', subdivision: 'QC', age: { ...teen, lowerBound: 13, upperBound: 13 },
    parentalAuthority: { competition: true },
    choices: { ads: grant(), analytics: grant(), competition: grant() },
    quebecFunctionsActivated: { ads: true, analytics: true },
  }));
  expect(result.decisions.ads.reason).toBe('parent-permission-required');
  expect(result.decisions.analytics.reason).toBe('parent-permission-required');
  expect(result.decisions.competition.allowed).toBe(true);
  expect(result.underAgeOfConsent).toBe(true);
});
test('NY teen requires separate express choices, not Google consent or notice', () => {
  const result = resolveLaunchProcessingPolicy(input({
    subdivision: 'NY', age: teen,
    newYorkApplicability: { ads: { status: 'applies', basis: 'in-state-activity' }, analytics: { status: 'applies', basis: 'in-state-activity' } },
    choices: { ads: grant(), analytics: unset(), competition: grant() },
  }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.reason).toBe('permission-needed');
  expect(result.decisions.competition.allowed).toBe(true);
});
test('non-NY residence alone does not exclude covered NY activity', () => {
  const result = resolveLaunchProcessingPolicy(input({ subdivision: 'CA', age: teen, newYorkApplicability: undefined }));
  expect(result.requirements.ads).toBe('express-consent');
  expect(result.decisions.ads.allowed).toBe(false);
});
test('current specific teen consent can satisfy unknown NY applicability', () => {
  const result = resolveLaunchProcessingPolicy(input({
    subdivision: 'CA', age: teen, newYorkApplicability: undefined,
    choices: { ads: grant(), analytics: deny(), competition: grant() },
  }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.reason).toBe('refused');
});
test('outside US does not erase known NY collection history', () => {
  const result = resolveLaunchProcessingPolicy(input({
    country: 'AU', subdivision: null, age: { ...teen, lowerBound: 15 },
    newYorkApplicability: { ads: { status: 'applies', basis: 'covered-data-history' }, analytics: outside },
  }));
  expect(result.decisions.ads.allowed).toBe(false);
  expect(result.decisions.analytics.allowed).toBe(true);
});
test('incomplete wholly-outside proof does not clear teen processing', () => {
  const result = resolveLaunchProcessingPolicy(input({
    age: teen, newYorkApplicability: { ads: { ...outside, noNewYorkCollectedDataUsed: false }, analytics: outside },
  }));
  expect(result.decisions.ads.allowed).toBe(false);
});
test('Connecticut teen RC remains blocked even with express grant; reviewed contextual ads stay independent', () => {
  const result = resolveLaunchProcessingPolicy(input({
    subdivision: 'CT', age: teen, connecticutContextualAdsReviewed: true,
    choices: { ads: grant(), analytics: grant(), competition: grant() },
  }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.allowed).toBe(false);
  expect(result.reasons.analytics).toBe('connecticut-reporting-not-necessary');
  expect(result.decisions.competition.allowed).toBe(true);
});
test('Connecticut unreviewed contextual route identifies exact necessity gap', () => {
  const result = resolveLaunchProcessingPolicy(input({ subdivision: 'CT', age: teen }));
  expect(result.missingFacts.ads).toContain('contextual-ad-necessity');
  expect(result.decisions.ads.allowed).toBe(false);
});
test('unknown US state cannot silently bypass Connecticut teen analytics rule', () => {
  const result = resolveLaunchProcessingPolicy(input({ subdivision: null, age: teen, connecticutContextualAdsReviewed: true }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.allowed).toBe(false);
  expect(result.missingFacts.analytics).toContain('state');
});
test('Mexico teen verified authority is independently scoped', () => {
  const result = resolveLaunchProcessingPolicy(input({
    country: 'MX', subdivision: null, age: teen,
    parentalAuthority: { ads: true },
    choices: { ads: unset(), analytics: grant(), competition: grant() },
  }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.reason).toBe('parent-permission-required');
  expect(result.decisions.competition.reason).toBe('parent-permission-required');
  expect(result.treatment).toBe('child');
});
test.each([[13, 'child', true], [15, 'teen', false]] as const)(
  'Australian %i minimum has appropriate capacity-related ad treatment', (lowerBound, treatment, underAgeOfConsent) => {
    const result = resolveLaunchProcessingPolicy(input({ country: 'AU', subdivision: null, age: { ...teen, lowerBound } }));
    expect(result.decisions.ads.allowed).toBe(lowerBound >= 15);
    if (lowerBound < 15) expect(result.decisions.ads.reason).toBe('parent-permission-required');
    expect(result.treatment).toBe(treatment);
    expect(result.underAgeOfConsent).toBe(underAgeOfConsent);
  },
);
test.each([
  { source: 'none' as const, status: 'unknown' as const, lowerBound: null, upperBound: null },
  { source: 'apple' as const, status: 'declined' as const, lowerBound: 18, upperBound: null },
  { source: 'apple' as const, status: 'shared' as const, lowerBound: -1, upperBound: 20 },
  { source: 'apple' as const, status: 'shared' as const, lowerBound: 18, upperBound: 17 },
  { source: 'apple' as const, status: 'shared' as const, lowerBound: 12, upperBound: 17 },
])('unknown or invalid range is never adult permission: %j', age => {
  const result = resolveLaunchProcessingPolicy(input({ age }));
  expect(result.ageEligibility).toBe('age-unresolved');
  expect(Object.values(result.decisions).every(decision => !decision.allowed)).toBe(true);
});
test('known under-thirteen remains outside audience', () => {
  const result = resolveLaunchProcessingPolicy(input({ age: { ...teen, lowerBound: 0, upperBound: 12 } }));
  expect(result.ageEligibility).toBe('outside-audience');
});
test('range crossing eighteen is not an adult grant', () => {
  const result = resolveLaunchProcessingPolicy(input({ age: { ...teen, lowerBound: 17, upperBound: 20 }, newYorkApplicability: undefined }));
  expect(result.treatment).toBe('teen');
  expect(result.decisions.ads.allowed).toBe(false);
});
test('sale/targeting opt-out permits restricted ads; full personal-data withdrawal blocks them', () => {
  const base = input({ choices: { ads: deny(), analytics: unset(), competition: unset() } });
  expect(resolveLaunchProcessingPolicy({ ...base, adsWithdrawalScope: 'sale-sharing-targeting' }).decisions.ads.allowed).toBe(true);
  expect(resolveLaunchProcessingPolicy({ ...base, adsWithdrawalScope: 'all-ad-personal-data' }).decisions.ads.reason).toBe('refused');
});
test('analytics refusal never disables independent ads or requested competition', () => {
  const result = resolveLaunchProcessingPolicy(input({ choices: { ads: unset(), analytics: deny(), competition: grant() } }));
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.reason).toBe('refused');
  expect(result.decisions.competition.allowed).toBe(true);
});
test('denial survives notice version changes and re-evaluation never mutates the plan', () => {
  const base = input();
  const plan = resolveLaunchProcessingPolicy(base);
  const result = evaluateLaunchProcessingPlan(plan, base.notices, {
    ...base.choices, analytics: { ...deny(), noticeVersion: 0 },
  });
  expect(result.decisions.analytics.reason).toBe('refused');
  expect(plan.decisions.analytics.allowed).toBe(true);
});
test('new notice invalidates express grant, not a remembered refusal', () => {
  const result = resolveLaunchProcessingPolicy(input({
    age: teen, newYorkApplicability: undefined,
    choices: { ads: { ...grant(), noticeVersion: 0 }, analytics: { ...deny(), noticeVersion: 0 }, competition: unset() },
  }));
  expect(result.decisions.ads.reason).toBe('notice-changed');
  expect(result.decisions.analytics.reason).toBe('refused');
});
test('static plan supports later QC activation without a new Apple request', () => {
  const base = input({ country: 'CA', subdivision: 'QC' });
  const plan = resolveLaunchProcessingPolicy(base);
  const result = evaluateLaunchProcessingPlan(plan, base.notices, base.choices, {
    quebecFunctionsActivated: { ads: true, analytics: false },
  });
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.allowed).toBe(false);
  expect(plan.decisions.ads.allowed).toBe(false);
});
test('plan stores no raw range, source, country or birthday', () => {
  const serialized = JSON.stringify(resolveLaunchProcessingPolicy(input()));
  for (const forbidden of ['lowerBound', 'upperBound', '"source"', '"country"', 'birthday']) expect(serialized).not.toContain(forbidden);
});
test.each([null, 'GB', 'DE'])('outside or unresolved launch country is not cleared: %s', country => {
  const result = resolveLaunchProcessingPolicy(input({ country }));
  expect(Object.values(result.decisions).every(decision => !decision.allowed)).toBe(true);
  expect(result.missingFacts.ads).toContain('country');
});
test('Apple thresholds distinguish Canadian fourteen and Australian fifteen without birthday', () => {
  expect(launchAppleAgeGates('CA')).toEqual([14, 16, 18]);
  expect(launchAppleAgeGates('AU')).toEqual([13, 15, 18]);
  expect(launchAppleAgeGates('US')).toEqual([13, 16, 18]);
  expect(launchAppleAgeGates('MX')).toEqual([13, 16, 18]);
});

test.each(['CA', 'AU', 'US', 'MX', null])('launch gates satisfy the native Apple contract: %s', country => {
  expect(validateAppleAgeGates(launchAppleAgeGates(country))).toBe(true);
});

test('verified adult helper derives a plan without fabricating Apple evidence', () => {
  const { age: _age, ...withoutAge } = input({ country: 'AU', subdivision: null });
  const result = resolveVerifiedAdultLaunchPlan(withoutAge);
  expect(result.ageEligibility).toBe('allowed');
  expect(result.treatment).toBe('unspecified');
  expect(result.decisions.analytics.allowed).toBe(true);
});
test('Canadian province refinement uses minimum existing rules and does not need Apple range', () => {
  const original = input({ country: 'CA', subdivision: null, age: teen });
  const plan = resolveLaunchProcessingPolicy(original);
  const { age: _age, ...withoutAge } = original;
  const result = refineLaunchProcessingPlan(plan, { ...withoutAge, subdivision: 'ON' });
  expect(result.decisions.ads.allowed).toBe(true);
  expect(result.decisions.analytics.allowed).toBe(true);
});
test('thirteen-year-old ON refinement to QC cannot accidentally become fourteen plus', () => {
  const original = input({ country: 'CA', subdivision: 'ON', age: { ...teen, lowerBound: 13, upperBound: 13 } });
  const plan = resolveLaunchProcessingPolicy(original);
  const { age: _age, ...withoutAge } = original;
  const result = refineLaunchProcessingPlan(plan, {
    ...withoutAge, subdivision: 'QC', quebecFunctionsActivated: { ads: true, analytics: true },
  });
  expect(result.decisions.ads.reason).toBe('parent-permission-required');
});
test('US state refinement clears only state uncertainty while retaining NY consent requirement', () => {
  const original = input({ subdivision: null, age: teen, newYorkApplicability: undefined });
  const plan = resolveLaunchProcessingPolicy(original);
  const { age: _age, ...withoutAge } = original;
  const result = refineLaunchProcessingPlan(plan, { ...withoutAge, subdivision: 'CA' });
  expect(result.requirements.analytics).toBe('express-consent');
  expect(result.decisions.analytics.reason).toBe('permission-needed');
});

// Regional correction: unknown geography must never be a confirmed jurisdiction.
test('regional correction: unknown Canadian province is unresolved, not Quebec consent', () => {
  const result = resolveLaunchProcessingPolicy(input({ country: 'CA', subdivision: null, quebecFunctionsActivated: {ads:true, analytics:true} }));
  expect(result.quebecActivationRequired).toEqual({ads:false,analytics:false});
  expect(result.requirements.ads).toBe('unresolved');
  expect(result.reasons.ads).toBe('province-unresolved');
  expect(result.decisions.ads.allowed).toBe(false);
});
test('regional correction: unknown US state is unresolved, not Connecticut necessity', () => {
  const result = resolveLaunchProcessingPolicy(input({ country: 'US', subdivision: null, age: teen }));
  expect(result.reasons.ads).toBe('state-unresolved');
  expect(result.missingFacts.ads).toEqual(['state']);
  expect(result.reasons.analytics).toBe('state-unresolved');
});

test.each(['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','SK','YT','NON-QC'])(
  'regional correction: adult Canada %s has permitted ads without Quebec activation', subdivision => {
    const result=resolveLaunchProcessingPolicy(input({country:'CA',subdivision,choices:{ads:unset(),analytics:deny(),competition:grant()}}));
    expect(result.quebecActivationRequired).toEqual({ads:false,analytics:false});
    expect(result.requirements.ads).toBe('notice-and-opt-out');
    expect(result.decisions).toMatchObject({ads:{allowed:true},analytics:{allowed:false,reason:'refused'},competition:{allowed:true}});
});
test.each(['resident','not-resident','unknown'] as const)('regional correction: explicit Canadian %s selects only the supported rule', quebecResidency => {
  const result=resolveLaunchProcessingPolicy(input({country:'CA',subdivision:null,quebecResidency}));
  expect(result.quebecActivationRequired.ads).toBe(quebecResidency==='resident');
  expect(result.requirements.ads).toBe(quebecResidency==='resident'?'express-consent':quebecResidency==='not-resident'?'notice-and-opt-out':'unresolved');
});
test.each(['AL','AK','AZ','AR','CA','CO','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'])(
 'regional correction: verified US %s does not receive Connecticut restrictions', subdivision => {
   const result=resolveLaunchProcessingPolicy(input({country:'US',subdivision,age:teen}));
   expect(result.reasons.ads).not.toContain('connecticut');
   expect(result.reasons.analytics).not.toContain('connecticut');
});
test.each(['AU','MX'])('regional correction: %s adult does not acquire province/state consent from missing subdivision', country => {
  const result=resolveLaunchProcessingPolicy(input({country,subdivision:null,newYorkApplicability:undefined}));
  expect(result.requirements.ads).toBe('notice-and-opt-out');
  expect(result.quebecActivationRequired).toEqual({ads:false,analytics:false});
  expect(result.decisions.ads.allowed).toBe(true);
});

test.each(['CA','US','AU','MX'])('adult %s never inherits New York minor consent from missing scope',country=>{
  const result=resolveLaunchProcessingPolicy(input({country,subdivision:null,quebecResidency:'not-resident',newYorkApplicability:undefined}));
  expect(result.separateExpressChoiceRequired).toEqual({ads:false,analytics:false});
  expect(result.decisions.ads.allowed).toBe(true);
});

test('known New York activity cannot be contradicted by a stale wholly-outside exemption',()=>{
  const result=resolveLaunchProcessingPolicy(input({country:'US',subdivision:'NY',age:teen}));
  expect(result.reasons.ads).toBe('new-york-express-consent-required');
  expect(result.decisions.ads.allowed).toBe(false);
});

test.each(['CA','US','AU'])('%s teen missing processing scope is expressly unresolved, never identified as New York',country=>{
  const result=resolveLaunchProcessingPolicy(input({country,subdivision:country==='US'?'CA':null,
    quebecResidency:'not-resident',age:{...teen,lowerBound:15},newYorkApplicability:undefined}));
  expect(result.reasons.ads).toBe('new-york-applicability-unresolved');
  expect(result.missingFacts.ads).toContain('new-york-applicability');
  expect(result.requirements.ads).toBe('express-consent');
});
