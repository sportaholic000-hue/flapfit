import { useEffect } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { RELEASE_LINKS } from '@/config/release';

export function CompetitionTermsModal({
  visible,
  onAccept,
  onClose,
  onDismiss,
}: {
  visible: boolean;
  onAccept?: () => void;
  onClose: () => void;
  onDismiss?: () => void;
}) {
  useEffect(() => { if (!visible && Platform.OS !== 'ios') onDismiss?.(); }, [visible, onDismiss]);
  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'ios' ? 'fade' : 'none'}
      onDismiss={onDismiss}
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 20,
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
        }}
      >
        <View
          style={{
            maxHeight: '88%',
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ color: '#06223D', fontSize: 21, fontWeight: '900' }}>
              Online Competition Terms
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>
              Community rules effective September 14, 2026
            </Text>

            <Text style={{ color: '#06223D', fontWeight: '900', marginTop: 18 }}>
              What becomes public
            </Text>
            <Text style={{ color: '#475569', lineHeight: 20, marginTop: 5 }}>
              After you accept and use Compete, Flap Fit creates an anonymous online
              profile. Its identifier may appear with leaderboard results. Your chosen player name and leaderboard scores may be visible to other
              Flap Fit players. Your camera feed and
              recordings are never uploaded to competition services.
            </Text>

            <Text style={{ color: '#06223D', fontWeight: '900', marginTop: 16 }}>
              Community rules
            </Text>
            <Text style={{ color: '#475569', lineHeight: 20, marginTop: 5 }}>
              Do not use player names or competition features for sexual or obscene content, hate or
              discrimination, threats, harassment, bullying, impersonation, fraud, spam, unlawful
              content, cheating, score manipulation, or attempts to disrupt the service.
            </Text>

            <Text style={{ color: '#06223D', fontWeight: '900', marginTop: 16 }}>
              Moderation and control
            </Text>
            <Text style={{ color: '#475569', lineHeight: 20, marginTop: 5 }}>
              You can report or block other players from clearly labeled controls beside public
              leaderboard results. Flap Fit may filter, hide,
              remove, or restrict content or accounts that break these rules. You can permanently
              delete your online profile from the Info tab.
            </Text>

            <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 16 }}>
              {onAccept ? 'By choosing I Agree, you accept these rules and the Flap Fit Terms of Use. ' : ''}
              You can review the Terms of Use at any time in the Info tab.
            </Text>

            {RELEASE_LINKS.termsUrl || RELEASE_LINKS.privacyUrl ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                {RELEASE_LINKS.termsUrl ? (
                  <TouchableOpacity
                    accessibilityRole="link"
                    accessibilityLabel="Open the full Flap Fit Terms of Use"
                    onPress={() =>
                      void Linking.openURL(RELEASE_LINKS.termsUrl).catch(() =>
                        Alert.alert('Could not open Terms', 'Please try again from the Info tab.')
                      )
                    }
                    style={{ paddingVertical: 6, paddingRight: 8 }}
                  >
                    <Text style={{ color: '#06223D', fontWeight: '900' }}>Full Terms</Text>
                  </TouchableOpacity>
                ) : null}
                {RELEASE_LINKS.privacyUrl ? (
                  <TouchableOpacity
                    accessibilityRole="link"
                    accessibilityLabel="Open the Flap Fit Privacy Policy"
                    onPress={() =>
                      void Linking.openURL(RELEASE_LINKS.privacyUrl).catch(() =>
                        Alert.alert(
                          'Could not open Privacy Policy',
                          'Please try again from the Info tab.'
                        )
                      )
                    }
                    style={{ paddingVertical: 6, paddingRight: 8 }}
                  >
                    <Text style={{ color: '#06223D', fontWeight: '900' }}>Privacy Policy</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              style={{
                flex: 1,
                alignItems: 'center',
                borderRadius: 12,
                paddingVertical: 12,
                backgroundColor: '#E2E8F0',
              }}
            >
              <Text style={{ color: '#334155', fontWeight: '800' }}>{onAccept ? 'Not now' : 'Done'}</Text>
            </TouchableOpacity>
            {onAccept ? <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="I agree to the online competition terms"
              onPress={onAccept}
              style={{
                flex: 1,
                alignItems: 'center',
                borderRadius: 12,
                paddingVertical: 12,
                backgroundColor: '#06223D',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>I Agree</Text>
            </TouchableOpacity> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
