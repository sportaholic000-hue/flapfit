import { Image, type ImageSource } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { ChevronDown, ChevronUp, Flame, Target, Timer, Trophy, Zap } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
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
    color: '#0EA5E9',
    imageSource: EXERCISE_IMAGES.shoulderpress,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTut(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
      }}
    >
      {icon}
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const insets = useSafeAreaInsets();

  const sessions = useGameStore((s) => s.sessions);
  const totalPipes = useGameStore((s) => s.totalPipes);
  const bestSingle = useGameStore((s) => s.bestSingleScore);
  const unlockedLevel = useGameStore((s) => s.unlockedLevel);
  const challengesWon = useGameStore((s) => s.challengesWon);
  const dailyCompleted = useGameStore((s) => s.dailyCompleted);
  const totalTut = useGameStore((s) => s.totalTutSeconds);
  const dailyTut = useGameStore((s) => s.dailyTut);
  const dailyExerciseTut = useGameStore((s) => s.dailyExerciseTut);
  const exerciseTut = useGameStore((s) => s.exerciseTut);
  const lastActivity = useGameStore((s) => s.lastActivityDate);
  const birdId = useGameStore((s) => s.birdId);

  const tutStreak = computeTutStreak(dailyTut);
  const evoStage = computeEvolutionStage(totalTut, lastActivity);
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
            ? `${numDays - i}`
            : '',
      key,
      tut: selectedDailyTut[key] ?? 0,
    });
  }
  const maxTut = Math.max(60, ...chartDays.map((d) => d.tut));

  // ── Build exercise-specific TUT breakdown ─────────────────────────────────
  const exBreakdown = (
    [
      { key: 'pushups', label: 'Push-ups', color: '#F59E0B' },
      { key: 'squats', label: 'Squats', color: '#22C55E' },
      { key: 'pullups', label: 'Pull-ups', color: '#3B82F6' },
      { key: 'lateralraise', label: 'Lateral Raise', color: '#8B5CF6' },
      { key: 'biceps', label: 'Bicep Curls', color: '#EF4444' },
      { key: 'shoulderpress', label: 'Shoulder Press', color: '#0EA5E9' },
    ] as const
  ).map((e) => ({ ...e, seconds: exerciseTut[e.key] ?? 0, imageSource: EXERCISE_IMAGES[e.key] }));
  const maxExTut = Math.max(60, ...exBreakdown.map((e) => e.seconds));

  // ── Snapshot for achievements ─────────────────────────────────────────────
  const snapshot = {
    tutStreak,
    bestSingleScore: bestSingle,
    unlockedLevel,
    sessionsCount: sessions.length,
    challengesWon,
    dailiesCompleted: dailyCompleted.length,
    totalTutSeconds: totalTut,
    birdEvolutionStage: evoStage,
    exerciseTutSeconds: exerciseTut,
  };

  // ── Filter achievements to the selected category ──────────────────────────
  const visibleAchievements = ACHIEVEMENTS.filter((a) => a.category === exerciseFilter);

  // ── Currently selected exercise TUT ──────────────────────────────────────
  const selectedTut = exerciseFilter === 'global' ? totalTut : (exerciseTut[exerciseFilter] ?? 0);

  const recent = sessions.slice(0, 20);

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F9FF' }}>
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
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A' }}>Stats</Text>
        <Text style={{ color: '#64748B', marginTop: 2, marginBottom: 14 }}>
          Your fitness journey
        </Text>

        {/* ── Bird evolution banner ─────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#F1F5F9',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <BirdAvatar skin={skin} size={72} evo={birdEvo} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '900', color: '#0F172A', fontSize: 15 }}>
              Stage {evoStage + 1} — {EVO_NAMES[evoStage]}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
              {formatTut(totalTut)} tracked training time
            </Text>
          </View>
          <Zap size={22} color="#F59E0B" />
        </View>

        {/* ── Overview stat cards ───────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard
            icon={<Timer size={20} color="#0284C7" />}
            label="Training time"
            value={formatTut(totalTut)}
          />
          <StatCard
            icon={<Flame size={20} color="#F97316" />}
            label="Active streak"
            value={`${tutStreak}d`}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <StatCard
            icon={<Trophy size={20} color="#1D4ED8" />}
            label="Best run"
            value={String(bestSingle)}
          />
          <StatCard
            icon={<Target size={20} color="#16A34A" />}
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
          <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 15, marginBottom: 12 }}>
            Time Under Tension · By Exercise
          </Text>
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
                      <Text style={{ fontWeight: '700', color: '#374151', fontSize: 12 }}>
                        {e.label}
                      </Text>
                      <Text style={{ fontWeight: '700', color: '#64748B', fontSize: 12 }}>
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
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              paddingVertical: 11,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1.5,
              borderColor: '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {activeEx.imageSource ? (
                <Image
                  source={activeEx.imageSource}
                  style={{ width: 50, height: 50, borderRadius: 10 }}
                  contentFit="contain"
                />
              ) : (
                <Text style={{ fontSize: 18 }}>🌍</Text>
              )}
              <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13 }}>
                {activeEx.label}
              </Text>
            </View>
            {showDropdown ? (
              <ChevronUp size={16} color="#64748B" />
            ) : (
              <ChevronDown size={16} color="#64748B" />
            )}
          </TouchableOpacity>
          {/* 7d / 30d toggle */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#E2E8F0',
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
                    color: chartWindow === w ? '#0F172A' : '#64748B',
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
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              marginTop: 4,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              overflow: 'hidden',
            }}
          >
            {EXERCISE_OPTIONS.map((opt, idx) => {
              const selected = opt.key === exerciseFilter;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    setExerciseFilter(opt.key);
                    setShowDropdown(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 11,
                    paddingHorizontal: 16,
                    borderBottomWidth: idx < EXERCISE_OPTIONS.length - 1 ? 1 : 0,
                    borderColor: '#F1F5F9',
                    backgroundColor: selected ? '#FFFBEB' : '#FFFFFF',
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
                        backgroundColor: '#F1F5F9',
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
                      color: selected ? '#B45309' : '#0F172A',
                      fontSize: 14,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {selected && (
                    <View
                      style={{
                        marginLeft: 'auto',
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#F59E0B',
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── TUT Chart ────────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 16,
            marginTop: 10,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 14, marginBottom: 2 }}>
            {activeEx.label} · Flying Time
          </Text>
          <Text style={{ color: '#64748B', fontSize: 11, marginBottom: 12 }}>
            {exerciseFilter === 'global'
              ? 'All exercises combined'
              : `${activeEx.label} sessions only`}
            {' · '}Last {chartWindow === '7d' ? '7 days' : '30 days'}
          </Text>

          {/* Selected exercise TUT highlight */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              padding: 10,
              marginBottom: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontWeight: '900', color: '#0284C7', fontSize: 22 }}>
              {formatTut(selectedTut)}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>
              {exerciseFilter === 'global'
                ? 'Total training time'
                : `${activeEx.label} training time`}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              height: 100,
              gap: chartWindow === '7d' ? 8 : 3,
            }}
          >
            {chartDays.map((d) => {
              const h = Math.max(4, (d.tut / maxTut) * 80);
              const labelStr =
                d.tut >= 60 ? `${Math.round(d.tut / 60)}m` : d.tut > 0 ? `${d.tut}s` : '';
              return (
                <View key={d.key} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                  {chartWindow === '7d' && (
                    <Text style={{ fontSize: 8, color: '#64748B', fontWeight: '700' }}>
                      {labelStr}
                    </Text>
                  )}
                  <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                    <View
                      style={{
                        width: '100%',
                        height: h,
                        borderRadius: 4,
                        backgroundColor: d.tut > 0 ? '#0284C7' : '#E2E8F0',
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: chartWindow === '7d' ? 10 : 8,
                      color: '#94A3B8',
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
            color: '#0F172A',
            fontSize: 20,
            marginTop: 22,
            marginBottom: 10,
          }}
        >
          {exerciseFilter === 'global' ? 'Achievements' : `${activeEx.label} Achievements`}
        </Text>

        {visibleAchievements.length === 0 ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#64748B' }}>No achievements for this category yet.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {visibleAchievements.map((a) => {
              const prog = Math.min(a.goal, a.progress(snapshot));
              const done = prog >= a.goal;
              const pct = prog / a.goal;
              return (
                <View
                  key={a.id}
                  style={{
                    width: '48%',
                    backgroundColor: done ? '#FFFBEB' : '#FFFFFF',
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1.5,
                    borderColor: done ? '#FCD34D' : '#F1F5F9',
                    opacity: done ? 1 : 0.85,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                  <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13, marginTop: 4 }}>
                    {a.title}
                  </Text>
                  <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{a.desc}</Text>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#E2E8F0',
                      marginTop: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.round(pct * 100)}%`,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: done ? '#F59E0B' : '#94A3B8',
                      }}
                    />
                  </View>
                  <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 4, fontWeight: '700' }}>
                    {prog}/{a.goal}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Recent sessions ───────────────────────────────────────────────── */}
        <Text
          style={{
            fontWeight: '900',
            color: '#0F172A',
            fontSize: 20,
            marginTop: 24,
            marginBottom: 10,
          }}
        >
          Recent Sessions
        </Text>
        {recent.length === 0 ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#64748B' }}>No sessions yet — go fly! 🐦</Text>
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
                : s.mode === 'challenge'
                  ? 'Challenge'
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
                  <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13 }}>
                    {modeLabel}
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>{s.day}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', color: '#F59E0B', fontSize: 14 }}>
                    {s.score} pipes
                  </Text>
                  <Text style={{ color: '#0284C7', fontSize: 11 }}>
                    {formatTut(s.tutSeconds ?? 0)} training
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
