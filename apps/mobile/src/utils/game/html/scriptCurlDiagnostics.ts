// Read-only, opt-in curl telemetry. No tracking decisions or media capture.
// Must NOT contain backticks.
export const SCRIPT_CURL_DIAGNOSTICS = `
var curlTraceRows = [], curlTraceLastPose = null, curlTraceLastSample = -Infinity;
var curlTraceLastSend = 0, curlTraceSession = '';
var curlLastInferenceMs = null, curlWorldLandmarks = null;
var curlRenderStats = {count:0,totalMs:0,maxMs:0,over50Ms:0};
function recordCurlRenderInterval(ms) {
  if (!curlDiagnosticsEnabled() || state !== 'play') { return; }
  curlRenderStats.count++; curlRenderStats.totalMs += ms;
  curlRenderStats.maxMs = Math.max(curlRenderStats.maxMs, ms);
  if (ms > 50) { curlRenderStats.over50Ms++; }
}
function curlDiagnosticsEnabled() {
  return CONFIG.exercise === 'biceps' && CONFIG.curlDiagnostics === true;
}
function resetCurlTrace() {
  curlTraceRows = []; curlTraceLastPose = null; curlTraceLastSample = -Infinity;
  curlTraceLastSend = 0; curlTraceSession = '';
  curlLastInferenceMs = null; curlWorldLandmarks = null; curlRenderStats = {count:0,totalMs:0,maxMs:0,over50Ms:0};
}
function flushCurlTrace(now, terminal) {
  if (!curlDiagnosticsEnabled() || typeof postRN !== 'function' || (!curlTraceRows.length && !terminal)) { return; }
  postRN({type:'curldebug',message:JSON.stringify({version:'curl-trace-1',controller:'curl-cal-filter-flight-original',
    model:'lite',calibration:'each-arm-1',formGeometry:'world-when-calibrated-1',
    references:{top:formTopMetrics,bottom:formBottomMetrics},
    delegate:typeof trackerDelegate === 'undefined' ? null : trackerDelegate,render:curlRenderStats,session:curlTraceSession,
    video:typeof video !== 'undefined' ? [video.videoWidth,video.videoHeight] : null,
    viewport:typeof W !== 'undefined' ? [W,H] : null,rows:curlTraceRows,terminal:terminal || null})});
  curlTraceRows = []; curlTraceLastSend = now;
  curlRenderStats = {count:0,totalMs:0,maxMs:0,over50Ms:0};
}
function sampleCurlTrace(now, detected) {
  if (!curlDiagnosticsEnabled() || typeof postRN !== 'function') { return; }
  if (curlTraceLastPose !== null && now <= curlTraceLastPose) { return; }
  var dt = curlTraceLastPose === null ? 0 : now - curlTraceLastPose;
  curlTraceLastPose = now;
  if (now - curlTraceLastSample < 40) { return; }
  curlTraceLastSample = now;
  if (!curlTraceSession) { curlTraceSession = String(Date.now()) + '-' + String(now); }
  function number(value) { return Number.isFinite(value) ? Math.round(value * 10000) / 10000 : null; }
  var hasPose = detected !== false && !!formPoseLandmarks;
  var metrics = hasPose ? formCurrentMetrics : null;
  // Additional hand estimates distinguish wrist-only errors from whole-hand loss.
  // Keep the original point tuple/schema so existing replays remain compatible.
  var points = [11,12,13,14,15,16,17,18,19,20,21,22,23,24].map(function(index) {
    var p = hasPose && formPoseLandmarks[index];
    return p ? [index,number(p.x),number(p.y),number(p.visibility),
      Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1]
      : [index,null,null,null,false];
  });
  var worldPoints = [11,12,13,14,15,16].map(function(index) {
    var p = hasPose && curlWorldLandmarks && curlWorldLandmarks[index];
    return p ? [index,number(p.x),number(p.y),number(p.z),number(p.visibility)]
      : [index,null,null,null,null];
  });
  function wristProgress(key) {
    return metrics && metrics[key] && formTopMetrics && formTopMetrics[key] && formBottomMetrics && formBottomMetrics[key]
      ? formWristProgress(metrics[key].y,formTopMetrics[key].y,formBottomMetrics[key].y) : null;
  }
  var leftProgress = wristProgress('leftWrist'), rightProgress = wristProgress('rightWrist');
  var phase = typeof state !== 'undefined' ? state : '';
  var norm = typeof computeNorm === 'function' ? computeNorm() : null;
  // These biceps checks only read state. Record what gameplay currently sees,
  // including its stale value if the detector returned no person; never clear it here.
  var check = phase === 'play' ? validateExperimentalGameplay(norm)
    : phase === 'waitTop' || phase === 'waitBottom' ? validateExperimentalCalibration(phase === 'waitTop' ? 'top' : 'bottom') : null;
  curlTraceRows.push({t:number(now),dt:number(dt),inferenceMs:number(curlLastInferenceMs),state:phase,detected:hasPose,points:points,worldPoints:worldPoints,
    leftElbowAngle:hasPose ? number(formJointAngle(formPoint(11,.24),formPoint(13,.24),formPoint(15,.24))) : null,
    rightElbowAngle:hasPose ? number(formJointAngle(formPoint(12,.24),formPoint(14,.24),formPoint(16,.24))) : null,
    worldElbowAngles:metrics ? [number(metrics.curlLeftWorldAngle),number(metrics.curlRightWorldAngle)] : [null,null],
    elbowAngle:number(metrics && metrics.elbowAngle),elbowCount:metrics ? metrics.elbowCount : 0,
    leftProgress:number(leftProgress),rightProgress:number(rightProgress),
    progressDifference:leftProgress !== null && rightProgress !== null ? number(Math.abs(leftProgress-rightProgress)) : null,
    poseRaw:number(metrics && metrics.controllerY),raw:number(formTrackY),smooth:number(formTrackYSmooth),
    bird:number(typeof birdNorm !== 'undefined' ? birdNorm : null),norm:number(norm),
    top:number(typeof topY !== 'undefined' ? topY : null),bottom:number(typeof bottomY !== 'undefined' ? bottomY : null),
    check:check ? {valid:check.valid,message:check.message,fatal:check.fatal,fatalKey:check.fatalKey} : null,
    crashReason:typeof crashReason !== 'undefined' ? crashReason : ''});
  if (curlTraceRows.length > 60) { curlTraceRows.shift(); }
  if (now - curlTraceLastSend >= 2000) { flushCurlTrace(now); }
}
`;
