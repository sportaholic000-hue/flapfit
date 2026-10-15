// Squats use only the torso and upper legs: lower-leg estimates must never
// affect calibration, control, or gameplay validation. Injected with form tracking.
// Must NOT contain backticks.
export const SCRIPT_SQUAT_TRACKING = `
function collectSquatMetrics() {
  var leftShoulder = formInFramePoint(11, 0.24);
  var rightShoulder = formInFramePoint(12, 0.24);
  var leftHip = formInFramePoint(23, 0.24);
  var rightHip = formInFramePoint(24, 0.24);
  // Always use the same midpoint, never switch from two hips to one.
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
    controllerY: hips && shoulders ? hips.y : null,
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
    if (hipDrop <= 0.06 || shoulderDrop < hipDrop * 0.35 ||
        thighChange < Math.max(0.025, formTopMetrics.squatThighDrop * 0.2)) {
      return formInvalid('Form check<br><br>Bend your knees and lower your hips into the squat.');
    }
  }
  return formValid();
}

function validateSquatGameplay(metrics) {
  if (!squatBodyVisible(metrics)) {
    return formInvalid('Form check<br><br>Keep shoulders, hips, and knees visible. Feet do not need to be visible.');
  }
  if (!squatChestRaised(metrics, formTopMetrics)) {
    return formInvalid('Form check<br><br>Keep your chest raised as you squat.');
  }
  // Compare matching camera observations, not the delayed smoothed bird position.
  var range = formBottomMetrics.hips.y - formTopMetrics.hips.y;
  var progress = range > 0 ? (metrics.hips.y - formTopMetrics.hips.y) / range : 0;
  progress = Math.max(0, Math.min(1, progress));
  var expected = formTopMetrics.squatThighDrop +
    (formBottomMetrics.squatThighDrop - formTopMetrics.squatThighDrop) * progress;
  var tolerance = Math.max(0.06, Math.abs(formTopMetrics.squatThighDrop) * 0.4);
  // Continuing beyond a calibrated endpoint in the same direction is valid.
  var beyondTop = progress === 0 && metrics.squatThighDrop >= formTopMetrics.squatThighDrop;
  var beyondBottom = progress === 1 && metrics.squatThighDrop <= formBottomMetrics.squatThighDrop;
  if (!beyondTop && !beyondBottom && Math.abs(metrics.squatThighDrop - expected) > tolerance) {
    return formInvalid('Form check<br><br>Lower and raise your hips by bending your knees.');
  }
  return formValid();
}
`;
