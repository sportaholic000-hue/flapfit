import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export type SkyTab = 'levels' | 'compete' | 'stats' | 'info';

// Match Home's sky and existing cloud artwork. Keep each arrangement stable while scrolling.
const SKY_BLUE = '#4AABDE';
const CLOUD_PATH =
  'M22 69C10 69 2 61 2 50C2 40 9 32 19 30C21 15 33 5 48 5C59 5 69 11 74 20C79 15 86 12 94 12C108 12 119 23 119 37C122 34 127 32 133 32C144 32 152 40 152 51C152 62 143 69 132 69H22Z';

type CloudPosition = {
  top: `${number}%`;
  left: `${number}%`;
  scale: number;
  opacity: number;
};

const CLOUDS: Record<SkyTab, readonly CloudPosition[]> = {
  levels: [
    { top: '5%', left: '64%', scale: 1.1, opacity: 0.7 },
    { top: '19%', left: '-9%', scale: 0.85, opacity: 0.55 },
    { top: '36%', left: '72%', scale: 0.9, opacity: 0.5 },
    { top: '52%', left: '16%', scale: 0.7, opacity: 0.45 },
    { top: '69%', left: '-15%', scale: 1.15, opacity: 0.6 },
    { top: '86%', left: '67%', scale: 1, opacity: 0.5 },
  ],
  compete: [
    { top: '8%', left: '-12%', scale: 1.05, opacity: 0.65 },
    { top: '24%', left: '70%', scale: 0.8, opacity: 0.55 },
    { top: '42%', left: '8%', scale: 0.7, opacity: 0.45 },
    { top: '57%', left: '77%', scale: 1.1, opacity: 0.6 },
    { top: '75%', left: '-7%', scale: 0.95, opacity: 0.55 },
    { top: '91%', left: '46%', scale: 0.85, opacity: 0.45 },
  ],
  stats: [
    { top: '3%', left: '73%', scale: 0.85, opacity: 0.6 },
    { top: '22%', left: '4%', scale: 1.1, opacity: 0.65 },
    { top: '39%', left: '79%', scale: 1, opacity: 0.5 },
    { top: '59%', left: '-14%', scale: 0.85, opacity: 0.55 },
    { top: '76%', left: '49%', scale: 0.7, opacity: 0.45 },
    { top: '92%', left: '10%', scale: 1.1, opacity: 0.5 },
  ],
  info: [
    { top: '13%', left: '68%', scale: 1, opacity: 0.6 },
    { top: '30%', left: '-16%', scale: 1.15, opacity: 0.65 },
    { top: '47%', left: '36%', scale: 0.7, opacity: 0.45 },
    { top: '64%', left: '81%', scale: 0.9, opacity: 0.55 },
    { top: '80%', left: '-6%', scale: 0.8, opacity: 0.5 },
    { top: '94%', left: '59%', scale: 1.1, opacity: 0.6 },
  ],
};

/** Decorative sibling of the existing ScrollView, never part of its scrolling content. */
export function TabSkyBackground({ screen }: { screen: SkyTab }) {
  return (
    <View
      testID={`sky-background-${screen}`}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: SKY_BLUE }}
    >
      {CLOUDS[screen].map(({ top, left, scale, opacity }, index) => {
        const fillId = `tab-cloud-${screen}-${index}`;
        return (
          <Svg key={fillId} width={154 * scale} height={74 * scale} viewBox="0 0 154 74"
            style={{ position: 'absolute', top, left, opacity }}>
            <Defs>
              <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="0.72" stopColor="#F8FCFF" />
                <Stop offset="1" stopColor="#DCEFF8" />
              </LinearGradient>
            </Defs>
            <Path d={CLOUD_PATH} fill="rgba(15, 23, 42, 0.10)" transform="translate(0 3)" />
            <Path d={CLOUD_PATH} fill={`url(#${fillId})`} />
            <Path d="M18 57C43 63 113 63 138 56" fill="none" stroke="rgba(74, 171, 222, 0.16)"
              strokeWidth="2" strokeLinecap="round" />
          </Svg>
        );
      })}
    </View>
  );
}
