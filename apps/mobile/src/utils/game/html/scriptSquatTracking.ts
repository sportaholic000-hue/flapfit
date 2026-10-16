// Squats use only the torso and upper legs: lower-leg estimates must never
// affect calibration, control, or gameplay validation. Injected with form tracking.
// Must NOT contain backticks.
export const SCRIPT_SQUAT_TRACKING = `
// Preview-only numeric diagnostics. No camera frames, network calls, or saved scores.
var squatTraceRows = [], squatTraceLastSample = -Infinity, squatTraceLastSend = 0;
var squatTraceLastPose = 0, squatTraceSession = '';
var squatLegDebtMs = 0, squatLegLastPose = null, squatLegFailure = false;
function resetSquatLegEvidence() {
  squatLegDebtMs = 0; squatLegLastPose = null; squatLegFailure = false;
}
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
    legDebtMs:number(squatLegDebtMs),valid:check.valid,reason:check.message,crash:typeof crashReason !== 'undefined' ? crashReason : ''});
  if (squatTraceRows.length > 60) { squatTraceRows.shift(); }
  if (now - squatTraceLastSend < 2000) { return; }
  squatTraceLastSend = now;
  postRN({type:'squatdebug',message:JSON.stringify({version:'2026-10-15.5-squat-presence',session:squatTraceSession,
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
    shoulderWidth: leftShoulder && rightShoulder ? Math.abs(leftShoulder.x - rightShoulder.x) : 0,
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
  // A person passing the edge or turning away cannot establish a reference.
  // This is a broad camera-facing area, not alignment to the silhouette outline.
  var torsoHeight = metrics.hips.y - metrics.shoulders.y;
  if (metrics.shoulders.x < 0.2 || metrics.shoulders.x > 0.8 ||
      metrics.shoulderWidth < Math.max(0.05, torsoHeight * 0.45)) {
    return formInvalid('Face the camera<br><br>Move into the middle of the view and hold still.');
  }
  if (!squatChestRaised(metrics, formTopMetrics)) {
    return formInvalid('Form check<br><br>Raise your chest instead of folding at the waist.');
  }
  if (position === 'top') {
    if (metrics.squatThighDrop < Math.max(0.04, torsoHeight * 0.6)) {
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

// Coarse exercise evidence is separate from shoulder flight. A 30% allowance
// tolerates noisy leg estimates without ignoring the partial-range movements
// seen in the straight-leg phone trace. Never map that noise to the bird.
function squatLegMotionMissing(metrics) {
  if (!squatBodyVisible(metrics) || !formTopMetrics || !formBottomMetrics) { return false; }
  var shoulderRange = formBottomMetrics.shoulders.y - formTopMetrics.shoulders.y;
  var hipRange = formBottomMetrics.hips.y - formTopMetrics.hips.y;
  var thighRange = formTopMetrics.squatThighDrop - formBottomMetrics.squatThighDrop;
  if (shoulderRange <= 0 || hipRange <= 0 || thighRange <= 0) { return true; }
  var progress = Math.max(0, Math.min(1,
    (metrics.shoulders.y - formTopMetrics.shoulders.y) / shoulderRange));
  var hipProgress = (metrics.hips.y - formTopMetrics.hips.y) / hipRange;
  var thighProgress = (formTopMetrics.squatThighDrop - metrics.squatThighDrop) / thighRange;
  return progress > 0.3 && (hipProgress < progress - 0.3 || thighProgress < progress - 0.3);
}

function updateSquatLegEvidence(now) {
  if (CONFIG.exercise !== 'squats') { return; }
  if (!formTopMetrics || !formBottomMetrics || (typeof state !== 'undefined' && state !== 'play')) {
    resetSquatLegEvidence(); return;
  }
  if (squatLegLastPose !== null && now <= squatLegLastPose) { return; }
  var elapsed = squatLegLastPose === null ? 0 : Math.min(100, now - squatLegLastPose);
  squatLegLastPose = now;
  if (squatLegFailure || !squatBodyVisible(formCurrentMetrics)) { return; }
  // Only fresh camera observations count. Standing briefly does not erase
  // repeated waist bends; isolated noise recovers gradually during valid motion.
  squatLegDebtMs = Math.max(0, squatLegDebtMs +
    (squatLegMotionMissing(formCurrentMetrics) ? elapsed : -elapsed * 0.25));
  if (squatLegDebtMs >= 600) { squatLegFailure = true; }
}

function validateSquatGameplay(metrics) {
  if (squatLegFailure) {
    return formFatal('Squat movement lost<br><br>Bend your knees and lower your hips, not just your shoulders.', 'squat-leg-motion');
  }
  if (!squatBodyVisible(metrics)) {
    return formInvalid('Form check<br><br>Keep shoulders, hips, and knees in view.<br>Feet can stay outside the frame.');
  }
  return formValid();
}
`;
