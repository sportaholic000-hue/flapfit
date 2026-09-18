import { SCRIPT_GAME } from '../html/scriptGame';

function runHarness(crash: boolean, startScore = 0) {
  const endGame = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function endGame(reason)'), SCRIPT_GAME.indexOf('// ---------- Drawing ----------'));
  const loop = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function loop(now)'), SCRIPT_GAME.indexOf('// ---------- Kickoff ----------'));
  return new Function('crash', 'startScore', [
    "var state='countdown', countdownEnd=3000, lastFrame=0, nowValue=0;",
    "var birdNorm=0.5,prevBirdNorm=0.5,lastSpawn=0,score=startScore,pushups=0;",
    "var tutSeconds=0,tutReportedSeconds=0,competitionDurationMs=0;",
    "var crashReason='',crashFallVelocity=0;",
    "var gameOverSent=false,runRecorder=null,recordingFramesFinished=false;",
    "var clouds=[],particles=[],pipes=[],W=360,H=640;",
    "var CONFIG={bird:{body:'#fff'},maxScore:60,exercise:'pullups'};",
    "var frame={countdown:false,result:false,score:score},frames=[],messages=[],timers=[],starts=0;",
    "var performance={now:function(){return nowValue;}};",
    "var ctx={fillRect:function(){frame.result=true;}};",
    "function computeNorm(){return 0.5;}",
    "function usesExperimentalFormTracking(){return false;}",
    "function trackingFresh(){return true;}",
    "function fatalFormFailureConfirmed(){return false;}",
    "function formTrackingInterruptionConfirmed(){return false;}",
    "function updatePushups(){}",
    "function currentSpawnMs(){return 1500;}",
    "function currentSpeed(){return 100;}",
    "function spawnPipe(){}",
    "function collides(){return crash;}",
    "function beep(){}",
    "function burst(){}",
    "function birdX(){return 100;}",
    "function birdScreenY(){return 300;}",
    "function drawBackground(){frame={countdown:false,result:false,score:score};}",
    "function drawBird(){}",
    "function drawHUD(){frame.score=score;}",
    "function drawPipes(){}",
    "function drawParticles(){}",
    "function drawCountdownNumber(){frame.countdown=true;}",
    "function showOverlay(){}",
    "function hideOverlay(){}",
    "function requestAnimationFrame(){}",
    "function postRN(message){messages.push(message);}",
    "function startRunRecording(){runRecorder={};starts++;}",
    "function stopRunRecording(){runRecorder=null;}",
    "function stopCameraAndTracking(){}",
    "function copyComposedRecordingFrame(now,playable){",
    "if(runRecorder&&!recordingFramesFinished)frames.push({...frame});",
    "}",
    "function setTimeout(fn,delay){timers.push({fn:fn,delay:delay});}",
    endGame,
    loop,
    "return {step:function(time){nowValue=time;loop(time);},",
    "complete:function(){score=60;},frames:frames,messages:messages,",
    "starts:function(){return starts;},",
    "drain:function(){timers.forEach(function(timer){timer.fn();});}};"
  ].join('\n'))(crash, startScore) as {
    step:(time:number)=>void;complete:()=>void;frames:Array<{countdown:boolean;result:boolean;score:number}>;
    messages:Array<{type:string;score?:number}>;starts:()=>number;drain:()=>void;
  };
}

describe('recording gameplay boundaries', () => {
  it('starts after 3-2-1, includes the crash frame, and never records the result overlay', () => {
    const game=runHarness(true);
    game.step(2999);
    expect(game.starts()).toBe(0);
    expect(game.frames).toHaveLength(0);
    game.step(3000);
    expect(game.starts()).toBe(1);
    expect(game.frames.every(frame=>!frame.countdown&&!frame.result)).toBe(true);
    game.step(3050);
    expect(game.messages.some(message=>message.type==='gameover')).toBe(true);
    const frameCount=game.frames.length;
    expect(frameCount).toBeGreaterThan(1);
    game.step(3100);
    expect(game.frames).toHaveLength(frameCount);
    expect(game.frames.every(frame=>!frame.countdown&&!frame.result)).toBe(true);
    game.drain();
  });

  it('includes the completed level score in the terminal frame', () => {
    const game=runHarness(false,59);
    game.step(3000);
    game.step(3050);
    game.complete();
    game.step(3100);
    expect(game.frames.at(-1)).toEqual({countdown:false,result:false,score:60});
    expect(game.messages.find(message=>message.type==='gameover')?.score).toBe(60);
    game.drain();
  });
});
