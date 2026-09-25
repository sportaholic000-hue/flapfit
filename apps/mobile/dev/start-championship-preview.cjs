// Local-only preview server. This file is never used by EAS builds or updates.
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const appRoot = path.resolve(__dirname, '..');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Flap Fit championship preview</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0f172a;font-family:system-ui,sans-serif}#root{display:flex;width:100%;max-width:430px;height:100%;margin:0 auto}.loading{margin:auto;padding:24px;color:white;text-align:center}</style></head>
<body><div id="root"><div class="loading">Loading the Flap Fit development preview…</div></div>
<script src="http://localhost:8991/apps/mobile/dev/championship-preview.tsx.bundle?platform=web&dev=true&hot=false&lazy=false"></script></body></html>`;
const page = http.createServer((req, res) => {
  if (req.url !== '/') return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html);
});
const cli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin/cli');
const metro = spawn(process.execPath, [cli, 'start', '--port', '8991', '--localhost', '--max-workers', '1'], {
  cwd: appRoot,
  windowsHide: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: '1',
    EXPO_NO_TELEMETRY: '1',
    EXPO_OFFLINE: '1',
    EXPO_OVERRIDE_METRO_CONFIG: path.join(__dirname, 'championship.metro.cjs'),
  },
});
const stop = () => { page.close(); metro.kill(); };
page.on('error', error => { console.error(error); stop(); process.exitCode = 1; });
metro.on('error', error => { console.error(error); stop(); process.exitCode = 1; });
metro.on('exit', code => { page.close(); process.exitCode = code ?? 0; });
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
page.listen(8990, '127.0.0.1', () => {
  console.log('Championship preview: http://127.0.0.1:8990 (wait for Metro before opening)');
});
