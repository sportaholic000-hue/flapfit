const { spawn } = require('node:child_process');

const expoCli = require.resolve('expo/bin/cli');
const child = spawn(
  process.execPath,
  [expoCli, 'start', '--lan', '--go', ...process.argv.slice(2)],
  {
    cwd: __dirname + '/..',
    env: process.env,
    stdio: 'inherit',
  }
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
