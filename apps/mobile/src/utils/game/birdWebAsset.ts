import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export function isAndroidEmbeddedResource(uri: string, platform: string = Platform.OS): boolean {
  return platform === 'android' && uri.length > 0 && !uri.includes(':');
}

/**
 * Produces an image URI that an inline WebView document can read.
 *
 * Standalone Android builds resolve bundled React Native images to drawable
 * resource identifiers such as `assets_images_evolution_sunny_stage_01`.
 * React Native's Image can render those identifiers, but a WebView cannot.
 * Constructing a fresh Asset makes ExpoAsset copy the drawable into its cache,
 * after which the game can safely embed the real local file as base64.
 */
export async function loadBirdAssetDataUri(moduleId: number): Promise<string> {
  const sourceAsset = Asset.fromModule(moduleId);
  const readableAsset = isAndroidEmbeddedResource(sourceAsset.uri)
    ? new Asset({
        name: sourceAsset.name,
        type: sourceAsset.type,
        hash: sourceAsset.hash,
        uri: sourceAsset.uri,
        width: sourceAsset.width,
        height: sourceAsset.height,
      })
    : sourceAsset;

  await readableAsset.downloadAsync();
  const uri = readableAsset.localUri ?? readableAsset.uri;
  if (!uri) throw new Error('Bundled bird art has no readable URI.');
  if (uri.startsWith('data:')) return uri;
  if (uri.startsWith('file:')) {
    return `data:image/png;base64,${await new File(uri).base64()}`;
  }
  if (/^https?:/i.test(uri)) return uri;
  throw new Error(`Bundled bird art URI is not WebView-readable: ${uri}`);
}
