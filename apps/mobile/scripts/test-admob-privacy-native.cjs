/* Run the exact native presence reader against isolated defaults on macOS. */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { consentReader } = require('./patch-admob-privacy.cjs');
if(process.platform !== 'darwin') { console.log('UMP native presence checks require macOS; not executed here.'); process.exit(0); }
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'flapfit-ump-presence-'));
const source=path.join(folder,'ConsentCheck.m'), executable=path.join(folder,'ConsentCheck');
const reader=consentReader.replace('[NSUserDefaults standardUserDefaults]','FFDefaults');
fs.writeFileSync(source, '#import <Foundation/Foundation.h>\n#include <assert.h>\nstatic NSUserDefaults *FFDefaults;\n@interface ConsentCheck : NSObject\n- (id)flapFitStoredGdprApplies;\n@end\n@implementation ConsentCheck\n'+reader+'\n@end\nint main(void) { @autoreleasepool {\nFFDefaults = [[NSUserDefaults alloc] initWithSuiteName:[@"FlapFitPresenceTest." stringByAppendingString:NSUUID.UUID.UUIDString]];\nConsentCheck *check = [ConsentCheck new];\nNSArray *values = @[[NSNull null], @NO, @YES, @2, @"1", @"true", @[], @{}];\nNSArray *expected = @[[NSNull null], @NO, @YES, [NSNull null], [NSNull null], [NSNull null], [NSNull null], [NSNull null]];\nfor (NSUInteger i=0; i<values.count; i++) {\nNSDictionary *domain = values[i] == [NSNull null] ? @{} : @{@"IABTCF_gdprApplies": values[i]};\n[FFDefaults setVolatileDomain:domain forName:NSArgumentDomain];\nassert([[check flapFitStoredGdprApplies] isEqual:expected[i]]);\n}\nputs("UMP native presence: absent, true, false and invalid values passed without advertising initialization.");\n} return 0; }\n');
for(const [command,args] of [['xcrun',['--sdk','macosx','clang','-fobjc-arc','-framework','Foundation',source,'-o',executable]],[executable,[]]]) {
 const result=spawnSync(command,args,{stdio:'inherit',timeout:120000,env:{...process.env,SDKROOT:undefined}});
 if(result.error) throw result.error;
 if(result.status!==0) process.exit(result.status||1);
}
