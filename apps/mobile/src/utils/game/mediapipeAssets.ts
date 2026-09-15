import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { isAndroidEmbeddedResource } from './birdWebAsset';

type TrackerAssetSpec = {
  module: number;
  runtimeName: string;
  expectedBytes: number;
};

export type PreparedMediaPipeAssets = {
  directoryUri: string;
  fileUris: Record<TrackerRuntimeName, string>;
};

type TrackerRuntimeName =
  | 'vision_bundle.mjs'
  | 'vision_wasm_internal.js'
  | 'vision_wasm_internal.wasm'
  | 'vision_wasm_nosimd_internal.js'
  | 'vision_wasm_nosimd_internal.wasm'
  | 'pose_landmarker_lite.task';

export type MediaPipeAssetPayload = {
  module: string;
  loader: string;
  wasm: string;
  model: string;
};

const TRACKER_VERSION = '0.10.14';
const TRACKER_DIRECTORY_NAME = `flap-fit-mediapipe-${TRACKER_VERSION}`;

// Keep require() calls literal so Metro includes every opaque runtime file in
// both iOS and Android builds. The neutral .mpasset suffix is removed only in
// the app's private cache, where MediaPipe expects these exact filenames.
const TRACKER_ASSETS: readonly TrackerAssetSpec[] = [
  {
    module: require('../../../assets/mediapipe/vision_bundle.mjs.mpasset'),
    runtimeName: 'vision_bundle.mjs',
    expectedBytes: 136_870,
  },
  {
    module: require('../../../assets/mediapipe/vision_wasm_internal.js.mpasset'),
    runtimeName: 'vision_wasm_internal.js',
    expectedBytes: 209_826,
  },
  {
    module: require('../../../assets/mediapipe/vision_wasm_internal.wasm.mpasset'),
    runtimeName: 'vision_wasm_internal.wasm',
    expectedBytes: 9_423_986,
  },
  {
    module: require('../../../assets/mediapipe/vision_wasm_nosimd_internal.js.mpasset'),
    runtimeName: 'vision_wasm_nosimd_internal.js',
    expectedBytes: 209_735,
  },
  {
    module: require('../../../assets/mediapipe/vision_wasm_nosimd_internal.wasm.mpasset'),
    runtimeName: 'vision_wasm_nosimd_internal.wasm',
    expectedBytes: 9_294_247,
  },
  {
    module: require('../../../assets/mediapipe/pose_landmarker_lite.task.mpasset'),
    runtimeName: 'pose_landmarker_lite.task',
    expectedBytes: 5_777_746,
  },
] as const;

let preparationPromise: Promise<PreparedMediaPipeAssets> | null = null;

async function stageTrackerAssets(): Promise<PreparedMediaPipeAssets> {
  const directory = new Directory(Paths.cache, TRACKER_DIRECTORY_NAME);
  directory.create({ idempotent: true, intermediates: true });
  const fileUris = {} as Record<TrackerRuntimeName, string>;

  for (const spec of TRACKER_ASSETS) {
    const destination = new File(directory, spec.runtimeName);
    if (destination.exists && destination.size === spec.expectedBytes) {
      fileUris[spec.runtimeName as TrackerRuntimeName] = destination.uri;
      continue;
    }

    const sourceAsset = Asset.fromModule(spec.module);
    const bundledAsset = isAndroidEmbeddedResource(sourceAsset.uri)
      ? new Asset({
          name: sourceAsset.name,
          type: sourceAsset.type,
          hash: sourceAsset.hash,
          uri: sourceAsset.uri,
          width: sourceAsset.width,
          height: sourceAsset.height,
        })
      : sourceAsset;

    await bundledAsset.downloadAsync();
    const sourceUri = bundledAsset.localUri ?? bundledAsset.uri;
    if (!sourceUri.startsWith('file:')) {
      throw new Error(`Bundled tracker asset is not available locally: ${spec.runtimeName}`);
    }

    const source = new File(sourceUri);
    await source.copy(destination, { overwrite: true });
    if (!destination.exists || destination.size !== spec.expectedBytes) {
      throw new Error(`Bundled tracker asset failed integrity check: ${spec.runtimeName}`);
    }
    fileUris[spec.runtimeName as TrackerRuntimeName] = destination.uri;
  }

  return { directoryUri: directory.uri, fileUris };
}

export function prepareMediaPipeAssets(): Promise<PreparedMediaPipeAssets> {
  if (!preparationPromise) {
    preparationPromise = stageTrackerAssets().catch((error) => {
      preparationPromise = null;
      throw error;
    });
  }
  return preparationPromise;
}

/**
 * Reads only the Wasm variant supported by the current WebView. The payload is
 * transferred to a secure inline page, which keeps getUserMedia available
 * without downloading executable code or granting a file:// page camera access.
 */
export async function readMediaPipeAssetPayload(
  assets: PreparedMediaPipeAssets,
  useSimd: boolean
): Promise<MediaPipeAssetPayload> {
  const loaderName = useSimd ? 'vision_wasm_internal.js' : 'vision_wasm_nosimd_internal.js';
  const wasmName = useSimd ? 'vision_wasm_internal.wasm' : 'vision_wasm_nosimd_internal.wasm';

  const [module, loader, wasm, model] = await Promise.all([
    new File(assets.fileUris['vision_bundle.mjs']).base64(),
    new File(assets.fileUris[loaderName]).base64(),
    new File(assets.fileUris[wasmName]).base64(),
    new File(assets.fileUris['pose_landmarker_lite.task']).base64(),
  ]);

  if (!module || !loader || !wasm || !model) {
    throw new Error('One or more bundled tracker files were empty.');
  }

  return { module, loader, wasm, model };
}
