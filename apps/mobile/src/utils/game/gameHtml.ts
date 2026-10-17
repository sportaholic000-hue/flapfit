import type { BirdSkin } from './birds';
import { CALIBRATION_GUIDE_STYLE, buildCalibrationGuideMarkup, CALIBRATION_GUIDE_SCRIPT, showExperimentalCalibrationGuide } from './experimentalCalibrationGuide';
import { SCRIPT_CORE } from './html/scriptCore';
import { SCRIPT_FORM_TRACKING } from './html/scriptFormTracking';
import { SCRIPT_GAME } from './html/scriptGame';

export type BirdEvolution = {
  stage: number;
  wings: number;
  legs: number;
  arms: number;
  shoulders: number;
};

export type GameHtmlConfig = {
  trackerAssetMode: 'bundled' | 'remote';
  trackingMode: 'form-test';
  exercise: 'pushups' | 'squats' | 'pullups' | 'lateralraise' | 'biceps' | 'shoulderpress';
  backgroundMode: 'sky' | 'camera';
  recordRun: boolean;
  recordAudio: boolean;
  recordingBranding?: boolean;
  squatDiagnostics?: boolean;
  curlDiagnostics?: boolean;
  curlForearmControl?: boolean;
  curlWorkerTracking?: boolean;
  experimentalCalibrationGuidePlatform?: string;
  endless: boolean;
  brandFirstPipe?: boolean;
  speed: number;
  gapFrac: number;
  spawnMs: number;
  movingPipes: boolean;
  moveAmp: number;
  target: number;
  maxScore: number;
  sky1: string;
  sky2: string;
  pipe: string;
  bird: BirdSkin;
  birdEvo: BirdEvolution;
  birdImageDataUri: string;
};

export function buildGameHtml(config: GameHtmlConfig): string {
  const { experimentalCalibrationGuidePlatform, ...gameConfig } = config;
  const showGuide = showExperimentalCalibrationGuide(experimentalCalibrationGuidePlatform, config.exercise, config.backgroundMode);
  const configJson = JSON.stringify(gameConfig);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
html { height: 100%; }
body { margin: 0; padding: 0; background: ${config.sky1}; overflow: hidden; height: 100%; -webkit-user-select: none; user-select: none; }
#game { display: block; position: fixed; top: 0; left: 0; right: 0; bottom: 0; }
#preview { display: none; position: fixed; right: 10px; bottom: 10px; width: 130px; height: 173px; border-radius: 14px; overflow: hidden; border: 2px solid rgba(255,255,255,0.75); z-index: 5; background: #000; }
#preview video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
#dot { position: absolute; width: 10px; height: 10px; border-radius: 5px; background: #22C55E; margin-left: -5px; margin-top: -5px; border: 2px solid #fff; z-index: 6; }
#camBtn { display: none; position: fixed; right: 10px; bottom: 193px; z-index: 7; background: rgba(15,23,42,0.72); border: none; border-radius: 12px; padding: 9px 13px; cursor: pointer; color: #fff; font-size: 20px; line-height: 1; -webkit-tap-highlight-color: transparent; }
#overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10; pointer-events: none; }
#card { background: rgba(6,34,61,0.88); border-radius: 22px; padding: 28px 30px; max-width: 88%; text-align: center; color: #fff; font-family: -apple-system, sans-serif; font-weight: 700; font-size: 24px; line-height: 1.55; }
#card small { font-weight: 600; font-size: 17px; color: rgba(255,255,255,0.78); }
#bar { display: none; height: 12px; border-radius: 6px; background: rgba(255,255,255,0.25); margin-top: 18px; overflow: hidden; }
#fill { height: 100%; width: 0%; background: #F59E0B; border-radius: 6px; transition: width 0.1s linear; }
${showGuide ? CALIBRATION_GUIDE_STYLE : ''}</style>
</head>
<body>
<canvas id="game"></canvas>
<div id="preview"><video id="video" playsinline muted autoplay></video><div id="dot"></div></div>
<button id="camBtn">📷</button>
${showGuide ? buildCalibrationGuideMarkup(config.exercise, experimentalCalibrationGuidePlatform) : ''}<div id="overlay"><div id="card"><div id="msg">Loading…</div><div id="bar"><div id="fill"></div></div></div></div>
<script>
"use strict";
var CONFIG = ${configJson};
  ${SCRIPT_CORE}
  ${SCRIPT_FORM_TRACKING}
  ${SCRIPT_GAME}${showGuide ? CALIBRATION_GUIDE_SCRIPT : ''}
</script>
</body>
</html>`;
}
