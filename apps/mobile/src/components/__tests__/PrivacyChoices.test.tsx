import type { ReactTestRenderer } from 'react-test-renderer';

// First module load on the Windows release host can exceed Jest's default 5s.
jest.setTimeout(20_000);

async function fixture(platform = 'ios', failChoicesRead = false, canadianUnsetReporting = false) {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  const { act } = React;
  const memory = new Map<string, string>();
  const storage = {
    getItem: jest.fn(async (key: string) => {
      if (failChoicesRead && key === '@flapfit/processing-choices-v1') throw new Error('read failed');
      return memory.get(key) ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { memory.delete(key); }),
  };
  const alert = jest.fn();
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  jest.doMock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Modal: 'Modal', ScrollView: 'ScrollView',
    StyleSheet: { create: (value: unknown) => value }, Platform: { OS: platform },
    Alert: { alert }, Linking: { openURL: jest.fn() },
  }));
  jest.doMock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
  jest.doMock('@/config/release', () => ({ RELEASE_LINKS: { privacyUrl: 'https://flapfitapp.com/privacy/' } }));
  const native = {
    getRevenueCatWithdrawalStatus: jest.fn(() => ({ state: 'pending', error: null })),
    settleRevenueCatWithdrawal: jest.fn().mockResolvedValue({ state: 'stopped', error: null }),
    retryRevenueCatWithdrawal: jest.fn().mockResolvedValue({ state: 'stopped', error: null }),
  };
  jest.doMock('@/services/monetization', () => native);
  const access: typeof import('@/services/privacy/processingAccess') = require('@/services/privacy/processingAccess');
  if (failChoicesRead) {
    const choice = (decision: string) => ({ decision, noticeVersion: 1, decidedAt: null });
    memory.set('@flapfit/processing-choices-v1', JSON.stringify({ version: 1, region: 'unknown',
      choices: { ads: choice('granted'), analytics: choice('denied'), competition: choice('granted') } }));
    memory.set('@flapfit/processing-notice-v1', JSON.stringify({ version: 1, acknowledged: true, adsActivated: false, reportingActivated: false }));
  }
  await access.hydrateProcessingAccess();
  if (!failChoicesRead) await access.setPrivacyRegion('us');
  access.setAppleAgeRequirement('not-required'); access.setAppleRescissionPending(false);
  const country = canadianUnsetReporting ? 'CA' : 'US';
  access.setLaunchProcessingCountry(country, true);
  access.verifyLaunchAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, country, access.getAgeVerificationRevision());
  access.setProcessingRequirements({ ads: 'express-consent', analytics: 'express-consent', competition: 'requested-service' });
  if (!failChoicesRead) for (const purpose of ['ads', 'analytics', 'competition'] as const) {
    if (!(canadianUnsetReporting && purpose === 'analytics')) await access.setProcessingChoice(purpose, 'granted');
  }
  access.markProcessingNoticePresented(1);
  const { PrivacyChoices, PrivacyChoicesSheet, usePrivacyChoicesSheet }: typeof import('../PrivacyChoices') = require('../PrivacyChoices');
  let tree: ReactTestRenderer;
  let controller!: ReturnType<typeof usePrivacyChoicesSheet>;
  function Harness() { controller = usePrivacyChoicesSheet(); return controller.privacyChoicesSheet; }
  const mountController = async () => { await act(async () => { tree = renderer.create(React.createElement(Harness)); }); };
  const open = async () => {
    let completion!: Promise<void>;
    await act(async () => { completion = controller.openChoices(); });
    return { completion };
  };
  const mount = async (sheet = false, onClose = jest.fn(), includeCompetition = false) => {
    await act(async () => { tree = renderer.create(sheet ? React.createElement(PrivacyChoicesSheet, { onClose }) : React.createElement(PrivacyChoices, { includeCompetition })); });
  };
  const replaceRequest = async () => {
    let completion!: Promise<void>;
    await act(async () => { controller.cancelChoices(); completion = controller.openChoices(); });
    return { completion };
  };
  const buttons = () => tree.root.findAllByType('TouchableOpacity' as never);
  const button = (title: string) => buttons().find(node => node.findAllByType('Text' as never).some(text => text.children.join('') === title));
  const press = async (title: string) => { expect(button(title)).toBeDefined(); await act(async () => { button(title)!.props.onPress(); }); };
  const text = () => tree.root.findAllByType('Text' as never).map(node => node.children.join('')).join('\n');
  const modal = () => tree.root.findByType('Modal' as never);
  const unmount = async () => { await act(async () => { tree.unmount(); }); };
  return { access, storage, memory, recover: () => { failChoicesRead = false; }, native, alert, act, mount, mountController, open, replaceRequest, cancel: () => controller.cancelChoices(), button, press, text, modal, unmount };
}

test.each(['save', 'native'] as const)('a failed reporting %s retains a rendered retry across remount without enabling reporting or stopping ads', async failure => {
  const f = await fixture(); await f.mount();
  if (failure === 'save') f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  else f.native.settleRevenueCatWithdrawal.mockResolvedValueOnce({ state: 'failed', error: 'native stop failed' });
  await f.press('Stop reporting');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: false }, competition: { allowed: true } });
  expect(f.button('Retry stopping reporting')).toBeDefined();
  expect(f.button('Allow reporting')).toBeUndefined();
  expect(f.text()).toContain(failure === 'save' ? 'Choice save not confirmed' : 'Native stop not confirmed');
  await f.unmount(); await f.mount();
  expect(f.button('Retry stopping reporting')).toBeDefined();
  await f.press('Retry stopping reporting');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: false }, competition: { allowed: true } });
  expect(f.button('Retry stopping reporting')).toBeUndefined();
  expect(f.button('Allow reporting')).toBeDefined();
  expect(f.text()).toContain('Choice saved · native reporting stopped');
  if (failure === 'native') expect(f.native.retryRevenueCatWithdrawal).toHaveBeenCalledTimes(1);
  await f.unmount();
});

test.each(['Close', 'Save & continue'])('%s waits for iOS native dismissal and completes only once', async action => {
  const f = await fixture(); const closed = jest.fn(); await f.mount(true, closed);
  await f.act(async () => { f.modal().props.onShow?.(); });
  await f.press(action);
  expect(closed).not.toHaveBeenCalled();
  expect(f.modal().props.visible).toBe(false);
  const dismiss = f.modal().props.onDismiss;
  expect(dismiss).toEqual(expect.any(Function));
  await f.act(async () => { dismiss(); dismiss(); });
  expect(closed).toHaveBeenCalledTimes(1);
  await f.unmount();
});

test('unmount invalidates a late native dismissal callback', async () => {
  const f = await fixture(); const closed = jest.fn(); await f.mount(true, closed);
  const dismiss = f.modal().props.onDismiss;
  expect(dismiss).toEqual(expect.any(Function));
  await f.unmount();
  await f.act(async () => { dismiss(); });
  expect(closed).not.toHaveBeenCalled();
});


test('an early Close waits for presentation then native dismissal, without a timeout', async () => {
  const f = await fixture(); const closed = jest.fn(); await f.mount(true, closed);
  await f.press('Close');
  expect(f.modal().props.visible).toBe(true);
  expect(closed).not.toHaveBeenCalled();
  await f.act(async () => { f.modal().props.onShow(); });
  expect(f.modal().props.visible).toBe(false);
  await f.act(async () => { f.modal().props.onDismiss(); });
  expect(closed).toHaveBeenCalledTimes(1);
  await f.unmount();
});

test('the result waiter remains pending through delayed native dismissal and completes exactly once', async () => {
  const f = await fixture(); await f.mountController();
  const { completion } = await f.open();
  const second = await f.open(); expect(second.completion).toBe(completion);
  const nextPresentation = jest.fn(); void completion.then(nextPresentation);
  await f.act(async () => { f.modal().props.onShow(); });
  await f.press('Close');
  // A background/return interval without native dismissal cannot release the waiter.
  await f.act(async () => { await Promise.resolve(); });
  expect(nextPresentation).not.toHaveBeenCalled();
  const dismissed = f.modal().props.onDismiss;
  await f.act(async () => { dismissed(); dismissed(); });
  await completion;
  expect(nextPresentation).toHaveBeenCalledTimes(1);
  await f.unmount();
});

test('result cancellation and unmount release their waiter without a stale dismissal completing a successor', async () => {
  const f = await fixture(); await f.mountController();
  const first = await f.open(); const oldDismiss = f.modal().props.onDismiss;
  await f.act(async () => { f.cancel(); });
  await first.completion;
  const second = await f.open(); const completed = jest.fn(); void second.completion.then(completed);
  await f.act(async () => { oldDismiss(); });
  expect(completed).not.toHaveBeenCalled();
  await f.unmount();
  await second.completion;
  expect(completed).toHaveBeenCalledTimes(1);
});

test('Android Close completes after the unanimated hidden commit without waiting for an iOS-only event', async () => {
  const f = await fixture('android'); const closed = jest.fn(); await f.mount(true, closed);
  expect(f.modal().props.animationType).toBe('none');
  await f.press('Close');
  expect(f.modal().props.visible).toBe(false);
  expect(closed).toHaveBeenCalledTimes(1);
  await f.unmount();
});


test('closing during a pending save cannot present a late alert or complete before dismissal', async () => {
  const f = await fixture(); const closed = jest.fn(); await f.mount(true, closed);
  await f.act(async () => { f.modal().props.onShow(); });
  let fail!: (error: Error) => void;
  f.storage.setItem.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { fail = reject; }));
  await f.press('Save & continue');
  await f.press('Close');
  await f.act(async () => { fail(new Error('late failed save')); });
  expect(f.alert).not.toHaveBeenCalled();
  expect(closed).not.toHaveBeenCalled();
  await f.act(async () => { f.modal().props.onDismiss(); });
  expect(closed).toHaveBeenCalledTimes(1);
  await f.unmount();
});


test('a replacement in the same React batch waits for the old native sheet to dismiss', async () => {
  const f = await fixture(); await f.mountController();
  const first = await f.open();
  await f.act(async () => { f.modal().props.onShow(); });
  await f.press('Close');
  const oldDismiss = f.modal().props.onDismiss;
  const next = await f.replaceRequest();
  await first.completion;
  expect(f.modal().props.visible).toBe(false);
  const completed = jest.fn(); void next.completion.then(completed);
  await f.act(async () => { oldDismiss(); });
  expect(f.modal().props.visible).toBe(true);
  await f.act(async () => { f.modal().props.onShow(); });
  expect(completed).not.toHaveBeenCalled();
  await f.press('Close');
  await f.act(async () => { f.modal().props.onDismiss(); });
  await next.completion;
  expect(completed).toHaveBeenCalledTimes(1);
  await f.unmount();
});


test('an unsuccessful later reporting grant cannot reuse an earlier confirmed native stop', async () => {
  const f = await fixture(); await f.mount();
  await f.press('Stop reporting');
  expect(f.text()).toContain('Choice saved · native reporting stopped');
  const save = f.storage.setItem.getMockImplementation()!;
  f.storage.setItem.mockImplementationOnce(save).mockRejectedValueOnce(new Error('activation save failed'));
  f.native.settleRevenueCatWithdrawal.mockResolvedValueOnce({ state: 'failed', error: 'new stop unconfirmed' });
  await f.press('Allow reporting');
  expect(f.text()).toContain('Native stop not confirmed');
  expect(f.button('Retry stopping reporting')).toBeDefined();
  expect(f.button('Allow reporting')).toBeUndefined();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  await f.press('Retry stopping reporting');
  expect(f.text()).toContain('Choice saved · native reporting stopped');
  expect(JSON.parse((await f.storage.getItem('@flapfit/processing-choices-v1'))!).choices.analytics.decision).toBe('denied');
  await f.unmount();
});

test('Info renders only the needed teen residency clarification and preserves independent reporting refusal', async () => {
  const f=await fixture();
  f.access.setLaunchProcessingCountry('US',true);
  f.access.verifyLaunchAgeEvidence({source:'apple',status:'shared',lowerBound:13,upperBound:15},'US',f.access.getAgeVerificationRevision());
  await f.access.setProcessingChoice('analytics','denied');
  await f.mount();
  expect(f.text()).toContain('Do you live in Connecticut?');
  await f.press('No');
  expect(f.text()).toContain('Not a Connecticut resident');
  expect(f.access.getProcessingAccess().revenueCat.allowed).toBe(false);
  await f.press('Yes, Connecticut');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.text()).toContain('Connecticut resident');
  await f.unmount();
});
test('Info residency save failure keeps every answer reachable for retry and makes no permission claim', async () => {
  const f=await fixture();
  f.access.setLaunchProcessingCountry('US',true);
  f.access.verifyLaunchAgeEvidence({source:'apple',status:'shared',lowerBound:13,upperBound:15},'US',f.access.getAgeVerificationRevision());
  await f.mount(); f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await f.press('No');
  expect(f.text()).toContain('Answer save not confirmed');
  expect(f.button('No')).toBeDefined(); expect(f.button('Yes, Connecticut')).toBeDefined();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.press('No');
  expect(f.text()).toContain('Not a Connecticut resident');
  await f.unmount();
});
test('adult Info has no unnecessary state question', async () => {
  const f=await fixture(); await f.mount();
  expect(f.text()).not.toContain('Do you live in Connecticut?'); await f.unmount();
});


test.each([
  {country:'AU' as const,lowerBound:13,upperBound:14},
  {country:'MX' as const,lowerBound:16,upperBound:17},
  {country:'CA' as const,lowerBound:0,upperBound:13},
])('$country restricted age shows its actual state without a misleading Allow control', async scenario => {
  const f=await fixture();
  f.access.setLaunchProcessingCountry(scenario.country,true);
  f.access.verifyLaunchAgeEvidence({source:'apple',status:'shared',lowerBound:scenario.lowerBound,upperBound:scenario.upperBound},scenario.country,f.access.getAgeVerificationRevision());
  await f.access.setProcessingChoice('analytics','denied');
  await f.mount();
  expect(f.button('Allow advertising')).toBeUndefined(); expect(f.button('Allow reporting')).toBeUndefined();
  expect(f.text()).toContain(scenario.country === 'CA' ? 'age eligibility can be confirmed' : 'Flap Fit does not collect that permission');
  expect(f.button('Save & continue')).toBeDefined();
  await f.unmount();
});

test('Info stops competition independently and a failed save remains retryable after remount', async () => {
  const f = await fixture(); await f.mount(false, jest.fn(), true);
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await f.press('Stop online competition');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: true }, competition: { allowed: false } });
  expect(f.text()).toContain('Choice save not confirmed');
  expect(f.button('Retry stopping competition')).toBeDefined();
  await f.unmount(); await f.mount(false, jest.fn(), true);
  await f.press('Retry stopping competition');
  expect(f.text()).not.toContain('Choice save not confirmed');
  expect(f.text()).toContain('Online participation stopped');
  expect(f.access.getProcessingInputs().choices.competition.decision).toBe('denied');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: true }, competition: { allowed: false } });
  expect(f.native.settleRevenueCatWithdrawal).not.toHaveBeenCalled();
  await f.unmount();
});

test('competition withdrawal remains reachable without age eligibility or initialized providers', async () => {
  const f = await fixture(); f.access.clearAgeVerification();
  await f.mount(false, jest.fn(), true); await f.press('Stop online competition');
  expect(f.access.getProcessingInputs().choices.competition.decision).toBe('denied');
  expect(f.text()).toContain('Online participation stopped');
  await f.unmount();
});

test('the post-result choices panel does not add an unrelated competition control', async () => {
  const f = await fixture(); await f.mount(true);
  expect(f.button('Stop online competition')).toBeUndefined(); await f.unmount();
});

test('unreadable choices retain an actionable load retry across failure and restore refusal without stopping permitted ads', async () => {
  const f = await fixture('ios', true); await f.mount();
  const original = f.memory.get('@flapfit/processing-choices-v1');
  expect(f.button('Retry loading privacy choices')).toBeDefined();
  expect(f.button('Allow reporting')).toBeUndefined();
  expect(f.text()).toContain('Optional processing is paused');
  await f.press('Retry loading privacy choices');
  expect(f.alert).toHaveBeenCalledWith('Privacy choice not confirmed', expect.stringContaining('still unavailable'));
  expect(f.button('Retry loading privacy choices')).toBeDefined();
  expect(f.storage.setItem).not.toHaveBeenCalled();
  f.recover(); await f.press('Retry loading privacy choices');
  expect(f.button('Retry loading privacy choices')).toBeUndefined();
  expect(f.text()).toContain('Off by your choice');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: false, reason: 'refused' } });
  expect(f.memory.get('@flapfit/processing-choices-v1')).toBe(original);
  await f.unmount();
});


test('audit continuation: collapse/remount then Stop invalidates an older rendered Allow waiting for notice restoration', async () => {
  const f = await fixture('ios',false,true);
  let release!: (value:string|null)=>void;const delayed=new Promise<string|null>(resolve=>{release=resolve;});
  f.storage.getItem.mockImplementation(async key=>key==='@flapfit/processing-notice-v1'?delayed:f.memory.get(key)??null);
  await f.mount();expect(f.button('Allow reporting')).toBeDefined();expect(f.button('Stop reporting')).toBeDefined();
  await f.press('Allow reporting');await f.unmount();await f.mount();
  await f.press('Stop reporting');
  expect(f.text()).toContain('Choice saved · native reporting stopped');
  await f.act(async()=>{release(JSON.stringify({version:1,acknowledged:true,adsActivated:true,reportingActivated:false}));});
  expect(f.access.getProcessingInputs().choices.analytics.decision).toBe('denied');
  expect(JSON.parse(f.memory.get('@flapfit/processing-choices-v1')!).choices.analytics.decision).toBe('denied');
  expect(f.text()).toContain('Choice saved · native reporting stopped');
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false},competition:{allowed:true}});
  // A genuinely later explicit Allow is still available after the stopped state.
  await f.press('Allow reporting');
  expect(f.access.getProcessingInputs().choices.analytics.decision).toBe('granted');
  await f.unmount();
});
