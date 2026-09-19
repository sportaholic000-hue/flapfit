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

function hideCameraPreview() {
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
var lastSpawn = 0, lastFrame = 0, countdownEnd = 0;
var gameOverSent = false;
var lastVideoTime = -1;
var calibrationReadyAt = 0;
var CALIBRATION_START_DELAY_MS = 2000;
var trackingLoopActive = false;

for (var ci = 0; ci < 5; ci++) {
  clouds.push({ x: Math.random(), y: 0.08 + Math.random() * 0.3, s: 0.5 + Math.random() * 0.8, v: 6 + Math.random() * 10 });
}

// ---------- Calibration stability ----------
var stabBuf = [];
function stabilityProgress(y, now) {
  if (usesExperimentalFormTracking() && CONFIG.exercise === 'pullups') {
    // Count camera observations, not repeated renders of the same pose.
    var poseTime = lastFormTrackTime;
    if (!experimentalTrackingFresh()) { stabBuf = []; return 0; }
    var previous = stabBuf.length ? stabBuf[stabBuf.length - 1] : null;
    if (previous && (poseTime < previous.t || poseTime - previous.t > 700)) {
      stabBuf = []; previous = null;
    }
    if (previous && poseTime === previous.t) {
      return stabBuf.length >= 8 ? Math.min(1, (previous.t - stabBuf[0].t) / 1300) : 0;
    }
    now = poseTime;
  }
  stabBuf.push({ t: now, y: y });
  var minimumKept = usesExperimentalFormTracking() && CONFIG.exercise === 'pullups' ? 8 : 1;
  while (stabBuf.length > minimumKept && now - stabBuf[0].t > 1600) { stabBuf.shift(); }
  if (stabBuf.length < 8) { return 0; }
  var mn = 1, mx = 0;
  for (var i = 0; i < stabBuf.length; i++) {
    var v = stabBuf[i].y;
    if (v < mn) { mn = v; }
    if (v > mx) { mx = v; }
  }
  var maxCalibrationDrift = usesExperimentalFormTracking() && CONFIG.exercise === 'pullups'
    ? 0.04
    : 0.028;
  if (mx - mn > maxCalibrationDrift) { stabBuf = [{ t: now, y: y }]; return 0; }
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
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return Promise.reject(new Error('Camera API unavailable for the game page origin.'));
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: CONFIG.recordAudio ? {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    } : false
  }).then(function (stream) {
    video.srcObject = stream;
    return video.play();
  });
}

function stopCameraAndTracking() {
  trackingLoopActive = false;
  if (video && video.srcObject && typeof video.srcObject.getTracks === 'function') {
    var sourceTracks = video.srcObject.getTracks();
    for (var sti = 0; sti < sourceTracks.length; sti++) {
      try { sourceTracks[sti].stop(); } catch (e) {}
    }
  }
  try { if (video) { video.pause(); video.srcObject = null; } } catch (e) {}
  if (landmarker) {
    try { if (typeof landmarker.close === 'function') { landmarker.close(); } } catch (e) {}
    landmarker = null;
  }
  releaseTrackerBlobUrls();
}

// Production uses the exact MediaPipe 0.10.14 runtime and pose model bundled
// inside Flap Fit. The native screen streams those files into this secure
// HTTPS-base inline page and only sends the supported Wasm variant. Expo Go
// development keeps the previously proven HTTPS loader for fast iteration.
var REMOTE_VISION_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
var REMOTE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
var TRACKER_ASSET_NAMES = ['module', 'loader', 'wasm', 'model'];
var trackerAssetChunks = {};
var trackerAssetValues = {};
var trackerAssetResolve = null;
var trackerAssetReject = null;
var trackerAssetTimeout = null;
var trackerAssetPromise = null;
var trackerBlobUrls = [];

function supportsWasmSimd() {
  try {
    return WebAssembly.validate(new Uint8Array([
      0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11
    ]));
  } catch (e) {
    return false;
  }
}

function decodeTrackerBase64(encoded) {
  var binary = atob(encoded);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
  return bytes;
}

function makeTrackerBlobUrl(encoded, mimeType) {
  var url = URL.createObjectURL(new Blob([decodeTrackerBase64(encoded)], { type: mimeType }));
  trackerBlobUrls.push(url);
  return url;
}

function releaseTrackerBlobUrls() {
  for (var i = 0; i < trackerBlobUrls.length; i++) {
    try { URL.revokeObjectURL(trackerBlobUrls[i]); } catch (e) {}
  }
  trackerBlobUrls = [];
}

function completeBundledTrackerAssetsIfReady() {
  for (var i = 0; i < TRACKER_ASSET_NAMES.length; i++) {
    if (!trackerAssetValues[TRACKER_ASSET_NAMES[i]]) { return; }
  }

  try {
    if (trackerAssetTimeout) { clearTimeout(trackerAssetTimeout); }
    var assets = {
      moduleUrl: makeTrackerBlobUrl(trackerAssetValues.module, 'text/javascript'),
      loaderUrl: makeTrackerBlobUrl(trackerAssetValues.loader, 'text/javascript'),
      wasmUrl: makeTrackerBlobUrl(trackerAssetValues.wasm, 'application/wasm'),
      modelBuffer: decodeTrackerBase64(trackerAssetValues.model)
    };
    trackerAssetChunks = {};
    trackerAssetValues = {};
    setProgress(1);
    trackerAssetResolve(assets);
  } catch (err) {
    releaseTrackerBlobUrls();
    trackerAssetReject(err);
  }
}

window.__receiveTrackerAssetChunk = function(name, index, chunkCount, data, progress) {
  if (TRACKER_ASSET_NAMES.indexOf(name) < 0 || index < 0 || chunkCount < 1 || typeof data !== 'string') {
    if (trackerAssetReject) { trackerAssetReject(new Error('Invalid bundled tracker asset data.')); }
    return;
  }
  if (!trackerAssetChunks[name]) { trackerAssetChunks[name] = new Array(chunkCount); }
  trackerAssetChunks[name][index] = data;
  if (typeof progress === 'number') { setProgress(Math.max(0, Math.min(1, progress))); }

  for (var i = 0; i < trackerAssetChunks[name].length; i++) {
    if (typeof trackerAssetChunks[name][i] !== 'string') { return; }
  }
  trackerAssetValues[name] = trackerAssetChunks[name].join('');
  delete trackerAssetChunks[name];
  completeBundledTrackerAssetsIfReady();
};

window.__rejectTrackerAssets = function(message) {
  if (trackerAssetTimeout) { clearTimeout(trackerAssetTimeout); }
  if (trackerAssetReject) {
    trackerAssetReject(new Error(message || 'The bundled camera tracker could not be loaded.'));
  }
};

function requestBundledTrackerAssets() {
  if (trackerAssetPromise) { return trackerAssetPromise; }
  trackerAssetPromise = new Promise(function(resolve, reject) {
    trackerAssetResolve = resolve;
    trackerAssetReject = reject;
    var requestId = String(Date.now()) + '-' + String(Math.random()).slice(2, 10);
    postRN({ type: 'trackerassetrequest', requestId: requestId, simd: supportsWasmSimd() });
    trackerAssetTimeout = setTimeout(function() {
      reject(new Error('Timed out while loading the bundled tracking engine.'));
    }, 120000);
  });
  return trackerAssetPromise;
}

function loadTrackerRuntime() {
  if (CONFIG.trackerAssetMode === 'remote') {
    return import(REMOTE_VISION_BASE_URL + '/vision_bundle.mjs').then(function(vision) {
      return vision.FilesetResolver.forVisionTasks(REMOTE_VISION_BASE_URL + '/wasm').then(function(files) {
        return { vision: vision, files: files, modelAssetPath: REMOTE_MODEL_URL };
      });
    });
  }

  return requestBundledTrackerAssets().then(function(assets) {
    return import(assets.moduleUrl).then(function(vision) {
      return {
        vision: vision,
        files: { wasmLoaderPath: assets.loaderUrl, wasmBinaryPath: assets.wasmUrl },
        modelAssetBuffer: assets.modelBuffer,
        release: function() {
          assets.modelBuffer = null;
          releaseTrackerBlobUrls();
          trackerAssetPromise = null;
        }
      };
    });
  });
}

function reportPullupCameraStartup(stage) {
  if (CONFIG.exercise === 'pullups' && usesExperimentalFormTracking()) {
    postRN({ type: 'formdebug', message: 'PULLUP_STARTUP ' + stage });
  }
}

function initCameraFlow() {
  reportPullupCameraStartup('loading-tracker');
  showOverlay(CONFIG.trackerAssetMode === 'remote' ? 'Loading camera tracking engine…' : 'Loading on-device tracking engine…', CONFIG.trackerAssetMode !== 'remote');
  loadTrackerRuntime().then(function (runtime) {
      var makeOpts = function (delegate) {
        var baseOptions = { delegate: delegate };
        if (runtime.modelAssetBuffer) { baseOptions.modelAssetBuffer = runtime.modelAssetBuffer; }
        else { baseOptions.modelAssetPath = runtime.modelAssetPath; }
        return {
          baseOptions: baseOptions,
          runningMode: 'VIDEO',
          numPoses: 1
        };
      };
      var createLandmarker = runtime.vision.PoseLandmarker
        .createFromOptions(runtime.files, makeOpts('GPU'))
        .catch(function () {
          return runtime.vision.PoseLandmarker.createFromOptions(runtime.files, makeOpts('CPU'));
        });
      return createLandmarker.then(function(lm) {
        if (runtime.release) { runtime.release(); }
        return lm;
      }, function(err) {
        if (runtime.release) { runtime.release(); }
        throw err;
      });
  }).then(function (lm) {
    landmarker = lm;
    reportPullupCameraStartup('starting-camera');
    showOverlay('Starting camera…', false);
    return startCamera();
  }).then(function () {
    if (usesCameraBackground()) {
      hideCameraPreview();
    } else {
      if (!camHidden) { previewEl.style.display = 'block'; }
      if (camBtnEl) { camBtnEl.style.display = 'block'; }
    }
    calibrationReadyAt = performance.now() + CALIBRATION_START_DELAY_MS;
    if (usesExperimentalFormTracking()) { resetExperimentalFormTracking(); }
    state = 'waitTop';
    reportPullupCameraStartup('camera-ready');
    stabBuf = [];
    trackingLoopActive = true;
    requestAnimationFrame(trackLoop);
  }).catch(function (err) {
    reportPullupCameraStartup('camera-error');
    console.error(err);
    var detail = err && (err.stack || err.message) ? String(err.stack || err.message) : String(err);
    showOverlay('Could not start camera tracking.<br><br><small>The tracking engine or camera could not initialize. Please try again.</small>', false);
    postRN({ type: 'trackingerror', message: detail });
  });
}

function trackLoop() {
  if (!trackingLoopActive) { return; }
  if (landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    try {
      var res = landmarker.detectForVideo(video, performance.now());
      if (res && res.landmarks && res.landmarks.length > 0) {
        var lm = res.landmarks[0];
        if (usesExperimentalFormTracking()) {
          updateExperimentalFormPose(lm, performance.now());
        }
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
  if (trackingLoopActive) { requestAnimationFrame(trackLoop); }
}

window.addEventListener('pagehide', stopCameraAndTracking);
window.addEventListener('beforeunload', stopCameraAndTracking);

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
  if (usesExperimentalFormTracking()) { return getExperimentalTrackY(); }
  return usesWristTracking() ? wristY : headY;
}
function getTrackYSmooth() {
  if (usesExperimentalFormTracking()) { return getExperimentalTrackYSmooth(); }
  return usesWristTracking() ? wristYSmooth : headYSmooth;
}
function trackingFresh() {
  if (usesExperimentalFormTracking()) { return experimentalTrackingFresh(); }
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
  if (usesCameraBackground() || (state !== 'waitTop' && state !== 'waitBottom')) { return; }
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
