import { Image } from 'expo-image';
import BirdAvatar from './BirdAvatar';
import type { BirdSkin } from '@/utils/game/birds';
import type { BirdEvolution } from '@/utils/game/gameHtml';

const VICTORY_ART = {
  sunny: require('../../assets/images/victory/sunny-flex.png'),
  ruby: require('../../assets/images/victory/ruby-flex.png'),
  sky: require('../../assets/images/victory/sky-flex.png'),
  kiwi: require('../../assets/images/victory/kiwi-flex.png'),
  violet: require('../../assets/images/victory/violet-flex.png'),
  onyx: require('../../assets/images/victory/onyx-flex.png'),
  pearl: require('../../assets/images/victory/pearl-flex.png'),
} as const;

export function ResultBird({ cleared, skin, evo, size = 124 }: {
  cleared: boolean;
  skin: BirdSkin;
  evo: BirdEvolution;
  size?: number;
}) {
  if (!cleared) return <BirdAvatar skin={skin} evo={evo} size={size} />;

  // A color-matched victory pose, independent of the player's earned evolution stage.
  const source = Object.prototype.hasOwnProperty.call(VICTORY_ART, skin.id)
    ? VICTORY_ART[skin.id as keyof typeof VICTORY_ART]
    : VICTORY_ART.sunny;
  return (
    <Image
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${skin.name} celebrating with a double-biceps flex`}
      source={source}
      contentFit="contain"
      style={{ width: size, height: size }}
      transition={0}
    />
  );
}
