import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { AppleAppTransactionNativeModule, AppleAppTransactionResult } from './src/appTransactionTypes';

export type { AppleAppTransactionResult } from './src/appTransactionTypes';

function failure(status: Exclude<AppleAppTransactionResult['status'], 'verified'>): AppleAppTransactionResult {
  return { status, signedAppTransaction: null };
}
function normalize(value: unknown): AppleAppTransactionResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return failure('error');
  const record = value as Record<string, unknown>;
  if (record.status === 'unsupported' || record.status === 'unavailable' || record.status === 'unverified') {
    return failure(record.status);
  }
  // This checks the bridge shape only, not the signature. The receiving server must
  // independently verify Apple's JWS, certificate chain, bundle ID and environment.
  if ((record.environment !== 'Production' && record.environment !== 'Sandbox') ||
      record.status !== 'verified' || typeof record.signedAppTransaction !== 'string' ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(record.signedAppTransaction)) return failure('error');
  return { status: 'verified', signedAppTransaction: record.signedAppTransaction, environment: record.environment };
}

/** Passive StoreKit read only: no refresh, sign-in, purchase, or custom age UI.
 * Forward the signed value directly to the app's verified revocation/status endpoint
 * and discard it. Never store it, decode an ID in JS, log it, or send it to ads/RC.
 * No result or promise is cached here. This does not establish current consent. */
export async function getVerifiedAppleAppTransaction(): Promise<AppleAppTransactionResult> {
  if (Platform.OS !== 'ios') return failure('unsupported');
  let native: AppleAppTransactionNativeModule | null;
  try {
    native = requireOptionalNativeModule<AppleAppTransactionNativeModule>('FlapFitAgeRange');
  } catch {
    return failure('unsupported');
  }
  if (!native || typeof native.getVerifiedAppTransaction !== 'function') return failure('unsupported');
  try {
    return normalize(await native.getVerifiedAppTransaction());
  } catch {
    return failure('error');
  }
}
