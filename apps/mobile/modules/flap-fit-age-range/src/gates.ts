/** Requested thresholds are app policy, never a user's age or an exact birthday. */
export const DEFAULT_APPLE_AGE_GATES = [13, 16, 18] as const;

/** Apple permits up to three gates and ranges spanning at least two years.
 * Keep caller order; silently sorting, deduplicating or adding gates changes the request. */
export function validateAppleAgeGates(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= 3 &&
    Array.from(value).every((gate, index) => typeof gate === 'number' && Number.isSafeInteger(gate) &&
      gate >= 2 && (index === 0 || gate - value[index - 1] >= 2));
}
