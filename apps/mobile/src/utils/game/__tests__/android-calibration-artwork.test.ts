import fs from 'node:fs';
import path from 'node:path';
import { ANDROID_CALIBRATION_IMAGES } from '../androidCalibrationImageData';
import { buildCalibrationGuideMarkup } from '../experimentalCalibrationGuide';

describe('Android lossless calibration artwork', () => {
  test.each(Object.entries(ANDROID_CALIBRATION_IMAGES))('%s uses the exact reviewed file bytes', (pose, image) => {
    const bytes = fs.readFileSync(path.join(__dirname, '../../../../assets/images/calibration', pose + '.webp'));
    expect(Buffer.from(image.dataUri.split(',')[1], 'base64').equals(bytes)).toBe(true);
    expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
    expect(bytes.includes(Buffer.from('VP8L'))).toBe(true);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });
  test.each(['pushups', 'squats', 'pullups', 'lateralraise', 'biceps', 'shoulderpress'])('%s uses images only on Android and retains each stage', exercise => {
    const android = buildCalibrationGuideMarkup(exercise, 'android');
    expect(android.match(/<image /g)).toHaveLength(exercise === 'pullups' ? 3 : 2);
    expect(android).toContain('class="pose-up"');
    expect(android).toContain('class="pose-down"');
    if (exercise === 'pullups') expect(android).toContain('class="pose-reach"');
    expect(android).not.toContain('<path ');
    expect(buildCalibrationGuideMarkup(exercise, 'ios')).not.toContain('<image ');
  });
});
