import { Buffer } from 'node:buffer';
import {
  Environment, SignedDataVerifier, VerificationException, VerificationStatus,
} from '@apple/app-store-server-library';
import { APPLE_ROOTS_DER_BASE64 } from './apple-roots.ts';
import { APP_APPLE_ID, APP_BUNDLE_ID, ConsentRequestError } from './core.ts';
import type { AppleEnvironment } from './core.ts';

export function createAppleVerifier(environment: AppleEnvironment) {
  if (environment !== 'Production' && environment !== 'Sandbox') throw new ConsentRequestError(503);
  const verifier = new SignedDataVerifier(
    APPLE_ROOTS_DER_BASE64.map((root) => Buffer.from(root, 'base64')),
    true, // Online certificate revocation and current-expiration checks are mandatory.
    environment === 'Production' ? Environment.PRODUCTION : Environment.SANDBOX,
    APP_BUNDLE_ID, APP_APPLE_ID,
  );
  async function verify<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (error instanceof VerificationException &&
          error.status !== VerificationStatus.RETRYABLE_VERIFICATION_FAILURE) {
        throw new ConsentRequestError(400);
      }
      // OCSP/network errors must trigger Apple's retry, never acceptance or a cleared status.
      throw new ConsentRequestError(503);
    }
  }
  return {
    verifyNotification: (jws: string) => verify(() => verifier.verifyAndDecodeNotification(jws)),
    verifyAppTransaction: (jws: string) => verify(() => verifier.verifyAndDecodeAppTransaction(jws)),
  };
}
