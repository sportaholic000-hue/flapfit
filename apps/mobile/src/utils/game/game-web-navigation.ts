export const GAME_WEB_ORIGIN = 'https://flapfit.local';
export const GAME_WEB_BASE_URL = `${GAME_WEB_ORIGIN}/`;

// react-native-webview opens URLs that miss originWhitelist through the device's
// Linking API before onShouldStartLoadWithRequest can reject them. Let every URL
// reach our explicit guard instead so the private game origin can never escape.
export const GAME_WEB_ORIGIN_WHITELIST = ['*'];

export function isAllowedGameNavigation(url: string) {
  return (
    url === 'about:blank' ||
    url === GAME_WEB_ORIGIN ||
    url.startsWith(GAME_WEB_BASE_URL) ||
    url.startsWith(`blob:${GAME_WEB_BASE_URL}`)
  );
}
