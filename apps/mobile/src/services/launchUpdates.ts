import { isGameplayActive } from './gameplayActivity';

export type LaunchUpdatePhase =
  | 'ready' | 'requested' | 'checking' | 'available' | 'current' | 'unavailable'
  | 'downloading' | 'downloaded' | 'applying' | 'failed';

type UpdateClient = {
  isEnabled: boolean;
  checkForUpdateAsync(): Promise<{ isAvailable: boolean; isRollBackToEmbedded?: boolean }>;
  fetchUpdateAsync(): Promise<{ isNew: boolean; isRollBackToEmbedded?: boolean }>;
  reloadAsync(): Promise<void>;
};

/** OTA starts only through the Info action. No launch work, timers or gameplay subscriptions. */
export function createLaunchUpdates(getClient: () => UpdateClient, canUseUpdates = () => !isGameplayActive()) {
  let phase: LaunchUpdatePhase = 'ready';
  let client: UpdateClient;
  const listeners = new Set<() => void>();
  const setPhase = (next: LaunchUpdatePhase) => {
    phase = next;
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => phase,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    requestCheck() {
      if (phase !== 'ready' || !canUseUpdates()) return false;
      // The gate removes the router before its effect starts native networking.
      setPhase('requested');
      return true;
    },
    async start() {
      if (phase !== 'requested') return;
      if (!canUseUpdates()) { setPhase('ready'); return; }
      setPhase('checking');
      try {
        client = getClient();
        if (!client.isEnabled) { setPhase('unavailable'); return; }
        const result = await client.checkForUpdateAsync();
        setPhase(result.isAvailable || result.isRollBackToEmbedded ? 'available' : 'current');
      } catch {
        // A JS timeout cannot cancel this native request. Only the explicitly
        // requested update screen waits; normal app entry never starts a check.
        setPhase('failed');
      }
    },
    later() {
      if (['available', 'failed', 'current', 'unavailable'].includes(phase)) setPhase('ready');
    },
    async download() {
      if (phase !== 'available' || !canUseUpdates()) return;
      setPhase('downloading');
      try {
        const result = await client.fetchUpdateAsync();
        setPhase(result.isNew || result.isRollBackToEmbedded ? 'downloaded' : 'current');
      } catch {
        setPhase('failed');
      }
    },
    async apply() {
      if (phase !== 'downloaded' || !canUseUpdates()) return;
      setPhase('applying');
      try {
        await client.reloadAsync();
        // A resolved reload promise does not mean the native reload has finished.
        // Keep the router unmounted until the new JS process replaces this one.
      } catch {
        setPhase('failed');
      }
    },
  };
}

export const launchUpdates = createLaunchUpdates(() => {
  if (__DEV__) return { isEnabled: false } as UpdateClient;
  return require('expo-updates') as UpdateClient;
});
