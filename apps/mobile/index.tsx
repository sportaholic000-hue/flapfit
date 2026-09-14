import 'react-native-url-polyfill/auto';
(globalThis as typeof globalThis & { Buffer: typeof import('buffer').Buffer }).Buffer =
  require('buffer').Buffer;

require('expo-router/entry');
