import {
  evaluateProcessing,
  initialProcessingInputs,
  mayAutomaticallyRequest,
  PROCESSING_NOTICE_VERSION,
  type AgeEvidence,
  type ProcessingChoice,
  type ProcessingInputs,
  type Purpose,
} from '../processingPolicy';

const purposes: Purpose[] = ['ads', 'analytics', 'competition'];
const age = (lowerBound: number | null, upperBound: number | null): AgeEvidence => ({
  source: 'apple', status: 'shared', lowerBound, upperBound,
});
const granted = (): ProcessingChoice => ({
  decision: 'granted', noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: '2026-09-20T10:00:00.000Z',
});
function ready(): ProcessingInputs {
  return {
    ...initialProcessingInputs(), hydrated: true, region: 'us',
    appleRequirement: 'not-required', appleRescissionPending: false, age: age(13, 17),
    requirements: { ads: 'express-consent', analytics: 'express-consent', competition: 'requested-service' },
    choices: { ads: granted(), analytics: granted(), competition: granted() },
  };
}
function decisions(input: ProcessingInputs) {
  const value = evaluateProcessing(input);
  return [value.ads, value.revenueCat, value.competition];
}

test('initial state selects no product policy and allows no processing', () => {
  const input = initialProcessingInputs();
  expect(input.requirements).toEqual({ ads: 'unresolved', analytics: 'unresolved', competition: 'unresolved' });
  expect(decisions(input).every((value) => !value.allowed && value.reason === 'loading')).toBe(true);
  const otherwiseReady = { ...ready(), requirements: input.requirements };
  expect(decisions(otherwiseReady).every((value) => !value.allowed && value.reason === 'policy-unresolved')).toBe(true);
});

describe('Apple inclusive age bounds', () => {
  test.each([
    [null, 12, 'outside-audience'],
    [0, 12, 'outside-audience'],
    [12, 12, 'outside-audience'],
    [null, 13, 'age-unresolved'],
    [null, null, 'age-unresolved'],
    [12, 17, 'age-unresolved'],
    [17, 16, 'age-unresolved'],
    [-1, 12, 'age-unresolved'],
    [13.5, 17, 'age-unresolved'],
    [13, Number.NaN, 'age-unresolved'],
  ] as const)('%s through %s does not become an adult or eligible teen', (lower, upper, reason) => {
    const input = { ...ready(), age: age(lower, upper) };
    expect(decisions(input).every((value) => !value.allowed && value.reason === reason)).toBe(true);
    expect(evaluateProcessing(input).ads.treatment).not.toBe('unspecified');
  });

  test.each([[13, 13], [13, 15], [16, 17], [13, null]] as const)(
    'eligible range %s through %s always receives teen treatment',
    (lower, upper) => {
      const result = evaluateProcessing({ ...ready(), age: age(lower, upper) });
      expect(result.ads).toMatchObject({ allowed: true, treatment: 'teen', underAgeOfConsent: false });
      expect(result.revenueCat.allowed).toBe(true);
      expect(result.competition.allowed).toBe(true);
    }
  );

  test('only an established lower bound of 18 permits adult treatment', () => {
    expect(evaluateProcessing({ ...ready(), age: age(18, null) }).ads)
      .toMatchObject({ allowed: true, treatment: 'unspecified', underAgeOfConsent: false });
    expect(evaluateProcessing({ ...ready(), age: age(17, null) }).ads.treatment).toBe('teen');
  });

  test.each([
    [13, 13, false, 'parent-permission-required'],
    [13, 14, false, 'age-14-unresolved'],
    [13, 15, false, 'age-14-unresolved'],
    [14, 14, true, 'allowed'],
    [14, 17, true, 'allowed'],
  ] as const)('Quebec range %s through %s respects the age-14 boundary', (lower, upper, allowed, reason) => {
    const input: ProcessingInputs = { ...ready(), region: 'ca-quebec', age: age(lower, upper) };
    expect(decisions(input).every((value) => value.allowed === allowed && value.reason === reason)).toBe(true);
  });

  test.each(['unknown', 'declined', 'unsupported', 'unavailable', 'error'] as const)(
    '%s age is never interpreted as adult even if stale adult bounds remain',
    (status) => {
      const input = { ...ready(), age: { ...age(18, null), status } };
      expect(decisions(input).every((value) => !value.allowed && value.reason === 'age-unresolved')).toBe(true);
      expect(evaluateProcessing(input).ads).toMatchObject({ treatment: 'child', underAgeOfConsent: true });
    }
  );
});

test.each(['pending', 'error'] as const)('an Apple check that is %s blocks self-declared eligibility', (appleRequirement) => {
  const input: ProcessingInputs = { ...ready(), appleRequirement, age: { ...age(18, null), source: 'self' } };
  expect(decisions(input).every((value) => !value.allowed && value.reason === 'apple-check-pending')).toBe(true);
});

test('a self-declared range cannot replace a required Apple result', () => {
  const input: ProcessingInputs = {
    ...ready(), appleRequirement: 'required', appleAgeCheckSatisfied: true,
    age: { ...age(18, null), source: 'self' },
  };
  expect(decisions(input).every((value) => !value.allowed && value.reason === 'apple-check-required')).toBe(true);
  input.age = age(13, 17);
  expect(decisions(input).every((value) => value.allowed)).toBe(true);
  input.appleAgeCheckSatisfied = false;
  expect(decisions(input).every((value) => !value.allowed && value.reason === 'apple-check-required')).toBe(true);
});

test('Apple access permission is distinct from purpose authorization', () => {
  const input: ProcessingInputs = {
    ...ready(), appleRequirement: 'required', appleAgeCheckSatisfied: true,
    choices: initialProcessingInputs().choices,
  };
  expect(decisions(input).every((value) => !value.allowed && value.reason === 'permission-needed')).toBe(true);
  input.choices = ready().choices;
  input.appleAccessRestricted = true;
  expect(decisions(input).every((value) => !value.allowed && value.reason === 'apple-access-restricted')).toBe(true);
});

test.each(['unknown', 'other'] as const)('region %s cannot silently borrow a cleared region policy', (region) => {
  expect(decisions({ ...ready(), region }).every((value) => !value.allowed)).toBe(true);
});

test.each(purposes)('refusing %s does not refuse the other purposes', (purpose) => {
  const input = ready();
  input.choices[purpose] = { ...granted(), decision: 'denied' };
  const result = evaluateProcessing(input);
  const mapped = { ads: result.ads, analytics: result.revenueCat, competition: result.competition };
  for (const candidate of purposes) {
    expect(mapped[candidate]).toMatchObject(candidate === purpose
      ? { allowed: false, reason: 'refused' } : { allowed: true, reason: 'allowed' });
  }
});

test('an unresolved analytics policy does not disable independently cleared ads or competition', () => {
  const input = ready();
  input.requirements.analytics = 'unresolved';
  expect(evaluateProcessing(input)).toMatchObject({
    ads: { allowed: true }, revenueCat: { allowed: false, reason: 'policy-unresolved' }, competition: { allowed: true },
  });
});

test('notice-and-opt-out requires its current notice and honors refusal', () => {
  const input = ready();
  input.requirements.ads = 'notice-and-opt-out';
  input.choices.ads = initialProcessingInputs().choices.ads;
  expect(evaluateProcessing(input).ads).toMatchObject({ allowed: false, reason: 'notice-needed' });
  input.presentedNoticeVersion = PROCESSING_NOTICE_VERSION;
  expect(evaluateProcessing(input).ads.allowed).toBe(true);
  input.choices.ads = { ...granted(), decision: 'denied' };
  expect(evaluateProcessing(input).ads).toMatchObject({ allowed: false, reason: 'refused' });
});

test('a requested service does not initialize before the user requests it', () => {
  const input = ready();
  input.choices.competition = initialProcessingInputs().choices.competition;
  input.presentedNoticeVersion = PROCESSING_NOTICE_VERSION;
  expect(evaluateProcessing(input).competition).toMatchObject({ allowed: false, reason: 'permission-needed' });
});

test('old affirmative permission does not silently authorize a revised notice', () => {
  const input = ready();
  input.choices.analytics.noticeVersion = PROCESSING_NOTICE_VERSION - 1;
  expect(evaluateProcessing(input).revenueCat).toMatchObject({ allowed: false, reason: 'notice-changed' });
});

describe('automatic repeat-request calendar guard', () => {
  const refusal: ProcessingChoice = {
    decision: 'denied', noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: '2026-09-20T10:00:00.000Z',
  };
  test.each(['2026-09-21T00:00:00.000Z', '2027-01-01T00:00:00.000Z', '2027-12-31T23:59:59.999Z'])(
    'no automatic repeat at %s after a 2026 refusal', (date) => {
      expect(mayAutomaticallyRequest(refusal, new Date(date))).toBe(false);
    }
  );
  test('allows a new automatic request only after the following calendar year has ended', () => {
    expect(mayAutomaticallyRequest(refusal, new Date('2028-01-01T00:00:00.000Z'))).toBe(true);
  });
  test('missing or invalid refusal time cannot shorten the waiting period', () => {
    expect(mayAutomaticallyRequest({ ...refusal, decidedAt: null }, new Date('2030-01-01'))).toBe(false);
    expect(mayAutomaticallyRequest({ ...refusal, decidedAt: 'not-a-date' }, new Date('2030-01-01'))).toBe(false);
  });
  test('does not repeat grants and can initially ask when no decision exists', () => {
    expect(mayAutomaticallyRequest(granted())).toBe(false);
    expect(mayAutomaticallyRequest(initialProcessingInputs().choices.ads)).toBe(true);
  });
});


test('required Apple rescission check is an independent gate even after valid age and purpose choices', () => {
  const input: ProcessingInputs={...ready(),appleRequirement:'required',appleAgeCheckSatisfied:true,appleRescissionPending:true};
  expect(decisions(input).every(value=>!value.allowed&&value.reason==='apple-access-check-pending')).toBe(true);
  input.appleRescissionPending=false;expect(decisions(input).every(value=>value.allowed)).toBe(true);
  input.choices.analytics={...input.choices.analytics,decision:'denied'};
  expect(evaluateProcessing(input).revenueCat.allowed).toBe(false);expect(evaluateProcessing(input).ads.allowed).toBe(true);
});
