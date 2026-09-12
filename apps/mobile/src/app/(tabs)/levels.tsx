import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Infinity as InfinityIcon, Lock, Play, Star } from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEVELS } from '@/utils/game/levels';
import { isEndlessUnlocked, useGameStore } from '@/utils/game/store';

export default function LevelsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unlockedLevel = useGameStore((s) => s.unlockedLevel);
  const bestScores = useGameStore((s) => s.bestScores);
  const endlessBest = useGameStore((s) => s.endlessBest);
  const endlessOpen = isEndlessUnlocked(unlockedLevel);

  const playLevel = (levelId: number) => {
    router.push({ pathname: '/game', params: { mode: 'level', levelId: String(levelId) } });
  };

  const playEndless = () => {
    router.push({ pathname: '/game', params: { mode: 'endless' } });
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
