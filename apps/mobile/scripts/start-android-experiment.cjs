const { spawn } = require('node:child_process');
const path = require('node:path');
const profile = require('../eas.json').build['android-closed-testing'];
const requested = process.argv.slice(2);
const args = requested.length ? requested : ['--tunnel', '--port', '8081', '--max-workers', '2'];
// Local Expo Go only. This command does not build, submit, or publish an update.
const child = spawn(process.execPath, [path.join(__dirname, 'start-expo-go.cjs'), ...args], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, ...profile.env },
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
