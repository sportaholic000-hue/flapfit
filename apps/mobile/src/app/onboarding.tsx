import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Camera, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import BirdAvatar from '@/components/BirdAvatar';
import { BIRD_STAGE_COUNT, getBirdStageArt } from '@/utils/game/birdStageArt';
import { BIRDS, getBird } from '@/utils/game/birds';

import { useGameStore } from '@/utils/game/store';

const CLOUD_PATH =
  'M22 69C10 69 2 61 2 50C2 40 9 32 19 30C21 15 33 5 48 5C59 5 69 11 74 20C79 15 86 12 94 12C108 12 119 23 119 37C122 34 127 32 133 32C144 32 152 40 152 51C152 62 143 69 132 69H22Z';

function Cloud({
  top,
  left,
  scale = 1,
  opacity = 0.88,
}: {
  top: number;
  left: number;
  scale?: number;
  opacity?: number;
}) {
  return (
    <Svg
      pointerEvents="none"
      width={154 * scale}
      height={74 * scale}
      viewBox="0 0 154 74"
      style={{ position: 'absolute', top, left, opacity }}
    >
      <Defs>
        <SvgLinearGradient id="onboardingCloudFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.72" stopColor="#F8FCFF" />
          <Stop offset="1" stopColor="#DCEFF8" />
        </SvgLinearGradient>
      </Defs>
      <Path d={CLOUD_PATH} fill="rgba(15, 23, 42, 0.10)" transform="translate(0 3)" />
      <Path d={CLOUD_PATH} fill="url(#onboardingCloudFill)" />
      <Path
        d="M18 57C43 63 113 63 138 56"
        fill="none"
        stroke="rgba(74, 171, 222, 0.16)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PipeDecoration({
  direction,
  height,
  top,
  bottom,
  left,
  right,
}: {
  direction: 'up' | 'down';
  height: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}) {
  const capPosition = direction === 'down' ? { bottom: 0 } : { top: 0 };

  return (
    <View
      style={{
        position: 'absolute',
        top,
        bottom,
        left,
        right,
        width: 54,
        height,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: direction === 'down' ? 0 : 14,
          bottom: direction === 'up' ? 0 : 14,
          left: 8,
          width: 38,
          backgroundColor: '#22C55E',
          borderColor: '#166534',
          borderWidth: 3,
          borderRadius: 5,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 3,
            bottom: 3,
            left: 5,
            width: 7,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.28)',
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          ...capPosition,
          left: 0,
          width: 54,
          height: 20,
          backgroundColor: '#16A34A',
          borderColor: '#166534',
          borderWidth: 3,
          borderRadius: 6,
        }}
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const pipeHorizontalInset = Math.max(14, Math.min(110, (width - 560) / 2));
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [step, setStep] = useState(0);
  const birdId = useGameStore((s) => s.birdId);
  const setBird = useGameStore((s) => s.setBird);
  const setOnboarded = useGameStore((s) => s.setOnboarded);

  const skin = getBird(birdId);

  const finish = () => {
    if (preview === '1') {
      router.back();
      return;
    }
    setOnboarded();
    router.replace('/');
  };

  const steps = [
    // Step 0: Welcome — hero buff bird image
    <View
      key="welcome"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}
    >
      <Image
        source={require('../../assets/images/flapfit-splash-logo.png')}
        style={{ width: '100%', height: 230 }}
        contentFit="contain"
        transition={300}
      />
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 16,
          textAlign: 'center',
          fontWeight: '600',
          lineHeight: 26,
        }}
      >
        Do exercises and fly a bird through obstacles.{'\n'}Your body is the controller.{'\n\n'}
        <Text style={{ color: '#0F172A', fontWeight: '800' }}>Choose your workout:</Text>
        {'\n'}
        <Text style={{ fontWeight: '900' }}>
          Push-ups · Squats · Pull-ups{'\n'}Lateral Raise · Bicep Curls · Shoulder Press
        </Text>
      </Text>
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
          🐣 Your bird begins as a hatchling. Tracked training time grows it into a Legend.
        </Text>
      </View>
    </View>,

    // Step 1: Pick a bird
    <View key="bird" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 28, color: '#FFFFFF', textAlign: 'center', fontWeight: '900' }}>
        PICK YOUR BIRD
      </Text>
      <BirdAvatar skin={skin} size={110} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
        {BIRDS.map((b) => {
          const selected = b.id === birdId;
          return (
            <TouchableOpacity
              key={b.id}
              onPress={() => setBird(b.id)}
              style={{
                alignItems: 'center',
                backgroundColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                borderRadius: 16,
                padding: 10,
                borderWidth: 2,
                borderColor: selected ? '#F59E0B' : 'transparent',
              }}
            >
              <BirdAvatar skin={b} size={48} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginTop: 2 }}>
                {b.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>,

    // Step 2: Phone placement
    <View
      key="placement"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}
    >
      <Image
        accessible
        accessibilityLabel={`${skin.name} in Legend form`}
        accessibilityRole="image"
        source={getBirdStageArt(skin.id, BIRD_STAGE_COUNT - 1)}
        style={{ width: 118, height: 118 }}
        contentFit="contain"
        transition={150}
      />
      <Text style={{ fontSize: 28, color: '#0F172A', textAlign: 'center', fontWeight: '900' }}>
        SET THE STAGE
      </Text>
      <View style={{ width: 72, height: 4, borderRadius: 2, backgroundColor: '#F59E0B' }} />
      <View
        style={{
          gap: 12,
          width: '100%',
          maxWidth: 560,
          alignSelf: 'center',
          paddingHorizontal: 8,
        }}
      >
        <View style={{ gap: 3 }}>
          <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 14, textAlign: 'center' }}>
            Push-ups
          </Text>
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: 13,
              lineHeight: 18,
              textAlign: 'center',
            }}
          >
            Place phone on the floor, propped facing you, 3 ft away.
          </Text>
        </View>
        <View style={{ gap: 3 }}>
          <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 14, textAlign: 'center' }}>
            Squats
          </Text>
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: 13,
              lineHeight: 18,
              textAlign: 'center',
            }}
          >
            Place phone on the floor or a chair, propped facing you, 3–6 ft away.
          </Text>
        </View>
        <View style={{ gap: 3 }}>
          <Text
            style={{
              color: '#0F172A',
              fontWeight: '900',
              fontSize: 14,
              lineHeight: 18,
              textAlign: 'center',
            }}
          >
            Pull-ups / Bicep Curls{'\n'}Lateral Raises / Shoulder Press
          </Text>
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: 13,
              lineHeight: 18,
              textAlign: 'center',
            }}
          >
            Place phone on a chair or higher, facing you with the full movement visible.
            Bicep curls: 3–6 ft away.
            Pull-ups, lateral raises, shoulder press: 4–6 ft away.
          </Text>
        </View>
        <View>
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: 13,
              lineHeight: 18,
              textAlign: 'center',
            }}
          >
            Good lighting = better tracking. Face the camera and keep your full range of motion
            visible.
          </Text>
        </View>
      </View>
    </View>,

    // Step 3: Camera calibration
    <View
      key="calibration"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        position: 'relative',
      }}
    >
      <Text
        style={{
          color: '#0F172A',
          fontSize: 28,
          textAlign: 'center',
          fontWeight: '900',
          zIndex: 1,
        }}
      >
        SIMPLE CALIBRATION
      </Text>
      <View
        style={{ width: 72, height: 4, borderRadius: 2, backgroundColor: '#F59E0B', zIndex: 1 }}
      />
      <View style={{ width: '100%', gap: 12, paddingHorizontal: 22, zIndex: 1 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15, lineHeight: 21 }}>
          First, you have 2 seconds to read the screen and get into position. Then the app guides
          you through 2 calibration steps:
        </Text>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14, lineHeight: 20 }}>
          <Text style={{ color: '#0F172A', fontWeight: '900' }}>1.</Text> Hold the TOP position of
          your exercise until the bar fills.
        </Text>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14, lineHeight: 20 }}>
          <Text style={{ color: '#0F172A', fontWeight: '900' }}>2.</Text> Hold the BOTTOM position
          until the bar fills.
        </Text>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14, lineHeight: 20 }}>
          <Text style={{ color: '#0F172A', fontWeight: '900' }}>3.</Text> 3-2-1… GO! The bird
          follows your movement in real time.
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.92)',
            fontSize: 12,
            lineHeight: 17,
            fontWeight: '600',
          }}
        >
          Normal Play processes camera images only on your device. Record &amp; Play can include
          your microphone audio if you allow it and creates a temporary video that you decide
          whether and where to share.
        </Text>
      </View>
      <TouchableOpacity
        onPress={finish}
        style={{
          backgroundColor: '#F59E0B',
          borderRadius: 18,
          paddingVertical: 16,
          alignItems: 'center',
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          zIndex: 1,
        }}
      >
        <Camera size={20} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16 }}>
          {preview === '1' ? 'Return to Info' : "I'm ready to play!"}
        </Text>
      </TouchableOpacity>
    </View>,
  ];

  const isLast = step === steps.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#3BAADB' }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#3BAADB', '#7DD6F7', '#C9F0FF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {step > 0 ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
        >
          {step === 1 ? (
            <>
              <Cloud top={56} left={-28} scale={1.05} opacity={0.55} />
              <Cloud top={132} left={width - 128} scale={0.76} opacity={0.42} />
              <Cloud top={276} left={-38} scale={0.72} opacity={0.36} />
              <Cloud top={410} left={width - 134} scale={0.92} opacity={0.4} />
              <Cloud top={570} left={12} scale={0.78} opacity={0.34} />
              <Cloud top={height - 188} left={width / 2 - 58} scale={0.64} opacity={0.48} />
            </>
          ) : (
            <>
              <Cloud top={72} left={-92} scale={0.9} opacity={0.38} />
              <Cloud top={126} left={width - 54} scale={0.72} opacity={0.32} />
              <Cloud top={height - 145} left={-32} scale={0.7} opacity={0.44} />
              <Cloud top={height - 112} left={width - 86} scale={0.82} opacity={0.4} />
              {step === 2 ? (
                <>
                  <Cloud top={insets.top + 18} left={width / 2 - 60} scale={0.78} opacity={0.46} />
                  <Cloud
                    top={height - insets.bottom - 190}
                    left={Math.max(22, width * 0.2)}
                    scale={0.66}
                    opacity={0.4}
                  />
                </>
              ) : (
                <>
                  <Cloud
                    top={insets.top + 38}
                    left={Math.max(28, width * 0.14)}
                    scale={0.62}
                    opacity={0.4}
                  />
                  <Cloud
                    top={height - insets.bottom - 104}
                    left={width - 142}
                    scale={0.73}
                    opacity={0.48}
                  />
                  <Cloud
                    top={insets.top + 8}
                    left={Math.max(24, width * 0.58)}
                    scale={0.56}
                    opacity={0.42}
                  />
                  <Cloud
                    top={height - insets.bottom - 170}
                    left={Math.max(20, width * 0.18)}
                    scale={0.62}
                    opacity={0.44}
                  />
                </>
              )}
            </>
          )}
        </View>
      ) : null}
      {step === 3 ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }}
        >
          <PipeDecoration direction="down" height={116} top={0} left={pipeHorizontalInset} />
          <PipeDecoration direction="down" height={158} top={0} right={pipeHorizontalInset} />
          <PipeDecoration direction="up" height={142} bottom={0} left={pipeHorizontalInset} />
          <PipeDecoration direction="up" height={102} bottom={0} right={pipeHorizontalInset} />
        </View>
      ) : null}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
      >
        {steps[step]}

        {/* Progress dots + next */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {steps.map((_, i) => (
              <View
                key={`dot-${String(i)}`}
                style={{
                  width: i === step ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === step ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </View>
          {!isLast ? (
            <TouchableOpacity
              onPress={() => setStep(step + 1)}
              style={{
                backgroundColor: '#F59E0B',
                borderRadius: 18,
                paddingVertical: 12,
                paddingHorizontal: 22,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontWeight: '900', color: '#FFFFFF' }}>Next</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
