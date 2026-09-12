import { Image } from 'expo-image';
import type { BirdSkin } from '@/utils/game/birds';
import type { BirdEvolution } from '@/utils/game/gameHtml';
import { clampBirdStage, getBirdStageArt } from '@/utils/game/birdStageArt';
import type { BirdPose } from '@/utils/game/birdVisual';

type Props = {
  skin: BirdSkin;
  size?: number;
  evo?: BirdEvolution;
  pose?: BirdPose;
};

export default function BirdAvatar({ skin, size = 64, evo, pose = 'showcase' }: Props) {
  const stage = clampBirdStage(evo?.stage ?? 0);

  // Showcase and flying contexts intentionally share one canonical stage asset.
  void pose;

  return (
    <Image
      accessible
      accessibilityLabel={`${skin.name}, evolution stage ${stage + 1}`}
      accessibilityRole="image"
      contentFit="contain"
      source={getBirdStageArt(skin.id, stage)}
      style={{ width: size, height: size }}
      transition={0}
    />
  );
}
