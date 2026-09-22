import type { ReactTestRenderer } from 'react-test-renderer';
jest.setTimeout(20_000);
async function fixture() {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  const alert = jest.fn(); const openURL = jest.fn().mockResolvedValue(undefined);
  jest.doMock('react-native', () => ({ View: 'View', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', StyleSheet: { create: (x: unknown) => x }, Linking: { openURL }, Alert: { alert } }));
  jest.doMock('@/config/release', () => ({ RELEASE_LINKS: { supportEmail: 'support@flapfitapp.com' } }));
  const prepare = jest.fn().mockResolvedValue('local-request'); const apply = jest.fn().mockResolvedValue({ status: 'completed', saved: true });
  jest.doMock('@/services/privacy/supportResponse', () => ({ preparePrivacySupportRequest: prepare, applyPrivacySupportResponse: apply }));
  const { PrivacySupportRequest } = require('../PrivacySupportRequest');
  let tree!: ReactTestRenderer; await React.act(async () => { tree = renderer.create(React.createElement(PrivacySupportRequest)); });
  const press = async (label: string) => React.act(async () => {
    tree.root.findAllByType('TouchableOpacity' as never).find(n => n.findAllByType('Text' as never).some(t => t.children.join('') === label))!.props.onPress();
  });
  const input = async (value: string) => React.act(async () => { tree.root.findByType('TextInput' as never).props.onChangeText(value); });
  const confirm = async () => React.act(async () => { alert.mock.calls.at(-1)![2][1].onPress(); });
  const text = () => tree.root.findAllByType('Text' as never).map(n => n.children.join('')).join('\n');
  return { press, input, confirm, text, prepare, apply, openURL, alert };
}
test('opening the screen and contacting support never applies a response', async () => {
  const f = await fixture(); expect(f.prepare).not.toHaveBeenCalled();
  await f.press('Contact privacy support');
  expect(f.openURL).toHaveBeenCalledWith(expect.stringContaining('mailto:support@flapfitapp.com'));
  expect(f.apply).not.toHaveBeenCalled();
  expect(f.text()).not.toMatch(/ad.free|ads.off|Quebec|Connecticut|New York|Australia|Mexico/iu);
});
test('applying requires explicit confirmation and truthfully requests a restart', async () => {
  const f = await fixture(); await f.input('signed-code'); await f.press('Apply support response');
  expect(f.apply).not.toHaveBeenCalled(); await f.confirm();
  expect(f.apply).toHaveBeenCalledWith('signed-code');
  expect(f.text()).toContain('Close and reopen'); expect(f.text()).toContain('already held');
});
test('mail failure gives a usable email and request ID without changing choices', async () => {
  const f = await fixture(); f.openURL.mockRejectedValueOnce(new Error('no mail app')); await f.press('Contact privacy support');
  expect(f.text()).toContain('support@flapfitapp.com'); expect(f.text()).toContain('local-request'); expect(f.apply).not.toHaveBeenCalled();
});
test('invalid response and failed save are not presented as completed', async () => {
  const f = await fixture(); await f.input('invalid'); f.apply.mockRejectedValueOnce(new Error('Invalid response'));
  await f.press('Apply support response'); await f.confirm(); expect(f.text()).toContain('Invalid response');
  f.apply.mockResolvedValueOnce({ status: 'save-unconfirmed', saved: false });
  await f.press('Apply support response'); await f.confirm(); expect(f.text()).toContain('save could not be confirmed'); expect(f.text()).not.toContain('Choice saved.');
});
