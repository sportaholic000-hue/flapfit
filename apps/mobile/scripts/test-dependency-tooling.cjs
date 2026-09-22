const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = process.argv[2] || path.resolve(__dirname, '../../..');
const app = path.join(root, 'apps/mobile');
const req = createRequire(path.join(app, 'package.json'));
const results = [];
async function check(name, fn) { await fn(); results.push(name); console.log('PASS ' + name); }
async function main() {
  for (const [name, version] of [['@expo/plist', '0.8.15'], ['plist', '0.9.12']]) {
    await check(name + ' native property-list round trip', () => {
      const local = createRequire(req.resolve(name));
      assert.equal(local('@xmldom/xmldom/package.json').version, version);
      const imported = req(name);
      const plist = imported.default || imported;
      const input = { CFBundleIdentifier: 'com.flapfit.game', NSCameraUsageDescription: 'Move & play <safely>', UIRequiredDeviceCapabilities: ['arm64'], NSAppTransportSecurity: { NSAllowsArbitraryLoads: false }, Count: 42 };
      // Expo's plist intentionally returns dictionaries with null prototypes.
      assert.deepEqual(JSON.parse(JSON.stringify(plist.parse(plist.build(input)))), input);
      const parser = new (local('@xmldom/xmldom').DOMParser)();
      assert.equal(parser.parseFromString('<root><child>ok</child></root>', 'text/xml').documentElement.nodeName, 'root');
    });
  }
  for (const [consumer, version, method] of [['@istanbuljs/load-nyc-config', '3.15.2', 'safeLoad'], ['@eslint/eslintrc', '4.3.2', 'load']]) {
    await check(consumer + ' YAML configuration', () => {
      const local = createRequire(req.resolve(consumer));
      const yaml = local('js-yaml');
      assert.equal(local('js-yaml/package.json').version, version);
      assert.deepEqual(yaml[method]('all: true\ninclude:\n  - src/**/*.ts\nthreshold: 80\n'), { all: true, include: ['src/**/*.ts'], threshold: 80 });
    });
  }
  await check('project PostCSS / Tailwind / Autoprefixer pipeline', async () => {
    assert.equal(req('postcss/package.json').version, '8.5.28');
    const config = req(path.join(app, 'postcss.config.js'));
    const plugins = Object.entries(config.plugins).map(([name, opts]) => req(name)(name === 'tailwindcss' ? { ...req(path.join(app, 'tailwind.config.js')), content: [{ raw: '<div class="flex p-4 select-none"></div>' }] } : opts));
    const output = await req('postcss')(plugins).process('@tailwind utilities;\n.example { display: flex; user-select: none; }', { from: path.join(app, 'dependency-check.css'), map: false });
    assert.match(output.css, /display:\s*flex/); assert.match(output.css, /padding:\s*1rem/); assert.match(output.css, /-webkit-user-select/);
  });
  for (const consumer of ['xcode', '@expo/ngrok']) {
    await check(consumer + ' CommonJS UUID compatibility and buffer validation', () => {
      const local = createRequire(req.resolve(consumer));
      assert.equal(local('uuid/package.json').version, '11.1.1');
      const uuid = local('uuid');
      const ids = Array.from({ length: 1000 }, () => uuid.v4());
      assert.equal(new Set(ids).size, ids.length); ids.forEach(id => assert.ok(uuid.validate(id) && uuid.version(id) === 4));
      for (const method of ['v3', 'v5']) assert.throws(() => uuid[method]('test', uuid[method].DNS, new Uint8Array(1)), RangeError);
    });
  }
  await check('xcode PBX project parse / generate UUID / write / reparse', () => {
    const xcode = req('xcode');
    const project = xcode.project(path.join(__dirname, 'compatibility.pbxproj'));
    const parser = createRequire(req.resolve('xcode'))('./lib/parser/pbxproj');
    project.hash = parser.parse('// !$*UTF8*$!\n{ archiveVersion = 1; classes = {}; objectVersion = 56; objects = { AAAAAAAAAAAAAAAAAAAAAAAA = { isa = PBXGroup; children = (); sourceTree = "<group>"; }; }; rootObject = AAAAAAAAAAAAAAAAAAAAAAAA; }\n');
    const ids = new Set();
    for (let i = 0; i < 1000; i++) { const id = project.generateUuid(); assert.match(id, /^[A-F0-9]{24}$/); assert.ok(!ids.has(id)); ids.add(id); }
    const parsed = parser.parse(project.writeSync());
    assert.equal(parsed.project.rootObject, 'AAAAAAAAAAAAAAAAAAAAAAAA');
  });
  await check('ngrok actual connect path with mocked process and network', async () => {
    const entry = req.resolve('@expo/ngrok');
    const local = createRequire(entry);
    let captured;
    const mockedRequire = name => {
      if (name === './src/client') return { NgrokClient: class { async startTunnel(opts) { captured = opts; return { public_url: 'https://example.invalid' }; } }, NgrokClientError: class extends Error {} };
      if (name === './src/process') return { getProcess: async () => 'http://127.0.0.1:4040', getActiveProcess() {}, killProcess() {}, setAuthtoken() {}, getVersion() {} };
      return local(name);
    };
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(entry, 'utf8'), { require: mockedRequire, module, exports: module.exports, setTimeout }, { filename: entry });
    assert.equal(await module.exports.connect({ addr: 8081 }), 'https://example.invalid');
    assert.ok(local('uuid').validate(captured.name));
  });
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ passed: results.length, checks: results }, null, 2) + '\n');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
