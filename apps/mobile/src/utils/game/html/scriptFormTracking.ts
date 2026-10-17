import { SCRIPT_PULLUP_SUPPORT } from './scriptPullupSupport';
import { SCRIPT_SQUAT_TRACKING } from './scriptSquatTracking';
import { SCRIPT_CURL_DIAGNOSTICS } from './scriptCurlDiagnostics';
import { SCRIPT_CURL_TRACKING } from './scriptCurlTracking';
import { SCRIPT_CURL_FOREARM_TRACKING } from './scriptCurlForearmTracking';

// Form-aware production tracking. The legacy tracker remains available for
// explicit development comparisons.
// Must NOT contain backticks.

export const FORM_TRACKING_RULES_VERSION = '2026-10-17.3-curl-frame-timing';

export const SCRIPT_FORM_TRACKING = `
// ---------- Experimental form-aware tracking ----------
var formPoseLandmarks = null;
var curlFormWorldLandmarks = null;
var formCurrentMetrics = null;
var formTrackY = null, formTrackYSmooth = null;
var lastFormTrackTime = 0;
var formTopMetrics = null, formBottomMetrics = null;
var pullupCalibrationPoseHistory = [];
var pullupSetupStarted = false;
var pullupWristMissingAt = 0;
var pullupStartReference = null;
${SCRIPT_PULLUP_SUPPORT}
${SCRIPT_SQUAT_TRACKING}
${SCRIPT_CURL_DIAGNOSTICS}
${SCRIPT_CURL_TRACKING}
${SCRIPT_CURL_FOREARM_TRACKING}
var pullupPoseTrace = [];
var pullupTraceLastSampleAt = -Infinity;
var pullupTraceLastExportAt = 0;
var pullupTraceSession = '';
var lastPullupGameDebugAt = 0;
var pullupRunContactLogged = false;
var PULLUP_EVIDENCE_GRACE_MS = 1200;

function usesExperimentalFormTracking() {
  return CONFIG.trackingMode === 'form-test';
}

function resetExperimentalFormTracking() {
  resetSquatTrace();
  resetCurlTrace();
  resetCurlControlFilter();
  resetSquatLegEvidence();
  formPoseLandmarks = null;
  curlFormWorldLandmarks = null;
  formCurrentMetrics = null;
  formTrackY = null;
  formTrackYSmooth = null;
  lastFormTrackTime = 0;
  formTopMetrics = null;
  formBottomMetrics = null;
  pullupCalibrationPoseHistory = [];
  pullupSetupStarted = false;
  resetPullupSupportReference();
  pullupWristMissingAt = 0;
  resetPullupTopReference();

  pullupPoseTrace = [];
  pullupTraceLastSampleAt = -Infinity;
  pullupTraceLastExportAt = 0;
  pullupTraceSession = String(Date.now()) + '-' + String(Math.random()).slice(2, 8);
  lastPullupGameDebugAt = 0;
  pullupRunContactLogged = false;
}

function formPoint(index, minVisibility) {
  var point = formPoseLandmarks && formPoseLandmarks[index];
  if (!point) { return null; }
  var visibility = point.visibility === undefined ? 1 : point.visibility;
  return visibility >= (minVisibility || 0) ? point : null;
}

function formMeanPoint(indices, minVisibility, minimumCount) {
  var count = 0, x = 0, y = 0;
  for (var i = 0; i < indices.length; i++) {
    var point = formPoint(indices[i], minVisibility);
    if (point) { x += point.x; y += point.y; count += 1; }
  }
  if (count < minimumCount) { return null; }
  return { x: x / count, y: y / count };
}

function formDistance(a, b) {
  if (!a || !b) { return 999; }
  var dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function formJointAngle(a, b, c) {
  if (!a || !b || !c) { return null; }
  var aspect = CONFIG.exercise === 'pullups' && typeof video !== 'undefined' &&
    video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 1;
  var abx = (a.x - b.x) * aspect, aby = a.y - b.y;
  var cbx = (c.x - b.x) * aspect, cby = c.y - b.y;
  var ab = Math.sqrt(abx * abx + aby * aby);
  var cb = Math.sqrt(cbx * cbx + cby * cby);
  if (ab < 0.0001 || cb < 0.0001) { return null; }
  var cosine = Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / (ab * cb)));
  return Math.acos(cosine) * 180 / Math.PI;
}

function formAverageAngle(triples, minVisibility) {
  var total = 0, count = 0;
  for (var i = 0; i < triples.length; i++) {
    var triple = triples[i];
    var value = formJointAngle(
      formPoint(triple[0], minVisibility),
      formPoint(triple[1], minVisibility),
      formPoint(triple[2], minVisibility)
    );
    if (value !== null) { total += value; count += 1; }
  }
  return { value: count ? total / count : null, count: count };
}

function formVisibleFoot(indices) {
  var points = indices.map(function(index) { return formPoint(index, 0.12); })
    .filter(function(point) {
      return point && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
    });
  if (!points.length) { return null; }
  return {
    x: points.reduce(function(sum, point) { return sum + point.x; }, 0) / points.length,
    y: points.reduce(function(sum, point) { return sum + point.y; }, 0) / points.length
  };
}

function formInFramePoint(index, minVisibility) {
  var point = formPoint(index, minVisibility);
  return point && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1 ? point : null;
}

function collectShoulderPressArm(shoulderIndex, elbowIndex, wristIndex) {
  var shoulder = formInFramePoint(shoulderIndex, 0.24);
  var elbow = formInFramePoint(elbowIndex, 0.24);
  var wrist = formInFramePoint(wristIndex, 0.24);
  if (!shoulder || !elbow) { return null; }
  var upperArmLength = formDistance(shoulder, elbow);
  if (upperArmLength < 0.035) { return null; }
  return {
    shoulder: shoulder,
    elbow: elbow,
    wrist: wrist,
    upperArmLength: upperArmLength,
    lift: (shoulder.y - elbow.y) / upperArmLength,
    elbowAngle: formJointAngle(shoulder, elbow, wrist)
  };
}

function shoulderPressArms(metrics) {
  return metrics && metrics.leftPressArm && metrics.rightPressArm
    ? [metrics.leftPressArm, metrics.rightPressArm] : null;
}

function shoulderPressBottomVisible(arm) {
  return arm.wrist && arm.elbowAngle !== null && arm.elbowAngle >= 35 && arm.elbowAngle <= 140 &&
    Math.abs(arm.wrist.y - arm.shoulder.y) <= Math.max(0.09, arm.upperArmLength * 0.85) &&
    arm.wrist.y < arm.elbow.y;
}

function collectExperimentalFormMetrics() {
  if (!formPoseLandmarks) { return null; }
  if (CONFIG.exercise === 'squats') { return collectSquatMetrics(); }
  if (usesCurlForearmControl()) { return collectCurlForearmMetrics(); }
  var isPullup = CONFIG.exercise === 'pullups';
  var pullupVisibility = isPullup ? 0.35 : 0.24;
  var leftEye = isPullup ? formInFramePoint(2, 0.5) : null;
  var rightEye = isPullup ? formInFramePoint(5, 0.5) : null;
  var eyes = isPullup
    ? (leftEye && rightEye ? { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 } : null)
    : formMeanPoint([2, 5], pullupVisibility, 1);
  var shoulders = formMeanPoint(
    [11, 12],
    pullupVisibility,
    1
  );
  var elbows = formMeanPoint([13, 14], 0.24, 1);
  // Off-image or weak hand estimates cannot establish the bar position.
  var leftWrist = isPullup ? formInFramePoint(15, pullupVisibility) : formPoint(15, pullupVisibility);
  var rightWrist = isPullup ? formInFramePoint(16, pullupVisibility) : formPoint(16, pullupVisibility);
  var wrists = leftWrist && rightWrist
    ? { x: (leftWrist.x + rightWrist.x) / 2, y: (leftWrist.y + rightWrist.y) / 2 }
    : null;
  var supportHand = leftWrist && rightWrist
    ? wrists
    : (leftWrist || rightWrist);
  var hips = formMeanPoint([23, 24], 0.24, 1);
  var leftFoot = CONFIG.exercise === 'pullups' ? formVisibleFoot([27, 29, 31]) : formMeanPoint([27, 29, 31], 0.22, 1);
  var rightFoot = CONFIG.exercise === 'pullups' ? formVisibleFoot([28, 30, 32]) : formMeanPoint([28, 30, 32], 0.22, 1);
  var feet = CONFIG.exercise === 'pullups'
    ? (leftFoot && rightFoot
      ? { x: (leftFoot.x + rightFoot.x) / 2, y: Math.max(leftFoot.y, rightFoot.y) }
      : null)
    : formMeanPoint([27, 28], 0.22, 1);
  var curlLeftWorldAngle = CONFIG.exercise === 'biceps' ? curlWorldJointAngle(curlFormWorldLandmarks, 11, 13, 15) : null;
  var curlRightWorldAngle = CONFIG.exercise === 'biceps' ? curlWorldJointAngle(curlFormWorldLandmarks, 12, 14, 16) : null;
  var elbow = formAverageAngle([[11, 13, 15], [12, 14, 16]], pullupVisibility);
  var knee = formAverageAngle([[23, 25, 27], [24, 26, 28]], 0.22);
  var leftKneeAngle = formJointAngle(
    formPoint(23, 0.22),
    formPoint(25, 0.22),
    formPoint(27, 0.22)
  );
  var rightKneeAngle = formJointAngle(
    formPoint(24, 0.22),
    formPoint(26, 0.22),
    formPoint(28, 0.22)
  );
  var abduction = formAverageAngle([[23, 11, 13], [24, 12, 14]], 0.24);
  var leftPressArm = CONFIG.exercise === 'shoulderpress' ? collectShoulderPressArm(11, 13, 15) : null;
  var rightPressArm = CONFIG.exercise === 'shoulderpress' ? collectShoulderPressArm(12, 14, 16) : null;
  var controller = null;

  if (CONFIG.exercise === 'pushups' || CONFIG.exercise === 'pullups') {
    controller = shoulders;

  } else if (CONFIG.exercise === 'shoulderpress') {
    // Use one stable control signal throughout the press, including while wrists
    // cross the top edge. Relative upper-arm elevation excludes torso translation.
    controller = leftPressArm && rightPressArm
      ? { y: 0.5 - (leftPressArm.lift + rightPressArm.lift) * 0.125 } : null;
  } else {
    controller = wrists;
  }

  return {
    controllerY: controller ? controller.y : null,
    leftPressArm: leftPressArm,
    rightPressArm: rightPressArm,
    eyes: eyes,
    leftEye: leftEye,
    rightEye: rightEye,
    leftHip: isPullup ? formInFramePoint(23, 0.35) : null,
    rightHip: isPullup ? formInFramePoint(24, 0.35) : null,
    leftKnee: isPullup ? formInFramePoint(25, 0.35) : null,
    rightKnee: isPullup ? formInFramePoint(26, 0.35) : null,
    leftAnkle: isPullup ? formInFramePoint(27, 0.35) : null,
    rightAnkle: isPullup ? formInFramePoint(28, 0.35) : null,
    leftHeel: isPullup ? formInFramePoint(29, 0.35) : null,
    rightHeel: isPullup ? formInFramePoint(30, 0.35) : null,
    leftToe: isPullup ? formInFramePoint(31, 0.35) : null,
    rightToe: isPullup ? formInFramePoint(32, 0.35) : null,
    shoulders: shoulders,
    leftShoulder: isPullup ? formInFramePoint(11, 0.35) : null,
    rightShoulder: isPullup ? formInFramePoint(12, 0.35) : null,
    leftElbow: isPullup ? formInFramePoint(13, 0.35) : null,
    rightElbow: isPullup ? formInFramePoint(14, 0.35) : null,
    leftElbowAngle: isPullup ? formJointAngle(formInFramePoint(11, 0.35), formInFramePoint(13, 0.35), leftWrist)
      : CONFIG.exercise === 'biceps' ? formJointAngle(formPoint(11, .24), formPoint(13, .24), leftWrist) : null,
    rightElbowAngle: isPullup ? formJointAngle(formInFramePoint(12, 0.35), formInFramePoint(14, 0.35), rightWrist)
      : CONFIG.exercise === 'biceps' ? formJointAngle(formPoint(12, .24), formPoint(14, .24), rightWrist) : null,
    elbows: elbows,
    wrists: wrists,
    leftWrist: leftWrist,
    rightWrist: rightWrist,
    supportHand: supportHand,
    hips: hips,
    feet: feet,
    leftFoot: leftFoot,
    rightFoot: rightFoot,
    curlLeftWorldAngle: curlLeftWorldAngle,
    curlRightWorldAngle: curlRightWorldAngle,
    curlWorldAngle: curlLeftWorldAngle !== null && curlRightWorldAngle !== null ? (curlLeftWorldAngle + curlRightWorldAngle) / 2 : null,
    elbowAngle: elbow.value,
    elbowCount: elbow.count,
    kneeAngle: knee.value,
    kneeCount: knee.count,
    leftKneeAngle: leftKneeAngle,
    rightKneeAngle: rightKneeAngle,
    abductionAngle: abduction.value,
    abductionCount: abduction.count
  };
}

// Temporary development diagnostics: numbers only, no images or video. The
// ring buffer is bounded and discarded when the camera session resets.
function samplePullupCalibrationTrace(landmarks, now) {
  if (!usesExperimentalFormTracking() || CONFIG.exercise !== 'pullups' ||
      now <= pullupTraceLastSampleAt) { return; }
  pullupTraceLastSampleAt = now;
  var indices = [2, 5, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
  pullupPoseTrace.push({ t: Math.round(now), phase: typeof state === 'undefined' ? null : state, p: indices.map(function(index) {
    var p = landmarks && landmarks[index];
    return p ? [index, +p.x.toFixed(4), +p.y.toFixed(4),
      p.visibility === undefined ? null : +p.visibility.toFixed(3),
      p.z === undefined ? null : +p.z.toFixed(4)] : [index];
  }) });
  while (pullupPoseTrace.length > 240) { pullupPoseTrace.shift(); }
}

function exportPullupCalibrationTrace(event) {
  if (!usesExperimentalFormTracking() || CONFIG.exercise !== 'pullups' ||
      typeof postRN !== 'function' || !pullupPoseTrace.length) { return; }
  var now = performance.now();
  if (event === 'observing' && now - pullupTraceLastExportAt < 2500) { return; }
  pullupTraceLastExportAt = now;
  postRN({ type: 'formdebug', message: 'PULLUP_TRACE ' + JSON.stringify({
    version: '2026-09-18.9-foot-return', session: pullupTraceSession, event: event,
    videoSize: typeof video !== 'undefined' ? [video.videoWidth, video.videoHeight] : null,
    calibrationReadyAt: typeof calibrationReadyAt !== 'undefined' ? calibrationReadyAt : null,
    startReference: pullupStartReference, support: pullupSupportDebug(), frames: pullupPoseTrace
  }) });
  pullupPoseTrace = [];
}

function updateExperimentalFormPose(landmarks, now, worldLandmarks) {
  if (curlDiagnosticsEnabled()) { curlWorldLandmarks = worldLandmarks || null; }
  samplePullupCalibrationTrace(landmarks, now);
  curlFormWorldLandmarks = CONFIG.exercise === 'biceps' && landmarks ? worldLandmarks || null : null;
  formPoseLandmarks = landmarks;
  formCurrentMetrics = collectExperimentalFormMetrics();
  if (CONFIG.exercise === 'squats' && (!formCurrentMetrics || formCurrentMetrics.controllerY === null)) {
    formTrackY = null; lastFormTrackTime = 0;
    if (typeof stabBuf !== 'undefined') { stabBuf = []; }
  }
  updateSquatLegEvidence(now);
  sampleSquatTrace(now);
  if (CONFIG.exercise === 'pullups') {
    // Observation belongs to the camera clock across setup, calibration,
    // countdown and play. Rendering cannot manufacture new contact evidence.
    updatePullupSupportReference(formCurrentMetrics, now);
    var setup = getPullupSupportSetup();
    if (setup.ready && !pullupSetupStarted) {
      pullupSetupStarted = true;
      resetPullupTopReference();
      if (typeof calibrationReadyAt !== 'undefined') { calibrationReadyAt = now + 2000; }
      exportPullupCalibrationTrace(setup.mode === 'floor' ? 'floor-reference-saved' : 'feet-out-of-frame');
    }
    if (formCurrentMetrics && (!pullupCalibrationPoseHistory.length ||
        now > pullupCalibrationPoseHistory[pullupCalibrationPoseHistory.length - 1].t)) {
      pullupCalibrationPoseHistory.push({ t: now, metrics: formCurrentMetrics });
      while (pullupCalibrationPoseHistory.length > 8 && now - pullupCalibrationPoseHistory[0].t > 1800) {
        pullupCalibrationPoseHistory.shift();
      }
    }
    exportPullupCalibrationTrace('observing');
  }
  if (CONFIG.exercise === 'pullups' && pullupSetupStarted && !formTopMetrics) {
    // Optional context from already-seen airborne poses helps reject wrist drift
    // and head tilts. Reaching during floor setup cannot fix the bar target.
    // A visible valid top never requires this context or an earlier hold.
    if (pullupFloorCalibrationCheck().valid && !pullupReachPose(formCurrentMetrics)) {
      observePullupStartReference(formCurrentMetrics, now);
    } else {
      resetPullupTopReference();
    }
  }
  if (!formCurrentMetrics || formCurrentMetrics.controllerY === null) {
    if (CONFIG.exercise === 'biceps') {
      resetCurlControlFilter();
      if (typeof state !== 'undefined' && (state === 'waitTop' || state === 'waitBottom')) {
        formTrackY = null; formTrackYSmooth = null; lastFormTrackTime = 0;
        if (typeof stabBuf !== 'undefined') { stabBuf = []; }
      }
    }
    if (curlDiagnosticsEnabled()) { sampleCurlTrace(now); }
    return;
  }
  formTrackY = formCurrentMetrics.controllerY;
  if (formTrackYSmooth === null) { formTrackYSmooth = formTrackY; }
  // Keep noise filtering for calibration only. The owner rejected its gameplay delay.
  formTrackYSmooth = CONFIG.exercise === 'biceps' && typeof state !== 'undefined' &&
      (state === 'waitTop' || state === 'waitBottom')
    ? filterCurlController(usesCurlForearmControl() ? {
        leftWrist:formCurrentMetrics.leftWrist,
        rightWrist:formCurrentMetrics.rightWrist
      } : formCurrentMetrics, now)
    : formTrackYSmooth + (formTrackY - formTrackYSmooth) * 0.55;
  lastFormTrackTime = now;
  if (curlDiagnosticsEnabled()) { sampleCurlTrace(now); }
}

// Optional pull-up context. This runs once per fresh pose and never gates step 1.
// A wrist displacement is never evidence that the body rose.
var pullupReferenceSamples = [];
var pullupReferenceLastSeenAt = null;

function resetPullupTopReference() {
  pullupStartReference = null;
  pullupReferenceSamples = [];
  pullupReferenceLastSeenAt = null;
}

function pullupMedian(values) {
  var sorted = values.slice().sort(function(a, b) { return a - b; });
  var middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function pullupUpperBodyVisible(m) {
  return m && m.leftEye && m.rightEye && m.leftShoulder && m.rightShoulder &&
    m.leftElbow && m.rightElbow && m.leftWrist && m.rightWrist &&
    Number.isFinite(m.leftElbowAngle) && Number.isFinite(m.rightElbowAngle);
}

function pullupArmLength(m) {
  return (formDistance(m.leftShoulder, m.leftElbow) + formDistance(m.leftElbow, m.leftWrist) +
    formDistance(m.rightShoulder, m.rightElbow) + formDistance(m.rightElbow, m.rightWrist)) / 2;
}

function observePullupStartReference(m, now) {
  if (pullupReferenceLastSeenAt !== null && now - pullupReferenceLastSeenAt > 1200) {
    resetPullupTopReference();
  }
  if (!pullupUpperBodyVisible(m)) {
    pullupReferenceSamples = [];
    return;
  }
  pullupReferenceLastSeenAt = now;
  var armLength = pullupArmLength(m);
  // A comfortable starting bend is allowed. Projected elbow angles differ
  // substantially with grip and camera view, so no extended-arm threshold is
  // used to acquire this observation.
  if (armLength < 0.08 || m.wrists.y >= m.shoulders.y - 0.04 ||
      m.eyes.y - m.wrists.y < 0.025) {
    pullupReferenceSamples = [];
    return;
  }
  var last = pullupReferenceSamples.length ? pullupReferenceSamples[pullupReferenceSamples.length - 1] : null;
  if (last && now - last.t > 700) { pullupReferenceSamples = []; }
  pullupReferenceSamples.push({t: now, m: m});
  // Preserve five independent observations at slower fresh camera rates. A
  // strict 650ms window can never contain five samples at 4–5 fps.
  while (pullupReferenceSamples.length > 5 && now - pullupReferenceSamples[0].t > 650) {
    pullupReferenceSamples.shift();
  }
  if (pullupReferenceSamples.length < 5 || now - pullupReferenceSamples[0].t < 400) { return; }
  var median = function(read) {
    return pullupMedian(pullupReferenceSamples.map(function(sample) { return read(sample.m); }));
  };
  var leftY = median(function(p) { return p.leftShoulder.y; });
  var rightY = median(function(p) { return p.rightShoulder.y; });
  var barY = median(function(p) { return p.wrists.y; });
  var referenceArmLength = median(pullupArmLength);
  var tolerance = Math.max(0.008, Math.min(0.025, referenceArmLength * 0.06));
  // Use the majority of a sustained observation; one distorted estimate must
  // not create a lower-body reference or move the saved bar.
  var inliers = pullupReferenceSamples.filter(function(sample) {
    var p = sample.m;
    return Math.abs(p.leftShoulder.y - leftY) <= tolerance &&
      Math.abs(p.rightShoulder.y - rightY) <= tolerance &&
      Math.abs(p.wrists.y - barY) <= tolerance * 1.5;
  });
  if (inliers.length < Math.ceil(pullupReferenceSamples.length * 0.8) ||
      inliers[inliers.length - 1].t - inliers[0].t < 400) { return; }
  var shoulderY = (leftY + rightY) / 2;
  // Once the shoulders have risen, do not walk the reference upwards with the
  // pull. A later stable lower starting position can replace it.
  if (pullupStartReference && (leftY < pullupStartReference.leftShoulder.y + tolerance ||
      rightY < pullupStartReference.rightShoulder.y + tolerance)) { return; }
  // Settling lower changes the body baseline, never the fixed bar target.
  // Otherwise wrist-estimate drift could move the target down towards the eyes.
  if (pullupStartReference) { barY = pullupStartReference.barY; }
  pullupStartReference = {
    leftShoulder: {y: leftY}, rightShoulder: {y: rightY}, shoulderY: shoulderY,
    leftWrist: {x: median(function(p) { return p.leftWrist.x; }), y: median(function(p) { return p.leftWrist.y; })},
    rightWrist: {x: median(function(p) { return p.rightWrist.x; }), y: median(function(p) { return p.rightWrist.y; })},
    barY: barY, gap: shoulderY - barY,
    armLength: referenceArmLength,
    eyeToShoulder: median(function(p) { return p.shoulders.y - p.eyes.y; }),
    acquiredAt: now
  };
}

function pullupTopPoseValid(metrics) {
  if (!pullupUpperBodyVisible(metrics)) { return false; }
  var reference = pullupStartReference;
  // Use the current higher grip when someone jumps to a high bar. Previously
  // observed wrists cannot lower the target toward the face when estimates drift.
  var barY = reference ? Math.min(reference.barY, metrics.wrists.y) : metrics.wrists.y;
  if (metrics.leftEye.y - barY > 0.025 || metrics.rightEye.y - barY > 0.025) { return false; }
  if (reference) {
    var eyeToShoulder = metrics.shoulders.y - metrics.eyes.y;
    if (eyeToShoulder - reference.eyeToShoulder > Math.max(0.04, reference.eyeToShoulder * 0.3)) {
      return false;
    }
    // Combine the same permitted head/shoulder variation with the eye-to-bar
    // tolerance; this must not silently impose a stricter second posture test.
    var topShoulderLimit = barY + reference.eyeToShoulder +
      Math.max(0.04, reference.eyeToShoulder * 0.3) + 0.025;
    if (metrics.leftShoulder.y > topShoulderLimit || metrics.rightShoulder.y > topShoulderLimit) {
      return false;
    }
  }
  return metrics.wrists.y < metrics.shoulders.y - 0.015 &&
    metrics.leftElbowAngle <= 145 && metrics.rightElbowAngle <= 145;
}

function getExperimentalTrackY() {
  return CONFIG.exercise === 'biceps' && formTrackY !== null ? formTrackYSmooth : formTrackY;
}
function getExperimentalTrackYSmooth() { return formTrackYSmooth; }
function experimentalTrackingFresh() {
  return lastFormTrackTime > 0 && (performance.now() - lastFormTrackTime) < 700;
}

function formValid() { return { valid: true, message: '', fatal: false, fatalKey: '' }; }
function formInvalid(message) { return { valid: false, message: message, fatal: false, fatalKey: '' }; }
function formFatal(message, key) {
  return { valid: false, message: message, fatal: true, fatalKey: key };
}

function formAnchoredPushupHandCount(metrics, tolerance) {
  var count = 0;
  var keys = ['leftWrist', 'rightWrist'];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var current = metrics[key];
    var top = formTopMetrics && formTopMetrics[key];
    var bottom = formBottomMetrics && formBottomMetrics[key];
    if (!current || !top || !bottom) { continue; }
    var anchor = { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 };
    if (formDistance(current, anchor) <= tolerance) { count += 1; }
  }
  return count;
}

function formTorsoIsUpright(metrics) {
  if (!metrics || !metrics.shoulders || !metrics.hips) { return false; }
  var dx = Math.abs(metrics.shoulders.x - metrics.hips.x);
  var dy = Math.abs(metrics.shoulders.y - metrics.hips.y);
  return dy > dx * 0.3;
}

// Calibration only: straight elbows and a receding torso also fit someone
// bending over a device. Require an extended upper leg continuing behind the
// torso, using the existing model's depth. No additional model or gameplay work.
function pushupTopBodyExtendsBehindShoulders() {
  if (typeof video === 'undefined' || !Number.isFinite(video.videoWidth) ||
    !Number.isFinite(video.videoHeight) || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return false;
  }
  // MediaPipe normalized z uses roughly the x scale. Use image-height units.
  var aspect = video.videoWidth / video.videoHeight;
  var sides = [[11, 23, 25], [12, 24, 26]];
  var extendedLegs = 0;
  for (var i = 0; i < sides.length; i++) {
    var shoulder = formInFramePoint(sides[i][0], 0.24);
    var hip = formInFramePoint(sides[i][1], 0.24);
    if (!shoulder || !hip || !Number.isFinite(shoulder.z) || !Number.isFinite(hip.z)) {
      return false;
    }
    var torso = [(hip.x - shoulder.x) * aspect, hip.y - shoulder.y, (hip.z - shoulder.z) * aspect];
    if (torso[2] <= Math.max(Math.abs(torso[1]), 0.04)) { return false; }
    // A front view can hide one knee behind the other. Require at least one
    // observed knee; any other observed leg must agree, rather than averaging it away.
    var knee = formInFramePoint(sides[i][2], 0.24);
    if (!knee || !Number.isFinite(knee.z)) { continue; }
    var thigh = [(knee.x - hip.x) * aspect, knee.y - hip.y, (knee.z - hip.z) * aspect];
    var torsoLength = Math.hypot(torso[0], torso[1], torso[2]);
    var thighLength = Math.hypot(thigh[0], thigh[1], thigh[2]);
    if (thigh[2] <= Math.max(Math.abs(thigh[1]), 0.03) || thighLength < torsoLength * 0.2) { return false; }
    var alignment = (torso[0] * thigh[0] + torso[1] * thigh[1] + torso[2] * thigh[2]) / (torsoLength * thighLength);
    // Shoulder-hip-knee angle at least 145 degrees: reject a standing hip hinge.
    if (alignment < Math.cos(35 * Math.PI / 180)) { return false; }
    extendedLegs++;
  }
  return extendedLegs > 0;
}

function validateExperimentalCalibration(position) {
  if (!usesExperimentalFormTracking()) { return formValid(); }
  var metrics = formCurrentMetrics;
  if (!metrics) {
    return formInvalid(CONFIG.exercise === 'pullups'
      ? 'Get your upper body in frame<br><br>Keep both hands, elbows, and shoulders visible'
      : 'Form check<br><br>Move into frame and hold still.');
  }

  if (CONFIG.exercise === 'pushups') {
    if (!metrics.shoulders || !metrics.hips || !metrics.supportHand || metrics.elbowAngle === null) {
      return formInvalid('Form check<br><br>Keep a shoulder, elbow, wrist, and hip visible.');
    }
    if (metrics.supportHand.y < metrics.shoulders.y + 0.08) {
      return formInvalid('Form check<br><br>Place your supporting hands on the floor in front of the camera.');
    }
    if (position === 'top') {
      // Each arm must qualify. An average or one visible arm can hide a bent arm.
      var leftPushupAngle = formJointAngle(
        formInFramePoint(11, 0.24), formInFramePoint(13, 0.24), formInFramePoint(15, 0.24)
      );
      var rightPushupAngle = formJointAngle(
        formInFramePoint(12, 0.24), formInFramePoint(14, 0.24), formInFramePoint(16, 0.24)
      );
      if (leftPushupAngle === null || rightPushupAngle === null) {
        return formInvalid('Form check<br><br>Keep both shoulders, elbows, and hands visible.');
      }
      if (leftPushupAngle < 125 || rightPushupAngle < 125) {
        return formInvalid('Form check<br><br>Straighten both arms for the top position.');
      }
      if (!pushupTopBodyExtendsBehindShoulders()) {
        return formInvalid('Form check<br><br>Hold the top of a push-up with both arms straight.');
      }
    }
    if (position === 'bottom' && metrics.elbowAngle > 155) {
      return formInvalid('Form check<br><br>Bend your elbows and lower your chest.');
    }
    if (position === 'bottom' && formTopMetrics && formTopMetrics.elbowAngle - metrics.elbowAngle < 15) {
      return formInvalid('Form check<br><br>Bend your elbows more instead of moving only your head.');
    }
    return formValid();
  }

  if (CONFIG.exercise === 'squats') {
    return validateSquatCalibration(position, metrics);
  }

  if (CONFIG.exercise === 'pullups') {
    if (position === 'top') { exportPullupCalibrationTrace('observing'); }
    var pullupTopMessage = 'STEP 1 OF 2<br><br>Pull your <b>EYE LINE TO THE BAR</b>.<br>Hold until the bar fills.';
    var pullupBottomMessage = 'STEP 2 OF 2<br><br>Lower to a comfortable <b>HANG</b>.<br>Hold until the bar fills.';
    var floorCalibration = pullupFloorCalibrationCheck(metrics, position);
    if (!floorCalibration.valid) { return floorCalibration; }
    if (position === 'top') {
      return pullupTopSupportClear(metrics) && pullupTopPoseValid(metrics)
        ? formValid() : formInvalid(pullupTopMessage);
    }
    if (
      !metrics.shoulders ||
      !metrics.wrists ||
      metrics.elbowAngle === null ||
      metrics.elbowCount < 2
    ) {
      return formInvalid(pullupBottomMessage);
    }
    if (formTopMetrics) {
      var bodyTravel = metrics.controllerY - formTopMetrics.controllerY;
      var wristTravel = Math.max(
        formDistance(metrics.leftWrist, formTopMetrics.leftWrist),
        formDistance(metrics.rightWrist, formTopMetrics.rightWrist)
      );
      if (metrics.elbowAngle < 115 || metrics.elbowAngle - formTopMetrics.elbowAngle < 10) {
        return formInvalid(pullupBottomMessage);
      }
      if (wristTravel > Math.max(0.06, bodyTravel * 0.6)) {
        return formInvalid(pullupBottomMessage);
      }
    }
    return formValid();
  }

  if (CONFIG.exercise === 'biceps') {
    if (usesCurlForearmControl()) { return validateCurlForearmCalibration(metrics, position); }
    if (!metrics.shoulders || !metrics.hips || !metrics.elbows || !metrics.wrists || metrics.elbowAngle === null || metrics.elbowCount < 2) {
      return formInvalid('Form check<br><br>Keep your shoulders, elbows, wrists, and torso visible.');
    }
    if (!formTorsoIsUpright(metrics)) {
      return formInvalid('Form check<br><br>Keep your torso comfortably upright.');
    }
    // Each arm must qualify. Averaging lets one curled elbow hide a straight one.
    if (metrics.leftElbowAngle === null || metrics.rightElbowAngle === null) {
      return formInvalid('Form check<br><br>Keep both shoulders, elbows, and wrists visible.');
    }
    if (position === 'top' && (metrics.leftElbowAngle > 135 || metrics.rightElbowAngle > 135)) {
      return formInvalid('Form check<br><br>Curl BOTH hands toward your shoulders.');
    }
    if (position === 'bottom' && formTopMetrics && (
        metrics.leftElbowAngle - formTopMetrics.leftElbowAngle < 20 ||
        metrics.rightElbowAngle - formTopMetrics.rightElbowAngle < 20)) {
      return formInvalid('Form check<br><br>Extend BOTH elbows more for the bottom position.');
    }
    if (position === 'bottom' && formTopMetrics && !formHasBilateralWristRange(metrics, 0.05)) {
      return formInvalid('Form check<br><br>Move both dumbbells through the full curl range.');
    }
    return formValid();
  }

  if (CONFIG.exercise === 'lateralraise') {
    if (!metrics.shoulders || !metrics.hips || !metrics.wrists || metrics.elbowAngle === null || metrics.abductionAngle === null || metrics.elbowCount < 2 || metrics.abductionCount < 2) {
      return formInvalid('Form check<br><br>Keep your torso and both arms visible.');
    }
    if (metrics.elbowAngle < 115) {
      return formInvalid('Form check<br><br>Keep a comfortable, mostly straight arm.');
    }
    if (position === 'top' && metrics.abductionAngle < 50) {
      return formInvalid('Form check<br><br>Raise your arms outward toward shoulder height.');
    }
    if (position === 'bottom' && formTopMetrics && formTopMetrics.abductionAngle - metrics.abductionAngle < 25) {
      return formInvalid('Form check<br><br>Lower your arms toward your sides.');
    }
    if (position === 'bottom' && formTopMetrics && !formHasBilateralWristRange(metrics, 0.05)) {
      return formInvalid('Form check<br><br>Lower both arms through the full range.');
    }
    return formValid();
  }

  var pressArms = shoulderPressArms(metrics);
  if (!pressArms) {
    return formInvalid('Form check<br><br>Keep both shoulders and elbows in view.<br>Your hands can leave the top of the frame.');
  }
  if (metrics.hips && !formTorsoIsUpright(metrics)) {
    return formInvalid('Form check<br><br>Keep your torso comfortably upright.');
  }
  for (var pai = 0; pai < pressArms.length; pai++) {
    var pressArm = pressArms[pai];
    if (position === 'top' && (pressArm.lift < 0.65 ||
        (pressArm.elbowAngle !== null && pressArm.elbowAngle < 130))) {
      return formInvalid('Press both arms up<br><br>Keep your shoulders and elbows visible.<br>Your hands can leave the top of the frame.');
    }
    if (position === 'bottom' && (pressArm.lift > 0.35 || !shoulderPressBottomVisible(pressArm))) {
      return formInvalid('Lower both hands near your shoulders<br><br>Bend your elbows and hold still.');
    }
  }
  if (position === 'bottom' && formTopMetrics) {
    var topPressArms = shoulderPressArms(formTopMetrics);
    if (!topPressArms || pressArms.some(function(arm, index) {
      return topPressArms[index].lift - arm.lift < 0.35;
    })) {
      return formInvalid('Lower both elbows through the press range<br><br>Bring your hands near your shoulders.');
    }
  }
  return formValid();
}

function pullupStableCalibrationMetrics(since, controllerY, poseHistory) {
  var samples = (poseHistory || pullupCalibrationPoseHistory).filter(function(sample) { return sample.t >= since; });
  if (!samples.length) { return formCurrentMetrics; }
  var result = Object.assign({}, formCurrentMetrics);
  // References come from the same stable camera observations as the controller,
  // not whichever noisier landmark frame happened to close the progress bar.
  Object.keys(result).forEach(function(key) {
    var values = samples.map(function(sample) { return sample.metrics[key]; });
    if (values.every(function(value) { return typeof value === 'number' && Number.isFinite(value); })) {
      result[key] = values.reduce(function(sum, value) { return sum + value; }, 0) / values.length;
    } else if (values.every(function(value) { return value && Number.isFinite(value.x) && Number.isFinite(value.y); })) {
      result[key] = Object.assign({}, values[values.length - 1], {
        x: values.reduce(function(sum, value) { return sum + value.x; }, 0) / values.length,
        y: values.reduce(function(sum, value) { return sum + value.y; }, 0) / values.length
      });
      if (values.every(function(value) { return Number.isFinite(value.z); })) {
        result[key].z = values.reduce(function(sum, value) { return sum + value.z; }, 0) / values.length;
      } else { delete result[key].z; }
    }
  });
  if (Number.isFinite(controllerY)) { result.controllerY = controllerY; }
  return result;
}

function saveExperimentalCalibration(position, stableSince, controllerY) {
  if (!usesExperimentalFormTracking() || !formCurrentMetrics) { return; }
  var snapshot = CONFIG.exercise === 'pullups' && Number.isFinite(stableSince)
    ? pullupStableCalibrationMetrics(stableSince, controllerY) : formCurrentMetrics;
  if ((CONFIG.exercise === 'squats' || CONFIG.exercise === 'biceps') && Number.isFinite(stableSince) && typeof stabBuf !== 'undefined') {
    snapshot = pullupStableCalibrationMetrics(stableSince, controllerY, stabBuf.filter(function(sample) { return !!sample.metrics; }));
  }
  if (position === 'top') {
    exportPullupCalibrationTrace('accepted-top');
    formTopMetrics = snapshot;
  }
  else {
    formBottomMetrics = snapshot;
    if (CONFIG.exercise === 'pullups') {
      resetPullupSupportRun();
      savePullupClearanceProfile(formTopMetrics, formBottomMetrics);
      pullupRunContactLogged = false;
      exportPullupCalibrationTrace('accepted-bottom');
    }
  }
  if (CONFIG.exercise === 'pullups' && typeof postRN === 'function') {
    var m = formCurrentMetrics;
    postRN({
      type: 'formdebug',
      message: JSON.stringify({
        position: position,
        eyeToGrip: m.eyes && m.wrists ? +(m.eyes.y - m.wrists.y).toFixed(3) : null,
        shoulderToGrip: m.shoulders && m.wrists ? +(m.shoulders.y - m.wrists.y).toFixed(3) : null,
        startReference: pullupStartReference ? +pullupStartReference.gap.toFixed(3) : null,
        leftFootY: m.leftFoot ? +m.leftFoot.y.toFixed(3) : null,
        rightFootY: m.rightFoot ? +m.rightFoot.y.toFixed(3) : null,
        leftKnee: m.leftKneeAngle === null ? null : +m.leftKneeAngle.toFixed(0),
        rightKnee: m.rightKneeAngle === null ? null : +m.rightKneeAngle.toFixed(0),
        observedSupport: pullupSupportDebug(m)
      })
    });
  }
}

function formExpected(topValue, bottomValue, norm) {
  return bottomValue + (topValue - bottomValue) * norm;
}

function formMetricMatches(value, topValue, bottomValue, norm, tolerance) {
  if (value === null || topValue === null || bottomValue === null) { return false; }
  // The controller clamps at the calibrated endpoints. Continuing in the same
  // joint direction (including full extension) is still valid endpoint input.
  var direction = topValue - bottomValue;
  if (direction !== 0 && (
      (norm >= 0.98 && (value - topValue) * direction >= 0) ||
      (norm <= 0.02 && (value - bottomValue) * direction <= 0))) { return true; }
  return Math.abs(value - formExpected(topValue, bottomValue, norm)) <= tolerance;
}

function formHasBilateralWristRange(metrics, minimumTravel) {
  if (
    !metrics ||
    !metrics.leftWrist ||
    !metrics.rightWrist ||
    !formTopMetrics ||
    !formTopMetrics.leftWrist ||
    !formTopMetrics.rightWrist
  ) { return false; }
  return (
    Math.abs(metrics.leftWrist.y - formTopMetrics.leftWrist.y) >= minimumTravel &&
    Math.abs(metrics.rightWrist.y - formTopMetrics.rightWrist.y) >= minimumTravel
  );
}

function formWristProgress(value, topValue, bottomValue) {
  var range = bottomValue - topValue;
  if (Math.abs(range) < 0.04) { return null; }
  return Math.max(0, Math.min(1, (bottomValue - value) / range));
}

function formBilateralWristMotionMatches(metrics) {
  if (
    !metrics.leftWrist ||
    !metrics.rightWrist ||
    !formTopMetrics.leftWrist ||
    !formTopMetrics.rightWrist ||
    !formBottomMetrics.leftWrist ||
    !formBottomMetrics.rightWrist
  ) { return false; }
  var leftProgress = formWristProgress(
    metrics.leftWrist.y,
    formTopMetrics.leftWrist.y,
    formBottomMetrics.leftWrist.y
  );
  var rightProgress = formWristProgress(
    metrics.rightWrist.y,
    formTopMetrics.rightWrist.y,
    formBottomMetrics.rightWrist.y
  );
  if (leftProgress === null || rightProgress === null) { return false; }
  return Math.abs(leftProgress - rightProgress) <= 0.3;
}

function validateExperimentalGameplay(norm) {
  if (!usesExperimentalFormTracking()) { return formValid(); }
  var metrics = formCurrentMetrics;
  if (!metrics || !formTopMetrics || !formBottomMetrics) {
    return formInvalid('Form check<br><br>Re-center your full exercise position in the camera.');
  }

  if (CONFIG.exercise === 'pushups') {
    if (!metrics.leftWrist && !metrics.rightWrist) {
      return formFatal('Hands left the floor<br><br>Your run is ending.', 'pushup-hands');
    }
    if (!metrics.shoulders || !metrics.hips || metrics.elbowAngle === null) {
      return formInvalid('Form check<br><br>Keep your shoulders, elbows, wrists, and hips visible.');
    }
    if (formAnchoredPushupHandCount(metrics, 0.075) < 1) {
      return formFatal('Hands left the floor<br><br>Your run is ending.', 'pushup-hands');
    }
    if (!formMetricMatches(metrics.elbowAngle, formTopMetrics.elbowAngle, formBottomMetrics.elbowAngle, norm, 32)) {
      return formInvalid('Form check<br><br>Move through your elbows instead of bobbing your head.');
    }
    return formValid();
  }

  if (CONFIG.exercise === 'squats') {
    return validateSquatGameplay(metrics);
  }

  if (CONFIG.exercise === 'pullups') {
    var pullupNow = performance.now();
    var floorGameplay = pullupFloorGameplayCheck();
    if (!floorGameplay.valid) {
      if (floorGameplay.fatal && !pullupRunContactLogged) {
        pullupRunContactLogged = true;
        exportPullupCalibrationTrace('confirmed-ground-contact');
      }
      return floorGameplay;
    }
    if (!metrics.leftWrist || !metrics.rightWrist || !metrics.wrists) {
      if (!pullupWristMissingAt) { pullupWristMissingAt = pullupNow; }
      if (pullupNow - pullupWristMissingAt >= PULLUP_EVIDENCE_GRACE_MS) {
        return formFatal('Grip can no longer be verified<br><br>Your run is ending.', 'pullup-grip-unverified');
      }
      return formInvalid('Grip temporarily out of view<br><br>Show both hands on the bar to continue.');
    }
    pullupWristMissingAt = 0;
    if (!metrics.shoulders || metrics.elbowAngle === null || metrics.elbowCount < 2) {
      return formInvalid('Form check<br><br>Keep both shoulders, elbows, and hands visible.');
    }
    var gripMoved = ['leftWrist', 'rightWrist'].some(function(key) {
      var top = formTopMetrics[key], bottom = formBottomMetrics[key];
      if (!top || !bottom) { return true; }
      var anchor = { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 };
      return formDistance(metrics[key], anchor) > 0.075;
    });
    if (gripMoved) {
      return formFatal('Bar released<br><br>Your run is ending.', 'pullup-bar');
    }

    if (typeof postRN === 'function' &&
        (lastPullupGameDebugAt === 0 || pullupNow - lastPullupGameDebugAt >= 2000)) {
      lastPullupGameDebugAt = pullupNow;

      postRN({
        type: 'formdebug',
        message: JSON.stringify({
          phase: 'gameplay',
          shoulderY: +metrics.shoulders.y.toFixed(3),
          leftFootY: metrics.leftFoot ? +metrics.leftFoot.y.toFixed(3) : null,
          rightFootY: metrics.rightFoot ? +metrics.rightFoot.y.toFixed(3) : null,
          leftKnee: metrics.leftKneeAngle === null ? null : +metrics.leftKneeAngle.toFixed(0),
          rightKnee: metrics.rightKneeAngle === null ? null : +metrics.rightKneeAngle.toFixed(0),
          observedSupport: pullupSupportDebug(metrics)
        })
      });
    }
    if (!formMetricMatches(metrics.elbowAngle, formTopMetrics.elbowAngle, formBottomMetrics.elbowAngle, norm, 55)) {
      return formInvalid('Form check<br><br>Let your elbows bend and straighten with your body.');
    }
    return formValid();
  }

  if (CONFIG.exercise === 'biceps') {
    if (usesCurlForearmControl()) { return validateCurlForearmGameplay(metrics); }
    var curlArmCount = curlUsesWorldBend()
      ? (Number.isFinite(metrics.curlLeftWorldAngle) ? 1 : 0) + (Number.isFinite(metrics.curlRightWorldAngle) ? 1 : 0)
      : metrics.elbowCount;
    if (!metrics.leftWrist || !metrics.rightWrist || curlArmCount < 2) {
      return formFatal('Both arms can no longer be verified.', 'biceps-both-arms');
    }
    if (!formTorsoIsUpright(metrics) || !metrics.elbows || (!curlUsesWorldBend() && metrics.elbowAngle === null)) {
      return formInvalid('Form check<br><br>Keep your torso and elbows visible.');
    }
    if (!formBilateralWristMotionMatches(metrics)) {
      return formFatal('Both-arm curl could not be verified.', 'biceps-both-arms');
    }
    var curlBendCheck = validateCurlElbowBend(metrics, norm);
    if (!curlBendCheck.valid) { return curlBendCheck; }
    var elbowAnchor = {
      x: (formTopMetrics.elbows.x + formBottomMetrics.elbows.x) / 2,
      y: (formTopMetrics.elbows.y + formBottomMetrics.elbows.y) / 2
    };
    if (formDistance(metrics.elbows, elbowAnchor) > 0.13) {
      return formInvalid('Form check<br><br>Bring your elbows back near your sides.');
    }
    return formValid();
  }

  if (CONFIG.exercise === 'lateralraise') {
    if (!metrics.leftWrist || !metrics.rightWrist || metrics.elbowCount < 2 || metrics.abductionCount < 2) {
      return formFatal('Both arms can no longer be verified.', 'lateralraise-both-arms');
    }
    if (!formBilateralWristMotionMatches(metrics)) {
      return formFatal('Both-arm lateral raise could not be verified.', 'lateralraise-both-arms');
    }
    if (metrics.elbowAngle === null || metrics.abductionAngle === null || metrics.elbowAngle < 105) {
      return formInvalid('Form check<br><br>Keep both arms visible and comfortably straight.');
    }
    if (!formMetricMatches(metrics.abductionAngle, formTopMetrics.abductionAngle, formBottomMetrics.abductionAngle, norm, 50)) {
      return formInvalid('Form check<br><br>Raise your arms outward from your shoulders.');
    }
    return formValid();
  }

  var pressArms = shoulderPressArms(metrics);
  var topPressArms = shoulderPressArms(formTopMetrics);
  var bottomPressArms = shoulderPressArms(formBottomMetrics);
  if (!pressArms || !topPressArms || !bottomPressArms) {
    return formInvalid('Form check<br><br>Keep both shoulders and elbows in view.');
  }
  if (metrics.hips && !formTorsoIsUpright(metrics)) {
    return formInvalid('Form check<br><br>Keep your torso comfortably upright.');
  }
  var pressProgress = pressArms.map(function(arm, index) {
    var range = topPressArms[index].lift - bottomPressArms[index].lift;
    // Match the game controller: both arms beyond the same calibrated endpoint
    // are at that endpoint, even when the two calibration ranges differ.
    return range >= 0.35
      ? Math.max(0, Math.min(1, (arm.lift - bottomPressArms[index].lift) / range)) : null;
  });
  if (pressProgress[0] === null || pressProgress[1] === null ||
      Math.abs(pressProgress[0] - pressProgress[1]) > 0.3) {
    return formFatal('Both-arm shoulder press could not be verified.', 'shoulderpress-both-arms');
  }
  // Calibration verifies the starting press positions. During play, shoulder
  // and elbow motion controls the entire range, including full lockout above
  // or below it. Wrist estimates near the frame edge must not reject that input.
  // Holding an endpoint keeps the bird there while normal collisions continue.
  return formValid();
}
`;
