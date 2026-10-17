// Android curl experiment. Eyes qualify TOP only; image-space hands control flight.
// Median hand points reject isolated outliers. No shoulder, hip, or depth dependency.
// Must NOT contain backticks.
export const SCRIPT_CURL_FOREARM_TRACKING = `
function usesCurlForearmControl() {
  return CONFIG.exercise === 'biceps' && CONFIG.curlForearmControl === true;
}

// Same follow response as the existing 16*dt easing at 30 fps, expressed in
// elapsed time. Camera inference must not shorten the bird's follow interval.
// Only movement toward the measured target; no prediction, overshoot or freeze.
function curlBirdResponseGain(elapsedMs) {
  if (!Number.isFinite(elapsedMs)) { elapsedMs=1000/60; }
  var boundedMs=Math.max(0,Math.min(100,elapsedMs));
  return 1-Math.pow(1-16/30,boundedMs/(1000/30));
}

function curlHandMedian(values) {
  values.sort(function(a,b){return a-b;});
  var middle=Math.floor(values.length/2);
  return values.length%2 ? values[middle] : (values[middle-1]+values[middle])/2;
}

function curlImageHand(side) {
  var points=[15+side,17+side,19+side,21+side].map(function(index){
    return formInFramePoint(index,.24);
  }).filter(function(point){return !!point;});
  // Require corroboration within each hand; never invent the other hand.
  if (points.length < 2) { return null; }
  return {x:curlHandMedian(points.map(function(p){return p.x;})),
    y:curlHandMedian(points.map(function(p){return p.y;}))};
}

function curlImageArm(side) {
  var elbow=formInFramePoint(13+side,.24), hand=curlImageHand(side);
  return elbow && hand ? {elbow:elbow,hand:hand} : null;
}

function collectCurlForearmMetrics() {
  var left=curlImageArm(0), right=curlImageArm(1);
  // Read eyes only for TOP calibration. No face coordinate enters flight,
  // bottom calibration, bilateral progress, or elbow-anchor checks.
  var eyes = typeof state !== 'undefined' && state === 'waitTop'
    ? (formInFramePoint(2,.5) && formInFramePoint(5,.5) ? formMeanPoint([2,5],.5,2) : null) : null;
  var leftProgress=null,rightProgress=null;
  var controller=left && right ? (left.hand.y+right.hand.y)/2 : null;
  if (left && right && formTopMetrics && formBottomMetrics) {
    leftProgress=formWristProgress(left.hand.y,formTopMetrics.leftWrist.y,formBottomMetrics.leftWrist.y);
    rightProgress=formWristProgress(right.hand.y,formTopMetrics.rightWrist.y,formBottomMetrics.rightWrist.y);
    // Give each arm equal control after normalizing its own demonstrated range.
    controller=leftProgress !== null && rightProgress !== null
      ? formBottomMetrics.controllerY-(leftProgress+rightProgress)*.5*
        (formBottomMetrics.controllerY-formTopMetrics.controllerY) : null;
  }
  return {
    controllerY:controller,eyes:eyes,
    leftElbow:left ? left.elbow : null,rightElbow:right ? right.elbow : null,
    leftWrist:left ? left.hand : null,rightWrist:right ? right.hand : null,
    elbows:left && right ? {x:(left.elbow.x+right.elbow.x)/2,y:(left.elbow.y+right.elbow.y)/2} : null,
    wrists:left && right ? {x:(left.hand.x+right.hand.x)/2,y:(left.hand.y+right.hand.y)/2} : null,
    curlLeftProgress:leftProgress,curlRightProgress:rightProgress
  };
}

function validateCurlForearmCalibration(metrics, position) {
  if (!metrics || !metrics.leftElbow || !metrics.rightElbow || !metrics.leftWrist || !metrics.rightWrist) {
    return formInvalid('Form check<br><br>Keep both elbows and hands in view.');
  }
  if (position === 'top') {
    if (!metrics.eyes) { return formInvalid('STEP 1 OF 2<br><br>Face the camera and curl both hands up.'); }
    var sides=[['leftElbow','leftWrist'],['rightElbow','rightWrist']];
    for (var i=0;i<sides.length;i++) {
      var side=sides[i], elbow=metrics[side[0]], wrist=metrics[side[1]];
      var faceToElbow=elbow.y-metrics.eyes.y;
      // Eye line supplies a personal reference, not a required hand target.
      // Both hands must actually curl above their elbows; moving the head
      // cannot make a hanging or straight arm qualify.
      if (faceToElbow < .06 || (elbow.y-wrist.y)/faceToElbow < .20 ||
          wrist.y < metrics.eyes.y-.03) {
        return formInvalid('Form check<br><br>Curl BOTH hands up.<br>Keep your elbows near your sides.');
      }
    }
  } else {
    if (metrics.leftWrist.y-metrics.leftElbow.y < .08 || metrics.rightWrist.y-metrics.rightElbow.y < .08) {
      return formInvalid('Form check<br><br>Lower BOTH hands and extend your arms at your sides.');
    }
    if (formTopMetrics && !formHasBilateralWristRange(metrics,.12)) {
      return formInvalid('Form check<br><br>Move BOTH forearms through the full calibration range.');
    }
    if (formTopMetrics && (formDistance(metrics.leftElbow,formTopMetrics.leftElbow) > .13 ||
        formDistance(metrics.rightElbow,formTopMetrics.rightElbow) > .13)) {
      return formInvalid('Form check<br><br>Keep your elbows near your sides as you lower your hands.');
    }
  }
  return formValid();
}

function validateCurlForearmGameplay(metrics) {
  if (!metrics.leftElbow || !metrics.rightElbow || !metrics.leftWrist || !metrics.rightWrist ||
      !Number.isFinite(metrics.curlLeftProgress) || !Number.isFinite(metrics.curlRightProgress)) {
    return formFatal('Both arms can no longer be verified.','biceps-both-arms');
  }
  if (Math.abs(metrics.curlLeftProgress-metrics.curlRightProgress) > .30) {
    return formFatal('Both-arm curl could not be verified.','biceps-both-arms');
  }
  // Independent, per-arm anchors reject lifting whole arms. No shoulder or
  // face estimate is consulted and one elbow cannot conceal the other's drift.
  for (var i=0;i<2;i++) {
    var key=i===0?'leftElbow':'rightElbow';
    var anchor={x:(formTopMetrics[key].x+formBottomMetrics[key].x)/2,
      y:(formTopMetrics[key].y+formBottomMetrics[key].y)/2};
    if (formDistance(metrics[key],anchor) > .13) {
      return formInvalid('Form check<br><br>Keep your elbows near your sides while curling.');
    }
  }
  return formValid();
}
`;
