import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, TurboModuleRegistry, type TurboModule } from 'react-native';
import { normalizeUmpProviderInfo } from './umpStoredSignals';

export type UmpPrivacyInfo = Readonly<{
  required: boolean | null;
  canRequestAds: boolean;
}>;
interface ConsentModule extends TurboModule {
  getConsentInfo(): Promise<unknown>;
  showPrivacyOptionsForm(): Promise<unknown>;
}

function readInfo(value: unknown): UmpPrivacyInfo {
  const info = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    required: info.privacyOptionsRequirementStatus === 'REQUIRED' ? true :
      info.privacyOptionsRequirementStatus === 'NOT_REQUIRED' ? false : null,
    canRequestAds: info.canRequestAds === true,
  };
}

/** Access to an existing Google privacy choice must not require eligibility for
 * new ads. This narrow native bridge does not import or initialize either ad SDK
 * or RevenueCat, perform a consent refresh, or infer age/region/other permissions. */
export function getUmpPrivacyControls() {
  if ((Platform.OS !== 'ios' && Platform.OS !== 'android') ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    const native = TurboModuleRegistry.get<ConsentModule>('RNGoogleMobileAdsConsentModule');
    if (typeof native?.getConsentInfo !== 'function' || typeof native.showPrivacyOptionsForm !== 'function') return null;
    return {
      getConsentInfo: async () => readInfo(await native.getConsentInfo()),
      showPrivacyOptionsForm: async () => readInfo(await native.showPrivacyOptionsForm()),
    };
  } catch { return null; }
}

interface ProcessingConsentModule extends ConsentModule {
  requestInfoUpdate(options: { tagForUnderAgeOfConsent: boolean }): Promise<unknown>;
  loadAndShowConsentFormIfRequired(): Promise<unknown>;
}
const SIGNAL_TIMEOUT_MS = 10_000;
async function boundedSignal<T>(operation: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Privacy signal unavailable')), SIGNAL_TIMEOUT_MS);
    })]);
  } finally { if (timeout !== undefined) clearTimeout(timeout); }
}
/** UMP collection is independent of advertising eligibility and SDK startup.
 * Native presentation remains owned by the caller's shared presentation barrier. */
export function getUmpProcessingControls() {
  if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    const native = TurboModuleRegistry.get<ProcessingConsentModule>('RNGoogleMobileAdsConsentModule');
    if (typeof native?.getConsentInfo !== 'function' || typeof native.requestInfoUpdate !== 'function' ||
      typeof native.loadAndShowConsentFormIfRequired !== 'function') return null;
    return {
      getProviderInfo: async () => normalizeUmpProviderInfo(await boundedSignal(native.getConsentInfo())),
      update: async (underAgeOfConsent: boolean) => normalizeUmpProviderInfo(await boundedSignal(native.requestInfoUpdate({ tagForUnderAgeOfConsent: underAgeOfConsent }))),
      // Do not time out and release ownership while an uncancellable native sheet is still open.
      loadAndShowIfRequired: async () => normalizeUmpProviderInfo(await native.loadAndShowConsentFormIfRequired()),
    };
  } catch { return null; }
}
