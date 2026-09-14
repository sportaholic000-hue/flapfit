import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Camera, ChevronRight, Move, Ruler, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BirdAvatar from '@/components/BirdAvatar';
import { BIRDS, getBird } from '@/utils/game/birds';

import { useGameStore } from '@/utils/game/store';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const birdId = useGameStore((s) => s.birdId);
  const setBird = useGameStore((s) => s.setBird);
  const setOnboarded = useGameStore((s) => s.setOnboarded);

  const skin = getBird(birdId);

  const finish = () => {
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
        Do exercises to fly a bird through pipes.{'\n'}Your body is the controller.{'\n\n'}
        Choose your weapon:{'\n'}
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
          🐣 Your bird is a Hatchling — tracked training time grows it into a Legend
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
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}
    >
      <Text style={{ fontSize: 28, color: '#FFFFFF', textAlign: 'center', fontWeight: '900' }}>
        SET THE STAGE
      </Text>
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 20,
          padding: 20,
          gap: 16,
          width: '100%',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Smartphone size={26} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#1F2937', fontWeight: '800', fontSize: 14, marginBottom: 4 }}>
              Push-ups
            </Text>
            <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13 }}>
              Place phone on the floor, propped facing you, 1–1.5m away.
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Ruler size={26} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#1F2937', fontWeight: '800', fontSize: 14, marginBottom: 4 }}>
              Squats
            </Text>
            <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13 }}>
              Place phone on the floor or a chair, propped facing you, 1.5–2m away.
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Move size={26} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#1F2937', fontWeight: '800', fontSize: 14, marginBottom: 4 }}>
              Pull-ups / Bicep Curls{'\n'}Lateral Raises / Shoulder Press
            </Text>
            <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13 }}>
              Place phone on a chair or higher, facing you with the full movement visible.
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Move size={26} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13 }}>
              Good lighting = better tracking. Face the camera and keep your full range of motion
              visible.
            </Text>
          </View>
        </View>
      </View>
    </View>,

    // Step 3: Camera calibration
    <View
      key="calibration"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}
    >
      <Text style={{ fontSize: 28, color: '#FFFFFF', textAlign: 'center', fontWeight: '900' }}>
        QUICK CALIBRATION
      </Text>
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 20,
          padding: 20,
          width: '100%',
          gap: 10,
        }}
      >
        <Text style={{ color: '#1F2937', fontWeight: '700', fontSize: 15 }}>
          Before each session the app guides you through 2 steps:
        </Text>
        <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>
          1. Hold the TOP position of your exercise until the ring fills.
        </Text>
        <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>
          2. Hold the BOTTOM position until the ring fills.
        </Text>
        <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>
          3. 3-2-1… GO! The bird follows your movement in real time.
        </Text>
        <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 6 }}>
          Normal Play processes camera images only on your device. Record &amp; Play creates a
          temporary video that you decide whether and where to share.
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
        }}
      >
        <Camera size={20} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16 }}>
          Continue with camera tracking
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
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                paddingVertical: 12,
                paddingHorizontal: 22,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontWeight: '900', color: '#0F172A' }}>Next</Text>
              <ChevronRight size={18} color="#0F172A" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
