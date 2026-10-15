import { GameStartOptions } from '@/components/GameStartOptions';
import { TabSkyBackground } from '@/components/TabSkyBackground';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Infinity as InfinityIcon,
  Lock,
  Play,
  Star,
} from 'lucide-react-native';
import { useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEVELS } from '@/utils/game/levels';
import { isEndlessUnlocked, useGameStore } from '@/utils/game/store';

const SELECTION_ORANGE = '#F59E0B';
const SKY_BLUE = '#4AABDE';
// Equal side columns keep every title centered, even with no score or completion star.
const LEVEL_CARD_SIDE_WIDTH = 64;

type PendingGame =
  | { mode: 'level'; levelId: number; title: string }
  | { mode: 'endless'; title: string };

export default function LevelsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unlockedLevel = useGameStore((s) => s.unlockedLevel);
  const bestScores = useGameStore((s) => s.bestScores);
  const endlessBest = useGameStore((s) => s.endlessBest);
  const endlessOpen = isEndlessUnlocked(unlockedLevel);
  const [backgroundMode, setBackgroundMode] = useState<'sky' | 'camera'>('sky');
  const [pendingGame, setPendingGame] = useState<PendingGame | null>(null);

  const withGameOptions = (params: Record<string, string>, record = false) => ({
    ...params,
    backgroundMode,
    ...(record && backgroundMode === 'camera' ? { record: '1' } : {}),
  });

  const launchGame = (game: PendingGame, record = false) => {
    setPendingGame(null);
    router.push({
      pathname: '/game',
      params: withGameOptions(
        game.mode === 'level'
          ? { mode: 'level', levelId: String(game.levelId) }
          : { mode: 'endless' },
        record
      ),
    });
  };

  const playLevel = (levelId: number, title: string) => {
    const game: PendingGame = { mode: 'level', levelId, title };
    if (backgroundMode === 'camera') setPendingGame(game);
    else launchGame(game);
  };

  const playEndless = () => {
    const game: PendingGame = { mode: 'endless', title: 'Endless Mode' };
    if (backgroundMode === 'camera') setPendingGame(game);
    else launchGame(game);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F9FF' }}>
      <TabSkyBackground screen="levels" />
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
          Levels
        </Text>
        <Text style={{ color: '#06223D', fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center', marginTop: 2, marginBottom: 16 }}>
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
            <Text accessibilityRole="header" style={{ fontWeight: '800', color: '#06223D', fontSize: 16, textAlign: 'center' }}>
              Game Background
            </Text>
            <View
              accessible={false}
              importantForAccessibility="no"
              style={{ alignSelf: 'center', width: 48, height: 3, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 6 }}
            />
            <Text style={{ color: '#475569', fontSize: 13, lineHeight: 19, textAlign: 'center' }}>
              Choose a background, then tap Endless Mode or any unlocked level to play.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sky Background"
              accessibilityHint="Uses the classic Flap Fit sky for levels"
              accessibilityState={{ selected: backgroundMode === 'sky' }}
              onPress={() => setBackgroundMode('sky')}
              style={{
                flex: 1,
                minHeight: 84,
                padding: 10,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: backgroundMode === 'sky' ? SKY_BLUE : '#06223D',
                backgroundColor: '#06223D',
                justifyContent: 'center',
                paddingTop: 28,
              }}
            >
              {backgroundMode === 'sky' ? (
                <View pointerEvents="none" accessible={false} style={{ position: 'absolute', top: 2, bottom: 2, left: 2, right: 2, borderWidth: 2, borderColor: SELECTION_ORANGE, borderRadius: 12 }} />
              ) : null}
              {backgroundMode === 'sky' ? (
                <Svg width={19} height={19} viewBox="0 0 24 24" style={{ position: 'absolute', top: 10, right: 10 }}>
                  <Circle cx={12} cy={12} r={10} fill="#4AABDE" stroke="#F59E0B" strokeWidth={2} />
                  <Path d="m8 12 3 3 5-6" fill="none" stroke="#06223D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              ) : null}
              <View style={{ gap: 2 }}>
                <Text style={{ fontWeight: '900', color: '#FFFFFF', fontSize: 14, textAlign: 'center' }}>
                  Sky Background
                </Text>
                <Text style={{ color: '#4AABDE', fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center' }}>
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
                minHeight: 84,
                padding: 10,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: backgroundMode === 'camera' ? SKY_BLUE : '#06223D',
                backgroundColor: '#06223D',
                justifyContent: 'center',
                paddingTop: 28,
              }}
            >
              {backgroundMode === 'camera' ? (
                <View pointerEvents="none" accessible={false} style={{ position: 'absolute', top: 2, bottom: 2, left: 2, right: 2, borderWidth: 2, borderColor: SELECTION_ORANGE, borderRadius: 12 }} />
              ) : null}
              {backgroundMode === 'camera' ? (
                <Svg width={19} height={19} viewBox="0 0 24 24" style={{ position: 'absolute', top: 10, right: 10 }}>
                  <Circle cx={12} cy={12} r={10} fill="#4AABDE" stroke="#F59E0B" strokeWidth={2} />
                  <Path d="m8 12 3 3 5-6" fill="none" stroke="#06223D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              ) : null}
              <View style={{ gap: 2 }}>
                <Text style={{ fontWeight: '900', color: '#FFFFFF', fontSize: 14, textAlign: 'center' }}>
                  Live Camera
                </Text>
                <Text style={{ color: '#4AABDE', fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center' }}>
                  You are the background
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Endless card */}
        <TouchableOpacity
          onPress={endlessOpen ? playEndless : undefined}
          disabled={!endlessOpen}
          style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}
        >
          <View
            style={{
              backgroundColor: endlessOpen ? '#06223D' : '#475569',
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <View style={{ width: 32, alignItems: 'center' }}>
              {endlessOpen ? (
                <InfinityIcon size={32} color="#F59E0B" />
              ) : (
                <Lock size={28} color="#FFFFFF" />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: endlessOpen ? '#F59E0B' : '#FFFFFF', fontWeight: '900', fontSize: 18, textAlign: 'center' }}>
                Endless Mode
              </Text>
              <Text style={{ color: endlessOpen ? '#F59E0B' : 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'center' }}>
                {endlessOpen
                  ? `Speeds up forever · Best: ${endlessBest}`
                  : 'Clear Level 5 to unlock'}
              </Text>
            </View>
            <View style={{ width: 32, alignItems: 'center' }}>
              {endlessOpen ? <Play size={24} color="#F59E0B" fill="#F59E0B" /> : null}
            </View>
          </View>
        </TouchableOpacity>

        {LEVELS.map((level) => {
          const unlocked = level.id <= unlockedLevel;
          const best = bestScores[String(level.id)] ?? 0;
          const cleared = best >= level.targetScore;
          return (
            <TouchableOpacity
              key={level.id}
              onPress={
                unlocked
                  ? () => playLevel(level.id, `Level ${level.id} · ${level.name}`)
                  : undefined
              }
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
                borderColor: cleared ? '#F59E0B' : '#F1F5F9',
              }}
            >
              <View style={{ width: LEVEL_CARD_SIDE_WIDTH, flexShrink: 0, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: unlocked ? '#06223D' : '#94A3B8',
                  }}
                >
                  {unlocked ? (
                    <Text style={{ color: '#F59E0B', fontWeight: '900', fontSize: 18 }}>
                      {level.id}
                    </Text>
                  ) : (
                    <Lock size={20} color="#FFFFFF" />
                  )}
                </View>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: '800', color: '#06223D', fontSize: 15, textAlign: 'center' }}>
                  {level.name}
                </Text>
                <Text style={{ color: '#475569', fontSize: 12, marginTop: 2, textAlign: 'center' }}>
                  Target: {level.targetScore} pipes
                  {level.movingPipes ? ' · Moving gates' : ''}
                </Text>
              </View>
              <View style={{ width: LEVEL_CARD_SIDE_WIDTH, flexShrink: 0, alignItems: 'flex-end' }}>
                <View style={{ width: 52, alignItems: 'center', gap: 2, transform: [{ translateX: 10 }] }}>
                  {cleared ? <Star size={18} color="#F59E0B" fill="#F59E0B" /> : null}
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ width: '100%', textAlign: 'left', color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>
                    {best > 0 ? `Best ${best}` : unlocked ? 'New' : ''}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <GameStartOptions
        visible={pendingGame !== null}
        title={pendingGame?.title}
        onClose={() => setPendingGame(null)}
        onPlay={(record) => { if (pendingGame) launchGame(pendingGame, record); }}
      />
    </View>
  );
}
