import { Tabs } from 'expo-router';
import { ChartNoAxesColumnIncreasing, CircleHelp, Home, Map, Trophy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isAndroid = process.env.EXPO_OS === 'android';
  const androidBottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderColor: '#E5E7EB',
          paddingTop: isAndroid ? 6 : 4,
          ...(isAndroid
            ? {
                height: 60 + androidBottomPadding,
                paddingBottom: androidBottomPadding,
              }
            : {}),
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="levels"
        options={{
          title: 'Levels',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="compete"
        options={{
          title: 'Compete',
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <ChartNoAxesColumnIncreasing color={color} size={size} strokeWidth={2.4} />
          ),
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: 'Info',
          tabBarIcon: ({ color, size }) => (
            <CircleHelp color={color} size={size} strokeWidth={2.4} />
          ),
        }}
      />
    </Tabs>
  );
}
