import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type Bridge = {
  getIntegrityKey(userId: string): Promise<string>;
  attestIntegrityKey(userId: string, keyId: string, challenge: string): Promise<string>;
  signCompetitionResult(keyId: string, runId: string, nonce: string, score: number, duration: number): Promise<string>;
  forgetIntegrityKey(userId: string): Promise<void>;
  confirmIntegrityKey(userId: string, keyId: string): Promise<void>;
};
const bridge = () => {
  const native = Platform.OS === 'ios' ? requireOptionalNativeModule<Bridge>('FlapFitAgeRange') : null;
  if (!native?.getIntegrityKey || !native.attestIntegrityKey || !native.signCompetitionResult) {
    throw new Error('This version cannot verify online scores. Local play remains available.');
  }
  return native;
};
type Request = <T>(path: string, body: unknown) => Promise<T>;
const pending = new Map<string, Promise<string>>();

export async function prepareCompetitionIntegrity(userId: string, request: Request, assertAccess: () => void): Promise<string> {
  assertAccess();
  let operation = pending.get(userId);
  if (!operation) {
    operation = (async () => {
      const native = bridge();
      const keyId = await native.getIntegrityKey(userId);
      assertAccess();
      const state = await request<{ registered: boolean; challenge?: string }>('/integrity/challenge', { keyId });
      assertAccess();
      if (state.registered === true) { await native.confirmIntegrityKey(userId, keyId); assertAccess(); return keyId; }
      if (typeof state.challenge !== 'string' || !/^[a-f0-9]{64}$/.test(state.challenge)) throw new Error('App verification could not start.');
      const attestation = await native.attestIntegrityKey(userId, keyId, state.challenge);
      assertAccess();
      const result = await request<{ registered: boolean }>('/integrity/register', { keyId, attestation });
      assertAccess();
      if (result.registered !== true) throw new Error('App verification was not confirmed.');
      await native.confirmIntegrityKey(userId, keyId);
      assertAccess();
      return keyId;
    })();
    pending.set(userId, operation);
  }
  try { const keyId = await operation; assertAccess(); return keyId; }
  finally { if (pending.get(userId) === operation) pending.delete(userId); }
}

export async function sealCompetitionResult(input: {
  keyId?: string; nonce?: string; runId: string; score: number; durationMs: number;
}): Promise<string> {
  if (!input.keyId || !input.nonce) throw new Error('This run did not start with app verification.');
  return bridge().signCompetitionResult(input.keyId, input.runId, input.nonce, input.score, input.durationMs);
}

export async function forgetCompetitionIntegrity(userId: string): Promise<void> {
  // A pending enrollment may finish after deletion starts. Drain it before
  // removing its key identifier so it cannot repopulate local key storage.
  await pending.get(userId)?.catch(() => undefined);
  if (Platform.OS === 'ios') await requireOptionalNativeModule<Bridge>('FlapFitAgeRange')?.forgetIntegrityKey?.(userId);
}
