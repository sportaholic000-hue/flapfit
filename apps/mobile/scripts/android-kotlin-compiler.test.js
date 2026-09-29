const { pinKotlinCompiler, pinAndroidGradlePlugin } = require('../plugins/withAndroidKotlinCompiler.cjs');

const rootBuild = `buildscript {
  dependencies {
    classpath("com.android.tools.build:gradle")
    classpath("com.facebook.react:react-native-gradle-plugin")
    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
  }
}
apply plugin: "expo-root-project"
`;

test('pins the root compiler before plugin loading and preserves other build dependencies', () => {
  expect(pinKotlinCompiler(rootBuild, '2.3.20')).toBe(rootBuild.replace(
    'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")',
    'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.20")'
  ));
});

test('native generation is idempotent with the matching compiler', () => {
  const once = pinKotlinCompiler(rootBuild, '2.3.20');
  expect(pinKotlinCompiler(once, '2.3.20')).toBe(once);
});

test.each([
  ['missing dependency', 'buildscript {}', '2.3.20'],
  ['duplicate dependency', rootBuild + rootBuild, '2.3.20'],
  ['conflicting pin', rootBuild.replace('kotlin-gradle-plugin"', 'kotlin-gradle-plugin:2.1.20"'), '2.3.20'],
  ['missing version', rootBuild, undefined],
  ['dynamic version', rootBuild, '2.+'],
])('fails closed for %s instead of hiding template or dependency drift', (_name, content, version) => {
  expect(() => pinKotlinCompiler(content, version)).toThrow();
});

test('pins the Android plugin and its bundled D8/R8 without changing repositories or React Native', () => {
  const expected = rootBuild
    .replace('com.android.tools.build:gradle"', 'com.android.tools.build:gradle:8.13.2"')
    .replace('org.jetbrains.kotlin:kotlin-gradle-plugin"', 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.20"');
  const once = pinAndroidGradlePlugin(pinKotlinCompiler(rootBuild, '2.3.20'));
  expect(once).toBe(expected);
  expect(pinAndroidGradlePlugin(pinKotlinCompiler(once, '2.3.20'))).toBe(once);
});

test('accepts the single-quoted Android dependency used by the actual Expo template', () => {
  const singleQuoted = rootBuild.replace('classpath("com.android.tools.build:gradle")', "classpath('com.android.tools.build:gradle')");
  expect(pinAndroidGradlePlugin(singleQuoted)).toBe(rootBuild.replace('com.android.tools.build:gradle"', 'com.android.tools.build:gradle:8.13.2"'));
});

test.each([
  ['missing Android dependency', 'buildscript {}'],
  ['duplicate Android dependency', rootBuild + rootBuild],
  ['conflicting Android pin', rootBuild.replace('com.android.tools.build:gradle"', 'com.android.tools.build:gradle:8.12.0"')],
  ['dynamic Android pin', rootBuild.replace('com.android.tools.build:gradle"', 'com.android.tools.build:gradle:8.+"')],
])('fails closed for %s rather than overwriting a changed native template', (_name, content) => {
  expect(() => pinAndroidGradlePlugin(content)).toThrow();
});
