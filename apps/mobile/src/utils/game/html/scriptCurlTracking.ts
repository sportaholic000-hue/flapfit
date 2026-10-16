// Curl calibration filtering only; gameplay uses its original response.
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
`;
