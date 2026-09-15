import type { ImageSourcePropType } from 'react-native';

export const BIRD_STAGE_SKIN_IDS = [
  'sunny',
  'ruby',
  'sky',
  'kiwi',
  'violet',
  'onyx',
  'pearl',
] as const;

export type BirdStageArtSkinId = (typeof BIRD_STAGE_SKIN_IDS)[number];
export const BIRD_STAGE_COUNT = 10;

export const BIRD_STAGE_ART: Record<BirdStageArtSkinId, readonly ImageSourcePropType[]> = {
  sunny: [
    require('../../../assets/images/evolution/sunny/stage-01.png'),
    require('../../../assets/images/evolution/sunny/stage-02.png'),
    require('../../../assets/images/evolution/sunny/stage-03.png'),
    require('../../../assets/images/evolution/sunny/stage-04.png'),
    require('../../../assets/images/evolution/sunny/stage-05.png'),
    require('../../../assets/images/evolution/sunny/stage-06.png'),
    require('../../../assets/images/evolution/sunny/stage-07.png'),
    require('../../../assets/images/evolution/sunny/stage-08.png'),
    require('../../../assets/images/evolution/sunny/stage-09.png'),
    require('../../../assets/images/evolution/sunny/stage-10.png'),
  ],
  ruby: [
    require('../../../assets/images/evolution/ruby/stage-01.png'),
    require('../../../assets/images/evolution/ruby/stage-02.png'),
    require('../../../assets/images/evolution/ruby/stage-03.png'),
    require('../../../assets/images/evolution/ruby/stage-04.png'),
    require('../../../assets/images/evolution/ruby/stage-05.png'),
    require('../../../assets/images/evolution/ruby/stage-06.png'),
    require('../../../assets/images/evolution/ruby/stage-07.png'),
    require('../../../assets/images/evolution/ruby/stage-08.png'),
    require('../../../assets/images/evolution/ruby/stage-09.png'),
    require('../../../assets/images/evolution/ruby/stage-10.png'),
  ],
  sky: [
    require('../../../assets/images/evolution/sky/stage-01.png'),
    require('../../../assets/images/evolution/sky/stage-02.png'),
    require('../../../assets/images/evolution/sky/stage-03.png'),
    require('../../../assets/images/evolution/sky/stage-04.png'),
    require('../../../assets/images/evolution/sky/stage-05.png'),
    require('../../../assets/images/evolution/sky/stage-06.png'),
    require('../../../assets/images/evolution/sky/stage-07.png'),
    require('../../../assets/images/evolution/sky/stage-08.png'),
    require('../../../assets/images/evolution/sky/stage-09.png'),
    require('../../../assets/images/evolution/sky/stage-10.png'),
  ],
  kiwi: [
    require('../../../assets/images/evolution/kiwi/stage-01.png'),
    require('../../../assets/images/evolution/kiwi/stage-02.png'),
    require('../../../assets/images/evolution/kiwi/stage-03.png'),
    require('../../../assets/images/evolution/kiwi/stage-04.png'),
    require('../../../assets/images/evolution/kiwi/stage-05.png'),
    require('../../../assets/images/evolution/kiwi/stage-06.png'),
    require('../../../assets/images/evolution/kiwi/stage-07.png'),
    require('../../../assets/images/evolution/kiwi/stage-08.png'),
    require('../../../assets/images/evolution/kiwi/stage-09.png'),
    require('../../../assets/images/evolution/kiwi/stage-10.png'),
  ],
  violet: [
    require('../../../assets/images/evolution/violet/stage-01.png'),
    require('../../../assets/images/evolution/violet/stage-02.png'),
    require('../../../assets/images/evolution/violet/stage-03.png'),
    require('../../../assets/images/evolution/violet/stage-04.png'),
    require('../../../assets/images/evolution/violet/stage-05.png'),
    require('../../../assets/images/evolution/violet/stage-06.png'),
    require('../../../assets/images/evolution/violet/stage-07.png'),
    require('../../../assets/images/evolution/violet/stage-08.png'),
    require('../../../assets/images/evolution/violet/stage-09.png'),
    require('../../../assets/images/evolution/violet/stage-10.png'),
  ],
  onyx: [
    require('../../../assets/images/evolution/onyx/stage-01.png'),
    require('../../../assets/images/evolution/onyx/stage-02.png'),
    require('../../../assets/images/evolution/onyx/stage-03.png'),
    require('../../../assets/images/evolution/onyx/stage-04.png'),
    require('../../../assets/images/evolution/onyx/stage-05.png'),
    require('../../../assets/images/evolution/onyx/stage-06.png'),
    require('../../../assets/images/evolution/onyx/stage-07.png'),
    require('../../../assets/images/evolution/onyx/stage-08.png'),
    require('../../../assets/images/evolution/onyx/stage-09.png'),
    require('../../../assets/images/evolution/onyx/stage-10.png'),
  ],
  pearl: [
    require('../../../assets/images/evolution/pearl/stage-01.png'),
    require('../../../assets/images/evolution/pearl/stage-02.png'),
    require('../../../assets/images/evolution/pearl/stage-03.png'),
    require('../../../assets/images/evolution/pearl/stage-04.png'),
    require('../../../assets/images/evolution/pearl/stage-05.png'),
    require('../../../assets/images/evolution/pearl/stage-06.png'),
    require('../../../assets/images/evolution/pearl/stage-07.png'),
    require('../../../assets/images/evolution/pearl/stage-08.png'),
    require('../../../assets/images/evolution/pearl/stage-09.png'),
    require('../../../assets/images/evolution/pearl/stage-10.png'),
  ],
};

export function clampBirdStage(stage: number): number {
  if (!Number.isFinite(stage)) return 0;
  return Math.max(0, Math.min(BIRD_STAGE_COUNT - 1, Math.trunc(stage)));
}

function normalizeSkinId(skinId: string): BirdStageArtSkinId {
  return Object.prototype.hasOwnProperty.call(BIRD_STAGE_ART, skinId)
    ? (skinId as BirdStageArtSkinId)
    : 'sunny';
}

/** Maps the app's zero-based evolution stage to a bundled production raster. */
export function getBirdStageArt(skinId: string, stage: number): ImageSourcePropType {
  return BIRD_STAGE_ART[normalizeSkinId(skinId)][clampBirdStage(stage)];
}
