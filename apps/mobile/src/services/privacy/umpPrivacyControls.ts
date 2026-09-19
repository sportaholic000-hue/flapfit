import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, TurboModuleRegistry, type TurboModule } from 'react-native';

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
