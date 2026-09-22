const fs = require('node:fs');
const path = require('node:path');

function validateTrackerAssets(appRoot, readFile = fs.readFileSync) {
  const loaderPath = path.join(appRoot, 'src/utils/game/mediapipeAssets.ts');
  const source = readFile(loaderPath, 'utf8');
  // Read the same literal asset declarations and byte counts used on device.
  // Fail closed if their shape changes; never derive expected sizes from files
  // that may already have been altered by a build checkout.
  const declarations = [...source.matchAll(/module:\s*require\(['"]([^'"]+\.mpasset)['"]\)\s*,\s*runtimeName:\s*['"]([^'"]+)['"]\s*,\s*expectedBytes:\s*([\d_]+)/g)];
  if (declarations.length !== 6) return ['Expected six explicit bundled tracker asset declarations.'];
  const failures = [];
  for (const [, relative, name, literalBytes] of declarations) {
    const expected = Number(literalBytes.replaceAll('_', ''));
    try {
      const bytes = readFile(path.resolve(path.dirname(loaderPath), relative));
      if (bytes.length !== expected) failures.push(`${name}: expected ${expected} bytes, found ${bytes.length}; the on-device tracker would reject this file.`);
    } catch (error) {
      failures.push(`${name}: cannot read bundled asset (${error.code || error.message}).`);
    }
  }
  return failures;
}

module.exports = { validateTrackerAssets };

if (require.main === module) {
  const failures = validateTrackerAssets(path.resolve(__dirname, '..'));
  if (failures.length) {
    console.error('Bundled tracker validation failed:\n' + failures.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('All six bundled tracker assets match the exact on-device byte requirements.');
  }
}
