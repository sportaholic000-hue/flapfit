import { TabSkyBackground } from '@/components/TabSkyBackground';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, type ImageSource } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { CompetitionTermsModal } from '@/components/CompetitionTermsModal';
import { prepareCompetitionEligibility } from '@/services/monetization';
import {
  FileText,
  RefreshCw,
  Trophy,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAvoidingAnimatedView from '@/components/KeyboardAvoidingAnimatedView';
import { ageProcessingAvailability } from '@/services/privacy/processingAvailability';
import { getProcessingAccess, getProcessingInputs, setProcessingChoice, subscribeProcessingAccess } from '@/services/privacy/processingAccess';
import { PROCESSING_NOTICE_VERSION } from '@/services/privacy/processingPolicy';
import {
  competitionIsConfigured,
  competitionPlayerNameError,
  competitionRequest,
  consumeCompetitionSubmissionNotices,
  flushPendingCompetitionResults,
  normalizeCompetitionPlayerName,
  saveCompetitionPlayerName,
} from '@/services/competitionApi';
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
  rank: number;
};

type LeaderboardExercise = 'pushups' | 'squats' | 'pullups';

const BOARD_TABS: {
  key: LeaderboardExercise;
  label: string;
  imageSource: ImageSource;
}[] = [
  {
    key: 'pushups',
    label: 'Push-ups',
    imageSource: EXERCISE_IMAGES.pushups,
  },
  {
    key: 'squats',
    label: 'Squats',
    imageSource: EXERCISE_IMAGES.squats,
  },
  {
    key: 'pullups',
    label: 'Pull-ups',
    imageSource: EXERCISE_IMAGES.pullups,
  },
];

type ModerationTarget = {
  profileId: string;
  playerName: string;
  contextType: 'leaderboard';
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
      'Their leaderboard scores will be hidden from you. You can reset your online identity from Info if needed.',
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

// ─── Leaderboard Panel ────────────────────────────────────────────────────────
function LeaderboardPanel({
  exercise,
  termsAccepted,
  processingAllowed,
}: {
  exercise: LeaderboardExercise;
  termsAccepted: boolean;
  processingAllowed: boolean;
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
    enabled: competitionIsConfigured && termsAccepted && processingAllowed,
    staleTime: 30000,
  });

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    if (refreshing || !processingAllowed) return;
    setRefreshing(true);
    try {
      const flushed = await flushPendingCompetitionResults();
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      if (flushed.pending > 0) Alert.alert('Scores still pending', 'Check your connection and tap Refresh to try again. Your local progress is safe.');
      if (flushed.rejected.length > 0) Alert.alert('Some scores were not published', flushed.rejected.map((notice) => notice.message).join('\n'));
    } catch {
      Alert.alert('Could not refresh', 'Check your connection and try again. Your saved results remain on this device.');
    } finally { setRefreshing(false); }
  };
  const rows = data ?? [];
  const myRow = rows.find((r) => r.is_me) ?? null;

  const rankMedals = ['🥇', '🥈', '🥉'];

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
        <Text style={{ color: '#06223D', fontWeight: '900', fontSize: 15 }}>
          Online competition is temporarily unavailable
        </Text>
        <Text style={{ color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 5 }}>
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
        <Text style={{ color: '#06223D', fontWeight: '900', fontSize: 15 }}>
          Accept the competition rules to connect
        </Text>
        <Text style={{ color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 5 }}>
          No anonymous online account or competition request starts until you accept the current
          Terms of Use and community rules above.
        </Text>
        {ageProcessingAvailability() ? <Text style={{ color: '#475569', fontSize: 13, marginTop: 10 }}>
          {ageProcessingAvailability()}
        </Text> : null}
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
        <Text accessibilityRole="header" style={{ flex: 1, fontWeight: '900', color: '#06223D', fontSize: 17, textAlign: 'center' }}>
          {tab.label} Board
        </Text>
        <View style={{ width: 72, alignItems: 'flex-end' }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh scores and retry pending results"
            disabled={refreshing}
            onPress={() => void refresh()}
          >
            <RefreshCw size={15} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {!processingAllowed ? <Text style={{ color: '#475569', fontSize: 13, marginVertical: 10 }}>
        {ageProcessingAvailability() ?? 'Online competition is unavailable until age and regional privacy checks are satisfied. Local play and saved progress remain available.'}
      </Text> : null}
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
            You're #{myRow.rank} · {myRow.score} pipes
          </Text>
        </View>
      )}

      {/* Rows */}
      {isLoading ? (
        <Text style={{ color: '#475569', paddingVertical: 12, fontSize: 13 }}>Loading…</Text>
      ) : isError ? (
        <Text style={{ color: '#DC2626', fontSize: 12, paddingVertical: 12 }}>
          Could not load scores — tap Refresh to retry.
        </Text>
      ) : rows.length === 0 ? (
        <Text style={{ color: '#475569', paddingVertical: 12, fontSize: 13, lineHeight: 18 }}>
          No scores yet.{'\n'}Play Endless with {tab.label} to be first!
        </Text>
      ) : (
        rows.slice(0, 50).map((row, idx) => {
          const isMe = row.is_me;
          return (
            <View
              key={row.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 9,
                borderBottomWidth: idx < Math.min(rows.length, 50) - 1 ? 1 : 0,
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
                {row.rank <= 3 ? (
                  <Text accessibilityLabel={`Rank ${row.rank}`} style={{ fontSize: 24, textAlign: 'center' }}>
                    {rankMedals[row.rank - 1]}
                  </Text>
                ) : (
                  <Text style={{ color: '#475569', fontWeight: '800', fontSize: 12 }}>
                    {row.rank}
                  </Text>
                )}
              </View>
              {/* Name */}
              <Text
                style={{
                  flex: 1,
                  fontWeight: isMe ? '900' : '600',
                  color: isMe ? '#B45309' : '#06223D',
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
                <Text style={{ fontWeight: '900', color: '#06223D', fontSize: 14 }}>
                  {row.score}
                </Text>
                <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600' }}>pipes</Text>
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const competitionTermsVersion = useGameStore((s) => s.competitionTermsVersion);
  const acceptCompetitionTerms = useGameStore((s) => s.acceptCompetitionTerms);
  const hydrated = useGameStore((s) => s.hydrated);
  const processingAccess = useSyncExternalStore(subscribeProcessingAccess, getProcessingAccess, getProcessingAccess);
  const acceptingTerms = useRef(false);
  const savingName = useRef(false);

  const [nameDraft, setNameDraft] = useState(playerName);
  const hasLoadedNameDraft = useRef(false);
  const [nameSaveState, setNameSaveState] = useState<'idle' | 'saved' | 'invalid' | 'saving' | 'online'>('idle');
  const [nameSaveError, setNameSaveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boardTab, setBoardTab] = useState<LeaderboardExercise>('pushups');
  const [showCompetitionTerms, setShowCompetitionTerms] = useState(false);
  const [termsHostOpen, setTermsHostOpen] = useState(false);
  const termsDismissed = useCallback(() => setTermsHostOpen(false), []);

  const hasName = competitionPlayerNameError(playerName) === null;
  const competitionChoice = getProcessingInputs().choices.competition;
  const hasAcceptedCompetitionTerms = competitionTermsVersion === COMPETITION_TERMS_VERSION
    && competitionChoice.decision === 'granted' && competitionChoice.noticeVersion === PROCESSING_NOTICE_VERSION;

  useFocusEffect(useCallback(() => {
    let focused = true;
    // iOS must dismiss the terms host before an Apple age sheet may present.
    // Existing accepted users also get this check without visiting a game result.
    if (competitionIsConfigured && hydrated && hasAcceptedCompetitionTerms && !termsHostOpen) {
      void prepareCompetitionEligibility(() => focused).catch(() => {
        if (focused) setError('Online eligibility could not be confirmed. Local play is still available.');
      });
    }
    return () => { focused = false; };
  }, [hydrated, hasAcceptedCompetitionTerms, termsHostOpen]));

  // The persisted store hydrates asynchronously. Reflect the stored name once
  // it arrives exactly once. Subsequent store updates must not overwrite text
  // while the player is editing the field.
  useEffect(() => {
    if (!hydrated || hasLoadedNameDraft.current) return;
    hasLoadedNameDraft.current = true;
    setNameDraft(playerName);
    if (playerName.trim().length > 0) setNameSaveState('saved');
  }, [hydrated, playerName]);

  useEffect(() => {
    if (!competitionIsConfigured || !hasAcceptedCompetitionTerms || !processingAccess.competition.allowed) return;
    void consumeCompetitionSubmissionNotices().then((notices) => {
      const first = notices[0];
      if (first) {
        setError(`An earlier online result was not published: ${first.message}`);
      }
    });
    void flushPendingCompetitionResults()
      .then((result) => {
        if (result.submitted > 0) {
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        }
        const firstRejection = result.rejected[0];
        if (firstRejection) {
          setError(`Online result was not published: ${firstRejection.message}`);
        }
      })
      .catch((flushError) => console.warn('Competition results remain queued', flushError));
  }, [hasAcceptedCompetitionTerms, processingAccess.competition.allowed, queryClient]);

  const saveName = async () => {
    if (!hydrated || savingName.current) return;
    const nextName = normalizeCompetitionPlayerName(nameDraft);
    setNameSaveError(null);
    if (competitionPlayerNameError(nextName)) {
      setNameSaveState('invalid');
      return;
    }
    if (!hasAcceptedCompetitionTerms || !processingAccess.competition.allowed || !competitionIsConfigured) {
      setNameDraft(nextName);
      setPlayerName(nextName);
      setNameSaveState('saved');
      return;
    }
    savingName.current = true;
    setNameSaveState('saving');
    try {
      const confirmedName = await saveCompetitionPlayerName(nextName);
      if (!getProcessingAccess().competition.allowed ||
          useGameStore.getState().competitionTermsVersion !== COMPETITION_TERMS_VERSION) {
        setNameSaveState('idle');
        return;
      }
      setNameDraft(confirmedName);
      setPlayerName(confirmedName);
      setNameSaveState('online');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    } catch (saveError) {
      setNameSaveState('invalid');
      setNameSaveError(saveError instanceof Error ? saveError.message : 'Could not save your player name. Try again.');
    } finally {
      savingName.current = false;
    }
  };

  return (
    <KeyboardAvoidingAnimatedView
      style={{ flex: 1, backgroundColor: '#F0F9FF' }}
      behavior="padding"
    >
      <TabSkyBackground screen="compete" />
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
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: 'LuckiestGuy_400Regular',
            fontSize: 34,
            textAlign: 'center',
            color: '#FFFFFF',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 0, height: 3 },
            textShadowRadius: 4,
          }}
        >
          Compete
        </Text>
        <Text style={{ color: '#06223D', fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center', marginTop: 2, marginBottom: 16 }}>
          Play endless mode to see how you rank
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
          <Text style={{ fontWeight: '800', color: '#06223D', fontSize: 15, textAlign: 'center' }}>
            Your player name
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              value={nameDraft}
              editable={hydrated && nameSaveState !== 'saving'}
              onChangeText={(value) => {
                setNameDraft(value);
                setNameSaveState('idle');
                setNameSaveError(null);
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
                color: '#06223D',
                fontWeight: '600',
              }}
            />
            <TouchableOpacity
              onPress={saveName}
              disabled={!hydrated || nameSaveState === 'saving'}
              accessibilityRole="button"
              accessibilityLabel="Save player name"
              style={{
                backgroundColor: '#F59E0B',
                borderRadius: 12,
                paddingHorizontal: 16,
                justifyContent: 'center',
                opacity: hydrated && nameSaveState !== 'saving' ? 1 : 0.55,
              }}
            >
              <Text style={{ color: '#06223D', fontWeight: '800' }}>{nameSaveState === 'saving' ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: nameSaveState === 'invalid' ? '#DC2626' : '#06223D',
              fontSize: 12,
              lineHeight: 17,
              textAlign: 'center',
              marginTop: 6,
            }}
          >
            {!hydrated
              ? 'Loading your saved player name…'
              : nameSaveState === 'invalid'
                ? nameSaveError ?? competitionPlayerNameError(nameDraft)
                : nameSaveState === 'saving'
                  ? 'Checking player name…'
                  : nameSaveState === 'online' && hasName
                    ? 'Player name saved as ' + playerName + '.'
                    : nameSaveState === 'saved' && hasName
                      ? 'Saved on this device as ' + playerName + '. Availability is checked when you go online.'
                      : 'Tap Save or Done on the keyboard to keep your leaderboard name.'}
          </Text>
        </View>

        {!hasAcceptedCompetitionTerms ? (
          <View style={{ backgroundColor: '#EFF6FF', borderRadius: 18, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <FileText size={20} color="#06223D" />
              <Text style={{ flex: 1, color: '#06223D', fontWeight: '900', fontSize: 14 }}>
                Accept the rules before publishing
              </Text>
            </View>
            <Text style={{ color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 7 }}>
              Player names and leaderboard scores can be public. Competition posts
              stay disabled until you accept the Terms of Use and community rules.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => { setTermsHostOpen(true); setShowCompetitionTerms(true); }}
              style={{ alignSelf: 'flex-start', marginTop: 10, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#06223D' }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Review and accept</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Global Leaderboards ─────────────────────────────────────────── */}
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: 28, alignItems: 'flex-start' }}><Trophy size={20} color="#F59E0B" /></View>
            <Text accessibilityRole="header" style={{ flexShrink: 1, fontWeight: '900', color: '#06223D', fontSize: 19, textAlign: 'center' }}>
              Global Leaderboards
            </Text>
            <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: 28, alignItems: 'flex-end' }}><Trophy size={20} color="#F59E0B" /></View>
          </View>
          <View accessible={false} importantForAccessibility="no" style={{ alignSelf: 'center', width: 48, height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 6, marginBottom: 8 }} />
          <Text style={{ color: '#06223D', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 12 }}>
            Body-weight exercises only for the fairest measure of effort.
          </Text>

          {/* Tab switcher */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#06223D',
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
                    color: boardTab === tab.key ? '#06223D' : '#FFFFFF',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <LeaderboardPanel exercise={boardTab} termsAccepted={hasAcceptedCompetitionTerms} processingAllowed={processingAccess.competition.allowed} />
        </View>

        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel="Competition rules & terms in Info, Your setup"
          onPress={() => router.push({ pathname: '/(tabs)/info', params: { section: 'competition-terms' } })}
          style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 12 }}
        >
          <Text style={{ color: '#06223D', fontSize: 13, fontWeight: '700' }}>Competition rules & terms</Text>
          <View accessible={false} style={{ height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 5, alignSelf: 'stretch' }} />
        </TouchableOpacity>
        {error && <Text style={{ color: '#DC2626', marginTop: 12, fontSize: 13 }}>{error}</Text>}
      </ScrollView>
      <CompetitionTermsModal
        visible={showCompetitionTerms}
        onDismiss={termsDismissed}
        onClose={() => setShowCompetitionTerms(false)}
        onAccept={async () => {
          if (acceptingTerms.current) return;
          acceptingTerms.current = true;
          try {
            // This existing affirmative disclosure covers competition only.
            // The central policy still enforces age/region/Apple restrictions.
            await setProcessingChoice('competition', 'granted');
            const choice = getProcessingInputs().choices.competition;
            if (choice.decision !== 'granted' || choice.noticeVersion !== PROCESSING_NOTICE_VERSION) return;
            acceptCompetitionTerms();
            setShowCompetitionTerms(false);
            setError(null);
          } catch {
            setError('Could not save competition acceptance. Please try again.');
          } finally { acceptingTerms.current = false; }
        }}
      />
    </KeyboardAvoidingAnimatedView>
  );
}
