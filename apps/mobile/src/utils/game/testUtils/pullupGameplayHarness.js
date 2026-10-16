// Real tracking, calibration, game loop, collision, and terminal recording boundary.
// Only camera/rendering/encoder APIs are replaced by deterministic observation sinks.
function loadScripts() {
  return {
    core: require('../html/scriptCore').SCRIPT_CORE,
    form: require('../html/scriptFormTracking').SCRIPT_FORM_TRACKING,
    game: require('../html/scriptGame').SCRIPT_GAME,
  };
}

function createGame(scripts = loadScripts(), options = {}) {
  const { core, form, game } = scripts;
  const stability = core.slice(core.indexOf('var stabBuf = []'), core.indexOf('// ---------- Camera + MediaPipe'));
  const tracking = core.slice(core.indexOf('function trackLoop() {'), core.indexOf("window.addEventListener('pagehide'"));
  const helpers = game.slice(game.indexOf('var tutSeconds'), game.indexOf('// ---------- Composed-run recording'));
  const geometryAndEnd = game.slice(game.indexOf('function birdX()'), game.indexOf('// ---------- Drawing ----------'));
  const collisions = game.slice(game.indexOf('function collides()'), game.indexOf('// ---------- Main loop ----------'));
  const loop = game.slice(game.indexOf('function computeNorm()'), game.indexOf('// ---------- Kickoff'));
  return new Function('options', [
    "var CONFIG={exercise:'pullups',trackingMode:'form-test',maxScore:0,bird:{body:'#fff'}};",
    "var state='waitTop',topY=null,bottomY=null,lastFrame=0,lastSpawn=0,score=0,pushups=0;",
    'var birdNorm=.5,prevBirdNorm=.5,W=360,H=640,clouds=[],particles=[],nowValue=0,gameOverSent=false;',
    'var calibrationReadyAt=2000,countdownEnd=0,progress=0,messages=[],overlays=[],frames=[],transitions=[];',
    'var lastOverlay=null,previousState=state,runRecorder=null,recordingFramesFinished=false,recordingStartedAt=null;',
    'var pipes=[{x:10000,w:40,gapC:320,gapH:250,moving:false,passed:false}],timers=[];',
    'var performance={now:function(){return nowValue;}},video={videoWidth:480,videoHeight:640};',
    'var ctx={fillRect:function(){}};',
    'var trackingLoopActive=true,lastVideoTime=-1,landmarker=null,headY=null,headYSmooth=null,lastHeadTrackTime=0,headX=.5,usingShoulders=false,shoulderOffset=0;',
    'var wristY=null,wristYSmooth=null,lastWristTrackTime=0;function updateDot(){}',
    form, stability, helpers, tracking,
    'function getTrackY(){return getExperimentalTrackY();} function getTrackYSmooth(){return getExperimentalTrackYSmooth();}',
    'function trackingFresh(){return experimentalTrackingFresh();}',
    'function currentSpawnMs(){return 100000;} function currentSpeed(){return 100;} function spawnPipe(){}',
    'function updatePushups(){} function beep(){} function burst(){}',
    'function drawBackground(){} function drawBird(){} function drawHUD(){} function drawPipes(){} function drawParticles(){}',
    'function drawCountdownNumber(){} function hideCameraPreview(){} function requestAnimationFrame(){}',
    'function showOverlay(message){if(message!==lastOverlay){overlays.push({t:nowValue,state:state,message:message});lastOverlay=message;}}',
    'function hideOverlay(){lastOverlay=null;} function setProgress(value){progress=value;}',
    'function postRN(message){if(message.type!=="formdebug" || !message.message.includes("PULLUP_TRACE"))messages.push({t:nowValue,...message});}',
    'function startRunRecording(){runRecorder={};recordingStartedAt=nowValue;}',
    'function stopRunRecording(){runRecorder=null;} function stopCameraAndTracking(){}',
    'function copyComposedRecordingFrame(t,playable,force){if(runRecorder&&!recordingFramesFinished&&playable)frames.push({t:t,state:state,pipeX:pipes[0].x,crashReason:crashReason,force:!!force});}',
    'function setTimeout(fn,ms){timers.push({at:nowValue+ms,fn:fn});}',
    geometryAndEnd, collisions, loop,
    'function render(t){nowValue=t;loop(t);if(state!==previousState){transitions.push({t:t,from:previousState,to:state});previousState=state;}timers.filter(function(x){return x.at<=t;}).forEach(function(x){x.fn();});timers=timers.filter(function(x){return x.at>t;});}',
    'resetExperimentalFormTracking();',
    'return {step:function(t,points){nowValue=t;if(points)updateExperimentalFormPose(points,t);render(t);},render:render,',
    'cameraFrame:function(t,points,detectorError){nowValue=t;video.readyState=2;video.currentTime=t/1000;landmarker={detectForVideo:function(){if(detectorError)throw detectorError;return {landmarks:points?[points]:[]};}};trackLoop();render(t);},',
    'summary:function(){return {state:state,topY:topY,bottomY:bottomY,progress:progress,norm:computeNorm(),crashReason:crashReason,birdNorm:birdNorm,pipeX:pipes[0].x,recordingStartedAt:recordingStartedAt,recordingFramesFinished:recordingFramesFinished,calibrationReadyAt:calibrationReadyAt,setup:typeof getPullupSupportSetup===\'function\'?getPullupSupportSetup():null};},',
    'metrics:function(){return formCurrentMetrics;},support:function(){return pullupSupportDebug(formCurrentMetrics);},',
    'setPipe:function(x,gapC,gapH){pipes[0].x=x;pipes[0].gapC=gapC;pipes[0].gapH=gapH;},messages:messages,overlays:overlays,frames:frames,transitions:transitions};',
  ].join('\n'))(options);
}

function pose(kind = 'bottom', options = {}) {
  const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const lift = kind === 'top' ? .11 : typeof kind === 'number' ? kind : 0;
  const y = .4 - lift;
  const pairs = [
    [2,5,.475,y-.09], [11,12,.42,y],
    [13,14,lift ? .33 : .42,lift ? .33 : .31], [15,16,.42,.22],
    [23,24,.435,y+.19], [25,26,.45,y+.34], [27,28,.455,.88-lift],
    [29,30,.445,.90-lift], [31,32,.475,.92-lift],
  ];
  for(const [l,r,x,py] of pairs){points[l]={x,y:py,visibility:1};points[r]={x:1-x,y:py,visibility:1};}
  // Grounded overhead preparation: wrists stay at the bar while feet demonstrate the floor.
  if(kind === 'standing') {
    for (const i of [27,28,29,30,31,32]) points[i].y+=.04;
  }
  if(options.grounded) for (const i of [27,28,29,30,31,32]) points[i].y=({27:.92,28:.92,29:.94,30:.94,31:.96,32:.96})[i];
  if(options.calfRaise){points[27].y-=.04;points[28].y-=.04;points[29].y-=.04;points[30].y-=.04;}
  if(options.hideFeet) for(const i of [27,28,29,30,31,32])points[i].visibility=0;
  if(options.hideArms) for(const i of [13,14,15,16])points[i].visibility=0;
  return points;
}

function hold(game, points, start, duration, dt=25) {
  for(let now=start;now<=start+duration;now+=dt)game.step(now,points);
  return start+duration+dt;
}

function calibrate(game) {
  let t=hold(game,pose('standing'),100,1200);
  t=hold(game,pose('bottom'),t,2400);
  for(let p=0;p<=1.001;p+=.025){game.step(t,pose(.11*p));t+=25;}
  t=hold(game,pose('top'),t,2000);
  const top=game.summary();
  for(let p=0;p<=1.001;p+=.025){game.step(t,pose(.11*(1-p)));t+=25;}
  t=hold(game,pose('bottom'),t,2000);
  return {t,top,bottom:game.summary()};
}
module.exports={loadScripts,createGame,pose,hold,calibrate};
