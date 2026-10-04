// Branch-only visual experiment. This module never supplies tracking input.
export function showExperimentalCalibrationGuide(platform: string | undefined, exercise: string, backgroundMode: string) {
  return platform === 'android' && exercise === 'lateralraise' && backgroundMode === 'camera';
}
const raisedArms = 'M110 43 L130 43 L134 54 C145 54 150 57 157 58 L215 60 Q224 60 224 67 Q224 74 215 74 L151 72 L145 71 L140 108 L140 119 L148 178 Q150 186 141 188 Q132 190 130 181 L120 140 L110 181 Q108 190 99 188 Q90 186 92 178 L100 119 L100 108 L95 71 L89 72 L25 74 Q16 74 16 67 Q16 60 25 60 L83 58 C90 57 95 54 106 54 Z';
const loweredArms = 'M110 43 L130 43 L134 54 Q147 55 151 66 L166 112 Q169 120 161 123 Q153 125 150 116 L140 86 L140 119 L148 178 Q150 186 141 188 Q132 190 130 181 L120 140 L110 181 Q108 190 99 188 Q90 186 92 178 L100 119 L100 86 L90 116 Q87 125 79 123 Q71 120 74 112 L89 66 Q93 55 106 54 Z';
export const CALIBRATION_GUIDE_STYLE = `
#calibration-pose-guide[hidden] { display: none; }
#calibration-pose-guide { margin: 0 auto 12px; }
#calibration-pose-guide svg { display: block; width: 100%; height: clamp(100px, 24vh, 164px); }
#calibration-pose-guide .pose-up, #calibration-pose-guide .pose-down { display: none; }
#calibration-pose-guide[data-pose="waitTop"] .pose-up,
#calibration-pose-guide[data-pose="waitBottom"] .pose-down { display: block; }
#calibration-pose-guide .pose-caption { margin-top: 3px; font-size: 12px; line-height: 1.2; font-weight: 600; color: #BAE6FD; }
#card.has-calibration-pose { box-sizing: border-box; width: min(88vw, 350px); padding: 18px 22px; font-size: clamp(17px, 4.7vw, 22px); line-height: 1.35; }
#card.has-calibration-pose small { font-size: 15px; }
#card.has-calibration-pose #bar { margin-top: 14px; }
@media (max-height: 480px) {
  #calibration-pose-guide svg { height: 80px; }
  #calibration-pose-guide { margin-bottom: 8px; }
  #card.has-calibration-pose { padding: 12px 18px; font-size: 16px; line-height: 1.25; }
  #card.has-calibration-pose small { font-size: 13px; }
}
`;
export const CALIBRATION_GUIDE_MARKUP = `<div id="calibration-pose-guide" hidden aria-hidden="true">
<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg" focusable="false">
  <g fill="#67E8F9" stroke="#FFE44D" stroke-width="3.5" stroke-linejoin="round">
    <circle cx="120" cy="24" r="14" />
    <path class="pose-up" d="${raisedArms}" />
    <path class="pose-down" d="${loweredArms}" />
  </g>
</svg>
<div class="pose-caption">Example pose · Hold still</div>
</div>`;
// Observe only the instruction UI: no new animation loop, camera work,
// calibration measurements, or writes to the game's state machine.
export const CALIBRATION_GUIDE_SCRIPT = `
(function () {
  var guide = document.getElementById('calibration-pose-guide');
  var card = document.getElementById('card');
  var overlay = document.getElementById('overlay');
  var message = document.getElementById('msg');
  var lastPose = null;
  function updatePoseExample() {
    var pose = overlay.style.display !== 'none' && (state === 'waitTop' || state === 'waitBottom') ? state : '';
    if (pose === lastPose) { return; }
    lastPose = pose;
    guide.hidden = !pose;
    guide.setAttribute('data-pose', pose);
    card.classList.toggle('has-calibration-pose', !!pose);
  }
  var observer = new MutationObserver(updatePoseExample);
  observer.observe(message, { childList: true });
  observer.observe(overlay, { attributes: true, attributeFilter: ['style'] });
  updatePoseExample();
  window.addEventListener('pagehide', function () { observer.disconnect(); }, { once: true });
})();
`;
