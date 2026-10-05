const { spawn } = require('node:child_process');

const expoCli = require.resolve('expo/bin/cli');
const requestedArgs = process.argv.slice(2);
const connectionFlags = new Set(['--lan', '--tunnel', '--localhost']);
const connectionFlag = requestedArgs.find((arg) => connectionFlags.has(arg)) ?? '--lan';
const forwardedArgs = requestedArgs.filter((arg) => !connectionFlags.has(arg));
const child = spawn(
  process.execPath,
  [expoCli, 'start', connectionFlag, '--go', ...forwardedArgs],
  {
    cwd: __dirname + '/..',
    env: { ...process.env, FLAPFIT_ANDROID_EXPO_GO: '1' },
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
