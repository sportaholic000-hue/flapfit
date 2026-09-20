/* Run the exact native presence reader against isolated defaults on macOS. */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { consentReader } = require('./patch-admob-privacy.cjs');
const defaultsReference = '[NSUserDefaults standardUserDefaults]';
assert.equal(consentReader.split(defaultsReference).length - 1, 2, 'Review native harness when default reads change.');
const reader = consentReader.replaceAll(defaultsReference, 'FFDefaults');
assert.ok(!reader.includes(defaultsReference), 'All native reads must use isolated test defaults.');
if (process.platform !== 'darwin') {
  console.log('UMP source isolation passed; native presence/purpose checks require macOS and were not executed here.');
  process.exit(0);
}
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'flapfit-ump-presence-'));
const source = path.join(folder, 'ConsentCheck.m'), executable = path.join(folder, 'ConsentCheck');
fs.writeFileSync(source, `#import <Foundation/Foundation.h>
#include <assert.h>
static NSUserDefaults *FFDefaults;
@interface ConsentCheck : NSObject
- (id)flapFitStoredGdprApplies;
- (id)flapFitStoredPurpose:(NSString *)key index:(NSUInteger)index;
@end
@implementation ConsentCheck
${reader}
@end
int main(void) { @autoreleasepool {
  FFDefaults = [[NSUserDefaults alloc] initWithSuiteName:[@"FlapFitPresenceTest." stringByAppendingString:NSUUID.UUID.UUIDString]];
  ConsentCheck *check = [ConsentCheck new];
  NSArray *values = @[[NSNull null], @NO, @YES, @2, @"1", @"true", @[], @{}];
  NSArray *expected = @[[NSNull null], @NO, @YES, [NSNull null], [NSNull null], [NSNull null], [NSNull null], [NSNull null]];
  for (NSUInteger i = 0; i < values.count; i++) {
    NSDictionary *domain = values[i] == [NSNull null] ? @{} : @{@"IABTCF_gdprApplies": values[i]};
    [FFDefaults setVolatileDomain:domain forName:NSArgumentDomain];
    assert([[check flapFitStoredGdprApplies] isEqual:expected[i]]);
  }
  id unknown = [NSNull null];
  NSArray *cases = @[
    @[unknown, unknown, unknown], @[@NO, unknown, unknown], @[@1, unknown, unknown],
    @[@[], unknown, unknown], @[@{}, unknown, unknown], @[@"", unknown, unknown],
    @[@"0", @NO, unknown], @[@"1", @YES, unknown], @[@"000000", @NO, unknown],
    @[@"0000000", @NO, @NO], @[@"1000000", @YES, @NO],
    @[@"0000001", @NO, @YES], @[@"1000001", @YES, @YES],
    @[@"1111111111", @YES, @YES], @[@"1000002", unknown, unknown],
    @[@"1000001x", unknown, unknown], @[@"1 ", unknown, unknown],
    @[@"01\\n", unknown, unknown], @[@"１000001", unknown, unknown]
  ];
  for (NSString *key in @[@"IABTCF_PurposeConsents", @"IABTCF_PublisherConsent"]) {
    for (NSArray *test in cases) {
      NSDictionary *domain = test[0] == unknown ? @{} : @{key: test[0]};
      [FFDefaults setVolatileDomain:domain forName:NSArgumentDomain];
      assert([[check flapFitStoredPurpose:key index:0] isEqual:test[1]]);
      assert([[check flapFitStoredPurpose:key index:6] isEqual:test[2]]);
      assert([[check flapFitStoredPurpose:key index:NSUIntegerMax] isEqual:unknown]);
    }
  }
  [FFDefaults setVolatileDomain:@{@"IABTCF_PurposeConsents": @"0000000", @"IABTCF_PublisherConsent": @"1000001"} forName:NSArgumentDomain];
  assert([[check flapFitStoredPurpose:@"IABTCF_PurposeConsents" index:0] isEqual:@NO]);
  assert([[check flapFitStoredPurpose:@"IABTCF_PublisherConsent" index:0] isEqual:@YES]);
  assert([[check flapFitStoredPurpose:@"IABTCF_PublisherConsent" index:6] isEqual:@YES]);
  [FFDefaults setVolatileDomain:@{@"IABTCF_PublisherConsents": @"1111111"} forName:NSArgumentDomain];
  assert([[check flapFitStoredPurpose:@"IABTCF_PublisherConsent" index:0] isEqual:unknown]);
  assert([[check flapFitStoredPurpose:@"IABTCF_PublisherConsent" index:6] isEqual:unknown]);
  puts("UMP native nullable GDPR and independent P1/P7 checks passed without advertising initialization.");
} return 0; }
`);
for (const [command, args] of [
  ['xcrun', ['--sdk', 'macosx', 'clang', '-fobjc-arc', '-framework', 'Foundation', source, '-o', executable]],
  [executable, []],
]) {
  const result = spawnSync(command, args, { stdio: 'inherit', timeout: 120000, env: { ...process.env, SDKROOT: undefined } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}