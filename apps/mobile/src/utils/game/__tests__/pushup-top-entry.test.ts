import { SCRIPT_FORM_TRACKING } from '../html/scriptFormTracking';
import { SCRIPT_CORE } from '../html/scriptCore';
import { SCRIPT_GAME } from '../html/scriptGame';

type Point = { x: number; y: number; visibility: number };

// Production measurements, validation, stability and calibration loop.
// Only camera acquisition and rendering are replaced by a synthetic stream.
function calibrationGame() {
  const stability = SCRIPT_CORE.slice(SCRIPT_CORE.indexOf('var stabBuf = []'), SCRIPT_CORE.indexOf('// ---------- Camera + MediaPipe'));
  const loop = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function computeNorm()'), SCRIPT_GAME.indexOf('// ---------- Kickoff'));
  return new Function([
    "var CONFIG={exercise:'pushups',trackingMode:'form-test'},state='waitTop';",
    'var topY=null,bottomY=null,birdNorm=0.5,prevBirdNorm=0.5,clouds=[],lastFrame=0;',
    'var calibrationReadyAt=2000,progress=0,maximumProgress=0,nowValue=0;',
    'var performance={now:function(){return nowValue;}};',
    SCRIPT_FORM_TRACKING, stability,
    'function getTrackY(){return getExperimentalTrackY();}',
    'function getTrackYSmooth(){return getExperimentalTrackYSmooth();}',
    'function trackingFresh(){return experimentalTrackingFresh();}',
    'function drawBackground(){} function drawBird(){} function beep(){}',
    'function showOverlay(){} function copyComposedRecordingFrame(){} function requestAnimationFrame(){}',
    'function setProgress(value){progress=value;maximumProgress=Math.max(maximumProgress,value);}',
    loop,
    "function render(now){nowValue=now;if(state==='waitTop')loop(now);}",
    'return {step:function(points,now){nowValue=now;updateExperimentalFormPose(points,now);render(now);},render:render,',
    'state:function(){return state;},progress:function(){return progress;},maximumProgress:function(){return maximumProgress;}};',
  ].join('\n'))() as {
    step: (points: Point[], now: number) => void;
    render: (now: number) => void;
    state: () => string;
    progress: () => number;
    maximumProgress: () => number;
  };
}

function frontPushup(leftAngle = 180, rightAngle = 180): Point[] {
  const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [shoulder, elbow, wrist, hip, x, sign, angle] of [
    [11, 13, 15, 23, 0.42, -1, leftAngle],
    [12, 14, 16, 24, 0.58, 1, rightAngle],
  ]) {
    const bend = (180 - angle) * Math.PI / 180;
    points[shoulder] = { x, y: 0.35, visibility: 1 };
    points[elbow] = { x, y: 0.50, visibility: 1 };
    points[wrist] = { x: x + sign * 0.15 * Math.sin(bend), y: 0.50 + 0.15 * Math.cos(bend), visibility: 1 };
    points[hip] = { x, y: 0.58, visibility: 1 };
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
