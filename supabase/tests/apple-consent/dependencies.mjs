import { createRequire } from 'node:module';
// Optional location of a disposable test install; normal CI uses npm ci in this directory.
export const dependency = createRequire(process.env.APPLE_CONSENT_TEST_PACKAGE_JSON ?? new URL('./package.json', import.meta.url));
