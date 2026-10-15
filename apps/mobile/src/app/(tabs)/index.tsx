import { Image } from 'expo-image';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CheckCircle2,
  Flame,
  Lock,
  Play,
} from 'lucide-react-native';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getLobbyPrivacyKey, prepareMonetization } from '@/services/monetization';
import { subscribeProcessingAccess } from '@/services/privacy/processingAccess';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import BirdAvatar from '@/components/BirdAvatar';
import { GameStartOptions } from '@/components/GameStartOptions';
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
const NAVY = '#06223D';
const SELECTION_ORANGE = '#F59E0B';

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

type PendingHomeGame = {
  title: string;
  params: Record<string, string>;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [backgroundMode, setBackgroundMode] = useState<'sky' | 'camera'>('sky');
  const [pendingGame, setPendingGame] = useState<PendingHomeGame | null>(null);
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

  const launchGame = (game: PendingHomeGame, record = false) => {
    setPendingGame(null);
    router.push({
      pathname: '/game' as never,
      params: withGameOptions(game.params, record),
    });
  };

  const requestGame = (game: PendingHomeGame) => {
    if (backgroundMode === 'camera') setPendingGame(game);
    else launchGame(game);
  };

  const playCurrentLevel = () => requestGame({
    title: `Level ${currentLevel.id} · ${currentLevel.name}`,
    params: { mode: 'level', levelId: String(currentLevel.id) },
  });
  const playEndless = () => {
    if (!endlessOpen) return;
    requestGame({ title: 'Endless Mode', params: { mode: 'endless' } });
  };
  const playDaily = () => {
    if (dailyDone) return;
    requestGame({
      title: 'Daily Challenge',
      params: { mode: 'daily', levelId: String(daily.levelId), target: String(daily.target) },
    });
  };

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
          backgroundColor: '#06223D',
          borderWidth: 2,
          borderColor: selected ? '#F59E0B' : 'transparent',
          minHeight: 198,
        }}
      >
        {selected ? (
          <Svg width={19} height={19} viewBox="0 0 24 24" style={{ position: 'absolute', top: 12, right: 12 }}>
            <Circle cx={12} cy={12} r={10} fill="#4AABDE" stroke="#F59E0B" strokeWidth={2} />
            <Path d="m8 12 3 3 5-6" fill="none" stroke="#06223D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}
        <Image
          source={imageSource}
          style={{ width: 118, height: 118, borderRadius: 14 }}
          contentFit="contain"
        />
        <Text style={{ fontWeight: '800', fontSize: 14, lineHeight: 19, textAlign: 'center', color: '#FFFFFF' }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: 12,
            lineHeight: 17,
            color: '#4AABDE',
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
              flex: 1,
              paddingHorizontal: 64,
              textAlign: 'center',
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
              position: 'absolute',
              right: 0,
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
            color: '#06223D',
            fontSize: 14,
            lineHeight: 20,
            textAlign: 'center',
            marginTop: 2,
            fontWeight: '800',
          }}
        >
          Your body is the controller
        </Text>

        {/* Inactivity warning */}
        {showInactivityWarning && (
          <View
            style={{
              marginTop: 10,
              backgroundColor: SELECTION_ORANGE,
              borderRadius: 14,
              padding: 12,
              borderWidth: 2,
              borderColor: NAVY,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                maxWidth: '100%',
                borderBottomWidth: 2,
                borderBottomColor: NAVY,
                paddingBottom: 5,
              }}
            >
              <Text
                style={{ fontWeight: '800', color: NAVY, fontSize: 14, textAlign: 'center' }}
              >
                ⚠️ YOUR BIRD IS GETTING SOFT!
              </Text>
            </View>
            <Text
              style={{ color: NAVY, fontSize: 13, lineHeight: 18, marginTop: 8, textAlign: 'center' }}
            >
              {Math.floor(daysInactive)} days without training — muscles fade without consistency.
            </Text>
            <View style={{ backgroundColor: NAVY, borderRadius: 6, marginTop: 8, padding: 8 }}>
              <Text
                style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13, textAlign: 'center' }}
              >
                Fly today to keep them!
              </Text>
            </View>
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
            <Text style={{ fontWeight: '800', color: NAVY, fontSize: 13, textAlign: 'center' }}>
              {EVO_NAMES[evoStage]}
            </Text>
            {evoStage < EVO_THRESHOLDS.length - 1 && (
              <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center' }}>
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
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 2 }}>
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
            <Text accessibilityRole="header" style={{ fontWeight: '800', color: '#06223D', fontSize: 16, textAlign: 'center' }}>
              Game Background
            </Text>
            <View
              accessible={false}
              importantForAccessibility="no"
              style={{ alignSelf: 'center', width: 48, height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 6 }}
            />
            <Text style={{ color: '#475569', fontSize: 13, lineHeight: 19, textAlign: 'center' }}>
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
                borderColor: backgroundMode === 'sky' ? SELECTION_ORANGE : '#06223D',
                backgroundColor: '#06223D',
                justifyContent: 'center',
                paddingTop: 30,
              }}
            >
              {backgroundMode === 'sky' ? (
                <Svg width={19} height={19} viewBox="0 0 24 24" style={{ position: 'absolute', top: 10, right: 10 }}>
            <Circle cx={12} cy={12} r={10} fill="#4AABDE" stroke="#F59E0B" strokeWidth={2} />
            <Path d="m8 12 3 3 5-6" fill="none" stroke="#06223D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
              ) : null}
              <View style={{ gap: 2 }}>
                <Text style={{ fontWeight: '900', color: '#FFFFFF', fontSize: 14, textAlign: 'center' }}>
                  Sky Background
                </Text>
                <Text style={{ color: '#4AABDE', fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center' }}>
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
                borderColor: backgroundMode === 'camera' ? SELECTION_ORANGE : '#06223D',
                backgroundColor: '#06223D',
                justifyContent: 'center',
                paddingTop: 30,
              }}
            >
              {backgroundMode === 'camera' ? (
                <Svg width={19} height={19} viewBox="0 0 24 24" style={{ position: 'absolute', top: 10, right: 10 }}>
            <Circle cx={12} cy={12} r={10} fill="#4AABDE" stroke="#F59E0B" strokeWidth={2} />
            <Path d="m8 12 3 3 5-6" fill="none" stroke="#06223D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
              ) : null}
              <View style={{ gap: 2 }}>
                <Text style={{ fontWeight: '900', color: '#FFFFFF', fontSize: 14, textAlign: 'center' }}>
                  Live Camera
                </Text>
                <Text style={{ color: '#4AABDE', fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center' }}>
                  You become the backdrop
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main game choices */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Play Level ${currentLevel.id}`}
            onPress={playCurrentLevel}
            style={{
              flex: 1,
              minHeight: 72,
              backgroundColor: '#F59E0B',
              borderRadius: 20,
              paddingVertical: 12,
              paddingHorizontal: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#06223D', fontWeight: '900', fontSize: 16, lineHeight: 20, textAlign: 'center' }}>
                Level {currentLevel.id}
              </Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#06223D', fontSize: 12, lineHeight: 16, fontWeight: '600', textAlign: 'center' }}>
                {currentLevel.name}
              </Text>
            </View>
            <Play size={36} color="#06223D" fill="#06223D" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={endlessOpen ? 'Play Endless Mode' : 'Endless Mode locked'}
            accessibilityHint={endlessOpen ? undefined : 'Clear Level 5 to unlock Endless Mode'}
            accessibilityState={{ disabled: !endlessOpen }}
            onPress={endlessOpen ? playEndless : undefined}
            disabled={!endlessOpen}
            style={{
              flex: 1,
              minHeight: 72,
              backgroundColor: endlessOpen ? '#06223D' : '#475569',
              borderRadius: 20,
              paddingVertical: 12,
              paddingHorizontal: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: endlessOpen ? '#F59E0B' : '#FFFFFF', fontWeight: '900', fontSize: 16, lineHeight: 20, textAlign: 'center' }}>
                Endless Mode
              </Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: endlessOpen ? '#F59E0B' : 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 16, fontWeight: '600', textAlign: 'center' }}>
                {endlessOpen ? `Best: ${endlessBest} pipes` : 'Clear Level 5'}
              </Text>
            </View>
            {endlessOpen ? <Play size={36} color="#F59E0B" fill="#F59E0B" /> : <Lock size={32} color="#FFFFFF" />}
          </TouchableOpacity>
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
          <Text accessibilityRole="header" style={{ fontWeight: '800', color: '#06223D', fontSize: 16, textAlign: 'center' }}>
            Exercise Type
          </Text>
          <View accessible={false} importantForAccessibility="no" style={{ alignSelf: 'center', width: 48, height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 6 }} />
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
              color: '#475569',
              fontSize: 13,
              marginTop: 12,
              textAlign: 'center',
              lineHeight: 19,
            }}
          >
            {exDescriptions[exerciseMode]}
          </Text>
        </View>

        {/* Daily challenge */}
        <View
          style={{
            marginTop: 12,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: 16,
          }}
        >
          <View style={{ minHeight: 22, justifyContent: 'center' }}>
            <Text accessibilityRole="header" style={{ fontWeight: '800', color: '#06223D', fontSize: 16, textAlign: 'center', paddingHorizontal: 28 }}>
              Daily Challenge
            </Text>
            {dailyDone ? <CheckCircle2 size={22} color="#F59E0B" style={{ position: 'absolute', right: 0 }} /> : null}
          </View>
          <View
            accessible={false}
            importantForAccessibility="no"
            style={{ alignSelf: 'center', width: 48, height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 6 }}
          />
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 19, marginTop: 4, textAlign: 'center' }}>
            Pass {daily.target} pipes on Level {daily.levelId} today
          </Text>
          {!dailyDone ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Play today's Daily Challenge"
              onPress={() => playDaily()}
              style={{
                marginTop: 10,
                backgroundColor: '#06223D',
                borderRadius: 14,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#F59E0B', fontWeight: '800' }}>Take it on</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: '#F59E0B', fontWeight: '700', marginTop: 8, fontSize: 13, textAlign: 'center' }}>
              Done! Come back tomorrow 🔥
            </Text>
          )}

        </View>
      </ScrollView>
      <GameStartOptions
        visible={pendingGame !== null}
        title={pendingGame?.title}
        onClose={() => setPendingGame(null)}
        onPlay={(record) => { if (pendingGame) launchGame(pendingGame, record); }}
      />
    </View>
  );
}
