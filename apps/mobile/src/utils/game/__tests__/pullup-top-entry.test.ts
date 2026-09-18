import { SCRIPT_FORM_TRACKING } from '../html/scriptFormTracking';
import { SCRIPT_CORE } from '../html/scriptCore';
import { SCRIPT_GAME } from '../html/scriptGame';

type Point = { x: number; y: number; visibility: number };

// Exercise the actual calibration loop and stability bar, not a substitute
// validator. Rendering/camera APIs are stubbed; pose input is synthetic.
function calibrationGame() {
  const stability = SCRIPT_CORE.slice(SCRIPT_CORE.indexOf('var stabBuf = []'), SCRIPT_CORE.indexOf('// ---------- Camera + MediaPipe'));
  const loop = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function computeNorm()'), SCRIPT_GAME.indexOf('// ---------- Kickoff'));
  return new Function([
    "var CONFIG={exercise:'pullups',trackingMode:'form-test'},state='waitTop';",
    'var topY=null,bottomY=null,birdNorm=0.5,prevBirdNorm=0.5,clouds=[],lastFrame=0;',
    'var calibrationReadyAt=2000,progress=0,maximumProgress=0,nowValue=0,messages=[];',
    'var performance={now:function(){return nowValue;}};',
    SCRIPT_FORM_TRACKING, stability,
    'function getTrackY(){return getExperimentalTrackY();}',
    'function getTrackYSmooth(){return getExperimentalTrackYSmooth();}',
    'function trackingFresh(){return experimentalTrackingFresh();}',
    'function drawBackground(){} function drawBird(){} function beep(){}',
    'function showOverlay(){} function copyComposedRecordingFrame(){} function requestAnimationFrame(){}',
    'function postRN(message){messages.push(message);}',
    'function setProgress(value){progress=value;maximumProgress=Math.max(maximumProgress,value);}',
    loop,
    'return {step:function(points,now){nowValue=now;updateExperimentalFormPose(points,now);if(state===\'waitTop\')loop(now);},',
    'state:function(){return state;},progress:function(){return progress;},maximumProgress:function(){return maximumProgress;},messages:messages};',
  ].join('\n'))() as {
    step: (points: Point[], now: number) => void;
    state: () => string;
    progress: () => number;
    maximumProgress: () => number;
    messages: Array<{ type: string; message?: string }>;
  };
}

function pullupFrame(shoulderY: number, wristY = 0.14, scale = 1) {
  const p = Math.max(0, Math.min(1, (0.44 - shoulderY) / 0.09));
  const points: Point[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [left, right, x, y] of [
    [2, 5, 0.47, shoulderY - 0.19],
    [11, 12, 0.44 - p * 0.01, shoulderY],
    [13, 14, 0.44 - p * 0.05, 0.28 - p * 0.03],
    [15, 16, 0.44, wristY],
    [23, 24, 0.44, shoulderY + 0.21],
  ]) {
    points[left] = { x: 0.5 + (x - 0.5) * scale, y: 0.5 + (y - 0.5) * scale, visibility: 1 };
    points[right] = { ...points[left], x: 1 - points[left].x };
  }
  return points;
}

function hold(game: ReturnType<typeof calibrationGame>, points: Point[], start: number, end: number) {
  for (let now = start; now <= end; now += 100) game.step(points, now);
}

describe('pull-up step 1 requires a pull against a fixed grip', () => {
  test.each([[0.092, 0.027, -0.035], [0.101, 0.025, -0.039]])(
    'does not fill from wrist changes consistent with the rejected phone summary %s/%s/%s',
    (hangGap, finalGap, eyeGap) => {
      const game = calibrationGame();
      const held = pullupFrame(0.4, 0.4 - hangGap);
      // The phone log includes relative gaps, not full frames. Keep body fixed
      // and vary wrists to reproduce a compatible failure, not claim a replay.
      held[2].y = held[5].y = 0.4 - finalGap + eyeGap;
      held[13].x = 0.36; held[14].x = 0.64;
      held[13].y = held[14].y = 0.345;
      hold(game, held, 0, 1900);
      const falseTop = held.map(p => ({ ...p }));
      falseTop[15].y = falseTop[16].y = 0.4 - finalGap;
      hold(game, falseTop, 2000, 5000);
      expect(game.state()).toBe('waitTop');
      expect(game.maximumProgress()).toBe(0);
    }
  );

  it('does not count moving hands down after a real starting hang as shoulder rise', () => {
    const game = calibrationGame();
    hold(game, pullupFrame(0.44), 0, 1900);
    const handsLowered = pullupFrame(0.44, 0.30);
    handsLowered[13] = { x: 0.36, y: 0.31, visibility: 1 };
    handsLowered[14] = { x: 0.64, y: 0.31, visibility: 1 };
    hold(game, handsLowered, 2000, 5000);
    expect(game.state()).toBe('waitTop');
    expect(game.maximumProgress()).toBe(0);
  });

  it('does not treat one low-shoulder outlier as a starting hang', () => {
    const game = calibrationGame();
    hold(game, pullupFrame(0.35), 0, 900);
    game.step(pullupFrame(0.44), 1000);
    hold(game, pullupFrame(0.35), 1100, 5000);
    expect(game.state()).toBe('waitTop');
    expect(game.maximumProgress()).toBe(0);
  });

  it('keeps the bar empty when the user only holds the bar through preparation', () => {
    const game = calibrationGame();
    hold(game, pullupFrame(0.44), 0, 6000);
    expect(game.state()).toBe('waitTop');
    expect(game.maximumProgress()).toBe(0);
  });

  test.each([0.65, 1, 1.1])('fills only after an actual pull to the bar at camera scale %s', scale => {
    const game = calibrationGame();
    hold(game, pullupFrame(0.44, 0.14, scale), 0, 2400);
    expect(game.maximumProgress()).toBe(0);
    for (let now = 2500; now <= 3500; now += 100) {
      const p = (now - 2500) / 1000;
      game.step(pullupFrame(0.44 - 0.09 * p, 0.14 + 0.002 * Math.sin(now), scale), now);
    }
    hold(game, pullupFrame(0.35, 0.14, scale), 3600, 5200);
    expect(game.state()).toBe('waitBottom');
    expect(game.messages.filter(m => m.type === 'formdebug' && m.message?.includes('"position":"top"'))).toHaveLength(1);
  });

  it('cannot complete step 1 with no starting observation, even if it sees a top-like pose', () => {
    const game = calibrationGame();
    hold(game, pullupFrame(0.35), 2100, 6000);
    expect(game.state()).toBe('waitTop');
    expect(game.maximumProgress()).toBe(0);
  });
});
