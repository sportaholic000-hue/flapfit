// The tiptoe reach supplies body scale, elbow/hip clearance and a visible toe-floor reference.
// Missing feet are unknown, never evidence of contact or a reason to block play.
export const SCRIPT_PULLUP_SUPPORT = `
var pullupFloorReference = null;
var pullupReachReference = null;
var pullupFloorSetupMode = 'pending';
var pullupFloorSetupSamples = [];
var pullupFloorLastPoseAt = null;
var pullupFloorSetupProgress = 0;
var pullupFloorContact = { left: null, right: null };
var pullupFloorRunContactLatch = false;
var pullupFloorStreamUnverified = false;
var pullupFloorFreshRecoveryFrames = 0;
var PULLUP_FLOOR_SETUP_MS = 750;
var PULLUP_FLOOR_MAX_GAP_MS = 700;

function resetPullupSupportReference() {
  pullupClearanceProfile = null;
  resetPullupBodyContact();
  pullupFloorReference = null;
  pullupReachReference = null;
  pullupFloorSetupMode = 'pending';
  pullupFloorSetupSamples = [];
  pullupFloorLastPoseAt = null;
  pullupFloorSetupProgress = 0;
  pullupFloorContact = { left: null, right: null };
  pullupFloorStreamUnverified = false;
  pullupFloorFreshRecoveryFrames = 0;
  resetPullupSupportRun();
}

function resetPullupSupportRun() { pullupFloorRunContactLatch = false; resetPullupBodyContact(); }

function pullupFloorMedian(values) {
  var sorted = values.slice().sort(function(a,b) { return a-b; });
  var middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle-1] + sorted[middle]) / 2;
}

function pullupFloorNewContact() {
  return { samples: [], confirmed: false, airSince: null, lastContactAt: null,
    current: 'unknown', contactMs: 0 };
}

function pullupReachPose(metrics) {
  if (!metrics || !metrics.shoulders || !metrics.hips ||
      !metrics.leftShoulder || !metrics.rightShoulder ||
      !metrics.leftElbow || !metrics.rightElbow) { return false; }
  if (metrics.hips.y - metrics.shoulders.y < 0.05 ||
      Math.abs(metrics.hips.x - metrics.shoulders.x) >
        (metrics.hips.y - metrics.shoulders.y) * 0.6) { return false; }
  return ['left', 'right'].every(function(side) {
    var shoulder = metrics[side + 'Shoulder'];
    var elbow = metrics[side + 'Elbow'];
    var length = formDistance(shoulder, elbow);
    var angle = metrics[side + 'ElbowAngle'];
    // The elbows must point up. Hands may leave the image while reaching.
    return length > 0.025 && (shoulder.y - elbow.y) / length >= 0.7 &&
      (!Number.isFinite(angle) || angle >= 150);
  });
}

function pullupFloorSetupStanding(metrics) {
  return pullupReachPose(metrics) && metrics.leftHeel && metrics.rightHeel &&
    metrics.leftToe && metrics.rightToe &&
    (metrics.leftKneeAngle === null || metrics.leftKneeAngle >= 145) &&
    (metrics.rightKneeAngle === null || metrics.rightKneeAngle >= 145);
}

function updatePullupFloorSetup(metrics, now) {
  if (pullupFloorSetupMode !== 'pending') { return; }
  if (!pullupReachPose(metrics) ||
      (metrics.leftKneeAngle !== null && metrics.leftKneeAngle < 145) ||
      (metrics.rightKneeAngle !== null && metrics.rightKneeAngle < 145)) {
    pullupFloorSetupSamples = [];
    pullupFloorSetupProgress = 0;
    return;
  }
  pullupFloorSetupSamples.push({ t: now, m: metrics });
  while (pullupFloorSetupSamples.length > 5 && now - pullupFloorSetupSamples[0].t > 1000) {
    pullupFloorSetupSamples.shift();
  }
  var samples = pullupFloorSetupSamples;
  var first = samples[0];
  var median = function(read) { return pullupFloorMedian(samples.map(function(s) { return read(s.m); })); };
  var torso = median(function(m) { return formDistance(m.shoulders, m.hips); });
  var tolerance = Math.max(0.006, Math.min(0.015, torso * 0.04));
  var stable = ['leftShoulder', 'rightShoulder', 'hips'].every(function(key) {
    var ys = samples.map(function(s) { return s.m[key].y; });
    return Math.max.apply(null, ys) - Math.min.apply(null, ys) <= tolerance * 2;
  });
  var floorPoints = {};
  ['leftHeel', 'leftToe', 'rightHeel', 'rightToe'].forEach(function(key) {
    var points = samples.map(function(s) { return s.m[key]; }).filter(Boolean);
    if (points.length < Math.ceil(samples.length * 0.8)) { return; }
    var ys = points.map(function(p) { return p.y; });
    var xs = points.map(function(p) { return p.x; });
    if (Math.max.apply(null, ys) - Math.min.apply(null, ys) > tolerance ||
        Math.max.apply(null, xs) - Math.min.apply(null, xs) > tolerance * 2) { stable = false; }
    floorPoints[key] = { x: pullupFloorMedian(xs), y: pullupFloorMedian(ys) };
    if (points.every(function(p) { return Number.isFinite(p.z); })) {
      floorPoints[key].z = pullupFloorMedian(points.map(function(p) { return p.z; }));
    }
  });
  if (!stable) {
    pullupFloorSetupSamples = [samples[samples.length - 1]];
    pullupFloorSetupProgress = 0;
    return;
  }
  pullupFloorSetupProgress = Math.min(1, (now - first.t) / PULLUP_FLOOR_SETUP_MS);
  if (now - first.t < PULLUP_FLOOR_SETUP_MS || samples.length < 5) { return; }
  var reachPose = {};
  ['leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist',
    'leftHip','rightHip','leftKnee','rightKnee','leftAnkle','rightAnkle'].forEach(function(key) {
    var points = samples.map(function(s) { return s.m[key]; }).filter(Boolean);
    if (points.length >= Math.ceil(samples.length * 0.8)) {
      reachPose[key] = {x:pullupFloorMedian(points.map(function(p) { return p.x; })),
        y:pullupFloorMedian(points.map(function(p) { return p.y; }))};
      if (points.every(function(p) { return Number.isFinite(p.z); })) {
        reachPose[key].z = pullupFloorMedian(points.map(function(p) { return p.z; }));
      }
    }
  });
  pullupReachReference = {
    pose: reachPose,
    torso: torso,
    shoulderY: median(function(m) { return m.shoulders.y; }),
    leftShoulderY: median(function(m) { return m.leftShoulder.y; }),
    rightShoulderY: median(function(m) { return m.rightShoulder.y; }),
    hipY: median(function(m) { return m.hips.y; }),
    elbowY: median(function(m) { return (m.leftElbow.y + m.rightElbow.y) / 2; }),
    observedFrom: first.t, observedAt: now
  };
  // During the tiptoe reach heels are raised. Only a visible toe establishes
  // the floor for that side; a heel-only observation must not invent a floor.
  ['left','right'].forEach(function(side) {
    var toe = floorPoints[side + 'Toe'];
    if (toe && floorPoints[side + 'Heel']) { floorPoints[side + 'Heel'].y = toe.y; }
    if (!toe) { delete floorPoints[side + 'Heel']; }
  });
  // Only actually observed sole points can establish a contact reference.
  // Feet hidden during setup do not get an invented floor height.
  if (Object.keys(floorPoints).length) {
    pullupFloorReference = { points: floorPoints, torso: torso,
      tolerance: Math.max(0.003, Math.min(0.007, torso * 0.02)),
      clearance: Math.max(0.006, Math.min(0.015, torso * 0.045)),
      observedFrom: first.t, observedAt: now };
    pullupFloorSetupMode = 'floor';
    pullupFloorContact = { left: pullupFloorNewContact(), right: pullupFloorNewContact() };
  } else { pullupFloorSetupMode = 'unverified'; }
  pullupFloorSetupProgress = 1;
  pullupFloorSetupSamples = [];
}

function pullupStandingBodyRiseValid(metrics) {
  var r = pullupReachReference;
  if (!r || !metrics || !metrics.shoulders || !metrics.hips ||
      !metrics.leftShoulder || !metrics.rightShoulder) { return false; }
  // Reject a small tiptoe/shoulder lift. Both the torso and hips must rise from
  // the standing reach, using body size rather than a fixed image distance.
  var rise = Math.max(0.012, r.torso * 0.25);
  return r.shoulderY - metrics.shoulders.y >= rise * 0.5 && r.hipY - metrics.hips.y >= rise &&
    r.leftShoulderY - metrics.leftShoulder.y >= rise * 0.5 &&
    r.rightShoulderY - metrics.rightShoulder.y >= rise * 0.5;
}

function pullupMinimumCalibrationRange() {
  return pullupReachReference ? Math.max(0.01, pullupReachReference.torso * 0.18) : 0.06;
}

// A landmark centre inside the image does not establish that the whole foot
// is visible. Reserve half an observed foot length plus three source pixels
// around its points; use the same rule for sole contact and standing inference.
function pullupFootContactObservable(side, metrics) {
  if (!metrics) { return false; }
  var ankle = metrics[side + 'Ankle'], toe = metrics[side + 'Toe'];
  if (!ankle || !toe) { return false; }
  var width = typeof video !== 'undefined' && video.videoWidth > 0 ? video.videoWidth : 480;
  var height = typeof video !== 'undefined' && video.videoHeight > 0 ? video.videoHeight : 640;
  var points = [ankle, toe, metrics[side + 'Heel']].filter(Boolean);
  if (!points.every(function(point) {
    return Number.isFinite(point.x) && Number.isFinite(point.y) &&
      point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
  })) { return false; }
  var floor = pullupFloorReference && pullupFloorReference.points[side + 'Toe'];
  // A visible toe at its demonstrated standing footprint remains evidence,
  // even near the edge or with the heel raised. Do not erase calf-raise checks.
  if (floor && Math.abs(toe.y - floor.y) <= pullupFloorReference.clearance &&
      Math.abs(toe.x - floor.x) <= Math.max(0.02, pullupFloorReference.torso * 0.25)) { return true; }
  // Near an edge, a returned foot can still be observed in its measured setup
  // footprint. Compare BOTH ankle and toe with that footprint; the ankle-to-toe
  // margin alone wrongly crops visible toes when the heel lowers from tiptoes.
  var reachAnkle = pullupReachReference && pullupReachReference.pose[side + 'Ankle'];
  if (floor && reachAnkle) {
    var footprint = Math.hypot((reachAnkle.x - floor.x) * width / height, reachAnkle.y - floor.y);
    var returnMargin = footprint * 0.5;
    var lateralMargin = Math.max(0.02, pullupFloorReference.torso * 0.25);
    if (Math.abs(toe.y - floor.y) <= returnMargin &&
        Math.abs(ankle.y - reachAnkle.y) <= returnMargin &&
        Math.abs(toe.x - floor.x) <= lateralMargin &&
        Math.abs(ankle.x - reachAnkle.x) <= lateralMargin) { return true; }
  }
  var marginY = Math.hypot((ankle.x - toe.x) * width / height, ankle.y - toe.y) * 0.5 + 3 / height;
  var marginX = marginY * height / width;
  return points.every(function(point) {
    return Number.isFinite(point.x) && Number.isFinite(point.y) &&
      point.x > marginX && point.x < 1 - marginX &&
      point.y > marginY && point.y < 1 - marginY;
  });
}

function updatePullupFloorContact(side, metrics, now, elapsed) {
  var contact = pullupFloorContact[side];
  var previous = contact.current;
  contact.observable = pullupFootContactObservable(side, metrics);
  if (!contact.observable) {
    contact.current = 'unknown'; contact.rawCurrent = 'unknown'; contact.airborneEvidence = null;
    contact.airSince = null;
    if (contact.unobservableSince == null) { contact.unobservableSince = now; }
    // Keep isolated camera dropouts from erasing real observations, but discard
    // stale evidence when a foot leaves view. Re-entry needs fresh contact.
    if (now - contact.unobservableSince >= 200) {
      contact.confirmed = false; contact.samples = []; contact.contactMs = 0;
      contact.lastContactAt = null;
    }
    return;
  }
  contact.unobservableSince = null;
  var observed = [side + 'Heel', side + 'Toe'].filter(function(key) {
    return metrics && metrics[key] && pullupFloorReference.points[key];
  });
  var touching = observed.some(function(key) {
    return metrics[key].y >= pullupFloorReference.points[key].y - pullupFloorReference.tolerance;
  });
  var clear = observed.length && observed.every(function(key) {
    return metrics[key].y < pullupFloorReference.points[key].y - pullupFloorReference.clearance;
  });
  contact.rawCurrent = touching ? 'contact' : clear ? 'air' : 'unknown';
  contact.airborneEvidence = pullupFootAirborneEvidence(side, metrics);
  if (contact.airborneEvidence) {
    // Discard contradicted evidence here, before calibration, the run latch,
    // or the generic tracking timer can act on a false floor-line crossing.
    contact.current = 'air'; contact.confirmed = false; contact.samples = [];
    contact.contactMs = 0; contact.lastContactAt = null; contact.airSince = now;
    return;
  }
  contact.current = contact.rawCurrent;
  if (touching) { contact.airSince = null; contact.lastContactAt = now; }
  else if (clear) {
    if (contact.airSince === null) { contact.airSince = now; }
    if (now - contact.airSince >= 200) { contact.confirmed = false; contact.samples = []; }
  } else { contact.airSince = null; }
  contact.samples.push({t: now, ms: touching && previous === 'contact' ? Math.max(0, elapsed) : 0});
  while (contact.samples.length && now - contact.samples[0].t > 1200) { contact.samples.shift(); }
  contact.contactMs = contact.samples.reduce(function(sum,s) { return sum + s.ms; }, 0);
  if (!touching && (contact.lastContactAt === null || now - contact.lastContactAt > 1200)) {
    contact.confirmed = false;
  }
  if (touching && contact.contactMs >= 350) { contact.confirmed = true; }
}

function updatePullupSupportReference(metrics, now) {
  if (pullupFloorLastPoseAt !== null && now <= pullupFloorLastPoseAt) { return; }
  var elapsed = pullupFloorLastPoseAt === null ? 0 : now - pullupFloorLastPoseAt;
  if (elapsed > PULLUP_FLOOR_MAX_GAP_MS) {
    pullupFloorSetupSamples = [];
    pullupFloorSetupProgress = pullupFloorSetupMode === 'pending' ? 0 : 1;
    if (pullupFloorSetupMode === 'floor') {
      pullupFloorContact = { left: pullupFloorNewContact(), right: pullupFloorNewContact() };
    }
    resetPullupBodyContact();
    elapsed = 0;
    pullupFloorStreamUnverified = true;
    pullupFloorFreshRecoveryFrames = 0;
  } else if (pullupFloorStreamUnverified) {
    pullupFloorFreshRecoveryFrames += 1;
    if (pullupFloorFreshRecoveryFrames >= 2) { pullupFloorStreamUnverified = false; }
  }
  pullupFloorLastPoseAt = now;
  updatePullupFloorSetup(metrics, now);
  if (pullupFloorSetupMode === 'floor') {
    updatePullupFloorContact('left', metrics, now, elapsed);
    updatePullupFloorContact('right', metrics, now, elapsed);
    updatePullupBodyContact(metrics, elapsed);
  }
}

function getPullupSupportSetup() {
  return { ready: pullupFloorSetupMode !== 'pending', progress: pullupFloorSetupProgress,
    mode: pullupFloorSetupMode,
    message: pullupFloorSetupMode === 'pending'
      ? 'SETUP<br><br>Stand on tiptoes. Reach as high as you can.<br>Do not grab the bar yet.'
      : 'Now grab the bar and pull your eyes to it.' };
}

function pullupFloorHasContactEvidence(confirmedOnly) {
  return pullupFloorSetupMode === 'floor' && ['left','right'].some(function(side) {
    return pullupFloorContact[side].current === 'contact' &&
      (!confirmedOnly || pullupFloorContact[side].confirmed);
  });
}

function pullupFloorSupportCheck(confirmedOnly) {
  if (pullupFloorSetupMode === 'pending') { return formInvalid(getPullupSupportSetup().message); }
  // A missing whole-camera stream is separate from feet simply being cropped.
  if (pullupFloorStreamUnverified) { return formInvalid('Camera tracking is interrupted.'); }
  if (pullupFloorHasContactEvidence(confirmedOnly)) { return formInvalid('Keep both feet off the floor.'); }
  return formValid();
}

function pullupFloorCalibrationCheck(metrics, position) {
  // The second hold uses the same sustained contact evidence as gameplay.
  // A single uncertain floor pixel must not reset an otherwise stable hang.
  var result = pullupFloorSupportCheck(position === 'bottom');
  if (!result.valid || position !== 'bottom' || !metrics) { return result; }
  var profile = buildPullupClearanceProfile(formTopMetrics, metrics);
  return profile && pullupBodySupportEvidence(metrics, profile) === 'low-bar-supported-stance'
    ? formInvalid('Keep both feet off the floor.') : result;
}

function pullupFloorGameplayCheck() {
  if (pullupFloorSetupMode === 'floor' && ['left','right'].some(function(side) {
    return pullupFloorContact[side].current === 'contact' && pullupFloorContact[side].confirmed;
  }) || (pullupBodyContact.current && pullupBodyContact.confirmed)) { pullupFloorRunContactLatch = true; }
  if (pullupFloorRunContactLatch) {
    var result = formFatal('Keep your feet off the floor.', 'pullup-feet');
    result.contactConfirmed = true;
    return result;
  }
  return pullupFloorSupportCheck();
}

function pullupSupportDebug() {
  function snapshot(c) { return c ? {current:c.current,confirmed:c.confirmed,
    contactMs:c.contactMs,lastContactAt:c.lastContactAt,
    rawCurrent:c.rawCurrent,airborneEvidence:c.airborneEvidence,observable:c.observable} : null; }
  return {mode:pullupFloorSetupMode,runContact:pullupFloorRunContactLatch,
    streamUnverified:pullupFloorStreamUnverified,
    floor:pullupFloorReference,reach:pullupReachReference,
    clearance:pullupClearanceProfile,bodyContact:Object.assign({},pullupBodyContact),
    left:snapshot(pullupFloorContact.left),right:snapshot(pullupFloorContact.right),
    lastPoseAt:pullupFloorLastPoseAt};
}
// All coordinates share the fixed camera image: larger y means lower.
// This supplements visible sole contact only on a measured low bar.
var pullupClearanceProfile = null;
var pullupBodyContact = { current: false, ms: 0, confirmed: false, reason: 'uncalibrated' };

function resetPullupBodyContact() {
  pullupBodyContact = { current: false, ms: 0, confirmed: false, reason: 'no-evidence' };
}

function pullupPointLength(a, b) {
  var aspect = typeof video !== 'undefined' && video.videoWidth > 0 && video.videoHeight > 0
    ? video.videoWidth / video.videoHeight : 1;
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

function buildPullupClearanceProfile(top, bottom) {
  var reach = pullupReachReference;
  if (!reach || !reach.pose || !top || !bottom || !top.hips || !bottom.hips) { return null; }
  var sides = {};
  ['left', 'right'].forEach(function(side) {
    var re = reach.pose[side + 'Elbow'], rw = reach.pose[side + 'Wrist'];
    var te = top[side + 'Elbow'], tw = top[side + 'Wrist'];
    var be = bottom[side + 'Elbow'], bw = bottom[side + 'Wrist'];
    if (!re || !te || !tw || !be || !bw) { return; }
    var forearm = (pullupPointLength(te, tw) + pullupPointLength(be, bw)) / 2;
    // Hands may be cropped during the reach. In that case the two held-bar
    // forearm observations supply the extension beyond the visible reach elbow.
    var reachWristY = rw ? rw.y : re.y - forearm;
    var barY = (tw.y + bw.y) / 2;
    var elbowDescent = be.y - re.y;
    var hipDescent = bottom.hips.y - reach.hipY;
    var reachDeficit = barY - reachWristY;
    var lowBar = reachDeficit > reach.torso * 0.12 &&
      elbowDescent > reach.torso * 0.12 && hipDescent > reach.torso * 0.08 &&
      pullupPointLength(tw, bw) < Math.max(0.035, reach.torso * 0.35);
    sides[side] = {
      reachElbowY: re.y, topElbowY: te.y, hangElbowY: be.y,
      reachWristY: reachWristY, reachWristEstimated: !rw, barY: barY,
      elbowDescent: elbowDescent, hipDescent: hipDescent, reachDeficit: reachDeficit,
      topElbowToWrist: te.y - tw.y, hangElbowToWrist: be.y - bw.y,
      wristX: (tw.x + bw.x) / 2, forearm: forearm, lowBar: lowBar
    };
  });
  return {
    reachHipY: reach.hipY, topHipY: top.hips.y, hangHipY: bottom.hips.y,
    torso: reach.torso, sides: sides,
    legs: {left:pullupCalibratedLegReach(reach, top, 'left'),
      right:pullupCalibratedLegReach(reach, top, 'right')},
    lowBar: !!(sides.left && sides.right && sides.left.lowBar && sides.right.lowBar)
  };
}

function savePullupClearanceProfile(top, bottom) {
  pullupClearanceProfile = buildPullupClearanceProfile(top, bottom);
  resetPullupBodyContact();
}

function pullupVisibleStraightLeg(m, side) {
  var hip = m[side + 'Hip'], knee = m[side + 'Knee'];
  var ankle = m[side + 'Ankle'], toe = m[side + 'Toe'];
  var angle = m[side + 'KneeAngle'];
  if (!hip || !knee || !ankle || !toe || !Number.isFinite(angle) || angle < 160 ||
      !pullupFootContactObservable(side, m)) { return false; }
  // A forward leg can look vertical in x/y. It cannot establish the standing
  // body inference; actual contact is still checked separately for each foot.
  if (pullupLegDepthClearance(m, side)) { return false; }
  var thigh = pullupPointLength(hip, knee), shin = pullupPointLength(knee, ankle);
  var leg = pullupPointLength(hip, ankle);
  return thigh > 0.025 && shin > 0.025 &&
    (knee.y - hip.y) / thigh >= 0.8 && (ankle.y - knee.y) / shin >= 0.8 &&
    (ankle.y - hip.y) / leg >= 0.92;
}

function pullupBodySupportEvidence(m, profile) {
  var p = profile || pullupClearanceProfile, r = pullupReachReference;
  if (!p || !p.lowBar || !pullupFloorReference) { return 'not-low-bar'; }
  if (!m || !m.hips || !m.shoulders || !m.leftShoulder || !m.rightShoulder) { return 'body-hidden'; }
  var scale = formDistance(m.shoulders, m.hips) / p.torso;
  if (scale < 0.65 || scale > 1.5) { return 'body-scale-changed'; }
  // The max tiptoe reach is an upper supported-hip bound, not a target the
  // player must exceed to complete a legitimate low-bar pull-up.
  if (m.hips.y < p.reachHipY - p.torso * 0.12 ||
      m.hips.y > p.hangHipY + p.torso * 0.25) { return 'hips-outside-supported-range'; }
  var armsMatch = ['left','right'].every(function(side) {
    var arm = p.sides[side], elbow = m[side + 'Elbow'], wrist = m[side + 'Wrist'];
    if (!elbow || !wrist) { return false; }
    var offset = elbow.y - wrist.y, slack = p.torso * 0.3;
    // Top and hang elbow heights can be almost identical. There is no required
    // elbow-height travel between them; compare against their observed envelope.
    return Math.abs(wrist.y - arm.barY) < Math.max(0.025, p.torso * 0.3) &&
      Math.abs(wrist.x - arm.wristX) < 0.075 &&
      offset >= Math.min(arm.topElbowToWrist, arm.hangElbowToWrist) - slack &&
      offset <= Math.max(arm.topElbowToWrist, arm.hangElbowToWrist) + slack &&
      elbow.y > arm.reachElbowY + p.torso * 0.06;
  });
  if (!armsMatch) { return 'grip-or-elbows-outside-reference'; }
  var supported = ['left','right'].some(function(side) {
    if (!pullupVisibleStraightLeg(m, side) || pullupFootAirborneEvidence(side, m, p)) { return false; }
    var toe = m[side + 'Toe'], floor = pullupFloorReference.points[side + 'Toe'];
    var hip = m[side + 'Hip'], ankle = m[side + 'Ankle'];
    var originalHip = r.pose[side + 'Hip'], originalAnkle = r.pose[side + 'Ankle'];
    if (!floor || !originalHip || !originalAnkle) { return false; }
    var lengthRatio = pullupPointLength(hip, ankle) / pullupPointLength(originalHip, originalAnkle);
    // Reject foreshortened/angled legs and clearly raised feet. The wider sole
    // tolerance is available ONLY with the measured low-bar/body evidence above.
    return lengthRatio >= 0.8 && lengthRatio <= 1.25 &&
      toe.y >= floor.y - p.torso * 0.2 && Math.abs(toe.x - floor.x) <= p.torso * 0.8;
  });
  return supported ? 'low-bar-supported-stance' : 'no-visible-supported-leg';
}

function updatePullupBodyContact(m, elapsed) {
  var reason = pullupBodySupportEvidence(m);
  var current = reason === 'low-bar-supported-stance';
  pullupBodyContact.ms = current && pullupBodyContact.current
    ? pullupBodyContact.ms + Math.max(0, elapsed) : 0;
  pullupBodyContact.current = current;
  pullupBodyContact.confirmed = current && pullupBodyContact.ms >= 600;
  pullupBodyContact.reason = reason;
}

function pullupTopSupportClear(m) {
  var r = pullupReachReference;
  if (!r || !m || !m.shoulders || !m.hips) { return false; }
  // Never demand that a low-bar top exceed the maximum tiptoe reach. Bent,
  // lifted legs are legitimate, and cropped feet do not block calibration.
  var visibleToes = ['left','right'].filter(function(side) { return pullupFootContactObservable(side, m); });
  if (!visibleToes.length) {
    // With the lower body cropped, do not mistake lowering the hands around a
    // stationary torso for the requested pull. Either upward OR downward body
    // displacement is allowed from the max reach; a low-bar top can be lower.
    return Math.abs(m.hips.y - r.hipY) >= r.torso * 0.08 ||
      Math.abs(m.shoulders.y - r.shoulderY) >= r.torso * 0.08;
  }
  if (pullupStandingBodyRiseValid(m)) { return true; }
  return visibleToes.every(function(side) {
    var toe = m[side + 'Toe'];
    var floor = pullupFloorReference && pullupFloorReference.points[side + 'Toe'];
    if (!floor) { return true; }
    var bent = Number.isFinite(m[side + 'KneeAngle']) && m[side + 'KneeAngle'] < 145;
    return toe.y < floor.y - (bent ? pullupFloorReference.clearance : r.torso * 0.2);
  });
}

function pullupCalibratedLegReach(reach, top, side) {
  var floor = pullupFloorReference && pullupFloorReference.points[side + 'Toe'];
  var hip = reach.pose[side + 'Hip'], knee = reach.pose[side + 'Knee'];
  var ankle = reach.pose[side + 'Ankle'];
  if (!floor || !hip || !knee || !ankle) { return null; }
  var leg = pullupPointLength(hip, knee) + pullupPointLength(knee, ankle);
  var foot = pullupPointLength(ankle, floor);
  var th = top[side + 'Hip'], tk = top[side + 'Knee'];
  var ta = top[side + 'Ankle'], tt = top[side + 'Toe'];
  if (th && tk && ta && tt && top[side + 'KneeAngle'] >= 150) {
    // Preserve a COMPLETE observed leg length. Taking separate maximum thigh
    // and shin lengths invents a longer leg when the estimated knee shifts.
    leg = Math.max(leg, pullupPointLength(th, tk) + pullupPointLength(tk, ta));
    foot = Math.max(foot, pullupPointLength(ta, tt));
  }
  return leg > 0.06 && foot > 0.005 ? { leg: leg, foot: foot, hipY: hip.y } : null;
}

function pullupFootAirborneEvidence(side, m, profile) {
  var p = profile || pullupClearanceProfile;
  // The bottom pose is still being measured, so the final profile does not
  // exist yet. Use the saved top and current hang for the same clearance check;
  // save a final profile only after the normal stable hold completes.
  if (!p && typeof formTopMetrics !== 'undefined' && formTopMetrics &&
      (typeof state === 'undefined' || state === 'waitBottom')) {
    p = buildPullupClearanceProfile(formTopMetrics, m);
  }
  // Clearance is useful at any bar height. Only the positive standing inference
  // needs a proven low bar; uncertain reach framing must not disable clearance.
  if (!p || !m || !pullupFloorReference) { return null; }
  var reference = p.legs && p.legs[side];
  var hip = m[side + 'Hip'], knee = m[side + 'Knee'];
  var ankle = m[side + 'Ankle'], toe = m[side + 'Toe'];
  var angle = m[side + 'KneeAngle'];
  if (!reference || !hip || !knee || !ankle || !toe || !Number.isFinite(angle)) { return null; }
  var hipRise = reference.hipY - hip.y;
  var anchored = ['left','right'].every(function(s) {
    var arm = p.sides[s], wrist = m[s + 'Wrist'], elbow = m[s + 'Elbow'];
    if (!arm || !wrist || !elbow) { return false; }
    return Math.abs(wrist.y - arm.barY) < Math.max(0.025, p.torso * 0.3) &&
      Math.abs(wrist.x - arm.wristX) < 0.075 &&
      Math.abs((elbow.y - wrist.y) - arm.hangElbowToWrist) <= p.torso * 0.3;
  });
  if (!anchored) { return null; }
  var forward = pullupLegDepthClearance(m, side);
  // A lower pixel on the image is not floor contact when a forward leg's
  // calibrated reach still leaves clearance. Do not exempt a forward foot that
  // can reach the floor, or the other foot when only one leg is lifted.
  if (forward && forward.projectedClearance > Math.max(0.01, p.torso * 0.12)) {
    return Object.assign({reason:forward.direction === 'forward' ? 'forward-leg-clearance' : 'folded-leg-clearance',
      hipRise:hipRise,kneeAngle:angle}, forward);
  }
  // The planar fallback still needs raised hips; missing depth is never
  // replaced with zero or treated as proof of an airborne foot.
  if (!p.lowBar || hipRise <= p.torso * 0.12) { return null; }
  var currentLeg = pullupPointLength(hip, knee) + pullupPointLength(knee, ankle);
  var currentFoot = pullupPointLength(ankle, toe);
  if (currentLeg < 0.06 || currentFoot < 0.005) { return null; }
  var legProjection = Math.max(0, Math.min(1, (ankle.y - hip.y) / currentLeg));
  var footProjection = Math.max(0, Math.min(1, (toe.y - ankle.y) / currentFoot));
  var possibleToeY = hip.y + reference.leg * legProjection + reference.foot * footProjection;
  var floorY = pullupFloorReference.points[side + 'Toe'].y;
  var gap = floorY - possibleToeY;
  // Raised hips plus a visibly bent leg also contradict the saved maximal
  // tiptoe support pose. Foot pixels alone must not overrule that combination.
  var reason = angle < 160 ? 'raised-hips-bent-leg'
    : gap > Math.max(0.006, p.torso * 0.08) ? 'calibrated-leg-clearance' : null;
  return reason ? {reason:reason,hipRise:hipRise,kneeAngle:angle,projectedClearance:gap} : null;
}

// MediaPipe z is hip-relative, in approximately the same units as image x.
// Compare directions with the measured reach; z is not a floor sensor.
function pullupDepthLength(a, b) {
  if (!a || !b || !Number.isFinite(a.z) || !Number.isFinite(b.z)) { return null; }
  var aspect = video.videoWidth > 0 && video.videoHeight > 0
    ? video.videoWidth / video.videoHeight : 1;
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y, (a.z - b.z) * aspect);
}

function pullupLegDepth(m, side) {
  var hip = m[side + 'Hip'], knee = m[side + 'Knee'];
  var ankle = m[side + 'Ankle'], toe = m[side + 'Toe'];
  var thigh = pullupDepthLength(hip, knee), shin = pullupDepthLength(knee, ankle);
  var whole = pullupDepthLength(hip, ankle), foot = pullupDepthLength(ankle, toe);
  if (!(thigh > 0.025 && shin > 0.025 && whole > 0.05 && foot > 0.005)) { return null; }
  var aspect = video.videoWidth > 0 && video.videoHeight > 0
    ? video.videoWidth / video.videoHeight : 1;
  return {leg:thigh + shin,foot:foot,
    kneeForward:(hip.z - knee.z) * aspect / thigh,
    ankleForward:(hip.z - ankle.z) * aspect / whole,
    shinBack:(ankle.z - knee.z) * aspect / shin,
    legDown:Math.max(0, Math.min(1, (ankle.y - hip.y) / (thigh + shin))),
    footDown:Math.max(0, Math.min(1, (toe.y - ankle.y) / foot))};
}

function pullupLegDepthClearance(m, side) {
  var reach = pullupReachReference;
  if (!reach || !pullupFloorReference) { return null; }
  var referencePose = Object.assign({}, reach.pose);
  referencePose[side + 'Toe'] = pullupFloorReference.points[side + 'Toe'];
  var reference = pullupLegDepth(referencePose, side), current = pullupLegDepth(m, side);
  if (!reference || !current) { return null; }
  // Normalized depth supplies direction, not a measured limb length. A depth
  // estimate longer than its setup value must not silently become ground.
  var forward = current.kneeForward >= 0.35 && current.ankleForward >= 0.5 &&
    current.kneeForward - reference.kneeForward >= 0.2 &&
    current.ankleForward - reference.ankleForward >= 0.3;
  // A knee folded away from the camera can look straight in the image too.
  // Require a rearward shin and reduced downward reach relative to setup.
  var foldedBack = current.ankleForward <= -0.7 && current.shinBack >= 0.85 &&
    current.legDown < reference.legDown * 0.65;
  if (!forward && !foldedBack) { return null; }
  var ankle = m[side + 'Ankle'], toe = m[side + 'Toe'];
  // Use the observed vertical foot extent. Normalized z can stretch the foot
  // estimate between poses; treating that stretch as physical length invents
  // floor contact when the player rotates the foot while bending the knee.
  var footDown = Math.max(pullupPointLength(referencePose[side + 'Ankle'],
    referencePose[side + 'Toe']), Math.max(0, toe.y - ankle.y));
  var projectedToeY = m[side + 'Hip'].y + reference.leg * current.legDown + footDown;
  return {projectedClearance:referencePose[side + 'Toe'].y - projectedToeY,
    direction:forward ? 'forward' : 'folded-back',
    kneeForward:current.kneeForward,ankleForward:current.ankleForward};
}

`;
