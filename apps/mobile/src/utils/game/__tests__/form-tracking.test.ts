import { SCRIPT_FORM_TRACKING } from '../html/scriptFormTracking';
import { SCRIPT_CORE } from '../html/scriptCore';
import { SCRIPT_GAME } from '../html/scriptGame';

type Point = { x: number; y: number; visibility: number };
type FormCheck = {
  valid: boolean;
  message: string;
  fatal: boolean;
  fatalKey: string;
};

function point(x: number, y: number): Point {
  return { x, y, visibility: 1 };
}

function pose(entries: Array<[number, Point]>) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [index, value] of entries) landmarks[index] = value;
  return landmarks;
}

function mirroredPair(leftIndex: number, rightIndex: number, x: number, y: number) {
  return [
    [leftIndex, point(x, y)],
    [rightIndex, point(1 - x, y)],
  ] as Array<[number, Point]>;
}

function makeHarness(exercise: string) {
  let currentTime = 0;
  const factory = new Function(
    'CONFIG',
    'performance',
    'calibrationReadyAt',
    SCRIPT_FORM_TRACKING +
      '; return {' +
      ' update: updateExperimentalFormPose,' +
      ' validateCalibration: validateExperimentalCalibration,' +
      ' validateGameplay: validateExperimentalGameplay,' +
      ' save: saveExperimentalCalibration,' +
      ' metrics: function() { return formCurrentMetrics; }' +
      '};'
  ) as (
    config: { trackingMode: string; exercise: string },
    clock: { now: () => number },
    calibrationReadyAt: number
  ) => {
    update: (landmarks: Point[], now: number) => void;
    validateCalibration: (position: 'top' | 'bottom') => FormCheck;
    validateGameplay: (norm: number) => FormCheck;
    save: (position: 'top' | 'bottom') => void;
    metrics: () => { controllerY: number };
  };

  const harness = factory(
    { trackingMode: 'form-test', exercise },
    { now: () => currentTime },
    2000
  );
  return {
    ...harness,
    update: (landmarks: Point[], now: number) => {
      currentTime = now;
      harness.update(landmarks, now);
    },
  };
}

function calibrateWeightedExercise(
  harness: ReturnType<typeof makeHarness>,
  top: Point[],
  bottom: Point[]
) {
  harness.update(top, 2100);
  expect(harness.validateCalibration('top').valid).toBe(true);
  harness.save('top');
  harness.update(bottom, 2116);
  expect(harness.validateCalibration('bottom').valid).toBe(true);
  harness.save('bottom');
}

describe('experimental form tracking', () => {
  it('keeps the complete WebView game script syntactically valid', () => {
    expect(() => new Function(SCRIPT_CORE + SCRIPT_FORM_TRACKING + SCRIPT_GAME)).not.toThrow();
  });

  it('uses hips rather than head movement to control squats', () => {
    const harness = makeHarness('squats');
    const standing = pose([
      ...mirroredPair(11, 12, 0.42, 0.3),
      ...mirroredPair(23, 24, 0.43, 0.52),
      ...mirroredPair(25, 26, 0.44, 0.72),
      ...mirroredPair(27, 28, 0.45, 0.92),
      [0, point(0.5, 0.1)],
    ]);
    harness.update(standing, 0);
    const before = harness.metrics().controllerY;
    standing[0] = point(0.5, 0.28);
    harness.update(standing, 16);

    expect(harness.metrics().controllerY).toBeCloseTo(before);
  });

  it('rejects a waist bend with straight knees as a squat bottom position', () => {
    const harness = makeHarness('squats');
    const top = pose([
      ...mirroredPair(11, 12, 0.42, 0.3),
      ...mirroredPair(23, 24, 0.43, 0.52),
      ...mirroredPair(25, 26, 0.44, 0.72),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    harness.update(top, 0);
    expect(harness.validateCalibration('top').valid).toBe(true);
    harness.save('top');

    const waistBend = pose([
      ...mirroredPair(11, 12, 0.3, 0.54),
      ...mirroredPair(23, 24, 0.43, 0.59),
      ...mirroredPair(25, 26, 0.44, 0.74),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    harness.update(waistBend, 16);
    const result = harness.validateCalibration('bottom');

    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/waist|knees/i);
  });

  it('requires both arms to move together during bicep curls', () => {
    const harness = makeHarness('biceps');
    const top = pose([
      ...mirroredPair(11, 12, 0.42, 0.35),
      ...mirroredPair(13, 14, 0.42, 0.53),
      ...mirroredPair(15, 16, 0.42, 0.37),
      ...mirroredPair(23, 24, 0.43, 0.67),
    ]);
    const bottom = pose([
      ...mirroredPair(11, 12, 0.42, 0.35),
      ...mirroredPair(13, 14, 0.42, 0.53),
      ...mirroredPair(15, 16, 0.42, 0.72),
      ...mirroredPair(23, 24, 0.43, 0.67),
    ]);
    calibrateWeightedExercise(harness, top, bottom);

    harness.update(top, 2132);
    expect(harness.validateGameplay(1).valid).toBe(true);

    const oneArmOnly = pose([
      ...mirroredPair(11, 12, 0.42, 0.35),
      ...mirroredPair(13, 14, 0.42, 0.53),
      [15, point(0.42, 0.37)],
      [16, point(0.58, 0.72)],
      ...mirroredPair(23, 24, 0.43, 0.67),
    ]);
    harness.update(oneArmOnly, 2148);

    expect(harness.validateGameplay(0.5)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'biceps-both-arms',
    });
  });

  it('requires both arms to move together during lateral raises', () => {
    const harness = makeHarness('lateralraise');
    const top = pose([
      ...mirroredPair(11, 12, 0.42, 0.38),
      [13, point(0.27, 0.38)],
      [14, point(0.73, 0.38)],
      [15, point(0.12, 0.38)],
      [16, point(0.88, 0.38)],
      ...mirroredPair(23, 24, 0.43, 0.7),
    ]);
    const bottom = pose([
      ...mirroredPair(11, 12, 0.42, 0.38),
      ...mirroredPair(13, 14, 0.42, 0.55),
      ...mirroredPair(15, 16, 0.42, 0.7),
      ...mirroredPair(23, 24, 0.43, 0.7),
    ]);
    calibrateWeightedExercise(harness, top, bottom);

    harness.update(top, 2132);
    expect(harness.validateGameplay(1).valid).toBe(true);

    const oneArmOnly = pose([
      ...mirroredPair(11, 12, 0.42, 0.38),
      [13, point(0.27, 0.38)],
      [14, point(0.58, 0.55)],
      [15, point(0.12, 0.38)],
      [16, point(0.58, 0.7)],
      ...mirroredPair(23, 24, 0.43, 0.7),
    ]);
    harness.update(oneArmOnly, 2148);

    expect(harness.validateGameplay(0.5)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'lateralraise-both-arms',
    });
  });

  it('requires both arms to move together during shoulder presses', () => {
    const harness = makeHarness('shoulderpress');
    const top = pose([
      ...mirroredPair(11, 12, 0.42, 0.42),
      ...mirroredPair(13, 14, 0.42, 0.27),
      ...mirroredPair(15, 16, 0.42, 0.12),
      ...mirroredPair(23, 24, 0.43, 0.7),
    ]);
    const bottom = pose([
      ...mirroredPair(11, 12, 0.42, 0.42),
      [13, point(0.32, 0.5)],
      [14, point(0.68, 0.5)],
      [15, point(0.24, 0.42)],
      [16, point(0.76, 0.42)],
      ...mirroredPair(23, 24, 0.43, 0.7),
    ]);
    calibrateWeightedExercise(harness, top, bottom);

    harness.update(top, 2132);
    expect(harness.validateGameplay(1).valid).toBe(true);

    const oneArmOnly = pose([
      ...mirroredPair(11, 12, 0.42, 0.42),
      [13, point(0.42, 0.27)],
      [14, point(0.68, 0.5)],
      [15, point(0.42, 0.12)],
      [16, point(0.76, 0.42)],
      ...mirroredPair(23, 24, 0.43, 0.7),
    ]);
    harness.update(oneArmOnly, 2148);

    expect(harness.validateGameplay(0.5)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'shoulderpress-both-arms',
    });
  });

  it('rejects a pull-up calibration when the feet stay planted', () => {
    const harness = makeHarness('pullups');
    const setup = pose([
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
      ...mirroredPair(27, 28, 0.45, 0.9),
    ]);
    for (let now = 0; now <= 2000; now += 200) harness.update(setup, now);
    harness.update(setup, 4100);
    const result = harness.validateCalibration('top');

    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/step 1|pull your body/i);
  });

  it('accepts a hanging pull-up range when knees stay bent and feet barely move', () => {
    const harness = makeHarness('pullups');
    const setup = pose([
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.42, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    for (let now = 0; now <= 2000; now += 200) harness.update(setup, now);

    const deadHang = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.73),
    ]);
    harness.update(deadHang, 4100);
    expect(harness.validateCalibration('top')).toMatchObject({
      valid: false,
      message: expect.stringMatching(/step 1|pull your body/i),
    });

    const top = pose([
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
      ...mirroredPair(27, 28, 0.45, 0.72),
    ]);
    harness.update(top, 4200);
    expect(harness.validateCalibration('top').valid).toBe(true);
    harness.save('top');

    const bottom = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.73),
    ]);
    harness.update(bottom, 4216);

    expect(harness.validateCalibration('bottom').valid).toBe(true);
    harness.save('bottom');
    expect(harness.validateGameplay(0).valid).toBe(true);

    const straightLegHang = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.9),
    ]);
    harness.update(straightLegHang, 4232);
    expect(harness.validateGameplay(0).valid).toBe(true);
    harness.update(straightLegHang, 5100);
    expect(harness.validateGameplay(0).valid).toBe(true);

    const feetDown = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    harness.update(feetDown, 5116);
    expect(harness.validateGameplay(0)).toMatchObject({ valid: true, fatal: false });
    harness.update(feetDown, 6000);
    expect(harness.validateGameplay(0)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'pullup-feet',
    });

    const oneFootDown = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      [27, point(0.45, 0.92)],
      [28, point(0.55, 0.73)],
    ]);
    harness.update(oneFootDown, 6016);
    expect(harness.validateGameplay(0)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'pullup-feet',
    });

    const oneFootHidden = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      [27, { x: 0.45, y: 0.92, visibility: 0.1 }],
      [28, point(0.55, 0.73)],
    ]);
    harness.update(oneFootHidden, 6025);
    expect(harness.validateGameplay(0)).toMatchObject({ valid: false, fatal: false });
    harness.update(oneFootHidden, 7300);
    expect(harness.validateGameplay(0)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'pullup-feet-unverified',
    });

    const wristTemporarilyHidden = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      [15, { x: 0.44, y: 0.14, visibility: 0.1 }],
      [16, point(0.56, 0.14)],
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.73),
    ]);
    harness.update(wristTemporarilyHidden, 7400);
    expect(harness.validateGameplay(0)).toMatchObject({ valid: false, fatal: false });
    harness.update(wristTemporarilyHidden, 8700);
    expect(harness.validateGameplay(0)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'pullup-grip-unverified',
    });

    const releasedBar = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.38),
      ...mirroredPair(15, 16, 0.44, 0.48),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.73),
    ]);
    harness.update(releasedBar, 8800);
    expect(harness.validateGameplay(0)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'pullup-bar',
    });
  });

  it('accepts a comfortable pull-up bottom position with a slight elbow bend', () => {
    const harness = makeHarness('pullups');
    const setup = pose([
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.42, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    for (let now = 0; now <= 2000; now += 200) harness.update(setup, now);

    const top = pose([
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
      ...mirroredPair(27, 28, 0.45, 0.72),
    ]);
    harness.update(top, 4200);
    expect(harness.validateCalibration('top').valid).toBe(true);
    harness.save('top');

    const slightBendBottom = pose([
      ...mirroredPair(11, 12, 0.44, 0.43),
      ...mirroredPair(13, 14, 0.43, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
      ...mirroredPair(27, 28, 0.45, 0.73),
    ]);
    harness.update(slightBendBottom, 4216);

    expect(harness.validateCalibration('bottom').valid).toBe(true);
  });

  it('accepts push-up calibration and gameplay with the phone in front', () => {
    const harness = makeHarness('pushups');
    const frontFacingTop = pose([
      ...mirroredPair(11, 12, 0.42, 0.35),
      ...mirroredPair(13, 14, 0.42, 0.5),
      ...mirroredPair(15, 16, 0.42, 0.65),
      ...mirroredPair(23, 24, 0.43, 0.58),
    ]);
    harness.update(frontFacingTop, 2100);

    expect(harness.validateCalibration('top').valid).toBe(true);
    harness.save('top');

    const frontFacingBottom = pose([
      ...mirroredPair(11, 12, 0.42, 0.45),
      ...mirroredPair(13, 14, 0.37, 0.5),
      ...mirroredPair(15, 16, 0.42, 0.65),
      ...mirroredPair(23, 24, 0.43, 0.62),
    ]);
    harness.update(frontFacingBottom, 2116);

    expect(harness.validateCalibration('bottom').valid).toBe(true);
    harness.save('bottom');
    expect(harness.validateGameplay(0).valid).toBe(true);

    const handsLifted = pose([
      ...mirroredPair(11, 12, 0.42, 0.45),
      ...mirroredPair(13, 14, 0.4, 0.4),
      ...mirroredPair(15, 16, 0.42, 0.35),
      ...mirroredPair(23, 24, 0.43, 0.62),
    ]);
    harness.update(handsLifted, 2132);
    expect(harness.validateGameplay(0)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'pushup-hands',
    });
  });

  it('rejects push-up calibration when the hands are raised near the head', () => {
    const harness = makeHarness('pushups');
    const handsRaised = pose([
      ...mirroredPair(11, 12, 0.42, 0.4),
      ...mirroredPair(13, 14, 0.4, 0.34),
      ...mirroredPair(15, 16, 0.42, 0.28),
      ...mirroredPair(23, 24, 0.43, 0.62),
    ]);
    harness.update(handsRaised, 2100);

    const result = harness.validateCalibration('top');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/hands on the floor/i);
  });
});
