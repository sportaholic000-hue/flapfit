import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as MailComposer from 'expo-mail-composer';
import * as SMS from 'expo-sms';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getVideoShareAvailability, shareGameplayVideo } from '../videoSharing';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone' },
  ExecutionEnvironment: { Standalone: 'standalone', StoreClient: 'storeClient' },
}));
jest.mock('expo-mail-composer', () => ({ isAvailableAsync: jest.fn(), composeAsync: jest.fn() }));
jest.mock('expo-sms', () => ({ isAvailableAsync: jest.fn(), sendSMSAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
const video = { uri: 'file:///private/cache/full-25-second-run.mp4', mimeType: 'video/mp4', extension: 'mp4' };
const originalPlatform = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks(); Platform.OS = 'ios';
  Constants.executionEnvironment = ExecutionEnvironment.Standalone;
  (SMS.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  (MailComposer.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
});
afterAll(() => { Platform.OS = originalPlatform; });

test('Messages attaches the complete existing video and returns only after the composer ends', async () => {
  let finish!: (value: unknown) => void;
  (SMS.sendSMSAsync as jest.Mock).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const done = jest.fn(); const pending = shareGameplayVideo(video, 'messages').then(done);
  await Promise.resolve();
  expect(SMS.sendSMSAsync).toHaveBeenCalledWith([], '', { attachments: { uri: video.uri, mimeType: 'video/mp4', filename: 'Flap-Fit-gameplay.mp4' } });
  expect(done).not.toHaveBeenCalled();
  finish({ result: 'cancelled' }); await pending;
  expect(done).toHaveBeenCalledTimes(1);
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});

test('Mail attaches that same complete video without choosing recipients', async () => {
  await shareGameplayVideo(video, 'mail');
  expect(MailComposer.composeAsync).toHaveBeenCalledWith({ subject: 'My Flap Fit run', attachments: [video.uri] });
});

test('social sharing retains one file and its correct MP4 metadata', async () => {
  await shareGameplayVideo(video, 'apps');
  expect(Sharing.shareAsync).toHaveBeenCalledWith(video.uri, expect.objectContaining({ mimeType: 'video/mp4', UTI: 'public.mpeg-4' }));
  expect(SMS.sendSMSAsync).not.toHaveBeenCalled();
});

test('unavailable iPhone composers offer the existing share route without losing the video', async () => {
  (SMS.isAvailableAsync as jest.Mock).mockResolvedValue(false);
  (MailComposer.isAvailableAsync as jest.Mock).mockRejectedValue(new Error('not configured'));
  expect(await getVideoShareAvailability()).toEqual({ messages: false, mail: false });
  await expect(shareGameplayVideo(video, 'messages')).rejects.toThrow('Use Share gameplay video');
  expect(SMS.sendSMSAsync).not.toHaveBeenCalled();
});

test('Android continues using its existing system share flow', async () => {
  Platform.OS = 'android';
  expect(await getVideoShareAvailability()).toEqual({ messages: false, mail: false });
  await shareGameplayVideo(video, 'apps');
  expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
  expect(SMS.isAvailableAsync).not.toHaveBeenCalled();
});

test('Expo Go keeps the complete video on the system share path until the patched native build is installed', async () => {
  Constants.executionEnvironment = ExecutionEnvironment.StoreClient;
  expect(await getVideoShareAvailability()).toEqual({ messages: false, mail: true });
  await shareGameplayVideo(video, 'messages');
  expect(SMS.isAvailableAsync).not.toHaveBeenCalled();
  expect(SMS.sendSMSAsync).not.toHaveBeenCalled();
  expect(Sharing.shareAsync).toHaveBeenCalledWith(video.uri, expect.objectContaining({ mimeType: 'video/mp4', UTI: 'public.mpeg-4' }));
});
