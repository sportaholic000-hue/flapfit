import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Page not found', headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>That page flew away</Text>
          <Text style={styles.message}>Return to Flap Fit and keep your workout going.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Return to Flap Fit"
            onPress={() => router.replace('/')}
            style={styles.button}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Back to Flap Fit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F9FF' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    color: '#06223D',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 22,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
