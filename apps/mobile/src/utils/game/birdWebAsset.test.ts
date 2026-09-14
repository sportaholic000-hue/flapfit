import { isAndroidEmbeddedResource } from './birdWebAsset';

describe('standalone bird asset detection', () => {
  it('copies Android drawable identifiers before giving them to the WebView', () => {
    expect(isAndroidEmbeddedResource('assets_images_evolution_sunny_stage_01', 'android')).toBe(
      true
    );
  });

  it('does not recopy normal local, data, or network URIs', () => {
    expect(isAndroidEmbeddedResource('file:///data/user/0/flapfit/bird.png', 'android')).toBe(false);
    expect(isAndroidEmbeddedResource('data:image/png;base64,abc', 'android')).toBe(false);
    expect(isAndroidEmbeddedResource('https://localhost:8081/bird.png', 'android')).toBe(false);
    expect(isAndroidEmbeddedResource('assets_images_evolution_sunny_stage_01', 'ios')).toBe(false);
  });
});
