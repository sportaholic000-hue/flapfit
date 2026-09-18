import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import * as SMS from 'expo-sms';
import { Platform } from 'react-native';

export type GameplayVideo = { uri: string; mimeType: string; extension: string };
export type VideoShareDestination = 'apps' | 'messages' | 'mail';

// Expo Go uses its bundled native SMS implementation, which cannot receive the
// checked-in attachment UTI fix. Its system share sheet still handles Messages.
function supportsPatchedMessages() {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

export async function getVideoShareAvailability() {
  if (Platform.OS !== 'ios') return { messages: false, mail: false };
  const [messages, mail] = await Promise.all([
    supportsPatchedMessages() ? SMS.isAvailableAsync().catch(() => false) : Promise.resolve(false),
    MailComposer.isAvailableAsync().catch(() => false),
  ]);
  return { messages, mail };
}

export function videoShareUti(video: GameplayVideo) {
  if (video.extension === 'mp4' || video.mimeType === 'video/mp4') return 'public.mpeg-4';
  if (video.extension === 'mov' || video.mimeType === 'video/quicktime') return 'com.apple.quicktime-movie';
  return 'org.webmproject.webm';
}

// The same complete local file is handed to every destination. A composer result
// describes the user's action, not confirmed recipient delivery. The result
// screen remains mounted; sharing never invokes navigation or an advertisement.
export async function shareGameplayVideo(video: GameplayVideo, destination: VideoShareDestination) {
  if (destination === 'messages' && Platform.OS === 'ios' && supportsPatchedMessages()) {
    if (!(await SMS.isAvailableAsync())) {
      throw new Error('Messages is unavailable on this device. Use Share gameplay video instead.');
    }
    await SMS.sendSMSAsync([], '', {
      attachments: {
        uri: video.uri,
        mimeType: video.mimeType,
        filename: `Flap-Fit-gameplay.${video.extension}`,
      },
    });
    return;
  }
  if (destination === 'mail' && Platform.OS === 'ios') {
    if (!(await MailComposer.isAvailableAsync())) {
      throw new Error('Set up Apple Mail or use Share gameplay video to choose another mail app.');
    }
    await MailComposer.composeAsync({
      subject: 'My Flap Fit run',
      attachments: [video.uri],
    });
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(video.uri, {
    dialogTitle: 'Share your Flap Fit gameplay video',
    mimeType: video.mimeType,
    UTI: videoShareUti(video),
  });
}
