import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RELEASE_LINKS } from '@/config/release';
import { getProcessingAccess, getProcessingInputs, subscribeProcessingAccess } from '@/services/privacy/processingAccess';
import {
  acknowledgeProcessingNotice, AD_PROCESSING_DISCLOSURE, allowProcessingPurpose,
  needsSeparatePurposeChoice, processingPurposeStatus, refuseProcessingPurpose, restoreProcessingNotice,
} from '@/services/privacy/processingNotice';

/** Shared by the permanent Info section and a required post-game choice sheet.
 * Opening/reading it does not record agreement or initialize either SDK. */
export function PrivacyChoices({ onDone }: { onDone?: () => void }) {
  const access = useSyncExternalStore(subscribeProcessingAccess, getProcessingAccess, getProcessingAccess);
  const [busy, setBusy] = useState(false);
  const [, refresh] = useState(0);
  useEffect(() => { let active = true; void restoreProcessingNotice().then(() => { if (active) refresh(n => n + 1); }); return () => { active = false; }; }, []);
  const input = getProcessingInputs();
  const action = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await operation(); refresh(n => n + 1); }
    catch (error) { Alert.alert('Privacy choice not confirmed', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const button = (title: string, operation: () => Promise<void>) => (
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void action(operation)} style={[styles.button, busy && styles.disabled]}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
  // Keep withdrawal reachable after required advertising consent was granted.
  const advertisingChoice = input.launch?.plan?.requirements.ads === 'express-consent' || input.choices.ads.decision === 'denied';
  return <View style={styles.root}>
    <Text style={styles.heading}>Advertising & reporting</Text>
    <Text style={styles.body}>{AD_PROCESSING_DISCLOSURE}</Text>
    {advertisingChoice ? <View style={styles.group}>
      <Text style={styles.heading}>Google advertising</Text>
      <Text style={styles.body}>Allow the device, approximate-location, and ad-interaction functions described above for non-personalized advertising?</Text>
      <Text style={styles.status}>{processingPurposeStatus('ads')}</Text>
      <View style={styles.buttons}>{!access.ads.allowed ? button('Allow advertising', () => allowProcessingPurpose('ads')) : null}{button(access.ads.allowed ? 'Stop advertising' : 'Not now', () => refuseProcessingPurpose('ads'))}</View>
    </View> : null}
    <View style={styles.group}>
      <Text style={styles.heading}>Ad performance reporting</Text>
      <Text style={styles.body}>RevenueCat reporting is separate from advertising. Stopping reporting leaves separately permitted Google ads enabled.</Text>
      <Text style={styles.status}>{processingPurposeStatus('analytics')}</Text>
      <View style={styles.buttons}>
        {needsSeparatePurposeChoice('analytics') || input.choices.analytics.decision === 'denied'
          ? button('Allow reporting', () => allowProcessingPurpose('analytics')) : null}
        {input.choices.analytics.decision !== 'denied' || access.revenueCat.allowed
          ? button('Stop reporting', () => refuseProcessingPurpose('analytics')) : null}
      </View>
      <Text style={styles.note}>Stopping future reporting does not delete information already received by RevenueCat. Contact support for data requests.</Text>
    </View>
    <View style={styles.group}><Text style={styles.heading}>Your camera stays on your device</Text><Text style={styles.body}>Flap Fit does not receive your camera footage or audio. Record & Play makes a temporary video on your device so you can choose whether and where to share it.</Text></View>
    <TouchableOpacity accessibilityRole="link" onPress={() => void Linking.openURL(RELEASE_LINKS.privacyUrl).catch(() => Alert.alert('Unable to open privacy policy', 'Please try again when online.'))} style={styles.link}><Text style={styles.linkText}>Full privacy policy</Text></TouchableOpacity>
    {button('Save & continue', async () => { await acknowledgeProcessingNotice(); onDone?.(); })}
    <Text style={styles.note}>These choices do not grant permission for online competition. You can keep playing when optional processing is unavailable.</Text>
  </View>;
}

export function PrivacyChoicesSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={[styles.sheet, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}><Text style={styles.title}>Privacy & choices</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close privacy choices" onPress={onClose} style={styles.close}><Text style={styles.closeText}>Close</Text></TouchableOpacity></View>
      <ScrollView contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + 24 }]}><PrivacyChoices onDone={onClose} /></ScrollView>
    </View>
  </Modal>;
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
