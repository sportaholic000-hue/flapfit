// Explicit, camera-session floor reference for pull-ups. Pose coordinates are
// estimates, so this verifies visible contact near the demonstrated setup area;
// it does not measure weight bearing or reconstruct a floor plane in 3D.
export const SCRIPT_PULLUP_SUPPORT = `
var pullupFloorReference = null;
var pullupFloorSetupMode = 'pending';
var pullupFloorSetupSamples = [];
var pullupFloorCroppedSince = null;
var pullupFloorLastPoseAt = null;
var pullupFloorSetupProgress = 0;
var pullupFloorFeetSeenDuringSetup = false;
var pullupFloorSoleVisibleSince = null;
var pullupFloorSoleVisibleFrames = 0;
var pullupFloorContact = { left: null, right: null };
var pullupFloorRunContactLatch = false;
var pullupFloorStreamUnverified = false;
var pullupFloorFreshRecoveryFrames = 0;
var PULLUP_FLOOR_SETUP_MS = 750;
var PULLUP_FLOOR_CROPPED_SETUP_MS = 1200;
var PULLUP_FLOOR_MAX_GAP_MS = 700;

function resetPullupSupportReference() {
  pullupFloorReference = null;
  pullupFloorSetupMode = 'pending';
  pullupFloorSetupSamples = [];
  pullupFloorCroppedSince = null;
  pullupFloorLastPoseAt = null;
  pullupFloorSetupProgress = 0;
  pullupFloorFeetSeenDuringSetup = false;
  pullupFloorSoleVisibleSince = null;
  pullupFloorSoleVisibleFrames = 0;
  pullupFloorStreamUnverified = false;
  pullupFloorFreshRecoveryFrames = 0;
  pullupFloorContact = { left: null, right: null };
  resetPullupSupportRun();
}

function resetPullupSupportRun() {
  // Bottom acceptance starts the countdown in the same camera session. Keep
  // the current classification and observed duration across that boundary.
  // A retry remounts the WebView and performs the full reference reset above.
  pullupFloorRunContactLatch = false;
}

function pullupFloorMedian(values) {
  var sorted = values.slice().sort(function(a, b) { return a - b; });
  var middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function pullupFloorNewContact() {
  return { samples: [], confirmed: false, airSince: null, missingSince: null,
    lastContactAt: null, current: 'unknown', contactMs: 0 };
}

function pullupFloorSetupStanding(metrics) {
  if (!metrics || !metrics.shoulders || !metrics.hips || !metrics.eyes ||
      !metrics.leftWrist || !metrics.rightWrist ||
      !metrics.leftHeel || !metrics.rightHeel || !metrics.leftToe || !metrics.rightToe ||
      metrics.leftKneeAngle === null || metrics.rightKneeAngle === null) { return false; }
  return metrics.leftKneeAngle >= 145 && metrics.rightKneeAngle >= 145 &&
    metrics.hips.y > metrics.shoulders.y + 0.05 &&
    // Capture the demonstrated floor while reaching for or holding the bar.
    // Posture alone does not prove weight bearing; setup explicitly asks for planted feet.
    metrics.leftWrist.y < metrics.shoulders.y - 0.04 &&
    metrics.rightWrist.y < metrics.shoulders.y - 0.04 &&
    metrics.eyes.y >= (metrics.leftWrist.y + metrics.rightWrist.y) / 2 + 0.025 &&
    Math.min(metrics.leftHeel.y, metrics.rightHeel.y, metrics.leftToe.y, metrics.rightToe.y) > metrics.hips.y + 0.08;
}

function pullupFloorSetupCropped(metrics) {
  if (pullupFloorFeetSeenDuringSetup || !metrics || !metrics.shoulders || !metrics.leftWrist || !metrics.rightWrist ||
      metrics.elbowCount !== 2) { return false; }
  // The low-confidence mean foot is useful ONLY to avoid silently skipping
  // setup while feet are present. It never establishes physical floor contact.
  var anyFoot = metrics.leftFoot || metrics.rightFoot || metrics.leftAnkle || metrics.rightAnkle ||
    metrics.leftHeel || metrics.rightHeel || metrics.leftToe || metrics.rightToe;
  return !anyFoot && metrics.leftWrist.y < metrics.shoulders.y - 0.04 &&
    metrics.rightWrist.y < metrics.shoulders.y - 0.04;
}

function updatePullupFloorSetup(metrics, now) {
  if (pullupFloorSetupMode !== 'pending') { return; }
  if (metrics && (metrics.leftHeel || metrics.rightHeel || metrics.leftToe || metrics.rightToe)) {
    if (pullupFloorSoleVisibleSince === null) { pullupFloorSoleVisibleSince = now; }
    pullupFloorSoleVisibleFrames += 1;
    if (now - pullupFloorSoleVisibleSince >= 300 && pullupFloorSoleVisibleFrames >= 3) {
      pullupFloorFeetSeenDuringSetup = true;
    }
  } else {
    pullupFloorSoleVisibleSince = null;
    pullupFloorSoleVisibleFrames = 0;
  }
  if (pullupFloorSetupCropped(metrics)) {
    pullupFloorSetupSamples = [];
    if (pullupFloorCroppedSince === null) { pullupFloorCroppedSince = now; }
    pullupFloorSetupProgress = Math.min(1, (now - pullupFloorCroppedSince) / PULLUP_FLOOR_CROPPED_SETUP_MS);
    if (now - pullupFloorCroppedSince >= PULLUP_FLOOR_CROPPED_SETUP_MS) {
      pullupFloorSetupMode = 'unverified';
    }
    return;
  }
  pullupFloorCroppedSince = null;
  if (!pullupFloorSetupStanding(metrics)) {
    pullupFloorSetupSamples = [];
    pullupFloorSetupProgress = 0;
    return;
  }
  var keys = ['leftHeel', 'leftToe', 'rightHeel', 'rightToe'];
  var sample = { t: now, torso: formDistance(metrics.shoulders, metrics.hips), shoulder: metrics.shoulders.y };
  keys.forEach(function(key) { sample[key] = { x: metrics[key].x, y: metrics[key].y }; });
  pullupFloorSetupSamples.push(sample);
  // Keep enough fresh observations to finish setup on slower cameras. At two
  // poses per second, five samples span two seconds; a one-second-only window
  // could never satisfy the minimum sample count.
  while (pullupFloorSetupSamples.length > 5 && now - pullupFloorSetupSamples[0].t > 1000) {
    pullupFloorSetupSamples.shift();
  }
  var first = pullupFloorSetupSamples[0];
  var torso = pullupFloorMedian(pullupFloorSetupSamples.map(function(s) { return s.torso; }));
  var tolerance = Math.max(0.006, Math.min(0.015, torso * 0.04));
  var stable = keys.every(function(key) {
    var xs = pullupFloorSetupSamples.map(function(s) { return s[key].x; });
    var ys = pullupFloorSetupSamples.map(function(s) { return s[key].y; });
    return Math.max.apply(null, xs) - Math.min.apply(null, xs) <= tolerance * 2 &&
      Math.max.apply(null, ys) - Math.min.apply(null, ys) <= tolerance;
  });
  var shoulders = pullupFloorSetupSamples.map(function(s) { return s.shoulder; });
  stable = stable && Math.max.apply(null, shoulders) - Math.min.apply(null, shoulders) <= tolerance * 2;
  if (!stable) {
    pullupFloorSetupSamples = [sample];
    pullupFloorSetupProgress = 0;
    return;
  }
  pullupFloorSetupProgress = Math.min(1, (now - first.t) / PULLUP_FLOOR_SETUP_MS);
  if (now - first.t < PULLUP_FLOOR_SETUP_MS || pullupFloorSetupSamples.length < 5) { return; }
  pullupFloorReference = {
    points: {}, torso: torso,
    tolerance: Math.max(0.003, Math.min(0.007, torso * 0.02)),
    clearance: Math.max(0.006, Math.min(0.015, torso * 0.045))
  };
  keys.forEach(function(key) {
    pullupFloorReference.points[key] = {
      x: pullupFloorMedian(pullupFloorSetupSamples.map(function(s) { return s[key].x; })),
      y: pullupFloorMedian(pullupFloorSetupSamples.map(function(s) { return s[key].y; }))
    };
  });
  pullupFloorSetupMode = 'floor';
  pullupFloorSetupProgress = 1;
  pullupFloorSetupSamples = [];
  pullupFloorContact = { left: pullupFloorNewContact(), right: pullupFloorNewContact() };
}

function updatePullupFloorContact(side, metrics, now, elapsed) {
  var contact = pullupFloorContact[side];
  var previousKind = contact.current;
  var points = [side + 'Heel', side + 'Toe'];
  var observed = points.filter(function(key) { return metrics && metrics[key]; });
  var kind = 'unknown';
  if (observed.some(function(key) {
    return metrics[key].y >= pullupFloorReference.points[key].y - pullupFloorReference.tolerance;
  })) {
    kind = 'contact';
  } else if (observed.length === points.length && observed.every(function(key) {
    return metrics[key].y < pullupFloorReference.points[key].y - pullupFloorReference.clearance;
  })) {
    kind = 'air';
  }
  contact.current = kind;
  if (kind === 'unknown') {
    if (contact.missingSince === null) { contact.missingSince = now; }
    // Missing or ambiguous sole evidence cannot demonstrate takeoff. Keep
    // confirmed contact until both sole landmarks show actual clearance.
    contact.airSince = null;
  } else {
    contact.missingSince = null;
  }
  if (kind === 'contact') {
    contact.airSince = null;
    contact.lastContactAt = now;
  } else if (kind === 'air') {
    if (contact.airSince === null) { contact.airSince = now; }
    if (now - contact.airSince >= 200) {
      contact.confirmed = false;
      contact.samples = [];
    }
  }
  // Fresh observations contribute time, not render-frame counts. A short bad
  // estimate does not erase the preceding contact evidence. A real stream gap
  // is handled by updatePullupSupportReference and cannot count toward a hold.
  contact.samples.push({ t: now,
    ms: kind === 'contact' && previousKind === 'contact' ? Math.max(0, elapsed) : 0,
    kind: kind });
  while (contact.samples.length && now - contact.samples[0].t > 1200) { contact.samples.shift(); }
  contact.contactMs = contact.samples.reduce(function(total, s) { return total + (s.kind === 'contact' ? s.ms : 0); }, 0);
  if (contact.contactMs >= 350 && contact.lastContactAt !== null && now - contact.lastContactAt <= 200) {
    contact.confirmed = true;
  }
}

function updatePullupSupportReference(metrics, now) {
  if (pullupFloorLastPoseAt !== null && now <= pullupFloorLastPoseAt) { return; }
  var elapsed = pullupFloorLastPoseAt === null ? 0 : now - pullupFloorLastPoseAt;
  if (elapsed > PULLUP_FLOOR_MAX_GAP_MS) {
    pullupFloorSetupSamples = [];
    pullupFloorCroppedSince = null;
    pullupFloorSoleVisibleSince = null;
    pullupFloorSoleVisibleFrames = 0;
    pullupFloorSetupProgress = pullupFloorSetupMode === 'pending' ? 0 : 1;
    if (pullupFloorSetupMode === 'floor') {
      var previousFloorContact = pullupFloorContact;
      pullupFloorContact = { left: pullupFloorNewContact(), right: pullupFloorNewContact() };
      ['left', 'right'].forEach(function(side) {
        // A gap discards pending duration, but is not evidence that a foot
        // previously observed on the floor has since lifted off it.
        pullupFloorContact[side].confirmed = !!(previousFloorContact[side] && previousFloorContact[side].confirmed);
      });
      pullupFloorStreamUnverified = true;
      pullupFloorFreshRecoveryFrames = 0;
    }
    elapsed = 0;
  } else if (pullupFloorSetupMode === 'floor' && pullupFloorStreamUnverified) {
    pullupFloorFreshRecoveryFrames += 1;
    if (pullupFloorFreshRecoveryFrames >= 2) { pullupFloorStreamUnverified = false; }
  }
  pullupFloorLastPoseAt = now;
  updatePullupFloorSetup(metrics, now);
  if (pullupFloorSetupMode === 'floor') {
    updatePullupFloorContact('left', metrics, now, elapsed);
    updatePullupFloorContact('right', metrics, now, elapsed);
  }
}

function getPullupSupportSetup() {
  return {
    ready: pullupFloorSetupMode !== 'pending',
    progress: pullupFloorSetupProgress,
    mode: pullupFloorSetupMode,
    message: pullupFloorSetupMode === 'unverified'
      ? 'Feet are outside the camera view. Floor contact cannot be checked.'
      : pullupFloorSetupMode === 'floor' ? 'Lift your feet, or jump to grab the bar, and settle into a hang.'
      : 'Before step 1: Grab the bar with both feet flat on the floor. Bar too high? Reach both hands up first, then jump after setup. Keep both feet visible and hold still.'
  };
}

function pullupFloorHasContactEvidence() {
  return pullupFloorSetupMode === 'floor' && ['left', 'right'].some(function(side) {
    return pullupFloorContact[side].confirmed || pullupFloorContact[side].current === 'contact';
  });
}

function pullupFloorSupportCheck() {
  if (pullupFloorSetupMode === 'pending') { return formInvalid(getPullupSupportSetup().message); }
  if (pullupFloorSetupMode === 'floor' && pullupFloorStreamUnverified) {
    return formInvalid('Camera tracking is interrupted. Keep your body visible.');
  }
  if (pullupFloorHasContactEvidence()) {
    return formInvalid('Keep both feet off the floor<br><br>Keep both hands on the bar.');
  }
  if (pullupFloorSetupMode === 'floor' && ['left', 'right'].some(function(side) {
    return pullupFloorContact[side].current !== 'air';
  })) {
    return formInvalid('Keep both feet clearly visible so floor clearance can be checked.');
  }
  return formValid();
}

function pullupFloorCalibrationCheck() {
  return pullupFloorSupportCheck();
}

function pullupFloorGameplayCheck() {
  if (pullupFloorSetupMode === 'floor' && ['left', 'right'].some(function(side) { return pullupFloorContact[side].confirmed; })) {
    pullupFloorRunContactLatch = true;
  }
  if (pullupFloorRunContactLatch) {
    var result = formFatal('Keep your feet off the floor.', 'pullup-feet');
    // Camera evidence has already passed its confirmation window. The game
    // must not add a second generic fatal hold before starting the normal fall.
    result.contactConfirmed = true;
    return result;
  }
  return pullupFloorSupportCheck();
}

function pullupSupportDebug() {
  function contactSnapshot(contact) {
    return contact ? {
      current: contact.current, confirmed: contact.confirmed,
      contactMs: contact.contactMs, lastContactAt: contact.lastContactAt
    } : null;
  }
  return {
    mode: pullupFloorSetupMode,
    runContact: pullupFloorRunContactLatch,
    streamUnverified: pullupFloorStreamUnverified,
    floor: pullupFloorReference,
    left: contactSnapshot(pullupFloorContact.left),
    right: contactSnapshot(pullupFloorContact.right),
    lastPoseAt: pullupFloorLastPoseAt
  };
}
`;
