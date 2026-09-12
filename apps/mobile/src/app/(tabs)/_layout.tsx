import { Tabs } from 'expo-router';
import { ChartNoAxesColumnIncreasing, CircleHelp, Home, Map, Trophy } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderColor: '#E5E7EB',
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 12,
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
