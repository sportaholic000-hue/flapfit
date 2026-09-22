import { generateKeyPairSync, sign } from 'node:crypto';

jest.setTimeout(20_000);
const pair = generateKeyPairSync('ed25519');
const publicKey = Buffer.from(pair.publicKey.export({ format: 'jwk' }).x!, 'base64url').toString('hex');
const id = '18f86c19-283a-4f8e-8943-46c5f832c6f9';
function signed(request = id, expiry = Math.floor(Date.now() / 1000) + 86400, scope = 'google-processing-withdrawal') {
  const signature = sign(null, Buffer.from(`FlapFit privacy response|1|${scope}|${request}|${expiry}`), pair.privateKey).toString('hex');
  return `FFPR1.${request}.${expiry}.${signature}`;
}
async function fixture() {
  jest.resetModules();
  const memory = new Map<string, string>();
  const storage = { getItem: jest.fn(async (key: string) => memory.get(key) ?? null), setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }) };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  const nextId = jest.fn(() => id);
  jest.doMock('expo-modules-core', () => ({ uuid: { v4: nextId } }));
  jest.doMock('../supportResponseSignature', () => {
    const actual = jest.requireActual<typeof import('../supportResponseSignature')>('../supportResponseSignature');
    return { ...actual, verifySupportResponse: (code: string, request: string) => actual.verifySupportResponse(code, request, Date.now(), publicKey) };
  });
  const crypto = jest.requireActual<typeof import('../supportResponseSignature')>('../supportResponseSignature');
  const access: typeof import('../processingAccess') = require('../processingAccess');
  await access.hydrateProcessingAccess();
  const rights: typeof import('../privacyRights') = require('../privacyRights');
  const withdraw = jest.spyOn(rights, 'withdrawAdvertisingConsent');
  const service: typeof import('../supportResponse') = require('../supportResponse');
  return { memory, storage, nextId, crypto, access, service, withdraw };
}
test('real Ed25519 verification accepts the signed scope and rejects altered or foreign responses', async () => {
  const f = await fixture();
  const code = signed();
  expect(f.crypto.verifySupportResponse(code, id, Date.now(), publicKey)).toBe(true);
  const cases = [code.replace('FFPR1', 'FFPR2'), code.slice(0, -1) + (code.endsWith('0') ? '1' : '0'), signed(id, Math.floor(Date.now() / 1000) - 1),
    signed(id, Math.floor(Date.now() / 1000) + 32 * 86400), signed(id, undefined, 'analytics'), '', 'x'.repeat(257)];
  for (const bad of cases) expect(f.crypto.verifySupportResponse(bad, id, Date.now(), publicKey)).toBe(false);
  expect(f.crypto.verifySupportResponse(code, '28f86c19-283a-4f8e-8943-46c5f832c6f9', Date.now(), publicKey)).toBe(false);
  expect(f.crypto.verifySupportResponse(code, id)).toBe(false); // Test signer is not the production operator.
});
test('request preparation is idempotent and never changes any processing choice', async () => {
  const f = await fixture(); const before = f.access.getProcessingInputs();
  expect(await f.service.preparePrivacySupportRequest()).toBe(id);
  expect(await f.service.preparePrivacySupportRequest()).toBe(id);
  expect(f.access.getProcessingInputs()).toEqual(before);
  expect(f.withdraw).not.toHaveBeenCalled(); expect(f.nextId).toHaveBeenCalledTimes(1);
});
test('valid response saves only the advertising refusal and survives module restart', async () => {
  const f = await fixture();
  await f.access.setPrivacyRegion('us');
  f.access.setAppleAgeRequirement('not-required'); f.access.setAppleRescissionPending(false);
  f.access.setLaunchProcessingCountry('US', true);
  f.access.verifyLaunchAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, 'US', f.access.getAgeVerificationRevision());
  f.access.markProcessingNoticePresented(1);
  await f.access.setProcessingChoice('analytics', 'granted'); await f.access.setProcessingChoice('competition', 'granted');
  await f.access.setProcessingChoice('ads', 'granted');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  const before = f.access.getProcessingInputs();
  await f.service.preparePrivacySupportRequest();
  expect(await f.service.applyPrivacySupportResponse(signed())).toEqual({ status: 'completed', saved: true });
  expect(f.access.getProcessingInputs().choices).toEqual({ ...before.choices, ads: expect.objectContaining({ decision: 'denied' }) });
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  jest.resetModules();
  const restarted: typeof import('../processingAccess') = require('../processingAccess');
  await restarted.hydrateProcessingAccess();
  expect(restarted.getProcessingInputs().choices.ads.decision).toBe('denied');
  expect(restarted.getProcessingAccess().ads.allowed).toBe(false);
});
test.each(['missing', 'invalid', 'expired', 'different-device'])('%s response cannot reach the refusal', async (which) => {
  const f = await fixture();
  if (which !== 'missing') await f.service.preparePrivacySupportRequest();
  const code = which === 'invalid' ? 'invented' : which === 'expired' ? signed(id, 1000000000) : which === 'different-device' ? signed('28f86c19-283a-4f8e-8943-46c5f832c6f9') : signed();
  await expect(f.service.applyPrivacySupportResponse(code)).rejects.toThrow();
  expect(f.withdraw).not.toHaveBeenCalled(); expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
});
test('a new explicit grant invalidates an old code and the next request gets a new ID', async () => {
  const f = await fixture(); await f.service.preparePrivacySupportRequest();
  await f.service.applyPrivacySupportResponse(signed());
  await f.access.setProcessingChoice('ads', 'granted');
  f.withdraw.mockClear();
  await expect(f.service.applyPrivacySupportResponse(signed())).rejects.toThrow('choices have changed');
  expect(f.withdraw).not.toHaveBeenCalled();
  f.nextId.mockReturnValue('28f86c19-283a-4f8e-8943-46c5f832c6f9');
  expect(await f.service.preparePrivacySupportRequest()).not.toBe(id);
  await expect(f.service.applyPrivacySupportResponse(signed())).rejects.toThrow();
});
test('request save/read failures do not change processing', async () => {
  const f = await fixture(); f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await expect(f.service.preparePrivacySupportRequest()).rejects.toThrow();
  f.storage.getItem.mockRejectedValueOnce(new Error('unreadable'));
  await expect(f.service.applyPrivacySupportResponse(signed())).rejects.toThrow();
  expect(f.withdraw).not.toHaveBeenCalled();
});
test('a newer advertising choice intent wins even while its save has not completed', async () => {
  const f = await fixture(); await f.service.preparePrivacySupportRequest();
  let release!: (value: string | null) => void;
  let started!: () => void;
  const reading = new Promise<void>(resolve => { started = resolve; });
  f.storage.getItem.mockImplementationOnce(() => { started(); return new Promise(resolve => { release = resolve; }); });
  const applying = f.service.applyPrivacySupportResponse(signed());
  const rejected = expect(applying).rejects.toThrow('choices have changed');
  await reading;
  f.access.beginProcessingChoice('ads'); // The newer user's grant is still awaiting storage.
  release(f.memory.get('@flapfit/privacy-support-request-v1')!);
  await rejected;
  expect(f.withdraw).not.toHaveBeenCalled();
});
test('a failed refusal save reports failure and the signed response can retry', async () => {
  const f = await fixture(); await f.service.preparePrivacySupportRequest();
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  expect((await f.service.applyPrivacySupportResponse(signed())).status).toBe('save-unconfirmed');
  expect(f.access.getProcessingInputs().choices.ads.decision).toBe('denied');
  expect((await f.service.applyPrivacySupportResponse(signed())).status).toBe('completed');
});
test('corrupt request storage does not invoke a refusal or silently replace the record', async () => {
  const f = await fixture(); f.memory.set('@flapfit/privacy-support-request-v1', '{bad');
  await expect(f.service.preparePrivacySupportRequest()).rejects.toThrow();
  await expect(f.service.applyPrivacySupportResponse(signed())).rejects.toThrow();
  expect(f.storage.setItem).not.toHaveBeenCalled(); expect(f.withdraw).not.toHaveBeenCalled();
});
