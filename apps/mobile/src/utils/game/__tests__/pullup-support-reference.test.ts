import { SCRIPT_PULLUP_SUPPORT } from '../html/scriptPullupSupport';

type Point = { x: number; y: number };
type Check = { valid: boolean; message: string; fatal: boolean; fatalKey: string; contactConfirmed?: boolean };
type Metrics = {
  shoulders: Point | null; hips: Point | null; eyes: Point | null;
  leftWrist: Point | null; rightWrist: Point | null;
  leftHeel: Point | null; leftToe: Point | null; rightHeel: Point | null; rightToe: Point | null;
  leftFoot: Point | null; rightFoot: Point | null;
  leftAnkle: Point | null; rightAnkle: Point | null;
  leftKneeAngle: number | null; rightKneeAngle: number | null;
  elbowCount: number;
  leftShoulder: Point; rightShoulder: Point; leftElbow: Point; rightElbow: Point;
  leftElbowAngle: number; rightElbowAngle: number;
};

function standing(): Metrics {
  return {
    shoulders: { x: 0.5, y: 0.4 }, hips: { x: 0.5, y: 0.62 }, eyes: { x: 0.5, y: 0.31 },
    leftWrist: { x: 0.4, y: 0.14 }, rightWrist: { x: 0.6, y: 0.14 },
    leftHeel: { x: 0.44, y: 0.9 }, leftToe: { x: 0.42, y: 0.91 },
    rightHeel: { x: 0.56, y: 0.9 }, rightToe: { x: 0.58, y: 0.91 },
    leftFoot: { x: 0.44, y: 0.89 }, rightFoot: { x: 0.56, y: 0.89 },
    leftAnkle: { x: 0.44, y: 0.87 }, rightAnkle: { x: 0.56, y: 0.87 },
    leftKneeAngle: 175, rightKneeAngle: 175, elbowCount: 2,
    leftShoulder: {x:0.4,y:0.4}, rightShoulder: {x:0.6,y:0.4},
    leftElbow: {x:0.4,y:0.27}, rightElbow: {x:0.6,y:0.27},
    leftElbowAngle: 180, rightElbowAngle: 180,
  };
}

const soleKeys = ['leftHeel', 'leftToe', 'rightHeel', 'rightToe'] as const;
function hanging(lift = 0.04): Metrics {
  const m = standing();
  m.leftWrist = { x: 0.4, y: 0.14 }; m.rightWrist = { x: 0.6, y: 0.14 };
  for (const key of soleKeys) m[key] = { ...m[key]!, y: m[key]!.y - lift };
  return m;
}

function hiddenFeet(): Metrics {
  const m = hanging();
  for (const key of [...soleKeys, 'leftFoot', 'rightFoot', 'leftAnkle', 'rightAnkle'] as const) m[key] = null;
  return m;
}

function harness() {
  let now = 0;
  const valid = (): Check => ({ valid: true, message: '', fatal: false, fatalKey: '' });
  const factory = new Function('formValid', 'formInvalid', 'formFatal', 'formDistance', SCRIPT_PULLUP_SUPPORT + `
    return { update: updatePullupSupportReference, reset: resetPullupSupportReference,
      resetRun: resetPullupSupportRun,
      hasContact: pullupFloorHasContactEvidence,
      setup: getPullupSupportSetup, calibration: pullupFloorCalibrationCheck,
      gameplay: pullupFloorGameplayCheck, debug: pullupSupportDebug };
  `) as (
    a: () => Check, b: (s: string) => Check, c: (s: string, key: string) => Check,
    d: (a: Point, b: Point) => number,
  ) => {
    update: (m: Metrics, now: number) => void;
    reset: () => void;
    resetRun: () => void;
    hasContact: () => boolean;
    setup: () => { ready: boolean; progress: number; mode: string; message: string };
    calibration: () => Check; gameplay: () => Check;
    debug: () => {
      floor: unknown; mode: string;
      left: { current: string; confirmed: boolean; contactMs: number } | null;
      right: { current: string; confirmed: boolean; contactMs: number } | null;
    };
  };
  const h = factory(valid, s => ({ ...valid(), valid: false, message: s }),
    (s, key) => ({ valid: false, message: s, fatal: true, fatalKey: key }),
    (a, b) => Math.hypot(a.x - b.x, a.y - b.y));
  return {
    ...h,
    pose(m: Metrics, elapsed = 50) { now += elapsed; h.update(m, now); },
    hold(m: Metrics, duration: number) { for (let t = 0; t < duration; t += 50) { now += 50; h.update(m, now); } },
    repeat(m: Metrics) { h.update(m, now); },
  };
}

function readyHarness() {
  const h = harness(); h.hold(standing(), 850);
  expect(h.setup()).toMatchObject({ ready: true, mode: 'floor' });
  h.hold(hanging(), 600);
  expect(h.calibration().valid).toBe(true);
  return h;
}

describe('explicit pull-up floor reference', () => {
  it('requires a stable standing observation before saving the floor', () => {
    const h = harness(); h.hold(standing(), 500);
    expect(h.setup().ready).toBe(false);
    h.hold(standing(), 350);
    expect(h.setup()).toMatchObject({ ready: true, mode: 'floor' });
    expect(h.calibration().message).toMatch(/feet off the floor/);
  });

  it('finishes standing setup at four fresh camera poses per second', () => {
    const h = harness();
    for (let i = 0; i < 4; i++) h.pose(standing(), 250);
    expect(h.setup().ready).toBe(false);
    h.pose(standing(), 250);
    expect(h.setup()).toMatchObject({ ready: true, mode: 'floor' });
  });

  it('finishes standing setup at two fresh camera poses per second', () => {
    const h = harness();
    for (let i = 0; i < 4; i++) h.pose(standing(), 500);
    expect(h.setup().ready).toBe(false);
    h.pose(standing(), 500);
    expect(h.setup()).toMatchObject({ ready: true, mode: 'floor' });
  });

  it('never learns the floor from anchored airborne feet and raised hands', () => {
    const h = harness(); const m = hanging(0.15); m.leftKneeAngle = m.rightKneeAngle = 70;
    for (let i = 0; i < 60; i++) { m.shoulders!.y = 0.4 - i * 0.001; h.pose(m); }
    expect(h.setup().ready).toBe(false); expect(h.debug().floor).toBeNull();
  });

  it('allows the reach with an unverified floor when only an averaged foot is visible', () => {
    const h = harness(); const m = hiddenFeet(); m.leftFoot = { x: 0.4, y: 0.9 };
    h.hold(m, 3000); expect(h.setup()).toMatchObject({ready:true,mode:'unverified'});
  });

  it('does not save a floor while feet are moving', () => {
    const h = harness();
    for (let i = 0; i < 40; i++) {
      const m = standing(); for (const key of soleKeys) m[key]!.y += i % 2 ? 0.025 : 0;
      h.pose(m);
    }
    expect(h.setup().ready).toBe(false);
  });

  it('does not block reach setup when initially visible feet leave view', () => {
    const h = harness(); h.hold(hanging(), 400); h.hold(hiddenFeet(), 2500);
    expect(h.setup()).toMatchObject({ ready: true, mode: 'unverified' });
    h.hold(standing(), 850);
    expect(h.setup()).toMatchObject({ ready: true, mode: 'unverified' });
  });

  it('does not permanently block an upper-body view after one foot-estimate outlier', () => {
    for (const named of [false, true]) {
      const h = harness(); const outlier = hiddenFeet();
      if (named) outlier.leftToe = { x: 0.44, y: 0.9 };
      else outlier.leftFoot = { x: 0.44, y: 0.9 };
      h.pose(outlier); h.hold(hiddenFeet(), 1500);
      expect(h.setup()).toMatchObject({ ready: true, mode: 'unverified' });
    }
  });

  it('preserves the standing floor after jumping to reach a high bar', () => {
    const h = harness(); h.hold(standing(), 850);
    const floor = JSON.stringify(h.debug().floor);
    h.hold(hanging(0.14), 500); h.hold(hiddenFeet(), 500);
    expect(h.setup()).toMatchObject({ ready: true, mode: 'floor' });
    expect(JSON.stringify(h.debug().floor)).toBe(floor);
    expect(h.calibration().valid).toBe(true);
    h.hold(hanging(0.14), 300);
    expect(h.calibration().valid).toBe(true);
    h.hold(hanging(0), 800);
    expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('returns a floor failure after a calibrated player plants both feet and stays still', () => {
    const h = readyHarness(); h.hold(hanging(0), 800);
    expect(h.gameplay()).toMatchObject({ fatal: true, fatalKey: 'pullup-feet' });
  });

  it('catches a single planted toe during a calf raise', () => {
    const h = readyHarness(); const m = hanging(0.07); m.rightToe!.y = 0.91;
    h.hold(m, 800); expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('keeps floor contact independent of the wrist estimate', () => {
    const h = readyHarness(); const m = hanging(0);
    m.leftWrist!.y += 10 / 640; m.rightWrist!.y += 10 / 640;
    h.hold(m, 800); expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('detects a foot placed sideways from its setup position', () => {
    const h = readyHarness(); const m = hanging(0);
    for (const key of soleKeys) m[key]!.x += 50 / 480;
    h.hold(m, 800); expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('detects feet lower in the image than their saved floor positions', () => {
    const h = readyHarness(); const lowerFoot = hanging(-30 / 640);
    // Translate the whole foot together so this tests a changed floor position,
    // rather than stretching a toe prediction against the bottom crop boundary.
    lowerFoot.leftAnkle!.y += 30 / 640; lowerFoot.rightAnkle!.y += 30 / 640;
    h.hold(lowerFoot, 800);
    expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('retains sufficient floor evidence through isolated uncertain frames', () => {
    const h = readyHarness();
    for (let i = 0; i < 24; i++) h.pose(i % 4 === 0 ? hiddenFeet() : hanging(0), 50);
    expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('blocks observed contact while allowing an actually clear current foot estimate', () => {
    const h = readyHarness(); h.hold(hanging(0), 800); expect(h.calibration().valid).toBe(false);
    for (let i = 0; i < 12; i++) {
      h.pose(i % 4 === 0 ? hanging(0.03) : hanging(0), 50);
      expect(h.calibration().valid).toBe(i % 4 === 0);
    }
  });

  it('allows straight airborne legs close to the floor and bent airborne legs', () => {
    const h = readyHarness();
    for (const bend of [175, 55]) {
      const m = hanging(0.015); m.leftKneeAngle = m.rightKneeAngle = bend;
      h.hold(m, 1800); expect(h.gameplay().valid).toBe(true);
    }
  });

  it('does not infer a second floor when airborne feet stay still while shoulders rise', () => {
    const h = readyHarness(); const originalFloor = JSON.stringify(h.debug().floor);
    for (let i = 0; i < 60; i++) {
      const m = hanging(0.12); m.shoulders!.y -= 0.06 * i / 60;
      m.leftKneeAngle = m.rightKneeAngle = 55;
      h.pose(m); expect(h.gameplay().valid).toBe(true);
    }
    expect(JSON.stringify(h.debug().floor)).toBe(originalFloor);
  });

  it('does not treat ankles or averaged feet as sole contact', () => {
    const h = readyHarness(); const m = hanging(0.06);
    m.leftAnkle!.y = m.rightAnkle!.y = 0.92; m.leftFoot!.y = m.rightFoot!.y = 0.92;
    h.hold(m, 1200); expect(h.gameplay().valid).toBe(true);
  });

  it('does not accumulate contact by validating a stale pose repeatedly', () => {
    const h = readyHarness(); h.pose(hanging(0));
    for (let i = 0; i < 100; i++) {
      h.repeat(hanging(0)); expect(h.gameplay()).toMatchObject({ valid: false, fatal: false });
    }
  });

  it('does not accumulate a hold across a camera-stream gap', () => {
    const h = readyHarness(); h.hold(hanging(0), 300); h.pose(hanging(0), 1200);
    expect(h.gameplay()).toMatchObject({ valid: false, fatal: false }); h.hold(hanging(0), 300);
    expect(h.gameplay()).toMatchObject({ valid: false, fatal: false }); h.hold(hanging(0), 300);
    expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('allows calibration takeoff after observing a standing floor position', () => {
    const h = readyHarness(); h.hold(hanging(0), 800); expect(h.calibration().valid).toBe(false);
    h.hold(hanging(0.03), 300); expect(h.calibration().valid).toBe(true);
    expect(h.gameplay().valid).toBe(true);
  });

  it('keeps a confirmed gameplay violation fatal even if feet lift before the game grace ends', () => {
    const h = readyHarness(); h.hold(hanging(0), 600); expect(h.gameplay().fatal).toBe(true);
    h.hold(hanging(0.03), 300); expect(h.gameplay().fatalKey).toBe('pullup-feet');
    h.hold(hiddenFeet(), 1200); expect(h.gameplay().fatalKey).toBe('pullup-feet');
    // The observed AIR already released camera contact, while the run latch
    // remained fatal. A phase reset clears the latch; hidden feet are allowed.
    expect(h.debug().left?.confirmed).toBe(false);
    const floor = JSON.stringify(h.debug().floor); h.resetRun();
    expect(h.gameplay()).toMatchObject({ valid: true, fatal: false });
    expect(JSON.stringify(h.debug().floor)).toBe(floor);
    h.reset();
    expect(h.gameplay()).toMatchObject({ valid: false, fatal: false });
    h.hold(standing(), 850); h.hold(hanging(0.04), 300);
    expect(h.gameplay().valid).toBe(true);
  });

  it('confirms continuous contact at four camera poses per second', () => {
    const h = readyHarness(); h.pose(hanging(0), 250); h.pose(hanging(0), 250);
    expect(h.gameplay()).toMatchObject({ valid: false, fatal: false }); h.pose(hanging(0), 250);
    expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('credits the maximum fresh-pose interval but never a larger stream gap', () => {
    const h = readyHarness();
    h.pose(hanging(0), 700); expect(h.gameplay()).toMatchObject({ valid: false, fatal: false });
    h.pose(hanging(0), 700); expect(h.gameplay().fatalKey).toBe('pullup-feet');
    const g = readyHarness();
    for (let i = 0; i < 10; i++) { g.pose(hanging(0), 701); expect(g.gameplay()).toMatchObject({valid:false,fatal:false}); }
  });

  it('detects continuous grounded contact at two camera poses per second', () => {
    const h = readyHarness(); h.pose(hanging(0), 500); expect(h.gameplay()).toMatchObject({ valid: false, fatal: false });
    h.pose(hanging(0), 500); expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('does not credit camera gaps and requires fresh upper-body tracking', () => {
    const h = readyHarness();
    for (let i = 0; i < 10; i++) {
      h.pose(hanging(0), 800);
      expect(h.gameplay()).toMatchObject({valid:false,fatal:false});
      expect(h.calibration().valid).toBe(false);
    }
    h.pose(hanging(0.04), 100); expect(h.gameplay().valid).toBe(false);
    h.pose(hanging(0.04), 100); expect(h.gameplay().valid).toBe(true);
    expect(h.calibration().valid).toBe(true);
  });

  it('preserves a confirmed gameplay contact through a later camera gap', () => {
    const h = readyHarness(); h.hold(hanging(0), 700); expect(h.gameplay().fatal).toBe(true);
    h.pose(hanging(0.04), 1200); expect(h.gameplay().fatalKey).toBe('pullup-feet');
  });

  it('allows hidden feet after setup while keeping their status unknown', () => {
    const h = readyHarness(); h.hold(hiddenFeet(), 2000);
    expect(h.setup()).toMatchObject({ ready: true, mode: 'floor' });
    expect(h.gameplay()).toMatchObject({ valid: true, fatal: false });
    expect(h.calibration().valid).toBe(true);
  });

  it('allows an explicit unverified upper-body path when feet are outside the frame', () => {
    const h = harness(); h.hold(hiddenFeet(), 1300);
    expect(h.setup()).toMatchObject({ ready: true, mode: 'unverified' });
    expect(h.setup().message).toMatch(/grab the bar/);
    h.hold(hanging(0.04), 1500);
    expect(h.setup()).toMatchObject({ ready: true, mode: 'unverified' });
    expect(h.gameplay().valid).toBe(true); expect(h.debug().floor).toBeNull();
  });

  it('clears the floor and all contact evidence when calibration or camera resets', () => {
    const h = readyHarness(); h.hold(hanging(0), 800); h.reset();
    expect(h.setup()).toMatchObject({ ready: false, mode: 'pending' });
    expect(h.debug().floor).toBeNull(); expect(h.gameplay()).toMatchObject({ valid: false, fatal: false });
  });

  it('never reports unchecked gameplay as valid while setup is still pending', () => {
    const h = harness();
    expect(h.gameplay()).toMatchObject({ valid: false, fatal: false });
    expect(h.gameplay().message).toMatch(/SETUP/);
  });

  it.each(soleKeys)('allows a clear visible sole point when %s is unobserved', missing => {
    const h = readyHarness(); const m = hanging(0.04); m[missing] = null;
    h.hold(m, 500);
    expect(h.calibration().valid).toBe(true);
    expect(h.gameplay()).toMatchObject({ valid: true, fatal: false });
    expect(h.debug()[missing.startsWith('left') ? 'left' : 'right']?.current)
      .toBe(missing.endsWith('Toe') ? 'unknown' : 'air');
  });

  it('can confirm a visible planted toe while its heel is unobserved', () => {
    const h = readyHarness(); const m = hanging(0.04);
    m.leftHeel = null; m.leftToe!.y = 0.91;
    h.hold(m, 400);
    expect(h.calibration().valid).toBe(false);
    expect(h.gameplay()).toMatchObject({ valid: false, fatal: true, contactConfirmed: true });
  });

  it('rejects contact immediately in both phases and confirms it after 350 observed milliseconds', () => {
    const h = readyHarness();
    for (let i = 0; i < 7; i++) {
      h.pose(hanging(0), 50);
      expect(h.calibration().valid).toBe(false);
      expect(h.gameplay()).toMatchObject({ valid: false, fatal: false });
    }
    expect(h.debug().left?.contactMs).toBe(300);
    h.pose(hanging(0), 50);
    expect(h.debug().left?.contactMs).toBe(350);
    expect(h.gameplay()).toMatchObject({ fatal: true, fatalKey: 'pullup-feet', contactConfirmed: true });
  });

  it('does not credit unknown intervals toward the contact confirmation window', () => {
    const h = readyHarness();
    h.pose(hanging(0)); h.hold(hiddenFeet(), 300); h.pose(hanging(0));
    h.hold(hanging(0), 250);
    expect(h.debug().left?.contactMs).toBe(250);
    expect(h.gameplay()).toMatchObject({ valid: false, fatal: false });
    h.hold(hanging(0), 100);
    expect(h.gameplay()).toMatchObject({ fatal: true, contactConfirmed: true });
  });

  it('does not treat ambiguous floor clearance as observed contact in either phase', () => {
    const h = readyHarness();
    const reference = h.debug().floor as {
      points: Record<string, Point>; tolerance: number; clearance: number;
    };
    const m = hanging();
    for (const key of soleKeys) {
      m[key]!.y = reference.points[key].y - (reference.tolerance + reference.clearance) / 2;
    }
    h.hold(m, 500);
    expect(h.calibration().valid).toBe(true);
    expect(h.gameplay()).toMatchObject({ valid: true, fatal: false });
    expect(h.debug().left?.current).toBe('unknown');
    expect(h.debug().right?.current).toBe('unknown');
  });

  it('allows hidden feet after an earlier calibration contact', () => {
    const h = readyHarness(); h.hold(hanging(0), 800);
    expect(h.calibration().valid).toBe(false);
    h.hold(hiddenFeet(), 1300);
    expect(h.debug().left?.confirmed).toBe(false);
    expect(h.calibration().valid).toBe(true);
    h.hold(hanging(0.04), 250);
    expect(h.calibration().valid).toBe(true);
    expect(h.gameplay().valid).toBe(true);
  });

  it('does not require a hidden toe when the visible heel is clear', () => {
    const h = readyHarness(); h.hold(hanging(0), 800);
    const partialAir = hanging(0.04); partialAir.leftToe = null;
    h.hold(partialAir, 800);
    expect(h.debug().left?.confirmed).toBe(false);
    expect(h.calibration().valid).toBe(true);
    h.hold(hanging(0.04), 250);
    expect(h.calibration().valid).toBe(true);
  });

  it('allows clear or hidden feet without a takeoff recovery hold', () => {
    const h = readyHarness(); h.hold(hanging(0), 800);
    h.hold(hanging(0.04), 100); h.hold(hiddenFeet(), 250); h.hold(hanging(0.04), 100);
    expect(h.calibration().valid).toBe(true);
    h.hold(hanging(0.04), 150);
    expect(h.calibration().valid).toBe(true);
  });

  it('discards stale pending contact across a camera gap', () => {
    const h = readyHarness(); h.hold(hanging(0), 800);
    h.pose(hanging(0.04), 1000);
    expect(h.debug().left?.confirmed).toBe(false);
    h.hold(hanging(0.04), 100);
    expect(h.calibration().valid).toBe(true);
    h.hold(hanging(0.04), 150);
    expect(h.calibration().valid).toBe(true);
  });

  it('shares the same acceptance decision across calibration and gameplay before a confirmed violation', () => {
    const h = readyHarness();
    for (const [m, duration] of [
      [hanging(0.04), 100], [hanging(0), 100], [hanging(0.04), 250],
      [hiddenFeet(), 250], [hanging(0.04), 300],
    ] as Array<[Metrics, number]>) {
      for (let elapsed = 0; elapsed < duration; elapsed += 50) {
        h.pose(m);
        expect(h.gameplay().valid).toBe(h.calibration().valid);
      }
    }
  });

  it('preserves the valid bottom pose when entering countdown without another camera frame', () => {
    const h = readyHarness(); const before = h.debug();
    expect(h.calibration().valid).toBe(true); h.resetRun();
    expect(h.calibration().valid).toBe(true);
    expect(h.gameplay().valid).toBe(true);
    expect(h.debug().floor).toEqual(before.floor);
    expect(h.debug().left).toEqual(before.left);
    expect(h.debug().right).toEqual(before.right);
  });

  it('preserves pending contact evidence across the calibration-to-countdown boundary', () => {
    const h = readyHarness(); h.hold(hanging(0), 200);
    expect(h.debug().left?.contactMs).toBe(150);
    h.resetRun();
    expect(h.debug().left?.contactMs).toBe(150);
    expect(h.calibration().valid).toBe(false);
    expect(h.gameplay()).toMatchObject({ valid: false, fatal: false });
    h.hold(hanging(0), 200);
    expect(h.gameplay()).toMatchObject({ fatal: true, contactConfirmed: true });
  });

  it('does not turn earlier contact into a new crash while feet are hidden at countdown', () => {
    const h = readyHarness(); h.hold(hanging(0), 400); h.hold(hiddenFeet(), 100);
    h.resetRun();
    expect(h.debug().left).toMatchObject({ current: 'unknown', confirmed: true });
    expect(h.calibration().valid).toBe(true);
    expect(h.gameplay()).toMatchObject({ valid: true, fatal: false });
  });

  it('distinguishes positive floor evidence from an unconfirmed unknown observation', () => {
    const h = readyHarness(); expect(h.hasContact()).toBe(false);
    h.pose(hanging(0)); expect(h.hasContact()).toBe(true);
    h.pose(hiddenFeet()); expect(h.hasContact()).toBe(false);
    h.hold(hanging(0), 400); expect(h.hasContact()).toBe(true);
    h.hold(hiddenFeet(), 800); expect(h.hasContact()).toBe(false);
    h.hold(hanging(0.04), 250); expect(h.hasContact()).toBe(false);
  });
});

describe('standing reach preparation', () => {
  it('does not capture an arms-down reference or mix it into the overhead window', () => {
    const h = harness(); const down = standing();
    down.leftWrist!.y = down.rightWrist!.y = 0.6;
    down.leftElbow.y = down.rightElbow.y = 0.5;
    h.hold(down, 1500);
    expect(h.setup().ready).toBe(false);
    h.hold(standing(), 400);
    expect(h.setup().ready).toBe(false);
    h.hold(standing(), 450);
    expect(h.setup()).toMatchObject({ready: true, mode: 'floor'});
  });
  it('does not capture a top pose as the pre-pull reference', () => {
    const h = harness(); const top = standing(); top.eyes!.y = 0.14;
    top.leftElbowAngle = top.rightElbowAngle = 70;
    h.hold(top, 2500);
    expect(h.setup().ready).toBe(false);
  });
  it('supports reaching up before jumping to a high bar without an arms-down step', () => {
    const h = harness(); const reach = standing();
    reach.leftWrist!.y = reach.rightWrist!.y = 0.06;
    h.hold(reach, 850);
    expect(h.setup()).toMatchObject({ready: true, mode: 'floor'});
    const saved = JSON.stringify(h.debug().floor);
    h.hold(hanging(0.14), 800);
    expect(h.calibration().valid).toBe(true);
    expect(JSON.stringify(h.debug().floor)).toBe(saved);
  });
});
