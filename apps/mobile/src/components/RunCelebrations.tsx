import { LinearGradient } from 'expo-linear-gradient';
import { Share2, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BirdAvatar from './BirdAvatar';
import type { BirdSkin } from '@/utils/game/birds';
import type { BirdEvolution } from '@/utils/game/gameHtml';
import { EVO_NAMES } from '@/utils/game/store';

const COLORS = ['#F59E0B', '#FDE047', '#4ADE80', '#38BDF8', '#A78BFA', '#FB7185'];
const GOLD = ['#FDE68A', '#FBBF24', '#FFF7D6', '#D97706'];
const PIECES = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${4 + ((index * 37) % 92)}%` as `${number}%`,
  size: 6 + (index % 3) * 2,
  travel: 360 + (index % 5) * 34,
  drift: (index % 2 === 0 ? 1 : -1) * (12 + (index % 4) * 7),
  rotation: index % 2 === 0 ? '540deg' : '-540deg',
}));

function formatTrackedTime(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainder = rounded % 60;
  if (hours > 0) return hours + 'h ' + minutes + 'm';
  if (minutes > 0) return minutes + 'm ' + remainder + 's';
  return remainder + 's';
}

// Shared with evolution: the same native-driven entrance, spring and confetti.
// Mounted only after game-over, never in the camera/tracking loop.
function CelebrationFrame({
  championship = false,
  children,
}: {
  championship?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.55)).current;
  const confetti = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 74, useNativeDriver: true }),
      Animated.timing(confetti, {
        toValue: 1,
        duration: championship ? 3000 : 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [championship, confetti, opacity, scale]);
  return (
    <View
      accessibilityViewIsModal
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        backgroundColor: '#06223D',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
      }}
    >
      {championship ? (
        <LinearGradient
          colors={['#06223D', '#06223D', '#06223D']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {PIECES.slice(0, championship ? 34 : 22).map((piece) => (
          <Animated.View
            key={piece.id}
            style={{
              position: 'absolute',
              top: -20,
              left: piece.left,
              width: piece.size,
              height: piece.size * 1.7,
              borderRadius: 2,
              backgroundColor: (championship ? GOLD : COLORS)[
                piece.id % (championship ? GOLD.length : COLORS.length)
              ],
              opacity: confetti.interpolate({
                inputRange: [0, 0.08, 0.82, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateY: confetti.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, championship ? height + piece.travel / 3 : piece.travel],
                  }),
                },
                {
                  translateX: confetti.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, piece.drift, -piece.drift * 0.4],
                  }),
                },
                {
                  rotate: confetti.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', piece.rotation],
                  }),
                },
              ],
            }}
          />
        ))}
      </View>
      <ScrollView
        style={{ width: '100%', maxWidth: championship ? 420 : 390, flexGrow: 0 }}
        contentContainerStyle={{ alignItems: 'center', paddingVertical: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ width: '100%', alignItems: 'center', opacity, transform: [{ scale }] }}
        >
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export function ChampionshipCeremony({
  onContinue,
  continueLabel = 'Continue to results',
}: {
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <CelebrationFrame championship>
      <Text
        style={{
          color: '#FCD34D',
          fontWeight: '800',
          fontSize: 11,
          letterSpacing: 3,
          textAlign: 'center',
        }}
      >
        THE FINAL ASCENT · COMPLETE
      </Text>
      <View
        style={{
          width: 150,
          height: 150,
          marginTop: 18,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 75,
          borderWidth: 1,
          borderColor: 'rgba(252,211,77,0.35)',
          backgroundColor: 'rgba(245,158,11,0.08)',
        }}
      >
        <View
          style={{
            width: 124,
            height: 124,
            borderRadius: 62,
            borderWidth: 2,
            borderColor: '#FCD34D',
            backgroundColor: '#06223D',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 66 }}>🏆</Text>
        </View>
        <View
          style={{
            position: 'absolute',
            bottom: -8,
            borderRadius: 20,
            backgroundColor: '#FCD34D',
            paddingHorizontal: 18,
            paddingVertical: 5,
          }}
        >
          <Text style={{ color: '#422006', fontSize: 13, fontWeight: '900', letterSpacing: 1 }}>
            15 / 15
          </Text>
        </View>
      </View>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 32,
          lineHeight: 37,
          fontWeight: '900',
          color: '#FFF7D6',
          textAlign: 'center',
          letterSpacing: 1,
          marginTop: 27,
        }}
      >
        YOU CONQUERED FLAP FIT
      </Text>
      <Text
        style={{
          color: '#FCD34D',
          fontSize: 17,
          fontWeight: '700',
          textAlign: 'center',
          marginTop: 12,
        }}
      >
        Not many have flown this far.
      </Text>
      <Text
        style={{
          color: '#CBD5E1',
          fontSize: 15,
          lineHeight: 23,
          textAlign: 'center',
          marginTop: 14,
        }}
      >
        Fifteen levels. Every obstacle. You kept going until there was nothing left to beat.
      </Text>
      <Text
        style={{
          color: '#F8FAFC',
          fontSize: 15,
          lineHeight: 23,
          textAlign: 'center',
          fontWeight: '700',
          marginTop: 12,
        }}
      >
        You’ve earned your place among the champions.
      </Text>
      <View
        style={{
          width: '100%',
          borderRadius: 16,
          padding: 14,
          marginTop: 18,
          backgroundColor: 'rgba(252,211,77,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(252,211,77,0.3)',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#FDE68A', fontWeight: '900', fontSize: 15 }}>FLAP FIT CHAMPION</Text>
        <Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 4 }}>
          Your permanent badge is waiting in Stats.
        </Text>
      </View>
      <Text
        style={{
          color: '#F8FAFC',
          fontSize: 15,
          lineHeight: 22,
          textAlign: 'center',
          marginTop: 18,
        }}
      >
        Now give the leaderboard a name to remember, champ!
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onContinue}
        style={{
          width: '100%',
          backgroundColor: '#FCD34D',
          borderRadius: 16,
          paddingVertical: 16,
          alignItems: 'center',
          marginTop: 20,
        }}
      >
        <Text style={{ color: '#422006', fontWeight: '900', fontSize: 16 }}>{continueLabel}</Text>
      </TouchableOpacity>
    </CelebrationFrame>
  );
}

export type RunCelebrationsProps = {
  evolvedTo: number | null;
  championship: boolean;
  skin: BirdSkin;
  birdEvo: BirdEvolution;
  totalTutSeconds: number;
  runTutSeconds: number;
  onShareEvolution: () => void;
  onComplete: () => void;
};

export function RunCelebrations(props: RunCelebrationsProps) {
  const {
    evolvedTo,
    championship,
    skin,
    birdEvo,
    totalTutSeconds,
    runTutSeconds,
    onShareEvolution,
    onComplete,
  } = props;
  const [evolutionFinished, setEvolutionFinished] = useState(false);
  const { height } = useWindowDimensions();
  const birdSize = Math.max(150, Math.min(210, Math.round(height * 0.24)));
  if (evolvedTo !== null && !evolutionFinished) {
    return (
      <CelebrationFrame key="evolution">
        <Sparkles size={34} color="#FDE047" />
        <Text
          style={{
            color: '#FDE047',
            fontSize: 30,
            fontWeight: '900',
            letterSpacing: 1.5,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          EVOLUTION!
        </Text>
        <View
          style={{
            backgroundColor: '#F59E0B',
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 7,
            marginTop: 10,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>
            STAGE {evolvedTo + 1}/{EVO_NAMES.length}
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <BirdAvatar skin={skin} size={birdSize} evo={{ ...birdEvo, stage: evolvedTo }} />
        </View>
        <Text
          style={{
            color: '#FFFFFF',
            fontWeight: '900',
            fontSize: 24,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          {EVO_NAMES[evolvedTo]}
        </Text>
        <Text style={{ color: '#CBD5E1', fontSize: 14, marginTop: 3, textAlign: 'center' }}>
          {skin.name} grew stronger from your training.
        </Text>
        <View
          style={{
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 18,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            padding: 14,
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 24 }}>
            {formatTrackedTime(totalTutSeconds)}
          </Text>
          <Text
            style={{
              color: '#4AABDE',
              fontWeight: '800',
              fontSize: 11,
              letterSpacing: 0.8,
              marginTop: 2,
            }}
          >
            LIFETIME TRACKED TRAINING
          </Text>
          <Text style={{ color: '#CBD5E1', fontSize: 11, marginTop: 4 }}>
            +{formatTrackedTime(runTutSeconds)} this run
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Share my Flap Fit evolution"
          onPress={onShareEvolution}
          style={{
            width: '100%',
            backgroundColor: '#F59E0B',
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginTop: 16,
          }}
        >
          <Share2 size={19} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>
            Share my evolution
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => (championship ? setEvolutionFinished(true) : onComplete())}
          style={{ paddingVertical: 13, paddingHorizontal: 24, marginTop: 4 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
            {championship ? 'Continue to championship' : 'Continue to results'}
          </Text>
        </TouchableOpacity>
      </CelebrationFrame>
    );
  }
  return championship ? <ChampionshipCeremony key="championship" onContinue={onComplete} /> : null;
}
