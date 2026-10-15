// Squats use only the torso and upper legs: lower-leg estimates must never
// affect calibration, control, or gameplay validation. Injected with form tracking.
// Must NOT contain backticks.
export const SCRIPT_SQUAT_TRACKING = `
// Preview-only numeric diagnostics. No camera frames, network calls, or saved scores.
var squatTraceRows = [], squatTraceLastSample = -Infinity, squatTraceLastSend = 0;
var squatTraceLastPose = 0, squatTraceSession = '';
function resetSquatTrace() {
  squatTraceRows = []; squatTraceLastSample = -Infinity; squatTraceLastSend = 0;
  squatTraceLastPose = 0; squatTraceSession = String(Date.now());
}
function sampleSquatTrace(now) {
  if (!CONFIG.squatDiagnostics || CONFIG.exercise !== 'squats' || typeof postRN !== 'function') { return; }
  var dt = squatTraceLastPose ? now - squatTraceLastPose : 0;
  squatTraceLastPose = now;
  if (now - squatTraceLastSample < 40) { return; }
  squatTraceLastSample = now;
  function number(value) { return Number.isFinite(value) ? Math.round(value * 10000) / 10000 : null; }
  var points = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26].map(function(index) {
    var p = formPoseLandmarks && formPoseLandmarks[index];
    return p ? [index, number(p.x), number(p.y), number(p.visibility)] : [index, null, null, null];
  });
  var phase = typeof state !== 'undefined' ? state : '';
  var check = phase === 'play' && formTopMetrics && formBottomMetrics
    ? validateSquatGameplay(formCurrentMetrics)
    : validateSquatCalibration(phase === 'waitBottom' ? 'bottom' : 'top', formCurrentMetrics);
  squatTraceRows.push({t:number(now),dt:number(dt),state:phase,points:points,
    raw:number(formCurrentMetrics && formCurrentMetrics.controllerY),
    previousSmooth:number(formTrackYSmooth),bird:number(typeof birdNorm !== 'undefined' ? birdNorm : null),
    top:number(typeof topY !== 'undefined' ? topY : null),bottom:number(typeof bottomY !== 'undefined' ? bottomY : null),
    valid:check.valid,reason:check.message,crash:typeof crashReason !== 'undefined' ? crashReason : ''});
  if (squatTraceRows.length > 60) { squatTraceRows.shift(); }
  if (now - squatTraceLastSend < 2000) { return; }
  squatTraceLastSend = now;
  postRN({type:'squatdebug',message:JSON.stringify({version:'2026-10-15.3-shoulder-squats',session:squatTraceSession,
    video:typeof video !== 'undefined' ? [video.videoWidth,video.videoHeight] : null,
    viewport:typeof W !== 'undefined' ? [W,H] : null,rows:squatTraceRows})});
  squatTraceRows = [];
}

function collectSquatMetrics() {
  var leftShoulder = formInFramePoint(11, 0.24);
  var rightShoulder = formInFramePoint(12, 0.24);
  var leftHip = formInFramePoint(23, 0.24);
  var rightHip = formInFramePoint(24, 0.24);
  // Flight always uses the same two-shoulder midpoint. Never switch to hips
  // when hands cover the waist, or to one shoulder when its partner is missing.
  var shoulders = leftShoulder && rightShoulder
    ? { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 } : null;
  var hips = leftHip && rightHip
    ? { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 } : null;
  var thighDrops = [];
  [[23, 25], [24, 26]].forEach(function(side) {
    var hip = formInFramePoint(side[0], 0.24);
    var knee = formInFramePoint(side[1], 0.24);
    if (hip && knee) { thighDrops.push(knee.y - hip.y); }
  });
  return {
    controllerY: shoulders ? shoulders.y : null,
    kneesVisible: !!(formInFramePoint(25, 0.24) || formInFramePoint(26, 0.24)),
    shoulders: shoulders,
    hips: hips,
    squatThighDrop: thighDrops.length
      ? thighDrops.reduce(function(sum, value) { return sum + value; }, 0) / thighDrops.length : null
  };
}

function squatBodyVisible(metrics) {
  return metrics && metrics.shoulders && metrics.hips && metrics.squatThighDrop !== null;
}

function squatChestRaised(metrics, reference) {
  if (!formTorsoIsUpright(metrics)) { return false; }
  var torsoHeight = metrics.hips.y - metrics.shoulders.y;
  if (torsoHeight <= 0.04) { return false; }
  // Allow a natural forward lean, but reject folding the chest toward the hips.
  return !reference || torsoHeight >= (reference.hips.y - reference.shoulders.y) * 0.5;
}

function validateSquatCalibration(position, metrics) {
  if (!squatBodyVisible(metrics)) {
    return formInvalid('Form check<br><br>Keep both shoulders, hips, and your knees in view.<br>Feet can stay outside the frame.');
  }
  if (!squatChestRaised(metrics, formTopMetrics)) {
    return formInvalid('Form check<br><br>Raise your chest instead of folding at the waist.');
  }
  if (position === 'top') {
    var torsoHeight = metrics.hips.y - metrics.shoulders.y;
    if (metrics.squatThighDrop < Math.max(0.04, torsoHeight * 0.3)) {
      return formInvalid('Form check<br><br>Stand comfortably tall for the top position.');
    }
  } else if (formTopMetrics) {
    var hipDrop = metrics.hips.y - formTopMetrics.hips.y;
    var shoulderDrop = metrics.shoulders.y - formTopMetrics.shoulders.y;
    // Hips must lower toward the knees, not just translate a standing pose.
    var thighChange = formTopMetrics.squatThighDrop - metrics.squatThighDrop;
    if (hipDrop <= 0.06 || shoulderDrop <= 0.06 || shoulderDrop < hipDrop * 0.35 ||
        thighChange < Math.max(0.025, formTopMetrics.squatThighDrop * 0.2)) {
      return formInvalid('Form check<br><br>Bend your knees and lower your hips into the squat.');
    }
  }
  return formValid();
}

function validateSquatGameplay(metrics) {
  // Calibration establishes the squat positions. During play, covered or noisy
  // hips cannot invalidate shoulder-controlled flight. Hands are unrestricted.
  if (!metrics || !metrics.shoulders || !metrics.kneesVisible) {
    return formInvalid('Form check<br><br>Keep both shoulders and your knees in view.<br>Feet can stay outside the frame.');
  }
  return formValid();
}
`;
