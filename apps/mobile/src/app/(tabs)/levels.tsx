import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Camera,
  CheckCircle2,
  Infinity as InfinityIcon,
  Lock,
  Play,
  Star,
  Sun,
  Video,
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEVELS } from '@/utils/game/levels';
import { isEndlessUnlocked, useGameStore } from '@/utils/game/store';

const ACCENT_BLUE = '#0284C7';

export default function LevelsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unlockedLevel = useGameStore((s) => s.unlockedLevel);
  const bestScores = useGameStore((s) => s.bestScores);
  const endlessBest = useGameStore((s) => s.endlessBest);
  const endlessOpen = isEndlessUnlocked(unlockedLevel);
  const [backgroundMode, setBackgroundMode] = useState<'sky' | 'camera'>('sky');
  const [runMode, setRunMode] = useState<'play' | 'record'>('play');

  const withGameOptions = (params: Record<string, string>) => ({
    ...params,
    backgroundMode,
    ...(__DEV__ ? { trackingMode: 'form-test' } : {}),
    ...(backgroundMode === 'camera' && runMode === 'record' ? { record: '1' } : {}),
  });

  const playLevel = (levelId: number) => {
    router.push({
      pathname: '/game',
      params: withGameOptions({ mode: 'level', levelId: String(levelId) }),
    });
  };

  const playEndless = () => {
    router.push({ pathname: '/game', params: withGameOptions({ mode: 'endless' }) });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F9FF' }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A' }}>Levels</Text>
        <Text style={{ color: '#64748B', marginTop: 2, marginBottom: 16 }}>
          Clear the target score to unlock the next level
        </Text>

        <View
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: '#FFFFFF',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <View style={{ gap: 3 }}>
            <Text style={{ fontWeight: '900', color: '#1F2937', fontSize: 16 }}>
              Game Background
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12 }}>
              Your choice applies to Endless Mode and every level below.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sky Background"
              accessibilityHint="Uses the classic Flap Fit sky for levels"
              accessibilityState={{ selected: backgroundMode === 'sky' }}
              onPress={() => {
                setBackgroundMode('sky');
                setRunMode('play');
              }}
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
              accessibilityHint="Shows your front camera behind levels"
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

          {backgroundMode === 'camera' ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>
                Choose how the selected level starts
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Play without recording"
                  accessibilityState={{ selected: runMode === 'play' }}
                  onPress={() => setRunMode('play')}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: runMode === 'play' ? ACCENT_BLUE : '#CBD5E1',
                    backgroundColor: runMode === 'play' ? '#E0F2FE' : '#F8FAFC',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 7,
                  }}
                >
                  <Play size={18} color={runMode === 'play' ? ACCENT_BLUE : '#64748B'} />
                  <Text
                    style={{
                      color: runMode === 'play' ? '#0369A1' : '#475569',
                      fontWeight: '900',
                    }}
                  >
                    Play
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Record and play"
                  accessibilityHint="Records the live-camera game for sharing"
                  accessibilityState={{ selected: runMode === 'record' }}
                  onPress={() => setRunMode('record')}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: runMode === 'record' ? '#DC2626' : '#CBD5E1',
                    backgroundColor: runMode === 'record' ? '#FEF2F2' : '#F8FAFC',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 7,
                  }}
                >
                  <Video size={18} color={runMode === 'record' ? '#DC2626' : '#64748B'} />
                  <Text
                    style={{
                      color: runMode === 'record' ? '#B91C1C' : '#475569',
                      fontWeight: '900',
                    }}
                  >
                    Record &amp; Play
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {/* Endless card */}
        <TouchableOpacity
          onPress={endlessOpen ? playEndless : undefined}
          disabled={!endlessOpen}
          style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}
        >
          <LinearGradient
            colors={endlessOpen ? ['#1D4ED8', '#60A5FA'] : ['#94A3B8', '#CBD5E1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            {endlessOpen ? (
              <InfinityIcon size={32} color="#FFFFFF" />
            ) : (
              <Lock size={28} color="#FFFFFF" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 18 }}>
                Endless Mode
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
                {endlessOpen
                  ? `Speeds up forever · Best: ${endlessBest}`
                  : 'Clear Level 5 to unlock'}
              </Text>
            </View>
            {endlessOpen ? <Play size={24} color="#FFFFFF" fill="#FFFFFF" /> : null}
          </LinearGradient>
        </TouchableOpacity>

        {LEVELS.map((level) => {
          const unlocked = level.id <= unlockedLevel;
          const best = bestScores[String(level.id)] ?? 0;
          const cleared = best >= level.targetScore;
          return (
            <TouchableOpacity
              key={level.id}
              onPress={unlocked ? () => playLevel(level.id) : undefined}
              disabled={!unlocked}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                padding: 16,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                opacity: unlocked ? 1 : 0.55,
                borderWidth: 2,
                borderColor: cleared ? '#FDE68A' : '#F1F5F9',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: unlocked ? level.sky1 : '#94A3B8',
                }}
              >
                {unlocked ? (
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 18 }}>
                    {level.id}
                  </Text>
                ) : (
                  <Lock size={20} color="#FFFFFF" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 15 }}>
                  {level.name}
                </Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
                  Target: {level.targetScore} pipes
                  {level.movingPipes ? ' · Moving gates' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                {cleared ? <Star size={18} color="#F59E0B" fill="#F59E0B" /> : null}
                <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700' }}>
                  {best > 0 ? `Best ${best}` : unlocked ? 'New' : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
