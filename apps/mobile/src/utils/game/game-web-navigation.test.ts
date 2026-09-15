import {
  GAME_WEB_BASE_URL,
  GAME_WEB_ORIGIN,
  GAME_WEB_ORIGIN_WHITELIST,
  isAllowedGameNavigation,
} from './game-web-navigation';

describe('game WebView navigation', () => {
  it('keeps both forms of the private game origin inside the WebView', () => {
    expect(isAllowedGameNavigation(GAME_WEB_ORIGIN)).toBe(true);
    expect(isAllowedGameNavigation(GAME_WEB_BASE_URL)).toBe(true);
    expect(isAllowedGameNavigation(`${GAME_WEB_BASE_URL}game`)).toBe(true);
    expect(isAllowedGameNavigation(`blob:${GAME_WEB_BASE_URL}recording-id`)).toBe(true);
    expect(isAllowedGameNavigation('about:blank')).toBe(true);
  });

  it('blocks external, script, and app-link navigation', () => {
    expect(isAllowedGameNavigation('https://example.com')).toBe(false);
    expect(isAllowedGameNavigation('mailto:support@flapfitapp.com')).toBe(false);
    expect(isAllowedGameNavigation('javascript:alert(1)')).toBe(false);
    expect(isAllowedGameNavigation('exp://example')).toBe(false);
  });

  it('routes every attempted URL through the explicit navigation guard', () => {
    expect(GAME_WEB_ORIGIN_WHITELIST).toEqual(['*']);
  });
});
