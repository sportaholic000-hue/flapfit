import type { ImageSource } from 'expo-image';
import type { ExerciseMode } from './store';

// Square, transparent, bundled assets keep the mascot large and remove the
// baked blue/grey rectangles from the original landscape JPEGs.
export const EXERCISE_IMAGES: Record<ExerciseMode, ImageSource> = {
  pushups: require('../../../assets/images/exercises/pushups.png'),
  squats: require('../../../assets/images/exercises/squats.png'),
  pullups: require('../../../assets/images/exercises/pullups.png'),
  biceps: require('../../../assets/images/exercises/biceps.png'),
  lateralraise: require('../../../assets/images/exercises/lateral-raise.png'),
  shoulderpress: require('../../../assets/images/exercises/shoulder-press.png'),
};
