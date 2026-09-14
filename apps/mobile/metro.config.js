const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.maxWorkers = 6;
// Keep Metro's live watcher scoped to app source. SDK 57 can resolve the hoisted
// workspace dependencies on demand, avoiding a multi-minute Windows scan of
// every file in the root node_modules directory.
config.watchFolders = [__dirname];
config.resolver.unstable_onDemandFilesystem = 'UNSTABLE_ALLOW_ALL';

const WEB_ALIASES = {
  'expo-secure-store': path.resolve(__dirname, './polyfills/web/secureStore.web.ts'),
  'react-native-webview': path.resolve(__dirname, './polyfills/web/webview.web.tsx'),
  'react-native-safe-area-context': path.resolve(
    __dirname,
    './polyfills/web/safeAreaContext.web.tsx'
  ),
  'react-native-maps': path.resolve(__dirname, './polyfills/web/maps.web.tsx'),
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
  'expo-location': path.resolve(__dirname, './polyfills/web/location.web.ts'),
  './layouts/Tabs': path.resolve(__dirname, './polyfills/web/tabbar.web.tsx'),
  'expo-notifications': path.resolve(__dirname, './polyfills/web/notifications.web.tsx'),
  'expo-contacts': path.resolve(__dirname, './polyfills/web/contacts.web.ts'),
  'expo-font': path.resolve(__dirname, './polyfills/web/expo-font.web.ts'),
  'react-native-google-mobile-ads': path.resolve(
    __dirname,
    './polyfills/web/google-mobile-ads.web.tsx'
  ),
  'react-native-web/dist/exports/ScrollView': path.resolve(
    __dirname,
    './polyfills/web/scrollview.web.tsx'
  ),
  'expo-haptics': path.resolve(__dirname, './polyfills/web/haptics.web.ts'),
  'expo-clipboard': path.resolve(__dirname, './polyfills/web/clipboard.web.ts'),
  'expo-camera': path.resolve(__dirname, './polyfills/web/camera.web.tsx'),
  'expo-image-picker': path.resolve(__dirname, './polyfills/web/imagePicker.web.ts'),
  'expo-linking': path.resolve(__dirname, './polyfills/web/linking.web.ts'),
  'expo-web-browser': path.resolve(__dirname, './polyfills/web/webBrowser.web.ts'),
  'expo-document-picker': path.resolve(__dirname, './polyfills/web/documentPicker.web.ts'),
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
// Expo Go compatibility aliases. The real packages crash on
// import in Expo Go preview (their browser-mode shims pull in DOM-only code
// that throws on Hermes), which makes expo-router silently swallow the load
// error and warn "Route is missing the required default export" — leaving
// the app on a black/splash screen. EAS development and production builds keep the real
// modules so paid users hit the native SDKs as normal.
const useExpoGoStubs = process.env.FLAPFIT_EXPO_GO_STUBS === '1';
const DEV_ONLY_NATIVE_ALIASES = {
  'react-native-purchases': path.resolve(
    __dirname,
    './polyfills/native/react-native-purchases.native.tsx'
  ),
  // The ads stub must never ship in EAS builds: with it bundled, the JS layer
  // never reaches the RNGoogleMobileAds native modules, so no ad request is
  // ever made and banners render the placeholder forever.
  'react-native-google-mobile-ads': path.resolve(
    __dirname,
    './polyfills/native/google-mobile-ads.native.tsx'
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
    context.originModulePath.startsWith(`${__dirname}/polyfills/web`) ||
    context.originModulePath.startsWith(`${__dirname}/polyfills/shared`)
  ) {
    return context.resolveRequest(context, moduleName, platform);
  }

  if (moduleName.startsWith('@expo-google-fonts/') && moduleName !== '@expo-google-fonts/dev') {
    return context.resolveRequest(context, '@expo-google-fonts/dev', platform);
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
  if (
    useExpoGoStubs &&
    DEV_ONLY_NATIVE_ALIASES[moduleName] &&
    !moduleName.startsWith('./polyfills/')
  ) {
    return context.resolveRequest(context, DEV_ONLY_NATIVE_ALIASES[moduleName], platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
