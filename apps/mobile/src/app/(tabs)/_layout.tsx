import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_TAB_COLORS, BottomTabIcon, BottomTabLabel } from '@/components/navigation/BottomTabVisuals';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const isTablet = width >= 768;
  const iconSize = isTablet ? 36 : 32;
  const labelSize = isTablet ? 16 : width < 360 ? 13 : 14;
  const bottomPadding = Math.max(insets.bottom, 8);
  const textGrowth = Math.ceil(labelSize * Math.max(0, Math.min(fontScale, 1.3) - 1));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: BOTTOM_TAB_COLORS.background,
          borderTopWidth: 1,
          borderTopColor: BOTTOM_TAB_COLORS.border,
          height: (isTablet ? 88 : 76) + bottomPadding + textGrowth,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          elevation: 0,
        },
        tabBarActiveTintColor: BOTTOM_TAB_COLORS.active,
        tabBarInactiveTintColor: BOTTOM_TAB_COLORS.inactive,
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarIconStyle: { width: 44, height: iconSize + 4, flexGrow: 0, flexShrink: 0, marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <BottomTabIcon destination="Home" focused={focused} size={iconSize} />,
          tabBarLabel: ({ focused, color }) => <BottomTabLabel label="Home" focused={focused} color={color} fontSize={labelSize} />,
        }}
      />
      <Tabs.Screen
        name="levels"
        options={{
          title: 'Levels',
          tabBarIcon: ({ focused }) => <BottomTabIcon destination="Levels" focused={focused} size={iconSize} />,
          tabBarLabel: ({ focused, color }) => <BottomTabLabel label="Levels" focused={focused} color={color} fontSize={labelSize} />,
        }}
      />
      <Tabs.Screen
        name="compete"
        options={{
          title: 'Compete',
          tabBarIcon: ({ focused }) => <BottomTabIcon destination="Compete" focused={focused} size={iconSize} />,
          tabBarLabel: ({ focused, color }) => <BottomTabLabel label="Compete" focused={focused} color={color} fontSize={labelSize} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => <BottomTabIcon destination="Stats" focused={focused} size={iconSize} />,
          tabBarLabel: ({ focused, color }) => <BottomTabLabel label="Stats" focused={focused} color={color} fontSize={labelSize} />,
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: 'Info',
          tabBarIcon: ({ focused }) => <BottomTabIcon destination="Info" focused={focused} size={iconSize} />,
          tabBarLabel: ({ focused, color }) => <BottomTabLabel label="Info" focused={focused} color={color} fontSize={labelSize} />,
        }}
      />
    </Tabs>
  );
}
