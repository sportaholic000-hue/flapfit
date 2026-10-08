import { Image } from 'expo-image';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Camera,
  CheckCircle2,
  Flame,
  Infinity as InfinityIcon,
  Lock,
  Play,
  Sun,
  Video,
} from 'lucide-react-native';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getLobbyPrivacyKey, prepareMonetization } from '@/services/monetization';
import { subscribeProcessingAccess } from '@/services/privacy/processingAccess';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import BirdAvatar from '@/components/BirdAvatar';
import { BIRDS, getBird } from '@/utils/game/birds';
import { EXERCISE_IMAGES } from '@/utils/game/exerciseImages';
import { getDailyChallenge, LEVELS } from '@/utils/game/levels';
import {
  computeBirdMorphology,
  computeEvolutionStage,
  computeTutStreak,
  dayKey,
  EVO_NAMES,
  EVO_THRESHOLDS,
  isEndlessUnlocked,
  retryPersistedStoreHydration,
  useGameStore,
} from '@/utils/game/store';

// Sky blue that matches the bird illustration background
const SKY_BLUE = '#4AABDE';
const NAVY = '#0F172A';
const ACCENT_BLUE = '#0284C7';

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
        <SvgLinearGradient id="cloudFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.72" stopColor="#F8FCFF" />
          <Stop offset="1" stopColor="#DCEFF8" />
        </SvgLinearGradient>
      </Defs>
      <Path d={CLOUD_PATH} fill="rgba(15, 23, 42, 0.10)" transform="translate(0 3)" />
      <Path d={CLOUD_PATH} fill="url(#cloudFill)" />
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [backgroundMode, setBackgroundMode] = useState<'sky' | 'camera'>('sky');
  const [hydrationSlow, setHydrationSlow] = useState(false);

  const hydrated = useGameStore((s) => s.hydrated);
  const hydrationError = useGameStore((s) => s.hydrationError);
  const hasOnboarded = useGameStore((s) => s.hasOnboarded);
  const lobbyPrivacyKey = useSyncExternalStore(subscribeProcessingAccess, getLobbyPrivacyKey, () => 'pending:false:false:child:true:false');
  useFocusEffect(useCallback(() => {
    let focused = true;
    const dutyResolved = !lobbyPrivacyKey.startsWith('pending:') && !lobbyPrivacyKey.startsWith('error:');
    if (hydrated && !hydrationError && hasOnboarded && dutyResolved) {
      // Only an actual Apple obligation may interrupt first play. Optional
      // advertising/reporting setup belongs to a claimed post-game exit.
      void prepareMonetization(() => focused, { requiredOnly: true });
    }
    return () => { focused = false; };
  }, [hydrated, hydrationError, hasOnboarded, lobbyPrivacyKey]));
  const birdId = useGameStore((s) => s.birdId);
  const setBird = useGameStore((s) => s.setBird);
  const unlockedLevel = useGameStore((s) => s.unlockedLevel);

  const dailyCompleted = useGameStore((s) => s.dailyCompleted);
  const endlessBest = useGameStore((s) => s.endlessBest);
  const exerciseMode = useGameStore((s) => s.exerciseMode);
  const setExerciseMode = useGameStore((s) => s.setExerciseMode);
  const totalTutSeconds = useGameStore((s) => s.totalTutSeconds);
  const dailyTut = useGameStore((s) => s.dailyTut);
  const exerciseTut = useGameStore((s) => s.exerciseTut);
  const lastActivityDate = useGameStore((s) => s.lastActivityDate);

  useEffect(() => {
    if (hydrated || hydrationError) {
      setHydrationSlow(false);
      return;
    }
    const timeout = setTimeout(() => setHydrationSlow(true), 8_000);
    return () => clearTimeout(timeout);
  }, [hydrated, hydrationError]);

  if (!hydrated || hydrationError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
          backgroundColor: NAVY,
        }}
      >
        <StatusBar style="light" />
        <Image
          source={require('../../../assets/images/flapfit-splash-logo.png')}
          style={{ width: '92%', maxWidth: 360, aspectRatio: 1.5 }}
          contentFit="contain"
          transition={0}
        />
        {!hydrationError ? (
          <ActivityIndicator color="#FFFFFF" size="large" style={{ marginTop: 14 }} />
        ) : null}
        <Text
          style={{ color: '#FFFFFF', fontWeight: '800', marginTop: 14, textAlign: 'center' }}
        >
          {hydrationError
            ? 'Your saved progress could not be read. It has not been replaced.'
            : 'Loading your bird…'}
        </Text>
        {hydrationSlow || hydrationError ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Try loading saved progress again"
            onPress={() => {
              setHydrationSlow(false);
              void retryPersistedStoreHydration().catch((error) =>
                console.error('Flap Fit saved-progress retry failed', error)
              );
            }}
            style={{
              marginTop: 18,
              backgroundColor: '#0284C7',
              borderRadius: 12,
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Try loading again</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
  if (!hasOnboarded) return <Redirect href={'/onboarding' as never} />;

  const streak = computeTutStreak(dailyTut);
  const skin = getBird(birdId);
  const today = dayKey();
  const daily = getDailyChallenge(unlockedLevel, today);
  const dailyDone = dailyCompleted.includes(today);
  const endlessOpen = isEndlessUnlocked(unlockedLevel);
  const currentLevel = LEVELS[Math.min(unlockedLevel, LEVELS.length) - 1];

  // Evolution
  const evoStage = computeEvolutionStage(totalTutSeconds, lastActivityDate);
  const morphology = computeBirdMorphology(exerciseTut);
  const birdEvo = { stage: evoStage, ...morphology };
  const nextThreshold = EVO_THRESHOLDS[Math.min(evoStage + 1, EVO_THRESHOLDS.length - 1)];
  const evoProgress =
    evoStage < EVO_THRESHOLDS.length - 1
      ? Math.min(
          1,
          (totalTutSeconds - EVO_THRESHOLDS[evoStage]) / (nextThreshold - EVO_THRESHOLDS[evoStage])
        )
      : 1;

  // Inactivity warning
  const daysInactive = lastActivityDate
    ? (Date.now() - new Date(lastActivityDate).getTime()) / 86400000
    : 0;
  const showInactivityWarning = daysInactive >= 4 && evoStage > 0;

  const withGameOptions = (params: Record<string, string>, record = false) => ({
    ...params,
    backgroundMode,
    ...(record && backgroundMode === 'camera' ? { record: '1' } : {}),
  });

  const playCurrentLevel = (record = false) =>
    router.push({
      pathname: '/game' as never,
      params: withGameOptions({ mode: 'level', levelId: String(currentLevel.id) }, record),
    });
  const playEndless = (record = false) =>
    router.push({
      pathname: '/game' as never,
      params: withGameOptions({ mode: 'endless' }, record),
    });
  const playDaily = (record = false) =>
    router.push({
      pathname: '/game' as never,
      params: withGameOptions(
        { mode: 'daily', levelId: String(daily.levelId), target: String(daily.target) },
        record
      ),
    });

  // Exercise button with actual bird image (no icon needed anymore)
  const exBtn = (ex: typeof exerciseMode, label: string, sub: string) => {
    const selected = exerciseMode === ex;
    const imageSource = EXERCISE_IMAGES[ex];
    return (
      <TouchableOpacity
        key={ex}
        onPress={() => setExerciseMode(ex)}
        style={{
          width: '47%',
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          backgroundColor: selected ? '#FEF3C7' : '#F3F4F6',
          borderWidth: 2,
          borderColor: selected ? '#F59E0B' : 'transparent',
          minHeight: 198,
        }}
      >
        <Image
          source={imageSource}
          style={{ width: 118, height: 118, borderRadius: 14 }}
          contentFit="contain"
        />
        <Text style={{ fontWeight: '800', fontSize: 11, color: selected ? '#B45309' : '#1F2937' }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: 9,
            color: selected ? '#B45309' : '#9CA3AF',
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {sub}
        </Text>
      </TouchableOpacity>
    );
  };

  const exDescriptions: Record<string, string> = {
    squats:
      'Stand tall = top, deep squat = bottom. Phone on the floor or a chair, 3–6 ft in front.',
    pullups:
      'Eye line at the bar = top, comfortable hang with a slight elbow bend = bottom. Phone on a chair or higher, 4–6 ft in front; keep both hands on the bar.',
    lateralraise:
      'Arms at shoulder height = top, arms at sides = bottom. Phone on a chair or higher, 4–6 ft in front.',
    biceps:
      'Wrists at shoulders = top, arms extended = bottom. Phone on a chair or higher, 3–6 ft in front.',
    shoulderpress:
      'Arms overhead = top, wrists at shoulders = bottom. Phone on a chair or higher, 4–6 ft in front.',
    pushups: 'Arms extended = top, chest to floor = bottom. Phone 3 ft in front on the floor.',
  };

  return (
    <View style={{ flex: 1, backgroundColor: SKY_BLUE }}>
      <StatusBar style="light" />

      {/* ── Clouds layer (absolute, behind scroll) ── */}
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
      >
        <Cloud top={60} left={-20} scale={1.1} opacity={0.7} />
        <Cloud top={110} left={200} scale={0.8} opacity={0.55} />
        <Cloud top={200} left={30} scale={0.7} opacity={0.45} />
        <Cloud top={280} left={220} scale={1.0} opacity={0.5} />
        <Cloud top={370} left={-10} scale={0.9} opacity={0.4} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text
            style={{
              fontFamily: 'LuckiestGuy_400Regular',
              fontSize: 34,
              color: '#FFFFFF',
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 3 },
              textShadowRadius: 4,
            }}
          >
            FLAP FIT
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              gap: 4,
            }}
          >
            <Flame size={18} color="#F97316" fill="#F97316" />
            <Text style={{ fontWeight: '800', color: '#1F2937', fontSize: 16 }}>{streak}</Text>
          </View>
        </View>
        <Text
          style={{
            color: NAVY,
            marginTop: 2,
            fontWeight: '800',
          }}
        >
          Your body is the controller.
        </Text>

        {/* Inactivity warning */}
        {showInactivityWarning && (
          <View
            style={{
              marginTop: 10,
              backgroundColor: '#FEF3C7',
              borderRadius: 14,
              padding: 12,
              borderWidth: 2,
              borderColor: '#F59E0B',
            }}
          >
            <Text style={{ fontWeight: '800', color: '#92400E', fontSize: 13 }}>
              ⚠️ Your bird is getting soft!
            </Text>
            <Text style={{ color: '#92400E', fontSize: 12, marginTop: 2 }}>
              {Math.floor(daysInactive)} days without training — muscles fade without consistency.
              Fly today to keep them!
            </Text>
          </View>
        )}

        {/* Bird showcase with evolution */}
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <BirdAvatar skin={skin} size={144} evo={birdEvo} />
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: 18,
              marginTop: 10,
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 3,
            }}
          >
            {skin.name}
          </Text>
          {/* Evolution stage badge */}
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.92)',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 5,
              marginTop: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13, textAlign: 'center' }}>
              {EVO_NAMES[evoStage]}
            </Text>
            {evoStage < EVO_THRESHOLDS.length - 1 && (
              <Text style={{ color: '#64748B', fontSize: 11, textAlign: 'center' }}>
                {Math.round(evoProgress * 100)}% to {EVO_NAMES[evoStage + 1]}
              </Text>
            )}
          </View>
          {/* TUT progress bar */}
          {evoStage < EVO_THRESHOLDS.length - 1 && (
            <View
              style={{
                width: '80%',
                height: 6,
                backgroundColor: 'rgba(255,255,255,0.4)',
                borderRadius: 3,
                marginTop: 8,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${Math.round(evoProgress * 100)}%`,
                  height: 6,
                  backgroundColor: '#F59E0B',
                  borderRadius: 3,
                }}
              />
            </View>
          )}
        </View>

        {/* Bird picker */}
        <ScrollView
          horizontal
          style={{ flexGrow: 0, marginTop: 14 }}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
          showsHorizontalScrollIndicator={false}
        >
          {BIRDS.map((b) => {
            const selected = b.id === birdId;
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => setBird(b.id)}
                style={{
                  alignItems: 'center',
                  backgroundColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                  borderRadius: 16,
                  padding: 8,
                  borderWidth: 2,
                  borderColor: selected ? '#F59E0B' : 'transparent',
                }}
              >
                <BirdAvatar skin={b} size={44} evo={selected ? birdEvo : undefined} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginTop: 2 }}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Game background */}
        <View
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.96)',
            gap: 12,
          }}
        >
          <View style={{ gap: 3 }}>
            <Text style={{ fontWeight: '900', color: '#1F2937', fontSize: 16 }}>
              Game Background
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12 }}>
              Choose what appears behind your bird and pipes.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sky Background"
              accessibilityHint="Uses the classic Flap Fit sky"
              accessibilityState={{ selected: backgroundMode === 'sky' }}
              onPress={() => setBackgroundMode('sky')}
              style={{
                flex: 1,
                minHeight: 92,
                padding: 12,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: backgroundMode === 'sky' ? ACCENT_BLUE : '#D1D5DB',
                backgroundColor: backgroundMode === 'sky' ? '#E0F2FE' : '#F8FAFC',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Sun size={23} color={backgroundMode === 'sky' ? ACCENT_BLUE : '#64748B'} />
                {backgroundMode === 'sky' ? (
                  <CheckCircle2 size={19} color={ACCENT_BLUE} fill="#FFFFFF" />
                ) : null}
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ fontWeight: '900', color: '#0F172A', fontSize: 14 }}>
                  Sky Background
                </Text>
                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600' }}>
                  Classic game view
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Live Camera Background"
              accessibilityHint="Shows your front camera behind the game"
              accessibilityState={{ selected: backgroundMode === 'camera' }}
              onPress={() => setBackgroundMode('camera')}
              style={{
                flex: 1,
                minHeight: 92,
                padding: 12,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: backgroundMode === 'camera' ? ACCENT_BLUE : '#D1D5DB',
                backgroundColor: backgroundMode === 'camera' ? '#E0F2FE' : '#F8FAFC',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Camera size={23} color={backgroundMode === 'camera' ? ACCENT_BLUE : '#64748B'} />
                {backgroundMode === 'camera' ? (
                  <CheckCircle2 size={19} color={ACCENT_BLUE} fill="#FFFFFF" />
                ) : null}
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ fontWeight: '900', color: '#0F172A', fontSize: 14 }}>
                  Live Camera
                </Text>
                <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600' }}>
                  You become the backdrop
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current level start */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Play Level ${currentLevel.id}`}
            onPress={() => playCurrentLevel()}
            style={{
              flex: 1,
              minHeight: 72,
              backgroundColor: '#F59E0B',
              borderRadius: 20,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
            <View>
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 18 }}>PLAY</Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '600' }}>
                Level {currentLevel.id} · {currentLevel.name}
              </Text>
            </View>
          </TouchableOpacity>
          {backgroundMode === 'camera' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Record and play Level ${currentLevel.id}`}
              accessibilityHint="Records the live-camera game for sharing"
              onPress={() => playCurrentLevel(true)}
              style={{
                flex: 1,
                minHeight: 72,
                backgroundColor: '#DC2626',
                borderRadius: 20,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 7,
              }}
            >
              <Video size={22} color="#FFFFFF" />
              <View>
                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>RECORD</Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 11 }}>
                  & PLAY
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Exercise Type */}
        <View
          style={{
            marginTop: 12,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: 16,
          }}
        >
          <Text style={{ fontWeight: '800', color: '#1F2937', fontSize: 16, textAlign: 'center' }}>
            Exercise Type
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 10,
              marginTop: 12,
            }}
          >
            {exBtn('pushups', 'Push-ups', 'phone on floor')}
            {exBtn('squats', 'Squats', 'phone on floor or chair')}
            {exBtn('pullups', 'Pull-ups', 'phone on chair or higher')}
            {exBtn('lateralraise', 'Lateral Raise', 'phone on chair or higher')}
            {exBtn('biceps', 'Bicep Curls', 'phone on chair or higher')}
            {exBtn('shoulderpress', 'Shoulder Press', 'phone on chair or higher')}
          </View>
          <Text
            style={{
              color: '#64748B',
              fontSize: 12,
              marginTop: 12,
              textAlign: 'center',
              lineHeight: 17,
            }}
          >
            {exDescriptions[exerciseMode]}
          </Text>
        </View>

        {/* Endless */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={endlessOpen ? 'Play Endless Mode' : 'Endless Mode locked'}
          onPress={endlessOpen ? () => playEndless() : undefined}
          disabled={!endlessOpen}
          style={{
            marginTop: 12,
            backgroundColor: endlessOpen ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
            borderRadius: 20,
            paddingVertical: 14,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {endlessOpen ? (
            <InfinityIcon size={24} color="#1D4ED8" />
          ) : (
            <Lock size={22} color="#6B7280" />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: '#1F2937', fontSize: 15 }}>Endless Mode</Text>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>
              {endlessOpen ? `Best: ${endlessBest} pipes` : 'Clear Level 5 to unlock'}
            </Text>
          </View>
        </TouchableOpacity>
        {backgroundMode === 'camera' && endlessOpen ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Record and play Endless Mode"
            accessibilityHint="Records the live-camera Endless game for sharing"
            onPress={() => playEndless(true)}
            style={{
              marginTop: 8,
              minHeight: 44,
              backgroundColor: '#DC2626',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 7,
            }}
          >
            <Video size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>
              Record & Play Endless
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Daily challenge */}
        <View
          style={{
            marginTop: 12,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: 16,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ fontWeight: '800', color: '#1F2937', fontSize: 15 }}>
              Daily Challenge
            </Text>
            {dailyDone ? <CheckCircle2 size={22} color="#16A34A" /> : null}
          </View>
          <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>
            Pass {daily.target} pipes on Level {daily.levelId} today
          </Text>
          {!dailyDone ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Play today's Daily Challenge"
              onPress={() => playDaily()}
              style={{
                marginTop: 10,
                backgroundColor: '#1D4ED8',
                borderRadius: 14,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Take it on</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: '#16A34A', fontWeight: '700', marginTop: 8, fontSize: 13 }}>
              Done! Come back tomorrow 🔥
            </Text>
          )}
          {!dailyDone && backgroundMode === 'camera' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Record and play today's Daily Challenge"
              accessibilityHint="Records the live-camera Daily Challenge for sharing"
              onPress={() => playDaily(true)}
              style={{
                marginTop: 8,
                minHeight: 42,
                backgroundColor: '#DC2626',
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 7,
              }}
            >
              <Video size={17} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>
                Record & Play Daily
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
