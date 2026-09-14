const { spawnSync } = require('node:child_process');

if (process.env.EAS_BUILD_PROFILE !== 'production') {
  console.log('Skipping production release validation for this EAS build profile.');
  process.exit(0);
}

const result = spawnSync(process.execPath, ['./scripts/validate-release-config.cjs'], {
  cwd: __dirname + '/..',
  env: process.env,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
