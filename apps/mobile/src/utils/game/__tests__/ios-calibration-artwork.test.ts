import fs from 'node:fs';
import path from 'node:path';
import { IOS_CALIBRATION_IMAGES } from '../iosCalibrationImageData';
import { buildCalibrationGuideMarkup } from '../experimentalCalibrationGuide';

describe('iOS lossless calibration artwork', () => {
  test.each(Object.entries(IOS_CALIBRATION_IMAGES))('%s uses the exact reviewed file bytes', (pose, image) => {
    const bytes = fs.readFileSync(path.join(__dirname, '../../../../assets/images/calibration', pose + '.webp'));
    expect(Buffer.from(image.dataUri.split(',')[1], 'base64').equals(bytes)).toBe(true);
    expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
    expect(bytes.includes(Buffer.from('VP8L'))).toBe(true);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });
  test.each(['pushups', 'squats', 'pullups', 'lateralraise', 'biceps', 'shoulderpress'])('%s uses images only on iOS and retains each stage', exercise => {
    const ios = buildCalibrationGuideMarkup(exercise, 'ios');
    expect(ios.match(/<image /g)).toHaveLength(exercise === 'pullups' ? 3 : 2);
    expect(ios).toContain('class="pose-up"');
    expect(ios).toContain('class="pose-down"');
    if (exercise === 'pullups') expect(ios).toContain('class="pose-reach"');
    expect(ios).not.toContain('<path ');
    expect(buildCalibrationGuideMarkup(exercise, 'android')).not.toContain('<image ');
  });
});
