// Exercise the same compatibility branch used by the hosted Deno 2.1.4 runtime.
// This does not substitute for running on that runtime; it proves the verifier
// actually uses the compatibility class rather than a stale named ESM export.
Object.defineProperty(Deno, 'version', { value: { ...Deno.version, deno:'2.1.4' } });
await import('./integrity.test.ts');
const crypto = (await import('node:crypto')).default;
Deno.test('App Attest uses the hosted-runtime X509 compatibility class',()=>{
  if(crypto.X509Certificate.name !== 'CompatibleX509') throw new Error('Compatibility branch not active');
});
