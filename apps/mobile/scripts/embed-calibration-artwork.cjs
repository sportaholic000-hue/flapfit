// Embeds the exact lossless files used by the iOS calibration WebView.
const fs = require('node:fs');
const path = require('node:path');
const app = path.resolve(__dirname, '..');
const assets = path.join(app, 'assets/images/calibration');
const manifest = JSON.parse(fs.readFileSync(path.join(assets, 'ios-artwork-manifest.json'), 'utf8'));
const lines = [
  '// Generated from the bundled lossless calibration WebP assets.',
  '// See scripts/embed-calibration-artwork.cjs. No runtime processing or network requests.',
  'export const IOS_CALIBRATION_IMAGES = {',
];
for (const pose of manifest) {
  const bytes = fs.readFileSync(path.join(assets, pose.pose + '.webp'));
  const dataUri = 'data:image/webp;base64,' + bytes.toString('base64');
  const bounds = ['x', 'y', 'width', 'height'].map(key => key + ': ' + Number(pose[key].toFixed(3))).join(', ');
  lines.push('  ' + pose.pose + ': {dataUri: ' + JSON.stringify(dataUri) + ', ' + bounds + '},');
}
lines.push('} as const;');
fs.writeFileSync(path.join(app, 'src/utils/game/iosCalibrationImageData.ts'), lines.join('\n') + '\n');
console.log('Embedded ' + manifest.length + ' lossless calibration poses.');
