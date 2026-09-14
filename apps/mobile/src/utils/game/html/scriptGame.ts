// Game logic script for the in-WebView game: pipes, bird (with evolution), HUD,
// the main state machine loop, and kickoff. Injected after SCRIPT_CORE.
// Must NOT contain backticks.

export const BIRD_RADIUS_MIN = 14;
export const BIRD_RADIUS_MAX = 22;
export const BIRD_RADIUS_HEIGHT_FACTOR = 0.026;
export const BIRD_COLLISION_RADIUS_FACTOR = 0.88;

export function computeBirdRadii(viewportHeight: number, _evolutionStage: number) {
  const base = Math.max(
    BIRD_RADIUS_MIN,
    Math.min(BIRD_RADIUS_MAX, viewportHeight * BIRD_RADIUS_HEIGHT_FACTOR)
  );
  return {
    // Stage growth is authored inside each fixed-size raster canvas. Keeping the
    // draw box fixed avoids scaling the new art twice.
    visual: base,
    collision: base * BIRD_COLLISION_RADIUS_FACTOR,
  };
}

export const SCRIPT_GAME = `
// ---------- Tracked training time ----------
// This is active gameplay time, not pose/form-verified physiological TUT.
var tutSeconds = 0;
var tutReportedSeconds = 0;
var fatalFormKey = '';
var fatalFormSince = 0;
var FATAL_FORM_GRACE_MS = 350;

function fatalFormFailureConfirmed(check, now) {
  if (!check || !check.fatal) {
    fatalFormKey = '';
    fatalFormSince = 0;
    return false;
  }
  var key = check.fatalKey || check.message;
  if (fatalFormKey !== key) {
    fatalFormKey = key;
    fatalFormSince = now;
    return false;
  }
  return now - fatalFormSince >= FATAL_FORM_GRACE_MS;
}

// ---------- Composed-run recording ----------
// The live camera is painted into the game canvas below. A smaller hidden canvas
// mirrors completed frames so clips contain the player, bird, pipes, and HUD
// without recording an unnecessarily large device-resolution surface.
var recordingCanvas = null;
var recordingCtx = null;
var recordingStream = null;
var runRecorder = null;
var recordingSessionId = null;
var recordingMimeType = '';
var recordingExtension = 'webm';
var recordingChunkIndex = 0;
var recordingReadChain = Promise.resolve();
var recordingReadFailed = false;
var recordingActive = false;
var recordingAwaitingPlayFrame = false;
var lastRecordingFrameTime = 0;

function recordingError(message) {
  postRN({
    type: 'recordingerror',
    sessionId: recordingSessionId,
    message: String(message)
  });
}

function recordingDimensions() {
  var scale = Math.min(2, 720 / Math.max(1, W), 1280 / Math.max(1, H));
  var width = Math.max(2, Math.floor((W * scale) / 2) * 2);
  var height = Math.max(2, Math.floor((H * scale) / 2) * 2);
  return { width: width, height: height };
}

function supportedRecordingTypes() {
  var candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  var supported = [];
  for (var i = 0; i < candidates.length; i++) {
    var candidate = candidates[i];
    if (!window.MediaRecorder || typeof window.MediaRecorder.isTypeSupported !== 'function' ||
        window.MediaRecorder.isTypeSupported(candidate)) {
      supported.push(candidate);
    }
  }
  return supported;
}

function makeRunRecorder(stream) {
  var candidates = supportedRecordingTypes();
  var lastError = null;
  for (var i = 0; i < candidates.length; i++) {
    try {
      return new window.MediaRecorder(stream, {
        mimeType: candidates[i],
        videoBitsPerSecond: 2000000
      });
    } catch (err) {
      lastError = err;
    }
  }
  try {
    return new window.MediaRecorder(stream, { videoBitsPerSecond: 2000000 });
  } catch (fallbackError) {
    throw lastError || fallbackError;
  }
}

function blobToBase64(blob) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      var result = String(reader.result || '');
      var comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = function() {
      reject(reader.error || new Error('Unable to read a recorded video chunk.'));
    };
    reader.readAsDataURL(blob);
  });
}

function queueRecordingChunk(blob) {
  if (!blob || blob.size <= 0) { return; }
  var index = recordingChunkIndex;
  recordingChunkIndex += 1;
  recordingReadChain = recordingReadChain.then(function() {
    return blobToBase64(blob).then(function(data) {
      postRN({
        type: 'recordingchunk',
        sessionId: recordingSessionId,
        index: index,
        mimeType: recordingMimeType,
        extension: recordingExtension,
        data: data
      });
    });
  }).catch(function(err) {
    recordingReadFailed = true;
    recordingError(err);
  });
}

function releaseRecordingStream() {
  if (!recordingStream || typeof recordingStream.getTracks !== 'function') { return; }
  var tracks = recordingStream.getTracks();
  for (var i = 0; i < tracks.length; i++) {
    try { tracks[i].stop(); } catch (e) {}
  }
  recordingStream = null;
}

function startRunRecording() {
  if (!CONFIG.recordRun || recordingActive || runRecorder) { return; }
  recordingSessionId = String(Date.now()) + '-' + String(Math.random()).slice(2, 10);

  if (!canvas || typeof canvas.captureStream !== 'function') {
    recordingError('Composed video recording is not supported on this device.');
    return;
  }
  if (typeof window.MediaRecorder === 'undefined') {
    recordingError('Video recording is not supported on this device.');
    return;
  }

  try {
    var dimensions = recordingDimensions();
    recordingCanvas = document.createElement('canvas');
    recordingCanvas.width = dimensions.width;
    recordingCanvas.height = dimensions.height;
    recordingCtx = recordingCanvas.getContext('2d', { alpha: false });
    if (!recordingCtx) { throw new Error('Unable to create the recording surface.'); }
    recordingStream = recordingCanvas.captureStream(24);
    runRecorder = makeRunRecorder(recordingStream);
    recordingMimeType = runRecorder.mimeType || 'video/webm';
    recordingExtension = recordingMimeType.toLowerCase().indexOf('mp4') >= 0 ? 'mp4' : 'webm';
    recordingChunkIndex = 0;
    recordingReadChain = Promise.resolve();
    recordingReadFailed = false;
    recordingAwaitingPlayFrame = true;
    lastRecordingFrameTime = 0;

    runRecorder.ondataavailable = function(event) {
      queueRecordingChunk(event.data);
    };
    runRecorder.onerror = function(event) {
      recordingReadFailed = true;
      recordingError(event && event.error ? event.error : 'The video recorder failed.');
    };
    runRecorder.onstop = function() {
      var completedSessionId = recordingSessionId;
      var completedMimeType = recordingMimeType;
      var completedExtension = recordingExtension;
      var completedChunkCount = recordingChunkIndex;
      recordingActive = false;
      recordingAwaitingPlayFrame = false;
      releaseRecordingStream();
      recordingReadChain.then(function() {
        if (!recordingReadFailed) {
          postRN({
            type: 'recordingcomplete',
            sessionId: completedSessionId,
            mimeType: completedMimeType,
            extension: completedExtension,
            chunkCount: completedChunkCount
          });
        }
        runRecorder = null;
        recordingCanvas = null;
        recordingCtx = null;
      });
    };

    runRecorder.start(1000);
    recordingActive = true;
    postRN({
      type: 'recordingstart',
      sessionId: recordingSessionId,
      mimeType: recordingMimeType,
      extension: recordingExtension,
      width: dimensions.width,
      height: dimensions.height
    });
  } catch (err) {
    recordingActive = false;
    runRecorder = null;
    recordingCanvas = null;
    recordingCtx = null;
    releaseRecordingStream();
    recordingError(err);
  }
}

function copyComposedRecordingFrame(now, isPlayableFrame) {
  if (!recordingActive || !recordingCtx || !recordingCanvas) { return; }
  if (recordingAwaitingPlayFrame) {
    if (!isPlayableFrame) { return; }
    recordingAwaitingPlayFrame = false;
  }
  if (lastRecordingFrameTime && now - lastRecordingFrameTime < 1000 / 24) { return; }
  lastRecordingFrameTime = now;
  recordingCtx.drawImage(
    canvas,
    0,
    0,
    canvas.width,
    canvas.height,
    0,
    0,
    recordingCanvas.width,
    recordingCanvas.height
  );
}

function stopRunRecording() {
  if (!runRecorder) { return; }
  recordingActive = false;
  try {
    if (runRecorder.state !== 'inactive') { runRecorder.stop(); }
  } catch (err) {
    recordingReadFailed = true;
    recordingError(err);
    releaseRecordingStream();
  }
}

// ---------- Difficulty ----------
function currentSpeed() {
  if (CONFIG.endless) { return Math.min(CONFIG.speed + score * 5, 420); }
  return CONFIG.speed;
}
function currentGapFrac() {
  if (CONFIG.endless) { return Math.max(0.2, CONFIG.gapFrac - score * 0.0022); }
  return CONFIG.gapFrac;
}
function currentSpawnMs() {
  var base = CONFIG.endless ? Math.max(1500, CONFIG.spawnMs - score * 12) : CONFIG.spawnMs;
  return base * (CONFIG.speed / currentSpeed());
}

function spawnPipe(now) {
  var gapH = currentGapFrac() * H;
  var margin = gapH * 0.6 + 30;
  var gapC = margin + Math.random() * Math.max(40, H - margin * 2);
  var moving = CONFIG.endless ? score >= 20 : CONFIG.movingPipes;
  var amp = CONFIG.endless ? Math.min(90, Math.max(0, (score - 20) * 4)) : CONFIG.moveAmp;
  pipes.push({ x: W + 50, w: Math.max(60, W * 0.09), gapC0: gapC, gapC: gapC, gapH: gapH, passed: false, moving: moving, amp: amp, phase: Math.random() * Math.PI * 2, born: now });
}

function burst(x, y, color, n) {
  for (var i = 0; i < n; i++) {
    var ang = Math.random() * Math.PI * 2;
    var sp = 60 + Math.random() * 180;
    particles.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.6 + Math.random() * 0.4, t: 0, color: color, r: 2 + Math.random() * 3 });
  }
}

function birdX() { return W * 0.3; }
function birdBaseRadius() {
  return Math.max(${BIRD_RADIUS_MIN}, Math.min(${BIRD_RADIUS_MAX}, H * ${BIRD_RADIUS_HEIGHT_FACTOR}));
}
function birdRadius() {
  // Every stage shares one draw box; its transparent raster canvas contains the
  // intended silhouette growth. Collision size remains independent below.
  return birdBaseRadius();
}
function birdCollisionRadius() { return birdBaseRadius() * ${BIRD_COLLISION_RADIUS_FACTOR}; }
function birdScreenY() {
  var m = birdRadius() + 8;
  return m + (1 - birdNorm) * (H - m * 2);
}

function endGame() {
  if (gameOverSent) { return; }
  gameOverSent = true;
  state = 'over';
  beep(140, 0.4, 'sawtooth', 0.1);
  burst(birdX(), birdScreenY(), CONFIG.bird.body, 26);
  stopRunRecording();
  postRN({
    type: 'gameover',
    score: score,
    pushups: pushups,
    tutSeconds: tutSeconds,
    unreportedTutSeconds: Math.max(0, tutSeconds - tutReportedSeconds)
  });
}

// ---------- Drawing ----------
function drawBackground() {
  var showingFormCalibration = usesExperimentalFormTracking() &&
    (state === 'waitTop' || state === 'waitBottom');
  if ((CONFIG.backgroundMode === 'camera' || showingFormCalibration) &&
      video && video.readyState >= 2 &&
      video.videoWidth > 0 && video.videoHeight > 0) {
    var sourceWidth = video.videoWidth;
    var sourceHeight = video.videoHeight;
    var sourceAspect = sourceWidth / sourceHeight;
    var targetAspect = W / Math.max(1, H);
    var sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;
    var dx = 0, dy = 0, dw = W, dh = H;
    if (showingFormCalibration) {
      var containScale = Math.min(W / sourceWidth, H / sourceHeight);
      dw = sourceWidth * containScale;
      dh = sourceHeight * containScale;
      dx = (W - dw) / 2;
      dy = (H - dh) / 2;
      ctx.fillStyle = '#061B42';
      ctx.fillRect(0, 0, W, H);
    } else if (sourceAspect > targetAspect) {
      sw = sourceHeight * targetAspect;
      sx = (sourceWidth - sw) / 2;
    } else {
      sh = sourceWidth / targetAspect;
      sy = (sourceHeight - sh) / 2;
    }
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
    ctx.fillStyle = 'rgba(4,15,38,0.12)';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, CONFIG.sky1);
  grad.addColorStop(1, CONFIG.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    var cx = c.x * W, cy = c.y * H, cs = c.s * 26;
    ctx.beginPath();
    ctx.arc(cx, cy, cs, 0, Math.PI * 2);
    ctx.arc(cx + cs * 0.9, cy + cs * 0.25, cs * 0.75, 0, Math.PI * 2);
    ctx.arc(cx - cs * 0.9, cy + cs * 0.3, cs * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(0, H - 14, W, 14);
}

function drawPipes() {
  var capH = 16;
  for (var i = 0; i < pipes.length; i++) {
    var p = pipes[i];
    var topEnd = p.gapC - p.gapH / 2;
    var botStart = p.gapC + p.gapH / 2;
    ctx.fillStyle = CONFIG.pipe;
    ctx.fillRect(p.x, 0, p.w, topEnd);
    ctx.fillRect(p.x, botStart, p.w, H - botStart);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(p.x - 4, topEnd - capH, p.w + 8, capH);
    ctx.fillRect(p.x - 4, botStart, p.w + 8, capH);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(p.x + 6, 0, 8, Math.max(0, topEnd - capH));
    ctx.fillRect(p.x + 6, botStart + capH, 8, Math.max(0, H - botStart - capH));
  }
}

// ---------- Canonical evolution bird sprite ----------
var birdSprite = new Image();
var birdSpriteReady = false;
var gameKickedOff = false;
birdSprite.onload = function() {
  birdSpriteReady = true;
  kickoff();
};
birdSprite.onerror = function() {
  showOverlay('Unable to load your bird.<br><small>Return and try again.</small>', false);
  postRN({ type: 'asseterror', asset: 'bird' });
};
birdSprite.src = CONFIG.birdImageDataUri || '';

function drawBird(now) {
  var x = birdX(), y = birdScreenY(), r = birdRadius();
  var vy = (birdNorm - prevBirdNorm) * 60;
  var tilt = Math.max(-0.5, Math.min(0.5, -vy * 1.4));
  var flightLift = Math.sin(now / 100) * 0.025;
  var visualSize = r * 3.5;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt + flightLift);

  if (birdSpriteReady) {
    ctx.drawImage(
      birdSprite,
      -visualSize * 0.5,
      -visualSize * 0.5,
      visualSize,
      visualSize
    );
  }

  ctx.restore();
}

function drawParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.t += dt;
    if (p.t > p.life) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 6;
  ctx.font = '900 46px -apple-system, sans-serif';
  ctx.strokeText(String(score), W / 2, 70);
  ctx.fillText(String(score), W / 2, 70);
  ctx.font = '800 15px -apple-system, sans-serif';
  ctx.lineWidth = 4;

  if (CONFIG.target > 0) {
    var tText = 'Target: ' + CONFIG.target;
    ctx.strokeText(tText, W / 2, 98);
    ctx.fillStyle = score >= CONFIG.target ? '#4ADE80' : '#FFFFFF';
    ctx.fillText(tText, W / 2, 98);
  }
}

function drawCountdownNumber(now) {
  var remaining = Math.ceil((countdownEnd - now) / 1000);
  if (remaining < 1) { remaining = 1; }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 8;
  ctx.font = '900 110px -apple-system, sans-serif';
  ctx.strokeText(String(remaining), W / 2, H / 2 + 30);
  ctx.fillText(String(remaining), W / 2, H / 2 + 30);
}

function collides() {
  // Evolution changes the drawing only. Every stage keeps the same fair hitbox.
  var bx = birdX(), by = birdScreenY(), r = birdCollisionRadius();
  for (var i = 0; i < pipes.length; i++) {
    var p = pipes[i];
    if (bx + r < p.x || bx - r > p.x + p.w) { continue; }
    var topEnd = p.gapC - p.gapH / 2;
    var botStart = p.gapC + p.gapH / 2;
    if (by - r < topEnd || by + r > botStart) { return true; }
  }
  return false;
}

// ---------- Main loop ----------
function computeNorm() {
  var norm;
  var trkSmooth = getTrackYSmooth();
  if (topY !== null && bottomY !== null && trkSmooth !== null && bottomY - topY > 0.01) {
    norm = (bottomY - trkSmooth) / (bottomY - topY);
  } else { norm = birdNorm; }
  if (norm < 0) { norm = 0; }
  if (norm > 1) { norm = 1; }
  return norm;
}

function topCalibrationMessage() {
  if (CONFIG.exercise === 'squats') {
    return 'STEP 1 OF 2<br><br>Stand <b>TALL</b><br>Feet shoulder-width apart, head up<br><br>Hold still…';
  }
  if (CONFIG.exercise === 'pullups') {
    if (usesExperimentalFormTracking()) {
      return 'STEP 1 OF 2<br><br>Lift your feet and pull to your <b>HIGHEST</b> point<br>Bent knees are fine<br><br>Hold still…';
    }
    return 'STEP 1 OF 2<br><br>Pull to your <b>HIGHEST</b> point<br>Chin at or above the bar<br><br>Hold still…';
  }
  if (CONFIG.exercise === 'lateralraise') {
    return 'STEP 1 OF 2<br><br>Raise arms to <b>SHOULDER HEIGHT</b><br>Parallel to the floor<br><br>Hold still…';
  }
  if (CONFIG.exercise === 'biceps') {
    return 'STEP 1 OF 2<br><br>Curl to the <b>TOP</b><br>Wrists near your shoulders<br><br>Hold still…';
  }
  if (CONFIG.exercise === 'shoulderpress') {
    return 'STEP 1 OF 2<br><br>Press <b>OVERHEAD</b> fully<br>Arms locked straight above you<br><br>Hold still…';
  }
  return 'STEP 1 OF 2<br><br>Hold the <b>TOP</b> of a push-up<br>Arms fully extended<br><br>Hold still…';
}

function loop(now) {
  var dt = lastFrame ? Math.min(0.035, (now - lastFrame) / 1000) : 0.016;
  var drewPlayableRecordingFrame = false;
  lastFrame = now;

  for (var i = 0; i < clouds.length; i++) {
    clouds[i].x -= (clouds[i].v * dt) / Math.max(1, W);
    if (clouds[i].x < -0.15) { clouds[i].x = 1.12; clouds[i].y = 0.08 + Math.random() * 0.3; }
  }

  drawBackground();
  var norm = computeNorm();

  if (state === 'waitTop' || state === 'waitBottom') {
    prevBirdNorm = birdNorm;
    drawBird(now);
    var calibrationFormCheck = usesExperimentalFormTracking()
      ? validateExperimentalCalibration(state === 'waitTop' ? 'top' : 'bottom')
      : { valid: true, message: '' };
    if (state === 'waitTop' && now < calibrationReadyAt) {
      var delaySeconds = Math.max(1, Math.ceil((calibrationReadyAt - now) / 1000));
      var preparationMessage = usesExperimentalFormTracking() && CONFIG.exercise === 'pullups'
        ? 'PULL-UP SETUP<br><br>Keep both feet on the floor<br>and hold the bar overhead<br><br><small>Learning floor position · ' + delaySeconds + '…</small>'
        : topCalibrationMessage() + '<br><small>Calibration begins in ' + delaySeconds + '…</small>';
      showOverlay(preparationMessage, true);
      setProgress(0);
      stabBuf = [];
    } else if (!calibrationFormCheck.valid) {
      showOverlay(calibrationFormCheck.message, false);
      setProgress(0);
      stabBuf = [];
    } else if (getTrackY() !== null && trackingFresh()) {
      var prog = stabilityProgress(getTrackY(), now);
      if (state === 'waitTop') {
        showOverlay(topCalibrationMessage(), true);
        setProgress(prog);
        if (prog >= 1) {
          topY = stabAverage(); stabBuf = [];
          saveExperimentalCalibration('top');
          beep(660, 0.15, 'sine', 0.08);
          state = 'waitBottom';
        }
      } else {
        var botMsg;
        if (CONFIG.exercise === 'squats') {
          botMsg = 'STEP 2 OF 2<br><br>Lower to a <b>DEEP SQUAT</b><br>Thighs parallel to the floor<br><br>Hold still…';
        } else if (CONFIG.exercise === 'pullups') {
          botMsg = usesExperimentalFormTracking()
            ? 'STEP 2 OF 2<br><br>Lower to a comfortable <b>DEAD HANG</b><br>Keep feet clear, bent knees are fine<br><br>Hold still…'
            : 'STEP 2 OF 2<br><br>Lower to a full <b>DEAD HANG</b><br>Arms completely locked straight<br><br>Hold still…';
        } else if (CONFIG.exercise === 'lateralraise') {
          botMsg = 'STEP 2 OF 2<br><br>Lower arms to your <b>SIDES</b><br>Hands near hips<br><br>Hold still…';
        } else if (CONFIG.exercise === 'biceps') {
          botMsg = 'STEP 2 OF 2<br><br>Lower to <b>FULLY EXTENDED</b><br>Arms straight at your sides<br><br>Hold still…';
        } else if (CONFIG.exercise === 'shoulderpress') {
          botMsg = 'STEP 2 OF 2<br><br>Lower to <b>SHOULDER HEIGHT</b><br>Elbows at roughly 90 degrees<br><br>Hold still…';
        } else {
          botMsg = 'STEP 2 OF 2<br><br>Lower to the <b>BOTTOM</b> of a push-up<br>Chest near the floor<br><br>Hold still…';
        }
        showOverlay(botMsg, true);
        setProgress(prog);
        if (prog >= 1) {
          var candidate = stabAverage();
          if (candidate !== null && topY !== null && candidate - topY > 0.06) {
            bottomY = candidate; stabBuf = [];
            saveExperimentalCalibration('bottom');
            beep(880, 0.18, 'sine', 0.08);
            postRN({ type: 'calibrated' });
            countdownEnd = now + 3000;
            hideOverlay();
            state = 'countdown';
          } else {
            stabBuf = [];
            var tooSmallMsg;
            if (CONFIG.exercise === 'squats') {
              tooSmallMsg = 'Range too small!<br><br>Move closer to the camera<br>then hold a <b>DEEP SQUAT</b> again.';
            } else if (CONFIG.exercise === 'pullups') {
              tooSmallMsg = 'Range too small!<br><br>Lower to a full <b>DEAD HANG</b><br>arms completely locked — then hold still.';
            } else if (CONFIG.exercise === 'lateralraise') {
              tooSmallMsg = 'Range too small!<br><br>Make sure both wrists are visible<br>then lower arms to your <b>SIDES</b> and hold.';
            } else if (CONFIG.exercise === 'biceps') {
              tooSmallMsg = 'Range too small!<br><br>Fully extend arms at your sides<br>and <b>HOLD</b> that position.';
            } else if (CONFIG.exercise === 'shoulderpress') {
              tooSmallMsg = 'Range too small!<br><br>Lower to shoulder height<br>and <b>HOLD</b> that position.';
            } else {
              tooSmallMsg = 'Range too small!<br><br>Move closer to the camera<br>then hold the <b>BOTTOM</b> position again.';
            }
            showOverlay(tooSmallMsg, true);
          }
        }
      }
    } else {
      var frameMsg;
      if (CONFIG.exercise === 'squats') {
        frameMsg = 'Get your head and body in frame<br><small>Place phone on the floor or a chair, 1.5–2m in front</small>';
      } else if (CONFIG.exercise === 'pullups') {
        frameMsg = 'Get in frame — head and arms visible<br><small>Place phone on a chair or higher, facing you</small>';
      } else if (CONFIG.exercise === 'lateralraise') {
        frameMsg = 'Get in frame — arms and torso visible<br><small>Place phone on a chair or higher, about 2m in front</small>';
      } else if (CONFIG.exercise === 'biceps') {
        frameMsg = 'Get in frame — arms and torso visible<br><small>Place phone on a chair or higher, 1–1.5m in front</small>';
      } else if (CONFIG.exercise === 'shoulderpress') {
        frameMsg = 'Get in frame — arms raised must be visible<br><small>Place phone on a chair or higher, 1.5–2m in front</small>';
      } else {
        frameMsg = 'Get your head and shoulders in frame<br><small>Place phone 1–1.5m in front of you on the floor</small>';
      }
      showOverlay(frameMsg, false);
    }
  } else if (state === 'countdown') {
    prevBirdNorm = birdNorm;
    birdNorm += (norm - birdNorm) * Math.min(1, dt * 16);
    drawBird(now);
    drawCountdownNumber(now);
    if (now >= countdownEnd) {
      state = 'play';
      lastSpawn = now - currentSpawnMs() + 600;
      startRunRecording();
      beep(990, 0.2, 'sine', 0.08);
    }
  } else if (state === 'play') {
    prevBirdNorm = birdNorm;
    birdNorm += (norm - birdNorm) * Math.min(1, dt * 16);
    updatePushups(norm);
    var gameplayFormCheck = usesExperimentalFormTracking()
      ? validateExperimentalGameplay(norm)
      : { valid: true, message: '' };
    if (fatalFormFailureConfirmed(gameplayFormCheck, now)) {
      endGame();
      return;
    }

    // Active training/play time. Pose/form verification is not implemented yet.
    tutSeconds += dt;
    while (tutSeconds - tutReportedSeconds >= 5) {
      tutReportedSeconds += 5;
      postRN({ type: 'tut', seconds: 5 });
    }

    // Hard cap at maxScore (prevents farming — non-final levels only)
    if (CONFIG.maxScore > 0 && score >= CONFIG.maxScore) {
      endGame();
      return;
    }

    if (!trackingFresh() || !gameplayFormCheck.valid) {
      state = 'lost';
      var isWristEx2 = CONFIG.exercise === 'lateralraise' || CONFIG.exercise === 'biceps' || CONFIG.exercise === 'shoulderpress';
      var lostMsg = !gameplayFormCheck.valid
        ? gameplayFormCheck.message
        : CONFIG.exercise === 'pullups'
          ? 'Tracking lost<br><br><b>Re-center in frame</b><br>Return to your hang — game resumes automatically.'
          : isWristEx2
            ? 'Tracking lost<br><br><b>Re-center in frame</b><br>Face camera and hold still — game resumes automatically.'
            : 'Tracking lost<br><br><b>Re-center in frame</b><br>Hold your position — game resumes automatically.';
      showOverlay(lostMsg, false);
    } else {
      if (now - lastSpawn > currentSpawnMs()) { lastSpawn = now; spawnPipe(now); }
      var speed = currentSpeed();
      for (var pi = pipes.length - 1; pi >= 0; pi--) {
        var p = pipes[pi];
        p.x -= speed * dt;
        if (p.moving && p.amp > 0) {
          var mrange = p.gapH * 0.55;
          p.gapC = p.gapC0 + Math.sin((now - p.born) / 1000 * 1.6 + p.phase) * Math.min(p.amp, mrange);
        }
        if (!p.passed && p.x + p.w < birdX()) {
          p.passed = true; score += 1;
          beep(760 + Math.min(score * 6, 300), 0.1, 'sine', 0.07);
          burst(birdX() + 20, birdScreenY(), '#FFFFFF', 10);
          postRN({ type: 'score', score: score });
        }
        if (p.x + p.w < -60) { pipes.splice(pi, 1); }
      }
      if (collides()) { endGame(); }
    }
    drawPipes(); drawParticles(dt); drawBird(now); drawHUD();
    drewPlayableRecordingFrame = true;
  } else if (state === 'lost') {
    drawPipes(); drawParticles(0); drawBird(now); drawHUD();
    var resumeFormCheck = usesExperimentalFormTracking()
      ? validateExperimentalGameplay(norm)
      : { valid: true, message: '' };
    if (fatalFormFailureConfirmed(resumeFormCheck, now)) {
      endGame();
      return;
    } else if (trackingFresh() && resumeFormCheck.valid) {
      resumeEnd = now + 1200;
      state = 'resume';
      showOverlay('Locked on!<br>Resuming…', false);
    } else if (trackingFresh() && !resumeFormCheck.valid) {
      showOverlay(resumeFormCheck.message, false);
    }
  } else if (state === 'resume') {
    prevBirdNorm = birdNorm;
    birdNorm += (norm - birdNorm) * Math.min(1, dt * 16);
    drawPipes(); drawBird(now); drawHUD();
    if (now >= resumeEnd) { hideOverlay(); lastSpawn = now; state = 'play'; }
  } else if (state === 'over') {
    drawPipes(); drawParticles(dt); drawHUD();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
  } else {
    prevBirdNorm = birdNorm;
    drawBird(now);
  }

  copyComposedRecordingFrame(now, drewPlayableRecordingFrame);
  requestAnimationFrame(loop);
}

// ---------- Kickoff ----------
function kickoff() {
  if (gameKickedOff) { return; }
  gameKickedOff = true;
  requestAnimationFrame(loop);
  initCameraFlow();
}
`;
