import { TabSkyBackground } from '@/components/TabSkyBackground';
import { Image, type ImageSource } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { AchievementCard } from '@/components/AchievementCard';
import { ChampionBadge } from '@/components/ChampionBadge';
import { ChampionshipCeremony } from '@/components/RunCelebrations';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BirdAvatar from '@/components/BirdAvatar';
import type { AchievementCategory } from '@/utils/game/achievements';
import { ACHIEVEMENTS } from '@/utils/game/achievements';
import { getBird } from '@/utils/game/birds';
import { EXERCISE_IMAGES } from '@/utils/game/exerciseImages';
import { LEVELS } from '@/utils/game/levels';
import {
  computeEvolutionStage,
  computeBirdMorphology,
  computeTutStreak,
  dayKey,
  EVO_NAMES,
  EVO_THRESHOLDS,
  useGameStore,
} from '@/utils/game/store';

// ─── Types ───────────────────────────────────────────────────────────────────
type ChartWindow = '7d' | '30d';

type ExerciseFilter = AchievementCategory;

const EXERCISE_OPTIONS: {
  key: ExerciseFilter;
  label: string;
  color: string;
  imageSource?: ImageSource;
}[] = [
  { key: 'global', label: 'All Exercises', color: '#0284C7', imageSource: undefined },
  { key: 'pushups', label: 'Push-ups', color: '#F59E0B', imageSource: EXERCISE_IMAGES.pushups },
  { key: 'squats', label: 'Squats', color: '#22C55E', imageSource: EXERCISE_IMAGES.squats },
  { key: 'pullups', label: 'Pull-ups', color: '#3B82F6', imageSource: EXERCISE_IMAGES.pullups },
  {
    key: 'lateralraise',
    label: 'Lateral Raise',
    color: '#8B5CF6',
    imageSource: EXERCISE_IMAGES.lateralraise,
  },
  { key: 'biceps', label: 'Bicep Curls', color: '#EF4444', imageSource: EXERCISE_IMAGES.biceps },
  {
    key: 'shoulderpress',
    label: 'Shoulder Press',
    color: '#4AABDE',
    imageSource: EXERCISE_IMAGES.shoulderpress,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTut(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#06223D',
        borderRadius: 16,
        padding: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: '#06223D',
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#F59E0B', textAlign: 'center' }}>{value}</Text>
      <Text style={{ fontSize: 13, lineHeight: 18, color: '#FFFFFF', fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const championUnlocked = useGameStore((s) => s.championUnlocked);
  const championshipSeen = useGameStore((s) => s.championshipCelebrationSeen);
  const standardLevelBestScores = useGameStore((s) => s.standardLevelBestScores);
  const [showChampionship, setShowChampionship] = useState(false);
  useFocusEffect(useCallback(() => {
    if (hydrated && championUnlocked && !championshipSeen) setShowChampionship(true);
  }, [hydrated, championUnlocked, championshipSeen]));

  const sessions = useGameStore((s) => s.sessions);
  const totalPipes = useGameStore((s) => s.totalPipes);
  const bestSingle = useGameStore((s) => s.bestSingleScore);
  const unlockedLevel = useGameStore((s) => s.unlockedLevel);
  const dailyCompleted = useGameStore((s) => s.dailyCompleted);
  const totalTut = useGameStore((s) => s.totalTutSeconds);
  const dailyTut = useGameStore((s) => s.dailyTut);
  const dailyExerciseTut = useGameStore((s) => s.dailyExerciseTut);
  const exerciseTut = useGameStore((s) => s.exerciseTut);
  const lastActivity = useGameStore((s) => s.lastActivityDate);
  const birdId = useGameStore((s) => s.birdId);

  const tutStreak = computeTutStreak(dailyTut);
  const evoStage = computeEvolutionStage(totalTut, lastActivity);
  const atFinalStage = evoStage === EVO_THRESHOLDS.length - 1;
  const nextThreshold = EVO_THRESHOLDS[Math.min(evoStage + 1, EVO_THRESHOLDS.length - 1)];
  const stageProgress = atFinalStage ? 1 : Math.max(0, Math.min(1,
    (totalTut - EVO_THRESHOLDS[evoStage]) / (nextThreshold - EVO_THRESHOLDS[evoStage])
  ));
  const birdEvo = { stage: evoStage, ...computeBirdMorphology(exerciseTut) };
  const skin = getBird(birdId);

  const [exerciseFilter, setExerciseFilter] = useState<ExerciseFilter>('global');
  const [chartWindow, setChartWindow] = useState<ChartWindow>('7d');
  const [showDropdown, setShowDropdown] = useState(false);

  const activeEx = EXERCISE_OPTIONS.find((e) => e.key === exerciseFilter) ?? EXERCISE_OPTIONS[0];

  // ── Build exercise-specific chart data ────────────────────────────────────
  // Historical sessions created before exercise tracking have no exercise
  // field. They still belong in the persisted all-exercises daily total, but
  // are deliberately not guessed into an individual exercise.
  const selectedDailyTut =
    exerciseFilter === 'global'
      ? dailyTut
      : Object.fromEntries(
          Object.entries(dailyExerciseTut).map(([day, totals]) => [
            day,
            totals[exerciseFilter] ?? 0,
          ])
        );
  const numDays = chartWindow === '7d' ? 7 : 30;
  const chartDays: { label: string; key: string; tut: number }[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    chartDays.push({
      label:
        chartWindow === '7d'
          ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]
          : i % 5 === 0
            ? String(d.getDate())
            : '',
      key,
      tut: selectedDailyTut[key] ?? 0,
    });
  }
  const maxTut = Math.max(60, ...chartDays.map((d) => d.tut));

  // ── Build exercise-specific TUT breakdown ─────────────────────────────────
  const exBreakdown = (
    [
      { key: 'pushups', label: 'Push-ups', color: '#4AABDE' },
      { key: 'squats', label: 'Squats', color: '#4AABDE' },
      { key: 'pullups', label: 'Pull-ups', color: '#4AABDE' },
      { key: 'lateralraise', label: 'Lateral Raise', color: '#4AABDE' },
      { key: 'biceps', label: 'Bicep Curls', color: '#4AABDE' },
      { key: 'shoulderpress', label: 'Shoulder Press', color: '#4AABDE' },
    ] as const
  ).map((e) => ({ ...e, seconds: exerciseTut[e.key] ?? 0, imageSource: EXERCISE_IMAGES[e.key] }));
  const maxExTut = Math.max(60, ...exBreakdown.map((e) => e.seconds));

  // ── Snapshot for achievements ─────────────────────────────────────────────
  const snapshot = {
    tutStreak,
    bestSingleScore: bestSingle,
    unlockedLevel,
    sessionsCount: sessions.length,
    dailiesCompleted: dailyCompleted.length,
    totalTutSeconds: totalTut,
    standardLevelBestScores,
    championUnlocked,
    exerciseTutSeconds: exerciseTut,
  };

  // ── Filter achievements to the selected category ──────────────────────────
  const visibleAchievements = ACHIEVEMENTS.filter((a) => a.category === exerciseFilter);

  // ── Currently selected exercise TUT ──────────────────────────────────────
  const selectedTut = exerciseFilter === 'global' ? totalTut : (exerciseTut[exerciseFilter] ?? 0);

  const recent = sessions.slice(0, 20);

  return (
    <View style={{ flex: 1, backgroundColor: '#4AABDE' }}>
      <TabSkyBackground screen="stats" />
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: 'LuckiestGuy_400Regular',
            fontSize: 34,
            textAlign: 'center',
            color: '#FFFFFF',
            textShadowColor: 'rgba(6,34,61,0.3)',
            textShadowOffset: { width: 0, height: 3 },
            textShadowRadius: 4,
          }}
        >
          Stats
        </Text>
        <Text style={{ color: '#06223D', fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center', marginTop: 2, marginBottom: 16 }}>
          Your fitness journey
        </Text>

        {championUnlocked ? <ChampionBadge /> : null}

        {/* ── Bird evolution banner ─────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BirdAvatar skin={skin} size={72} evo={birdEvo} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '900', color: '#06223D', fontSize: 15, lineHeight: 18, textAlign: 'center' }}>
                Stage {evoStage + 1} — {EVO_NAMES[evoStage]}
              </Text>
              <Text style={{ color: '#06223D', fontSize: 12, lineHeight: 17, fontWeight: '800', textAlign: 'center', marginTop: 2 }}>
                {atFinalStage ? 'Legend reached!' : `${Math.round(stageProgress * 100)}% to ${EVO_NAMES[evoStage + 1]}`}
              </Text>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={atFinalStage ? 'Legend reached' : `Progress to ${EVO_NAMES[evoStage + 1]}`}
                accessibilityValue={{ min: 0, max: 100, now: Math.round(stageProgress * 100) }}
                style={{ height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden', marginTop: 5 }}
              >
                <View style={{ width: `${stageProgress * 100}%`, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' }} />
              </View>
            </View>
            <View accessible={false} importantForAccessibility="no" style={{ width: 72 }} />
          </View>
        </View>

        {/* ── Overview stat cards ───────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard
            label="Training time"
            value={formatTut(totalTut)}
          />
          <StatCard
            label="Active streak"
            value={`${tutStreak}d`}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <StatCard
            label="Best run"
            value={String(bestSingle)}
          />
          <StatCard
            label="Total pipes"
            value={String(totalPipes)}
          />
        </View>

        {/* ── Exercise breakdown — with bird images ────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 16,
            marginTop: 14,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <Text accessibilityRole="header" style={{ fontWeight: '800', color: '#06223D', fontSize: 15, textAlign: 'center' }}>
            Time Under Tension · By Exercise
          </Text>
          <View accessible={false} importantForAccessibility="no" style={{ alignSelf: 'center', width: 48, height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 6, marginBottom: 12 }} />
          {exBreakdown.map((e) => {
            const pct = e.seconds / maxExTut;
            return (
              <View key={e.key} style={{ marginBottom: 12 }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 }}
                >
                  <Image
                    source={e.imageSource}
                    style={{ width: 68, height: 68, borderRadius: 12 }}
                    contentFit="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 3,
                      }}
                    >
                      <Text style={{ fontWeight: '700', color: '#475569', fontSize: 13, lineHeight: 18 }}>
                        {e.label}
                      </Text>
                      <Text style={{ fontWeight: '700', color: '#475569', fontSize: 13, lineHeight: 18 }}>
                        {formatTut(e.seconds)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#F1F5F9',
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.round(pct * 100)}%`,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: e.color,
                        }}
                      />
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Exercise dropdown + chart window toggle ───────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' }}>
          {/* Dropdown trigger */}
          <TouchableOpacity
            onPress={() => setShowDropdown((v) => !v)}
            style={{
              flex: 1,
              backgroundColor: '#06223D',
              borderRadius: 14,
              paddingVertical: 11,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: '#06223D',
            }}
          >
            <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              {activeEx.imageSource ? (
                <Image
                  source={activeEx.imageSource}
                  style={{ width: 40, height: 40, borderRadius: 10 }}
                  contentFit="contain"
                />
              ) : (
                <Text style={{ fontSize: 18 }}>🌍</Text>
              )}
            </View>
            <Text style={{ flex: 1, marginHorizontal: 6, fontWeight: '800', color: '#FFFFFF', fontSize: 13, textAlign: 'center' }}>
              {activeEx.label}
            </Text>
            <View style={{ width: 16, alignItems: 'center' }}>
              {showDropdown ? (
                <ChevronUp size={16} color="#4AABDE" />
              ) : (
                <ChevronDown size={16} color="#4AABDE" />
              )}
            </View>
          </TouchableOpacity>
          {/* 7d / 30d toggle */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#06223D',
              borderRadius: 12,
              padding: 3,
            }}
          >
            {(['7d', '30d'] as ChartWindow[]).map((w) => (
              <TouchableOpacity
                key={w}
                onPress={() => setChartWindow(w)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: chartWindow === w ? '#FFFFFF' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 12,
                    color: chartWindow === w ? '#06223D' : '#FFFFFF',
                  }}
                >
                  {w}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dropdown list with bird images */}
        {showDropdown && (
          <View
            style={{
              backgroundColor: '#06223D',
              borderRadius: 16,
              marginTop: 4,
              borderWidth: 1,
              borderColor: '#06223D',
              overflow: 'hidden',
            }}
          >
            {EXERCISE_OPTIONS.map((opt, index) => {
              const selected = opt.key === exerciseFilter;
              return (
                <View key={opt.key}>
                  <TouchableOpacity
                    onPress={() => {
                      setExerciseFilter(opt.key);
                      setShowDropdown(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      paddingVertical: 11,
                      paddingHorizontal: 16,
                      borderWidth: 2,
                      borderColor: selected ? '#F59E0B' : '#06223D',
                      backgroundColor: selected ? '#4AABDE' : '#06223D',
                    }}
                  >
                    {opt.imageSource ? (
                      <Image
                        source={opt.imageSource}
                        style={{ width: 68, height: 68, borderRadius: 12 }}
                        contentFit="contain"
                      />
                    ) : (
                      <View
                        style={{
                          width: 68,
                          height: 68,
                          borderRadius: 10,
                          backgroundColor: selected ? '#4AABDE' : '#06223D',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>🌍</Text>
                      </View>
                    )}
                    <Text
                      style={{
                        fontWeight: selected ? '900' : '600',
                        color: selected ? '#06223D' : '#FFFFFF',
                        fontSize: 14,
                        flex: 1,
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                    </Text>
                    <View style={{ width: 20, alignItems: 'center' }}>
                      {selected ? <CheckCircle2 size={19} color="#F59E0B" fill="#06223D" /> : null}
                    </View>
                  </TouchableOpacity>
                  {index < EXERCISE_OPTIONS.length - 1 ? (
                    <View accessible={false} importantForAccessibility="no" pointerEvents="none" style={{ height: 1, marginHorizontal: 16, backgroundColor: '#4AABDE' }} />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {/* ── TUT Chart ────────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#06223D',
            borderRadius: 18,
            padding: 16,
            marginTop: 10,
            borderWidth: 1,
            borderColor: '#06223D',
          }}
        >
          <Text accessibilityRole="header" style={{ fontWeight: '800', color: '#FFFFFF', fontSize: 14, textAlign: 'center' }}>
            {activeEx.label} · Flying Time
          </Text>
          <View accessible={false} importantForAccessibility="no" style={{ alignSelf: 'center', width: 48, height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 6, marginBottom: 8 }} />
          <Text style={{ color: '#4AABDE', fontSize: 12, lineHeight: 17, marginBottom: 4, textAlign: 'center' }}>
            {exerciseFilter === 'global'
              ? 'All exercises combined'
              : `${activeEx.label} sessions only`}
            {' · '}Last {chartWindow === '7d' ? '7 days' : '30 days'}
          </Text>

          {/* Selected exercise TUT highlight */}
          <View
            style={{
              paddingVertical: 4,
              marginBottom: 6,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontWeight: '900', color: '#FFFFFF', fontSize: 22 }}>
              {formatTut(selectedTut)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              height: 220,
              gap: chartWindow === '7d' ? 8 : 3,
            }}
          >
            {chartDays.map((d, index) => {
              const h = Math.max(4, (d.tut / maxTut) * 184);
              const roundedSeconds = Math.max(0, Math.round(d.tut));
              const labelStr =
                roundedSeconds >= 60 ? `${Math.round(roundedSeconds / 60)}m` : d.tut > 0 ? `${roundedSeconds}s` : '';
              return (
                <View key={d.key} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                  {chartWindow === '7d' && (
                    <Text style={{ fontSize: 10, lineHeight: 14, color: '#4AABDE', fontWeight: '700' }}>
                      {labelStr}
                    </Text>
                  )}
                  <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                    <View
                      style={{
                        width: '100%',
                        height: h,
                        borderRadius: 4,
                        // Anchor at today so matching days keep their color across both windows.
                        backgroundColor: (chartDays.length - 1 - index) % 2 === 0 ? '#F59E0B' : '#4AABDE',
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: chartWindow === '7d' ? 11 : 10,
                      lineHeight: 14,
                      width: chartWindow === '30d' ? 24 : undefined,
                      textAlign: 'center',
                      color: '#4AABDE',
                      fontWeight: '700',
                    }}
                  >
                    {d.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Achievements for selected exercise ───────────────────────────── */}
        <Text
          style={{
            fontWeight: '900',
            color: '#06223D',
            fontSize: 20,
            textAlign: 'center',
            marginTop: 22,
          }}
        >
          {exerciseFilter === 'global' ? 'Achievements' : `${activeEx.label} Achievements`}
        </Text>
        <View accessible={false} importantForAccessibility="no" style={{ alignSelf: 'center', width: 48, height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 6, marginBottom: 10 }} />

        {visibleAchievements.length === 0 ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#475569' }}>No achievements for this category yet.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            {visibleAchievements.map(a => <AchievementCard key={a.id} achievement={a} snapshot={snapshot} />)}
          </View>
        )}

        {/* ── Recent sessions ───────────────────────────────────────────────── */}
        <Text
          style={{
            fontWeight: '900',
            color: '#06223D',
            fontSize: 20,
            textAlign: 'center',
            marginTop: 24,
          }}
        >
          Recent Sessions
        </Text>
        <View accessible={false} importantForAccessibility="no" style={{ alignSelf: 'center', width: 48, height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 6, marginBottom: 10 }} />
        {recent.length === 0 ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#475569' }}>No sessions yet — go fly! 🐦</Text>
          </View>
        ) : (
          recent.map((s, idx) => {
            const levelName =
              s.levelId != null
                ? (LEVELS.find((l) => l.id === s.levelId)?.name ?? `Level ${s.levelId}`)
                : 'Endless';
            const modeLabel =
              s.mode === 'daily'
                ? 'Daily'
                : s.mode === 'endless'
                  ? 'Endless'
                  : levelName;
            return (
              <View
                key={`${s.iso}-${idx}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#F1F5F9',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: '#06223D', fontSize: 13 }}>
                    {modeLabel}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 12, lineHeight: 17, marginTop: 2 }}>{s.day}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', color: '#F59E0B', fontSize: 14 }}>
                    {s.score} pipes
                  </Text>
                  <Text style={{ color: '#06223D', fontSize: 12, lineHeight: 17 }}>
                    {formatTut(s.tutSeconds ?? 0)} training
                  </Text>
                </View>
              </View>
            );
          })
        )}
        {__DEV__ ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push("../championship-preview")}
            style={{ padding: 16, alignItems: "center" }}>
            <Text style={{ color: "#1D4ED8", fontWeight: "800" }}>Preview championship & achievements</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      {showChampionship ? <ChampionshipCeremony continueLabel="Continue to Stats" onContinue={() => {
        useGameStore.getState().markChampionshipCelebrationSeen();
        setShowChampionship(false);
      }} /> : null}
    </View>
  );
}
