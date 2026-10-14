import { Play, Video } from 'lucide-react-native';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GameStartOptions({ visible, title, onClose, onPlay }: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onPlay: (record: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close game start options"
          onPress={onClose}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.58)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: '#06223D',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 22,
              paddingHorizontal: 20,
              paddingBottom: Math.max(insets.bottom, 20),
              gap: 14,
            }}
          >
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: '900',
                  fontSize: 20,
                  textAlign: 'center',
                }}
              >
                {title}
              </Text>
              <Text style={{ color: '#4AABDE', fontSize: 13, fontWeight: '700' }}>
                Live Camera Background
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Play with live camera"
                onPress={() => onPlay(false)}
                style={{
                  flex: 1,
                  minHeight: 72,
                  borderRadius: 20,
                  backgroundColor: '#F59E0B',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '900',
                    fontSize: 17,
                    textAlign: 'center',
                  }}
                >
                  PLAY
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Record and play with live camera"
                accessibilityHint="Records this game for sharing"
                onPress={() => onPlay(true)}
                style={{
                  flex: 1,
                  minHeight: 72,
                  borderRadius: 20,
                  backgroundColor: '#DC2626',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Video size={22} color="#FFFFFF" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '900',
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                >
                  RECORD{`\n`}&amp; PLAY
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onClose}
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#4AABDE', fontWeight: '800' }}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
  );
}
