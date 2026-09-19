/** @jest-environment node */
const withShareReturn = require('../plugins/with-share-return.cjs');
const path = require('node:path');

it('configures only the Android root return path and preserves iOS and other native screens', async () => {
  const ios = {bundleIdentifier: 'com.flapfit.game', supportsTablet: true, requireFullScreen: true};
  const config = withShareReturn({name: 'Flap Fit', slug: 'flapfit', ios});
  const main = {$: {'android:name': '.MainActivity', 'android:launchMode': 'singleTask'}};
  const external = {$: {'android:name': '.AnotherActivity', 'android:launchMode': 'standard'}};
  const manifest = {manifest: {
    'uses-permission': [{$: {'android:name': 'android.permission.CAMERA'}}],
    application: [{$: {'android:name': '.MainApplication'}, activity: [main, external]}],
  }};
  const result = await config.mods.android.manifest({...config, modResults: manifest,
    modRequest: {projectRoot: path.join(__dirname, '..'), platform: 'android', modName: 'manifest', introspect: true}});
  expect(result.modResults.manifest.application[0].activity[0].$).toEqual({
    'android:name': '.MainActivity', 'android:launchMode': 'singleTask', 'android:clearTaskOnLaunch': 'true',
  });
  expect(external.$).toEqual({'android:name': '.AnotherActivity', 'android:launchMode': 'standard'});
  expect(result.modResults.manifest['uses-permission']).toEqual([{$: {'android:name': 'android.permission.CAMERA'}}]);
  expect(result.ios).toEqual(ios);
  expect(config.mods.ios).toBeUndefined();
});
