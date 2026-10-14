import { IONICONS_GLYPHS, IONICONS_TRANSFORM, IONICONS_VIEWBOX } from './ioniconsGlyphs';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

export type BottomTabDestination = 'Home' | 'Levels' | 'Compete' | 'Stats' | 'Info';

export const BOTTOM_TAB_COLORS = {
  background: '#06223D',
  border: '#06223D',
  active: '#F59E0B',
  inactive: '#F5FAFF',
  trophy: '#FFCB45',
} as const;

/** Filled, equally sized symbols; Levels and Stats share the same bar geometry. */
export function BottomTabIcon({
  destination, focused, size,
}: { destination: BottomTabDestination; focused: boolean; size: number }) {
  const color = focused ? BOTTOM_TAB_COLORS.active
    : destination === 'Compete' ? BOTTOM_TAB_COLORS.trophy : BOTTOM_TAB_COLORS.inactive;
  const iconPath = destination === 'Home' ? IONICONS_GLYPHS.home : IONICONS_GLYPHS.info;

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.icon}>
      {destination === 'Compete' ? (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill={color}>
          <Path d="M8 7H3v4c0 4 3 7 8 7M24 7h5v4c0 4-3 7-8 7" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M8 4h16v8c0 5-3.2 9-8 9s-8-4-8-9V4Z" />
          <Rect x="14" y="20" width="4" height="6" rx="1" />
          <Path d="M12 25h8l3 3H9l3-3Z" />
          <Rect x="8" y="28" width="16" height="2" rx="1" />
          <Path d="m16 7 1.5 3.1 3.4.5-2.45 2.4.58 3.4L16 14.8l-3.03 1.6.58-3.4-2.45-2.4 3.4-.5L16 7Z" fill={BOTTOM_TAB_COLORS.background} />
        </Svg>
      ) : destination === 'Levels' ? (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill={color}>
          <Rect x="3" y="22" width="6" height="7" rx="1.4" />
          <Rect x="12" y="17" width="6" height="12" rx="1.4" />
          <Rect x="21" y="12" width="6" height="17" rx="1.4" />
          <Path d="M22 3v10" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          <Path d="M22 3h8l-2.6 3L30 9h-8z" />
        </Svg>
      ) : destination === 'Stats' ? (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill={color}>
          <Rect x="3" y="23" width="6" height="6" rx="1.4" />
          <Rect x="12" y="19" width="6" height="10" rx="1.4" />
          <Rect x="21" y="15" width="6" height="14" rx="1.4" />
          <Path d="m4 17 8-7 6 2L28 3m-7 0h7v7" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : (
        <Svg width={size} height={size} viewBox={IONICONS_VIEWBOX}>
          <Path d={iconPath} transform={IONICONS_TRANSFORM} fill={color} />
        </Svg>
      )}
    </View>
  );
}

export function BottomTabLabel({
  label, focused, color, fontSize,
}: { label: BottomTabDestination; focused: boolean; color: ColorValue; fontSize: number }) {
  return (
    <View style={styles.label}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.9}
        maxFontSizeMultiplier={1.3}
        style={{ color, fontSize, lineHeight: Math.ceil(fontSize * 1.3), fontWeight: '700', textAlign: 'center' }}
      >
        {label}
      </Text>
      <View style={[styles.indicator, { opacity: focused ? 1 : 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
  label: { alignItems: 'center', alignSelf: 'stretch', marginHorizontal: -5, paddingHorizontal: 2, paddingBottom: 8 },
  indicator: {
    position: 'absolute', bottom: 1, width: 26, height: 3, borderRadius: 2,
    backgroundColor: BOTTOM_TAB_COLORS.active,
  },
});
