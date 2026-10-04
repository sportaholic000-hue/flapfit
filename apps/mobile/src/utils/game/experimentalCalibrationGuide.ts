// Branch-only visual experiment. This module never supplies tracking input.
export function showExperimentalCalibrationGuide(platform: string | undefined, exercise: string, backgroundMode: string) {
  return platform === 'android' && exercise === 'lateralraise' && backgroundMode === 'camera';
}
const raisedArms = 'M110 43 L130 43 L134 54 C145 54 150 57 157 58 L215 60 Q224 60 224 67 Q224 74 215 74 L151 72 L145 71 L139 125 L141 150 L151 253 Q153 263 143 265 Q133 267 131 256 L120 174 L109 256 Q107 267 97 265 Q87 263 89 253 L99 150 L101 125 L95 71 L89 72 L25 74 Q16 74 16 67 Q16 60 25 60 L83 58 C90 57 95 54 106 54 Z';
const loweredArms = 'M110 43 L130 43 L134 54 Q148 55 151 69 L166 137 Q168 147 160 149 Q151 151 149 140 L140 96 L139 125 L141 150 L151 253 Q153 263 143 265 Q133 267 131 256 L120 174 L109 256 Q107 267 97 265 Q87 263 89 253 L99 150 L101 125 L100 96 L91 140 Q89 151 80 149 Q72 147 74 137 L89 69 Q92 55 106 54 Z';
export const CALIBRATION_GUIDE_STYLE = `
#calibration-pose-guide[hidden] { display: none; }
#calibration-pose-guide { position: fixed; inset: 8px 0 178px; z-index: 9; pointer-events: none; display: flex; align-items: center; justify-content: center; opacity: 1; transition: opacity 350ms ease-out; }
#calibration-pose-guide[data-phase="accepted"] { opacity: 0; }
#calibration-pose-guide svg { display: block; width: 96vw; max-width: 540px; height: 100%; overflow: visible; }
#calibration-pose-guide .pose-up, #calibration-pose-guide .pose-down { display: none; }
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
export const CALIBRATION_GUIDE_MARKUP = `<div id="calibration-pose-guide" hidden aria-hidden="true">
<svg viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg" focusable="false">
  <g fill="#67E8F9" fill-opacity="0.32" stroke="#FFE44D" stroke-opacity="0.88" stroke-width="2.6" stroke-linejoin="round">
    <circle cx="120" cy="24" r="14" />
    <path class="pose-up" d="${raisedArms}" />
    <path class="pose-down" d="${loweredArms}" />
  </g>
</svg>
</div>`;
// Observe calibration success already recorded by the game. Timers finish only
// the fade; they cannot accept a pose, change a measurement, or advance state.
export const CALIBRATION_GUIDE_SCRIPT = `
(function () {
  var guide = document.getElementById('calibration-pose-guide');
  var overlay = document.getElementById('overlay');
  var message = document.getElementById('msg');
  var previousState = null;
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
  function showPose(pose) {
    guide.setAttribute('data-pose', pose);
    guide.setAttribute('data-phase', 'holding');
    guide.hidden = false;
    overlay.classList.add('has-calibration-pose');
  }
  function fadeAcceptedPose(nextState, nextPose) {
    guide.setAttribute('data-phase', 'accepted');
    overlay.classList.add('pose-transitioning');
    fadeTimer = setTimeout(function () {
      fadeTimer = null;
      overlay.classList.remove('pose-transitioning');
      if (state !== nextState) { return; }
      if (nextPose) { showPose(nextPose); } else { hideGuide(); }
    }, fadeMs);
  }
  function updatePoseExample() {
    if (state === previousState) { return; }
    var from = previousState;
    previousState = state;
    cancelFade();
    if (state !== 'countdown') { countdownRevealAt = 0; }
    if (state === 'waitTop') {
      showPose('waitTop');
    } else if (state === 'waitBottom') {
      if (from === 'waitTop' && topY !== null && !guide.hidden) {
        fadeAcceptedPose('waitBottom', 'waitBottom');
      } else { showPose('waitBottom'); }
    } else if (state === 'countdown' && from === 'waitBottom' && bottomY !== null && !guide.hidden) {
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
  updatePoseExample();
  window.addEventListener('pagehide', function () {
    observer.disconnect();
    cancelFade();
    hideGuide();
    drawCountdownNumber = originalDrawCountdown;
  }, { once: true });
})();
`;
