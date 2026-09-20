import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RELEASE_LINKS } from '@/config/release';
import {
  connecticutClarificationStatus, hasConnecticutClarificationControl,
  restoreRegionalClarification, saveConnecticutResidency,
} from '@/services/privacy/regionalClarification';
import { getCompetitionStopState, subscribeCompetitionStop, stopOnlineCompetition, getReportingWithdrawalState, subscribeReportingWithdrawal } from '@/services/privacy/privacyRights';
import { getProcessingAccess, getProcessingInputs, subscribeProcessingAccess } from '@/services/privacy/processingAccess';
import {
  acknowledgeProcessingNotice, AD_PROCESSING_DISCLOSURE, allowProcessingPurpose, canChooseProcessingPurpose,
  needsSeparatePurposeChoice, processingPurposeStatus, refuseProcessingPurpose, restoreProcessingNotice,
} from '@/services/privacy/processingNotice';

/** Shared by the permanent Info section and a required post-game choice sheet.
 * Opening/reading it does not record agreement or initialize either SDK. */
export function PrivacyChoices({ onDone, canInteract, includeCompetition = false }: { onDone?: () => void; canInteract?: () => boolean; includeCompetition?: boolean }) {
  const access = useSyncExternalStore(subscribeProcessingAccess, getProcessingAccess, getProcessingAccess);
  const withdrawal = useSyncExternalStore(subscribeReportingWithdrawal, getReportingWithdrawalState, getReportingWithdrawalState);
  const competitionStop = useSyncExternalStore(subscribeCompetitionStop, getCompetitionStopState, getCompetitionStopState);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [, refresh] = useState(0);
  useEffect(() => { let active = true; void Promise.all([restoreProcessingNotice(), restoreRegionalClarification()]).then(() => { if (active) refresh(n => n + 1); }); return () => { active = false; }; }, []);
  const input = getProcessingInputs();
  const current = () => mounted.current && (canInteract?.() ?? true);
  const action = async (operation: () => Promise<void>) => {
    if (busy || !current()) return;
    setBusy(true);
    try { await operation(); if (mounted.current) refresh(n => n + 1); }
    catch (error) { if (current()) Alert.alert('Privacy choice not confirmed', error instanceof Error ? error.message : 'Please try again.'); }
    finally { if (mounted.current) setBusy(false); }
  };
  const button = (title: string, operation: () => Promise<void>) => (
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void action(operation)} style={[styles.button, busy && styles.disabled]}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
  const retryReporting = input.choices.analytics.decision === 'denied' &&
    (withdrawal.status === 'save-unconfirmed' || withdrawal.status === 'native-stop-unconfirmed');
  const reportingPending = withdrawal.status === 'pending';
  // Keep withdrawal reachable after required advertising consent was granted.
  const advertisingChoice = input.launch?.plan?.requirements.ads === 'express-consent' || input.choices.ads.decision === 'denied';
  return <View style={styles.root}>
    <Text style={styles.heading}>Advertising & reporting</Text>
    <Text style={styles.body}>{AD_PROCESSING_DISCLOSURE}</Text>
    {hasConnecticutClarificationControl() ? <View style={styles.group}>
      <Text style={styles.heading}>State privacy rules</Text>
      <Text style={styles.body}>Do you live in Connecticut?</Text>
      <Text style={styles.note}>Your answer stays on this device to apply the appropriate privacy rules. It does not allow advertising or reporting by itself.</Text>
      <Text style={styles.status}>{connecticutClarificationStatus()}</Text>
      <View style={styles.buttons}>
        {button('Yes, Connecticut', () => saveConnecticutResidency('resident'))}
        {button('No', () => saveConnecticutResidency('not-resident'))}
        {button('Not sure', () => saveConnecticutResidency('unknown'))}
      </View>
    </View> : null}
    <View style={styles.group}>
      <Text style={styles.heading}>Google advertising</Text>
      <Text style={styles.body}>Allow the device, approximate-location, and ad-interaction functions described above for non-personalized advertising?</Text>
      <Text style={styles.status}>{processingPurposeStatus('ads')}</Text>
      {advertisingChoice && canChooseProcessingPurpose('ads') ? <View style={styles.buttons}>{!access.ads.allowed ? button('Allow advertising', () => allowProcessingPurpose('ads')) : null}{button(access.ads.allowed ? 'Stop advertising' : 'Not now', () => refuseProcessingPurpose('ads'))}</View> : null}
    </View>
    <View style={styles.group}>
      <Text style={styles.heading}>Ad performance reporting</Text>
      <Text style={styles.body}>RevenueCat reporting is separate from advertising. Stopping reporting leaves separately permitted Google ads enabled.</Text>
      <Text style={styles.status}>{processingPurposeStatus('analytics')}</Text>
      <View style={styles.buttons}>
        {!retryReporting && !reportingPending && canChooseProcessingPurpose('analytics') && (needsSeparatePurposeChoice('analytics') || input.choices.analytics.decision === 'denied')
          ? button('Allow reporting', () => allowProcessingPurpose('analytics')) : null}
        {retryReporting || reportingPending || input.choices.analytics.decision !== 'denied' || access.revenueCat.allowed
          ? button(retryReporting ? 'Retry stopping reporting' : 'Stop reporting', () => refuseProcessingPurpose('analytics')) : null}
      </View>
      <Text style={styles.note}>Stopping future reporting does not delete information already received by RevenueCat. Contact support for data requests.</Text>
    </View>
    {includeCompetition ? <View style={styles.group}>
      <Text style={styles.heading}>Online competition</Text>
      <Text style={styles.body}>Stop online participation without deleting your profile or changing advertising and reporting choices. To participate again, review and accept the rules in Compete.</Text>
      <Text style={styles.status}>{input.choices.competition.decision !== 'denied' ? 'Managed separately in Compete' :
        competitionStop === 'pending' ? 'Confirming your saved choice' : competitionStop === 'save-unconfirmed' ?
        'Choice save not confirmed · online participation stopped for this session' : 'Online participation stopped'}</Text>
      {button(input.choices.competition.decision === 'denied' && competitionStop === 'save-unconfirmed' ? 'Retry stopping competition' : 'Stop online competition', async () => {
        const result = await stopOnlineCompetition();
        if (result.status !== 'completed') throw new Error('Your choice save was not confirmed. Retry stopping competition.');
      })}
      <Text style={styles.note}>For information already saved online, use Delete online profile or Contact us in Info.</Text>
    </View> : null}
    <View style={styles.group}><Text style={styles.heading}>Your camera stays on your device</Text><Text style={styles.body}>Flap Fit does not receive your camera footage or audio. Record & Play makes a temporary video on your device so you can choose whether and where to share it.</Text></View>
    <TouchableOpacity accessibilityRole="link" onPress={() => void Linking.openURL(RELEASE_LINKS.privacyUrl).catch(() => Alert.alert('Unable to open privacy policy', 'Please try again when online.'))} style={styles.link}><Text style={styles.linkText}>Full privacy policy</Text></TouchableOpacity>
    {button('Save & continue', async () => { await acknowledgeProcessingNotice(); if (current()) onDone?.(); })}
    <Text style={styles.note}>These choices do not grant permission for online competition. You can keep playing when optional processing is unavailable.</Text>
  </View>;
}

export function PrivacyChoicesSheet({ onClose, closeRequested = false }: { onClose: () => void; closeRequested?: boolean }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const lifetime = useRef({ active: true, shown: false, closing: false, completed: false });
  useEffect(() => {
    const current = lifetime.current;
    current.active = true;
    return () => { current.active = false; };
  }, []);
  const finishClose = useCallback(() => {
    const current = lifetime.current;
    if (!current.active || current.completed) return;
    current.completed = true;
    onClose();
  }, [onClose]);
  const requestClose = useCallback(() => {
    const current = lifetime.current;
    if (!current.active || current.closing) return;
    current.closing = true;
    // If a close races initial presentation, let iOS finish showing the host
    // first so that it will issue a real dismissal completion.
    if (current.shown || Platform.OS !== 'ios') setVisible(false);
  }, []);
  useEffect(() => { if (closeRequested) requestClose(); }, [closeRequested, requestClose]);
  useEffect(() => {
    // Android's Modal has no onDismiss event. With no exit animation it removes
    // its native host on the visible=false commit before this effect runs.
    if (!visible && Platform.OS !== 'ios') finishClose();
  }, [visible, finishClose]);
  return <Modal visible={visible} animationType={Platform.OS === 'ios' ? 'slide' : 'none'} presentationStyle="pageSheet"
    onRequestClose={requestClose} onDismiss={finishClose} onShow={() => {
      lifetime.current.shown = true;
      if (lifetime.current.active && lifetime.current.closing) setVisible(false);
    }}>
    <View style={[styles.sheet, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}><Text style={styles.title}>Privacy & choices</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close privacy choices" onPress={requestClose} style={styles.close}><Text style={styles.closeText}>Close</Text></TouchableOpacity></View>
      <ScrollView contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + 24 }]}><PrivacyChoices onDone={requestClose} canInteract={() => lifetime.current.active && !lifetime.current.closing} /></ScrollView>
    </View>
  </Modal>;
}

type SheetRequest = { id: number; completion: Promise<void>; resolve: () => void; closeRequested?: boolean };

/** Cancellation releases the invalidated result waiter, while retaining the
 * native host through dismissal. A replacement request waits behind that host. */
export function usePrivacyChoicesSheet() {
  const [request, setRequest] = useState<SheetRequest | null>(null);
  const pending = useRef<SheetRequest | null>(null);
  const displayed = useRef<SheetRequest | null>(null);
  const nextRequestId = useRef(0);
  const mounted = useRef(true);
  const cancelChoices = useCallback(() => {
    const previous = pending.current;
    pending.current = null;
    previous?.resolve();
    if (mounted.current && displayed.current) setRequest({ ...displayed.current, closeRequested: true });
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.resolve(); pending.current = null;
      displayed.current?.resolve(); displayed.current = null;
    };
  }, []);
  const openChoices = useCallback((): Promise<void> => {
    if (!mounted.current) return Promise.resolve();
    if (pending.current) return pending.current.completion;
    let resolve!: () => void;
    const completion = new Promise<void>(done => { resolve = done; });
    const next = { id: ++nextRequestId.current, completion, resolve };
    pending.current = next;
    if (!displayed.current) { displayed.current = next; setRequest(next); }
    return completion;
  }, []);
  const dismiss = (closed: SheetRequest) => {
    if (!mounted.current || displayed.current?.id !== closed.id) return;
    if (pending.current?.id === closed.id) pending.current = null;
    // Only a native dismissal can hand the presentation slot to a queued sheet.
    displayed.current = pending.current;
    setRequest(displayed.current);
    closed.resolve();
  };
  return { openChoices, cancelChoices,
    privacyChoicesSheet: request ? <PrivacyChoicesSheet key={request.id} closeRequested={request.closeRequested} onClose={() => dismiss(request)} /> : null };
}

const styles = StyleSheet.create({
  root: { gap: 8 }, heading: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  body: { color: '#475569', fontSize: 14, lineHeight: 21 }, group: { marginTop: 14, gap: 7 },
  note: { color: '#64748B', fontSize: 12, lineHeight: 18 }, status: { color: '#334155', fontSize: 13, fontWeight: '700' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center' },
  buttonText: { color: '#075985', fontSize: 14, fontWeight: '800' }, disabled: { opacity: 0.5 },
  link: { minHeight: 44, justifyContent: 'center' }, linkText: { color: '#0369A1', fontSize: 14, fontWeight: '700' },
  sheet: { flex: 1, backgroundColor: '#0F172A' }, header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, color: '#FFFFFF', fontWeight: '900', fontSize: 21 }, close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, closeText: { color: '#FFFFFF', fontSize: 15 },
  sheetBody: { flexGrow: 1, padding: 21, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
});
