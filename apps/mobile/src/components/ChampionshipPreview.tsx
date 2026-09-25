import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { AchievementCard } from './AchievementCard';
import { ChampionBadge, ChampionshipResultHeading } from './ChampionBadge';
import { RunCelebrations } from './RunCelebrations';
import { ACHIEVEMENTS, type StatsSnapshot } from '@/utils/game/achievements';
import { getBird } from '@/utils/game/birds';

const empty: StatsSnapshot = {
  tutStreak: 0,
  bestSingleScore: 0,
  unlockedLevel: 1,
  sessionsCount: 0,
  dailiesCompleted: 0,
  totalTutSeconds: 0,
  standardLevelBestScores: {},
  championUnlocked: false,
  exerciseTutSeconds: {},
};

// Isolated fixtures: never call store actions, gameplay, ad services or recording.
export function ChampionshipPreview() {
  const [ceremony, setCeremony] = useState<'champion' | 'both' | 'evolution' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [snapshot, setSnapshot] = useState<StatsSnapshot>({
    ...empty,
    unlockedLevel: 15,
    championUnlocked: true,
  });
  const [shareMessage, setShareMessage] = useState(false);
  const control = (label: string, press: () => void) => (
    <TouchableOpacity
      key={label}
      accessibilityRole="button"
      onPress={press}
      style={{ padding: 12, borderRadius: 12, backgroundColor: '#DBEAFE', marginBottom: 8 }}
    >
      <Text style={{ color: '#1D4ED8', fontWeight: '800' }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#F0F9FF', minHeight: 300 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A' }}>
          Championship preview
        </Text>
        <Text style={{ marginVertical: 12, color: '#475569' }}>
          Development only. Sample progress; nothing is saved.
        </Text>
        {control('First championship', () => {
          setShowResult(false);
          setCeremony('champion');
        })}
        {control('Evolution + championship', () => {
          setShowResult(false);
          setCeremony('both');
        })}
        {control('Evolution only', () => {
          setShowResult(false);
          setCeremony('evolution');
        })}
        {control('Repeat championship result', () => setShowResult(true))}
        {control('New player', () => setSnapshot(empty))}
        {control('Endless unlocked', () => setSnapshot({ ...empty, unlockedLevel: 6 }))}
        {control('Summit, not champion', () => setSnapshot({ ...empty, unlockedLevel: 15 }))}
        {control('Champion + five levels at 60', () =>
          setSnapshot({
            ...empty,
            unlockedLevel: 15,
            championUnlocked: true,
            standardLevelBestScores: { '1': 60, '2': 60, '3': 60, '4': 60, '5': 60, '15': 25 },
          })
        )}
        {control('All 15 levels at 60+', () =>
          setSnapshot({
            ...empty,
            unlockedLevel: 15,
            championUnlocked: true,
            standardLevelBestScores: Object.fromEntries(
              Array.from({ length: 15 }, (_, i) => [String(i + 1), i === 14 ? 85 : 60])
            ),
          })
        )}
        {snapshot.championUnlocked ? <ChampionBadge /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ACHIEVEMENTS.filter((a) => a.category === 'global').map((a) => (
            <AchievementCard key={a.id} achievement={a} snapshot={snapshot} />
          ))}
        </View>
      </ScrollView>
      {showResult && !ceremony ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0F172A',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <ChampionshipResultHeading />
            <Text style={{ color: '#F59E0B', fontSize: 26, fontWeight: '900', marginTop: 16 }}>
              25 pipes
            </Text>
            <Text style={{ color: '#64748B', textAlign: 'center', marginVertical: 16 }}>
              Preview of the championship result heading. In a real run, the existing results,
              recording/share and exit controls follow here.
            </Text>
            {control('Back to preview', () => setShowResult(false))}
          </View>
        </View>
      ) : null}
      {ceremony ? (
        <RunCelebrations
          key={ceremony}
          evolvedTo={ceremony === 'champion' ? null : 5}
          championship={ceremony !== 'evolution'}
          skin={getBird('sunny')}
          birdEvo={{ stage: 5, wings: 0, legs: 0, arms: 0, shoulders: 0 }}
          totalTutSeconds={7205}
          runTutSeconds={65}
          onShareEvolution={() => setShareMessage(true)}
          onComplete={() => {
            setCeremony(null);
            setShowResult(ceremony !== 'evolution');
            setShareMessage(false);
          }}
        />
      ) : null}
      {ceremony && shareMessage ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setShareMessage(false)}
          style={{
            position: 'absolute',
            top: 12,
            alignSelf: 'center',
            backgroundColor: '#FFFFFF',
            padding: 12,
            borderRadius: 12,
          }}
        >
          <Text>Preview: evolution share action received. Tap to dismiss.</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
