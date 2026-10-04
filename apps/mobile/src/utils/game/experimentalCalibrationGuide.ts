import { CALIBRATION_ARTWORK, CALIBRATION_DETAILS } from './calibrationGuideArtwork';

// Branch-only visual experiment. This module never supplies tracking input.
export function showExperimentalCalibrationGuide(platform: string | undefined, exercise: string, backgroundMode: string) {
  return platform === 'android' && supportedExercises.includes(exercise) && backgroundMode === 'camera';
}
const supportedExercises = ['pushups', 'squats', 'pullups', 'lateralraise', 'biceps', 'shoulderpress'];
const artwork = (pose: keyof typeof CALIBRATION_ARTWORK) => {
  const detail = CALIBRATION_DETAILS[pose as keyof typeof CALIBRATION_DETAILS];
  return '<path fill-rule="evenodd" d="' + CALIBRATION_ARTWORK[pose] + '"/>' +
    (detail ? '<path fill="none" stroke-width="1.3" stroke-linecap="round" d="' + detail + '"/>' : '');
};
type GuidePoses = { top: string; bottom: string; reach?: string; viewBox?: string };
// Only presentation changes here. Pose order and acceptance still come from the game.
const exercisePoses: Record<string, GuidePoses> = {
  lateralraise: { top: artwork('lateralTop'), bottom: artwork('lateralBottom') },
  biceps: { top: artwork('curlTop'), bottom: artwork('curlBottom') },
  shoulderpress: { top: artwork('pressTop'), bottom: artwork('pressBottom') },
  squats: { top: artwork('squatTop'), bottom: artwork('squatBottom') },
  pushups: { top: artwork('pushupTop'), bottom: artwork('pushupBottom') },
  pullups: { top: artwork('pullupTop'), bottom: artwork('pullupBottom'), reach: artwork('pullupReach') },
};
export function buildCalibrationGuideMarkup(exercise: string) {
  const poses = exercisePoses[exercise];
  if (!poses) { return ''; }
  return '<div id="calibration-pose-guide" hidden aria-hidden="true">' +
    '<svg viewBox="' + (poses.viewBox || '0 -28 240 310') + '" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
    '<g fill="#67E8F9" fill-opacity="0.32" stroke="#FFE44D" stroke-opacity="0.88" stroke-width="2.6" stroke-linejoin="round">' +
    '<g class="pose-up">' + poses.top + '</g><g class="pose-down">' + poses.bottom + '</g>' +
    (poses.reach ? '<g class="pose-reach">' + poses.reach + '</g>' : '') + '</g></svg></div>';
}

export const CALIBRATION_GUIDE_STYLE = `
#calibration-pose-guide[hidden] { display: none; }
#calibration-pose-guide { position: fixed; inset: 8px 0 178px; z-index: 9; pointer-events: none; display: flex; align-items: center; justify-content: center; opacity: 1; transition: opacity 350ms ease-out; }
#calibration-pose-guide[data-phase="accepted"] { opacity: 0; }
#calibration-pose-guide svg { display: block; width: 96vw; max-width: 540px; height: 100%; overflow: visible; }
#calibration-pose-guide .pose-up, #calibration-pose-guide .pose-down, #calibration-pose-guide .pose-reach { display: none; }
#calibration-pose-guide[data-pose="reach"] .pose-reach,
#calibration-pose-guide[data-pose="waitTop"] .pose-up,
#calibration-pose-guide[data-pose="waitBottom"] .pose-down { display: block; }
#overlay.has-calibration-pose { align-items: flex-end; box-sizing: border-box; padding: 10px 12px; }
#overlay.has-calibration-pose #card { box-sizing: border-box; width: min(94vw, 460px); max-width: 100%; padding: 10px 16px; border-radius: 14px; background: rgba(15,23,42,0.72); font-size: clamp(14px, 3.8vw, 17px); line-height: 1.25; }
#overlay.has-calibration-pose #card small { font-size: 12px; }
#overlay.has-calibration-pose #bar { height: 9px; margin-top: 9px; }
#overlay.pose-transitioning #card { opacity: 0; }
@media (max-height: 480px) {
  #calibration-pose-guide { bottom: 164px; }
  #overlay.has-calibration-pose #card { padding: 8px 12px; font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) {
  #calibration-pose-guide { transition: none; }
}
`;
// Observe calibration success already recorded by the game. Timers finish only
// the fade; they cannot accept a pose, change a measurement, or advance state.
export const CALIBRATION_GUIDE_SCRIPT = `
(function () {
  var guide = document.getElementById('calibration-pose-guide');
  var overlay = document.getElementById('overlay');
  var message = document.getElementById('msg');
  var previousPose = null;
  var card = document.getElementById('card');
  var fadeTimer = null;
  var countdownRevealAt = 0;
  var fadeMs = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350;
  function cancelFade() {
    if (fadeTimer !== null) { clearTimeout(fadeTimer); fadeTimer = null; }
    overlay.classList.remove('pose-transitioning');
  }
  function hideGuide() {
    guide.hidden = true;
    overlay.classList.remove('has-calibration-pose');
  }
  function fitGuideAboveInstructions() {
    if (!guide.hidden) {
      guide.style.bottom = Math.max(window.innerHeight <= 480 ? 164 : 178, card.getBoundingClientRect().height + 32) + 'px';
    }
  }
  function currentPose() {
    if (state === 'waitTop' && CONFIG.exercise === 'pullups' &&
        usesExperimentalFormTracking() && !getPullupSupportSetup().ready) { return 'reach'; }
    return state;
  }
  function showPose(pose) {
    guide.setAttribute('data-pose', pose);
    guide.setAttribute('data-phase', 'holding');
    guide.hidden = false;
    overlay.classList.add('has-calibration-pose');
    fitGuideAboveInstructions();
  }
  function fadeAcceptedPose(nextState, nextPose) {
    guide.setAttribute('data-phase', 'accepted');
    overlay.classList.add('pose-transitioning');
    fadeTimer = setTimeout(function () {
      fadeTimer = null;
      overlay.classList.remove('pose-transitioning');
      if (currentPose() !== nextState) { return; }
      if (nextPose) { showPose(nextPose); } else { hideGuide(); }
    }, fadeMs);
  }
  function updatePoseExample() {
    var pose = currentPose();
    if (pose === previousPose) { return; }
    var from = previousPose;
    previousPose = pose;
    cancelFade();
    if (pose !== 'countdown') { countdownRevealAt = 0; }
    if (pose === 'reach') {
      showPose('reach');
    } else if (pose === 'waitTop') {
      if (from === 'reach' && getPullupSupportSetup().ready && !guide.hidden) {
        fadeAcceptedPose('waitTop', 'waitTop');
      } else { showPose('waitTop'); }
    } else if (pose === 'waitBottom') {
      if (from === 'waitTop' && topY !== null && !guide.hidden) {
        fadeAcceptedPose('waitBottom', 'waitBottom');
      } else { showPose('waitBottom'); }
    } else if (pose === 'countdown' && from === 'waitBottom' && bottomY !== null && !guide.hidden) {
      countdownRevealAt = performance.now() + fadeMs;
      fadeAcceptedPose('countdown', null);
    } else { hideGuide(); }
  }

  // Presentation only: reveal the existing countdown after the success fade.
  // Its deadline, gameplay start, and calibration logic stay untouched.
  var originalDrawCountdown = drawCountdownNumber;
  drawCountdownNumber = function (now) {
    if (now >= countdownRevealAt) { originalDrawCountdown(now); }
  };
  var observer = new MutationObserver(updatePoseExample);
  observer.observe(message, { childList: true });
  observer.observe(overlay, { attributes: true, attributeFilter: ['style'] });
  var sizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(fitGuideAboveInstructions) : null;
  if (sizeObserver) { sizeObserver.observe(card); }
  updatePoseExample();
  window.addEventListener('pagehide', function () {
    observer.disconnect();
    if (sizeObserver) { sizeObserver.disconnect(); }
    cancelFade();
    hideGuide();
    drawCountdownNumber = originalDrawCountdown;
  }, { once: true });
})();
`;
