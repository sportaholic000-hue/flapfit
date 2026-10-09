// Desktop Chromium check of the complete generated Android WebView document.
// Native Android camera/device acceptance is a separate required check.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const { buildGameHtml } = require('../src/utils/game/gameHtml.ts');
const { SCRIPT_GAME } = require('../src/utils/game/html/scriptGame.ts');
const bottomMessageSource = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('        var botMsg;'), SCRIPT_GAME.indexOf('        showOverlay(botMsg, true);')) + 'return botMsg;';
const root = path.resolve(__dirname, '../artwork/calibration/.generated/runtime');
const base = { trackerAssetMode: 'bundled', trackingMode: 'form-test', backgroundMode: 'camera', experimentalCalibrationGuidePlatform: 'android', recordRun: false, recordAudio: false, endless: false, speed: 160, gapFrac: 0.4, spawnMs: 2300, movingPipes: false, moveAmp: 0, target: 10, maxScore: 60, sky1: '#334155', sky2: '#475569', pipe: '#22C55E', bird: { id: 'sunny', name: 'Sunny', body: '#FFC93C', belly: '#FFE8A3', wing: '#FF9F1C', beak: '#FF6B35', eye: '#1F2937' }, birdEvo: { stage: 0, wings: 0, legs: 0, arms: 0, shoulders: 0 }, birdImageDataUri: '' };
(async () => {
  fs.mkdirSync(root, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.CALIBRATION_BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(String(error)));
    // No model downloads or camera requests; drive real guide state in the complete document.
    await page.route('**/*', route => route.abort());
    let checks = 0; const alphaChecked = new Set();
    for (const exercise of ['pushups', 'squats', 'pullups', 'lateralraise', 'biceps', 'shoulderpress']) {
      for (const size of [{ width: 360, height: 640 }, { width: 320, height: 480 }, { width: 360, height: 400 }]) {
        await page.setViewportSize(size);
        await page.setContent(buildGameHtml({ ...base, exercise }));
        for (const pose of exercise === 'pullups' ? ['reach', 'waitTop', 'waitBottom'] : ['waitTop', 'waitBottom']) {
          await page.evaluate(({ pose, bottomMessageSource }) => {
            state = pose === 'reach' ? 'waitTop' : pose;
            pullupFloorSetupMode = pose === 'reach' ? 'pending' : 'floor';
            if (pose === 'waitBottom') topY = 0.2;
            const setup = CONFIG.exercise === 'pullups' ? getPullupSupportSetup() : null;
            showOverlay(pose === 'reach' ? setup.message : pose === 'waitTop' ? topCalibrationMessage() : Function(bottomMessageSource)(), true);
            setProgress(0.55);
            // Contrasting simulated camera frame exposes opaque backgrounds and edges.
            ctx.fillStyle = '#476d67'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#70918c'; for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 20, H);
          }, { pose, bottomMessageSource });
          await page.waitForFunction(p => { const g = document.getElementById('calibration-pose-guide'); return g.dataset.pose === p && g.dataset.phase === 'holding'; }, pose);
          const guide = await page.locator('#calibration-pose-guide').boundingBox();
          const card = await page.locator('#card').boundingBox();
          assert(card.y >= 0 && card.y + card.height <= size.height + 1, exercise + ' clipped instructions');
          assert(guide.y + guide.height <= card.y + 1, exercise + ' guide overlaps instructions');
          if (!alphaChecked.has(exercise + pose)) {
            const alpha = await page.evaluate(async () => {
              const visible = [...document.querySelectorAll('#calibration-pose-guide image')].find(image => getComputedStyle(image.parentElement).display !== 'none');
              const bitmap = new Image(); bitmap.src = visible.getAttribute('href'); await bitmap.decode();
              const canvas = document.createElement('canvas'); canvas.width = bitmap.naturalWidth; canvas.height = bitmap.naturalHeight;
              const c = canvas.getContext('2d'); c.drawImage(bitmap, 0, 0); const pixels = c.getImageData(0, 0, canvas.width, canvas.height).data;
              let clear = 0, translucent = 0; for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) clear++; else if (pixels[i] < 255) translucent++; }
              return { clear, translucent };
            });
            assert(alpha.clear > 0 && alpha.translucent > 0, exercise + ' missing transparent/translucent pixels');
            alphaChecked.add(exercise + pose);
            await page.screenshot({ path: path.join(root, exercise + '-' + pose + '.png') });
          }
          checks++;
        }
        await page.evaluate(() => { bottomY = 0.7; state = 'countdown'; hideOverlay(); });
        await page.waitForFunction(() => document.getElementById('calibration-pose-guide').hidden);
      }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ completeAndroidHtml: true, browser: 'desktop Chromium, not native Android', layoutChecks: checks, posesDecodedWithAlpha: alphaChecked.size, errors, output: root }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
