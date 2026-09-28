const fs = require('node:fs');
const path = require('node:path');
const { validateTrackerAssets } = require('./validate-tracker-assets.cjs');
const appRoot = path.resolve(__dirname, '..');

test('the bundled files satisfy the runtime loader byte requirements', () => {
  expect(validateTrackerAssets(appRoot)).toEqual([]);
});

test('Windows newline conversion reproduces all three shipped tracker failures', () => {
  const read = (file, encoding) => {
    const bytes = fs.readFileSync(file, encoding);
    return /\.m?js\.mpasset$/.test(file)
      ? Buffer.from(bytes.toString('utf8').replace(/\r?\n/g, '\r\n'))
      : bytes;
  };
  expect(validateTrackerAssets(appRoot, read)).toEqual([
    'vision_bundle.mjs: expected 136870 bytes, found 136872; the on-device tracker would reject this file.',
    'vision_wasm_internal.js: expected 209826 bytes, found 209846; the on-device tracker would reject this file.',
    'vision_wasm_nosimd_internal.js: expected 209735 bytes, found 209755; the on-device tracker would reject this file.',
  ]);
});

test('missing or truncated binary resources fail validation', () => {
  const read = (file, encoding) => {
    if (file.endsWith('vision_wasm_internal.wasm.mpasset')) return Buffer.alloc(1);
    if (file.endsWith('pose_landmarker_lite.task.mpasset')) throw Object.assign(new Error('Missing file'), { code: 'ENOENT' });
    return fs.readFileSync(file, encoding);
  };
  const failures = validateTrackerAssets(appRoot, read);
  expect(failures).toHaveLength(2);
  expect(failures[0]).toContain('vision_wasm_internal.wasm: expected 9423986 bytes, found 1');
  expect(failures[1]).toContain('pose_landmarker_lite.task: cannot read bundled asset (ENOENT)');
});

test('an unrecognized runtime manifest fails closed', () => {
  expect(validateTrackerAssets(appRoot, () => 'changed declaration format')).toEqual([
    'Expected six explicit bundled tracker asset declarations.',
  ]);
});

test.each(['production', 'android-closed-testing', 'preview', 'development'])('%s validates tracker assets before any release check', profile => {
  const hook = fs.readFileSync(path.join(__dirname, 'eas-build-post-install.cjs'), 'utf8');
  const calls = [];
  const exit = {};
  try {
    require('node:vm').runInNewContext(hook, {
      __dirname,
      console: { log() {}, error() {} },
      process: { env: { EAS_BUILD_PROFILE: profile }, execPath: process.execPath, exit: () => { throw exit; } },
      require: name => {
        if (name === './validate-tracker-assets.cjs') return { validateTrackerAssets: () => { calls.push('assets'); return []; } };
        if (name === 'node:child_process') return { spawnSync: () => { calls.push('release'); return { status: 0 }; } };
        throw Error('Unexpected dependency: ' + name);
      },
    });
  } catch (error) { if (error !== exit) throw error; }
  expect(calls).toEqual(['production', 'android-closed-testing'].includes(profile) ? ['assets', 'release'] : ['assets']);
});
