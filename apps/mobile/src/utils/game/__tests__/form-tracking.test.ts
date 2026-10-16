import { SCRIPT_FORM_TRACKING } from '../html/scriptFormTracking';
import { SCRIPT_CORE } from '../html/scriptCore';
import { SCRIPT_GAME } from '../html/scriptGame';

type Point = { x: number; y: number; z?: number; visibility: number };
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
  const landmarks: Point[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [index, value] of entries) landmarks[index] = value;
  return landmarks;
}

function mirroredPair(leftIndex: number, rightIndex: number, x: number, y: number) {
  return [
    [leftIndex, point(x, y)],
    [rightIndex, point(1 - x, y)],
  ] as Array<[number, Point]>;
}

function makeHarness(exercise: string, floorY = 0.97, floorScale = 1) {
  let currentTime = 0;
  const factory = new Function(
    'CONFIG',
    'performance',
    'calibrationReadyAt',
    "var video=CONFIG.exercise==='pushups'?{videoWidth:720,videoHeight:1280}:undefined;" + SCRIPT_FORM_TRACKING +
      '; return {' +
      ' update: updateExperimentalFormPose,' +
      ' reset: resetExperimentalFormTracking,' +
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
    reset: () => void;
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
  // Pull-up fixtures explicitly demonstrate the floor while reaching for the bar.
  // This setup uses the same overhead posture as play. Shift their original timeline so this preparation
  // precedes every existing observation without introducing backwards clocks.
  let needsFloorPreparation = exercise === 'pullups';
  const prepareFloor = (firstPoseAt: number, firstPose: Point[]) => {
    const feetInitiallyVisible = [27, 28, 29, 30, 31, 32].some(index => {
      const p = firstPose[index];
      return p.visibility >= 0.22 && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
    });
    if (!feetInitiallyVisible) {
      // An upper-body-only fixture begins through the explicit cropped route.
      // Do not fabricate a floor observation that its later poses cannot verify.
      for (let t = firstPoseAt - 1400; t <= firstPoseAt - 100; t += 100) {
        currentTime = t;
        const reach = pose([
          ...mirroredPair(2, 5, 0.47, 0.25), ...mirroredPair(11, 12, 0.43, 0.44),
          ...mirroredPair(13, 14, 0.43, 0.27), ...mirroredPair(15, 16, 0.43, 0.10),
          ...mirroredPair(23, 24, 0.44, 0.65),
        ]);
        harness.update(reach, t);
      }
      needsFloorPreparation = false;
      return;
    }
    const standing = pose([
      ...mirroredPair(2, 5, 0.47, 0.14),
      ...mirroredPair(11, 12, 0.43, 0.44),
      ...mirroredPair(13, 14, 0.43, 0.27),
      ...mirroredPair(15, 16, 0.43, 0.10),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(25, 26, 0.445, (0.65 + floorY - 0.03) / 2),
      ...mirroredPair(27, 28, 0.45, floorY - 0.03),
      ...mirroredPair(29, 30, 0.455, floorY - 0.01),
      ...mirroredPair(31, 32, 0.435, floorY),
    ]).map(p => ({...p, x:0.5+(p.x-0.5)*floorScale, y:0.5+(p.y-0.5)*floorScale}));
    for(let t=firstPoseAt-1000;t<=firstPoseAt-200;t+=100){
      currentTime=t; harness.update(standing,t);
    }
    needsFloorPreparation=false;
  };
  return {
    ...harness,
    reset: (nextFloorY = floorY) => { floorY=nextFloorY; harness.reset(); needsFloorPreparation=exercise==='pullups'; },
    update: (landmarks: Point[], now: number) => {
      const poseAt = exercise === 'pullups' ? now + 2000 : now;
      if(needsFloorPreparation) prepareFloor(poseAt, landmarks);
      // Older synthetic fixtures described only the ankle. Complete that
      // synthetic foot explicitly; production must never invent these points.
      const observed = landmarks.map(p=>({...p}));
      if(exercise==='pullups') for(const [ankle,heel,toe] of [[27,29,31],[28,30,32]]) {
        if(observed[ankle].visibility>=0.35 && observed[heel].visibility===0 && observed[toe].visibility===0) {
          observed[heel]={...observed[ankle],y:observed[ankle].y+0.04};
          observed[toe]={...observed[ankle],y:observed[ankle].y+0.05};
        }
      }
      currentTime = poseAt;
      harness.update(observed, poseAt);
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

  it('uses shoulders rather than head movement to control squats', () => {
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

  it('calibrates pull-ups from the upper body when feet are outside the frame', () => {
    const harness = makeHarness('pullups');
    const preparationPose = pose([
      ...mirroredPair(2, 5, 0.47, 0.27),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.42, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
    ]);
    for (let now = 0; now <= 1900; now += 100) harness.update(preparationPose, now);

    const top = pose([
      ...mirroredPair(2, 5, 0.47, 0.16),
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
    ]);
    harness.update(top, 2100);
    expect(harness.validateCalibration('top').valid).toBe(true);
    harness.save('top');

    const bottom = pose([
      ...mirroredPair(2, 5, 0.47, 0.25),
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
    ]);
    harness.update(bottom, 2116);
    expect(harness.validateCalibration('bottom').valid).toBe(true);
    harness.save('bottom');
    expect(harness.validateGameplay(0).valid).toBe(true);
  });

  it('rejects a bent-arm bar grab when the eye line has not reached the bar', () => {
    const harness = makeHarness('pullups');
    const bentArmBarGrab = pose([
      ...mirroredPair(2, 5, 0.47, 0.26),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.36, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
    ]);
    for (let now = 0; now <= 1900; now += 100) harness.update(bentArmBarGrab, now);

    harness.update(bentArmBarGrab, 2100);
    expect(harness.validateCalibration('top')).toMatchObject({
      valid: false,
      message: expect.stringMatching(/eye line.*bar/i),
    });
  });

  it('rejects going onto the toes without bringing the eye line to the pull-up bar', () => {
    const harness = makeHarness('pullups');
    const barGrab = pose([
      ...mirroredPair(2, 5, 0.47, 0.27),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.36, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
    ]);
    for (let now = 0; now <= 1900; now += 100) harness.update(barGrab, now);

    const oneInchToeRise = pose([
      ...mirroredPair(2, 5, 0.47, 0.24),
      ...mirroredPair(11, 12, 0.43, 0.4),
      ...mirroredPair(13, 14, 0.36, 0.26),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.61),
    ]);
    harness.update(oneInchToeRise, 2100);

    expect(harness.validateCalibration('top')).toMatchObject({
      valid: false,
      message: expect.stringMatching(/eye line.*bar/i),
    });
  });

  it('rejects tiptoes and a head tilt even when the eyes appear level with the bar', () => {
    const harness = makeHarness('pullups');
    const barGrab = pose([
      ...mirroredPair(2, 5, 0.47, 0.27),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.36, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
    ]);
    for (let now = 0; now <= 1900; now += 100) harness.update(barGrab, now);

    const tiptoesAndHeadTilt = pose([
      ...mirroredPair(2, 5, 0.47, 0.165),
      ...mirroredPair(11, 12, 0.43, 0.4),
      ...mirroredPair(13, 14, 0.36, 0.26),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.61),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    harness.update(tiptoesAndHeadTilt, 2100);

    expect(harness.validateCalibration('top')).toMatchObject({
      valid: false,
      message: expect.stringMatching(/eye line.*bar|feet off the floor/i),
    });
  });

  it('rejects a head tilt even after enough shoulder travel to pass the movement check', () => {
    const harness = makeHarness('pullups');
    const setup = pose([
      ...mirroredPair(2, 5, 0.47, 0.27),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.42, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
    ]);
    for (let now = 0; now <= 1900; now += 100) harness.update(setup, now);

    const tiltedHead = pose([
      ...mirroredPair(2, 5, 0.47, 0.10),
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
    ]);
    harness.update(tiltedHead, 2100);
    expect(harness.validateCalibration('top').valid).toBe(false);
  });

  it('blocks pull-up step 1 when visible feet stay planted even with bent knees', () => {
    const harness = makeHarness('pullups');
    const setup = pose([
      ...mirroredPair(2, 5, 0.47, 0.27),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.42, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
      ...mirroredPair(25, 26, 0.445, 0.78),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    for (let now = 0; now <= 1900; now += 100) {
      harness.update(setup, now);
      harness.validateCalibration('top');
    }

    const feetStillPlanted = pose([
      ...mirroredPair(2, 5, 0.47, 0.16),
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
      ...mirroredPair(25, 26, 0.38, 0.74),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    harness.update(feetStillPlanted, 2100);
    expect(harness.validateCalibration('top')).toMatchObject({
      valid: false,
      message: expect.stringMatching(/feet off the floor/i),
    });

    const toesStillOnFloor = pose([
      ...mirroredPair(2, 5, 0.47, 0.16),
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
      ...mirroredPair(25, 26, 0.38, 0.74),
      ...mirroredPair(27, 28, 0.45, 0.87),
    ]);
    toesStillOnFloor[31] = point(0.435, 0.97);
    toesStillOnFloor[32] = point(0.565, 0.97);
    harness.update(toesStillOnFloor, 2200);
    expect(harness.validateCalibration('top')).toMatchObject({
      valid: false,
      message: expect.stringMatching(/feet off the floor/i),
    });
  });

  it('allows stationary airborne feet despite a large knee-angle change', () => {
    const harness = makeHarness('pullups');
    const setup = pose([
      ...mirroredPair(2, 5, 0.47, 0.27),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.42, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
      ...mirroredPair(25, 26, 0.445, 0.75),
      ...mirroredPair(27, 28, 0.45, 0.82),
    ]);
    for (let now = 0; now <= 1900; now += 100) harness.update(setup, now);

    const top = pose([
      ...mirroredPair(2, 5, 0.47, 0.16),
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
      ...mirroredPair(25, 26, 0.445, 0.72),
      ...mirroredPair(27, 28, 0.45, 0.818),
    ]);
    harness.update(top, 2100);
    expect(harness.validateCalibration('top').valid).toBe(true);
    harness.save('top');

    const bottom = pose([
      ...mirroredPair(2, 5, 0.47, 0.25),
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(25, 26, 0.37, 0.73),
      ...mirroredPair(27, 28, 0.45, 0.821),
    ]);
    harness.update(bottom, 2116);
    // Feet remain well above the explicitly observed 0.97 floor.
    expect(harness.validateCalibration('bottom').valid).toBe(true);
  });

  it('blocks pull-up step 2 when a visible foot anchors as the body lowers', () => {
    const harness = makeHarness('pullups');
    const setup = pose([
      ...mirroredPair(2, 5, 0.47, 0.27),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.42, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
      ...mirroredPair(25, 26, 0.445, 0.68),
      ...mirroredPair(27, 28, 0.45, 0.72),
    ]);
    for (let now = 0; now <= 1900; now += 100) {
      harness.update(setup, now);
      harness.validateCalibration('top');
    }
    const top = pose([
      ...mirroredPair(2, 5, 0.47, 0.16),
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
      ...mirroredPair(25, 26, 0.445, 0.64),
      ...mirroredPair(27, 28, 0.45, 0.62),
    ]);
    harness.update(top, 2100);
    expect(harness.validateCalibration('top').valid).toBe(true);
    harness.save('top');

    for (let now = 4000; now <= 5200; now += 100) {
      const shoulderY = 0.37 + (now - 4000) / 1200 * 0.07;
      const groundedBottom = pose([
        ...mirroredPair(2, 5, 0.47, shoulderY - 0.19),
        ...mirroredPair(11, 12, 0.44, shoulderY),
        ...mirroredPair(13, 14, 0.44, 0.28),
        ...mirroredPair(15, 16, 0.44, 0.14),
        ...mirroredPair(23, 24, 0.44, shoulderY + 0.21),
        ...mirroredPair(25, 26, 0.445, 0.79),
        ...mirroredPair(27, 28, 0.45, 0.92),
      ]);
      harness.update(groundedBottom, now);
      const result = harness.validateCalibration('bottom');
      if (now === 5200) {
        expect(result).toMatchObject({
          valid: false,
          message: expect.stringMatching(/feet off the floor/i),
        });
      }
    }
  });

  it('accepts bent knees and a switch to straight airborne legs during pull-ups', () => {
    const harness = makeHarness('pullups');
    const setup = pose([
      ...mirroredPair(2, 5, 0.47, 0.26),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.42, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    for (let now = 0; now <= 2000; now += 200) harness.update(setup, now);

    const deadHang = pose([
      ...mirroredPair(2, 5, 0.47, 0.27),
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.81),
    ]);
    for (let now = 3000; now <= 4100; now += 100) harness.update(deadHang, now);
    expect(harness.validateCalibration('top')).toMatchObject({
      valid: false,
      message: expect.stringMatching(/step 1|pull your body/i),
    });

    const top = pose([
      ...mirroredPair(2, 5, 0.47, 0.16),
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
      ...mirroredPair(2, 5, 0.47, 0.25),
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.81),
    ]);
    harness.update(bottom, 4216);

    expect(harness.validateCalibration('bottom').valid).toBe(true);
    harness.save('bottom');
    expect(harness.validateGameplay(0).valid).toBe(true);

    const upperBodyOnly = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
    ]);
    harness.update(upperBodyOnly, 4224);
    // Hidden feet are allowed even after a visible floor reference was captured.
    expect(harness.validateGameplay(0)).toMatchObject({ valid: true, fatal: false });

    const straightLegBottom = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(25, 26, 0.445, 0.79),
      ...mirroredPair(27, 28, 0.45, 0.895), // Sole stays visibly clear of the demonstrated floor.
    ]);
    harness.update(straightLegBottom, 4232);
    expect(harness.validateGameplay(0).valid).toBe(true);

    const straightLegTop = pose([
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
      ...mirroredPair(25, 26, 0.445, 0.69),
      ...mirroredPair(27, 28, 0.45, 0.828),
    ]);
    // Keep the camera stream continuous while changing from tucked to straight legs.
    for (let now = 4300; now < 5100; now += 100) harness.update(straightLegBottom, now);
    harness.update(straightLegBottom, 5100);
    expect(harness.validateGameplay(0).valid).toBe(true);
    harness.update(straightLegTop, 5600);
    expect(harness.validateGameplay(1).valid).toBe(true);
    harness.update(straightLegBottom, 6100);
    expect(harness.validateGameplay(0).valid).toBe(true);

    const feetDown = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(25, 26, 0.445, 0.79),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    harness.update(feetDown, 6200);
    expect(harness.validateGameplay(0)).toMatchObject({ valid: false, fatal: false });

    const feetDownAtTop = pose([
      ...mirroredPair(11, 12, 0.43, 0.35),
      ...mirroredPair(13, 14, 0.39, 0.25),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.56),
      ...mirroredPair(25, 26, 0.445, 0.74),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    for (let now = 6300; now < 6700; now += 100) harness.update(feetDown, now);
    harness.update(feetDownAtTop, 6700);
    expect(harness.validateGameplay(1)).toMatchObject({ valid: false, fatal: true, fatalKey: 'pullup-feet' });
    for (let now = 6800; now <= 7100; now += 100) harness.update(feetDown, now);
    expect(harness.validateGameplay(0)).toMatchObject({ valid: false, fatal: true, fatalKey: 'pullup-feet' });
    for (let now = 7200; now <= 7500; now += 100) harness.update(feetDown, now);
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
      ...mirroredPair(25, 26, 0.445, 0.79),
      [27, point(0.45, 0.92)],
      [28, point(0.55, 0.73)],
    ]);
    harness.update(oneFootDown, 7516);
    expect(harness.validateGameplay(0)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'pullup-feet',
    });

    // The planted-foot run has ended; verify grip loss in a fresh run.
    const gripHarness = calibratedPullupHarness();
    for (let now = 2400; now <= 7500; now += 100) gripHarness.update(pullupPose(0.44), now);
    const wristTemporarilyHidden = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.28),
      [15, { x: 0.44, y: 0.14, visibility: 0.1 }],
      [16, point(0.56, 0.14)],
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.81),
    ]);
    gripHarness.update(wristTemporarilyHidden, 7600);
    expect(gripHarness.validateGameplay(0)).toMatchObject({ valid: false, fatal: false });
    for (let now = 7700; now < 8900; now += 100) { gripHarness.update(wristTemporarilyHidden, now); gripHarness.validateGameplay(0); }
    gripHarness.update(wristTemporarilyHidden, 8900);
    expect(gripHarness.validateGameplay(0)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'pullup-grip-unverified',
    });

    const releasedBar = pose([
      ...mirroredPair(11, 12, 0.44, 0.44),
      ...mirroredPair(13, 14, 0.44, 0.38),
      ...mirroredPair(15, 16, 0.44, 0.48),
      ...mirroredPair(23, 24, 0.44, 0.65),
      ...mirroredPair(27, 28, 0.45, 0.81),
    ]);
    gripHarness.update(releasedBar, 9000);
    expect(gripHarness.validateGameplay(0)).toMatchObject({
      valid: false,
      fatal: true,
      fatalKey: 'pullup-bar',
    });
  });

  it('accepts a comfortable pull-up bottom position with a slight elbow bend', () => {
    const harness = makeHarness('pullups');
    const setup = pose([
      ...mirroredPair(2, 5, 0.47, 0.26),
      ...mirroredPair(11, 12, 0.43, 0.43),
      ...mirroredPair(13, 14, 0.42, 0.29),
      ...mirroredPair(15, 16, 0.44, 0.14),
      ...mirroredPair(23, 24, 0.44, 0.64),
      ...mirroredPair(27, 28, 0.45, 0.92),
    ]);
    setup[27].y = setup[28].y = 0.81; // Grip settled with feet already airborne.
    for (let now = 0; now <= 4100; now += 200) harness.update(setup, now);

    const top = pose([
      ...mirroredPair(2, 5, 0.47, 0.16),
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
      ...mirroredPair(27, 28, 0.45, 0.81),
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
    // Explicit front-facing prone torso depth; 2D alone also fits an upright person.
    frontFacingTop[11].z = frontFacingTop[12].z = -0.7;
    frontFacingTop[23].z = frontFacingTop[24].z = 0;
    frontFacingTop[25] = { x: 0.43, y: 0.73, z: 0.65, visibility: 1 };
    frontFacingTop[26] = { x: 0.57, y: 0.73, z: 0.65, visibility: 1 };
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


function pullupPose(shoulderY: number, footX?: number, footY?: number) {
  const norm = Math.max(0, Math.min(1, (0.44 - shoulderY) / 0.09));
  return pose([
    ...mirroredPair(2, 5, 0.47, shoulderY - 0.19),
    ...mirroredPair(11, 12, 0.44 - norm * 0.01, shoulderY),
    ...mirroredPair(13, 14, 0.44 - norm * 0.05, 0.28 - norm * 0.03),
    ...mirroredPair(15, 16, 0.44, 0.14),
    ...mirroredPair(23, 24, 0.44, shoulderY + 0.21),
    ...(footX === undefined || footY === undefined ? [] : mirroredPair(27, 28, footX, footY)),
  ]);
}

// Gameplay fixtures include a real preparation stream rather than treating a
// single landmark frame as a verified hang. Assertions below stay unchanged.
function observeStartingPullupPose(harness: ReturnType<typeof makeHarness>, landmarks: Point[], start = 1000) {
  for (let now = start; now <= start + 700; now += 100) harness.update(landmarks, now);
}

function calibratedPullupHarness(floorY = 0.97, visibleFeet = true) {
  const harness = makeHarness('pullups', floorY);
  const suspendedPose = (shoulderY: number) => visibleFeet
    ? pullupPose(shoulderY, 0.45, 0.81 - (0.44 - shoulderY))
    : pullupPose(shoulderY);
  observeStartingPullupPose(harness, suspendedPose(0.44));
  harness.update(suspendedPose(0.35), 2100);
  expect(harness.validateCalibration('top').valid).toBe(true);
  harness.save('top');
  harness.update(suspendedPose(0.44), 2300);
  expect(harness.validateCalibration('bottom').valid).toBe(true);
  harness.save('bottom');
  return harness;
}

describe('pull-up support evidence regressions', () => {
  it('rejects return to the demonstrated floor even when knees are occluded', () => {
    const harness = makeHarness('pullups');
    observeStartingPullupPose(harness, pullupPose(0.44, 0.45, 0.897));
    harness.update(pullupPose(0.35, 0.45, 0.897), 2100);
    expect(harness.validateCalibration('top').valid).toBe(true);
    harness.save('top');
    harness.update(pullupPose(0.44, 0.45, 0.92), 2300);
    // A single foot-pixel crossing may be jitter. Confirm sustained contact
    // before the 1.3-second calibration hold could complete, even with no knees.
    expect(harness.validateCalibration('bottom').valid).toBe(true);
    for (let now = 2400; now <= 2700; now += 100) {
      harness.update(pullupPose(0.44, 0.45, 0.92), now);
    }
    expect(harness.validateCalibration('bottom')).toMatchObject({
      valid: false, message: expect.stringMatching(/feet off the floor/i),
    });
  });

  it('allows an airborne leg change with horizontal foot movement at the same height', () => {
    const harness = calibratedPullupHarness();
    for (let elapsed = 0; elapsed <= 1400; elapsed += 100) {
      const progress = elapsed / 1400;
      harness.update(pullupPose(0.44 - 0.09 * progress, 0.45 - 0.1 * progress, 0.82), 3000 + elapsed);
      expect(harness.validateGameplay(progress).valid).toBe(true);
    }
  });

  it('accumulates slow shoulder travel while a foot remains planted', () => {
    const harness = calibratedPullupHarness();
    let check: FormCheck | undefined;
    for (let elapsed = 0; elapsed <= 6000; elapsed += 100) {
      const progress = elapsed / 6000;
      harness.update(pullupPose(0.44 - 0.06 * progress, 0.45, 0.92), 3000 + elapsed);
      check = harness.validateGameplay((0.06 * progress) / 0.09);
    }
    expect(check).toMatchObject({ valid: false, fatal: true, fatalKey: 'pullup-feet' });
  });

  it('allows the same slow movement when suspended feet travel with the body', () => {
    const harness = calibratedPullupHarness();
    for (let elapsed = 0; elapsed <= 6000; elapsed += 100) {
      const progress = elapsed / 6000;
      harness.update(pullupPose(0.44 - 0.06 * progress, 0.45, 0.897 - 0.06 * progress), 3000 + elapsed);
      expect(harness.validateGameplay((0.06 * progress) / 0.09).valid).toBe(true);
    }
  });

  it('keeps initially cropped feet unverified despite high-confidence estimates outside the image', () => {
    const harness = calibratedPullupHarness(0.97, false);
    for (let elapsed = 0; elapsed <= 1400; elapsed += 100) {
      const progress = elapsed / 1400;
      harness.update(pullupPose(0.44 - 0.09 * progress, 0.45, 1.1), 3000 + elapsed);
      expect(harness.validateGameplay(progress).valid).toBe(true);
    }
  });
});


function closePressPose(leftRaised: boolean, rightRaised = leftRaised, offset = 0) {
  const landmarks = pose([
    [11, point(0.32, 0.5 + offset)], [12, point(0.68, 0.5 + offset)],
    [13, point(leftRaised ? 0.3 : 0.15, (leftRaised ? 0.25 : 0.58) + offset)],
    [14, point(rightRaised ? 0.7 : 0.85, (rightRaised ? 0.25 : 0.58) + offset)],
    [15, point(0.15, 0.39 + offset)], [16, point(0.85, 0.39 + offset)],
  ]);
  if (leftRaised) landmarks[15] = { x: 0.28, y: -0.03, visibility: 0.05 };
  if (rightRaised) landmarks[16] = { x: 0.72, y: -0.03, visibility: 0.05 };
  return landmarks;
}

describe('close shoulder-press framing', () => {
  it('calibrates and plays with overhead wrists and hips outside the image', () => {
    const harness = makeHarness('shoulderpress');
    const top = closePressPose(true);
    const bottom = closePressPose(false);
    calibrateWeightedExercise(harness, top, bottom);
    const bottomController = harness.metrics().controllerY;
    harness.update(top, 2200);
    expect(harness.metrics().controllerY).toBeLessThan(bottomController - 0.06);
    expect(harness.validateGameplay(1).valid).toBe(true);
    harness.update(bottom, 2300);
    expect(harness.validateGameplay(0).valid).toBe(true);
  });

  it('does not jump as wrist confidence changes at the top edge', () => {
    const harness = makeHarness('shoulderpress');
    const top = closePressPose(true);
    calibrateWeightedExercise(harness, top, closePressPose(false));
    harness.update(top, 2200);
    const croppedController = harness.metrics().controllerY;
    top[15] = point(0.28, 0.001);
    top[16] = point(0.72, 0.001);
    harness.update(top, 2300);
    expect(harness.metrics().controllerY).toBeCloseTo(croppedController);
    expect(harness.validateGameplay(1).valid).toBe(true);
    top[15] = point(0.28, -0.02);
    top[16] = point(0.72, -0.02);
    harness.update(top, 2400);
    expect(harness.metrics().controllerY).toBeCloseTo(croppedController);
    expect(harness.validateGameplay(1).valid).toBe(true);
  });

  it('rejects a one-arm press even when the raised wrist is cropped', () => {
    const harness = makeHarness('shoulderpress');
    calibrateWeightedExercise(harness, closePressPose(true), closePressPose(false));
    harness.update(closePressPose(true, false), 2200);
    expect(harness.validateGameplay(0.5)).toMatchObject({
      valid: false, fatal: true, fatalKey: 'shoulderpress-both-arms',
    });
  });

  it('does not move the controller when the entire upper body moves vertically', () => {
    const harness = makeHarness('shoulderpress');
    calibrateWeightedExercise(harness, closePressPose(true), closePressPose(false));
    const before = harness.metrics().controllerY;
    harness.update(closePressPose(false, false, -0.12), 2200);
    expect(harness.metrics().controllerY).toBeCloseTo(before);
    expect(harness.validateGameplay(0).valid).toBe(true);
  });

  it('requires both elbows in the image rather than inventing missing joints', () => {
    const harness = makeHarness('shoulderpress');
    const top = closePressPose(true);
    top[13] = point(0.3, -0.03);
    harness.update(top, 2100);
    expect(harness.validateCalibration('top').valid).toBe(false);
  });

  it('rejects a lateral raise as the overhead press position', () => {
    const harness = makeHarness('shoulderpress');
    const top = closePressPose(true);
    top[13] = point(0.1, 0.5);
    top[14] = point(0.9, 0.5);
    harness.update(top, 2100);
    expect(harness.validateCalibration('top').valid).toBe(false);
  });
});


describe('shoulder-press lockout remains playable', () => {
  it('accepts straight arms below the calibrated bottom instead of requesting a form pause', () => {
    const harness = makeHarness('shoulderpress');
    calibrateWeightedExercise(harness, closePressPose(true), closePressPose(false));
    const bottomController = harness.metrics().controllerY;
    const loweredLockout = closePressPose(false);
    loweredLockout[13] = point(0.32, 0.72);
    loweredLockout[14] = point(0.68, 0.72);
    loweredLockout[15] = point(0.32, 0.95);
    loweredLockout[16] = point(0.68, 0.95);
    harness.update(loweredLockout, 2200);
    expect(harness.metrics().controllerY).toBeGreaterThan(bottomController);
    expect(harness.validateGameplay(0)).toMatchObject({ valid: true, fatal: false });
  });

  it('ignores contradictory wrist estimates during a verified overhead elbow position', () => {
    const harness = makeHarness('shoulderpress');
    calibrateWeightedExercise(harness, closePressPose(true), closePressPose(false));
    const lockedOut = closePressPose(true);
    harness.update(lockedOut, 2200);
    const overheadController = harness.metrics().controllerY;
    lockedOut[15] = point(0.3, 0.32);
    lockedOut[16] = point(0.7, 0.32);
    harness.update(lockedOut, 2300);
    expect(harness.metrics().controllerY).toBeCloseTo(overheadController);
    expect(harness.validateGameplay(1)).toMatchObject({ valid: true, fatal: false });
  });

  it('accepts both arms at full extension beyond slightly different calibrated tops', () => {
    const harness = makeHarness('shoulderpress');
    const calibratedTop = closePressPose(true);
    calibratedTop[13] = point(0.09, 0.3);
    calibrateWeightedExercise(harness, calibratedTop, closePressPose(false));
    harness.update(closePressPose(true), 2200);
    expect(harness.validateGameplay(1)).toMatchObject({ valid: true, fatal: false });
  });
});


function symmetricPose(shoulder: [number, number], elbow: [number, number], wrist: [number, number], hip: [number, number]) {
  return pose([
    ...mirroredPair(11, 12, ...shoulder), ...mirroredPair(13, 14, ...elbow),
    ...mirroredPair(15, 16, ...wrist), ...mirroredPair(23, 24, ...hip),
  ]);
}

// Give this pushup calibration fixture an explicitly prone torso, while keeping
// the existing joint angles that the gameplay/full-extension test exercises.
function withPronePushupTorso(points: Point[]) {
  points[11].z = points[12].z = -0.7;
  points[23].z = points[24].z = 0;
  points[25] = { x: 0.43, y: 0.73, z: 0.65, visibility: 1 };
  points[26] = { x: 0.57, y: 0.73, z: 0.65, visibility: 1 };
  return points;
}

const exerciseLockouts = [
  {
    exercise: 'pushups', norm: 1,
    top: withPronePushupTorso(symmetricPose([0.42, 0.35], [0.355, 0.5], [0.42, 0.65], [0.43, 0.58])),
    bottom: symmetricPose([0.42, 0.45], [0.33, 0.5], [0.42, 0.65], [0.43, 0.62]),
    lockout: symmetricPose([0.42, 0.25], [0.42, 0.45], [0.42, 0.65], [0.43, 0.48]),
  },
  {
    exercise: 'biceps', norm: 0,
    top: symmetricPose([0.42, 0.3], [0.42, 0.5], [0.28, 0.35], [0.43, 0.7]),
    bottom: symmetricPose([0.42, 0.3], [0.42, 0.5], [0.22, 0.54], [0.43, 0.7]),
    lockout: symmetricPose([0.42, 0.3], [0.42, 0.5], [0.42, 0.75], [0.43, 0.7]),
  },
  {
    exercise: 'lateralraise', norm: 1,
    top: symmetricPose([0.42, 0.48], [0.25, 0.48], [0.08, 0.48], [0.43, 0.8]),
    bottom: symmetricPose([0.42, 0.48], [0.42, 0.64], [0.42, 0.8], [0.43, 0.8]),
    lockout: symmetricPose([0.42, 0.48], [0.42, 0.28], [0.42, 0.08], [0.43, 0.8]),
  },
  {
    exercise: 'shoulderpress', norm: 1,
    top: closePressPose(true), bottom: closePressPose(false), lockout: closePressPose(true),
  },
  {
    exercise: 'squats', norm: 1,
    top: pose([...mirroredPair(11,12,0.42,0.3), ...mirroredPair(23,24,0.43,0.5), ...mirroredPair(25,26,0.38,0.7), ...mirroredPair(27,28,0.45,0.9)]),
    bottom: pose([...mirroredPair(11,12,0.44,0.44), ...mirroredPair(23,24,0.44,0.64), ...mirroredPair(25,26,0.34,0.68), ...mirroredPair(27,28,0.45,0.91)]),
    lockout: pose([...mirroredPair(11,12,0.44,0.23), ...mirroredPair(23,24,0.44,0.45), ...mirroredPair(25,26,0.44,0.7), ...mirroredPair(27,28,0.44,0.95)]),
  },
  {
    exercise: 'pullups', norm: 0,
    top: pose([...mirroredPair(2,5,0.47,0.16), ...mirroredPair(11,12,0.43,0.35), ...mirroredPair(13,14,0.32,0.25), ...mirroredPair(15,16,0.44,0.14), ...mirroredPair(23,24,0.44,0.56)]),
    bottom: symmetricPose([0.44,0.44], [0.345,0.29], [0.44,0.14], [0.44,0.65]),
    lockout: symmetricPose([0.44,0.54], [0.44,0.34], [0.44,0.14], [0.44,0.75]),
  },
];

describe('full extension across all exercises', () => {
  it.each(exerciseLockouts)('keeps $exercise lockout as playable endpoint input', ({exercise, top, bottom, lockout, norm}) => {
    const harness = makeHarness(exercise);
    if (exercise === 'pullups') observeStartingPullupPose(harness, pullupPose(0.44));
    calibrateWeightedExercise(harness, top, bottom);
    const bottomValue = harness.metrics().controllerY;
    harness.update(top, 2150);
    const topValue = harness.metrics().controllerY;
    harness.update(lockout, 2200);
    if (norm === 1) expect(harness.metrics().controllerY).toBeLessThanOrEqual(topValue);
    else expect(harness.metrics().controllerY).toBeGreaterThanOrEqual(bottomValue);
    expect(harness.validateGameplay(norm)).toMatchObject({valid: true, fatal: false});
  });

  it('still rejects an unrelated joint angle in the middle of a movement', () => {
    const metricMatches = new Function(SCRIPT_FORM_TRACKING + ';return formMetricMatches;')() as
      (value: number, top: number, bottom: number, norm: number, tolerance: number) => boolean;
    expect(metricMatches(180, 135, 80, 0.5, 32)).toBe(false);
    expect(metricMatches(20, 90, 150, 0.5, 30)).toBe(false);
  });

  it('compares both wrists at their clamped endpoints after unequal calibration ranges', () => {
    const factory = new Function(SCRIPT_FORM_TRACKING + ';return function(){' +
      'formTopMetrics={leftWrist:{y:0.35},rightWrist:{y:0.35}};' +
      'formBottomMetrics={leftWrist:{y:0.5},rightWrist:{y:0.65}};' +
      'return formBilateralWristMotionMatches({leftWrist:{y:0.75},rightWrist:{y:0.75}});};')() as () => boolean;
    expect(factory()).toBe(true);
  });
});


function calfRaisePose(shoulderY: number) {
  const landmarks = pullupPose(shoulderY);
  const lift = 0.44 - shoulderY;
  for (const [left, right, x, y] of [
    [27, 28, 0.45, 0.9 - lift],
    [29, 30, 0.44, 0.94 - lift],
    [31, 32, 0.47, 0.97],
  ]) {
    landmarks[left] = point(x, y);
    landmarks[right] = point(1 - x, y);
  }
  return landmarks;
}

describe('pull-up calf-raise and unreliable bar-reference regressions', () => {
  it('rejects calf raises when toes stay planted while heels and ankles rise', () => {
    const harness = calibratedPullupHarness();
    let check: FormCheck | undefined;
    for (let elapsed = 0; elapsed <= 2000; elapsed += 100) {
      const progress = elapsed / 2000;
      harness.update(calfRaisePose(0.44 - 0.06 * progress), 3000 + elapsed);
      check = harness.validateGameplay(progress * 2 / 3);
    }
    expect(check).toMatchObject({valid: false, fatal: true, fatalKey: 'pullup-feet'});
  });

  it('rejects small repeated calf raises that never cover half the calibrated shoulder range', () => {
    const harness = calibratedPullupHarness();
    let rejected = false;
    for (let elapsed = 0; elapsed <= 5000; elapsed += 100) {
      const lift = 0.025 * (1 - Math.cos(elapsed / 600)) / 2;
      harness.update(calfRaisePose(0.44 - lift), 3000 + elapsed);
      const check = harness.validateGameplay(lift / 0.09);
      rejected = rejected || check.fatalKey === 'pullup-feet';
    }
    expect(rejected).toBe(true);
  });

  it('rejects toe contact across calibration even when the averaged feet move with the body', () => {
    const harness = makeHarness('pullups');
    harness.update(calfRaisePose(0.44), 1000);
    harness.update(calfRaisePose(0.35), 2100);
    harness.save('top');
    harness.update(calfRaisePose(0.44), 2300);
    expect(harness.validateCalibration('bottom')).toMatchObject({valid: false});
  });

  it('allows suspended straight legs when toes, heels, and ankles travel with the body', () => {
    const harness = calibratedPullupHarness();
    for (let elapsed = 0; elapsed <= 2400; elapsed += 100) {
      const progress = elapsed / 2400;
      const lift = 0.09 * progress;
      const landmarks = calfRaisePose(0.44 - lift);
      for (const index of [27,28,29,30,31,32]) landmarks[index].y -= 0.03;
      landmarks[31].y -= lift;
      landmarks[32].y -= lift;
      harness.update(landmarks, 3000 + elapsed);
      expect(harness.validateGameplay(progress).valid).toBe(true);
    }
  });

  it('does not accept low-confidence eyes as proof that the head reached the bar', () => {
    const harness = makeHarness('pullups');
    observeStartingPullupPose(harness, pullupPose(0.44));
    const top = pullupPose(0.35);
    top[2].visibility = 0.2;
    top[5].visibility = 0.2;
    harness.update(top, 2100);
    expect(harness.validateCalibration('top').valid).toBe(false);
  });

  it('does not average a below-bar eye with an incorrectly high eye to accept the top', () => {
    const harness = makeHarness('pullups');
    observeStartingPullupPose(harness, pullupPose(0.44));
    const top = pullupPose(0.35);
    top[2].y = 0.27;
    top[5].y = 0.01;
    harness.update(top, 2100);
    expect(harness.validateCalibration('top').valid).toBe(false);
  });

  it('does not use estimated hands outside the image as a pull-up bar reference', () => {
    const harness = makeHarness('pullups');
    for (const [shoulder, now] of [[0.44, 1000], [0.35, 2100]]) {
      const landmarks = pullupPose(shoulder);
      landmarks[15].x = -0.1;
      landmarks[16].x = 1.1;
      harness.update(landmarks, now);
    }
    expect(harness.validateCalibration('top').valid).toBe(false);
  });

  it('rejects opposing hand movement that would cancel out in the averaged bar position', () => {
    const harness = calibratedPullupHarness();
    const landmarks = pullupPose(0.44, 0.45, 0.81);
    landmarks[15].y += 0.1;
    landmarks[16].y -= 0.1;
    harness.update(landmarks, 3000);
    expect(harness.validateGameplay(0)).toMatchObject({valid: false, fatal: true, fatalKey: 'pullup-bar'});
  });
});


it('does not calibrate a pull-up bottom by moving hands in opposite directions', () => {
  const harness = makeHarness('pullups');
  observeStartingPullupPose(harness, pullupPose(0.44));
  harness.update(pullupPose(0.35), 2100);
  expect(harness.validateCalibration('top').valid).toBe(true);
  harness.save('top');
  const bottom = pullupPose(0.44);
  bottom[15].y += 0.09;
  bottom[16].y -= 0.09;
  harness.update(bottom, 2300);
  expect(harness.validateCalibration('bottom').valid).toBe(false);
});

function straightLegCalibrationPose(shoulderY: number, footY: number, toeY: number, scale: number) {
  const norm = Math.max(0, Math.min(1, (0.44 - shoulderY) / 0.09));
  const hipsY = shoulderY + 0.21;
  const landmarks = pose([
    ...mirroredPair(2, 5, 0.47, shoulderY - 0.19),
    ...mirroredPair(11, 12, 0.44 - norm * 0.01, shoulderY),
    ...mirroredPair(13, 14, 0.44 - norm * 0.05, 0.28 - norm * 0.03),
    ...mirroredPair(15, 16, 0.44, 0.14),
    ...mirroredPair(23, 24, 0.44, hipsY),
    ...mirroredPair(25, 26, 0.445, (hipsY + footY - 0.03) / 2),
    ...mirroredPair(27, 28, 0.45, footY - 0.03),
    ...mirroredPair(29, 30, 0.455, footY - 0.01),
    ...mirroredPair(31, 32, 0.435, toeY),
  ]);
  return landmarks.map(p => ({ ...p, x: 0.5 + (p.x - 0.5) * scale, y: 0.5 + (p.y - 0.5) * scale }));
}

function takeOffAfterGroundedSetup(scale: number, calfRaise = false, jitter = false) {
  const harness = makeHarness('pullups', 0.91, scale);
  for (let now = 2100; now <= 3300; now += 100) {
    harness.update(straightLegCalibrationPose(0.44 - 0.03 * (now - 2100) / 1200, 0.91, 0.91, scale), now);
    harness.validateCalibration('top');
  }
  expect(harness.validateCalibration('top').message).toMatch(/feet off the floor/i);
  // Leave the demonstrated floor and settle into an airborne bottom first.
  // Jumping directly to a high pose is not evidence of a pull from that hang.
  for (let now = 3400; now <= 4300; now += 100) {
    const footY = jitter ? 0.91 - (now % 200 === 0 ? 0.003 : 0) : 0.87;
    harness.update(straightLegCalibrationPose(0.43, footY, calfRaise ? 0.91 : footY, scale), now);
    harness.validateCalibration('top');
  }
  for (let now = 4400; now <= 6100; now += 100) {
    const progress = Math.min(1, (now - 4300) / 1000);
    const footY = jitter ? 0.91 - (now % 200 === 0 ? 0.003 : 0) : 0.87 - 0.06 * progress;
    harness.update(straightLegCalibrationPose(0.43 - 0.08 * progress, footY,
      calfRaise ? 0.91 : footY, scale), now);
    harness.validateCalibration('top');
  }
  return harness;
}

describe('straight-leg takeoff after a grounded setup', () => {
  test.each([0.65, 1, 1.1])('clears old support evidence with straight knees at camera scale %s', scale => {
    const harness = takeOffAfterGroundedSetup(scale);
    const metrics = harness.metrics() as { controllerY: number; kneeAngle: number };
    expect(metrics.kneeAngle).toBeGreaterThan(175);
    expect(harness.validateCalibration('top').valid).toBe(true);
  });

  test.each([0.65, 1, 1.1])('keeps a stationary toe blocked despite rising heels at scale %s', scale => {
    expect(takeOffAfterGroundedSetup(scale, true).validateCalibration('top')).toMatchObject({
      valid: false, message: expect.stringMatching(/feet off the floor/i),
    });
  });

  test.each([0.65, 1, 1.1])('does not clear a floor warning from small landmark jitter at scale %s', scale => {
    expect(takeOffAfterGroundedSetup(scale, false, true).validateCalibration('top')).toMatchObject({
      valid: false, message: expect.stringMatching(/feet off the floor/i),
    });
  });
});

// Start with observed floor contact, lift off, then calibrate with feet tucked.
// Gameplay must remember that floor independently of knee angle or shoulder motion.
function pullupWithObservedFloor(scale = 1) {
  const harness = takeOffAfterGroundedSetup(scale);
  for (let now = 6200; now <= 7000; now += 100) {
    harness.update(straightLegCalibrationPose(0.35, 0.75, 0.75, scale), now);
    expect(harness.validateCalibration('top').valid).toBe(true);
  }
  harness.save('top');
  for (let now = 7100; now <= 8500; now += 100) {
    const p = (now - 7100) / 1400;
    harness.update(straightLegCalibrationPose(0.35 + 0.09 * p, 0.75 + 0.05 * p, 0.75 + 0.05 * p, scale), now);
    harness.validateCalibration('bottom');
  }
  expect(harness.validateCalibration('bottom').valid).toBe(true);
  harness.save('bottom');
  return harness;
}

describe('observed support after calibration', () => {
  test.each([0.65, 1, 1.1])('rejects feet put back down while shoulders remain still at scale %s', scale => {
    const harness = pullupWithObservedFloor(scale);
    let check: FormCheck | undefined;
    // Let the old movement window expire while suspended.
    for (let now = 8600; now < 16000; now += 100) {
      harness.update(straightLegCalibrationPose(0.44, 0.87, 0.87, scale), now);
      expect(harness.validateGameplay(0).valid).toBe(true);
    }
    for (let now = 16000; now <= 17200; now += 100) {
      const jitter = 0.002 * Math.sin(now / 130);
      harness.update(straightLegCalibrationPose(0.44, 0.91 + jitter, 0.91 + jitter, scale), now);
      check = harness.validateGameplay(0);
    }
    expect(check).toMatchObject({ valid: false, fatal: true, fatalKey: 'pullup-feet' });
  });

  it('detects one planted toe while the heel, ankle and other foot remain raised', () => {
    const harness = pullupWithObservedFloor();
    let check: FormCheck | undefined;
    for (let now = 9000; now <= 10200; now += 100) {
      const landmarks = straightLegCalibrationPose(0.44, 0.85, 0.85, 1);
      landmarks[32].y = 0.91;
      harness.update(landmarks, now);
      check = harness.validateGameplay(0);
    }
    expect(check).toMatchObject({ valid: false, fatal: true, fatalKey: 'pullup-feet' });
  });

  it('accepts straight suspended legs lower than the tucked calibration feet', () => {
    const harness = pullupWithObservedFloor();
    for (let now = 9000; now <= 17000; now += 100) {
      harness.update(straightLegCalibrationPose(0.44, 0.885, 0.885, 1), now);
      expect((harness.metrics() as { controllerY: number; kneeAngle: number }).kneeAngle).toBeGreaterThan(175);
      expect(harness.validateGameplay(0).valid).toBe(true);
    }
  });

  it('does not turn a brief floor-height estimate into a fatal contact', () => {
    const harness = pullupWithObservedFloor();
    for (let now = 9000; now <= 11000; now += 100) {
      const footY = now < 9200 ? 0.91 : 0.87;
      harness.update(straightLegCalibrationPose(0.44, footY, footY, 1), now);
      // Current contact invalidates control immediately; a short estimate must
      // not become confirmed contact or make the run fatal.
      expect(harness.validateGameplay(0)).toMatchObject({ valid: now >= 9200, fatal: false });
    }
  });

  it('does not count hidden observations or camera gaps as floor-contact time', () => {
    const harness = pullupWithObservedFloor();
    const down = straightLegCalibrationPose(0.44, 0.91, 0.91, 1);
    for (const now of [9000, 9100, 10000, 10100]) {
      harness.update(down, now);
      // The 900ms hole may temporarily invalidate tracking, but cannot supply
      // observed contact time or cause a planted-foot fatal decision.
      expect(harness.validateGameplay(0).fatal).toBe(false);
    }
    const hidden = straightLegCalibrationPose(0.44, 0.91, 0.91, 1);
    for (const index of [27, 28, 29, 30, 31, 32]) hidden[index].visibility = 0;
    harness.update(hidden, 10200);
    expect(harness.validateGameplay(0)).toMatchObject({ valid: true, fatal: false });
    for (const now of [10300, 10400, 10500]) {
      harness.update(down, now);
      expect(harness.validateGameplay(0)).toMatchObject({ valid: false, fatal: false });
    }
    for (let now = 10600; now <= 11500; now += 100) {
      harness.update(down, now);
      harness.validateGameplay(0);
    }
    expect(harness.validateGameplay(0).fatalKey).toBe('pullup-feet');
  });

  it('does not infer floor height from the lowest calibrated airborne feet', () => {
    const harness = calibratedPullupHarness(0.995);
    for (let now = 3000; now <= 10000; now += 100) {
      harness.update(straightLegCalibrationPose(0.44, 0.97, 0.97, 1), now);
      expect(harness.validateGameplay(0).valid).toBe(true);
    }
  });

  it('does not reuse a floor reference after a full calibration reset', () => {
    const harness = pullupWithObservedFloor();
    harness.reset(0.97); // A new camera setup explicitly demonstrates a different floor.
    observeStartingPullupPose(harness, pullupPose(0.44, 0.45, 0.81), 10500);
    harness.update(pullupPose(0.35, 0.45, 0.72), 11600);
    expect(harness.validateCalibration('top').valid).toBe(true);
    harness.save('top');
    harness.update(pullupPose(0.44, 0.45, 0.81), 11700);
    expect(harness.validateCalibration('bottom').valid).toBe(true);
    harness.save('bottom');
    for (let now = 12000; now <= 17000; now += 100) {
      harness.update(straightLegCalibrationPose(0.44, 0.91, 0.91, 1), now);
      expect(harness.validateGameplay(0).valid).toBe(true);
    }
  });
});
