import { ResultBird } from '../ResultBird';
import BirdAvatar from '../BirdAvatar';
import { getBird } from '@/utils/game/birds';

jest.mock('expo-image', () => ({ Image: 'VictoryImage' }));
jest.mock('../BirdAvatar', () => ({ __esModule: true, default: 'CurrentStageBird' }));
jest.mock('../../../assets/images/victory/sunny-flex.png', () => 'sunny-flex.png');
jest.mock('../../../assets/images/victory/ruby-flex.png', () => 'ruby-flex.png');
jest.mock('../../../assets/images/victory/sky-flex.png', () => 'sky-flex.png');
jest.mock('../../../assets/images/victory/kiwi-flex.png', () => 'kiwi-flex.png');
jest.mock('../../../assets/images/victory/violet-flex.png', () => 'violet-flex.png');
jest.mock('../../../assets/images/victory/onyx-flex.png', () => 'onyx-flex.png');
jest.mock('../../../assets/images/victory/pearl-flex.png', () => 'pearl-flex.png');

const evo = Object.freeze({ stage: 3, wings: 0.4, legs: 0.2, arms: 0.3, shoulders: 0.1 });

test('an uncleared result keeps the selected skin and earned evolution without a victory substitution', () => {
  const skin = getBird('violet');
  const result = ResultBird({ cleared: false, skin, evo, size: 150 });
  expect(result.type).toBe(BirdAvatar);
  expect(result.props).toEqual({ skin, evo, size: 150 });
  expect(result.props.evo).toBe(evo);
});

test.each(['sunny', 'ruby', 'sky', 'kiwi', 'violet', 'onyx', 'pearl'])(
  'a cleared result uses the %s victory artwork without modifying earned evolution',
  id => {
    const skin = getBird(id);
    const result = ResultBird({ cleared: true, skin, evo });
    expect(result.type).toBe('VictoryImage');
    expect(result.props.source).toBe(id + '-flex.png');
    expect(result.props.accessibilityLabel).toContain(skin.name);
    expect(result.props.contentFit).toBe('contain');
    expect(evo.stage).toBe(3);
  }
);
