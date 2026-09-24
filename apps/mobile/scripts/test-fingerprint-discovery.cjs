const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const packageRoot = path.dirname(require.resolve('@expo/fingerprint/package.json'));
const loaderPath = path.join(packageRoot, 'build/ExpoConfigLoader.js');
const loader = fs.readFileSync(loaderPath, 'utf8');
const pathHelper = fs.readFileSync(path.join(packageRoot, 'build/utils/Path.js'), 'utf8');
const normalized = 'const relativePath = (0, Path_1.toPosixPath)(path_1.default.relative(projectRoot, modulePath));';
const previous = 'const relativePath = path_1.default.relative(projectRoot, modulePath);';

async function discover(platform, source = loader) {
  const platformPath = platform === 'win32' ? path.win32 : path.posix;
  const projectRoot = platform === 'win32' ? 'C:\\checkout\\apps\\mobile' : '/checkout/apps/mobile';
  const fakeProcess = { platform, env: {}, argv: [] };
  const pathExports = {};
  vm.runInNewContext(pathHelper, {
    exports: pathExports,
    require: name => name === 'node:process' ? fakeProcess : name === 'path' ? platformPath : require(name),
  });
  const cache = {};
  let output;
  const files = [
    '../../node_modules/@expo/config/build/Config.js',
    '../../node_modules/semver/index.js',
    '../../node_modules/react-native-google-mobile-ads/app.plugin.js',
    'app.config.js',
    'plugins/withFlapFitNative.js',
    'scripts/patch-admob-privacy.cjs',
  ];
  const paths = files.map(file => platformPath.resolve(projectRoot, file));
  const fakeRequire = name => {
    if (name === 'fs/promises') return { stat: async () => ({ isFile: () => true }) };
    if (name === 'module') return { _cache: cache };
    if (name === 'node:process') return { ...fakeProcess, send: value => { output = JSON.parse(value); } };
    if (name === 'path') return platformPath;
    if (name === 'resolve-from') return () => 'fixture:expo-config';
    if (name === './Options') return { DEFAULT_IGNORE_PATHS: [] };
    if (name === './utils/Path') return pathExports;
    if (name === '@expo/env') return { load() {} };
    if (name === 'fixture:expo-config') return { getConfig: () => {
      for (const filename of paths) cache[filename] = { filename };
      return { exp: { name: 'Fixture' } };
    } };
    throw new Error('Unexpected fixture import: ' + name);
  };
  const module = { exports: {} };
  const context = { module, exports: module.exports, require: fakeRequire, console, __filename: loaderPath, __dirname: path.dirname(loaderPath) };
  vm.runInNewContext(source + '\nmodule.exports.runForTest = runAsync;', context);
  await module.exports.runForTest('test', [projectRoot]);
  return output.loadedModules;
}

(async () => {
  assert.equal(require('@expo/fingerprint/package.json').version, '0.20.13');
  assert(loader.includes(normalized), 'Pinned Yarn discovery patch must be installed');
  const windows = await discover('win32');
  const linux = await discover('linux');
  const mac = await discover('darwin');
  assert.deepEqual(windows, linux);
  assert.deepEqual(windows, mac);
  assert(windows.includes('plugins/withFlapFitNative.js'), 'Native plugins remain fingerprinted');
  assert(windows.includes('scripts/patch-admob-privacy.cjs'), 'Native patch code remains fingerprinted');
  assert(windows.includes('../../node_modules/react-native-google-mobile-ads/app.plugin.js'), 'Provider plugin remains fingerprinted');
  assert(!windows.some(file => /\/(?:@expo\/config|semver)\//.test(file)));
  // Negative control reproduces the reviewed platform defect using the previous code.
  const broken = await discover('win32', loader.replace(normalized, previous));
  assert.notDeepEqual(broken, linux);
  assert.equal(broken.length, 6);
  assert.equal(windows.length, 4);
  console.log('PASS: actual Expo loader discovers identical Windows/Linux/macOS fixture sources; prior code reproduces mismatch; native plugins and patch sources remain protected.');
})().catch(error => { console.error(error); process.exitCode = 1; });
