import { prepareCompetitionIntegrity, sealCompetitionResult, forgetCompetitionIntegrity } from '../competitionIntegrity';
import { requireOptionalNativeModule } from 'expo-modules-core';
jest.mock('expo-modules-core',()=>({...jest.requireActual('expo-modules-core'),requireOptionalNativeModule:jest.fn()}));
const native={getIntegrityKey:jest.fn(),attestIntegrityKey:jest.fn(),signCompetitionResult:jest.fn(),forgetIntegrityKey:jest.fn(),confirmIntegrityKey:jest.fn()};
beforeEach(()=>{
  jest.clearAllMocks(); (requireOptionalNativeModule as jest.Mock).mockReturnValue(native);
  native.getIntegrityKey.mockResolvedValue('key'); native.attestIntegrityKey.mockResolvedValue('apple-proof');
  native.signCompetitionResult.mockResolvedValue('signature');
});
test('enrollment confirms the native key with a server nonce and Apple proof',async()=>{
  const request=jest.fn().mockResolvedValueOnce({registered:false,challenge:'a'.repeat(64)}).mockResolvedValueOnce({registered:true});
  expect(await prepareCompetitionIntegrity('user',request,jest.fn())).toBe('key');
  expect(native.attestIntegrityKey).toHaveBeenCalledWith('user','key','a'.repeat(64));
  expect(request).toHaveBeenLastCalledWith('/integrity/register',{keyId:'key',attestation:'apple-proof'});
});
test('registered keys recover a lost acknowledgment without reattesting',async()=>{
  const request=jest.fn().mockResolvedValue({registered:true});
  expect(await prepareCompetitionIntegrity('user',request,jest.fn())).toBe('key');
  expect(native.attestIntegrityKey).not.toHaveBeenCalled();
});
test('missing native verification cannot fall back to unverified scores',async()=>{
  (requireOptionalNativeModule as jest.Mock).mockReturnValue(null);
  const request=jest.fn();
  await expect(prepareCompetitionIntegrity('user',request,jest.fn())).rejects.toThrow('cannot verify');
  expect(request).not.toHaveBeenCalled();
  await expect(sealCompetitionResult({runId:'run',score:2,durationMs:4000})).rejects.toThrow('did not start');
});
test('completed result is signed with its own key, run, nonce and exact score/duration',async()=>{
  await expect(sealCompetitionResult({keyId:'key',runId:'run',nonce:'a'.repeat(64),score:2,durationMs:4000})).resolves.toBe('signature');
  expect(native.signCompetitionResult).toHaveBeenCalledWith('key','run','a'.repeat(64),2,4000);
});
test('a revoked operation stops before attestation or enrollment',async()=>{
  let allowed=true;
  const request=jest.fn(async()=>{allowed=false;return {registered:false,challenge:'a'.repeat(64)};});
  await expect(prepareCompetitionIntegrity('user',request as never,()=>{if(!allowed)throw new Error('revoked');})).rejects.toThrow('revoked');
  expect(native.attestIntegrityKey).not.toHaveBeenCalled();
});
test('deletion removes the native key identifier',async()=>{
  await forgetCompetitionIntegrity('user'); expect(native.forgetIntegrityKey).toHaveBeenCalledWith('user');
});
