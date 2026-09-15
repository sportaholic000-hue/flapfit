export const CHALLENGE_CODE_LENGTH = 6;

export function normalizeChallengeCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, '')
    .slice(0, CHALLENGE_CODE_LENGTH);
}

export function isCompleteChallengeCode(value: string): boolean {
  return /^[A-Z2-9]{6}$/.test(value);
}

export function normalizeChallengeTarget(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(60, Math.max(1, parsed)) : 10;
}
