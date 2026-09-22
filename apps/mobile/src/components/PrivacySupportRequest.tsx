import { useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RELEASE_LINKS } from '@/config/release';
import { applyPrivacySupportResponse, preparePrivacySupportRequest } from '@/services/privacy/supportResponse';

export function PrivacySupportRequest() {
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [message, setMessage] = useState('');
  const run = async (action: () => Promise<void>) => {
    if (working.current) return;
    working.current = true; setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again or contact support.'); }
    finally { working.current = false; setBusy(false); }
  };
  const contact = () => run(async () => {
    const id = await preparePrivacySupportRequest();
    setRequestId(id);
    const email = RELEASE_LINKS.supportEmail;
    if (!email) throw new Error('The support address is unavailable. Please use the contact link in the privacy policy.');
    const body = `Please describe your privacy request below.\n\nRequest ID: ${id}\n\n`;
    try { await Linking.openURL(`mailto:${email}?subject=${encodeURIComponent('Flap Fit privacy request')}&body=${encodeURIComponent(body)}`); }
    catch { setMessage(`Email ${email} with the request ID below. Your choices have not changed.`); }
  });
  const apply = () => run(async () => {
    const result = await applyPrivacySupportResponse(code);
    setMessage(result.status === 'completed'
      ? 'Choice saved. Close and reopen Flap Fit to finish ending the current Google SDK session. Information already held by providers is handled separately through support.'
      : result.status === 'superseded' ? 'Your newer choice has been kept.'
      : 'The save could not be confirmed. Please apply the response again before closing the app.');
  });
  return <View style={styles.panel}>
    <Text style={styles.body}>Contact support about access, correction, deletion or applicable data-processing rights. Opening a request does not change your choices.</Text>
    <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => void contact()}>
      <Text style={styles.buttonText}>Contact privacy support</Text>
    </TouchableOpacity>
    {requestId ? <Text selectable style={styles.body}>Request ID: {requestId}</Text> : null}
    <Text style={styles.body}>If support sends a response code for this device, paste it below. Apply it only if you requested withdrawal of consent to Google advertising-data processing.</Text>
    <TextInput accessibilityLabel="Support response code" placeholder="Support response code" value={code} onChangeText={setCode}
      maxLength={256} autoCapitalize="none" autoCorrect={false} multiline editable={!busy} style={styles.input} />
    <TouchableOpacity accessibilityRole="button" disabled={busy || !code.trim()} style={styles.button} onPress={() => Alert.alert(
      'Apply support response?', 'This completes your request to withdraw consent to Google advertising-data processing on this device. It does not change reporting or competition choices, or delete past provider records.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Apply response', onPress: () => void apply() }],
    )}>
      <Text style={styles.buttonText}>{busy ? 'Please wait…' : 'Apply support response'}</Text>
    </TouchableOpacity>
    {message ? <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 14, gap: 12, backgroundColor: '#F1F5F9', borderRadius: 12 },
  body: { color: '#334155', fontSize: 14, lineHeight: 21 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#64748B', borderWidth: 1, borderRadius: 8, padding: 12, color: '#0F172A', minHeight: 64 },
  button: { borderRadius: 10, backgroundColor: '#1E40AF', padding: 13, minHeight: 44 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
});
