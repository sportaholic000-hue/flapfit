const fs = require('node:fs');
const path = require('node:path');
const { entries, transform } = require('./patch-admob-privacy-android.cjs');
const directory = path.join(path.dirname(require.resolve('react-native-google-mobile-ads/package.json')), 'android/src/main/java/io/invertase/googlemobileads');
test.each(entries)('Android pinned native patch accepts clean/patched source and rejects drift: $file', entry => {
  const installed = fs.readFileSync(path.join(directory, entry.file), 'utf8');
  const patched = transform(entry, installed);
  expect(transform(entry, patched)).toBe(patched);
  let original = patched;
  for (const [before, after] of [...entry.replacements].reverse()) original = original.replace(after, before);
  expect(transform(entry, original)).toBe(patched);
  expect(() => transform(entry, original + '// changed')).toThrow('source drift');
  expect(() => transform(entry, patched + '// changed')).toThrow('source drift');
});

// EAS native generation patches installed sources. OTA publication may start from
// a fresh install, so both states must hash as the same final native code.
test.each(entries)('Android fingerprint normalizes final native source before/after patch: $file', entry => {
  const hook = require('../fingerprint.config.js').fileHookTransform;
  const patched = transform(entry, fs.readFileSync(path.join(directory, entry.file), 'utf8'));
  let original = patched;
  for (const [before, after] of [...entry.replacements].reverse()) original = original.replace(after, before);
  const filePath = '../../node_modules/react-native-google-mobile-ads/android/src/main/java/io/invertase/googlemobileads/' + entry.file;
  expect(hook({ type: 'file', filePath }, original.replace(/\n/g, '\r\n'), true)).toBe(patched);
  expect(hook({ type: 'file', filePath }, patched, true)).toBe(patched);
});
