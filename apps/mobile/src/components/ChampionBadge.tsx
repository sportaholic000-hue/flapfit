import { Text, View } from 'react-native';

export function ChampionBadge() {
  return (
    <View
      accessibilityLabel="Flap Fit Champion. All 15 standard levels cleared."
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 18,
        backgroundColor: '#FFFBEB',
        borderWidth: 1.5,
        borderColor: '#FCD34D',
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 34 }}>🏆</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#92400E', fontWeight: '900', fontSize: 17 }}>Flap Fit Champion</Text>
        <Text style={{ color: '#A16207', fontSize: 12, marginTop: 3 }}>
          All 15 levels conquered
        </Text>
      </View>
      <Text style={{ color: '#92400E', fontWeight: '900', fontSize: 16 }}>15/15</Text>
    </View>
  );
}

export function ChampionshipResultHeading() {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 40 }}>🏆</Text>
      <Text
        style={{
          fontSize: 24,
          fontWeight: '900',
          color: '#92400E',
          marginTop: 8,
          textAlign: 'center',
        }}
      >
        Flap Fit Champion!
      </Text>
      <Text style={{ color: '#A16207', fontWeight: '800', marginTop: 6, textAlign: 'center' }}>
        Final Ascent conquered · 15/15
      </Text>
    </View>
  );
}
