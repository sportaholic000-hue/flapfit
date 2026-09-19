import {
  resolveRegionalPolicy, type NewYorkApplicabilityEvidence, type RegionalPolicyInputs,
} from '../regionalPolicy';
import {
  evaluateProcessing, initialProcessingInputs, PROCESSING_NOTICE_VERSION,
  type AgeEvidence, type ProcessingChoice, type ProcessingInputs,
} from '../processingPolicy';

const age = (lowerBound: number | null, upperBound: number | null): AgeEvidence => ({
  source: 'apple', status: 'shared', lowerBound, upperBound,
});
function outsideNewYork(): NewYorkApplicabilityEvidence {
  return { status: 'wholly-outside', collectedOutsideNewYork: true,
    noUseInNewYork: true, noNewYorkCollectedDataUsed: true };
}
function inNewYork(): NonNullable<RegionalPolicyInputs['newYorkApplicability']> {
  return {
    ads: { status: 'applies', basis: 'in-state-activity' },
    analytics: { status: 'applies', basis: 'in-state-activity' },
  };
}
function ready(): RegionalPolicyInputs {
  const common = {
    providerOnly: true, disclosed: true, nonSensitive: true, purposeLimited: true,
    quebecFunctions: 'not-present' as const,
  };
  return {
    country: 'US', subdivision: null, age: age(18, null),
    newYorkApplicability: { ads: outsideNewYork(), analytics: outsideNewYork() },
    flows: {
      ads: { ...common, nonPersonalized: true, restrictedDataProcessing: true,
        connecticutNecessaryContextualDelivery: false },
      analytics: { ...common, connecticutStrictInternalNecessity: false },
    },
    choices: { adsWithdrawalScope: 'none',
      quebecAdsFunctionsActivated: false, quebecAnalyticsFunctionsActivated: false },
  };
}
function core(input: RegionalPolicyInputs): ProcessingInputs {
  const resolved = resolveRegionalPolicy(input);
  return {
    ...initialProcessingInputs(), hydrated: true, region: resolved.region, age: input.age,
    appleRequirement: 'not-required', requirements: resolved.requirements,
    presentedNoticeVersion: PROCESSING_NOTICE_VERSION,
  };
}
function choice(decision: ProcessingChoice['decision']): ProcessingChoice {
  return { decision, noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: '2026-09-19T12:00:00Z' };
}

test('verified US adult route needs notice, not a state question or universal opt-in', () => {
  const resolved = resolveRegionalPolicy(ready());
  expect(resolved.requirements).toEqual({
    ads: 'notice-and-opt-out', analytics: 'notice-and-opt-out', competition: 'requested-service',
  });
  expect(resolved.missingFacts).toEqual([]);
  const access = evaluateProcessing(core(ready()));
  expect(access.ads.allowed).toBe(true);
  expect(access.revenueCat.allowed).toBe(true);
  expect(access.competition.allowed).toBe(false);
});

test.each(['ON', 'BC', 'AB', 'NS', 'CA-ON', 'CA-NON-QC'])('Canadian adult %s uses assessed notice route', (province) => {
  const input = { ...ready(), country: 'CA', subdivision: province };
  expect(resolveRegionalPolicy(input)).toMatchObject({
    region: 'ca-other', requirements: { ads: 'notice-and-opt-out', analytics: 'notice-and-opt-out' },
    missingFacts: [],
  });
});

test.each([null, '', 'unknown'])('unknown country %s never defaults to US adult', (country) => {
  const resolved = resolveRegionalPolicy({ ...ready(), country });
  expect(resolved.requirements.ads).toBe('unresolved');
  expect(resolved.missingFacts).toEqual(['country']);
});
test.each(['GB', 'FR', 'AU'])('unreviewed country %s stays outside release policy', (country) => {
  expect(resolveRegionalPolicy({ ...ready(), country })).toMatchObject({
    region: 'other', reasons: { ads: 'worldwide-not-cleared' }, missingFacts: [],
  });
});

test.each([null, 'XX', 'US-NY', 'non-quebec', 'other'])('Canada needs Quebec status, not an unconfirmed %s', (subdivision) => {
  expect(resolveRegionalPolicy({ ...ready(), country: 'CA', subdivision }).missingFacts).toEqual(['quebec-status']);
});

test.each(['unknown', 'declined', 'unsupported', 'unavailable', 'error'] as const)(
  'stale adult bounds with %s status never grant an adult route', (status) => {
    const input = { ...ready(), age: { ...age(18, null), status } };
    expect(resolveRegionalPolicy(input)).toMatchObject({
      requirements: { ads: 'unresolved', analytics: 'unresolved' }, missingFacts: ['age'],
    });
  },
);
test.each([[null, null], [18, 17], [-1, 12], [13.5, 17], [13, Number.NaN]] as const)(
  'malformed interval %s..%s stays unresolved', (lower, upper) => {
    expect(resolveRegionalPolicy({ ...ready(), age: age(lower, upper) }).missingFacts).toEqual(['age']);
  },
);
test('under13 is outside audience; a lower-open interval through13 is unresolved', () => {
  expect(resolveRegionalPolicy({ ...ready(), age: age(null, 12) }).reasons.ads).toBe('outside-audience');
  expect(resolveRegionalPolicy({ ...ready(), age: age(null, 13) }).missingFacts).toEqual(['age']);
});
test('Quebec inclusive age13 requires parental permission, not teen self-consent', () => {
  const input = { ...ready(), country: 'CA', subdivision: 'QC', age: age(13, 13) };
  expect(resolveRegionalPolicy(input)).toMatchObject({
    requirements: { ads: 'unresolved', analytics: 'unresolved', competition: 'unresolved' },
    reasons: { ads: 'parent-permission-required' }, missingFacts: [],
  });
});
test.each([[13, 14], [13, 15], [13, null]] as const)('Quebec %s..%s needs only age14 refinement', (lower, upper) => {
  const input = { ...ready(), country: 'CA', subdivision: 'QC', age: age(lower, upper) };
  expect(resolveRegionalPolicy(input).missingFacts).toEqual(['age-at-least-14']);
});
test.each([[14, 14], [14, 17], [18, null]] as const)('Quebec %s..%s has no universal adult/teen opt-in', (lower, upper) => {
  const input = { ...ready(), country: 'CA', subdivision: 'QC', age: age(lower, upper) };
  expect(resolveRegionalPolicy(input).requirements.ads).toBe('notice-and-opt-out');
});
test('Quebec function uncertainty affects its purpose only', () => {
  const input = { ...ready(), country: 'CA', subdivision: 'QC' };
  input.flows.ads.quebecFunctions = 'unresolved';
  expect(resolveRegionalPolicy(input)).toMatchObject({
    requirements: { ads: 'unresolved', analytics: 'notice-and-opt-out' },
    unresolvedConditions: { ads: ['quebec-function-assessment'] },
  });
});
test('Quebec function activation is separate for ads and analytics', () => {
  const input = { ...ready(), country: 'CA', subdivision: 'CA-QC' };
  input.flows.ads.quebecFunctions = 'activation-required';
  input.flows.analytics.quebecFunctions = 'activation-required';
  expect(resolveRegionalPolicy(input).requirements).toMatchObject({
    ads: 'express-consent', analytics: 'express-consent',
  });
  input.choices.quebecAdsFunctionsActivated = true;
  expect(resolveRegionalPolicy(input).requirements).toMatchObject({
    ads: 'notice-and-opt-out', analytics: 'express-consent',
  });
});
test('Quebec function activation cannot override an unassessed data flow', () => {
  const input = { ...ready(), country: 'CA', subdivision: 'QC' };
  input.flows.ads.nonSensitive = false;
  input.flows.ads.quebecFunctions = 'activation-required';
  input.choices.quebecAdsFunctionsActivated = true;
  expect(resolveRegionalPolicy(input).requirements.ads).toBe('unresolved');
});

test.each([[13, 15], [16, 17], [13, null], [17, 18]] as const)(
  'US nonadult-proven interval %s..%s needs state for differing teen rules', (lower, upper) => {
    const resolved = resolveRegionalPolicy({ ...ready(), age: age(lower, upper) });
    expect(resolved.missingFacts).toEqual(['state']);
    expect(resolved.requirements).toEqual({
      ads: 'unresolved', analytics: 'unresolved', competition: 'requested-service',
    });
  },
);
test('a fictional US state never becomes an ordinary teen route', () => {
  expect(resolveRegionalPolicy({ ...ready(), subdivision: 'XX', age: age(13, 17) }).missingFacts).toEqual(['state']);
});
test('NY teen needs separate consent for ads and RevenueCat', () => {
  const input = { ...ready(), subdivision: 'US-NY', age: age(13, 17), newYorkApplicability: inNewYork() };
  expect(resolveRegionalPolicy(input).requirements).toMatchObject({
    ads: 'express-consent', analytics: 'express-consent',
  });
  const state = core(input);
  state.choices.ads = choice('granted');
  expect(evaluateProcessing(state).ads.allowed).toBe(true);
  expect(evaluateProcessing(state).revenueCat.allowed).toBe(false);
});
test('NY adult does not inherit the teen consent requirements', () => {
  expect(resolveRegionalPolicy({ ...ready(), subdivision: 'NY' }).requirements.ads).toBe('notice-and-opt-out');
});
test('CT teen disclosure and generic consent do not clear necessity', () => {
  const input = { ...ready(), subdivision: 'CT', age: age(16, 17) };
  const resolved = resolveRegionalPolicy(input);
  expect(resolved.requirements).toMatchObject({ ads: 'unresolved', analytics: 'unresolved' });
  expect(resolved.unresolvedConditions).toMatchObject({
    ads: ['connecticut-contextual-delivery-necessity'],
    analytics: ['connecticut-strict-internal-necessity'],
  });
  const state = core(input);
  state.choices.ads = choice('granted');
  state.choices.analytics = choice('granted');
  expect(evaluateProcessing(state).ads.allowed).toBe(false);
  expect(evaluateProcessing(state).revenueCat.allowed).toBe(false);
});
test('CT verified necessary contextual ads can run independently of optional RC reporting', () => {
  const input = { ...ready(), subdivision: 'CT', age: age(13, 17) };
  input.flows.ads.connecticutNecessaryContextualDelivery = true;
  const resolved = resolveRegionalPolicy(input);
  expect(resolved.requirements).toMatchObject({ ads: 'notice-and-opt-out', analytics: 'unresolved' });
  expect(evaluateProcessing(core(input)).ads.allowed).toBe(true);
  expect(evaluateProcessing(core(input)).revenueCat.allowed).toBe(false);
});
test('CT reporting needs its own explicit strict internal necessity assessment', () => {
  const input = { ...ready(), subdivision: 'CT', age: age(13, 17) };
  input.flows.analytics.connecticutStrictInternalNecessity = true;
  expect(resolveRegionalPolicy(input).requirements).toMatchObject({
    ads: 'unresolved', analytics: 'notice-and-opt-out',
  });
});
test('CT adult does not require the minor-only necessity flags', () => {
  expect(resolveRegionalPolicy({ ...ready(), subdivision: 'CT' }).requirements.ads).toBe('notice-and-opt-out');
});
test.each(['CO', 'MT', 'MD', 'OR', 'DE', 'NJ', 'CA', 'TX', 'DC'])(
  'verified contextual, non-sale, purpose-limited teen route in %s avoids blanket teen opt-in', (subdivision) => {
    const input = { ...ready(), subdivision, age: age(13, 17) };
    expect(resolveRegionalPolicy(input).requirements).toMatchObject({
      ads: 'notice-and-opt-out', analytics: 'notice-and-opt-out',
    });
  },
);

test.each(['providerOnly', 'disclosed', 'nonSensitive', 'purposeLimited', 'nonPersonalized', 'restrictedDataProcessing'] as const)(
  'unverified ads %s cannot be fixed by selecting adult or notice route', (field) => {
    const input = ready();
    input.flows.ads[field] = false;
    expect(resolveRegionalPolicy(input).requirements).toMatchObject({
      ads: 'unresolved', analytics: 'notice-and-opt-out',
    });
  },
);
test('reports every missing data-flow assessment rather than hiding later blockers', () => {
  const input = ready();
  input.flows.ads.providerOnly = false;
  input.flows.ads.nonSensitive = false;
  input.flows.ads.restrictedDataProcessing = false;
  expect(resolveRegionalPolicy(input).unresolvedConditions.ads).toEqual([
    'advertising-route-not-verified', 'non-sensitive-data-assessment', 'restricted-data-processing',
  ]);
});
test('sale/share/targeting opt-out preserves the verified NPA/RDP ad route', () => {
  const input = ready();
  input.choices.adsWithdrawalScope = 'sale-sharing-targeting';
  expect(resolveRegionalPolicy(input).requirements.ads).toBe('notice-and-opt-out');
});
test('full ad personal-data withdrawal cannot be bypassed by NPA/RDP', () => {
  const input = ready();
  input.choices.adsWithdrawalScope = 'all-ad-personal-data';
  expect(resolveRegionalPolicy(input)).toMatchObject({
    requirements: { ads: 'unresolved', analytics: 'notice-and-opt-out' },
    reasons: { ads: 'ad-personal-data-withdrawn' },
  });
});
test('analytics refusal leaves verified contextual ads available', () => {
  const state = core(ready());
  state.choices.analytics = choice('denied');
  const access = evaluateProcessing(state);
  expect(access.ads.allowed).toBe(true);
  expect(access.revenueCat).toMatchObject({ allowed: false, reason: 'refused' });
});
test('resolver does not bypass central Apple check or notice version', () => {
  const state = core(ready());
  state.appleRequirement = 'required';
  expect(evaluateProcessing(state).ads.allowed).toBe(false);
  state.appleRequirement = 'not-required';
  state.presentedNoticeVersion = null;
  expect(evaluateProcessing(state).ads).toMatchObject({ allowed: false, reason: 'notice-needed' });
});
test('resolution contains no raw Apple evidence and does not mutate input', () => {
  const input = ready();
  const before = JSON.stringify(input);
  const resolved = resolveRegionalPolicy(input);
  expect(JSON.stringify(input)).toBe(before);
  expect(JSON.stringify(resolved)).not.toMatch(/lowerBound|upperBound|source|ageRangeDeclaration/);
});

function restrictedDemand(): RegionalPolicyInputs {
  const input = ready();
  input.flows.ads.providerOnly = false;
  input.flows.ads.routeVerification = {
    kind: 'restricted-demand', thirdPartyRecipientsDisclosed: true,
    bidRequestDataMinimized: true, creativeProcessingRestricted: true,
    noSaleSharingOrCrossContext: true, contractualPurposeAndRetentionLimits: true,
  };
  return input;
}

test.each([
  ['US', null, 18, null], ['US', 'TX', 13, 17], ['CA', 'CA-NON-QC', 14, 17],
] as const)('assessed restricted demand permits the applicable %s/%s/%s notice route', (country, subdivision, lower, upper) => {
  const input = { ...restrictedDemand(), country, subdivision, age: age(lower, upper) };
  expect(resolveRegionalPolicy(input).requirements.ads).toBe('notice-and-opt-out');
  expect(evaluateProcessing(core(input)).ads.allowed).toBe(true);
});

test.each([
  ['thirdPartyRecipientsDisclosed', 'ad-third-party-recipients-not-disclosed'],
  ['bidRequestDataMinimized', 'ad-bid-data-not-minimized'],
  ['creativeProcessingRestricted', 'ad-creative-processing-not-restricted'],
  ['noSaleSharingOrCrossContext', 'ad-sale-sharing-restrictions-not-verified'],
  ['contractualPurposeAndRetentionLimits', 'ad-contractual-purpose-retention-not-verified'],
] as const)('restricted demand still requires its %s assessment', (field, missing) => {
  const input = restrictedDemand();
  const route = input.flows.ads.routeVerification;
  if (route?.kind !== 'restricted-demand') throw new Error('Invalid test fixture');
  route[field] = false;
  const result = resolveRegionalPolicy(input);
  expect(result.requirements.ads).toBe('unresolved');
  expect(result.unresolvedConditions.ads).toEqual([missing]);
});

test.each(['disclosed', 'nonSensitive', 'purposeLimited', 'nonPersonalized', 'restrictedDataProcessing'] as const)(
  'restricted demand does not replace the shared %s check', (field) => {
    const input = restrictedDemand();
    input.flows.ads[field] = false;
    expect(resolveRegionalPolicy(input).requirements.ads).toBe('unresolved');
  },
);

test('verified Google-only demand is an alternative ads route, not proof that all recipients are processors', () => {
  const input = ready();
  input.flows.ads.providerOnly = false;
  input.flows.ads.routeVerification = {
    kind: 'google-only', demandRestrictedToGoogle: true,
    thirdPartyCreativeVendorsExcluded: true, noSaleSharingOrCrossContext: true,
    contractualPurposeAndRetentionLimits: true,
  };
  expect(resolveRegionalPolicy(input).requirements.ads).toBe('notice-and-opt-out');
  input.flows.ads.routeVerification.thirdPartyCreativeVendorsExcluded = false;
  expect(resolveRegionalPolicy(input).unresolvedConditions.ads).toEqual(['ad-creative-processing-not-restricted']);
  input.flows.ads.routeVerification.demandRestrictedToGoogle = false;
  expect(resolveRegionalPolicy(input).unresolvedConditions.ads).toContain('google-only-demand-not-verified');
});

test('restricted demand does not turn NY minor consent into a notice-only route', () => {
  const input = { ...restrictedDemand(), subdivision: 'NY', age: age(13, 17), newYorkApplicability: inNewYork() };
  expect(resolveRegionalPolicy(input).requirements).toMatchObject({
    ads: 'express-consent', analytics: 'express-consent',
  });
  const state = core(input);
  expect(evaluateProcessing(state).ads.allowed).toBe(false);
  state.choices.ads = choice('granted');
  state.choices.analytics = choice('denied');
  const access = evaluateProcessing(state);
  expect(access.ads.allowed).toBe(true);
  expect(access.revenueCat).toMatchObject({ allowed: false, reason: 'refused' });
});

test('restricted demand leaves CT necessity independent of disclosure and consent', () => {
  const input = { ...restrictedDemand(), subdivision: 'CT', age: age(16, 17) };
  expect(resolveRegionalPolicy(input).unresolvedConditions.ads).toEqual(['connecticut-contextual-delivery-necessity']);
  const state = core(input);
  state.choices.ads = choice('granted');
  expect(evaluateProcessing(state).ads.allowed).toBe(false);
  input.flows.ads.connecticutNecessaryContextualDelivery = true;
  expect(evaluateProcessing(core(input)).ads.allowed).toBe(true);
  expect(evaluateProcessing(core(input)).revenueCat.allowed).toBe(false);
});

test('restricted demand does not bypass Quebec function activation or full advertising withdrawal', () => {
  const input = { ...restrictedDemand(), country: 'CA', subdivision: 'QC' };
  input.flows.ads.quebecFunctions = 'activation-required';
  expect(resolveRegionalPolicy(input).requirements.ads).toBe('express-consent');
  input.choices.quebecAdsFunctionsActivated = true;
  expect(resolveRegionalPolicy(input).requirements.ads).toBe('notice-and-opt-out');
  input.choices.adsWithdrawalScope = 'all-ad-personal-data';
  expect(resolveRegionalPolicy(input).reasons.ads).toBe('ad-personal-data-withdrawn');
});

test('sale/share/targeting opt-out keeps only an independently verified restricted-demand route', () => {
  const input = restrictedDemand();
  input.choices.adsWithdrawalScope = 'sale-sharing-targeting';
  expect(resolveRegionalPolicy(input).requirements.ads).toBe('notice-and-opt-out');
  const route = input.flows.ads.routeVerification;
  if (route?.kind !== 'restricted-demand') throw new Error('Invalid test fixture');
  route.noSaleSharingOrCrossContext = false;
  expect(resolveRegionalPolicy(input).requirements.ads).toBe('unresolved');
});

test('restricted-demand advertising remains independent of RevenueCat refusal and processor assessment', () => {
  const input = restrictedDemand();
  const state = core(input);
  state.choices.analytics = choice('denied');
  expect(evaluateProcessing(state).ads.allowed).toBe(true);
  expect(evaluateProcessing(state).revenueCat).toMatchObject({ allowed: false, reason: 'refused' });
  input.flows.analytics.providerOnly = false;
  expect(resolveRegionalPolicy(input)).toMatchObject({
    requirements: { ads: 'notice-and-opt-out', analytics: 'unresolved' },
    unresolvedConditions: { analytics: ['provider-only-processing'] },
  });
});


test.each([['US', 'TX'], ['US', 'NY'], ['CA', 'ON']] as const)(
  'residence %s/%s alone cannot decide NY scope for teenage processing', (country, subdivision) => {
    const input = { ...ready(), country, subdivision, age: age(16, 17), newYorkApplicability: undefined };
    expect(resolveRegionalPolicy(input)).toMatchObject({
      requirements: { ads: 'unresolved', analytics: 'unresolved', competition: 'requested-service' },
      reasons: { ads: 'new-york-applicability-unresolved', analytics: 'new-york-applicability-unresolved' },
      missingFacts: ['new-york-applicability'],
    });
    const state = core(input);
    state.choices.ads = choice('granted');
    state.choices.analytics = choice('granted');
    state.choices.competition = choice('granted');
    const access = evaluateProcessing(state);
    expect(access.ads.allowed).toBe(false);
    expect(access.revenueCat.allowed).toBe(false);
    expect(access.competition.allowed).toBe(true);
  },
);

test.each(['in-state-activity', 'covered-data-history'] as const)(
  'NY %s evidence requires teen consent regardless of non-NY residence', (basis) => {
    const input: RegionalPolicyInputs = { ...ready(), country: 'CA', subdivision: 'ON',
      age: age(16, 17), newYorkApplicability: {
        ads: { status: 'applies', basis }, analytics: { status: 'applies', basis },
      } };
    expect(resolveRegionalPolicy(input).requirements).toMatchObject({
      ads: 'express-consent', analytics: 'express-consent', competition: 'requested-service',
    });
    expect(evaluateProcessing(core(input)).ads.allowed).toBe(false);
  },
);

test('NY residence does not override verified wholly-outside processing', () => {
  expect(resolveRegionalPolicy({ ...ready(), subdivision: 'NY', age: age(16, 17) }).requirements).toMatchObject({
    ads: 'notice-and-opt-out', analytics: 'notice-and-opt-out',
  });
});

test.each(['collectedOutsideNewYork', 'noUseInNewYork', 'noNewYorkCollectedDataUsed'] as const)(
  'wholly-outside scope requires verified %s', (field) => {
    const evidence = outsideNewYork();
    if (evidence.status !== 'wholly-outside') throw new Error('Invalid test fixture');
    evidence[field] = false;
    const input = { ...ready(), subdivision: 'TX', age: age(13, 17),
      newYorkApplicability: { ads: evidence, analytics: outsideNewYork() } };
    expect(resolveRegionalPolicy(input)).toMatchObject({
      requirements: { ads: 'unresolved', analytics: 'notice-and-opt-out' },
      unresolvedConditions: { ads: ['new-york-applicability'], analytics: [] },
    });
  },
);

test('NY applicability remains independent for ads and analytics', () => {
  const input: RegionalPolicyInputs = { ...ready(), subdivision: 'TX', age: age(16, 17),
    newYorkApplicability: { ads: outsideNewYork(), analytics: { status: 'unknown' } } };
  expect(resolveRegionalPolicy(input).requirements).toMatchObject({
    ads: 'notice-and-opt-out', analytics: 'unresolved',
  });
  expect(evaluateProcessing(core(input)).ads.allowed).toBe(true);
  input.newYorkApplicability = {
    ads: { status: 'applies', basis: 'covered-data-history' }, analytics: outsideNewYork(),
  };
  const state = core(input);
  state.choices.ads = choice('denied');
  const access = evaluateProcessing(state);
  expect(access.ads).toMatchObject({ allowed: false, reason: 'refused' });
  expect(access.revenueCat.allowed).toBe(true);
});

test('NY consent never replaces CT necessity', () => {
  const input = { ...ready(), subdivision: 'CT', age: age(16, 17), newYorkApplicability: inNewYork() };
  input.flows.ads.connecticutNecessaryContextualDelivery = true;
  expect(resolveRegionalPolicy(input)).toMatchObject({
    requirements: { ads: 'express-consent', analytics: 'unresolved' },
    unresolvedConditions: { analytics: ['connecticut-strict-internal-necessity'] },
  });
});

test('NY applicability never skips Quebec function assessment', () => {
  const input = { ...ready(), country: 'CA', subdivision: 'QC', age: age(16, 17),
    newYorkApplicability: inNewYork() };
  input.flows.ads.quebecFunctions = 'unresolved';
  expect(resolveRegionalPolicy(input)).toMatchObject({
    requirements: { ads: 'unresolved', analytics: 'express-consent' },
    unresolvedConditions: { ads: ['quebec-function-assessment'] },
  });
});

test('adult processing does not need a minor-only NY scope assessment', () => {
  expect(resolveRegionalPolicy({ ...ready(), newYorkApplicability: undefined }).requirements).toMatchObject({
    ads: 'notice-and-opt-out', analytics: 'notice-and-opt-out',
  });
});
