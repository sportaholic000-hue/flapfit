import { Flag, Gem, Infinity as InfinityIcon, Medal } from 'lucide-react-native';
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
  const Icon =
    a.icon === 'endless'
      ? InfinityIcon
      : a.icon === 'max-level'
        ? Flag
        : a.icon === 'ultimate'
          ? Medal
          : a.icon === 'impossible'
            ? Gem
            : null;
  return (
    <View
      accessibilityLabel={`${a.title}. ${a.desc}. ${progress} of ${a.goal}${done ? '. Complete' : ''}`}
      style={{
        width: '48%',
        backgroundColor: done ? '#FFFBEB' : '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1.5,
        borderColor: done ? '#FCD34D' : '#F1F5F9',
        opacity: done ? 1 : 0.85,
      }}
    >
      {Icon ? (
        <Icon size={24} color={a.icon === 'endless' ? '#1D4ED8' : done ? '#B45309' : '#64748B'} />
      ) : (
        <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
      )}
      <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13, marginTop: 4 }}>
        {a.title}
      </Text>
      <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{a.desc}</Text>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: '#E2E8F0',
          marginTop: 8,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round((progress / a.goal) * 100)}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: done ? '#F59E0B' : '#94A3B8',
          }}
        />
      </View>
      <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 4, fontWeight: '700' }}>
        {progress}/{a.goal}
      </Text>
    </View>
  );
}
