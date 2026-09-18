import { SCRIPT_GAME } from '../html/scriptGame';

type Check = { valid: boolean; fatal: boolean; message: string; fatalKey?: string };
const valid: Check = { valid: true, fatal: false, message: '' };
const invalid: Check = { valid: false, fatal: false, message: 'Arms briefly out of view' };

function movingGame(formTest = true, initialPipeX = 140, initialNorm = 1) {
  const helpers = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('var tutSeconds'), SCRIPT_GAME.indexOf('// ---------- Composed-run recording'));
  const endGame = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function endGame(reason)'), SCRIPT_GAME.indexOf('// ---------- Drawing ----------'));
  const collisions = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function collides()'), SCRIPT_GAME.indexOf('// ---------- Main loop ----------'));
  const birdY = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function birdScreenY()'), SCRIPT_GAME.indexOf('function endGame(reason)'));
  const loop = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function loop(now)'), SCRIPT_GAME.indexOf('// ---------- Kickoff ----------'));
  return new Function('formTest', 'initialPipeX', 'initialNorm', [
    "var state='play',lastFrame=0,lastSpawn=1000,score=0,pushups=0;",
    "var birdNorm=initialNorm,prevBirdNorm=initialNorm,normValue=initialNorm;",
    "var W=360,H=640,clouds=[],particles=[],nowValue=0,gameOverSent=false;",
    "var CONFIG={exercise:'shoulderpress',maxScore:60,bird:{body:'#fff'}};",
    "var pipes=[{x:initialPipeX,w:40,gapC:320,gapH:140,moving:false,passed:false}];",
    "var check={valid:true,fatal:false},fresh=true,messages=[],overlays=[],frames=[];",
    "var runRecorder={},recordingFramesFinished=false;",
    "var performance={now:function(){return nowValue;}};",
    "var ctx={fillRect:function(){}};",
    "function usesExperimentalFormTracking(){return formTest;}",
    "function trackingFresh(){return fresh;}",
    "function validateExperimentalGameplay(){return check;}",
    "function computeNorm(){return normValue;}",
    "function updatePushups(){}",
    "function currentSpawnMs(){return 10000;}",
    "function currentSpeed(){return 100;}",
    "function spawnPipe(){}",
    "function beep(){}",
    "function burst(){}",
    "function birdX(){return 100;}",
    "function birdRadius(){return 16;}",
    "function birdCollisionRadius(){return 14;}",
    "function drawBackground(){}",
    "function drawBird(){}",
    "function drawHUD(){}",
    "function drawPipes(){}",
    "function drawParticles(){}",
    "function showOverlay(message){overlays.push(message);}",
    "function hideOverlay(){}",
    "function requestAnimationFrame(){}",
    "function postRN(message){messages.push(message);}",
    "function stopRunRecording(){}",
    "function stopCameraAndTracking(){}",
    "function copyComposedRecordingFrame(){if(!recordingFramesFinished)frames.push(pipes[0].x);}",
    "function setTimeout(){}",
    helpers, birdY, endGame, collisions, loop,
    "return {step:function(time,nextCheck,isFresh){nowValue=time;check=nextCheck;fresh=isFresh;loop(time);},",
    "state:function(){return state;},pipeX:function(){return pipes[0].x;},messages:messages,overlays:overlays,frames:frames};",
  ].join('\n'))(formTest, initialPipeX, initialNorm) as {
    step: (time: number, check: Check, fresh: boolean) => void;
    state: () => string; pipeX: () => number;
    messages: Array<{type: string; reason?: string}>; overlays: string[]; frames: number[];
  };
}

describe('continuous gameplay in every tracking mode', () => {
  it.each([0, 1])('holding a valid endpoint %s crashes into a pipe normally', norm => {
    const game = movingGame(true, 140, norm);
    for (let now = 1000; now <= 1600 && game.state() !== 'over'; now += 16) game.step(now, valid, true);
    expect(game.messages.find(message => message.type === 'gameover')?.reason).toBe('');
    expect(game.overlays).toEqual([]);
    expect(game.frames.at(-1)).toBeLessThan(114);
  });

  it('keeps pipes and recording moving through transient form loss and immediate recovery', () => {
    const game = movingGame(true, 1000);
    game.step(1000, invalid, true);
    expect(game.state()).toBe('play');
    const first = game.pipeX();
    game.step(1100, valid, true);
    expect(game.state()).toBe('play');
    expect(game.pipeX()).toBeLessThan(first);
    expect(game.frames).toHaveLength(2);
    expect(game.overlays).toEqual([]);
  });

  it('still collides during the brief tracking-loss confirmation window', () => {
    const game = movingGame();
    for (let now = 1000; now <= 1600 && game.state() !== 'over'; now += 16) game.step(now, invalid, false);
    expect(game.messages.find(message => message.type === 'gameover')?.reason).toBe('');
    expect(game.overlays).toEqual([]);
  });

  it.each([
    [true, invalid, true, 'form'],
    [true, valid, false, 'tracking'],
    [false, valid, false, 'tracking'],
  ] as const)('sustained loss releases control and ends only on impact: %s', (formTest, check, fresh, reason) => {
    const game = movingGame(formTest, 10000);
    game.step(1000, check, fresh);
    game.step(2599, check, fresh);
    expect(game.state()).toBe('play');
    expect(game.pipeX()).toBeLessThan(10000);
    game.step(2600, check, fresh);
    expect(game.state()).toBe('play');
    expect(game.messages.some(message => message.type === 'gameover')).toBe(false);
    const fallingPipeX = game.pipeX();
    for (let now = 2616; now <= 4500 && game.state() !== 'over'; now += 16) game.step(now, valid, true);
    expect(game.state()).toBe('over');
    expect(game.pipeX()).toBeLessThan(fallingPipeX);
    expect(game.messages.find(message => message.type === 'gameover')?.reason).toBe(reason);
    expect(game.overlays).toEqual([]);
  });

  it('confirmed form failure keeps recording and pipes moving until the falling bird hits the floor', () => {
    const game = movingGame(true, 10000);
    const released: Check = {valid: false, fatal: true, fatalKey: 'pullup-bar', message: 'Bar released'};
    game.step(1000, released, true);
    game.step(1349, released, true);
    game.step(1350, released, true);
    expect(game.state()).toBe('play');
    expect(game.messages.some(message => message.type === 'gameover')).toBe(false);
    const fallingPipeX = game.pipeX();
    const fallingFrames = game.frames.length;
    for (let now = 1366; now <= 3000 && game.state() !== 'over'; now += 16) game.step(now, valid, true);
    expect(game.state()).toBe('over');
    expect(game.pipeX()).toBeLessThan(fallingPipeX);
    expect(game.frames.length).toBeGreaterThan(fallingFrames);
    expect(game.messages.filter(message => message.type === 'gameover')).toEqual([
      expect.objectContaining({reason: 'form'}),
    ]);
    expect(game.overlays).toEqual([]);
  });

  it.each([false, true])('never freezes or starts a recovery countdown in mode %s', formTest => {
    const game = movingGame(formTest, 1000);
    game.step(1000, valid, false);
    expect(game.state()).toBe('play');
    expect(game.pipeX()).toBeLessThan(1000);
    const beforeRecovery = game.pipeX();
    game.step(1100, valid, true);
    expect(game.state()).toBe('play');
    expect(game.pipeX()).toBeLessThan(beforeRecovery);
    expect(game.overlays).toEqual([]);
  });
});
