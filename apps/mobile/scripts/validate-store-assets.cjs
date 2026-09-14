const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const assetRoot = path.join(appRoot, 'store-assets');
const failures = [];

function fail(message) {
  failures.push(message);
}

function pngInfo(filePath) {
  const data = fs.readFileSync(filePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (data.length < 33 || !data.subarray(0, 8).equals(signature)) {
    throw new Error('not a PNG');
  }
  return {
    kind: 'png',
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    bitDepth: data[24],
    colorType: data[25],
    hasAlphaChannel: data[25] === 4 || data[25] === 6 || data.includes(Buffer.from('tRNS')),
    bytes: data.length,
  };
}

function jpegInfo(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    throw new Error('not a JPEG');
  }
  let offset = 2;
  while (offset + 9 < data.length) {
    while (data[offset] === 0xff) offset += 1;
    const marker = data[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = data.readUInt16BE(offset);
    const isStartOfFrame = [
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
    ].includes(marker);
    if (isStartOfFrame) {
      return {
        kind: 'jpeg',
        width: data.readUInt16BE(offset + 5),
        height: data.readUInt16BE(offset + 3),
        hasAlphaChannel: false,
        bytes: data.length,
      };
    }
    if (length < 2) break;
    offset += length;
  }
  throw new Error('JPEG dimensions were not found');
}

function imageInfo(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.png') return pngInfo(filePath);
  if (extension === '.jpg' || extension === '.jpeg') return jpegInfo(filePath);
  throw new Error('must be PNG or JPEG');
}

function requireImage(relativePath, validate) {
  const filePath = path.join(assetRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`${relativePath}: missing`);
    return;
  }
  try {
    validate(imageInfo(filePath));
  } catch (error) {
    fail(`${relativePath}: ${error instanceof Error ? error.message : 'invalid image'}`);
  }
}

function imageFiles(relativeDirectory) {
  const directory = path.join(assetRoot, relativeDirectory);
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:png|jpe?g)$/i.test(entry.name))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

const appIcon = pngInfo(path.join(appRoot, 'assets', 'images', 'icon.png'));
if (appIcon.width !== 1024 || appIcon.height !== 1024) {
  fail('assets/images/icon.png: iOS source icon must be exactly 1024x1024');
}

requireImage('google-play/icon-512.png', (info) => {
  if (
    info.kind !== 'png' ||
    info.width !== 512 ||
    info.height !== 512 ||
    info.bitDepth !== 8 ||
    info.colorType !== 6
  ) {
    throw new Error('must be a 512x512 32-bit RGBA PNG');
  }
  if (info.bytes > 1024 * 1024) throw new Error('must be 1 MB or smaller');
});

requireImage('google-play/feature-graphic-1024x500.png', (info) => {
  if (
    info.kind !== 'png' ||
    info.width !== 1024 ||
    info.height !== 500 ||
    info.bitDepth !== 8 ||
    info.colorType !== 2 ||
    info.hasAlphaChannel
  ) {
    throw new Error('must be a 1024x500 24-bit RGB PNG with no alpha');
  }
});

const appleScreenshotSizes = new Set([
  '1260x2736',
  '1290x2796',
  '1320x2868',
  '2736x1260',
  '2796x1290',
  '2868x1320',
]);
const appleScreenshots = imageFiles('app-store/iphone-6.9');
if (appleScreenshots.length < 1 || appleScreenshots.length > 10) {
  fail('app-store/iphone-6.9: provide 1 to 10 genuine screenshots');
}
for (const filePath of appleScreenshots) {
  try {
    const info = imageInfo(filePath);
    if (!appleScreenshotSizes.has(`${info.width}x${info.height}`)) {
      fail(`${path.basename(filePath)}: unsupported iPhone 6.9-inch screenshot dimensions`);
    }
    if (info.hasAlphaChannel) {
      fail(`${path.basename(filePath)}: App Store screenshots cannot contain an alpha channel`);
    }
  } catch (error) {
    fail(`${path.basename(filePath)}: ${error instanceof Error ? error.message : 'invalid image'}`);
  }
}

const googleScreenshots = imageFiles('google-play/phone');
if (googleScreenshots.length < 4 || googleScreenshots.length > 8) {
  fail('google-play/phone: provide 4 to 8 genuine phone screenshots');
}
for (const filePath of googleScreenshots) {
  try {
    const info = imageInfo(filePath);
    const minimum = Math.min(info.width, info.height);
    const maximum = Math.max(info.width, info.height);
    if (minimum < 320 || maximum > 3840 || maximum > minimum * 2) {
      fail(
        `${path.basename(filePath)}: Google screenshot dimensions are outside 320-3840px or exceed 2:1`
      );
    }
    if (minimum < 1080) {
      fail(
        `${path.basename(filePath)}: use at least 1080px on the short edge for Play promotion eligibility`
      );
    }
    if (info.bytes > 8 * 1024 * 1024) {
      fail(`${path.basename(filePath)}: Google screenshots must be 8 MB or smaller`);
    }
    if (info.hasAlphaChannel) {
      fail(`${path.basename(filePath)}: Google screenshots cannot contain an alpha channel`);
    }
  } catch (error) {
    fail(`${path.basename(filePath)}: ${error instanceof Error ? error.message : 'invalid image'}`);
  }
}

if (failures.length) {
  console.error('Flap Fit store assets are incomplete:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Flap Fit Apple and Google store assets pass local validation.');
}
