import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  KeyRound,
  Mail,
  MessageSquareWarning,
  Settings,
  Share2,
  ShieldCheck,
  Smartphone,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState, useSyncExternalStore } from 'react';
import { isAdPrivacyRequired, showAdPrivacyOptions, subscribeAdPrivacy } from '@/services/monetization';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BirdAvatar from '@/components/BirdAvatar';
import { RELEASE_LINKS } from '@/config/release';
import {
  competitionIsConfigured,
  deleteCompetitionIdentity,
  getCompetitionSupportId,
} from '@/services/competitionApi';
import { getBird } from '@/utils/game/birds';
import { EVO_NAMES, EVO_THRESHOLDS, useGameStore } from '@/utils/game/store';

const NAVY = '#0F172A';
const SKY = '#4AABDE';
const AMBER = '#F59E0B';

type ModalPage = 'privacy' | 'safety' | 'terms' | null;

const EXERCISE_SETUP = [
  ['Push-ups', 'Phone on the floor, 3 ft in front; keep your full body visible.'],
  ['Squats', 'Phone on the floor or a chair, 3–6 ft in front.'],
  [
    'Pull-ups',
    'Keep the phone still on a chair or higher, 4–6 ft in front. Start by grabbing the bar with both feet flat on the floor and visible. If the bar is too high, reach both hands up during setup, then jump to grab it. Lift your feet, settle into a hang, and pull your eye line to the bar for step 1. Lower to your comfortable hang for step 2. Straight or bent legs are fine while your feet stay off the floor.',
  ],
  ['Bicep curls', 'Phone on a chair or higher, 3–6 ft in front; keep both wrists visible.'],
  ['Lateral raises', 'Phone on a chair or higher, 4–6 ft in front; keep both arms visible.'],
  ['Shoulder press', 'Phone on a chair or higher, 4–6 ft in front; elbows must always be visible.'],
] as const;

function clock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function stageRange(index: number): string {
  const start = EVO_THRESHOLDS[index];
  if (index === EVO_THRESHOLDS.length - 1) return `${clock(start)}+`;
  return `${clock(start)}–${clock(EVO_THRESHOLDS[index + 1] - 1)}`;
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function NumberedStep({ number, children }: { number: number; children: ReactNode }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{children}</Text>
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={styles.actionRow}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color="#94A3B8" />
    </TouchableOpacity>
  );
}

function InfoModal({ page, onClose }: { page: Exclude<ModalPage, null>; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const title =
    page === 'privacy'
      ? 'Privacy & camera data'
      : page === 'safety'
        ? 'Fitness safety'
        : 'Terms of use';

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Close ${title}`}
            onPress={onClose}
            style={styles.closeButton}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + 28 }]}
        >
          {page === 'privacy' ? (
            <>
              <Text style={styles.modalHeading}>What the camera does</Text>
              <Text style={styles.modalText}>
                Flap Fit uses the front camera during a game to estimate body landmarks and turn
                your movement into bird movement. During normal Play, camera video is processed live
                on this device and is not recorded or uploaded by Flap Fit.
              </Text>
              <Text style={styles.modalHeading}>Record & Play</Text>
              <Text style={styles.modalText}>
                If you choose Record & Play, Flap Fit creates a composed gameplay video that can
                include your camera feed, bird, pipes, score, and microphone audio if you grant
                microphone permission. The file is kept only in the app's temporary cache so you can
                choose where to share it. Flap Fit does not upload the recording. The temporary file
                is removed when you leave the result screen or start another run. A service you
                choose in the share sheet receives the video under that service's privacy terms.
              </Text>
              <Text style={styles.modalHeading}>Tracking technology</Text>
              <Text style={styles.modalText}>
                The MediaPipe tracking engine and pose model are bundled inside Flap Fit and run on
                this device. The game does not download tracking code or send camera frames to a
                tracking service.
              </Text>
              <Text style={styles.modalHeading}>Progress data</Text>
              <Text style={styles.modalText}>
                Your bird choice, training history, scores, and level progress are stored locally on
                your phone. If you use online leaderboards, Flap Fit creates a private
                anonymous online identifier and sends your chosen player name, exercise, scores,
                active run duration, competition rules version, reports, and
                blocks to its Supabase-hosted game service. Active run duration is used to validate
                an eligible competition result. The service also processes ordinary connection and
                security logs. Your camera frames, gameplay recordings, and full local training
                history are not included.
              </Text>
              <Text style={styles.modalHeading}>Advertising and ad reporting</Text>
              <Text style={styles.modalText}>
                The installed app uses Google AdMob to show ads after eligible result-screen
                actions. AdMob may process device and app information, IP address and approximate
                location, diagnostics, and ad interactions. Flap Fit requests non-personalized ads
                and does not request access to your advertising identifier.
              </Text>
              <Text style={styles.modalText}>
                RevenueCat receives ad events such as loads, displays, clicks, and revenue, linked
                to a separate anonymous app identifier. Flap Fit does not attach your exercise,
                player name, scores, camera footage, recordings, or training history to these events.
                Where required, you can review advertising choices through Ad privacy settings in
                Info. Camera and microphone permissions remain separate from advertising choices.
              </Text>
              <Text style={styles.modalHeading}>Public content and moderation</Text>
              <Text style={styles.modalText}>
                Player names and competition results can be visible to other players. You can report
                or block another player from the options beside public leaderboard results. Reported content may be removed and abusive
                access may be restricted. Pending
                moderation reports remain until review, then resolved reports are kept for up to 180
                days. If an associated account is deleted sooner, its user identifier is removed
                from the report.
              </Text>
              <Text style={styles.modalHeading}>Your control</Text>
              <Text style={styles.modalText}>
                Camera access begins only after you grant permission and enter a game. You can
                change the permission at any time in your phone settings.
              </Text>
            </>
          ) : page === 'safety' ? (
            <>
              <Text style={styles.modalHeading}>Train safely</Text>
              <Text style={styles.modalText}>
                Flap Fit is a fitness game, not a medical device. It does not diagnose, treat, cure,
                or prevent any medical condition. Talk with a qualified health professional before
                starting a new exercise program, especially if you have an injury or health concern.
              </Text>
              <Text style={styles.modalHeading}>Before each session</Text>
              <Text style={styles.modalText}>
                Use a clear, non-slip area. Secure the phone so it cannot fall. Use equipment only
                as intended, warm up, and choose a level appropriate for your ability.
              </Text>
              <Text style={styles.modalHeading}>Stop when needed</Text>
              <Text style={styles.modalText}>
                Stop exercising and seek appropriate help if you feel pain, dizziness, faintness,
                unusual shortness of breath, or any other concerning symptom. Never prioritize an
                in-game score over safe form.
              </Text>
              <Text style={styles.modalHeading}>Exercise risk and responsibility</Text>
              <Text style={styles.modalText}>
                Exercise involves risk. You are responsible for choosing safe movements, equipment,
                surroundings, and effort for your ability. To the fullest extent permitted by law,
                Flap Fit and its owner or operator are not responsible for injuries or losses
                arising from gameplay or exercise. This does not limit rights or liability that
                applicable law does not allow to be excluded.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.modalHeading}>Using Flap Fit</Text>
              <Text style={styles.modalText}>
                Flap Fit is a fitness game for personal, non-commercial use. Game scores, motion
                tracking, and training-time totals are estimates and may be affected by lighting,
                camera placement, device performance, or movement outside the frame.
              </Text>
              <Text style={styles.modalHeading}>Acceptable use</Text>
              <Text style={styles.modalText}>
                Use Flap Fit lawfully and safely. Online competition requires acceptance of the
                current Terms of Use and community rules before you can publish a player name or
                leaderboard score.
              </Text>
              <Text style={styles.modalHeading}>Competition community rules</Text>
              <Text style={styles.modalText}>
                Do not use player names or competition features for sexual or obscene content, hate
                or discrimination, threats, harassment, bullying, impersonation, fraud, spam,
                unlawful content, cheating, score manipulation, unauthorized access, or attempts to
                disrupt the service. Flap Fit may filter, hide, remove, or restrict content or
                accounts that break these rules.
              </Text>
              <Text style={styles.modalHeading}>Reporting and blocking</Text>
              <Text style={styles.modalText}>
                Clearly labeled Report / Block controls are available beside other players' public
                leaderboard results. Reports may be reviewed and
                actioned, and blocked players are hidden from your leaderboards.
                Contact support if an urgent safety issue or illegal content needs attention.
              </Text>
              <Text style={styles.modalHeading}>Service changes</Text>
              <Text style={styles.modalText}>
                Features and online services may be changed, suspended, or discontinued. Your phone
                is responsible for locally stored progress, so deleting Flap Fit or clearing its
                data may permanently remove that progress.
              </Text>
              <Text style={styles.modalHeading}>Exercise risk and liability</Text>
              <Text style={styles.modalText}>
                Exercise involves risk. You are responsible for choosing safe movements, equipment,
                surroundings, and effort for your ability. To the fullest extent permitted by law,
                Flap Fit and its owner or operator are not liable for injuries or losses arising
                from gameplay or exercise. Nothing in these terms excludes rights, remedies, or
                liability that applicable law does not allow to be excluded.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function InfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [modalPage, setModalPage] = useState<ModalPage>(null);
  const [onlineDeleteBusy, setOnlineDeleteBusy] = useState(false);
  const adPrivacyRequired = useSyncExternalStore(subscribeAdPrivacy, isAdPrivacyRequired, () => false);
  const [adPrivacyBusy, setAdPrivacyBusy] = useState(false);
  const openAdPrivacy = async () => {
    if (adPrivacyBusy) return;
    setAdPrivacyBusy(true);
    try { await showAdPrivacyOptions(); }
    catch { Alert.alert('Privacy settings unavailable', 'Please try again when online. Gameplay is still available.'); }
    finally { setAdPrivacyBusy(false); }
  };
  const queryClient = useQueryClient();
  const birdId = useGameStore((state) => state.birdId);
  const resetCompetitionProfile = useGameStore((state) => state.resetCompetitionProfile);
  const supportEmail = RELEASE_LINKS.supportEmail;
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const skin = getBird(birdId);
  const bugReportDetails = [
    'What happened:',
    '',
    'Steps to reproduce:',
    '',
    'Flap Fit version: ' + version,
    'Device: ' + Platform.OS + ' ' + String(Platform.Version),
  ].join('\n');

  const emailSupport = async (kind: 'contact' | 'bug') => {
    if (!supportEmail) {
      Alert.alert(
        'Support address needed',
        'No real Flap Fit support email is configured yet. One must be connected before launch; no message was sent.'
      );
      return;
    }
    const subject = kind === 'bug' ? 'Flap Fit bug report' : 'Flap Fit support';
    const details = kind === 'bug' ? '\n\n' + bugReportDetails : '';
    const url = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(details)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open email', `Email us at ${supportEmail}.`);
    }
  };

  const openReleasePage = async (title: string, url: string) => {
    if (!url) {
      Alert.alert(
        `${title} is not connected`,
        'This public link must be configured before release.'
      );
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(`Could not open ${title.toLowerCase()}`, url);
    }
  };

  const shareApp = async () => {
    const storeUrl = Platform.OS === 'ios' ? RELEASE_LINKS.iosAppUrl : RELEASE_LINKS.androidAppUrl;
    const shareUrl = storeUrl || RELEASE_LINKS.marketingUrl;
    try {
      await Share.share({
        title: 'Flap Fit',
        message: [
          'Check out Flap Fit, a fitness game where your body is the controller. Are you up for the challenge?',
          shareUrl,
        ]
          .filter(Boolean)
          .join('\n\n'),
      });
    } catch {
      Alert.alert('Could not open sharing', 'Please try again.');
    }
  };

  const reportBug = () => {
    if (!supportEmail) {
      Alert.alert(
        'Support address needed',
        'No real Flap Fit support email is configured yet. One must be connected before launch.'
      );
      return;
    }

    Alert.alert('Report a bug', 'Send a prefilled report to ' + supportEmail + '.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share report',
        onPress: () => {
          void Share.share({
            title: 'Flap Fit bug report',
            message: ['Send to: ' + supportEmail, bugReportDetails].join('\n\n'),
          }).catch(() =>
            Alert.alert('Could not open sharing', 'Email us at ' + supportEmail + '.')
          );
        },
      },
      {
        text: 'Open email',
        onPress: () => void emailSupport('bug'),
      },
    ]);
  };

  const shareCompetitionSupportId = async () => {
    try {
      const supportId = await getCompetitionSupportId();
      if (!supportId) {
        Alert.alert(
          'No online profile yet',
          'A support ID is available after you accept the Competition Terms and use Compete.'
        );
        return;
      }
      await Share.share({
        title: 'Flap Fit online profile support ID',
        message: [
          `Flap Fit online profile support ID: ${supportId}`,
          'This reference identifies a profile; it is not secret and does not prove ownership. Use Info > Delete online profile on the original device to authorize deletion.',
        ].join('\n\n'),
      });
    } catch {
      Alert.alert(
        'Support ID unavailable',
        'Please check your connection and try again before contacting support.'
      );
    }
  };

  const deleteOnlineProfile = () => {
    if (!competitionIsConfigured || onlineDeleteBusy) return;
    Alert.alert(
      'Delete online profile?',
      'This permanently deletes your anonymous leaderboard scores, blocks, player name, and any older online game data. Moderation reports may remain until review and for up to 180 days after resolution for safety, with your user identifier removed. Local game progress stays on this phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setOnlineDeleteBusy(true);
            void deleteCompetitionIdentity()
              .then(() => {
                resetCompetitionProfile();
                queryClient.removeQueries({ queryKey: ['leaderboard'] });
                Alert.alert(
                  'Online profile deleted',
                  'Your local game progress was not removed. To use Compete again, you must accept the current Terms and create a new player name.'
                );
              })
              .catch(() =>
                Alert.alert(
                  'Deletion not confirmed',
                  'The connection may have been interrupted. Try Delete online profile again to check and finish cleanup, or contact support. Your local game progress is safe.'
                )
              )
              .finally(() => setOnlineDeleteBusy(false));
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <View style={styles.heroIcon}>
          <CircleHelp size={30} color={NAVY} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>INFO & HELP</Text>
          <Text style={styles.heroSubtitle}>Camera setup, evolution, safety, and support</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        <Section title="Getting started" icon={<CircleHelp size={23} color={AMBER} />}>
          <ActionRow
            icon={<CircleHelp size={21} color="#2563EB" />}
            title="View introduction again"
            subtitle="Review bird choice, phone placement, and calibration"
            onPress={() => router.push({ pathname: '/onboarding', params: { preview: '1' } })}
          />
        </Section>

        <Section title="Camera setup" icon={<Camera size={23} color={AMBER} />}>
          <NumberedStep number={1}>
            Prop your phone upright and stable. Use bright, even light and keep the camera lens
            clear.
          </NumberedStep>
          <NumberedStep number={2}>
            Choose your exercise before pressing Play. Keep the joints used by that exercise in
            frame.
          </NumberedStep>
          <NumberedStep number={3}>
            Calibration Step 1 is always the top position of your exercise, and Step 2 is always the
            bottom position. The first position appears for two seconds before calibration can begin.
            Hold the first position until the bar fills, then hold the second position until the bar
            fills again. After the 3-second countdown, the bird follows that calibrated range.
          </NumberedStep>
          <NumberedStep number={4}>
            Keep the required joints in frame during play. Pipes keep moving if tracking is lost.
            Sustained tracking loss or a detected form failure makes the bird fall until it crashes.
          </NumberedStep>
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Fast calibration tip</Text>
            <Text style={styles.tipText}>
              Use the two-second preparation window to read Step 1 and get fully into position. The
              calibration bar stays locked until that window ends.
            </Text>
          </View>
          {EXERCISE_SETUP.map(([name, setup]) => (
            <View key={name} style={styles.setupRow}>
              <Text style={styles.setupName}>{name}</Text>
              <Text style={styles.setupText}>{setup}</Text>
            </View>
          ))}
        </Section>

        <Section title="Bird evolution" icon={<Clock3 size={23} color={AMBER} />}>
          <Text style={styles.bodyText}>
            Your lifetime tracked training time moves your bird through ten stages. The stage names
            and times below come directly from the same rules used by the game.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Swipe the bird images below to see the stages of evolution.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.evolutionPreviewRow}
          >
            {EVO_NAMES.map((name, index) => (
              <View
                key={`preview-${name}`}
                style={[styles.evolutionPreviewCard, index === 9 && styles.finalEvolutionCard]}
              >
                <BirdAvatar
                  skin={skin}
                  size={92}
                  evo={{ stage: index, wings: 0, legs: 0, arms: 0, shoulders: 0 }}
                />
                <Text style={styles.evolutionPreviewStage}>STAGE {index + 1}</Text>
                <Text numberOfLines={1} style={styles.evolutionPreviewName}>
                  {name}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.stageTable}>
            {EVO_NAMES.map((name, index) => (
              <View
                key={name}
                style={[
                  styles.stageRow,
                  index === EVO_NAMES.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>{index + 1}</Text>
                </View>
                <Text style={styles.stageName}>{name}</Text>
                <Text style={styles.stageTime}>{stageRange(index)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.noticeBox}>
            <TriangleAlert size={20} color="#92400E" />
            <Text style={styles.noticeText}>
              This total is active in-game training time after calibration. It is not verified
              time-under-tension or a medical measurement.
            </Text>
          </View>
          <Text style={[styles.bodyText, { marginTop: 12 }]}>
            After 5 inactive days, the displayed stage drops by one; after 7 days, it drops by two.
            Your earned time is not erased, and your full stage returns when you train again.
          </Text>
        </Section>

        <Section
          title="Privacy, safety & permissions"
          icon={<ShieldCheck size={23} color={AMBER} />}
        >
          <ActionRow
            icon={<ShieldCheck size={21} color="#2563EB" />}
            title="Privacy & camera data"
            subtitle="Plain-language data and recording summary"
            onPress={() => setModalPage('privacy')}
          />
          <ActionRow
            icon={<FileText size={21} color="#2563EB" />}
            title="Full privacy policy"
            subtitle={RELEASE_LINKS.privacyUrl || 'Public link required before release'}
            onPress={() => void openReleasePage('Privacy policy', RELEASE_LINKS.privacyUrl)}
          />
          {adPrivacyRequired ? (
            <ActionRow
              icon={<ShieldCheck size={21} color="#2563EB" />}
              title="Ad privacy settings"
              subtitle={adPrivacyBusy ? 'Opening privacy settings…' : 'Review or change your advertising choices'}
              onPress={() => void openAdPrivacy()}
            />
          ) : null}
          <ActionRow
            icon={<TriangleAlert size={21} color="#EA580C" />}
            title="Fitness safety"
            subtitle="Important training and medical disclaimer"
            onPress={() => setModalPage('safety')}
          />
          <ActionRow
            icon={<FileText size={21} color="#0284C7" />}
            title="Terms of use"
            subtitle="Rules for using Flap Fit"
            onPress={() => setModalPage('terms')}
          />
          <ActionRow
            icon={<FileText size={21} color="#0284C7" />}
            title="Full terms"
            subtitle={RELEASE_LINKS.termsUrl || 'Public link required before release'}
            onPress={() => void openReleasePage('Terms', RELEASE_LINKS.termsUrl)}
          />
          <ActionRow
            icon={<Trash2 size={21} color="#DC2626" />}
            title="Account & data deletion"
            subtitle={
              RELEASE_LINKS.accountDeletionUrl || 'Public deletion page required before release'
            }
            onPress={() =>
              void openReleasePage('Account deletion', RELEASE_LINKS.accountDeletionUrl)
            }
          />
          <ActionRow
            icon={<Settings size={21} color="#475569" />}
            title="Camera permission settings"
            subtitle="Open this app's system settings"
            onPress={() => void Linking.openSettings()}
          />
        </Section>

        <Section title="Support & sharing" icon={<Smartphone size={23} color={AMBER} />}>
          <ActionRow
            icon={<Mail size={21} color="#2563EB" />}
            title="Contact us"
            subtitle={supportEmail || 'Support address must be connected before launch'}
            onPress={() => void emailSupport('contact')}
          />
          <ActionRow
            icon={<MessageSquareWarning size={21} color="#DC2626" />}
            title="Report a bug"
            subtitle="Send the steps and your phone details"
            onPress={reportBug}
          />
          <ActionRow
            icon={<Share2 size={21} color="#16A34A" />}
            title="Share Flap Fit"
            subtitle="Open your phone's share sheet"
            onPress={() => void shareApp()}
          />
          {competitionIsConfigured ? (
            <ActionRow
              icon={<KeyRound size={21} color="#2563EB" />}
              title="Online profile support ID"
              subtitle="Use only for support or deletion requests"
              onPress={() => void shareCompetitionSupportId()}
            />
          ) : null}
          {competitionIsConfigured ? (
            <ActionRow
              icon={<Trash2 size={21} color="#DC2626" />}
              title="Delete online profile"
              subtitle={
                onlineDeleteBusy
                  ? 'Deleting online competition data…'
                  : 'Permanently remove your online profile and scores'
              }
              onPress={deleteOnlineProfile}
            />
          ) : null}
        </Section>

        <View style={styles.versionCard}>
          <Text style={styles.versionName}>Flap Fit</Text>
          <Text style={styles.versionText}>Version {version}</Text>
        </View>
      </ScrollView>

      {modalPage ? <InfoModal page={modalPage} onClose={() => setModalPage(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 24, letterSpacing: 0.4 },
  heroSubtitle: { color: '#CBD5E1', fontWeight: '600', fontSize: 12, marginTop: 3 },
  content: { padding: 16, gap: 14 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 },
  sectionTitle: { color: NAVY, fontWeight: '900', fontSize: 17 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 12 },
  stepNumber: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  stepText: { flex: 1, color: '#334155', fontSize: 13, lineHeight: 19, fontWeight: '500' },
  tipBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  tipTitle: { color: '#92400E', fontWeight: '900', fontSize: 13 },
  tipText: { color: '#92400E', fontSize: 12, lineHeight: 17, marginTop: 3 },
  setupRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingVertical: 10 },
  setupName: { color: NAVY, fontWeight: '800', fontSize: 13 },
  setupText: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 2 },
  bodyText: { color: '#475569', fontSize: 13, lineHeight: 19 },
  evolutionPreviewRow: { gap: 10, paddingTop: 13, paddingBottom: 2 },
  evolutionPreviewCard: {
    width: 116,
    minHeight: 144,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 7,
  },
  finalEvolutionCard: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B', borderWidth: 2 },
  evolutionPreviewStage: { color: '#075985', fontSize: 10, fontWeight: '900', marginTop: 4 },
  evolutionPreviewName: { color: NAVY, fontSize: 11, fontWeight: '800', marginTop: 2 },
  stageTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginTop: 13,
    overflow: 'hidden',
  },
  stageRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stageBadge: {
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: SKY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  stageBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  stageName: { flex: 1, color: NAVY, fontWeight: '800', fontSize: 13 },
  stageTime: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  noticeBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  noticeText: { flex: 1, color: '#92400E', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 11,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  actionSubtitle: { color: '#64748B', fontSize: 11, lineHeight: 15, marginTop: 2 },
  versionCard: { alignItems: 'center', paddingVertical: 8 },
  versionName: { color: NAVY, fontWeight: '900', fontSize: 14 },
  versionText: { color: '#64748B', fontSize: 11, marginTop: 2 },
  modalRoot: { flex: 1, backgroundColor: NAVY },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { flex: 1, color: '#FFFFFF', fontWeight: '900', fontSize: 21 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  modalBody: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 21,
  },
  modalHeading: {
    color: NAVY,
    fontWeight: '900',
    fontSize: 16,
    marginTop: 13,
    marginBottom: 6,
  },
  modalText: { color: '#475569', fontSize: 14, lineHeight: 21 },
});
