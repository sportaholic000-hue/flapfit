// Core script for the in-WebView game: setup, overlay UI, audio, camera,
// MediaPipe pose tracking, and calibration helpers.
// This is injected into a <script> tag. It must not contain backticks.

export const SCRIPT_CORE = `
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var video = document.getElementById('video');
var previewEl = document.getElementById('preview');
var dotEl = document.getElementById('dot');
var overlayEl = document.getElementById('overlay');
var msgEl = document.getElementById('msg');
var barEl = document.getElementById('bar');
var fillEl = document.getElementById('fill');
var camBtnEl = document.getElementById('camBtn');
var camHidden = false;

function usesCameraBackground() {
  return CONFIG.backgroundMode === 'camera';
}

var W = 0, H = 0;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function postRN(obj) {
  try {
    if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
  } catch (e) {}
}

function showOverlay(html, withBar) {
  overlayEl.style.display = 'flex';
  msgEl.innerHTML = html;
  barEl.style.display = withBar ? 'block' : 'none';
}
function hideOverlay() { overlayEl.style.display = 'none'; }
function setProgress(p) { fillEl.style.width = Math.round(p * 100) + '%'; }

// ---------- Audio ----------
var actx = null;
function beep(freq, dur, type, vol) {
  try {
    if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (actx.state === 'suspended') { actx.resume(); }
    var o = actx.createOscillator();
    var g = actx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = vol || 0.06;
    o.connect(g); g.connect(actx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.12));
    o.stop(actx.currentTime + (dur || 0.12));
  } catch (e) {}
}

// ---------- State ----------
var state = 'loading';
var landmarker = null;
var headY = null, headX = 0.5, headYSmooth = null;
var wristY = null, wristYSmooth = null;
var lastHeadTrackTime = 0, lastWristTrackTime = 0;
var usingShoulders = false, shoulderOffset = 0.18;
var topY = null, bottomY = null;
var birdNorm = 0.5, prevBirdNorm = 0.5;
var score = 0, pushups = 0, ppPhase = 'up';
var pipes = [], particles = [], clouds = [];
var lastSpawn = 0, lastFrame = 0, countdownEnd = 0, resumeEnd = 0;
var gameOverSent = false;
var lastVideoTime = -1;

for (var ci = 0; ci < 5; ci++) {
  clouds.push({ x: Math.random(), y: 0.08 + Math.random() * 0.3, s: 0.5 + Math.random() * 0.8, v: 6 + Math.random() * 10 });
}

// ---------- Calibration stability ----------
var stabBuf = [];
function stabilityProgress(y, now) {
  stabBuf.push({ t: now, y: y });
  while (stabBuf.length && now - stabBuf[0].t > 1600) { stabBuf.shift(); }
  if (stabBuf.length < 8) { return 0; }
  var mn = 1, mx = 0;
  for (var i = 0; i < stabBuf.length; i++) {
    var v = stabBuf[i].y;
    if (v < mn) { mn = v; }
    if (v > mx) { mx = v; }
  }
  if (mx - mn > 0.028) { stabBuf = [{ t: now, y: y }]; return 0; }
  var span = now - stabBuf[0].t;
  return Math.min(1, span / 1300);
}
function stabAverage() {
  var sum = 0;
  for (var i = 0; i < stabBuf.length; i++) { sum += stabBuf[i].y; }
  return stabBuf.length ? sum / stabBuf.length : null;
}

// ---------- Camera + MediaPipe ----------
function startCamera() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false
  }).then(function (stream) {
    video.srcObject = stream;
    return video.play();
  });
}

// Production uses the exact MediaPipe 0.10.14 runtime and pose model bundled
// inside Flap Fit. Expo Go development uses the previously proven HTTPS path
// because a file:// WebView does not provide a reliable camera-capable origin.
var REMOTE_VISION_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
var VISION_MODULE_URL = CONFIG.trackerAssetMode === 'remote'
  ? REMOTE_VISION_BASE_URL + '/vision_bundle.mjs'
  : './vision_bundle.mjs';
var VISION_WASM_BASE_URL = CONFIG.trackerAssetMode === 'remote'
  ? REMOTE_VISION_BASE_URL + '/wasm'
  : './';
var MODEL_URL = CONFIG.trackerAssetMode === 'remote'
  ? 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
  : './pose_landmarker_lite.task';

function initCameraFlow() {
  showOverlay(CONFIG.trackerAssetMode === 'remote' ? 'Loading camera tracking engine…' : 'Loading on-device tracking engine…', false);
  import(VISION_MODULE_URL).then(function (vision) {
    return vision.FilesetResolver.forVisionTasks(VISION_WASM_BASE_URL).then(function (files) {
      var makeOpts = function (delegate) {
        return {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: delegate },
          runningMode: 'VIDEO',
          numPoses: 1
        };
      };
      return vision.PoseLandmarker.createFromOptions(files, makeOpts('GPU')).catch(function () {
        return vision.PoseLandmarker.createFromOptions(files, makeOpts('CPU'));
      });
    });
  }).then(function (lm) {
    landmarker = lm;
    showOverlay('Starting camera…', false);
    return startCamera();
  }).then(function () {
    if (usesCameraBackground()) {
      // Leave a tiny invisible video surface alive for pose tracking and canvas
      // composition while removing the old thumbnail and camera toggle from view.
      previewEl.style.display = 'block';
      previewEl.style.opacity = '0';
      previewEl.style.pointerEvents = 'none';
      previewEl.style.width = '1px';
      previewEl.style.height = '1px';
      previewEl.style.right = '-4px';
      previewEl.style.bottom = '-4px';
      previewEl.style.border = 'none';
      if (camBtnEl) { camBtnEl.style.display = 'none'; }
    } else {
      if (!camHidden) { previewEl.style.display = 'block'; }
      if (camBtnEl) { camBtnEl.style.display = 'block'; }
    }
    state = 'waitTop';
    stabBuf = [];
    requestAnimationFrame(trackLoop);
  }).catch(function (err) {
    console.error(err);
    var detail = err && (err.stack || err.message) ? String(err.stack || err.message) : String(err);
    showOverlay('Could not start camera tracking.<br><br><small>The tracking engine or camera could not initialize. Please try again.</small>', false);
    postRN({ type: 'trackingerror', message: detail });
  });
}

function trackLoop() {
  if (landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    try {
      var res = landmarker.detectForVideo(video, performance.now());
      if (res && res.landmarks && res.landmarks.length > 0) {
        var lm = res.landmarks[0];
        var nose = lm[0], ls = lm[11], rs = lm[12];
        var nv = (nose && nose.visibility !== undefined) ? nose.visibility : 1;
        var lv = (ls && ls.visibility !== undefined) ? ls.visibility : 0;
        var rv = (rs && rs.visibility !== undefined) ? rs.visibility : 0;
        var y = null;
        if (nose && nv > 0.5) {
          y = nose.y;
          headX = nose.x;
          usingShoulders = false;
          if (ls && rs && lv > 0.5 && rv > 0.5) {
            var off = ((ls.y + rs.y) / 2) - nose.y;
            shoulderOffset = shoulderOffset * 0.92 + off * 0.08;
          }
        } else if (ls && rs && lv > 0.4 && rv > 0.4) {
          y = ((ls.y + rs.y) / 2) - shoulderOffset;
          headX = (ls.x + rs.x) / 2;
          usingShoulders = true;
        }
        if (y !== null) {
          headY = y;
          if (headYSmooth === null) { headYSmooth = y; }
          headYSmooth = headYSmooth + (y - headYSmooth) * 0.55;
          lastHeadTrackTime = performance.now();
        }
        // Wrist tracking — used for lateral raise exercise
        var lw = lm[15], rw = lm[16];
        var lwv = (lw && lw.visibility !== undefined) ? lw.visibility : 0;
        var rwv = (rw && rw.visibility !== undefined) ? rw.visibility : 0;
        if (lw && rw && lwv > 0.25 && rwv > 0.25) {
          var wy = (lw.y + rw.y) / 2;
          wristY = wy;
          if (wristYSmooth === null) { wristYSmooth = wy; }
          wristYSmooth = wristYSmooth + (wy - wristYSmooth) * 0.55;
          lastWristTrackTime = performance.now();
        }
      }
    } catch (e) { console.error(e); }
  }
  updateDot();
  requestAnimationFrame(trackLoop);
}

function updateDot() {
  var activeY = getTrackY();
  if (activeY === null) { return; }
  var fresh = trackingFresh();
  dotEl.style.left = ((1 - headX) * 100) + '%';
  dotEl.style.top = (activeY * 100) + '%';
  dotEl.style.background = fresh ? (usingShoulders ? '#F59E0B' : '#22C55E') : '#EF4444';
}

// ---------- Track-Y helpers (exercise-aware) ----------
function usesWristTracking() {
  return CONFIG.exercise === 'lateralraise' || CONFIG.exercise === 'biceps' || CONFIG.exercise === 'shoulderpress';
}
function getTrackY() {
  return usesWristTracking() ? wristY : headY;
}
function getTrackYSmooth() {
  return usesWristTracking() ? wristYSmooth : headYSmooth;
}
function trackingFresh() {
  var lastInputTime = usesWristTracking()
    ? lastWristTrackTime
    : lastHeadTrackTime;
  return lastInputTime > 0 && (performance.now() - lastInputTime) < 700;
}

// ---------- Rep counting ----------
function updatePushups(norm) {
  if (ppPhase === 'up' && norm < 0.22) { ppPhase = 'down'; }
  else if (ppPhase === 'down' && norm > 0.78) {
    ppPhase = 'up';
    pushups += 1;
    postRN({ type: 'pushup', count: pushups });
  }
}

// ---------- Camera toggle ----------
function _toggleCam() {
  if (usesCameraBackground()) { return; }
  camHidden = !camHidden;
  previewEl.style.display = camHidden ? 'none' : 'block';
  camBtnEl.textContent = camHidden ? '🚫📷' : '📷';
  camBtnEl.style.bottom = camHidden ? '10px' : '193px';
}
if (camBtnEl) {
  camBtnEl.addEventListener('click', _toggleCam);
  camBtnEl.addEventListener('touchend', function(e) { e.preventDefault(); _toggleCam(); });
}
`;
