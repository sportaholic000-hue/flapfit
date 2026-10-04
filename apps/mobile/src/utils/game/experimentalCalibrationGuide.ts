// Branch-only visual experiment. This module never supplies tracking input.
export function showExperimentalCalibrationGuide(platform: string | undefined, exercise: string, backgroundMode: string) {
  return platform === 'android' && supportedExercises.includes(exercise) && backgroundMode === 'camera';
}
const raisedArms = 'M110 43 L130 43 L134 54 C145 54 150 57 157 58 L215 60 Q224 60 224 67 Q224 74 215 74 L151 72 L145 71 L139 125 L141 150 L151 253 Q153 263 143 265 Q133 267 131 256 L120 174 L109 256 Q107 267 97 265 Q87 263 89 253 L99 150 L101 125 L95 71 L89 72 L25 74 Q16 74 16 67 Q16 60 25 60 L83 58 C90 57 95 54 106 54 Z';
const loweredArms = 'M110 43 L130 43 L134 54 Q148 55 151 69 L166 137 Q168 147 160 149 Q151 151 149 140 L140 96 L139 125 L141 150 L151 253 Q153 263 143 265 Q133 267 131 256 L120 174 L109 256 Q107 267 97 265 Q87 263 89 253 L99 150 L101 125 L100 96 L91 140 Q89 151 80 149 Q72 147 74 137 L89 69 Q92 55 106 54 Z';
const supportedExercises = ['pushups', 'squats', 'pullups', 'lateralraise', 'biceps', 'shoulderpress'];
// Demonstration poses only: these paths never supply targets to the tracker.
const frontLegs = 'L139 125 L141 150 L151 253 Q153 263 143 265 Q133 267 131 256 L120 174 L109 256 Q107 267 97 265 Q87 263 89 253 L99 150 L101 125';
const pressUp = 'M110 43 L130 43 L134 54 L143 54 L153 -8 Q155 -18 163 -16 Q171 -14 169 -5 L160 65 Q159 73 147 77 L141 78 ' + frontLegs + ' L99 78 L93 77 Q81 73 80 65 L71 -5 Q69 -14 77 -16 Q85 -18 87 -8 L97 54 L106 54 Z';
const pressDown = 'M110 43 L130 43 L134 54 L172 56 L172 22 Q172 13 180 13 Q188 13 188 22 L188 65 Q188 73 179 74 L146 73 L141 78 ' + frontLegs + ' L99 78 L94 73 L61 74 Q52 73 52 65 L52 22 Q52 13 60 13 Q68 13 68 22 L68 56 L106 54 Z';
const head = '<circle cx="120" cy="24" r="14" />';
const front = (body: string) => head + '<path d="' + body + '" />';
const ground = '<path d="M40 270 H204" fill="none" stroke-opacity="0.45" stroke-width="2" />';
const bar = '<path d="M35 24 H205" fill="none" stroke-width="5" />';
const squatStand = '<circle cx="125" cy="25" r="14" /><path d="M116 43 L130 42 Q139 45 139 60 L135 125 L140 155 L137 246 L154 251 Q162 254 158 263 L120 263 Q112 262 113 251 L115 163 L103 139 Q98 131 101 113 L103 66 L98 133 Q97 143 89 141 Q81 139 82 130 L92 60 Q94 48 108 46 Z" />';
const curlSide = '<circle cx="125" cy="25" r="14" /><path d="M116 43 L130 42 Q140 44 144 59 L158 107 L175 66 Q179 57 187 61 Q194 65 190 74 L170 125 Q165 138 154 132 L136 101 L135 125 L140 155 L137 246 L154 251 Q162 254 158 263 L120 263 Q112 262 113 251 L115 163 L103 139 Q98 131 101 113 L103 66 Q102 50 108 46 Z" />';
const squatLow = '<circle cx="133" cy="112" r="14" /><path d="M123 131 L137 132 L145 143 L192 143 Q202 143 202 151 Q202 159 193 159 L140 158 L125 179 L157 183 Q169 186 165 200 L145 246 L161 251 Q169 255 164 264 L130 264 Q121 263 123 253 L142 204 L98 203 Q80 202 85 185 L105 147 Q111 134 123 131 Z" />';
const pushupTop = '<circle cx="194" cy="150" r="14" /><path d="M178 166 Q184 172 179 184 L177 236 L191 242 Q197 248 190 254 L163 253 Q157 251 159 241 L160 191 L121 207 L50 238 L37 253 L20 253 Q15 249 20 243 L32 226 L110 190 L161 168 Q169 161 178 166 Z" />';
const pushupBottom = '<circle cx="200" cy="203" r="14" /><path d="M184 214 Q190 220 181 229 L158 238 L181 241 Q188 245 183 253 L148 252 Q135 251 136 241 L148 231 L113 236 L45 241 L34 253 L19 253 Q14 249 19 244 L31 231 L110 215 L168 214 Q178 209 184 214 Z" />';
// Reach first: heels raised and no bar, so it cannot suggest grabbing early.
const reach = '<g transform="translate(24 40) scale(.8)">' + front(pressUp.replace('L151 253 Q153 263 143 265 Q133 267 131 256', 'L151 253 L156 270 Q157 274 150 274 L136 261').replace('L109 256 Q107 267 97 265 Q87 263 89 253', 'L104 261 L90 274 Q83 274 84 270 L89 253')) + '</g><path d="M84 260 H103 M137 260 H156" fill="none" stroke-opacity="0.45" stroke-width="2" />';
const pullupBentArms = 'M110 43 L130 43 L134 54 L167 75 L153 31 Q149 21 157 19 Q165 17 168 27 L183 77 Q186 88 177 92 Q172 94 166 89 L143 76 ' + frontLegs + ' L97 76 L74 89 Q68 94 63 92 Q54 88 57 77 L72 27 Q75 17 83 19 Q91 21 87 31 L73 75 L106 54 Z';
const pullupTop = bar + '<g transform="translate(24 3) scale(.8)">' + front(pullupBentArms) + '</g>';
// Fixed bar and hands between holds, with the body lower during the hang.
const pullupHang = bar + '<g transform="translate(24 39) scale(.8)">' + front(pressUp) + '</g>';
type GuidePoses = { top: string; bottom: string; reach?: string; viewBox?: string };
const exercisePoses: Record<string, GuidePoses> = {
  lateralraise: { top: front(raisedArms), bottom: front(loweredArms) },
  biceps: { top: curlSide + ground, bottom: squatStand + ground },
  shoulderpress: { top: front(pressUp), bottom: front(pressDown), viewBox: '0 -24 240 304' },
  squats: { top: squatStand + ground, bottom: squatLow + ground },
  pushups: { top: pushupTop + ground, bottom: pushupBottom + ground },
  pullups: { top: pullupTop, bottom: pullupHang, reach },
};
export function buildCalibrationGuideMarkup(exercise: string) {
  const poses = exercisePoses[exercise];
  if (!poses) { return ''; }
  return '<div id="calibration-pose-guide" hidden aria-hidden="true">' +
    '<svg viewBox="' + (poses.viewBox || '0 0 240 280') + '" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
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
