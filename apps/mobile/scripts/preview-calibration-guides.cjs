// Adapted from dc4b470 artwork/calibration/preview.cjs. Uses the existing
// generated guide fixtures and an already installed browser; no dependency install.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../../..');
const out = process.env.FLAPFIT_CALIBRATION_QA_DIR || path.join(root, 'test-results/calibration-guides');
const sizes = [
  { name: 'iphone-compact', width: 375, height: 667 },
  { name: 'iphone-large', width: 430, height: 932 },
  { name: 'ipad-11', width: 820, height: 1180 },
  { name: 'ipad-13', width: 1024, height: 1366 },
];
(async () => {
  const browser = await chromium.launch({ channel: process.env.CALIBRATION_BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.abort());
    const checks = []; const cells = [];
    for (const exercise of ['pushups', 'squats', 'pullups', 'lateralraise', 'biceps', 'shoulderpress']) {
      const html = fs.readFileSync(path.join(out, 'guide-' + exercise + '-ui.html'), 'utf8');
      for (const size of sizes) {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.setContent(html);
        for (const pose of exercise === 'pullups' ? ['reach', 'waitTop', 'waitBottom'] : ['waitTop', 'waitBottom']) {
          await page.evaluate(p => {
            if (p === 'reach') window.previewStep('waitTop');
            else if (p === 'waitTop' && CONFIG.exercise === 'pullups') window.finishReach('floor');
            else window.previewStep(p);
          }, pose);
          await page.waitForFunction(p => {
            const el = document.getElementById('calibration-pose-guide');
            return el.dataset.pose === p && el.dataset.phase === 'holding';
          }, pose);
          const card = await page.locator('#card').boundingBox();
          const guide = await page.locator('#calibration-pose-guide').boundingBox();
          const progress = await page.locator('#bar').boundingBox();
          assert(card && guide && progress);
          assert(card.y >= 0 && card.y + card.height <= size.height + 1, exercise + ' text clipped');
          assert(card.x >= 0 && card.x + card.width <= size.width + 1, exercise + ' text clipped horizontally');
          assert(guide.y + guide.height <= card.y + 1, exercise + ' guide/text overlap');
          assert(guide.width >= size.width * 0.9);
          assert(progress.width > 0 && progress.height > 0, 'Progress bar must remain visible');
          const file = size.name + '-' + exercise + '-' + pose + '.png';
          await page.screenshot({ path: path.join(out, file) });
          checks.push({ viewport: size, exercise, pose, card, guide, progress, screenshot: file });
          if (size.name === 'iphone-compact') cells.push({ exercise, pose, svg: await page.locator('#calibration-pose-guide').innerHTML() });
        }
        await page.evaluate(() => window.previewStep('countdown'));
        await page.waitForFunction(() => document.getElementById('calibration-pose-guide').hidden);
        await page.evaluate(() => {
          window.previewStep('waitTop');
          showOverlay('Form check<br><br>Keep both shoulders and elbows in view.<br>Your hands can leave the top of the frame.<br><br>Hold still…', true);
        });
        await page.waitForFunction(() => {
          const c = document.getElementById('card').getBoundingClientRect();
          const g = document.getElementById('calibration-pose-guide').getBoundingClientRect();
          return g.bottom <= c.top + 1;
        });
      }
    }
    await page.setViewportSize({ width: 1320, height: 1320 });
    await page.setContent('<style>body{margin:0;padding:24px;background:#142133;color:#e5f5ff;font:16px Arial}main{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.cell{background:#526469;border-radius:12px;padding:12px;height:282px}h3{font-size:16px;margin:0 0 8px}svg{width:100%;height:250px}.pose-up,.pose-down,.pose-reach{display:none}.waitTop .pose-up,.waitBottom .pose-down,.reach .pose-reach{display:block}</style><h2>iOS candidate · reused calibration artwork</h2><main>' + cells.map(c => '<div class="cell ' + c.pose + '"><h3>' + c.exercise + ' · ' + c.pose + '</h3>' + c.svg + '</div>').join('') + '</main>');
    await page.screenshot({ path: path.join(out, 'artwork-contact-sheet.png'), fullPage: true });

    const ts = require('typescript');
    const previousTsLoader = require.extensions['.ts'];
    require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
    let game;
    try { game = require('../src/utils/game/html/scriptGame.ts').SCRIPT_GAME; }
    finally {
      if (previousTsLoader) require.extensions['.ts'] = previousTsLoader;
      else delete require.extensions['.ts'];
    }
    const frame = game.slice(game.indexOf('function copyComposedRecordingFrame('), game.indexOf('function stopRunRecording('));
    const hud = game.slice(game.indexOf('function drawHUD('), game.indexOf('function drawCountdownNumber('));
    const branding = [];
    for (const size of sizes) for (const target of [10, 0]) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.setContent('<style>body{margin:0;background:#334155}canvas{position:absolute;top:0;left:0}</style><canvas id="live"></canvas><canvas id="recorded" style="display:none"></canvas>');
      const result = await page.evaluate(({ size, target, frame, hud }) => {
        const canvas = document.getElementById('live'), recordingCanvas = document.getElementById('recorded');
        canvas.width = recordingCanvas.width = size.width;
        canvas.height = recordingCanvas.height = size.height;
        const ctx = canvas.getContext('2d'), recordingCtx = recordingCanvas.getContext('2d');
        ctx.fillStyle = '#334155'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        return new Function('canvas', 'recordingCanvas', 'ctx', 'recordingCtx', 'W', 'H', 'CONFIG', `
          var score=7,recordingActive=true,recordingFramesFinished=false,recordingAwaitingPlayFrame=true,lastRecordingFrameTime=0;
          ${hud} ${frame}
          drawHUD(); var before=canvas.toDataURL();
          copyComposedRecordingFrame(100,true,true);
          return { liveUnchanged:before===canvas.toDataURL(),recordingDiffers:before!==recordingCanvas.toDataURL() };
        `)(canvas, recordingCanvas, ctx, recordingCtx, size.width, size.height, { target, recordingBranding: true });
      }, { size, target, frame, hud });
      assert(result.liveUnchanged && result.recordingDiffers);
      const label = size.name + (target ? '-level' : '-endless');
      await page.screenshot({ path: path.join(out, label + '-live-hud.png'), clip: { x: 0, y: 0, width: size.width, height: 150 } });
      await page.locator('#recorded').evaluate(el => { el.style.display = 'block'; });
      await page.screenshot({ path: path.join(out, label + '-recorded-hud.png'), clip: { x: 0, y: 0, width: size.width, height: 150 } });
      branding.push({ viewport: size, target, ...result });
    }
    const report = { engine: 'installed Chromium browser', nativeDeviceTest: false, calibrationLayouts: checks, recordingLayouts: branding };
    fs.writeFileSync(path.join(out, 'layout-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ calibrationLayouts: checks.length, recordingLayouts: branding.length, output: out }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
