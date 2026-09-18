import { SCRIPT_CORE } from '../html/scriptCore';
import { SCRIPT_GAME } from '../html/scriptGame';

function previewGame(mode = 'sky') {
  const helpers = SCRIPT_CORE.slice(SCRIPT_CORE.indexOf('function usesCameraBackground()'), SCRIPT_CORE.indexOf('var W = 0'));
  const toggle = SCRIPT_CORE.slice(SCRIPT_CORE.indexOf('function _toggleCam()'), SCRIPT_CORE.indexOf('if (camBtnEl) {', SCRIPT_CORE.indexOf('function _toggleCam()')));
  const loop = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function loop(now)'), SCRIPT_GAME.indexOf('// ---------- Kickoff ----------'));
  return new Function('mode', `
    var CONFIG={backgroundMode:mode,exercise:'pushups',maxScore:60};
    var state='waitTop',calibrationReadyAt=0,progress=1,trackY=0.2,topY=null,bottomY=null,stabBuf=[];
    var camHidden=false,previewEl={style:{display:'block',opacity:'1'}},camBtnEl={style:{display:'block'}};
    var stream={},video={srcObject:stream,paused:false},trackingLoopActive=true;
    var lastFrame=0,lastSpawn=0,countdownEnd=0,birdNorm=0.5,prevBirdNorm=0.5,score=0;
    var clouds=[],pipes=[],particles=[],W=360,H=640,messages=[];
    var tutSeconds=0,tutReportedSeconds=0,competitionDurationMs=0,crashReason='',crashFallVelocity=0;
    var fatalFormKey='',fatalFormSince=0,formTrackingInterruptionSince=0;
    function computeNorm(){return 0.5;} function getTrackY(){return trackY;}
    function usesExperimentalFormTracking(){return false;} function trackingFresh(){return true;}
    function stabilityProgress(){return progress;} function stabAverage(){return trackY;}
    function topCalibrationMessage(){return 'Top';} function saveExperimentalCalibration(){}
    function setProgress(){} function showOverlay(){} function hideOverlay(){} function beep(){}
    function postRN(message){messages.push(message);} function requestAnimationFrame(){}
    function drawBackground(){} function drawBird(){} function drawPipes(){} function drawHUD(){}
    function drawCountdownNumber(){} function drawParticles(){} function copyComposedRecordingFrame(){}
    function currentSpawnMs(){return 2300;} function currentSpeed(){return 160;} function spawnPipe(){}
    function startRunRecording(){} function fatalFormFailureConfirmed(){return false;}
    function formTrackingInterruptionConfirmed(){return false;} function updatePushups(){}
    function collides(){return false;}
    ${helpers}\n${toggle}\n${loop}
    if(usesCameraBackground())hideCameraPreview();
    return {step:function(now,y,p){trackY=y;progress=p;loop(now);},toggle:_toggleCam,
      snapshot:function(){return {state,preview:{...previewEl.style},button:{...camBtnEl.style},
        cameraActive:video.srcObject===stream&&!video.paused&&trackingLoopActive};},messages};
  `)(mode) as {
    step: (now: number, y: number, progress: number) => void;
    toggle: () => void;
    snapshot: () => { state: string; preview: Record<string, string>; button: Record<string, string>; cameraActive: boolean };
    messages: Array<{type: string}>;
  };
}

describe('camera preview after calibration', () => {
  it('clears Sky after both positions and keeps the camera active through gameplay', () => {
    const game = previewGame();
    game.step(1000, 0.2, 1);
    expect(game.snapshot()).toMatchObject({state:'waitBottom',preview:{opacity:'1'},cameraActive:true});
    game.step(1100, 0.7, 0.5);
    expect(game.snapshot().preview.opacity).toBe('1');
    game.step(2000, 0.7, 1);
    expect(game.snapshot()).toMatchObject({state:'countdown',preview:{opacity:'0',pointerEvents:'none'},button:{display:'none'},cameraActive:true});
    game.toggle();
    game.step(5000, 0.7, 1);
    game.step(5016, 0.7, 1);
    expect(game.snapshot()).toMatchObject({state:'play',preview:{opacity:'0'},button:{display:'none'},cameraActive:true});
    expect(game.messages.filter(message=>message.type==='calibrated')).toHaveLength(1);
  });
  it('keeps the preview available when the second calibration position is rejected', () => {
    const game = previewGame();
    game.step(1000, 0.2, 1);
    game.step(2000, 0.22, 1);
    expect(game.snapshot()).toMatchObject({state:'waitBottom',preview:{opacity:'1'},button:{display:'block'},cameraActive:true});
    expect(game.messages).toHaveLength(0);
  });
  it('preserves the active camera source in full-screen Camera mode', () => {
    const game = previewGame('camera');
    game.toggle();
    game.step(1000, 0.2, 1);
    game.step(2000, 0.7, 1);
    game.step(5000, 0.7, 1);
    expect(game.snapshot()).toMatchObject({state:'play',preview:{opacity:'0'},button:{display:'none'},cameraActive:true});
  });
});
