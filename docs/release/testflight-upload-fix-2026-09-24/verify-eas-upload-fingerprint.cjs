const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const [rootArg, baselineArg, easCliArg, outArg] = process.argv.slice(2);
const root = path.resolve(rootArg);
const mobile = path.join(root, 'apps/mobile');
const out = path.resolve(outArg);
fs.mkdirSync(out, { recursive: true });
const baseline = JSON.parse(fs.readFileSync(baselineArg, 'utf8'));
const sources = baseline.fingerprintSources;
const moduleSource = sources.find(s => s.filePath === 'modules');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const originalRules = git(['show', '0685f0c:.easignore']);
const originalRulesPath = path.join(out, 'original-easignore.txt');
fs.writeFileSync(originalRulesPath, originalRules);
const ignored = rules => new Set(git(['ls-files', '--exclude-from', rules, '--ignored', '--cached', '-z']).split('\0').filter(Boolean));
const oldIgnored = ignored(originalRulesPath);
const newIgnored = ignored(path.join(root, '.easignore'));
const relativeToRoot = p => path.relative(root, path.resolve(mobile, p)).replace(/\\/g, '/');
const leaves = n => n.children ? n.children.flatMap(leaves) : [n];
const allLeaves = sources.flatMap(s => s.debugInfo ? leaves(s.debugInfo) : [])
  .filter(n => n.path && !n.path.includes('node_modules/'));
const omittedBefore = [...new Set(allLeaves.map(n => relativeToRoot(n.path)).filter(p => oldIgnored.has(p)))];
const omittedAfter = [...new Set(allLeaves.map(n => relativeToRoot(n.path)).filter(p => newIgnored.has(p)))];
assert.deepEqual(omittedBefore, ['apps/mobile/modules/flap-fit-age-range/README.md']);
assert.deepEqual(omittedAfter, []);
assert(newIgnored.has('README.md'), 'Root README exclusion retained');
function filterTree(node, excluded) {
  if (!node.children) return excluded.has(relativeToRoot(node.path)) ? null : node;
  const children = node.children.map(n => filterTree(n, excluded)).filter(Boolean);
  if (!children.length) return null;
  const hasher = crypto.createHash('sha1');
  for (const n of children) hasher.update(n.path).update(n.hash);
  return { ...node, children, hash: hasher.digest('hex') };
}
const cloudModule = filterTree(moduleSource.debugInfo, oldIgnored);
const fixedModule = filterTree(moduleSource.debugInfo, newIgnored);
assert.equal(cloudModule.hash, '3358308e143615f2511a4291496fdb3a62aaf5e4');
assert.equal(fixedModule.hash, moduleSource.hash);
const runtime = list => {
  const hasher = crypto.createHash('sha1');
  for (const s of list) if (s.hash != null) hasher.update(s.overrideHashKey ?? s.filePath ?? s.id).update(s.hash);
  return hasher.digest('hex');
};
assert.equal(runtime(sources), baseline.runtimeVersion);
const reproducedFailure = runtime(sources.map(s => s.filePath === 'modules' ? { ...s, hash: cloudModule.hash } : s));
assert.equal(reproducedFailure, '62074572e44990f682a88586f9ff6c395e271800');
(async () => {
  // The actual EAS copying matcher must agree with Git's requireCommit upload filter.
  const { Ignore } = require(path.join(path.resolve(easCliArg), 'build/vcs/local.js'));
  const matcher = await Ignore.createForCopyingAsync(root);
  for (const n of allLeaves) assert(!matcher.ignores(relativeToRoot(n.path)), n.path);
  const { normalizeOptionsAsync } = require(path.join(root, 'node_modules/@expo/fingerprint/build/Options.js'));
  const { createFingerprintFromSourcesAsync } = require(path.join(root, 'node_modules/@expo/fingerprint/build/hash/Hash.js'));
  const options = await normalizeOptionsAsync(mobile, { platforms: ['ios'], debug: true, useCNGForPlatforms: { ios: true, android: false } });
  const actualModule = await createFingerprintFromSourcesAsync([{type:'dir',filePath:'modules',reasons:['package-check']}], mobile, options);
  assert.equal(actualModule.sources[0].hash, moduleSource.hash, 'Actual module files must still match audited input');
  // Hash all app-owned file inputs again; only npm packages and synthetic content are reused.
  const localInputs = sources.filter(s => s.type !== 'contents' && !s.filePath.includes('node_modules/') && s.hash != null);
  const actualInputs = await createFingerprintFromSourcesAsync(localInputs, mobile, options);
  for (let i = 0; i < localInputs.length; i++) assert.equal(actualInputs.sources[i].hash, localInputs[i].hash, localInputs[i].filePath);
  const result = {
    verifiedAt: new Date().toISOString(), baselineCommit: '0685f0cbd60376b4cbfe347919452e5b05aa9aaa',
    failedBuild: 'c245cd98-21d8-470d-ade8-41d23acc2c18',
    omittedBefore, omittedAfter,
    actualAppOwnedSourcesRehashed: localInputs.length,
    sourceFileLeavesChecked: allLeaves.length,
    originalModuleHash: moduleSource.hash, cloudModuleHash: cloudModule.hash, fixedModuleHash: fixedModule.hash,
    localRuntime: baseline.runtimeVersion, reproducedCloudRuntime: reproducedFailure,
    fixedRuntime: runtime(sources.map(s => s.filePath === 'modules' ? {...s,hash:fixedModule.hash} : s)),
    nullHashDirectoriesAffectRuntime: false,
    actualEasMatcherPassed: true, nativeCompatibilityInputsUnchanged: true,
  };
  fs.writeFileSync(path.join(out, 'package-fingerprint-verification.json'), JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
})().catch(error => {console.error(error);process.exitCode=1;});
