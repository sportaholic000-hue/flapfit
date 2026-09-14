import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, type ImageSource } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CheckCircle2,
  FileText,
  Medal,
  RefreshCw,
  Search,
  Share2,
  Swords,
  Trophy,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAvoidingAnimatedView from '@/components/KeyboardAvoidingAnimatedView';
import { RELEASE_LINKS } from '@/config/release';
import { competitionIsConfigured, competitionRequest } from '@/services/competitionApi';
import { EXERCISE_IMAGES } from '@/utils/game/exerciseImages';
import { COMPETITION_TERMS_VERSION, useGameStore } from '@/utils/game/store';

// ─── Types ───────────────────────────────────────────────────────────────────
type LeaderboardRow = {
  id: string;
  profile_id: string;
  player_name: string;
  score: number;
  exercise: string;
  is_me: boolean;
};

type ChallengeData = {
  challenge: {
    id: string;
    code: string;
    creator_name: string;
    creator_profile_id: string;
    target_score: number;
    level_id: number | null;
  };
  attempts: {
    id: string;
    profile_id: string;
    player_name: string;
    score: number;
    is_me: boolean;
  }[];
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

type ModerationTarget = {
  profileId: string;
  playerName: string;
  contextType: 'leaderboard' | 'challenge_attempt';
  contextId: string;
};

function openPlayerActions(target: ModerationTarget, onUpdated: () => void) {
  const report = (reason: 'inappropriate_name' | 'cheating' | 'harassment_or_other') => {
    void competitionRequest<{ reported: true }>('/reports', {
      method: 'POST',
      body: {
        reportedUserId: target.profileId,
        contextType: target.contextType,
        contextId: target.contextId,
        reason,
      },
    })
      .then(() => Alert.alert('Report received', 'Thank you. The report will be reviewed.'))
      .catch(() => Alert.alert('Report not sent', 'Please try again or use Contact us in Info.'));
  };

  const chooseReportReason = () => {
    Alert.alert('Report player', 'What should we review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Inappropriate name', onPress: () => report('inappropriate_name') },
      { text: 'Cheating or other', onPress: () => report('harassment_or_other') },
    ]);
  };

  const confirmBlock = () => {
    Alert.alert(
      `Block ${target.playerName}?`,
      'Their scores and challenge attempts will be hidden from you. You can reset your online identity from Info if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            void competitionRequest<{ blocked: true }>('/blocks', {
              method: 'POST',
              body: { blockedUserId: target.profileId },
            })
              .then(() => {
                onUpdated();
                Alert.alert('Player blocked', `${target.playerName} is now hidden.`);
              })
              .catch(() => Alert.alert('Player not blocked', 'Please try again.'));
          },
        },
      ]
    );
  };

  Alert.alert(target.playerName, 'Choose an action for this player.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Report', onPress: chooseReportReason },
    { text: 'Block', style: 'destructive', onPress: confirmBlock },
  ]);
}

function CompetitionTermsModal({
  visible,
  onAccept,
  onClose,
}: {
  visible: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 20,
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
        }}
      >
        <View
          style={{
            maxHeight: '88%',
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ color: '#0F172A', fontSize: 21, fontWeight: '900' }}>
              Online Competition Terms
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>
              Community rules effective September 14, 2026
            </Text>

            <Text style={{ color: '#0F172A', fontWeight: '900', marginTop: 18 }}>
              What becomes public
            </Text>
            <Text style={{ color: '#475569', lineHeight: 20, marginTop: 5 }}>
              After you accept and use Compete, Flap Fit creates a private anonymous online
              identifier. Your chosen player name, leaderboard score, challenge target, and
              challenge result may be visible to other Flap Fit players. Your camera feed and
              recordings are never uploaded to competition services.
            </Text>

            <Text style={{ color: '#0F172A', fontWeight: '900', marginTop: 16 }}>
              Community rules
            </Text>
            <Text style={{ color: '#475569', lineHeight: 20, marginTop: 5 }}>
              Do not use player names or competition features for sexual or obscene content, hate or
              discrimination, threats, harassment, bullying, impersonation, fraud, spam, unlawful
              content, cheating, score manipulation, or attempts to disrupt the service.
            </Text>

            <Text style={{ color: '#0F172A', fontWeight: '900', marginTop: 16 }}>
              Moderation and control
            </Text>
            <Text style={{ color: '#475569', lineHeight: 20, marginTop: 5 }}>
              You can report or block other players from clearly labeled controls beside their
              results. Flap Fit may filter, hide, remove, or restrict content or accounts that break
              these rules. You can permanently delete your online profile from the Info tab.
            </Text>

            <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 16 }}>
              By choosing I Agree, you accept these rules and the Flap Fit Terms of Use. You can
              review the Terms of Use at any time in the Info tab.
            </Text>

            {RELEASE_LINKS.termsUrl || RELEASE_LINKS.privacyUrl ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                {RELEASE_LINKS.termsUrl ? (
                  <TouchableOpacity
                    accessibilityRole="link"
                    accessibilityLabel="Open the full Flap Fit Terms of Use"
                    onPress={() =>
                      void Linking.openURL(RELEASE_LINKS.termsUrl).catch(() =>
                        Alert.alert('Could not open Terms', 'Please try again from the Info tab.')
                      )
                    }
                    style={{ paddingVertical: 6, paddingRight: 8 }}
                  >
                    <Text style={{ color: '#1D4ED8', fontWeight: '900' }}>Full Terms</Text>
                  </TouchableOpacity>
                ) : null}
                {RELEASE_LINKS.privacyUrl ? (
                  <TouchableOpacity
                    accessibilityRole="link"
                    accessibilityLabel="Open the Flap Fit Privacy Policy"
                    onPress={() =>
                      void Linking.openURL(RELEASE_LINKS.privacyUrl).catch(() =>
                        Alert.alert(
                          'Could not open Privacy Policy',
                          'Please try again from the Info tab.'
                        )
                      )
                    }
                    style={{ paddingVertical: 6, paddingRight: 8 }}
                  >
                    <Text style={{ color: '#1D4ED8', fontWeight: '900' }}>Privacy Policy</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              style={{
                flex: 1,
                alignItems: 'center',
                borderRadius: 12,
                paddingVertical: 12,
                backgroundColor: '#E2E8F0',
              }}
            >
              <Text style={{ color: '#334155', fontWeight: '800' }}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="I agree to the online competition terms"
              onPress={onAccept}
              style={{
                flex: 1,
                alignItems: 'center',
                borderRadius: 12,
                paddingVertical: 12,
                backgroundColor: '#1D4ED8',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>I Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Leaderboard Panel ────────────────────────────────────────────────────────
function LeaderboardPanel({
  exercise,
  termsAccepted,
}: {
  exercise: LeaderboardExercise;
  termsAccepted: boolean;
}) {
  const queryClient = useQueryClient();
  const tab = BOARD_TABS.find((t) => t.key === exercise)!;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', exercise],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const d = await competitionRequest<{ scores: LeaderboardRow[] }>(
        `/leaderboard?exercise=${exercise}`
      );
      return d.scores ?? [];
    },
    enabled: competitionIsConfigured && termsAccepted,
    staleTime: 30000,
  });

  const rows = data ?? [];
  const myIndex = rows.findIndex((r) => r.is_me);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;

  const medalColors = ['#F59E0B', '#9CA3AF', '#B45309'];

  if (!competitionIsConfigured) {
    return (
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 18,
          padding: 18,
          borderWidth: 1,
          borderColor: '#E2E8F0',
        }}
      >
        <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 15 }}>
          Online competition is temporarily unavailable
        </Text>
        <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 5 }}>
          You can keep playing levels and Endless normally. Scores and training progress still save
          on this device.
        </Text>
      </View>
    );
  }

  if (!termsAccepted) {
    return (
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 18,
          padding: 18,
          borderWidth: 1,
          borderColor: '#E2E8F0',
        }}
      >
        <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 15 }}>
          Accept the competition rules to connect
        </Text>
        <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 5 }}>
          No anonymous online account or competition request starts until you accept the current
          Terms of Use and community rules above.
        </Text>
      </View>
    );
  }

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
          const isMe = row.is_me;
          return (
            <View
              key={row.id}
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
              {!isMe ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Report or block ${row.player_name}`}
                  onPress={() =>
                    openPlayerActions(
                      {
                        profileId: row.profile_id,
                        playerName: row.player_name,
                        contextType: 'leaderboard',
                        contextId: row.id,
                      },
                      () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
                    )
                  }
                  style={{ paddingHorizontal: 5, paddingVertical: 7 }}
                >
                  <Text style={{ color: '#B91C1C', fontWeight: '800', fontSize: 9 }}>
                    Report / Block
                  </Text>
                </TouchableOpacity>
              ) : null}
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
  const queryClient = useQueryClient();
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const competitionTermsVersion = useGameStore((s) => s.competitionTermsVersion);
  const acceptCompetitionTerms = useGameStore((s) => s.acceptCompetitionTerms);
  const hydrated = useGameStore((s) => s.hydrated);

  const [nameDraft, setNameDraft] = useState(playerName);
  const hasLoadedNameDraft = useRef(false);
  const [nameSaveState, setNameSaveState] = useState<'idle' | 'saved' | 'empty'>('idle');
  const [targetDraft, setTargetDraft] = useState('10');
  const [joinCode, setJoinCode] = useState('');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boardTab, setBoardTab] = useState<LeaderboardExercise>('pushups');
  const [showCompetitionTerms, setShowCompetitionTerms] = useState(false);

  const hasName = playerName.trim().length > 0;
  const hasAcceptedCompetitionTerms = competitionTermsVersion === COMPETITION_TERMS_VERSION;

  // The persisted store hydrates asynchronously. Reflect the stored name once
  // it arrives exactly once. Subsequent store updates must not overwrite text
  // while the player is editing the field.
  useEffect(() => {
    if (!hydrated || hasLoadedNameDraft.current) return;
    hasLoadedNameDraft.current = true;
    setNameDraft(playerName);
    if (playerName.trim().length > 0) setNameSaveState('saved');
  }, [hydrated, playerName]);

  // Challenge queries
  const challengeQuery = useQuery({
    queryKey: ['challenge', activeCode],
    enabled: competitionIsConfigured && hasAcceptedCompetitionTerms && !!activeCode,
    queryFn: async (): Promise<ChallengeData> => {
      return competitionRequest<ChallengeData>(
        `/challenges?code=${encodeURIComponent(activeCode ?? '')}`
      );
    },
  });

  const createChallenge = useMutation({
    mutationFn: async (): Promise<{ code: string }> => {
      const parsedTarget = parseInt(targetDraft, 10);
      const target = Number.isFinite(parsedTarget) ? Math.min(60, Math.max(1, parsedTarget)) : 10;
      return competitionRequest<{ code: string }>('/challenges', {
        method: 'POST',
        body: {
          creatorName: playerName,
          targetScore: target,
        },
      });
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
    if (!hydrated) return;
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
    if (!competitionIsConfigured) {
      setError('Online competition is temporarily unavailable.');
      return;
    }
    if (!hasAcceptedCompetitionTerms) {
      setShowCompetitionTerms(true);
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (code.length > 0) {
      setActiveCode(code);
      setError(null);
    }
  };

  const playChallenge = (data: ChallengeData) => {
    if (!hasAcceptedCompetitionTerms) {
      setShowCompetitionTerms(true);
      return;
    }
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
              editable={hydrated}
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
              disabled={!hydrated}
              accessibilityRole="button"
              accessibilityLabel="Save player name"
              style={{
                backgroundColor: '#F59E0B',
                borderRadius: 12,
                paddingHorizontal: 16,
                justifyContent: 'center',
                opacity: hydrated ? 1 : 0.55,
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
            {!hydrated
              ? 'Loading your saved player name…'
              : nameSaveState === 'empty'
                ? 'Enter a player name before saving.'
                : nameSaveState === 'saved' && hasName
                  ? 'Saved on this device as ' + playerName + '.'
                  : 'Tap Save or Done on the keyboard to keep your leaderboard name.'}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: hasAcceptedCompetitionTerms ? '#F0FDF4' : '#EFF6FF',
            borderRadius: 18,
            padding: 16,
            marginTop: 12,
            borderWidth: 1,
            borderColor: hasAcceptedCompetitionTerms ? '#BBF7D0' : '#BFDBFE',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            {hasAcceptedCompetitionTerms ? (
              <CheckCircle2 size={20} color="#15803D" />
            ) : (
              <FileText size={20} color="#1D4ED8" />
            )}
            <Text
              style={{
                flex: 1,
                color: hasAcceptedCompetitionTerms ? '#166534' : '#1E3A8A',
                fontWeight: '900',
                fontSize: 14,
              }}
            >
              {hasAcceptedCompetitionTerms
                ? 'Online competition terms accepted'
                : 'Accept the rules before publishing'}
            </Text>
          </View>
          <Text style={{ color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 7 }}>
            Player names, leaderboard scores, and challenge results can be public. Competition posts
            stay disabled until you accept the Terms of Use and community rules.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setShowCompetitionTerms(true)}
            style={{
              alignSelf: 'flex-start',
              marginTop: 10,
              borderRadius: 10,
              paddingHorizontal: 13,
              paddingVertical: 8,
              backgroundColor: hasAcceptedCompetitionTerms ? '#DCFCE7' : '#1D4ED8',
            }}
          >
            <Text
              style={{
                color: hasAcceptedCompetitionTerms ? '#166534' : '#FFFFFF',
                fontWeight: '800',
                fontSize: 12,
              }}
            >
              {hasAcceptedCompetitionTerms ? 'Review terms' : 'Review and accept'}
            </Text>
          </TouchableOpacity>
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

          <LeaderboardPanel exercise={boardTab} termsAccepted={hasAcceptedCompetitionTerms} />
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
                !competitionIsConfigured
                  ? setError('Online competition is temporarily unavailable.')
                  : !hasName
                    ? setError('Set your player name first.')
                    : !hasAcceptedCompetitionTerms
                      ? setShowCompetitionTerms(true)
                      : createChallenge.mutate()
              }
              disabled={!competitionIsConfigured || createChallenge.isPending}
              style={{
                backgroundColor: '#1D4ED8',
                borderRadius: 12,
                paddingHorizontal: 16,
                justifyContent: 'center',
                opacity: !competitionIsConfigured || createChallenge.isPending ? 0.6 : 1,
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
              disabled={!competitionIsConfigured}
              style={{
                backgroundColor: '#0EA5E9',
                borderRadius: 12,
                paddingHorizontal: 16,
                justifyContent: 'center',
                opacity: competitionIsConfigured ? 1 : 0.6,
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
                  {challengeData.attempts.slice(0, 10).map((a) => (
                    <View key={a.id} style={{ flexDirection: 'row', paddingVertical: 4 }}>
                      <Text style={{ flex: 1, color: '#334155', fontWeight: '600', fontSize: 13 }}>
                        {a.player_name}
                        {a.is_me ? ' (you)' : ''}
                      </Text>
                      {!a.is_me ? (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Report or block ${a.player_name}`}
                          onPress={() =>
                            openPlayerActions(
                              {
                                profileId: a.profile_id,
                                playerName: a.player_name,
                                contextType: 'challenge_attempt',
                                contextId: a.id,
                              },
                              () => queryClient.invalidateQueries({ queryKey: ['challenge'] })
                            )
                          }
                          style={{ paddingHorizontal: 6, paddingVertical: 5 }}
                        >
                          <Text style={{ color: '#B91C1C', fontWeight: '800', fontSize: 9 }}>
                            Report / Block
                          </Text>
                        </TouchableOpacity>
                      ) : null}
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
      <CompetitionTermsModal
        visible={showCompetitionTerms}
        onClose={() => setShowCompetitionTerms(false)}
        onAccept={() => {
          acceptCompetitionTerms();
          setShowCompetitionTerms(false);
          setError(null);
        }}
      />
    </KeyboardAvoidingAnimatedView>
  );
}
