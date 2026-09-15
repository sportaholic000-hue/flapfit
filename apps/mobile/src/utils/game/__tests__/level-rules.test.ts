import { SCRIPT_CORE } from '../html/scriptCore';
import { SCRIPT_GAME } from '../html/scriptGame';
import { ENDLESS_BASE, LEVELS } from '../levels';

describe('level run rules', () => {
  it('can load the production tracking runtime through the bundled native asset bridge', () => {
    expect(SCRIPT_CORE).toContain("type: 'trackerassetrequest'");
    expect(SCRIPT_CORE).toContain('URL.createObjectURL');
    expect(SCRIPT_CORE).toContain('wasmLoaderPath: assets.loaderUrl');
    expect(SCRIPT_CORE).toContain('modelAssetBuffer: assets.modelBuffer');
    expect(SCRIPT_CORE).not.toContain("import('./vision_bundle.mjs')");
  });

  it('caps every ordinary non-final level at exactly 60 pipes', () => {
    const ordinaryLevels = LEVELS.slice(0, -1);

    expect(ordinaryLevels).not.toHaveLength(0);
    ordinaryLevels.forEach((level) => {
      expect(level.maxScore).toBe(60);
      expect(level.targetScore).toBeLessThanOrEqual(level.maxScore);
    });
  });

  it('keeps the final level and endless mode uncapped', () => {
    const finalLevel = LEVELS[LEVELS.length - 1];

    expect(finalLevel.maxScore).toBe(0);
    expect(ENDLESS_BASE.maxScore).toBe(0);
  });

  it('only ends runs for score cap, collision, confirmed form failure, or sustained protected tracking loss', () => {
    const endGameCalls = SCRIPT_GAME.match(/\bendGame\(\);/g) ?? [];
    const criticalFormChecks = SCRIPT_GAME.match(/fatalFormFailureConfirmed\(/g) ?? [];
    const protectedTrackingChecks = SCRIPT_GAME.match(/protectedTrackingLossConfirmed\(/g) ?? [];

    expect(endGameCalls).toHaveLength(6);
    expect(criticalFormChecks).toHaveLength(3);
    expect(protectedTrackingChecks).toHaveLength(3);
    expect(SCRIPT_GAME).toContain('var FATAL_FORM_GRACE_MS = 350;');
    expect(SCRIPT_GAME).toContain('var PROTECTED_TRACKING_LOSS_GRACE_MS = 1600;');
    expect(SCRIPT_GAME).toContain('if (CONFIG.maxScore > 0 && score >= CONFIG.maxScore) {');
    expect(SCRIPT_GAME).toContain('if (collides()) { endGame(); }');
    expect(SCRIPT_GAME).not.toContain('score >= CONFIG.target) { endGame(); }');
    expect(SCRIPT_GAME).toContain("state = 'lost';");
    expect(SCRIPT_GAME).toContain("state = 'resume';");
  });

  it('pauses on stale camera tracking from the exercise-specific landmark', () => {
    expect(SCRIPT_CORE).toContain('lastHeadTrackTime');
    expect(SCRIPT_CORE).toContain('lastWristTrackTime');
    expect(SCRIPT_CORE).toContain('usesWristTracking() ? wristY : headY');
    expect(SCRIPT_CORE).not.toContain('wristY !== null ? wristY : headY');
    expect(SCRIPT_GAME).toContain(
      'if (!trackingFresh() || (!gameplayFormCheck.valid && !gameplayFormCheck.fatal)) {'
    );
    expect(SCRIPT_GAME).toContain('Fatal anti-cheat failures keep the game moving');
  });

  it('reports game over before deferring expensive camera cleanup', () => {
    const endGameStart = SCRIPT_GAME.indexOf('function endGame()');
    const endGameEnd = SCRIPT_GAME.indexOf('// ---------- Drawing ----------', endGameStart);
    const endGameScript = SCRIPT_GAME.slice(endGameStart, endGameEnd);

    expect(endGameScript.indexOf("type: 'gameover'")).toBeGreaterThanOrEqual(0);
    expect(endGameScript.indexOf('setTimeout(stopCameraAndTracking')).toBeGreaterThan(
      endGameScript.indexOf("type: 'gameover'")
    );
    expect(endGameScript).not.toContain('else { stopCameraAndTracking(); }');
  });

  it('uses camera tracking exclusively', () => {
    expect(SCRIPT_CORE).not.toContain('__sensor');
    expect(SCRIPT_CORE).not.toContain('initSensorFlow');
    expect(SCRIPT_GAME).not.toContain('sensorCal');
    expect(SCRIPT_GAME).not.toContain('CONFIG.control');
    expect(SCRIPT_GAME).toContain('initCameraFlow();');
  });

  it('locks every exercise calibration for two seconds after the camera starts', () => {
    expect(SCRIPT_CORE).toContain('var CALIBRATION_START_DELAY_MS = 2000;');
    expect(SCRIPT_CORE).toContain(
      'calibrationReadyAt = performance.now() + CALIBRATION_START_DELAY_MS;'
    );
    expect(SCRIPT_GAME).toContain("state === 'waitTop' && now < calibrationReadyAt");
    expect(SCRIPT_GAME).toContain('setProgress(0);');
    expect(SCRIPT_GAME).toContain("topCalibrationMessage() + '<br><small>Calibration begins in '");
  });
});
