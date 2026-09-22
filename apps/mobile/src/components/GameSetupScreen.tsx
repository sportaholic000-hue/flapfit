import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

type Props = {
  busy: boolean;
  error: string | null;
  onSetup: () => void;
  onHome: () => void;
  onInfo: () => void;
};

const CLOUD = 'M22 69C10 69 2 61 2 50C2 40 9 32 19 30C21 15 33 5 48 5C59 5 69 11 74 20C79 15 86 12 94 12C108 12 119 23 119 37C122 34 127 32 133 32C144 32 152 40 152 51C152 62 143 69 132 69H22Z';

/** Presentation only; the existing game-entry gate owns all setup decisions. */
export function GameSetupScreen({ busy, error, onSetup, onHome, onInfo }: Props) {
  const insets = useSafeAreaInsets();
  return <LinearGradient colors={['#D3F1FF', '#EEFAFF', '#DCEDF9']} style={{ flex: 1 }}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Svg width={160} height={78} viewBox="0 0 154 74" style={{ position: 'absolute', top: '18%', left: '4%' }}><Path d={CLOUD} fill="#FFFFFFBB" /></Svg>
      <Svg width={190} height={92} viewBox="0 0 154 74" style={{ position: 'absolute', top: '58%', right: '3%' }}><Path d={CLOUD} fill="#FFFFFFAA" /></Svg>
      <Svg width={110} height={54} viewBox="0 0 154 74" style={{ position: 'absolute', bottom: '4%', left: '8%' }}><Path d={CLOUD} fill="#FFFFFF99" /></Svg>
    </View>
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }}>
      <Text style={{ color: '#15597F', fontSize: 19, fontWeight: '900', letterSpacing: -0.6 }}>Flap Fit</Text>
      <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
        <View style={{ width: '100%', maxWidth: 424, alignItems: 'center', backgroundColor: '#FFFFFFF2', borderColor: '#FFFFFF', borderWidth: 1, borderRadius: 30, borderCurve: 'continuous', paddingHorizontal: 24, paddingBottom: 24, boxShadow: '0 14px 36px rgba(27, 86, 124, 0.05)' }}>
          <View style={{ width: '100%', height: 258, alignItems: 'center', justifyContent: 'center' }}>
            <View accessible={false} style={{ position: 'absolute', width: 216, height: 216, borderRadius: 108, backgroundColor: '#EAF8FF', borderWidth: 10, borderColor: '#F5FCFF' }} />
            <Image source={require('../../assets/images/evolution/sky/stage-10.png')} accessibilityLabel="Sky Legend bird" accessible contentFit="contain" transition={0} style={{ width: '100%', maxWidth: 262, aspectRatio: 1 }} />
          </View>
          <Text accessibilityRole="header" style={{ color: '#0F172A', fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -1, textAlign: 'center', marginBottom: 14 }}>Almost ready to fly</Text>
          <Text style={{ maxWidth: 315, color: '#536578', fontSize: 16, lineHeight: 25, textAlign: 'center', marginBottom: 26 }}>Let’s finish your setup so you’re ready for your next run.</Text>
          {error ? <Text accessibilityRole="alert" style={{ color: '#9F1239', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 18 }}>{error}</Text> : null}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Finish setup" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onSetup} style={{ width: '100%', minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#036CAA', borderRadius: 15, boxShadow: '0 4px 0 #03578B', opacity: busy ? 0.7 : 1 }}>
            {busy ? <ActivityIndicator color="#FFFFFF" accessibilityLabel="Opening setup" /> : <><Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 17 }}>Finish setup</Text><Text accessible={false} importantForAccessibility="no" style={{ color: '#FFFFFF', fontSize: 23, lineHeight: 24 }}>→</Text></>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={onHome} style={{ minHeight: 48, width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: 12, padding: 12 }}>
            <Text style={{ color: '#3B5369', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity accessibilityRole="button" onPress={onInfo} style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' }}>
        <Text style={{ color: '#536F86', fontSize: 13, textDecorationLine: 'underline', textAlign: 'center' }}>Review in Info</Text>
      </TouchableOpacity>
    </ScrollView>
  </LinearGradient>;
}
