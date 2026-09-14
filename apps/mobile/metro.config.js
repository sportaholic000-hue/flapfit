const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// MediaPipe's JavaScript, Wasm, and model files are intentionally stored with
// a neutral extension so Metro treats them as opaque bundled assets. They are
// copied to their required runtime filenames in the app cache before a game.
if (!config.resolver.assetExts.includes('mpasset')) {
  config.resolver.assetExts.push('mpasset');
}

config.maxWorkers = 6;
// Keep Metro's live watcher scoped to app source. SDK 57 can resolve the hoisted
// workspace dependencies on demand, avoiding a multi-minute Windows scan of
// every file in the root node_modules directory.
config.watchFolders = [__dirname];
config.resolver.unstable_onDemandFilesystem = 'UNSTABLE_ALLOW_ALL';

const WEB_ALIASES = {
  'react-native-webview': path.resolve(__dirname, './polyfills/web/webview.web.tsx'),
  'react-native-safe-area-context': path.resolve(
    __dirname,
    './polyfills/web/safeAreaContext.web.tsx'
  ),
  'react-native-web/dist/exports/SafeAreaView': path.resolve(
    __dirname,
    './polyfills/web/SafeAreaView.web.tsx'
  ),
  'react-native-web/dist/exports/Alert': path.resolve(__dirname, './polyfills/web/alerts.web.tsx'),
  'react-native-web/dist/exports/RefreshControl': path.resolve(
    __dirname,
    './polyfills/web/refreshControl.web.tsx'
  ),
  'expo-status-bar': path.resolve(__dirname, './polyfills/web/statusBar.web.tsx'),
  './layouts/Tabs': path.resolve(__dirname, './polyfills/web/tabbar.web.tsx'),
  'react-native-web/dist/exports/ScrollView': path.resolve(
    __dirname,
    './polyfills/web/scrollview.web.tsx'
  ),
  'expo-haptics': path.resolve(__dirname, './polyfills/web/haptics.web.ts'),
  'expo-camera': path.resolve(__dirname, './polyfills/web/camera.web.tsx'),
  'expo-linking': path.resolve(__dirname, './polyfills/web/linking.web.ts'),
};
// TextInput alias: the polyfill MUST deep-import the RN host via the package
// subpath (`react-native/Libraries/.../TextInput`), NOT the `react-native`
// barrel. A barrel import re-enters this relative-key alias and freezes / OOM
// Hermes on first TextInput mount in Expo Go. See textinput.native.tsx.
const NATIVE_ALIASES = {
  './Libraries/Components/TextInput/TextInput': path.resolve(
    __dirname,
    './polyfills/native/textinput.native.tsx'
  ),
};
const SHARED_ALIASES = {
  'expo-router/entry': path.resolve(__dirname, '../../node_modules/expo-router/entry.js'),
};
// Add web-specific alias configuration through resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Polyfills must resolve their own imports normally.
  if (
    context.originModulePath.startsWith(`${__dirname}/polyfills/native`) ||
    context.originModulePath.startsWith(`${__dirname}/polyfills/web`)
  ) {
    return context.resolveRequest(context, moduleName, platform);
  }

  if (SHARED_ALIASES[moduleName] && !moduleName.startsWith('./polyfills/')) {
    return context.resolveRequest(context, SHARED_ALIASES[moduleName], platform);
  }
  if (platform === 'web') {
    if (WEB_ALIASES[moduleName] && !moduleName.startsWith('./polyfills/')) {
      return context.resolveRequest(context, WEB_ALIASES[moduleName], platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  }
  if (NATIVE_ALIASES[moduleName] && !moduleName.startsWith('./polyfills/')) {
    return context.resolveRequest(context, NATIVE_ALIASES[moduleName], platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
