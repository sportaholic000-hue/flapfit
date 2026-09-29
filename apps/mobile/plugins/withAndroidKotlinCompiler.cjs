// SDK 57 propagates android.kotlinVersion to Expo's properties, but leaves the
// root compiler classpath unversioned (expo/expo#49668). Pin that dependency
// before Gradle loads React Native's older transitive compiler into the parent
// classloader. Keep the compiler and Expo/KSP setting on the same version.
function pinKotlinCompiler(contents, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
    throw new Error('Android Kotlin compiler requires an explicit build-properties version.');
  }
  const dependency = /classpath\(\s*(['"])org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::[^'"]+)?\1\s*\)/g;
  const declarations = contents.match(dependency) ?? [];
  if (declarations.length !== 1) {
    throw new Error('Expected exactly one root Kotlin compiler classpath declaration; inspect the Android template.');
  }
  const current = declarations[0];
  const existingVersion = current.match(/kotlin-gradle-plugin:([^'"]+)/)?.[1];
  if (existingVersion && existingVersion !== version) {
    throw new Error('Root Kotlin compiler version conflicts with expo-build-properties; inspect before replacing it.');
  }
  return contents.replace(dependency, `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${version}")`);
}

// AGP 8.13.2 bundles D8/R8 8.13.19, Google's supported Kotlin 2.3 toolchain.
// React Native 0.86 otherwise contributes AGP 8.12.0 / R8 8.12.14 to the
// unversioned root dependency. Pin AGP itself so its bundled tools stay aligned.
const ANDROID_GRADLE_PLUGIN_VERSION = '8.13.2';

function pinAndroidGradlePlugin(contents) {
  const dependency = /classpath\(\s*(['"])com\.android\.tools\.build:gradle(?::[^'"]+)?\1\s*\)/g;
  const declarations = contents.match(dependency) ?? [];
  if (declarations.length !== 1) {
    throw new Error('Expected exactly one root Android Gradle plugin classpath declaration; inspect the Android template.');
  }
  const existingVersion = declarations[0].match(/com\.android\.tools\.build:gradle:([^'"]+)/)?.[1];
  if (existingVersion && existingVersion !== ANDROID_GRADLE_PLUGIN_VERSION) {
    throw new Error('Root Android Gradle plugin version conflicts with the Kotlin 2.3 toolchain; inspect before replacing it.');
  }
  return contents.replace(dependency, `classpath("com.android.tools.build:gradle:${ANDROID_GRADLE_PLUGIN_VERSION}")`);
}

module.exports = function withAndroidKotlinCompiler(config) {
  const { withProjectBuildGradle } = require('@expo/config-plugins');
  const buildProperties = config.plugins?.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-build-properties');
  const version = buildProperties?.[1]?.android?.kotlinVersion;
  return withProjectBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('Android Kotlin compiler pin expects the Expo Groovy template.');
    }
    mod.modResults.contents = pinAndroidGradlePlugin(pinKotlinCompiler(mod.modResults.contents, version));
    return mod;
  });
};
module.exports.pinKotlinCompiler = pinKotlinCompiler;

module.exports.pinAndroidGradlePlugin = pinAndroidGradlePlugin;
