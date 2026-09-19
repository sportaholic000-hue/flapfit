import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, TurboModuleRegistry, type TurboModule } from 'react-native';

export type StoredUmpSignals = Readonly<{
  status: 'available' | 'unavailable' | 'error';
  gdprApplies: boolean | null;
}>;
interface ConsentModule extends TurboModule { getConsentInfo(): Promise<unknown> }

/** Stored provider applicability only; neither location nor proof of fresh consent.
 * Callers must perform the permitted UMP refresh separately. This reads the UMP
 * module without importing or initializing the advertising SDK. Raw consent
 * strings, identifiers and purpose choices are neither collected nor persisted.
 */
export async function readStoredUmpSignals(): Promise<StoredUmpSignals> {
  if (Platform.OS !== 'ios' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return { status: 'unavailable', gdprApplies: null };
  }
  try {
    const native = TurboModuleRegistry.get<ConsentModule>('RNGoogleMobileAdsConsentModule');
    if (!native || typeof native.getConsentInfo !== 'function') return { status: 'unavailable', gdprApplies: null };
    const value = await native.getConsentInfo();
    if (!value || typeof value !== 'object') return { status: 'unavailable', gdprApplies: null };
    const signals = value as Record<string, unknown>;
    // Older native builds collapse absence to false. Never trust that fallback.
    if (signals.flapFitPrivacySignalsVersion !== 1) return { status: 'unavailable', gdprApplies: null };
    const flag = signals.flapFitGdprApplies;
    return { status: 'available', gdprApplies: typeof flag === 'boolean' ? flag : null };
  } catch {
    return { status: 'error', gdprApplies: null };
  }
}
