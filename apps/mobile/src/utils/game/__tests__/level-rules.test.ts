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

  it('only ends runs for score cap, collision, confirmed form failure, or sustained tracking interruption', () => {
    const endGameCalls = SCRIPT_GAME.match(/\bendGame\(/g) ?? [];
    const criticalFormChecks = SCRIPT_GAME.match(/fatalFormFailureConfirmed\(/g) ?? [];
    const interruptionChecks = SCRIPT_GAME.match(/formTrackingInterruptionConfirmed\(/g) ?? [];

    expect(endGameCalls).toHaveLength(7); // One definition and six ending paths.
    expect(SCRIPT_GAME).toContain("endGame(gameplayFormCheck.valid ? 'tracking' : 'form')");
    expect(SCRIPT_GAME).toContain("endGame(resumeFormCheck.valid ? 'tracking' : 'form')");
    expect(criticalFormChecks).toHaveLength(3);
    expect(interruptionChecks).toHaveLength(3);
    expect(SCRIPT_GAME).toContain('var FATAL_FORM_GRACE_MS = 350;');
    expect(SCRIPT_GAME).toContain('var FORM_TRACKING_INTERRUPTION_GRACE_MS = 1600;');
    expect(SCRIPT_GAME).toContain('if (CONFIG.maxScore > 0 && score >= CONFIG.maxScore) {');
    expect(SCRIPT_GAME).toContain('if (collides()) { endGame(); }');
    expect(SCRIPT_GAME).not.toContain('score >= CONFIG.target) { endGame(); }');
    expect(SCRIPT_GAME).toContain("state = 'lost';");
    expect(SCRIPT_GAME).toContain("state = 'resume';");
  });

  it('briefly pauses on stale camera tracking from the exercise-specific landmark', () => {
    expect(SCRIPT_CORE).toContain('lastHeadTrackTime');
    expect(SCRIPT_CORE).toContain('lastWristTrackTime');
    expect(SCRIPT_CORE).toContain('usesWristTracking() ? wristY : headY');
    expect(SCRIPT_CORE).not.toContain('wristY !== null ? wristY : headY');
    expect(SCRIPT_GAME).toContain(
      'if (!trackingFresh() || (!gameplayFormCheck.valid && !gameplayFormCheck.fatal)) {'
    );
    expect(SCRIPT_GAME).toContain('Fatal anti-cheat failures keep the game moving');
  });

  it('ends sustained Form Test interruption but permits a brief recovery', () => {
    const helperStart = SCRIPT_GAME.indexOf('var formTrackingInterruptionSince');
    const helperEnd = SCRIPT_GAME.indexOf('// ---------- Composed-run recording', helperStart);
    const factory = new Function(
      'usesExperimentalFormTracking',
      'trackingFresh',
      SCRIPT_GAME.slice(helperStart, helperEnd) + '\nreturn formTrackingInterruptionConfirmed;'
    ) as (
      formTest: () => boolean,
      fresh: () => boolean
    ) => (check: { valid: boolean; fatal: boolean }, now: number) => boolean;

    let fresh = true;
    let formTest = true;
    const interrupted = factory(
      () => formTest,
      () => fresh
    );
    const invalid = { valid: false, fatal: false };
    const valid = { valid: true, fatal: false };

    expect(interrupted(invalid, 100)).toBe(false);
    expect(interrupted(invalid, 1699)).toBe(false);
    expect(interrupted(invalid, 1700)).toBe(true);
    expect(interrupted(valid, 1800)).toBe(false);
    expect(interrupted(invalid, 1900)).toBe(false);
    fresh = false;
    expect(interrupted(valid, 3500)).toBe(true);
    formTest = false;
    expect(interrupted(invalid, 3600)).toBe(false);
  });

  it('reports game over before deferring expensive camera cleanup', () => {
    const endGameStart = SCRIPT_GAME.indexOf('function endGame(reason)');
    const endGameEnd = SCRIPT_GAME.indexOf('// ---------- Drawing ----------', endGameStart);
    const endGameScript = SCRIPT_GAME.slice(endGameStart, endGameEnd);

    expect(endGameScript.indexOf("type: 'gameover'")).toBeGreaterThanOrEqual(0);
    expect(endGameScript.indexOf('setTimeout(stopRunRecording')).toBeGreaterThan(
      endGameScript.indexOf("type: 'gameover'")
    );
    expect(endGameScript.indexOf('setTimeout(stopCameraAndTracking')).toBeGreaterThan(
      endGameScript.indexOf("type: 'gameover'")
    );
    expect(endGameScript).not.toContain('else { stopCameraAndTracking(); }');
  });

  it('records one complete media container before slicing it for the native bridge', () => {
    expect(SCRIPT_GAME).toContain('runRecorder.start();');
    expect(SCRIPT_GAME).not.toContain('runRecorder.start(1000);');
    expect(SCRIPT_GAME).toContain('queueRecordingBlob(event.data);');
    expect(SCRIPT_GAME).toContain('RECORDING_BRIDGE_CHUNK_BYTES');
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
    expect(SCRIPT_GAME).toContain("'<br><small>Calibration begins in '");
  });

  it('tracks real active time at 15–20 FPS while leaving physics frame steps capped', () => {
    const timing = SCRIPT_GAME.match(
      /var accountedFrameMs = [^\n]+;\n    competitionDurationMs \+= [^\n]+;[\s\S]*?tutSeconds \+= [^\n]+;/
    )?.[0];
    if (!timing) throw new Error('Game timing updates are missing.');
    const step = new Function(
      'rawFrameMs',
      'competitionDurationMs',
      'tutSeconds',
      timing + '\nreturn { competitionDurationMs, tutSeconds };'
    ) as (
      frameMs: number,
      durationMs: number,
      trainingSeconds: number
    ) => {
      competitionDurationMs: number;
      tutSeconds: number;
    };
    let totals = { competitionDurationMs: 0, tutSeconds: 0 };
    for (let frame = 0; frame < 900; frame++) {
      totals = step(50, totals.competitionDurationMs, totals.tutSeconds);
    }
    expect(totals.competitionDurationMs).toBe(45000);
    expect(totals.tutSeconds).toBeCloseTo(45, 5);
    expect(step(1000 / 15, 0, 0).tutSeconds).toBeCloseTo(1 / 15, 5);
    expect(step(2000, 0, 0).tutSeconds).toBe(0.25);
    expect(SCRIPT_GAME).toContain('var dt = Math.min(0.035, rawFrameMs / 1000);');
  });
});
