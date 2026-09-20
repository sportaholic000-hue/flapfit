const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findArchives } = require('./retain-ios-archive.cjs');
test('archive selection excludes nonarchives and other app identities, preserving ambiguity', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flapfit-archive-test-'));
  try {
    for (const name of ['Flap Fit.xcarchive', 'Other.xcarchive', 'unrelated'])
      fs.mkdirSync(path.join(root, '2026-09-20', name), {recursive:true});
    const identity = archive => path.basename(archive).startsWith('Other') ? 'com.other.app' : 'com.flapfit.game';
    expect(findArchives(root,identity)).toEqual([path.join(root,'2026-09-20','Flap Fit.xcarchive')]);
    fs.mkdirSync(path.join(root,'2026-09-20','Flap Fit old.xcarchive'));
    expect(findArchives(root,identity)).toHaveLength(2);
    expect(findArchives(path.join(root,'missing'),identity)).toEqual([]);
  } finally {
    if (path.dirname(path.resolve(root)) === path.resolve(os.tmpdir()) && path.basename(root).startsWith('flapfit-archive-test-')) {
      fs.rmSync(root,{recursive:true,force:true});
    }
  }
});
