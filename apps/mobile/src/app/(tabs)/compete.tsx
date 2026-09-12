import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, type ImageSource } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Medal, RefreshCw, Search, Share2, Swords, Trophy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAvoidingAnimatedView from '@/components/KeyboardAvoidingAnimatedView';
import { EXERCISE_IMAGES } from '@/utils/game/exerciseImages';
import { useGameStore } from '@/utils/game/store';

// ─── Types ───────────────────────────────────────────────────────────────────
type LeaderboardRow = {
  device_id: string;
  player_name: string;
  score: number;
  exercise: string;
};

type ChallengeData = {
  challenge: {
    id: number;
    code: string;
    creator_name: string;
    target_score: number;
    level_id: number | null;
  };
  attempts: { player_name: string; device_id: string; score: number }[];
};

type LeaderboardExercise = 'pushups' | 'squats' | 'pullups';

const BOARD_TABS: {
  key: LeaderboardExercise;
  label: string;
  imageSource: ImageSource;
  desc: string;
}[] = [
  {
    key: 'pushups',
    label: 'Push-ups',
    imageSource: EXERCISE_IMAGES.pushups,
    desc: 'Endless · Push-up controller',
  },
  {
    key: 'squats',
    label: 'Squats',
    imageSource: EXERCISE_IMAGES.squats,
    desc: 'Endless · Squat controller',
  },
  {
    key: 'pullups',
    label: 'Pull-ups',
    imageSource: EXERCISE_IMAGES.pullups,
    desc: 'Endless · Pull-up controller',
  },
];

// ─── Leaderboard Panel ────────────────────────────────────────────────────────
function LeaderboardPanel({
  exercise,
  deviceId,
}: {
  exercise: LeaderboardExercise;
  deviceId: string;
}) {
  const queryClient = useQueryClient();
  const tab = BOARD_TABS.find((t) => t.key === exercise)!;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', exercise],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const res = await fetch(`/api/leaderboard?exercise=${exercise}`);
      if (!res.ok) throw new Error(`[${res.status}] ${res.statusText}`);
      const d = await res.json();
      return d.scores ?? [];
    },
    staleTime: 30000,
  });

  const rows = data ?? [];
  const myIndex = rows.findIndex((r) => r.device_id === deviceId);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;

  const medalColors = ['#F59E0B', '#9CA3AF', '#B45309'];

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Image
          source={tab.imageSource}
          style={{ width: 72, height: 72, borderRadius: 12 }}
          contentFit="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '900', color: '#0F172A', fontSize: 15 }}>
            {tab.label} Board
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 11 }}>{tab.desc}</Text>
        </View>
        <TouchableOpacity
          onPress={() => queryClient.invalidateQueries({ queryKey: ['leaderboard', exercise] })}
        >
          <RefreshCw size={15} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* My rank chip */}
      {myRow && (
        <View
          style={{
            backgroundColor: '#FFFBEB',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: '#FCD34D',
          }}
        >
          <Trophy size={13} color="#B45309" />
          <Text style={{ fontWeight: '800', color: '#B45309', fontSize: 12 }}>
            You're #{myIndex + 1} · {myRow.score} pipes
          </Text>
        </View>
      )}

      {/* Rows */}
      {isLoading ? (
        <Text style={{ color: '#94A3B8', paddingVertical: 12, fontSize: 13 }}>Loading…</Text>
      ) : isError ? (
        <Text style={{ color: '#DC2626', fontSize: 12, paddingVertical: 12 }}>
          Could not load scores — pull to refresh.
        </Text>
      ) : rows.length === 0 ? (
        <Text style={{ color: '#94A3B8', paddingVertical: 12, fontSize: 13, lineHeight: 18 }}>
          No scores yet.{'\n'}Play Endless with {tab.label} to be first!
        </Text>
      ) : (
        rows.slice(0, 20).map((row, idx) => {
          const isMe = row.device_id === deviceId;
          return (
            <View
              key={`${row.device_id}-${idx}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 9,
                borderBottomWidth: idx < Math.min(rows.length, 20) - 1 ? 1 : 0,
                borderColor: '#F8FAFC',
                gap: 10,
                backgroundColor: isMe ? '#FFFBEB' : 'transparent',
                marginHorizontal: -4,
                paddingHorizontal: 4,
                borderRadius: 8,
              }}
            >
              {/* Rank */}
              <View style={{ width: 26, alignItems: 'center' }}>
                {idx < 3 ? (
                  <Medal size={17} color={medalColors[idx]} fill={medalColors[idx]} />
                ) : (
                  <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 12 }}>
                    {idx + 1}
                  </Text>
                )}
              </View>
              {/* Name */}
              <Text
                style={{
                  flex: 1,
                  fontWeight: isMe ? '900' : '600',
                  color: isMe ? '#B45309' : '#0F172A',
                  fontSize: 13,
                }}
              >
                {row.player_name}
                {isMe ? ' (you)' : ''}
              </Text>
              {/* Score */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                <Text style={{ fontWeight: '900', color: '#0F172A', fontSize: 14 }}>
                  {row.score}
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }}>pipes</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CompeteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const deviceId = useGameStore((s) => s.deviceId);

  const [nameDraft, setNameDraft] = useState(playerName);
  const [nameSaveState, setNameSaveState] = useState<'idle' | 'saved' | 'empty'>('idle');
  const [targetDraft, setTargetDraft] = useState('10');
  const [joinCode, setJoinCode] = useState('');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boardTab, setBoardTab] = useState<LeaderboardExercise>('pushups');

  const hasName = playerName.trim().length > 0;

  // The persisted store hydrates asynchronously. Reflect the stored name once
  // it arrives so returning players do not see a blank field.
  useEffect(() => {
    setNameDraft(playerName);
    if (playerName.trim().length > 0) setNameSaveState('saved');
  }, [playerName]);

  // Challenge queries
  const challengeQuery = useQuery({
    queryKey: ['challenge', activeCode],
    enabled: !!activeCode,
    queryFn: async (): Promise<ChallengeData> => {
      const res = await fetch(`/api/challenges?code=${encodeURIComponent(activeCode ?? '')}`);
      if (!res.ok) throw new Error(`[${res.status}] ${res.statusText}`);
      return res.json();
    },
  });

  const createChallenge = useMutation({
    mutationFn: async (): Promise<{ code: string }> => {
      const target = parseInt(targetDraft, 10);
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorName: playerName,
          deviceId,
          targetScore: Number.isFinite(target) && target > 0 ? target : 10,
        }),
      });
      if (!res.ok) throw new Error(`[${res.status}] ${res.statusText}`);
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedCode(data.code);
      setActiveCode(data.code);
      setError(null);
    },
    onError: (e) => {
      console.error(e);
      setError('Could not create challenge. Try again.');
    },
  });

  const saveName = () => {
    const nextName = nameDraft.trim().replace(/\s+/g, ' ');
    if (!nextName) {
      setNameSaveState('empty');
      return;
    }
    setNameDraft(nextName);
    setPlayerName(nextName);
    setNameSaveState('saved');
  };

  const shareChallenge = async (code: string, target: number) => {
    try {
      await Share.share({
        message: `I challenge you to score ${target} in Flap Fit! 💪🐦 Enter code ${code} in the Compete tab.`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const lookupChallenge = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length > 0) {
      setActiveCode(code);
      setError(null);
    }
  };

  const playChallenge = (data: ChallengeData) => {
    router.push({
      pathname: '/game' as never,
      params: {
        mode: 'challenge',
        levelId: String(data.challenge.level_id ?? 3),
        target: String(data.challenge.target_score),
        challengeCode: data.challenge.code,
      },
    });
  };

  const challengeData = challengeQuery.data;

  return (
    <KeyboardAvoidingAnimatedView
      style={{ flex: 1, backgroundColor: '#F0F9FF' }}
      behavior="padding"
    >
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 36,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A' }}>Compete</Text>
        <Text style={{ color: '#64748B', marginTop: 2, marginBottom: 16 }}>
          Leaderboards · Friend Challenges
        </Text>

        {/* ── Player name ─────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 15 }}>
            Your player name
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              value={nameDraft}
              onChangeText={(value) => {
                setNameDraft(value);
                setNameSaveState('idle');
              }}
              onBlur={saveName}
              onSubmitEditing={saveName}
              returnKeyType="done"
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="e.g. PushMaster"
              placeholderTextColor="#94A3B8"
              maxLength={20}
              style={{
                flex: 1,
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                color: '#0F172A',
                fontWeight: '600',
              }}
            />
            <TouchableOpacity
              onPress={saveName}
              accessibilityRole="button"
              accessibilityLabel="Save player name"
              style={{
                backgroundColor: '#F59E0B',
                borderRadius: 12,
                paddingHorizontal: 16,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Save</Text>
            </TouchableOpacity>
          </View>
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color:
                nameSaveState === 'empty'
                  ? '#DC2626'
                  : nameSaveState === 'saved' && hasName
                    ? '#15803D'
                    : '#94A3B8',
              fontSize: 11,
              marginTop: 6,
            }}
          >
            {nameSaveState === 'empty'
              ? 'Enter a player name before saving.'
              : nameSaveState === 'saved' && hasName
                ? 'Saved on this device as ' + playerName + '.'
                : 'Tap Save or Done on the keyboard to keep your leaderboard name.'}
          </Text>
        </View>

        {/* ── Global Leaderboards ─────────────────────────────────────────── */}
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Trophy size={18} color="#F59E0B" />
            <Text style={{ fontWeight: '900', color: '#0F172A', fontSize: 17 }}>
              Global Leaderboards
            </Text>
          </View>
          <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>
            Body-weight exercises only — fairest measure of effort. Play Endless to rank up.
          </Text>

          {/* Tab switcher */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#E2E8F0',
              borderRadius: 14,
              padding: 4,
              marginBottom: 12,
            }}
          >
            {BOARD_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setBoardTab(tab.key)}
                style={{
                  flex: 1,
                  borderRadius: 11,
                  paddingVertical: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: boardTab === tab.key ? '#FFFFFF' : 'transparent',
                }}
              >
                <Image
                  source={tab.imageSource}
                  style={{ width: 38, height: 38, borderRadius: 8 }}
                  contentFit="contain"
                />
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 12,
                    color: boardTab === tab.key ? '#0F172A' : '#64748B',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <LeaderboardPanel exercise={boardTab} deviceId={deviceId} />
        </View>

        {/* ── Create challenge ────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 16,
            marginTop: 18,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Swords size={18} color="#1D4ED8" />
            <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 15 }}>
              Challenge a friend
            </Text>
          </View>
          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
            Set a target score, share the code, then compare results.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              value={targetDraft}
              onChangeText={setTargetDraft}
              keyboardType="number-pad"
              placeholder="Target score"
              placeholderTextColor="#94A3B8"
              style={{
                flex: 1,
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                color: '#0F172A',
                fontWeight: '600',
              }}
            />
            <TouchableOpacity
              onPress={() =>
                hasName ? createChallenge.mutate() : setError('Set your player name first.')
              }
              disabled={createChallenge.isPending}
              style={{
                backgroundColor: '#1D4ED8',
                borderRadius: 12,
                paddingHorizontal: 16,
                justifyContent: 'center',
                opacity: createChallenge.isPending ? 0.6 : 1,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                {createChallenge.isPending ? '…' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
          {createdCode && (
            <View
              style={{
                marginTop: 10,
                backgroundColor: '#EFF6FF',
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontWeight: '900',
                  fontSize: 20,
                  color: '#1E3A8A',
                  letterSpacing: 3,
                }}
              >
                {createdCode}
              </Text>
              <TouchableOpacity
                onPress={() => shareChallenge(createdCode, parseInt(targetDraft, 10) || 10)}
                style={{
                  backgroundColor: '#1D4ED8',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Share2 size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Share</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Join challenge ──────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 16,
            marginTop: 12,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Search size={18} color="#0EA5E9" />
            <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 15 }}>
              Enter a challenge code
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              placeholder="e.g. AB12CD"
              placeholderTextColor="#94A3B8"
              maxLength={6}
              style={{
                flex: 1,
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                color: '#0F172A',
                fontWeight: '700',
                letterSpacing: 2,
              }}
            />
            <TouchableOpacity
              onPress={lookupChallenge}
              style={{
                backgroundColor: '#0EA5E9',
                borderRadius: 12,
                paddingHorizontal: 16,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Find</Text>
            </TouchableOpacity>
          </View>

          {activeCode && challengeQuery.isLoading && (
            <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 13 }}>
              Looking up {activeCode}…
            </Text>
          )}
          {activeCode && challengeQuery.isError && (
            <Text style={{ color: '#DC2626', marginTop: 12, fontSize: 12 }}>
              Could not find a challenge with that code.
            </Text>
          )}
          {challengeData && (
            <View
              style={{
                marginTop: 12,
                backgroundColor: '#F0F9FF',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                {challengeData.challenge.creator_name}'s challenge · Target{' '}
                {challengeData.challenge.target_score}
              </Text>
              {challengeData.attempts.length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  {challengeData.attempts.slice(0, 10).map((a, idx) => (
                    <View
                      key={`${a.device_id}-${idx}`}
                      style={{ flexDirection: 'row', paddingVertical: 4 }}
                    >
                      <Text style={{ flex: 1, color: '#334155', fontWeight: '600', fontSize: 13 }}>
                        {a.player_name}
                        {a.device_id === deviceId ? ' (you)' : ''}
                      </Text>
                      <Text
                        style={{
                          fontWeight: '800',
                          fontSize: 13,
                          color:
                            a.score >= challengeData.challenge.target_score ? '#16A34A' : '#64748B',
                        }}
                      >
                        {a.score}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 6 }}>
                  No attempts yet — be first!
                </Text>
              )}
              <TouchableOpacity
                onPress={() => playChallenge(challengeData)}
                style={{
                  marginTop: 10,
                  backgroundColor: '#0EA5E9',
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Play this challenge</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {error && <Text style={{ color: '#DC2626', marginTop: 12, fontSize: 13 }}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingAnimatedView>
  );
}
