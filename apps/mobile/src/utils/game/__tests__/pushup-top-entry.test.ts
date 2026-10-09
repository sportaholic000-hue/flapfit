import { SCRIPT_FORM_TRACKING } from '../html/scriptFormTracking';
import { SCRIPT_CORE } from '../html/scriptCore';
import { SCRIPT_GAME } from '../html/scriptGame';
import illustrationObservations from './fixtures/pushup-entry-illustration-landmarks.json';

type Point = { x: number; y: number; z?: number; visibility: number };

// Production measurements, validation, stability and calibration loop.
// Only camera acquisition and rendering are replaced by a synthetic stream.
function calibrationGame(width = 720, height = 1280) {
  const stability = SCRIPT_CORE.slice(SCRIPT_CORE.indexOf('var stabBuf = []'), SCRIPT_CORE.indexOf('// ---------- Camera + MediaPipe'));
  const loop = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function computeNorm()'), SCRIPT_GAME.indexOf('// ---------- Kickoff'));
  return new Function([
    "var CONFIG={exercise:'pushups',trackingMode:'form-test'},state='waitTop';",
    'var topY=null,bottomY=null,birdNorm=0.5,prevBirdNorm=0.5,clouds=[],lastFrame=0,countdownEnd=0;',
    'var calibrationReadyAt=2000,progress=0,maximumProgress=0,nowValue=0,overlayMessage=null,overlayBar=false;',
    'var performance={now:function(){return nowValue;}};',
    'var video={videoWidth:' + width + ',videoHeight:' + height + '};',
    SCRIPT_FORM_TRACKING, stability,
    'function getTrackY(){return getExperimentalTrackY();}',
    'function getTrackYSmooth(){return getExperimentalTrackYSmooth();}',
    'function trackingFresh(){return experimentalTrackingFresh();}',
    'function drawBackground(){} function drawBird(){} function beep(){} function postRN(){} function hideOverlay(){} function hideCameraPreview(){}',
    'function showOverlay(message,withBar){overlayMessage=message;overlayBar=withBar;} function copyComposedRecordingFrame(){} function requestAnimationFrame(){}',
    'function setProgress(value){progress=value;maximumProgress=Math.max(maximumProgress,value);}',
    loop,
    "function render(now){nowValue=now;if(state==='waitTop'||state==='waitBottom')loop(now);}",
    'return {step:function(points,now){nowValue=now;updateExperimentalFormPose(points,now);render(now);},render:render,',
    'state:function(){return state;},progress:function(){return progress;},maximumProgress:function(){return maximumProgress;},overlay:function(){return {message:overlayMessage,bar:overlayBar};}};',
  ].join('\n'))() as {
    step: (points: Point[], now: number) => void;
    render: (now: number) => void;
    state: () => string;
    progress: () => number;
    maximumProgress: () => number;
    overlay: () => { message: string; bar: boolean };
  };
}

function frontPushup(leftAngle = 180, rightAngle = 180): Point[] {
  const points: Point[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [shoulder, elbow, wrist, hip, x, sign, angle] of [
    [11, 13, 15, 23, 0.42, -1, leftAngle],
    [12, 14, 16, 24, 0.58, 1, rightAngle],
  ]) {
    const bend = (180 - angle) * Math.PI / 180;
    // A torso extending behind the shoulders; x/y alone also describes standing.
    points[shoulder] = { x, y: 0.35, z: -0.7, visibility: 1 };
    points[elbow] = { x, y: 0.50, visibility: 1 };
    points[wrist] = { x: x + sign * 0.15 * Math.sin(bend), y: 0.50 + 0.15 * Math.cos(bend), visibility: 1 };
    points[hip] = { x, y: 0.58, z: 0, visibility: 1 };
    points[hip + 2] = { x, y: 0.73, z: 0.65, visibility: 1 };
  }
  return points;
}

function hold(game: ReturnType<typeof calibrationGame>, points: Point[], start: number, end: number) {
  for (let now = start; now <= end; now += 100) game.step(points, now);
}

describe('pushup step one requires both individually straight arms', () => {
  test.each([11, 12, 13, 14, 15, 16])('does not start the buffer when joint %s is unseen', index => {
    const game = calibrationGame();
    const points = frontPushup();
    points[index].visibility = 0.1;
    hold(game, points, 100, 6000);
    expect(game.state()).toBe('waitTop');
    expect(game.maximumProgress()).toBe(0);
  });

  test.each([[95, 180], [180, 95], [124, 180], [180, 124]])(
    'does not average a bent arm away: left %s, right %s', (left, right) => {
      const game = calibrationGame();
      hold(game, frontPushup(left, right), 100, 6000);
      expect(game.state()).toBe('waitTop');
      expect(game.maximumProgress()).toBe(0);
    }
  );

  test.each([15, 16])('rejects an off-image wrist %s rather than its inferred straight arm', index => {
    const game = calibrationGame();
    const points = frontPushup();
    points[index].y = 1.1;
    hold(game, points, 100, 6000);
    expect(game.state()).toBe('waitTop');
    expect(game.maximumProgress()).toBe(0);
  });

  test.each([126, 150, 180])('preserves preparation and hold delays for both arms at %s degrees', angle => {
    const game = calibrationGame();
    const points = frontPushup(angle, angle);
    hold(game, points, 100, 1900);
    expect(game.maximumProgress()).toBe(0);
    hold(game, points, 2000, 3200);
    expect(game.state()).toBe('waitTop');
    game.step(points, 3300);
    expect(game.state()).toBe('waitBottom');
  });

  it('restarts the hold when either arm bends during step one', () => {
    const game = calibrationGame();
    hold(game, frontPushup(), 2000, 2800);
    expect(game.progress()).toBeGreaterThan(0);
    game.step(frontPushup(180, 95), 2900);
    expect(game.progress()).toBe(0);
    hold(game, frontPushup(), 3000, 4200);
    expect(game.state()).toBe('waitTop');
    game.step(frontPushup(), 4300);
    expect(game.state()).toBe('waitBottom');
  });

  it('does not turn screen renders of two camera observations into a held pose', () => {
    const game = calibrationGame();
    game.step(frontPushup(), 2100);
    for (let now = 2150; now <= 2700; now += 50) game.render(now);
    game.step(frontPushup(), 2800);
    for (let now = 2850; now <= 3400; now += 50) game.render(now);
    expect(game.state()).toBe('waitTop');
    expect(game.maximumProgress()).toBe(0);
  });

  it('clears the hold on stale camera tracking and requires a new hold', () => {
    const game = calibrationGame();
    hold(game, frontPushup(), 2000, 2500);
    game.render(3250);
    expect(game.progress()).toBe(0);
    hold(game, frontPushup(), 3300, 4500);
    expect(game.state()).toBe('waitTop');
    game.step(frontPushup(), 4600);
    expect(game.state()).toBe('waitBottom');
  });
});


describe('pushup step one rejects upright entry before filling the hold bar', () => {
  function upright() {
    // Deliberately identical x/y and straight elbows to the valid fixture.
    // Its shoulders and hips instead share an approximately upright depth plane.
    const points = frontPushup();
    points[11].z = points[12].z = -0.12;
    return points;
  }

  it('keeps standing with straight arms at the sides at zero progress', () => {
    const game = calibrationGame();
    hold(game, upright(), 100, 10000);
    expect(game.state()).toBe('waitTop');
    expect(game.maximumProgress()).toBe(0);
  });

  it('clears a partial hold when the player stands up; valid entry requires a new full hold', () => {
    const game = calibrationGame();
    hold(game, frontPushup(), 2000, 2800);
    expect(game.progress()).toBeGreaterThan(0);
    game.step(upright(), 2900);
    expect(game.progress()).toBe(0);
    hold(game, frontPushup(), 3000, 4200);
    expect(game.state()).toBe('waitTop');
    game.step(frontPushup(), 4300);
    expect(game.state()).toBe('waitBottom');
  });

  test.each([11, 12, 23, 24])('waits when torso landmark %s has no depth or is off-camera', index => {
    for (const issue of ['no-depth', 'nan', 'infinite', 'hidden', 'off-image']) {
      const game = calibrationGame();
      const points = frontPushup();
      if (issue === 'no-depth') delete points[index].z;
      if (issue === 'nan') points[index].z = Number.NaN;
      if (issue === 'infinite') points[index].z = Number.POSITIVE_INFINITY;
      if (issue === 'hidden') points[index].visibility = 0.1;
      if (issue === 'off-image') points[index].y = 1.1;
      hold(game, points, 2000, 7000);
      expect(game.state()).toBe('waitTop');
      expect(game.maximumProgress()).toBe(0);
    }
  });

  test.each([11, 12])('does not average away an upright shoulder-to-hip side at %s', index => {
    const game = calibrationGame();
    const points = frontPushup();
    points[index].z = -0.05;
    hold(game, points, 2000, 7000);
    expect(game.maximumProgress()).toBe(0);
  });

  it('requires the hips to recede, rather than accepting reversed depth', () => {
    const game = calibrationGame();
    const points = frontPushup();
    points[11].z = points[12].z = 0.7;
    hold(game, points, 2000, 7000);
    expect(game.maximumProgress()).toBe(0);
  });

  test.each([[0, 1280], [720, 0]])('does not fill a hold without camera dimensions (%s x %s)', (width, height) => {
    const game = calibrationGame(width, height);
    hold(game, frontPushup(), 2000, 7000);
    expect(game.maximumProgress()).toBe(0);
  });

  test.each([[720, 1280], [820, 1180], [1024, 1366], [1280, 720]])(
    'preserves the same pose classification across camera aspect ratios (%s x %s)', (width, height) => {
      for (const isProne of [false, true]) {
        const game = calibrationGame(width, height);
        const points = frontPushup();
        // Same physical depth in height units, re-normalized into MediaPipe's x scale.
        const depthHeightUnits = isProne ? 0.4 : 0.15;
        points[11].z = points[12].z = -depthHeightUnits * height / width;
        points[25].z = points[26].z = 0.36 * height / width;
        hold(game, points, 2000, 3400);
        expect(game.state()).toBe(isProne ? 'waitBottom' : 'waitTop');
        if (!isProne) expect(game.maximumProgress()).toBe(0);
      }
    }
  );

  // Actual bundled-model outputs on static illustrations, not recordings of a
  // person and not evidence of native-device acceptance. Complements synthetic cases.
  test.each(illustrationObservations)('replays bundled-model observation: $name', fixture => {
    const game = calibrationGame(fixture.width, fixture.height);
    hold(game, fixture.landmarks, 2000, 7000);
    expect(game.state()).toBe(fixture.name === 'pushup-top' ? 'waitBottom' : 'waitTop');
    if (fixture.name !== 'pushup-top') expect(game.maximumProgress()).toBe(0);
  });
});


describe('pushup step one requires extended upper legs, not a standing hip hinge', () => {
  test.each([0, 0.10, 0.25])('rejects bending over with upright thighs (knee depth %s)', depth => {
    const game = calibrationGame();
    const points = frontPushup();
    // Strong prone-looking torso and perfectly straight arms: the previous check passed this.
    points[25] = { x: 0.42, y: 0.9, z: depth, visibility: 1 };
    points[26] = { x: 0.58, y: 0.9, z: depth, visibility: 1 };
    hold(game, points, 100, 10000);
    expect(game.state()).toBe('waitTop');
    expect(game.maximumProgress()).toBe(0);
  });
  test.each(['hidden', 'missing-depth', 'off-image', 'nan'])('does not infer a valid position from %s knees', problem => {
    const game = calibrationGame();
    const points = frontPushup();
    for (const index of [25, 26]) {
      if (problem === 'hidden') points[index].visibility = 0.1;
      if (problem === 'missing-depth') delete points[index].z;
      if (problem === 'off-image') points[index].y = 1.1;
      if (problem === 'nan') points[index].z = Number.NaN;
    }
    hold(game, points, 2000, 7000);
    expect(game.maximumProgress()).toBe(0);
  });
  test.each([25, 26])('permits one occluded knee when the other observed leg is extended (%s)', index => {
    const game = calibrationGame(); const points = frontPushup();
    points[index].visibility = 0.1;
    hold(game, points, 2000, 3300);
    expect(game.state()).toBe('waitBottom');
  });
  test.each([25, 26])('does not average a visibly upright thigh away (%s)', index => {
    const game = calibrationGame(); const points = frontPushup();
    points[index].z = 0.02; points[index].y = 0.95;
    hold(game, points, 2000, 7000);
    expect(game.maximumProgress()).toBe(0);
  });
  it('rejects a pronounced hip hinge even when both thighs recede', () => {
    const game = calibrationGame(); const points = frontPushup();
    for (const index of [25, 26]) { points[index].y = 0.30; points[index].z = 0.65; }
    hold(game, points, 2000, 7000);
    expect(game.maximumProgress()).toBe(0);
  });
  it('clears an interrupted hold and requires a fresh full hold in position', () => {
    const game = calibrationGame(); const bad = frontPushup();
    bad[25].z = bad[26].z = 0.02;
    hold(game, frontPushup(), 2000, 2800);
    expect(game.progress()).toBeGreaterThan(0);
    game.step(bad, 2900); expect(game.progress()).toBe(0);
    hold(game, frontPushup(), 3000, 4200); expect(game.state()).toBe('waitTop');
    game.step(frontPushup(), 4300); expect(game.state()).toBe('waitBottom');
  });
});


it('keeps the original short pushup instruction and visible empty bar while the posture is invalid', () => {
  const game = calibrationGame(); const points = frontPushup();
  points[25].z = points[26].z = 0;
  hold(game, points, 2000, 5000);
  expect(game.overlay()).toEqual({
    message: 'STEP 1 OF 2<br><br>Hold the <b>TOP</b> of a push-up<br>Arms fully extended<br><br>Hold still…',
    bar: true,
  });
  expect(game.progress()).toBe(0);
});


it('continues displaying the original bottom instruction after step one, without accepting straight arms as step two', () => {
  const game = calibrationGame();
  hold(game, frontPushup(), 2000, 3400);
  expect(game.state()).toBe('waitBottom');
  expect(game.overlay()).toEqual({
    message: 'STEP 2 OF 2<br><br>Lower to the <b>BOTTOM</b> of a push-up<br>Chest near the floor<br><br>Hold still…',
    bar: true,
  });
  expect(game.progress()).toBe(0);
});


it('a proper two-stage synthetic pushup completes calibration and reaches the existing countdown', () => {
  const game = calibrationGame();
  hold(game, frontPushup(), 2000, 3300);
  expect(game.state()).toBe('waitBottom');
  const bottom = frontPushup();
  for (const [shoulder, elbow, wrist, x, elbowX] of [[11,13,15,0.42,0.34], [12,14,16,0.58,0.66]]) {
    bottom[shoulder].y = 0.47;
    bottom[elbow] = { x: elbowX, y: 0.50, visibility: 1 };
    bottom[wrist] = { x, y: 0.65, visibility: 1 };
  }
  hold(game, bottom, 3400, 4600);
  expect(game.state()).toBe('waitBottom');
  game.step(bottom, 4700);
  expect(game.state()).toBe('countdown');
});
