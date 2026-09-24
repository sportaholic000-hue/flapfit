const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateUpdateConfig } = require('./validate-update-config.cjs');
const config = require('../fingerprint.config.js');
const appRoot = path.resolve(__dirname, '..');
const eas = require('../eas.json');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const hook = (filePath, content, step = 1024) => {
  const source = { type: 'file', filePath };
  const input = Buffer.from(content);
  const output = [];
  for (let i = 0; i < input.length; i += step) {
    const part = config.fileHookTransform(source, input.subarray(i, i + step), false);
    if (part) output.push(Buffer.from(part));
  }
  const end = config.fileHookTransform(source, null, true);
  if (end) output.push(Buffer.from(end));
  return Buffer.concat(output).toString('utf8');
};
assert.deepEqual(validateUpdateConfig(appRoot, 'production', eas.build.production.env), []);
assert.deepEqual(validateUpdateConfig(appRoot, 'preview', eas.build.preview.env), []);
assert(validateUpdateConfig(appRoot, 'production', eas.build.preview.env).some(x => x.includes('EXPO_PUBLIC_ADS_MODE')));
for (const name of Object.keys(eas.build.production.env)) {
  const missing = { ...eas.build.production.env }; delete missing[name];
  assert(validateUpdateConfig(appRoot, 'production', missing).some(x => x.startsWith(name + ':')), name);
}
assert(config.sourceSkips.includes('ExpoConfigVersions'));
assert(config.sourceSkips.includes('GitIgnore'));
for (const input of ['plugins', 'modules', '../../.yarn/patches']) assert(config.extraSources.some(x => x.filePath === input));
const unicode = 'Native café\r\n'.repeat(1000);
assert.equal(hook('plugins/example.swift', unicode, 7), unicode.replace(/\r\n/g, '\n'));
assert.equal(hook('.easignore', 'example/\r\n'), 'example/\n');
// Two overlapping hash streams for the same path must not share partial data.
const first = { type: 'file', filePath: 'plugins/shared.js' };
const second = { type: 'file', filePath: 'plugins/shared.js' };
config.fileHookTransform(first, Buffer.from('first\r'), false);
config.fileHookTransform(second, Buffer.from('second\r\n'), false);
config.fileHookTransform(first, Buffer.from('\n'), false);
assert.equal(config.fileHookTransform(first, null, true), 'first\n');
assert.equal(config.fileHookTransform(second, null, true), 'second\n');
const binary = Buffer.from([0, 255, 13, 10]);
assert.equal(config.fileHookTransform({ type: 'file', filePath: 'asset.bin' }, binary, false), binary);

const rcPath = 'node_modules/react-native-purchases/ios/RNPurchases.m';
const rc = fs.readFileSync(path.join(appRoot, '../..', rcPath), 'utf8');
const rawRc = rc.replace(/\n\n\/\/ Exercise pause is separate from withdrawal:[\s\S]*?\n\}\n/, '')
 .replace(/\n\n\/\/ FLAP_FIT_RC_PROCESSING_FENCE_V1\nRCT_EXPORT_METHOD\(flapFitSetProcessingAllowed:[\s\S]*?\n\}\n/, '');
assert.equal(hash(rawRc), '0580cbe71082f44919b0c8eb79504cde48157f2194e34c5ad6bdf7ae1bc1710a');
assert.equal(hook(rcPath, rawRc), hook(rcPath, rc));
assert.equal(hash(hook(rcPath, rawRc)), 'c303c99f7055c179aa1285ab70b20ac5263033743efbd63a21566566bee5b2f1');
assert.throws(() => hook(rcPath, rawRc + '// drift'), /drift/);
const admob = require('./patch-admob-privacy.cjs');
for (const [filename, transform, undo] of [
 ['RNGoogleMobileAdsModule.mm', admob.transform, s => s.split(admob.insertion).join('')],
 ['RNGoogleMobileAdsConsentModule.mm', admob.transformConsent, s => [...admob.consentTransforms].reverse().reduce((text, [before, after]) => text.replace(after, before), s)],
]) {
  const filePath = 'node_modules/react-native-google-mobile-ads/ios/RNGoogleMobileAds/' + filename;
  const current = fs.readFileSync(path.join(appRoot, '../..', filePath), 'utf8');
  const final = transform(current);
  const original = undo(final);
  assert.equal(hook(filePath, original), hook(filePath, final));
  assert.throws(() => hook(filePath, original + '// drift'), /drift/);
}
console.log('OTA checks passed: all 16 environment omissions rejected, live/test mismatch rejected; Windows/LF and overlapping streams stable; binary bytes untouched; fresh/patched RevenueCat + both AdMob bridges identical; native drift rejected.');
