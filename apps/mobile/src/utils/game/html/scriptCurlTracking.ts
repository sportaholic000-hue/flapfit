// Curl calibration filtering and depth-aware bend verification.
// Gameplay control keeps its original response.
// Raw form evidence stays independent.
// Must NOT contain backticks.
export const SCRIPT_CURL_TRACKING = `
var curlFilterSamples = [], curlFilterMedian = null, curlFilterTime = null;
var curlFilterValue = null, curlFilterSpeed = 0;

function resetCurlControlFilter() {
  curlFilterSamples = []; curlFilterMedian = null; curlFilterTime = null;
  curlFilterValue = null; curlFilterSpeed = 0;
}

function filterCurlController(metrics, now) {
  if (curlFilterTime !== null && now <= curlFilterTime) { return curlFilterValue; }
  var elapsed = curlFilterTime === null ? 0 : now - curlFilterTime;
  // Never carry a short noise window across an interruption in observations.
  if (elapsed > 200) { resetCurlControlFilter(); }
  var pair = [metrics.leftWrist.y, metrics.rightWrist.y];
  curlFilterSamples.push(pair);
  if (curlFilterSamples.length > 3) { curlFilterSamples.shift(); }

  // Three fresh observations suppress brief single-wrist reversals. These
  // filtered coordinates never replace raw both-arm or elbow-check evidence.
  var middle = pair.map(function(value, index) {
    if (curlFilterSamples.length < 3) { return value; }
    var values = curlFilterSamples.map(function(sample) { return sample[index]; });
    values.sort(function(a, b) { return a - b; });
    return values[1];
  });
  var target = (middle[0] + middle[1]) / 2;
  var filtered = target;
  if (curlFilterTime !== null && curlFilterValue !== null) {
    var dt = elapsed / 1000;
    var leftDelta = middle[0] - curlFilterMedian[0];
    var rightDelta = middle[1] - curlFilterMedian[1];
    // Faster response needs corroborating movement in BOTH hands. One jumping
    // wrist cannot disable smoothing. There is no dead zone, pose lock,
    // prediction or pause: small partial movements also converge to their target.
    var speed = leftDelta * rightDelta > 0
      ? Math.min(Math.abs(leftDelta), Math.abs(rightDelta)) / dt : 0;
    curlFilterSpeed += (speed - curlFilterSpeed) * (1 - Math.exp(-dt / .1));
    var tau = Math.max(.035, .16 / (1 + 15 * curlFilterSpeed));
    var alpha = 1 - Math.exp(-dt / tau);
    filtered = curlFilterValue + (target - curlFilterValue) * alpha;
  }
  curlFilterTime = now; curlFilterMedian = middle; curlFilterValue = filtered;
  return filtered;
}

// A front-facing forearm points into camera depth around the middle of a curl.
// Its projected 2D elbow angle can approach 0/180 even with perfect tracking.
// Use the detector's existing metric 3D coordinates for bend verification only.
function curlWorldJointAngle(points, shoulder, elbow, wrist) {
  var indices = [shoulder, elbow, wrist];
  var p = indices.map(function(index) { return points && points[index]; });
  if (p.some(function(point) {
    return !point || !Number.isFinite(point.visibility) || point.visibility < .24 ||
      ![point.x, point.y, point.z].every(Number.isFinite);
  })) { return null; }
  var u = [p[0].x-p[1].x, p[0].y-p[1].y, p[0].z-p[1].z];
  var v = [p[2].x-p[1].x, p[2].y-p[1].y, p[2].z-p[1].z];
  var length = Math.hypot.apply(null, u) * Math.hypot.apply(null, v);
  if (length < .000001) { return null; }
  var cosine = (u[0]*v[0] + u[1]*v[1] + u[2]*v[2]) / length;
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

function curlUsesWorldBend() {
  return Number.isFinite(formTopMetrics.curlWorldAngle) && Number.isFinite(formBottomMetrics.curlWorldAngle);
}

function validateCurlElbowBend(metrics, norm) {
  var worldReferences = curlUsesWorldBend();
  // References and live measurement must use the same coordinate system.
  // Legacy observations without 3D references retain their existing 2D check.
  // A run calibrated in 3D must never fall back to 2D when depth is lost.
  var value = worldReferences ? metrics.curlWorldAngle : metrics.elbowAngle;
  if (worldReferences && !Number.isFinite(value)) {
    return formInvalid('Form check<br><br>Keep both shoulders, elbows, and wrists visible.');
  }
  var top = worldReferences ? formTopMetrics.curlWorldAngle : formTopMetrics.elbowAngle;
  var bottom = worldReferences ? formBottomMetrics.curlWorldAngle : formBottomMetrics.elbowAngle;
  var tolerance = 55;
  if (worldReferences) {
    // Depth estimates may have a smaller calibrated angle span. Preserve the
    // old check's fractional strictness instead of letting 55 degrees cover
    // most of that span (which could admit straight-arm lifting).
    var worldSpan = Math.abs(top-bottom);
    var projectedSpan = Math.abs(formTopMetrics.elbowAngle-formBottomMetrics.elbowAngle);
    if (worldSpan < .000001) {
      return formInvalid('Form check<br><br>Elbow bend could not be verified.');
    }
    if (projectedSpan > .000001) { tolerance = Math.min(55, 55*worldSpan/projectedSpan); }
  }
  if (!formMetricMatches(value, top, bottom, norm, tolerance)) {
    return formInvalid('Form check<br><br>Curl by bending your elbows, not lifting your whole arms.');
  }
  return formValid();
}
`;
