/** @jest-environment node */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the installed SDK classes, not a rewritten version of their listener cleanup.
function sdkHarness() {
  const root = path.resolve(__dirname, '../../../node_modules/react-native-google-mobile-ads/src');
  const subscriptions = new Map();
  const nativeRequests = new Map();
  const eventTypes = { LOADED: 'loaded', OPENED: 'opened', CLOSED: 'closed', ERROR: 'error', CLICKED: 'clicked', PAID: 'paid' };
  const native = {
    interstitialLoad: jest.fn((id, unit) => nativeRequests.set(id, unit)),
    interstitialShow: jest.fn().mockResolvedValue(undefined),
    interstitialDestroy: jest.fn((id) => nativeRequests.delete(id)),
  };
  const remove = jest.fn((name) => subscriptions.delete(name));
  const mocks = {
    '../common': { isFunction: value => typeof value === 'function', isString: value => typeof value === 'string', isOneOf: (value, options) => options.includes(value) },
    '../internal/SharedEventEmitter': { SharedEventEmitter: { addListener: (name, listener) => { subscriptions.set(name, listener); return { remove: () => remove(name) }; } } },
    '../internal/NativeError': { NativeError: { fromEvent: error => new Error(error.message) } },
    '../AdEventType': { AdEventType: eventTypes },
    '../RewardedAdEventType': { RewardedAdEventType: { LOADED: 'rewarded_loaded' } },
    '../GAMAdEventType': { GAMAdEventType: { APP_EVENT: 'app_event' } },
    '../validateAdRequestOptions': { validateAdRequestOptions: options => options ?? {} },
    '../validateAdShowOptions': { validateAdShowOptions: options => options ?? {} },
    '../specs/modules/NativeInterstitialModule': { __esModule: true, default: native },
  };
  function execute(name) {
    const output = ts.transpileModule(fs.readFileSync(path.join(root, name), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(output, { module, exports: module.exports, require: key => {
      if (!(key in mocks)) throw new Error('Unexpected SDK dependency: ' + key);
      return mocks[key];
    } }, { filename: name });
    return module.exports;
  }
  mocks['./MobileAd'] = execute('ads/MobileAd.ts');
  const { InterstitialAd } = execute('ads/InterstitialAd.ts');
  const emit = (id, type) => subscriptions.get('google_mobile_ads_interstitial_event:unit:' + id)?.({ body: { type, ...(type === 'error' ? { error: { code: 'presentation', message: 'failed to show' } } : {}) } });
  return { InterstitialAd, subscriptions, nativeRequests, native, remove, emit };
}

test.each([10, 50, 100])('actual SDK cleanup releases %i loaded and unfinished requests', count => {
  const h = sdkHarness();
  const callbacks = jest.fn();
  for (let id = 0; id < count; id += 1) {
    const ad = h.InterstitialAd.createForAdRequest('unit');
    ad.addAdEventListener('loaded', callbacks);
    ad.load();
    if (id % 2 === 0) h.emit(id, 'loaded');
    ad.destroy();
    ad.destroy();
    ad.load(); // A permanently disposed instance cannot start another request.
    h.emit(id, 'loaded');
    expect(h.subscriptions.size).toBe(0);
    expect(h.nativeRequests.size).toBe(0);
  }
  expect(callbacks).toHaveBeenCalledTimes(Math.ceil(count / 2));
  expect(h.native.interstitialLoad).toHaveBeenCalledTimes(count);
  expect(h.native.interstitialDestroy).toHaveBeenCalledTimes(count);
  expect(h.remove).toHaveBeenCalledTimes(count);
});

test('actual SDK receives asynchronous presentation failure after show promise resolves', async () => {
  const h = sdkHarness();
  const ad = h.InterstitialAd.createForAdRequest('unit');
  const failure = jest.fn(() => ad.destroy());
  ad.addAdEventListener('error', failure);
  ad.load(); h.emit(0, 'loaded');
  await ad.show();
  expect(failure).not.toHaveBeenCalled();
  h.emit(0, 'error'); h.emit(0, 'closed');
  expect(failure).toHaveBeenCalledTimes(1);
  expect(h.subscriptions.size).toBe(0);
  expect(h.nativeRequests.size).toBe(0);
});
