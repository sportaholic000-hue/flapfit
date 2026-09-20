/* Disable the default publisher first-party ID in the locked iOS GMA bridge. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const expected = "2ce2dce24110451a8e2e06b4b7d0ffcdb0f6c3e42977859c765d0267efb84d88";
const patched = "91f13633ea3004989be5d785b9049f9c345a7372928e8313b3421b5f3fdf845a";
const marker = "// FLAP_FIT_ADMOB_FIRST_PARTY_ID_DISABLED_V1";
const insertion = "  // FLAP_FIT_ADMOB_FIRST_PARTY_ID_DISABLED_V1\n  [GADMobileAds.sharedInstance.requestConfiguration setPublisherFirstPartyIDEnabled:NO];\n";
const anchors = [
  "- (void)initialize:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {\n#if !TARGET_OS_MACCATALYST\n",
  "- (void)setRequestConfiguration:(NSDictionary *)requestConfiguration\n                        resolve:(RCTPromiseResolveBlock)resolve\n                         reject:(RCTPromiseRejectBlock)reject {\n#if !TARGET_OS_MACCATALYST\n"
];
const hash = (source) => crypto.createHash('sha256').update(source).digest('hex');
function transform(source) {
  if (source.includes(marker)) {
    if (hash(source) !== patched) throw Error('Modified Flap Fit AdMob privacy bridge');
    return source;
  }
  if (hash(source) !== expected) throw Error('AdMob privacy bridge source drift');
  for (const anchor of anchors) {
    if (source.split(anchor).length !== 2) throw Error('AdMob privacy method anchor changed');
    source = source.replace(anchor, anchor + insertion);
  }
  if (hash(source) !== patched) throw Error('AdMob privacy bridge transform mismatch');
  return source;
}
const consentExpected = "2520e8eb0b3025778673869cff83eda3c337ea61df9c0dde4e4ac411772dd34d";
const consentPatched = "cae39b04cb2c6b1ee701cde879d68e76c4e78d45167000056a6efe13cd9fcd86";
const consentMarker = "// FLAP_FIT_UMP_PRESENCE_AWARE_V2";
const consentReader = "// FLAP_FIT_UMP_PRESENCE_AWARE_V2\n- (id)flapFitStoredGdprApplies {\n  id value = [[NSUserDefaults standardUserDefaults] objectForKey:@\"IABTCF_gdprApplies\"];\n  if (![value isKindOfClass:[NSNumber class]]) return [NSNull null];\n  if ([value isEqual:@0]) return @NO;\n  if ([value isEqual:@1]) return @YES;\n  return [NSNull null];\n}\n\n- (id)flapFitStoredPurpose:(NSString *)key index:(NSUInteger)index {\n  id value = [[NSUserDefaults standardUserDefaults] objectForKey:key];\n  if (![value isKindOfClass:[NSString class]] || [value length] <= index) return [NSNull null];\n  NSCharacterSet *invalid = [[NSCharacterSet characterSetWithCharactersInString:@\"01\"] invertedSet];\n  if ([value rangeOfCharacterFromSet:invalid].location != NSNotFound) return [NSNull null];\n  return @([value characterAtIndex:index] == '1');\n}\n";
const consentTransforms = [
  [
    "RCT_EXPORT_MODULE();",
    "RCT_EXPORT_MODULE();\n\n// FLAP_FIT_UMP_PRESENCE_AWARE_V2\n- (id)flapFitStoredGdprApplies {\n  id value = [[NSUserDefaults standardUserDefaults] objectForKey:@\"IABTCF_gdprApplies\"];\n  if (![value isKindOfClass:[NSNumber class]]) return [NSNull null];\n  if ([value isEqual:@0]) return @NO;\n  if ([value isEqual:@1]) return @YES;\n  return [NSNull null];\n}\n\n- (id)flapFitStoredPurpose:(NSString *)key index:(NSUInteger)index {\n  id value = [[NSUserDefaults standardUserDefaults] objectForKey:key];\n  if (![value isKindOfClass:[NSString class]] || [value length] <= index) return [NSNull null];\n  NSCharacterSet *invalid = [[NSCharacterSet characterSetWithCharactersInString:@\"01\"] invertedSet];\n  if ([value rangeOfCharacterFromSet:invalid].location != NSNotFound) return [NSNull null];\n  return @([value characterAtIndex:index] == '1');\n}\n"
  ],
  [
    "  return @{\n    @\"status\" :",
    "  return @{\n    @\"flapFitPrivacySignalsVersion\" : @2,\n    @\"flapFitGdprApplies\" : [self flapFitStoredGdprApplies],\n    @\"flapFitPurposeOneConsent\" : [self flapFitStoredPurpose:@\"IABTCF_PurposeConsents\" index:0],\n    @\"flapFitPublisherPurposeOneConsent\" : [self flapFitStoredPurpose:@\"IABTCF_PublisherConsent\" index:0],\n    @\"flapFitPublisherPurposeSevenConsent\" : [self flapFitStoredPurpose:@\"IABTCF_PublisherConsent\" index:6],\n    @\"status\" :"
  ],
  [
    "    BOOL gdprApplies = [[NSUserDefaults standardUserDefaults] boolForKey:@\"IABTCF_gdprApplies\"];\n    resolve(@(gdprApplies));",
    "    resolve([self flapFitStoredGdprApplies]);"
  ]
];
const legacyConsentPatched = "21e7000b3875001556c0290a0b081a7fba7411be16bf796c777d360c398e8297";
const legacyConsentTransforms = [
  [
    "RCT_EXPORT_MODULE();",
    "RCT_EXPORT_MODULE();\n\n// FLAP_FIT_UMP_PRESENCE_AWARE_V1\n- (id)flapFitStoredGdprApplies {\n  id value = [[NSUserDefaults standardUserDefaults] objectForKey:@\"IABTCF_gdprApplies\"];\n  if (![value isKindOfClass:[NSNumber class]]) return [NSNull null];\n  if ([value isEqual:@0]) return @NO;\n  if ([value isEqual:@1]) return @YES;\n  return [NSNull null];\n}\n"
  ],
  [
    "  return @{\n    @\"status\" :",
    "  return @{\n    @\"flapFitPrivacySignalsVersion\" : @1,\n    @\"flapFitGdprApplies\" : [self flapFitStoredGdprApplies],\n    @\"status\" :"
  ],
  [
    "    BOOL gdprApplies = [[NSUserDefaults standardUserDefaults] boolForKey:@\"IABTCF_gdprApplies\"];\n    resolve(@(gdprApplies));",
    "    resolve([self flapFitStoredGdprApplies]);"
  ]
];
function transformConsent(source) {
  if (source.includes("// FLAP_FIT_UMP_PRESENCE_AWARE_V1")) {
    if (hash(source) !== legacyConsentPatched) throw Error("Modified legacy Flap Fit UMP presence bridge");
    for (const [before, after] of [...legacyConsentTransforms].reverse()) source = source.replace(after, before);
  }
  if(source.includes(consentMarker)) {
    if(hash(source)!==consentPatched) throw Error('Modified Flap Fit UMP presence bridge');
    return source;
  }
  if(hash(source)!==consentExpected) throw Error('UMP presence bridge source drift');
  for(const [before,after] of consentTransforms) {
    if(source.split(before).length!==2) throw Error('UMP presence bridge anchor changed');
    source=source.replace(before,after);
  }
  if(hash(source)!==consentPatched) throw Error('UMP presence bridge transform mismatch');
  return source;
}
function patchAdMobPrivacy(projectRoot) {
  const packageFile = require.resolve('react-native-google-mobile-ads/package.json', { paths: [projectRoot] });
  if (JSON.parse(fs.readFileSync(packageFile, 'utf8')).version !== '16.5.0') throw Error('AdMob privacy bridge requires exactly 16.5.0');
  const file = path.join(path.dirname(packageFile), 'ios/RNGoogleMobileAds/RNGoogleMobileAdsModule.mm');
  const source = fs.readFileSync(file, 'utf8');
  const result = transform(source);
  const consentFile=path.join(path.dirname(packageFile), 'ios/RNGoogleMobileAds/RNGoogleMobileAdsConsentModule.mm');
  const consentSource=fs.readFileSync(consentFile,'utf8');
  const consentResult=transformConsent(consentSource);
  // Validate both pinned sources before modifying either one.
  if (source !== result) fs.writeFileSync(file, result);
  if (consentSource !== consentResult) fs.writeFileSync(consentFile, consentResult);
  return file;
}
module.exports = { patchAdMobPrivacy, transform, marker, insertion, anchors, expected, patched, transformConsent, consentReader, consentTransforms, consentExpected, consentPatched, legacyConsentPatched, legacyConsentTransforms };
if (require.main === module) {
  patchAdMobPrivacy(process.argv[2]);
  console.log('AdMob 16.5.0 native publisher first-party ID disabling verified.');
}
