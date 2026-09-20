const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

// A real xcarchive preserves Xcode Organizer's native privacy-report input.
// This does not manufacture or claim to generate an Xcode aggregate report.
function findArchives(root, readIdentity) {
  if (!fs.existsSync(root)) return [];
  const archives = [];
  for (const day of fs.readdirSync(root, { withFileTypes: true })) {
    if (!day.isDirectory() || day.isSymbolicLink()) continue;
    for (const entry of fs.readdirSync(path.join(root, day.name), { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || !entry.name.endsWith('.xcarchive')) continue;
      const archive = path.join(root, day.name, entry.name);
      if (readIdentity(archive) === 'com.flapfit.game') archives.push(archive);
    }
  }
  return archives;
}
function retainArchive() {
  if (process.env.EAS_BUILD_PLATFORM !== 'ios' ||
      !['production', 'ios-device-check'].includes(process.env.EAS_BUILD_PROFILE)) return;
  if (process.platform !== 'darwin') throw new Error('The signed archive must be collected on its macOS build worker.');
  const root = path.join(os.homedir(), 'Library', 'Developer', 'Xcode', 'Archives');
  const matches = findArchives(root, archive => execFileSync('/usr/libexec/PlistBuddy',
    ['-c', 'Print :ApplicationProperties:CFBundleIdentifier', path.join(archive, 'Info.plist')], { encoding: 'utf8' }).trim());
  // A fresh EAS worker should have exactly the archive for this build. Never
  // quietly choose an unrelated or stale artifact when that assumption fails.
  if (matches.length !== 1) throw new Error(`Expected one Flap Fit archive, found ${matches.length}.`);
  const output = path.resolve(__dirname, '..', 'release-evidence');
  fs.mkdirSync(output, { recursive: true });
  const zip = path.join(output, 'FlapFit.xcarchive.zip');
  execFileSync('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', matches[0], zip]);
  const data = { buildId: process.env.EAS_BUILD_ID ?? null,
    sourceCommit: process.env.EAS_BUILD_GIT_COMMIT_HASH ?? null,
    archiveName: path.basename(matches[0]), bytes: fs.statSync(zip).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex'),
    aggregatePrivacyReportGenerated: false };
  fs.writeFileSync(path.join(output, 'archive-evidence.json'), JSON.stringify(data, null, 2) + '\n');
  console.log('Retained the actual signed Xcode archive as a separate EAS artifact.');
}
module.exports = { findArchives, retainArchive };
if (require.main === module) retainArchive();
