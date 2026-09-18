import { prepareMediaPipeAssets, readMediaPipeAssetPayload } from '../mediapipeAssets';

jest.mock('../../../../assets/mediapipe/vision_bundle.mjs.mpasset', () => 0);
jest.mock('../../../../assets/mediapipe/vision_wasm_internal.js.mpasset', () => 1);
jest.mock('../../../../assets/mediapipe/vision_wasm_internal.wasm.mpasset', () => 2);
jest.mock('../../../../assets/mediapipe/vision_wasm_nosimd_internal.js.mpasset', () => 3);
jest.mock('../../../../assets/mediapipe/vision_wasm_nosimd_internal.wasm.mpasset', () => 4);
jest.mock('../../../../assets/mediapipe/pose_landmarker_lite.task.mpasset', () => 5);

const mockSizes = [136870, 209826, 9423986, 209735, 9294247, 5777746];
const mockFiles = new Map<string, number>();
const mockCopy = jest.fn();
const mockDownload = jest.fn();
const mockRead = jest.fn();
jest.mock('expo-asset', () => ({
  Asset: class {
    uri: string;
    localUri: string | null = null;
    constructor(data: { uri: string }) {
      this.uri = data.uri;
    }
    static fromModule(index: number) {
      return { uri: `bundle:${index}`, hash: `hash-${index}` };
    }
    async downloadAsync() {
      mockDownload();
      const index = Number(this.uri.split(':')[1]);
      this.localUri = `file:///source/${index}`;
      mockFiles.set(this.localUri, mockSizes[index]);
      return this;
    }
  },
}));
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  Directory: class {
    uri: string;
    constructor(base: string, name: string) {
      this.uri = `${base}/${name}`;
    }
    create() {}
  },
  File: class {
    uri: string;
    constructor(base: string | { uri: string }, name?: string) {
      this.uri = typeof base === 'string' ? base : `${base.uri}/${name}`;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    get size() {
      return mockFiles.get(this.uri) ?? 0;
    }
    async copy(destination: { uri: string }) {
      mockCopy();
      mockFiles.set(destination.uri, mockFiles.get(this.uri) ?? 0);
    }
    async base64() {
      mockRead();
      if (!mockFiles.has(this.uri)) throw new Error('File was evicted');
      return 'cGF5bG9hZA==';
    }
  },
}));

beforeEach(() => {
  mockFiles.clear();
  jest.clearAllMocks();
});

test('concurrent initial preparations share one staging operation', async () => {
  const [a, b] = await Promise.all([prepareMediaPipeAssets(), prepareMediaPipeAssets()]);
  expect(a).toEqual(b);
  expect(mockCopy).toHaveBeenCalledTimes(6);
});

test('preparing again restores an evicted file instead of returning stale cached paths', async () => {
  const original = await prepareMediaPipeAssets();
  mockFiles.delete(original.fileUris['vision_bundle.mjs']);
  const restored = await prepareMediaPipeAssets();
  expect(mockCopy).toHaveBeenCalledTimes(7);
  expect(await readMediaPipeAssetPayload(restored, true)).toMatchObject({ module: 'cGF5bG9hZA==' });
});

test('a read failure after preparation restages once and recovers the payload', async () => {
  const original = await prepareMediaPipeAssets();
  mockFiles.delete(original.fileUris['pose_landmarker_lite.task']);
  await expect(readMediaPipeAssetPayload(original, false)).resolves.toMatchObject({
    model: 'cGF5bG9hZA==',
  });
  expect(mockCopy).toHaveBeenCalledTimes(7);
});

test('a wrong-size staged file is repaired on the next preparation', async () => {
  const original = await prepareMediaPipeAssets();
  mockFiles.set(original.fileUris['vision_wasm_internal.wasm'], 1);
  await prepareMediaPipeAssets();
  expect(mockFiles.get(original.fileUris['vision_wasm_internal.wasm'])).toBe(9423986);
  expect(mockCopy).toHaveBeenCalledTimes(7);
});

test('persistent storage failures reach the caller after a bounded retry', async () => {
  const original = await prepareMediaPipeAssets();
  mockRead.mockImplementation(() => {
    throw new Error('Storage unavailable');
  });
  await expect(readMediaPipeAssetPayload(original, true)).rejects.toThrow('Storage unavailable');
  expect(mockRead).toHaveBeenCalledTimes(8);
  mockRead.mockReset();
});
