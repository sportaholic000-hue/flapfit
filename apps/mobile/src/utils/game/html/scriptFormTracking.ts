// Optional development-only form tracking. The normal tracker remains available
// so physical A/B testing can happen without replacing the launch baseline.
// Must NOT contain backticks.

export const SCRIPT_FORM_TRACKING = `
// ---------- Experimental form-aware tracking ----------
var formPoseLandmarks = null;
var formCurrentMetrics = null;
var formTrackY = null, formTrackYSmooth = null;
var lastFormTrackTime = 0;
var formTopMetrics = null, formBottomMetrics = null;
var pullupFloorY = null;
var pullupFloorClearance = 0.035;
var pullupSetupShoulderY = null;
var pullupSetupStartedAt = null;
var pullupSetupLastValidAt = 0;
var pullupSetupSamples = [];
var pullupTopReadyAt = 0;
var PULLUP_SETUP_HOLD_MS = 2000;
var PULLUP_MOVE_BUFFER_MS = 2000;

function usesExperimentalFormTracking() {
  return CONFIG.trackingMode === 'form-test';
}

function resetExperimentalFormTracking() {
  formPoseLandmarks = null;
  formCurrentMetrics = null;
  formTrackY = null;
  formTrackYSmooth = null;
  lastFormTrackTime = 0;
  formTopMetrics = null;
  formBottomMetrics = null;
  pullupFloorY = null;
  pullupFloorClearance = 0.035;
  pullupSetupShoulderY = null;
  pullupSetupStartedAt = null;
  pullupSetupLastValidAt = 0;
  pullupSetupSamples = [];
  pullupTopReadyAt = 0;
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
  var abx = a.x - b.x, aby = a.y - b.y;
  var cbx = c.x - b.x, cby = c.y - b.y;
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

function collectExperimentalFormMetrics() {
  if (!formPoseLandmarks) { return null; }
  var shoulders = formMeanPoint(
    [11, 12],
    CONFIG.exercise === 'pullups' ? 0.15 : 0.24,
    1
  );
  var elbows = formMeanPoint([13, 14], 0.24, 1);
  var pullupVisibility = CONFIG.exercise === 'pullups' ? 0.15 : 0.24;
  var leftWrist = formPoint(15, pullupVisibility);
  var rightWrist = formPoint(16, pullupVisibility);
  var wrists = leftWrist && rightWrist
    ? { x: (leftWrist.x + rightWrist.x) / 2, y: (leftWrist.y + rightWrist.y) / 2 }
    : null;
  var supportHand = leftWrist && rightWrist
    ? wrists
    : (leftWrist || rightWrist);
  var hips = formMeanPoint([23, 24], 0.24, 1);
  var feet = formMeanPoint([27, 28], CONFIG.exercise === 'pullups' ? 0.12 : 0.22, 1);
  var elbow = formAverageAngle([[11, 13, 15], [12, 14, 16]], pullupVisibility);
  var knee = formAverageAngle([[23, 25, 27], [24, 26, 28]], 0.22);
  var abduction = formAverageAngle([[23, 11, 13], [24, 12, 14]], 0.24);
  var controller = null;

  if (CONFIG.exercise === 'pushups' || CONFIG.exercise === 'pullups') {
    controller = shoulders;
  } else if (CONFIG.exercise === 'squats') {
    controller = hips;
  } else {
    controller = wrists;
  }

  return {
    controllerY: controller ? controller.y : null,
    shoulders: shoulders,
    elbows: elbows,
    wrists: wrists,
    leftWrist: leftWrist,
    rightWrist: rightWrist,
    supportHand: supportHand,
    hips: hips,
    feet: feet,
    elbowAngle: elbow.value,
    elbowCount: elbow.count,
    kneeAngle: knee.value,
    kneeCount: knee.count,
    abductionAngle: abduction.value,
    abductionCount: abduction.count
  };
}

function updateExperimentalFormPose(landmarks, now) {
  formPoseLandmarks = landmarks;
  formCurrentMetrics = collectExperimentalFormMetrics();
  if (
    CONFIG.exercise === 'pullups' &&
    formTopMetrics === null &&
    pullupFloorY === null
  ) {
    var setupReady = formCurrentMetrics &&
      formCurrentMetrics.shoulders &&
      formCurrentMetrics.wrists &&
      formCurrentMetrics.feet &&
      formCurrentMetrics.wrists.y < formCurrentMetrics.shoulders.y - 0.015;
    if (!setupReady) {
      if (pullupSetupStartedAt !== null && now - pullupSetupLastValidAt > 600) {
        pullupSetupStartedAt = null;
        pullupSetupSamples = [];
      }
    } else {
      if (pullupSetupStartedAt === null) {
        pullupSetupStartedAt = now;
        pullupSetupSamples = [];
      }
      pullupSetupLastValidAt = now;
      pullupSetupSamples.push({
        footY: formCurrentMetrics.feet.y,
        shoulderY: formCurrentMetrics.shoulders.y
      });
      if (
        now - pullupSetupStartedAt >= PULLUP_SETUP_HOLD_MS &&
        pullupSetupSamples.length >= 8
      ) {
        var floorTotal = 0, shoulderTotal = 0;
        for (var psj = 0; psj < pullupSetupSamples.length; psj++) {
          floorTotal += pullupSetupSamples[psj].footY;
          shoulderTotal += pullupSetupSamples[psj].shoulderY;
        }
        pullupFloorY = floorTotal / pullupSetupSamples.length;
        pullupSetupShoulderY = shoulderTotal / pullupSetupSamples.length;
        var setupBodySpan = Math.abs(pullupFloorY - pullupSetupShoulderY);
        pullupFloorClearance = Math.max(0.035, Math.min(0.07, setupBodySpan * 0.07));
        pullupTopReadyAt = now + PULLUP_MOVE_BUFFER_MS;
        if (typeof beep === 'function') { beep(540, 0.15, 'sine', 0.08); }
      }
    }
  }
  if (!formCurrentMetrics || formCurrentMetrics.controllerY === null) { return; }
  formTrackY = formCurrentMetrics.controllerY;
  if (formTrackYSmooth === null) { formTrackYSmooth = formTrackY; }
  formTrackYSmooth = formTrackYSmooth + (formTrackY - formTrackYSmooth) * 0.55;
  lastFormTrackTime = now;
}

function getExperimentalTrackY() { return formTrackY; }
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

function validateExperimentalCalibration(position) {
  if (!usesExperimentalFormTracking()) { return formValid(); }
  var metrics = formCurrentMetrics;
  if (!metrics) {
    return formInvalid(CONFIG.exercise === 'pullups'
      ? 'PULL-UP SETUP<br><br>Stand with feet planted and hold the bar<br>Keep your full body in the camera'
      : 'Form check<br><br>Move into frame and hold still.');
  }

  if (CONFIG.exercise === 'pushups') {
    if (!metrics.shoulders || !metrics.hips || !metrics.supportHand || metrics.elbowAngle === null) {
      return formInvalid('Form check<br><br>Keep a shoulder, elbow, wrist, and hip visible.');
    }
    if (metrics.supportHand.y < metrics.shoulders.y + 0.08) {
      return formInvalid('Form check<br><br>Place your supporting hands on the floor in front of the camera.');
    }
    if (position === 'top' && metrics.elbowAngle < 125) {
      return formInvalid('Form check<br><br>Straighten your arms for the top position.');
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
    if (!metrics.shoulders || !metrics.hips || metrics.kneeAngle === null) {
      return formInvalid('Form check<br><br>Keep your shoulders, hips, knees, and at least one ankle visible.');
    }
    if (!formTorsoIsUpright(metrics)) {
      return formInvalid('Form check<br><br>Raise your chest instead of folding at the waist.');
    }
    if (position === 'top' && metrics.kneeAngle < 130) {
      return formInvalid('Form check<br><br>Stand comfortably tall for the top position.');
    }
    if (position === 'bottom' && metrics.kneeAngle > 150) {
      return formInvalid('Form check<br><br>Bend your knees as you lower into the squat.');
    }
    if (position === 'bottom' && formTopMetrics && formTopMetrics.kneeAngle - metrics.kneeAngle < 15) {
      return formInvalid('Form check<br><br>Bend your knees more instead of bending only at the waist.');
    }
    return formValid();
  }

  if (CONFIG.exercise === 'pullups') {
    var pullupSetupMessage = 'PULL-UP SETUP<br><br>Stand with feet planted and hold the bar<br>Keep your full body in the camera';
    var pullupTopMessage = 'STEP 1 OF 2<br><br>Lift your feet and pull to your <b>HIGHEST</b> point<br>Bent knees are fine<br><br>Hold still…';
    var pullupBottomMessage = 'STEP 2 OF 2<br><br>Lower to a comfortable <b>BOTTOM</b> position<br>A slight elbow bend and bent knees are fine<br>Keep at least one ankle visible<br><br>Hold still…';
    if (pullupFloorY === null) {
      return formInvalid(pullupSetupMessage);
    }
    if (performance.now() < pullupTopReadyAt) {
      var moveSeconds = Math.max(1, Math.ceil((pullupTopReadyAt - performance.now()) / 1000));
      return formInvalid('GET READY<br><br>Lift your feet and pull upward<br>Bent knees are fine<br><br><small>Step 1 opens in ' + moveSeconds + '…</small>');
    }
    if (position === 'top') {
      if (
        !metrics.shoulders ||
        !metrics.wrists ||
        !metrics.feet ||
        metrics.elbowAngle === null ||
        metrics.wrists.y > metrics.shoulders.y - 0.015 ||
        metrics.feet.y > pullupFloorY - pullupFloorClearance ||
        metrics.elbowAngle > 135 ||
        pullupSetupShoulderY === null ||
        metrics.shoulders.y > pullupSetupShoulderY - 0.035
      ) {
        return formInvalid(pullupTopMessage);
      }
      return formValid();
    }
    if (
      !metrics.shoulders ||
      !metrics.wrists ||
      !metrics.feet ||
      metrics.elbowAngle === null ||
      metrics.feet.y > pullupFloorY - pullupFloorClearance
    ) {
      return formInvalid(pullupBottomMessage);
    }
    if (formTopMetrics) {
      var bodyTravel = metrics.controllerY - formTopMetrics.controllerY;
      var wristTravel = formDistance(metrics.wrists, formTopMetrics.wrists);
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
    if (!metrics.shoulders || !metrics.hips || !metrics.elbows || !metrics.wrists || metrics.elbowAngle === null) {
      return formInvalid('Form check<br><br>Keep your shoulders, elbows, wrists, and torso visible.');
    }
    if (!formTorsoIsUpright(metrics)) {
      return formInvalid('Form check<br><br>Keep your torso comfortably upright.');
    }
    if (position === 'top' && metrics.elbowAngle > 135) {
      return formInvalid('Form check<br><br>Curl your hands toward your shoulders.');
    }
    if (position === 'bottom' && formTopMetrics && metrics.elbowAngle - formTopMetrics.elbowAngle < 20) {
      return formInvalid('Form check<br><br>Extend your elbows more for the bottom position.');
    }
    return formValid();
  }

  if (CONFIG.exercise === 'lateralraise') {
    if (!metrics.shoulders || !metrics.hips || !metrics.wrists || metrics.elbowAngle === null || metrics.abductionAngle === null) {
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
    return formValid();
  }

  if (!metrics.shoulders || !metrics.hips || !metrics.wrists || metrics.elbowAngle === null) {
    return formInvalid('Form check<br><br>Keep your torso, elbows, and both wrists visible.');
  }
  if (!formTorsoIsUpright(metrics)) {
    return formInvalid('Form check<br><br>Keep your torso comfortably upright.');
  }
  if (position === 'top' && (metrics.elbowAngle < 130 || metrics.wrists.y > metrics.shoulders.y - 0.04)) {
    return formInvalid('Form check<br><br>Press your hands overhead and straighten your elbows.');
  }
  if (position === 'bottom' && formTopMetrics && formTopMetrics.elbowAngle - metrics.elbowAngle < 15) {
    return formInvalid('Form check<br><br>Lower your hands and bend your elbows toward shoulder height.');
  }
  return formValid();
}

function saveExperimentalCalibration(position) {
  if (!usesExperimentalFormTracking() || !formCurrentMetrics) { return; }
  if (position === 'top') { formTopMetrics = formCurrentMetrics; }
  else { formBottomMetrics = formCurrentMetrics; }
}

function formExpected(topValue, bottomValue, norm) {
  return bottomValue + (topValue - bottomValue) * norm;
}

function formMetricMatches(value, topValue, bottomValue, norm, tolerance) {
  if (value === null || topValue === null || bottomValue === null) { return false; }
  return Math.abs(value - formExpected(topValue, bottomValue, norm)) <= tolerance;
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
    if (!formTorsoIsUpright(metrics) || metrics.kneeAngle === null) {
      return formInvalid('Form check<br><br>Keep your chest raised and your legs visible.');
    }
    if (!formMetricMatches(metrics.kneeAngle, formTopMetrics.kneeAngle, formBottomMetrics.kneeAngle, norm, 50)) {
      return formInvalid('Form check<br><br>Bend your knees with the movement, not only your waist.');
    }
    return formValid();
  }

  if (CONFIG.exercise === 'pullups') {
    if (!metrics.wrists) {
      return formFatal('Bar released<br><br>Your run is ending.', 'pullup-bar');
    }
    if (!metrics.feet || metrics.elbowAngle === null) {
      return formInvalid('Form check<br><br>Keep your arms and at least one foot visible.');
    }
    var wristAnchor = {
      x: (formTopMetrics.wrists.x + formBottomMetrics.wrists.x) / 2,
      y: (formTopMetrics.wrists.y + formBottomMetrics.wrists.y) / 2
    };
    if (formDistance(metrics.wrists, wristAnchor) > 0.075) {
      return formFatal('Bar released<br><br>Your run is ending.', 'pullup-bar');
    }
    if (pullupFloorY === null || metrics.feet.y > pullupFloorY - pullupFloorClearance * 0.8) {
      return formFatal('Feet touched the floor<br><br>Your run is ending.', 'pullup-feet');
    }
    if (!formMetricMatches(metrics.elbowAngle, formTopMetrics.elbowAngle, formBottomMetrics.elbowAngle, norm, 55)) {
      return formInvalid('Form check<br><br>Let your elbows bend and straighten with your body.');
    }
    return formValid();
  }

  if (CONFIG.exercise === 'biceps') {
    if (!formTorsoIsUpright(metrics) || !metrics.elbows || metrics.elbowAngle === null) {
      return formInvalid('Form check<br><br>Keep your torso and elbows visible.');
    }
    if (!formMetricMatches(metrics.elbowAngle, formTopMetrics.elbowAngle, formBottomMetrics.elbowAngle, norm, 55)) {
      return formInvalid('Form check<br><br>Curl by bending your elbows, not lifting your whole arms.');
    }
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
    if (metrics.elbowAngle === null || metrics.abductionAngle === null || metrics.elbowAngle < 105) {
      return formInvalid('Form check<br><br>Keep both arms visible and comfortably straight.');
    }
    if (!formMetricMatches(metrics.abductionAngle, formTopMetrics.abductionAngle, formBottomMetrics.abductionAngle, norm, 50)) {
      return formInvalid('Form check<br><br>Raise your arms outward from your shoulders.');
    }
    return formValid();
  }

  if (!formTorsoIsUpright(metrics) || metrics.elbowAngle === null) {
    return formInvalid('Form check<br><br>Keep your torso, elbows, and hands visible.');
  }
  if (!formMetricMatches(metrics.elbowAngle, formTopMetrics.elbowAngle, formBottomMetrics.elbowAngle, norm, 55)) {
    return formInvalid('Form check<br><br>Press by bending and straightening your elbows.');
  }
  return formValid();
}
`;
