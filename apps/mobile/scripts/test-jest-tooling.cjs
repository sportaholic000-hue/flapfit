// Exercises the test-only dependency overrides without changing mobile behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const req = createRequire(path.join(root, 'apps/mobile/package.json'));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'flapfit-jest-tooling-'));
const posix = value => value.split(path.sep).join('/');

async function main() {
  fs.mkdirSync(path.join(scratch, 'src'));
  fs.writeFileSync(path.join(scratch, 'src/sample.js'), 'exports.choose = flag => flag ? "yes" : "no";\n');
  fs.writeFileSync(path.join(scratch, 'src/unused.js'), 'exports.unused = () => "uncovered";\n');
  fs.mkdirSync(path.join(scratch, 'node_modules/ignored'), { recursive: true });
  fs.writeFileSync(path.join(scratch, 'node_modules/ignored/index.js'), 'module.exports = 1;\n');

  for (const consumer of ['jest-config', '@jest/reporters']) {
    const local = createRequire(req.resolve(consumer));
    assert.equal(local('glob/package.json').version, '13.0.6');
    const files = local('glob').sync(posix(path.join(scratch, 'src/*.js')));
    assert.deepEqual(files.map(file => path.basename(file)).sort(), ['sample.js', 'unused.js']);
  }
  console.log('PASS Jest configuration and reporter file matching');

  const instrumentRequire = createRequire(req.resolve('babel-plugin-istanbul'));
  assert.equal(instrumentRequire('test-exclude/package.json').version, '8.0.0');
  const TestExclude = instrumentRequire('test-exclude');
  const filter = new TestExclude({ cwd: scratch, include: ['src/**/*.js'], exclude: ['src/unused.js'] });
  assert.equal(filter.shouldInstrument(path.join(scratch, 'src/sample.js')), true);
  assert.equal(filter.shouldInstrument(path.join(scratch, 'src/unused.js')), false);
  assert.equal(filter.shouldInstrument(path.join(scratch, 'node_modules/ignored/index.js')), false);
  assert.deepEqual(filter.globSync().map(posix), ['src/sample.js']);
  assert.deepEqual((await filter.glob()).map(posix), ['src/sample.js']);
  console.log('PASS synchronous/asynchronous coverage discovery and exclusions');

  const domRequire = createRequire(req.resolve('jest-environment-jsdom'));
  assert.equal(domRequire('jsdom/package.json').version, '27.4.0');
  const { JSDOM } = domRequire('jsdom');
  const dom = new JSDOM(Buffer.from('<meta charset="utf-8"><p>FlapFit café</p>'));
  try {
    assert.equal(dom.window.document.querySelector('p').textContent, 'FlapFit café');
    assert.equal(new dom.window.DOMException('test', 'AbortError').name, 'AbortError');
    assert.equal(dom.window.atob('RmxhcEZpdA=='), 'FlapFit');
  } finally {
    dom.window.close();
  }
  console.log('PASS replacement DOM, base64 and byte-encoding helpers');

  fs.writeFileSync(path.join(scratch, 'compatibility.test.cjs'), [
    'const { choose } = require("./src/sample");',
    'test("DOM environment, console forwarding, timers and coverage", () => {',
    '  expect(choose(true)).toBe("yes");',
    '  expect(choose(false)).toBe("no");',
    '  document.body.innerHTML = "<button>Play</button>";',
    '  const clicked = jest.fn();',
    '  document.querySelector("button").addEventListener("click", clicked);',
    '  document.querySelector("button").click();',
    '  expect(clicked).toHaveBeenCalledTimes(1);',
    '  localStorage.setItem("province", "New Brunswick");',
    '  expect(localStorage.getItem("province")).toBe("New Brunswick");',
    '  expect(atob("RmxhcEZpdA==")).toBe("FlapFit");',
    '  expect(new DOMException("test", "AbortError").name).toBe("AbortError");',
    '  for (const legacyFakeTimers of [false, true]) {',
    '    jest.useFakeTimers({ legacyFakeTimers });',
    '    const called = jest.fn();',
    '    setTimeout(called, 50);',
    '    jest.advanceTimersByTime(50);',
    '    expect(called).toHaveBeenCalledTimes(1);',
    '    jest.useRealTimers();',
    '  }',
    '  console.log("flapfit-dom-console-forwarded");',
    '});',
    '',
  ].join('\n'));

  const config = {
    rootDir: scratch,
    testEnvironment: req.resolve('jest-environment-jsdom'),
    testEnvironmentOptions: { url: 'https://example.invalid/', userAgent: 'FlapFit tooling check' },
    testMatch: ['**/*.test.cjs'],
    transform: {},
    cacheDirectory: path.join(scratch, 'cache'),
    collectCoverage: true,
    collectCoverageFrom: ['src/sample.js'],
    coverageDirectory: path.join(scratch, 'coverage'),
    coverageProvider: 'babel',
    coverageReporters: ['json-summary'],
    coverageThreshold: { './src/*.js': { statements: 100, branches: 100, functions: 100, lines: 100 } },
  };
  const jestCli = path.join(path.dirname(req.resolve('jest/package.json')), 'bin/jest.js');
  const configPath = path.join(scratch, 'jest.config.json');
  const run = () => {
    fs.writeFileSync(configPath, JSON.stringify(config));
    return spawnSync(process.execPath, [jestCli, '--config', configPath, '--runInBand'], {
      cwd: scratch, env: { ...process.env, CI: '1' }, encoding: 'utf8', windowsHide: true, timeout: 120000,
    });
  };
  let result = run();
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /flapfit-dom-console-forwarded/);
  const coverage = JSON.parse(fs.readFileSync(path.join(scratch, 'coverage/coverage-summary.json'), 'utf8'));
  assert.equal(coverage.total.functions.pct, 100);
  console.log('PASS actual Jest DOM suite with both timer modes and Babel coverage');

  config.collectCoverageFrom = ['src/*.js'];
  result = run();
  assert.ifError(result.error);
  assert.equal(result.status, 1, 'Uncovered function must fail the glob coverage threshold');
  assert.match(result.stdout + result.stderr, /coverage threshold for functions \(100%\) not met/);
  console.log('PASS uncovered-file discovery and enforced glob coverage threshold');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  const resolved = path.resolve(scratch);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('flapfit-jest-tooling-')) {
    throw new Error('Refusing cleanup outside the owned temporary test directory');
  }
  fs.rmSync(resolved, { recursive: true, force: true });
});
