export type LaunchUpdatePhase =
  | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded'
  | 'applying' | 'failed' | 'ready';

type UpdateClient = {
  isEnabled: boolean;
  checkForUpdateAsync(): Promise<{ isAvailable: boolean; isRollBackToEmbedded?: boolean }>;
  fetchUpdateAsync(): Promise<{ isNew: boolean; isRollBackToEmbedded?: boolean }>;
  reloadAsync(): Promise<void>;
};

/** One launch owns OTA. No timers, foreground polling, or gameplay subscriptions. */
export function createLaunchUpdates(getClient: () => UpdateClient) {
  let phase: LaunchUpdatePhase = 'idle';
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
    async start() {
      if (phase !== 'idle') return;
      setPhase('checking');
      try {
        client = getClient();
        if (!client.isEnabled) { setPhase('ready'); return; }
        const result = await client.checkForUpdateAsync();
        setPhase(result.isAvailable || result.isRollBackToEmbedded ? 'available' : 'ready');
      } catch {
        // Offline/check errors keep the installed app usable. Await the native
        // request: racing a JS timeout would leave its network work running.
        setPhase('ready');
      }
    },
    later() {
      if (phase === 'available' || phase === 'failed') setPhase('ready');
    },
    async download() {
      if (phase !== 'available') return;
      setPhase('downloading');
      try {
        const result = await client.fetchUpdateAsync();
        setPhase(result.isNew || result.isRollBackToEmbedded ? 'downloaded' : 'ready');
      } catch {
        setPhase('failed');
      }
    },
    async apply() {
      if (phase !== 'downloaded') return;
      setPhase('applying');
      try {
        await client.reloadAsync();
        // Keep the router unmounted until the native reload replaces this JS
        // process. A resolved reload promise does not mean reload has finished.
      } catch {
        setPhase('failed');
      }
    },
  };
}

// Shared across RootLayout remounts/Strict Mode. The gate runs once per cold
// launch; returning from sharing or a workout never starts another OTA request.
export const launchUpdates = createLaunchUpdates(() => {
  if (__DEV__) return { isEnabled: false } as UpdateClient;
  return require('expo-updates') as UpdateClient;
});
