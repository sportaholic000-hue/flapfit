import type { ReactTestRenderer } from 'react-test-renderer';

// First module load on the Windows release host can exceed Jest's default 5s.
jest.setTimeout(20_000);

async function fixture(platform = 'ios', failChoicesRead = false, canadianUnsetReporting = false, canadianRegion: 'resident' | 'not-resident' | 'unknown' = 'resident', freshChoices = false, lowerBound = 18, countryOverride?: 'CA' | 'US' | 'AU' | 'MX') {
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
  const openURL = jest.fn().mockResolvedValue(undefined);
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  jest.doMock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Modal: 'Modal', ScrollView: 'ScrollView',
    StyleSheet: { create: (value: unknown) => value }, Platform: { OS: platform },
    Alert: { alert }, Linking: { openURL },
  }));
  jest.doMock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
  jest.doMock('@/config/release', () => ({ RELEASE_LINKS: { privacyUrl: 'https://flapfitapp.com/privacy/', termsUrl: 'https://flapfitapp.com/terms/' } }));
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
  const country = countryOverride ?? (canadianUnsetReporting ? 'CA' : 'US');
  access.setLaunchProcessingCountry(country, true);
  if (canadianUnsetReporting && canadianRegion !== 'unknown') {
    memory.set('@flapfit/quebec-residency-v1',JSON.stringify({version:1,answer:canadianRegion}));
    access.applyQuebecResidency(canadianRegion);
  }
  access.verifyLaunchAgeEvidence({ source: 'apple', status: 'shared', lowerBound, upperBound: lowerBound < 18 ? 17 : null }, country, access.getAgeVerificationRevision());
  access.setProcessingRequirements({ ads: 'express-consent', analytics: 'express-consent', competition: 'requested-service' });
  if (!failChoicesRead && !freshChoices) for (const purpose of ['ads', 'analytics', 'competition'] as const) {
    if (!(canadianUnsetReporting && purpose === 'analytics')) await access.setProcessingChoice(purpose, 'granted');
  }
  access.markProcessingNoticePresented(1);
  const { PrivacyChoices, PrivacyChoicesSheet, usePrivacyChoicesSheet }: typeof import('../PrivacyChoices') = require('../PrivacyChoices');
  let tree: ReactTestRenderer;
  let controller!: ReturnType<typeof usePrivacyChoicesSheet>;
  function Harness() { controller = usePrivacyChoicesSheet(); return controller.privacyChoicesSheet; }
  const mountController = async () => { await act(async () => { tree = renderer.create(React.createElement(Harness)); }); };
  const open = async (showDetails = false) => {
    let completion!: Promise<void>;
    await act(async () => { completion = controller.openChoices(showDetails); });
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
  const button = (title: string) => buttons().find(node => node.props.accessibilityLabel === title || node.findAllByType('Text' as never).some(text => text.children.join('') === title));
  const press = async (title: string) => { expect(button(title)).toBeDefined(); await act(async () => { button(title)!.props.onPress(); }); };
  const selectRegion = async (region: 'province' | 'state', name: string) => {
    const trigger = button(`Select ${region} or territory`) ?? button(`Change ${region} or territory`);
    expect(trigger).toBeDefined();
    if (!trigger!.props.accessibilityState.expanded) await act(async () => { trigger!.props.onPress(); });
    await press(name);
  };
  const text = () => tree.root.findAllByType('Text' as never).map(node => node.children.join('')).join('\n');
  const pressPolicyLink = async (label: string) => {
    const link = tree.root.findAllByType('Text' as never).find(node => node.props.accessibilityRole === 'link' && node.children.join('') === label);
    expect(link).toBeDefined();
    await act(async () => { link!.props.onPress(); });
  };
  const modal = () => tree.root.findByType('Modal' as never);
  const unmount = async () => { await act(async () => { tree.unmount(); }); };
  const json = () => tree.toJSON();
  const groupText = (heading: string) => {
    const group = tree.root.findAllByType('View' as never).find(node => node.children.some(child => typeof child !== 'string' && String(child.type) === 'Text' && child.children.join('') === heading));
    if (!group) throw new Error('Missing group: ' + heading);
    return group.findAllByType('Text' as never).map(node => node.children.join('')).join('\n');
  };
  const selectedAnswers = (label: string) => {
    const group = tree.root.findAllByType('View' as never).find(node => node.props.accessibilityRole === 'radiogroup' && node.props.accessibilityLabel === label);
    expect(group).toBeDefined();
    return group!.findAllByType('TouchableOpacity' as never).filter(node => node.props.accessibilityState?.checked).map(node => node.props.accessibilityLabel);
  };
  return { selectRegion, selectedAnswers, json, groupText, pressPolicyLink, openURL, access, storage, memory, buttons, recover: () => { failChoicesRead = false; }, native, alert, act, mount, mountController, open, replaceRequest, cancel: () => controller.cancelChoices(), button, press, text, modal, unmount };
}

test.each(['Yes', 'No'])('New York %s is asked once, stays saved after remount and can be updated explicitly', async answer => {
  const f = await fixture('ios', false, false, 'unknown', true, 15);
  await f.mount();
  await f.selectRegion('state', 'Maine'); // Connecticut residence answer remains No.
  expect(f.text()).toContain('Are you in New York right now?');
  const nyButtons = f.buttons().filter(node => node.findAllByType('Text' as never).some(text => text.children.join('') === answer));
  await f.act(async () => { nyButtons[nyButtons.length - 1].props.onPress(); });
  expect(f.text()).not.toContain('Are you in New York right now?');
  expect(f.button('Update New York answer')).toBeDefined();
  expect(f.text()).toContain('Review your setup below.');
  await f.unmount(); await f.mount();
  expect(f.text()).not.toContain('Are you in New York right now?');
  await f.press('Update New York answer');
  expect(f.text()).toContain('Are you in New York right now?');
  expect(JSON.parse(f.memory.get('@flapfit/new-york-eligibility-v1')!).answer).toBe(answer === 'Yes' ? 'present' : 'not-present');
  await f.unmount();
});

test('older-system adult age choice permits ads without an ads-off control and keeps reporting refused', async () => {
  const f = await fixture('ios', false, false, 'resident', true);
  await f.access.setProcessingChoice('analytics', 'denied');
  f.access.setAppleAgeRequirement('unsupported');
  await f.mount();
  expect(f.text()).toContain('What is your age range?');
  expect(f.text()).toContain('Age range not answered');
  await f.press('18 or older');
  expect(f.text()).toContain('Saved on this device: 18 or older');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { reason: 'refused' } });
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  expect(f.button('Allow advertising')).toBeUndefined();
  await f.unmount(); await f.mount();
  expect(f.text()).toContain('Saved on this device: 18 or older');
  expect(f.selectedAnswers('Age range')).toEqual(['18 or older']);
  await f.unmount();
});

test('failed local age save has a working rendered retry after close/reopen', async () => {
  const f = await fixture('ios', false, false, 'resident', true);
  f.access.setAppleAgeRequirement('unsupported'); await f.mount();
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await f.press('18 or older');
  expect(f.text()).toContain('Age answer save not confirmed');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.unmount(); await f.mount();
  expect(f.text()).toContain('Age answer save not confirmed');
  await f.press('18 or older');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  await f.unmount();
});

test('available or required Apple service never shows the local-age substitute', async () => {
  const f = await fixture(); await f.mount();
  expect(f.text()).not.toContain('What is your age range?');
  await f.act(async () => { f.access.setAppleAgeRequirement('required'); });
  expect(f.text()).not.toContain('What is your age range?');
  expect(f.button('18 or older')).toBeUndefined();
  await f.unmount();
});

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

test.each(['Close', 'Agree & Play'])('%s waits for iOS native dismissal and completes only once', async action => {
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
  await f.press('Agree & Play');
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
  expect(f.text()).toContain('Which state or territory do you live in?');
  await f.selectRegion('state', 'Maine');
  expect(f.access.getProcessingInputs().launch?.options.connecticutResidency).toBe('not-resident');
  expect(f.access.getProcessingAccess().revenueCat.allowed).toBe(false);
  await f.selectRegion('state', 'Connecticut');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.access.getProcessingInputs().launch?.options.connecticutResidency).toBe('resident');
  await f.unmount();
});
test('Info residency save failure keeps every answer reachable for retry and makes no permission claim', async () => {
  const f=await fixture();
  f.access.setLaunchProcessingCountry('US',true);
  f.access.verifyLaunchAgeEvidence({source:'apple',status:'shared',lowerBound:13,upperBound:15},'US',f.access.getAgeVerificationRevision());
  await f.mount(); f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await f.selectRegion('state', 'Maine');
  expect(f.text()).toContain('Answer save not confirmed');
  expect(f.button('Maine')).toBeDefined(); expect(f.button('Connecticut')).toBeDefined();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.selectRegion('state', 'Maine');
  expect(f.access.getProcessingInputs().launch?.options.connecticutResidency).toBe('not-resident');
  await f.unmount();
});
test('adult Info has no unnecessary state question', async () => {
  const f=await fixture(); await f.mount();
  expect(f.text()).not.toContain('Which state or territory do you live in?'); await f.unmount();
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
  expect(f.text()).toContain('Review your setup below.');
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
  expect(f.text()).toContain('Saved privacy choices could not be read. Please retry loading them.');
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
  const f = await fixture('ios',false,true,'not-resident');
  await f.access.setProcessingChoice('analytics','denied');
  let release!: (value:string|null)=>void;const delayed=new Promise<string|null>(resolve=>{release=resolve;});
  f.storage.getItem.mockImplementation(async key=>key==='@flapfit/processing-notice-v1'?delayed:f.memory.get(key)??null);
  await f.mount();expect(f.button('Allow reporting')).toBeDefined();
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

test('Canadian region controls permit eligible ads without an ads-off control independently of reporting', async () => {
  const f=await fixture('ios',false,true,'unknown',true);await f.mount();
  expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
  expect(f.text()).toContain('Which province or territory do you live in?');
  expect(f.button('Allow advertising')).toBeUndefined();
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  await f.press('Stop reporting');
  await f.selectRegion('province', 'New Brunswick');
  expect(f.button('Allow advertising')).toBeUndefined();
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false,reason:'refused'}});
  await f.selectRegion('province', 'Quebec');
  expect(f.text()).toContain('Your answer is saved on this device.');
  expect(f.button('Allow advertising')).toBeUndefined();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.unmount();
});
test('regional correction: rendered failed province save has an actionable retry', async () => {
  const f=await fixture('ios',false,true,'unknown');await f.mount();
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await f.selectRegion('province', 'New Brunswick');
  expect(f.text()).toContain('not confirmed');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.button('New Brunswick')).toBeDefined();
  await f.selectRegion('province', 'New Brunswick');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  await f.unmount();
});

test.each(
  (['CA', 'US', 'AU', 'MX'] as const).flatMap(country => [true, false].map(fresh => ({ country, fresh }))),
)('eligible $country adult has no ads-off control with fresh choices=$fresh, including after remount', async ({ country, fresh }) => {
  const f = await fixture('ios', false, country === 'CA', 'not-resident', fresh, 18, country);
  await f.mount();
  await f.press('Save & continue');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  for (const label of ['Withdraw advertising data consent', 'Stop advertising', 'Not now', 'Allow advertising']) {
    expect(f.button(label)).toBeUndefined();
  }
  await f.press('Stop reporting');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: false } });
  await f.unmount(); await f.mount();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  expect(f.button('Stop advertising')).toBeUndefined();
  expect(f.button('Not now')).toBeUndefined();
  await f.unmount();
});

test('a saved adult advertising refusal is honored until explicitly restored, without exposing another ads-off control', async () => {
  const f = await fixture('ios', false, true, 'not-resident', true);
  await f.access.setProcessingChoice('ads', 'denied');
  await f.access.setProcessingChoice('analytics', 'denied');
  await f.mount(); await f.press('Save & continue');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.button('Allow advertising')).toBeDefined();
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  await f.press('Allow advertising');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: false } });
  expect(f.button('Allow advertising')).toBeUndefined();
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  expect(f.button('Stop advertising')).toBeUndefined();
  await f.unmount(); await f.mount();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  await f.unmount();
});

test('non-Quebec Canadian teen retains notice-based ads without an ads-off control',async()=>{
  const f=await fixture('ios',false,true,'unknown',true,14);await f.mount();
  await f.selectRegion('province', 'New Brunswick');
  expect(f.access.getProcessingInputs().launch?.resolution?.reasons.ads).toBe('notice-route');
  expect(f.button('Not now')).toBeUndefined();expect(f.button('Allow advertising')).toBeUndefined();
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  await f.press('Stop reporting');await f.press('Save & continue');
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false}});
  await f.unmount();
});

test.each(['country','age','apple'] as const)('existing Quebec advertising refusal remains honored with %s eligibility unavailable',async unavailable=>{
  const f=await fixture('ios',false,true);await f.mount();
  expect(f.access.getProcessingInputs().choices.ads.decision).toBe('granted');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.text()).toContain('Your answer is saved on this device.');
  await f.act(async()=>{
    if(unavailable==='country')f.access.setLaunchProcessingCountry(null,false);
    if(unavailable==='age')f.access.clearAgeVerification();
    if(unavailable==='apple')f.access.setAppleAccessRestricted(true);
  });
  expect(f.button('Allow advertising')).toBeUndefined();
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  await f.act(async () => {
    const notice: typeof import('@/services/privacy/processingNotice') = require('@/services/privacy/processingNotice');
    await notice.refuseProcessingPurpose('ads').catch(() => undefined);
  });
  expect(f.access.getProcessingInputs().choices.ads.decision).toBe('denied');
  expect(JSON.parse(f.memory.get('@flapfit/processing-choices-v1')!).choices.ads.decision).toBe('denied');
  await f.unmount();await f.mount();
  expect(f.text()).toContain('Advertising refusal saved');
  await f.unmount();
});

test('failed advertising withdrawal retains honest retry after region loss and panel remount',async()=>{
  const f=await fixture('ios',false,true);await f.mount();
  expect(f.access.getProcessingInputs().choices.ads.decision).toBe('granted');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await f.act(async () => {
    const notice: typeof import('@/services/privacy/processingNotice') = require('@/services/privacy/processingNotice');
    await notice.refuseProcessingPurpose('ads').catch(() => undefined);
  });
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.text()).toContain('Advertising refusal save not confirmed');
  expect(f.button('Retry saving privacy choice')).toBeDefined();
  expect(f.button('Allow advertising')).toBeUndefined();
  await f.act(async()=>f.access.setLaunchProcessingCountry(null,false));
  await f.unmount();await f.mount();
  expect(f.button('Retry saving privacy choice')).toBeDefined();
  await f.press('Retry saving privacy choice');
  expect(f.text()).toContain('Advertising refusal saved');
  expect(JSON.parse(f.memory.get('@flapfit/processing-choices-v1')!).choices.ads.decision).toBe('denied');
  await f.unmount();
});

test.each(['unsupported','unknown'] as const)('Info renders accurate %s age availability without presenting an adult ad opt-out',async state=>{
  const f=await fixture('ios',false,false,'resident',true);
  f.access.clearAgeVerification();f.access.setAppleAgeRequirement(state==='unsupported'?'unsupported':'not-required');
  await f.mount();
  expect(f.text()).toContain(state==='unsupported'?'This system cannot provide the age check':'Age eligibility has not been confirmed');
  expect(f.text()).toContain('Review your setup below.');
  expect(f.text().toLowerCase()).toContain('your saved progress is retained');
  expect(f.text()).not.toContain('Gameplay is available');
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();expect(f.button('Allow advertising')).toBeUndefined();
  await f.unmount();
});

test.each([true, false])('residency dropdowns: Canada=%s has no preselected answer and cancellation saves nothing', async canada => {
  const f = await fixture('ios', false, canada, 'unknown', true, canada ? 18 : 14);
  await f.mount();
  const region = canada ? 'province' : 'state';
  const key = canada ? '@flapfit/quebec-residency-v1' : '@flapfit/connecticut-residency-v1';
  expect(f.text()).toContain('Let’s get you started');
  expect(f.text()).toContain('A couple of quick questions to set up Flap Fit.');
  expect(f.button('Yes')).toBeUndefined(); expect(f.button('No')).toBeUndefined();
  expect(f.button('Not sure')).toBeUndefined();
  await f.press(`Select ${region} or territory`);
  expect(f.button(`Select ${region} or territory`)!.props.accessibilityState.expanded).toBe(true);
  expect(f.memory.has(key)).toBe(false);
  await f.press(`Cancel ${region} selection`);
  expect(f.button(`Select ${region} or territory`)!.props.accessibilityState.expanded).toBe(false);
  expect(f.memory.has(key)).toBe(false);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.unmount(); await f.mount();
  expect(f.button(`Select ${region} or territory`)).toBeDefined();
  expect(f.memory.has(key)).toBe(false);
  await f.unmount();
});

test('expired age evidence does not create a saved advertising refusal or expose an ads-off control', async () => {
  const f = await fixture('ios', false, true, 'not-resident', true); await f.mount();
  await f.press('Save & continue');
  await f.act(async () => f.access.clearAgeVerification());
  expect(f.access.getProcessingAccess().ads.reason).toBe('age-unresolved');
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  expect(f.button('Stop advertising')).toBeUndefined();
  expect(f.button('Not now')).toBeUndefined();
  await f.unmount(); await f.mount();
  expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
  await f.act(async () => {
    f.access.verifyLaunchAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, 'CA', f.access.getAgeVerificationRevision());
  });
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  await f.unmount();
});

test.each(['CA', 'US'] as const)('%s dropdown saves only the original binary flag for every option and preserves advertising decisions', async country => {
  const canada = country === 'CA';
  const f = await fixture('ios', false, canada, 'unknown', true, 15, country);
  await f.mount();
  const region = canada ? 'province' : 'state';
  const key = canada ? '@flapfit/quebec-residency-v1' : '@flapfit/connecticut-residency-v1';
  const { CANADIAN_PROVINCES_AND_TERRITORIES, US_STATES_AND_TERRITORIES }: typeof import('../residency-dropdown') = require('../residency-dropdown');
  const options = canada ? CANADIAN_PROVINCES_AND_TERRITORIES : US_STATES_AND_TERRITORIES;
  expect(options).toHaveLength(canada ? 13 : 56);
  expect(new Set(options.map(([code]) => code)).size).toBe(options.length);
  if (!canada) {
    await f.selectRegion('state', 'New York');
    // Residence must never be substituted for the separate current-location answer.
    expect(f.text()).toContain('Are you in New York right now?');
    expect(f.memory.has('@flapfit/new-york-eligibility-v1')).toBe(false);
    expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
    await f.press('No');
  }
  for (const [code, name] of options) {
    await f.selectRegion(region, name);
    const resident = code === (canada ? 'QC' : 'CT');
    expect(JSON.parse(f.memory.get(key)!)).toEqual({ version: 1, answer: resident ? 'resident' : 'not-resident' });
    expect(f.access.getProcessingAccess().ads.allowed).toBe(!resident);
    expect(f.button(`Change ${region} or territory`)!.props.accessibilityState.expanded).toBe(false);
    expect(f.text()).toContain('Answer saved · Change');
  }
  await f.selectRegion(region, canada ? 'I live outside Canada' : 'I live outside the United States');
  expect(JSON.parse(f.memory.get(key)!)).toEqual({ version: 1, answer: 'not-resident' });
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  await f.unmount(); await f.mount();
  expect(f.button(`Change ${region} or territory`)).toBeDefined();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  if (!canada) expect(f.text()).not.toContain('Are you in New York right now?');
  await f.unmount();
});

type PreviewScreen = { id: string; country: string; audience: string; state: string; context: string; text: string; tree: unknown; alerts?: unknown };
test.each([
  ['CA', 'Canada'], ['US', 'United States'], ['AU', 'Australia'], ['MX', 'Mexico'],
] as const)('%s compact setup uses policy links without extra detail controls and preserves purpose decisions', async (country, name) => {
  const f = await fixture('ios', false, country === 'CA', 'not-resident', true, 18, country);
  await f.mount(true);
  const notice: typeof import('@/services/privacy/processingNotice') = require('@/services/privacy/processingNotice');
  const choices = JSON.stringify(f.access.getProcessingInputs().choices);
  expect(f.text()).toContain('By tapping Agree & Play, you agree to our');
  expect(f.button('Agree & Play')).toBeDefined();
  expect(f.text()).not.toMatch(/Google AdMob|RevenueCat/);
  expect(f.text()).not.toMatch(/A couple of quick questions|Review your setup below|Your answer is saved on this device/);
  expect(f.button('Stop reporting')).toBeUndefined();
  expect(f.button('Learn more')).toBeUndefined();
  expect(f.button('Hide details')).toBeUndefined();
  expect(f.button('Allow advertising')).toBeUndefined();
  capturePrivacy(f, name, '18+', 'Compact setup with policy links');
  await f.pressPolicyLink('Terms of Service');
  await f.pressPolicyLink('Privacy Policy');
  expect(f.openURL.mock.calls).toEqual([['https://flapfitapp.com/terms/'], ['https://flapfitapp.com/privacy/']]);
  expect(notice.isProcessingNoticeAcknowledged()).toBe(false);
  expect(JSON.stringify(f.access.getProcessingInputs().choices)).toBe(choices);
  expect(f.memory.has('@flapfit/processing-notice-v1')).toBe(false);
  await f.press('Agree & Play');
  expect(notice.isProcessingNoticeAcknowledged()).toBe(true);
  expect(JSON.stringify(f.access.getProcessingInputs().choices)).toBe(choices);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  await f.unmount();
});

test('existing reporting refusal in Info persists through Agree & Play without changing eligible ads', async () => {
  const f = await fixture('ios', false, true, 'not-resident', true);
  await f.mount();
  await f.press('Stop reporting');
  await f.unmount(); await f.mount(true);
  expect(f.button('Stop reporting')).toBeUndefined();
  expect(f.button('Allow reporting')).toBeUndefined();
  await f.press('Agree & Play');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: false, reason: 'refused' } });
  await f.unmount(); await f.mount();
  expect(f.button('Allow reporting')).toBeDefined();
  expect(f.text()).toContain('Google AdMob');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  await f.unmount();
});

test('explicit Privacy & choices request opens full details immediately without granting a choice', async () => {
  const f = await fixture();
  await f.mountController();
  const { completion } = await f.open(true);
  expect(f.text()).toContain('Google AdMob');
  expect(f.text()).toContain('RevenueCat');
  expect(f.button('Learn more')).toBeUndefined();
  const notice: typeof import('@/services/privacy/processingNotice') = require('@/services/privacy/processingNotice');
  expect(notice.isProcessingNoticeAcknowledged()).toBe(false);
  await f.act(async () => { f.modal().props.onShow(); });
  await f.press('Close');
  await f.act(async () => { f.modal().props.onDismiss(); });
  await completion;
  expect(notice.isProcessingNoticeAcknowledged()).toBe(false);
  await f.unmount();
});

test('compact setup never acknowledges a failed save and allows retry', async () => {
  const f = await fixture();
  await f.mount(true);
  const notice: typeof import('@/services/privacy/processingNotice') = require('@/services/privacy/processingNotice');
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await f.press('Agree & Play');
  expect(notice.isProcessingNoticeAcknowledged()).toBe(false);
  expect(f.modal().props.visible).toBe(true);
  expect(f.alert).toHaveBeenCalled();
  await f.press('Agree & Play');
  expect(notice.isProcessingNoticeAcknowledged()).toBe(true);
  await f.unmount();
});

const privacyPreviews: PreviewScreen[] = [];
const expectedAdvertisingText = [
  'Google advertising',
  'Non-personalized ads support Flap Fit.',
  "Where available, use Ad privacy settings in Info to manage Google's privacy choices. For other advertising-data requests, use Privacy requests in Info.",
].join('\n');
function capturePrivacy(f: Awaited<ReturnType<typeof fixture>>, country: string, audience: string, state: string) {
  const text = f.text();
  if (f.button('Agree & Play')) {
    const { AD_PROCESSING_SUMMARY }: typeof import('@/services/privacy/processingNotice') = require('@/services/privacy/processingNotice');
    expect(text).toContain(AD_PROCESSING_SUMMARY);
    expect(text).not.toMatch(/Google AdMob|RevenueCat|IP address|diagnostics/);
    expect(f.button('Learn more')).toBeUndefined();
  } else expect(f.groupText('Google advertising')).toBe(expectedAdvertisingText);
  expect(text).not.toMatch(/ad[- ]free|without advertising|without ads|\bno ads\b|advertising protections|yes keeps|(?:advertising|ads|reporting)[^.\n]{0,100}\b(?:disabled|off|unavailable|enabled|permitted|blocked)\b|\boff for your\b/i);
  expect(f.button('Withdraw advertising data consent')).toBeUndefined();
  expect(f.button('Stop advertising')).toBeUndefined();
  privacyPreviews.push({ id: `privacy-${privacyPreviews.length + 1}`, country, audience, state,
    context: 'Actual FlapFit component. Required setup uses short copy and policy links; full details remain in Info.', text, tree: f.json(), alerts: f.alert.mock.calls });
}
afterAll(() => {
  const output = process.env.FLAPFIT_PRIVACY_PREVIEW_OUTPUT;
  if (output) require('node:fs').writeFileSync(output, JSON.stringify({ capturedFrom: 'Actual PrivacyChoices / PrivacyChoicesSheet component using the real local privacy state modules; native APIs mocked for review', screens: privacyPreviews }, null, 2) + '\n');
});

test.each([13, 14, 17, 18])('Canada age %s keeps identical advertising copy before/after either province answer and remount', async age => {
  const f = await fixture('ios', false, true, 'unknown', true, age, 'CA');
  await f.mount(true);
  capturePrivacy(f, 'Canada', `${age === 18 ? '18+' : age}`, 'Province unanswered');
  expect(f.button('Select province or territory')).toBeDefined();
  await f.press('Select province or territory');
  capturePrivacy(f, 'Canada', `${age}`, 'Province dropdown open');
  await f.selectRegion('province', 'New Brunswick');
  capturePrivacy(f, 'Canada', `${age === 18 ? '18+' : age}`, 'Quebec: No');
  expect(f.access.getProcessingInputs().launch?.options.quebecResidency).toBe('not-resident');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  await f.selectRegion('province', 'Quebec');
  capturePrivacy(f, 'Canada', `${age === 18 ? '18+' : age}`, 'Quebec: Yes');
  expect(f.button('Change province or territory')).toBeDefined();
  expect(f.access.getProcessingInputs().launch?.options.quebecResidency).toBe('resident');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.unmount(); await f.mount(true);
  capturePrivacy(f, 'Canada', `${age === 18 ? '18+' : age}`, 'Saved Quebec Yes after reopening');
  expect(f.button('Change province or territory')).toBeDefined();
  expect(f.access.getProcessingInputs().launch?.options.quebecResidency).toBe('resident');
  await f.unmount();
});

test.each([13, 17])('US age %s has neutral CT/NY answers and retains New York history without describing its ad outcome', async age => {
  const f = await fixture('ios', false, false, 'unknown', true, age, 'US');
  await f.mount(true);
  capturePrivacy(f, 'United States', `${age}`, 'Connecticut unanswered');
  expect(f.button('Select state or territory')).toBeDefined();
  await f.press('Select state or territory');
  capturePrivacy(f, 'United States', `${age}`, 'State dropdown open');
  await f.selectRegion('state', 'Connecticut');
  capturePrivacy(f, 'United States', `${age}`, 'Connecticut: Yes');
  expect(f.access.getProcessingInputs().launch?.options.connecticutResidency).toBe('resident');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.selectRegion('state', 'Maine');
  capturePrivacy(f, 'United States', `${age}`, 'Connecticut: No; New York unanswered');
  expect(f.access.getProcessingInputs().launch?.options.connecticutResidency).toBe('not-resident'); expect(f.selectedAnswers('Are you in New York right now?')).toEqual([]);
  const answerNewYork = async (answer: string) => {
    const choices = f.buttons().filter(node => node.findAllByType('Text' as never).some(text => text.children.join('') === answer));
    await f.act(async () => { choices[choices.length - 1].props.onPress(); });
  };
  await answerNewYork('No');
  capturePrivacy(f, 'United States', `${age}`, 'New York: No');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  await f.press('Update New York answer');
  capturePrivacy(f, 'United States', `${age}`, 'Editing saved New York No');
  expect(f.selectedAnswers('Are you in New York right now?')).toEqual(['No']);
  await answerNewYork('Yes');
  capturePrivacy(f, 'United States', `${age}`, 'New York: Yes');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.unmount(); await f.mount(true);
  capturePrivacy(f, 'United States', `${age}`, 'Saved New York Yes after reopening');
  expect(f.text()).not.toContain('Are you in New York right now?');
  await f.press('Update New York answer'); await answerNewYork('No');
  capturePrivacy(f, 'United States', `${age}`, 'New York: No after an earlier Yes');
  await f.press('Update New York answer'); expect(f.selectedAnswers('Are you in New York right now?')).toEqual(['No']);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.text()).toContain('Saved answer: No.');
  await f.unmount();
});

test.each([
  { country: 'US', name: 'United States', age: 18, allowed: true },
  { country: 'AU', name: 'Australia', age: 13, allowed: false },
  { country: 'AU', name: 'Australia', age: 14, allowed: false },
  { country: 'AU', name: 'Australia', age: 15, allowed: true },
  { country: 'AU', name: 'Australia', age: 17, allowed: true },
  { country: 'AU', name: 'Australia', age: 18, allowed: true },
  { country: 'MX', name: 'Mexico', age: 13, allowed: false },
  { country: 'MX', name: 'Mexico', age: 17, allowed: false },
  { country: 'MX', name: 'Mexico', age: 18, allowed: true },
] as const)('$name age $age never describes the age-based advertising outcome', async ({ country, name, age, allowed }) => {
  const f = await fixture('ios', false, false, 'unknown', true, age, country);
  await f.mount(true);
  capturePrivacy(f, name, `${age === 18 ? '18+' : age}`, 'Apple age answer received');
  await f.press('Agree & Play');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(allowed);
  await f.unmount(); await f.mount(true);
  capturePrivacy(f, name, `${age === 18 ? '18+' : age}`, 'After Agree & Play / reopening');
  await f.unmount();
});

test.each([
  ['CA', 'Canada'], ['US', 'United States'], ['AU', 'Australia'], ['MX', 'Mexico'],
] as const)('%s local age form has no ad outcome before or after every offered age answer', async (country, name) => {
  const f = await fixture('ios', false, country === 'CA', 'unknown', true, 18, country);
  f.access.clearAgeVerification(); f.access.setAppleAgeRequirement('unsupported');
  await f.mount(true);
  capturePrivacy(f, name, 'Local age question', 'Age unanswered');
  expect(f.selectedAnswers('Age range')).toEqual([]);
  const local: typeof import('@/services/privacy/localAgeAnswer') = require('@/services/privacy/localAgeAnswer');
  for (const option of local.localAgeOptions()) {
    await f.press(option.label);
    capturePrivacy(f, name, 'Local age question', `Saved age: ${option.label}`);
  expect(f.selectedAnswers('Age range')).toEqual([option.label]);
    expect(f.text()).toContain(`Saved on this device: ${option.label}`);
  }
  await f.unmount();
});

test.each([
  ['CA', 'Canada'], ['US', 'United States'], ['AU', 'Australia'], ['MX', 'Mexico'],
] as const)('%s local age save errors show recovery without an advertising consequence', async (country, name) => {
  const f = await fixture('ios', false, country === 'CA', 'unknown', true, 18, country);
  f.access.clearAgeVerification(); f.access.setAppleAgeRequirement('unsupported');
  await f.mount(true);
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await f.press('18 or older');
  capturePrivacy(f, name, 'Local age question', 'Age answer could not be saved');
  expect(f.selectedAnswers('Age range')).toEqual([]);
  expect(JSON.stringify(f.alert.mock.calls)).not.toMatch(/advertis|processing remains|reporting/i);
  await f.unmount();
});

test.each([['CA', 'Canada'], ['US', 'United States']] as const)('%s regional save errors never advertise the consequence of an unanswered question', async (country, name) => {
  const f = await fixture('ios', false, country === 'CA', 'unknown', true, 15, country);
  await f.mount(true);
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full')); await f.selectRegion(country === 'CA' ? 'province' : 'state', country === 'CA' ? 'Quebec' : 'Connecticut');
  capturePrivacy(f, name, '15', 'Province/state answer could not be saved');
  expect(f.button(`Select ${country === 'CA' ? 'province' : 'state'} or territory`)).toBeDefined();
  expect(JSON.stringify(f.alert.mock.calls)).not.toMatch(/advertis|reporting|processing/i);
  if (country === 'US') {
    await f.selectRegion('state', 'Maine');
    f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
    const choices = f.buttons().filter(node => node.findAllByType('Text' as never).some(text => text.children.join('') === 'Yes'));
    await f.act(async () => { choices[choices.length - 1].props.onPress(); });
    capturePrivacy(f, name, '15', 'New York answer could not be saved');
  expect(f.selectedAnswers('Are you in New York right now?')).toEqual([]);
    expect(JSON.stringify(f.alert.mock.calls)).not.toMatch(/advertis|reporting|processing/i);
  }
  await f.unmount();
});

test.each(['Quebec', 'Connecticut', 'New York', 'age'] as const)('%s never highlights a pending or failed save as confirmed', async kind => {
  const f = await fixture('ios', false, kind === 'Quebec', 'unknown', true, 15, kind === 'Quebec' ? 'CA' : 'US');
  if (kind === 'age') { f.access.clearAgeVerification(); f.access.setAppleAgeRequirement('unsupported'); }
  await f.mount();
  if (kind === 'New York') await f.selectRegion('state', 'Maine');
  const region = kind === 'Quebec' ? 'province' : kind === 'Connecticut' ? 'state' : null;
  if (region) await f.press(`Select ${region} or territory`);
  const group = kind === 'age' ? 'Age range' : kind === 'New York' ? 'Are you in New York right now?' : 'Do you live in ' + kind + '?';
  let rejectSave!: (error: Error) => void;
  f.storage.setItem.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectSave = reject; }));
  const target = kind === 'age' ? '18 or older' : region ? kind : 'Yes';
  const choices = f.buttons().filter(button => button.props.accessibilityLabel === target);
  await f.act(async () => { choices[choices.length - 1].props.onPress(); });
  if (region) expect(f.button(`Select ${region} or territory`)).toBeDefined();
  else expect(f.selectedAnswers(group)).toEqual([]);
  await f.act(async () => { rejectSave(new Error('disk full')); });
  if (region) expect(f.button(`Select ${region} or territory`)).toBeDefined();
  else expect(f.selectedAnswers(group)).toEqual([]);
  await f.unmount(); await f.mount();
  if (region) expect(f.button(`Select ${region} or territory`)).toBeDefined();
  else expect(f.selectedAnswers(group)).toEqual([]);
  if (region) await f.press(`Select ${region} or territory`);
  const retry = f.buttons().filter(button => button.props.accessibilityLabel === target);
  await f.act(async () => { retry[retry.length - 1].props.onPress(); });
  if (kind === 'New York') await f.press('Update New York answer');
  if (region) expect(f.button(`Change ${region} or territory`)).toBeDefined();
  else expect(f.selectedAnswers(group)).toEqual([target]);
  await f.unmount();
});
