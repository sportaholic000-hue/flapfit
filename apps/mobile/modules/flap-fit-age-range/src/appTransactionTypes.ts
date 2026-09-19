/** A verified download is identity evidence, never current app-use or analytics consent. */
export type AppleAppTransactionResult =
  | { status: 'verified'; signedAppTransaction: string }
  | { status: 'unsupported' | 'unavailable' | 'unverified' | 'error'; signedAppTransaction: null };

export type AppleAppTransactionNativeModule = {
  /** Optional so older native clients fail closed instead of inventing an identity. */
  getVerifiedAppTransaction?(): Promise<unknown>;
};
