import {
  isCompleteChallengeCode,
  normalizeChallengeCode,
  normalizeChallengeTarget,
} from '../challengeInput';

describe('friend challenge inputs', () => {
  it('normalizes shareable codes to the server-supported alphabet and length', () => {
    expect(normalizeChallengeCode(' ab-10cd9 ')).toBe('ABCD9');
    expect(normalizeChallengeCode('ab23cd99')).toBe('AB23CD');
    expect(isCompleteChallengeCode('AB23CD')).toBe(true);
    expect(isCompleteChallengeCode('AB10CD')).toBe(false);
    expect(isCompleteChallengeCode('SHORT')).toBe(false);
  });

  it('keeps created and shared targets within the same one-to-sixty range', () => {
    expect(normalizeChallengeTarget('')).toBe(10);
    expect(normalizeChallengeTarget('0')).toBe(1);
    expect(normalizeChallengeTarget('25')).toBe(25);
    expect(normalizeChallengeTarget('999')).toBe(60);
  });
});
