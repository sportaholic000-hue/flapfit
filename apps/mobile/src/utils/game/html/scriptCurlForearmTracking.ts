// Android curl experiment. Face position is used only to qualify the TOP pose.
// Forearm direction uses elbow/hand depth coordinates; shoulders are never read.
// Must NOT contain backticks.
export const SCRIPT_CURL_FOREARM_TRACKING = `
function usesCurlForearmControl() {
  return CONFIG.exercise === 'biceps' && CONFIG.curlForearmControl === true;
}

function curlForearmArm(elbowIndex, wristIndex) {
  var elbow = formInFramePoint(elbowIndex, .24), wrist = formInFramePoint(wristIndex, .24);
  var e = curlFormWorldLandmarks && curlFormWorldLandmarks[elbowIndex];
  var w = curlFormWorldLandmarks && curlFormWorldLandmarks[wristIndex];
  if (!elbow || !wrist || !e || !w || e.visibility < .24 || w.visibility < .24 ||
      ![e.x,e.y,e.z,w.x,w.y,w.z,e.visibility,w.visibility].every(Number.isFinite)) { return null; }
  var dx=w.x-e.x, dy=w.y-e.y, dz=w.z-e.z;
  var length=Math.hypot(dx,dy,dz);
  if (length < .0001) { return null; }
  return {elbow:elbow,wrist:wrist,lift:-dy/length};
}

function curlForearmProgress(value, top, bottom) {
  if (![value,top,bottom].every(Number.isFinite) || top-bottom < .0001) { return null; }
  return Math.max(0,Math.min(1,(value-bottom)/(top-bottom)));
}

function collectCurlForearmMetrics() {
  var left=curlForearmArm(13,15), right=curlForearmArm(14,16);
  // Read eyes only for TOP calibration. No face coordinate enters flight,
  // bottom calibration, bilateral progress, or elbow-anchor checks.
  var eyes = typeof state !== 'undefined' && state === 'waitTop'
    ? (formInFramePoint(2,.5) && formInFramePoint(5,.5) ? formMeanPoint([2,5],.5,2) : null) : null;
  var leftProgress=null,rightProgress=null;
  var controller=left && right ? .5-.125*(left.lift+right.lift) : null;
  if (left && right && formTopMetrics && formBottomMetrics) {
    leftProgress=curlForearmProgress(left.lift,formTopMetrics.curlLeftLift,formBottomMetrics.curlLeftLift);
    rightProgress=curlForearmProgress(right.lift,formTopMetrics.curlRightLift,formBottomMetrics.curlRightLift);
    // Give each arm equal control after normalizing its own demonstrated range.
    controller=leftProgress !== null && rightProgress !== null
      ? formBottomMetrics.controllerY-(leftProgress+rightProgress)*.5*
        (formBottomMetrics.controllerY-formTopMetrics.controllerY) : null;
  }
  return {
    controllerY:controller,eyes:eyes,
    leftElbow:left ? left.elbow : null,rightElbow:right ? right.elbow : null,
    leftWrist:left ? left.wrist : null,rightWrist:right ? right.wrist : null,
    elbows:left && right ? {x:(left.elbow.x+right.elbow.x)/2,y:(left.elbow.y+right.elbow.y)/2} : null,
    wrists:left && right ? {x:(left.wrist.x+right.wrist.x)/2,y:(left.wrist.y+right.wrist.y)/2} : null,
    curlLeftLift:left ? left.lift : null,curlRightLift:right ? right.lift : null,
    curlLeftProgress:leftProgress,curlRightProgress:rightProgress
  };
}

function validateCurlForearmCalibration(metrics, position) {
  if (!metrics || !metrics.leftElbow || !metrics.rightElbow || !metrics.leftWrist || !metrics.rightWrist ||
      !Number.isFinite(metrics.curlLeftLift) || !Number.isFinite(metrics.curlRightLift)) {
    return formInvalid('Form check<br><br>Keep both elbows and hands in view.');
  }
  if (position === 'top') {
    if (!metrics.eyes) { return formInvalid('STEP 1 OF 2<br><br>Face the camera and curl both hands up.'); }
    var sides=[['leftElbow','leftWrist','curlLeftLift'],['rightElbow','rightWrist','curlRightLift']];
    for (var i=0;i<sides.length;i++) {
      var side=sides[i], elbow=metrics[side[0]], wrist=metrics[side[1]];
      var faceToElbow=elbow.y-metrics.eyes.y;
      // Eye line supplies a personal reference, not a required hand target.
      // Both hands must actually curl above their elbows; moving the head
      // cannot make a hanging or straight arm qualify.
      if (faceToElbow < .06 || (elbow.y-wrist.y)/faceToElbow < .20 ||
          wrist.y < metrics.eyes.y-.03 || metrics[side[2]] < .15) {
        return formInvalid('Form check<br><br>Curl BOTH hands up.<br>Keep your elbows near your sides.');
      }
    }
  } else {
    if (metrics.curlLeftLift > -.65 || metrics.curlRightLift > -.65 ||
        metrics.leftWrist.y-metrics.leftElbow.y < .02 || metrics.rightWrist.y-metrics.rightElbow.y < .02) {
      return formInvalid('Form check<br><br>Lower BOTH hands and extend your arms at your sides.');
    }
    if (formTopMetrics && (!formHasBilateralWristRange(metrics,.05) ||
        formTopMetrics.curlLeftLift-metrics.curlLeftLift < .5 ||
        formTopMetrics.curlRightLift-metrics.curlRightLift < .5)) {
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
