/* Checks pinned fresh install and previous-bridge migration without native build. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {patchBridge}=require('./patch-revenuecat-processing.cjs');
const installed=path.dirname(require.resolve('react-native-purchases/package.json'));
const input=fs.readFileSync(path.join(installed,'ios/RNPurchases.m'),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const raw=input.replace(/\n\n\/\/ Exercise pause is separate from withdrawal:[\s\S]*?\n\}\n/,'')
 .replace(/\n\n\/\/ FLAP_FIT_RC_PROCESSING_FENCE_V1\nRCT_EXPORT_METHOD\(flapFitSetProcessingAllowed:[\s\S]*?\n\}\n/,'');
assert.equal(hash(raw),'0580cbe71082f44919b0c8eb79504cde48157f2194e34c5ad6bdf7ae1bc1710a','fixture must recover exact locked upstream source');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'flapfit-rc-bridge-'));
const pkg=path.join(directory,'node_modules/react-native-purchases');
fs.mkdirSync(path.join(pkg,'ios'),{recursive:true});
fs.writeFileSync(path.join(pkg,'package.json'),JSON.stringify({name:'react-native-purchases',version:'10.9.1'}));
const file=path.join(pkg,'ios/RNPurchases.m');
for(const source of [raw,input]){
 fs.writeFileSync(file,source);
 patchBridge(directory);
 const patched=fs.readFileSync(file,'utf8');
 assert.equal(hash(patched),'c303c99f7055c179aa1285ab70b20ac5263033743efbd63a21566566bee5b2f1');
 patchBridge(directory);
 assert.equal(fs.readFileSync(file,'utf8'),patched);
 fs.writeFileSync(file,patched+'// tamper');
 assert.throws(()=>patchBridge(directory),/Modified RN consent bridge/);
}
console.log('RevenueCat bridge: exact upstream source, installed bridge migration, output hash, idempotence and tamper rejection passed. Objective-C execution still requires Apple toolchain.');
