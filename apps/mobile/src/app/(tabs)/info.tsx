import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import {
  Camera,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Mail,
  MessageSquareWarning,
  Settings,
  Share2,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BirdAvatar from '@/components/BirdAvatar';
import { getBird } from '@/utils/game/birds';
import {
  EVO_NAMES,
  EVO_THRESHOLDS,
  useGameStore,
} from '@/utils/game/store';

const NAVY = '#0F172A';
const SKY = '#4AABDE';
const AMBER = '#F59E0B';

type ModalPage = 'privacy' | 'safety' | 'terms' | null;

const EXERCISE_SETUP = [
  ['Push-ups', 'Phone on the floor, 1–1.5 m in front; keep your full body visible.'],
  ['Squats', 'Phone stable at knee height, 1.5–2 m in front.'],
  ['Pull-ups', 'Phone on a stable chair or stand, facing the bar and your full range.'],
  ['Bicep curls', 'Phone at waist height, 1–1.5 m in front; keep both wrists visible.'],
  ['Lateral raises', 'Phone at chest height, about 2 m in front; keep both wrists visible.'],
  ['Shoulder press', 'Phone at chest height, 1.5–2 m in front; keep hands visible overhead.'],
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

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
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
                Flap Fit uses the front camera during a game to estimate body landmarks and turn your
                movement into bird movement. Video is processed live on this device. Flap Fit does not
                record, save, or upload camera video.
              </Text>
              <Text style={styles.modalHeading}>Tracking technology</Text>
              <Text style={styles.modalText}>
                The app downloads its MediaPipe tracking engine and pose model from third-party content
                delivery services. Those services may receive ordinary connection information, such as an
                IP address, when the files are requested. Camera frames are not sent with those requests.
              </Text>
              <Text style={styles.modalHeading}>Progress data</Text>
              <Text style={styles.modalText}>
                Your bird choice, training history, scores, and level progress are stored locally on your
                phone. If you use online leaderboards or challenges, Flap Fit can send your chosen player
                name, device identifier, exercise, challenge code, target, and score to its game service.
                Camera video is never included. Advertising, accounts, or analytics will require this
                disclosure and the public privacy policy to be updated before release.
              </Text>
              <Text style={styles.modalHeading}>Your control</Text>
              <Text style={styles.modalText}>
                Camera access begins only after you grant permission and enter a game. You can change the
                permission at any time in your phone settings.
              </Text>
            </>
          ) : page === 'safety' ? (
            <>
              <Text style={styles.modalHeading}>Train safely</Text>
              <Text style={styles.modalText}>
                Flap Fit is a fitness game, not a medical device. It does not diagnose, treat, cure, or
                prevent any medical condition. Talk with a qualified health professional before starting
                a new exercise program, especially if you have an injury or health concern.
              </Text>
              <Text style={styles.modalHeading}>Before each session</Text>
              <Text style={styles.modalText}>
                Use a clear, non-slip area. Secure the phone so it cannot fall. Use equipment only as
                intended, warm up, and choose a level appropriate for your ability.
              </Text>
              <Text style={styles.modalHeading}>Stop when needed</Text>
              <Text style={styles.modalText}>
                Stop exercising and seek appropriate help if you feel pain, dizziness, faintness, unusual
                shortness of breath, or any other concerning symptom. Never prioritize an in-game score
                over safe form.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.modalHeading}>Test-build notice</Text>
              <Text style={styles.modalText}>
                This is a development version of Flap Fit. Features, scoring, exercise tracking, and stored
                data may change before public release.
              </Text>
              <Text style={styles.modalHeading}>Acceptable use</Text>
              <Text style={styles.modalText}>
                Use Flap Fit lawfully and safely. Do not misuse competitive features, interfere with the
                service, attempt unauthorized access, or submit harmful or abusive material.
              </Text>
              <Text style={styles.modalHeading}>Before launch</Text>
              <Text style={styles.modalText}>
                Final terms, a developer identity, governing law, support contact, and public policy URLs
                must be supplied before App Store or Google Play submission. This test-build summary is not
                the final legal agreement.
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
  const [modalPage, setModalPage] = useState<ModalPage>(null);
  const birdId = useGameStore((state) => state.birdId);
  const supportEmail = String(Constants.expoConfig?.extra?.supportEmail ?? '').trim();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const skin = getBird(birdId);

  const emailSupport = async (kind: 'contact' | 'bug') => {
    if (!supportEmail) {
      Alert.alert(
        'Support address needed',
        'No real Flap Fit support email is configured yet. One must be connected before launch; no message was sent.'
      );
      return;
    }
    const subject = kind === 'bug' ? 'Flap Fit bug report' : 'Flap Fit support';
    const details =
      kind === 'bug' ? '\n\nWhat happened:\n\nSteps to reproduce:\n\nPhone and OS:' : '';
    const url = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(details)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open email', `Email us at ${supportEmail}.`);
    }
  };

  const shareApp = async () => {
    try {
      await Share.share({
        title: 'Flap Fit',
        message: 'Check out Flap Fit — a fitness game where your body controls the bird.',
      });
    } catch {
      Alert.alert('Could not open sharing', 'Please try again.');
    }
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
        <Section title="Camera setup" icon={<Camera size={23} color={AMBER} />}>
          <NumberedStep number={1}>
            Prop your phone upright and stable. Use bright, even light and keep the camera lens clear.
          </NumberedStep>
          <NumberedStep number={2}>
            Choose your exercise before pressing Play. Keep the joints used by that exercise in frame.
          </NumberedStep>
          <NumberedStep number={3}>
            Hold the first position shown until the bar fills, then hold the second position. After the
            3-second countdown, the bird follows that calibrated range.
          </NumberedStep>
          <NumberedStep number={4}>
            If tracking pauses, return to the center of the frame and hold still. The game resumes when
            tracking is reliable again.
          </NumberedStep>
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Fast calibration tip</Text>
            <Text style={styles.tipText}>
              Read the two positions below before pressing Play so you are ready when calibration begins.
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
            Your lifetime tracked training time moves your bird through ten stages. The stage names and
            times below come directly from the same rules used by the game.
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
                style={[styles.stageRow, index === EVO_NAMES.length - 1 && { borderBottomWidth: 0 }]}
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
              Current test build: this total is active in-game training time after calibration, not yet
              verified time-under-tension or a medical measurement.
            </Text>
          </View>
          <Text style={[styles.bodyText, { marginTop: 12 }]}>
            After 5 inactive days, the displayed stage drops by one; after 7 days, it drops by two. Your
            earned time is not erased, and your full stage returns when you train again.
          </Text>
        </Section>

        <Section title="Privacy, safety & permissions" icon={<ShieldCheck size={23} color={AMBER} />}>
          <ActionRow
            icon={<ShieldCheck size={21} color="#2563EB" />}
            title="Privacy & camera data"
            subtitle="What is processed, saved, and downloaded"
            onPress={() => setModalPage('privacy')}
          />
          <ActionRow
            icon={<TriangleAlert size={21} color="#EA580C" />}
            title="Fitness safety"
            subtitle="Important training and medical disclaimer"
            onPress={() => setModalPage('safety')}
          />
          <ActionRow
            icon={<FileText size={21} color="#0284C7" />}
            title="Terms of use"
            subtitle="Current test-build terms summary"
            onPress={() => setModalPage('terms')}
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
            onPress={() => void emailSupport('bug')}
          />
          <ActionRow
            icon={<Share2 size={21} color="#16A34A" />}
            title="Share Flap Fit"
            subtitle="Open your phone's share sheet"
            onPress={() => void shareApp()}
          />
        </Section>

        <View style={styles.versionCard}>
          <Text style={styles.versionName}>Flap Fit</Text>
          <Text style={styles.versionText}>Version {version} · Expo test build</Text>
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
