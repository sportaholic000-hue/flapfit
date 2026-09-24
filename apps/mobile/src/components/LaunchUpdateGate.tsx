import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Text, TouchableOpacity, View } from 'react-native';
import { launchUpdates } from '@/services/launchUpdates';

/** Normal entry mounts immediately; only an explicit Info update request owns this screen. */
export function LaunchUpdateGate({ children }: { children: ReactNode }) {
  const phase = useSyncExternalStore(launchUpdates.subscribe, launchUpdates.getSnapshot, launchUpdates.getSnapshot);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    if (phase === 'ready') return;
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    setActive(AppState.currentState === 'active');
    return () => subscription.remove();
  }, [phase]);

  useEffect(() => {
    if (!active || AppState.currentState !== 'active') return;
    if (phase === 'requested') void launchUpdates.start();
    if (phase === 'downloaded') void launchUpdates.apply();
  }, [active, phase]);

  if (phase === 'ready') return children;

  const offered = phase === 'available';
  const failed = phase === 'failed';
  const current = phase === 'current';
  const unavailable = phase === 'unavailable';
  const canContinue = failed || current || unavailable;
  const heading = offered ? 'An update is available'
    : current ? 'You’re up to date'
    : unavailable ? 'Updates unavailable'
    : failed ? 'Couldn’t finish the update'
    : phase === 'downloading' ? 'Downloading update…'
    : phase === 'downloaded' || phase === 'applying' ? 'Opening Flap Fit…'
    : 'Checking for updates…';
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>{heading}</Text>
      {offered || canContinue ? (
        <>
          <Text style={styles.body}>{offered
            ? 'Update before you play, or keep playing this version for now.'
            : current ? 'You’re using the latest compatible version.'
            : 'You can keep playing this version and check again from Info later.'}</Text>
          {offered && <TouchableOpacity accessibilityRole="button" style={styles.primary}
            onPress={() => { if (AppState.currentState === 'active') void launchUpdates.download(); }}>
            <Text style={styles.primaryText}>Update now</Text>
          </TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={() => launchUpdates.later()}>
            <Text style={styles.secondaryText}>{canContinue ? 'Continue' : 'Later'}</Text>
          </TouchableOpacity>
        </>
      ) : <ActivityIndicator color="#38BDF8" size="large" style={styles.spinner} />}
    </View>
  );
}

const styles = {
  screen: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, padding: 28, backgroundColor: '#0F172A' },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '700' as const, textAlign: 'center' as const },
  body: { color: '#CBD5E1', fontSize: 16, lineHeight: 24, textAlign: 'center' as const, marginTop: 16, maxWidth: 420 },
  primary: { backgroundColor: '#38BDF8', paddingVertical: 15, paddingHorizontal: 32, borderRadius: 16, marginTop: 28 },
  primaryText: { color: '#0F172A', fontSize: 17, fontWeight: '700' as const },
  secondary: { paddingVertical: 16, paddingHorizontal: 32, marginTop: 4 },
  secondaryText: { color: '#CBD5E1', fontSize: 17 },
  spinner: { marginTop: 24 },
};
