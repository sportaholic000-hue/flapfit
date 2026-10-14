import { Infinity as InfinityIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';
import type { AchievementDef, StatsSnapshot } from '@/utils/game/achievements';

export function AchievementCard({
  achievement: a,
  snapshot,
}: {
  achievement: AchievementDef;
  snapshot: StatsSnapshot;
}) {
  const progress = Math.max(0, Math.min(a.goal, a.progress(snapshot)));
  const done = progress >= a.goal;
  const Icon = a.icon === 'endless' ? InfinityIcon : null;
  return (
    <View
      accessibilityLabel={`${a.title}. ${a.desc}. ${progress} of ${a.goal}${done ? '. Complete' : ''}`}
      style={{
        width: '48%',
        alignItems: 'center',
        backgroundColor: done ? '#06223D' : '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1.5,
        borderColor: done ? '#F59E0B' : '#F1F5F9',
        opacity: done ? 1 : 0.85,
      }}
    >
      {Icon ? (
        <Icon size={24} color={done ? '#F59E0B' : a.icon === 'endless' ? '#1D4ED8' : '#64748B'} />
      ) : (
        <Text style={{ fontSize: a.icon ? 28 : 22, textAlign: 'center' }}>{a.emoji}</Text>
      )}
      <Text style={{ fontWeight: '800', color: done ? '#FFFFFF' : '#06223D', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
        {a.title}
      </Text>
      <Text style={{ color: done ? '#4AABDE' : '#475569', fontSize: 13, lineHeight: 18, marginTop: 2, textAlign: 'center' }}>{a.desc}</Text>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: '#E2E8F0',
          width: '100%',
          marginTop: 8,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round((progress / a.goal) * 100)}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#F59E0B',
          }}
        />
      </View>
      <Text style={{ color: done ? '#FFFFFF' : '#475569', fontSize: 12, lineHeight: 16, marginTop: 4, fontWeight: '700', textAlign: 'center' }}>
        {progress}/{a.goal}
      </Text>
    </View>
  );
}
