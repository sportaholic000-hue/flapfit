const { pinKotlinCompiler } = require('../plugins/withAndroidKotlinCompiler.cjs');

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
  expect(pinKotlinCompiler(rootBuild, '2.3.21')).toBe(rootBuild.replace(
    'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")',
    'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.21")'
  ));
});

test('native generation is idempotent with the matching compiler', () => {
  const once = pinKotlinCompiler(rootBuild, '2.3.21');
  expect(pinKotlinCompiler(once, '2.3.21')).toBe(once);
});

test.each([
  ['missing dependency', 'buildscript {}', '2.3.21'],
  ['duplicate dependency', rootBuild + rootBuild, '2.3.21'],
  ['conflicting pin', rootBuild.replace('kotlin-gradle-plugin"', 'kotlin-gradle-plugin:2.1.20"'), '2.3.21'],
  ['missing version', rootBuild, undefined],
  ['dynamic version', rootBuild, '2.+'],
])('fails closed for %s instead of hiding template or dependency drift', (_name, content, version) => {
  expect(() => pinKotlinCompiler(content, version)).toThrow();
});
