import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { authorizeGameEntry, type GameEntryDecision } from '@/services/privacy/gameEntry';
import { releaseEligibilityMessage } from '@/services/privacy/releaseEligibility';
import { restoreProcessingNotice } from '@/services/privacy/processingNotice';
import { restoreRegionalClarification } from '@/services/privacy/regionalClarification';
import { restoreLocalAgeAnswer } from '@/services/privacy/localAgeAnswer';
import { restoreNewYorkClarification } from '@/services/privacy/newYorkClarification';
import { retryGameEligibility } from '@/services/privacy/retryGameEligibility';
import { settlePrivacyBeforeGameplay } from '@/services/monetization';

/** One owner for entry from Home/deep links and each Retry/Next. Authorization is
 * latched for the active run; refreshes never interrupt play, recording or sharing. */
export function GameEligibilityGate({ hasExistingPlay, children }: {
  hasExistingPlay: () => boolean;
  children: (newRun: () => void, prepareEntry: () => Promise<void>) => ReactNode;
}) {
  const router = useRouter();
  const [entry, setEntry] = useState(0);
  const [decision, setDecision] = useState<GameEntryDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const entryIdentity = useRef({});
  const admitted = useRef(false);
  const priorPlay = useRef(hasExistingPlay);
  priorPlay.current = hasExistingPlay;
  const inFlight = useRef<Promise<void> | null>(null);
  const cancelPending = useCallback(() => { mounted.current = false; ++generation.current; inFlight.current = null; }, []);
  useEffect(() => { mounted.current = true; return cancelPending; }, [cancelPending]);
  const check = (retry: boolean) => {
    if (inFlight.current) return inFlight.current;
    const token = generation.current;
    const current = () => mounted.current && generation.current === token && AppState.currentState === 'active';
    setBusy(true); setError(null);
    const task = (async () => {
      await settlePrivacyBeforeGameplay();
      if (!current()) return;
      if (Platform.OS !== 'ios') { admitted.current = true; setDecision({ status: 'available' }); return; }
      await Promise.all([restoreProcessingNotice(), restoreRegionalClarification(), restoreLocalAgeAnswer(), restoreNewYorkClarification()]);
      if (retry && current()) await retryGameEligibility(current);
      if (!current()) return;
      const next = await authorizeGameEntry(priorPlay.current(), entryIdentity.current);
      if (current()) {
        admitted.current = next.status === 'available' || next.status === 'trial';
        setDecision(next);
      }
    })().catch(() => {
      if (current()) setError('Saved game eligibility could not be confirmed. Retry the check. Your progress and privacy choices are unchanged.');
    }).finally(() => {
      if (mounted.current && generation.current === token) setBusy(false);
      if (inFlight.current === task) inFlight.current = null;
    });
    inFlight.current = task;
    return task;
  };
  const checkRef = useRef(check); checkRef.current = check;
  useEffect(() => {
    void checkRef.current(false);
    const listener = AppState.addEventListener('change', state => {
      // A backgrounded pending entry has a reachable automatic return path.
      if (state === 'active' && !admitted.current) void checkRef.current(false);
    });
    return () => listener.remove();
  }, [entry]);
  const newRun = () => {
    if (!mounted.current || !admitted.current) return;
    ++generation.current;
    entryIdentity.current = {};
    admitted.current = false;
    inFlight.current = null;
    setDecision(null); setError(null); setEntry(value => value + 1);
  };
  const prepareEntry = useCallback(async () => {
    if (Platform.OS !== 'ios') return;
    const token = generation.current;
    const next = await authorizeGameEntry(priorPlay.current(), entryIdentity.current, true);
    if (!mounted.current || generation.current !== token) throw new Error('Game entry changed.');
    if (next.status !== 'available' && next.status !== 'trial') {
      admitted.current = false; setDecision(next);
      throw new Error('Review availability before another game.');
    }
  }, []);
  if (decision?.status === 'available' || decision?.status === 'trial') return <View key={entry} style={{ flex: 1 }}>{children(newRun, prepareEntry)}</View>;
  return <View style={{ flex: 1, backgroundColor: '#0F172A', padding: 28, justifyContent: 'center', gap: 18 }}>
    <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800' }}>Flap Fit availability</Text>
    <Text style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 24 }}>{error ?? (decision ? releaseEligibilityMessage(decision) : 'Checking availability…')}</Text>
    {busy ? <ActivityIndicator color="#FFFFFF" /> : <TouchableOpacity accessibilityRole="button" onPress={() => void check(true)} style={{ padding: 16 }}>
      <Text style={{ color: '#7DD3FC', fontWeight: '700' }}>Retry check</Text>
    </TouchableOpacity>}
    <TouchableOpacity accessibilityRole="button" onPress={() => router.replace('/(tabs)/info')} style={{ padding: 16 }}>
      <Text style={{ color: '#7DD3FC', fontWeight: '700' }}>Review in Info</Text>
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" onPress={() => router.replace('/(tabs)')} style={{ padding: 16 }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Back to Home</Text>
    </TouchableOpacity>
  </View>;
}
