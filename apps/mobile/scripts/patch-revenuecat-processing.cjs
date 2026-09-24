/* Version-pinned Flap Fit RevenueCat withdrawal fence. Fail closed on upstream changes. */

const fs=require('fs'),path=require('path'),crypto=require('crypto');

const hash=s=>crypto.createHash('sha256').update(s).digest('hex');

const hashes={
  "Sources/Networking/HTTPClient/HTTPClient.swift": "580140a4bc6b0cb1e8cb5c39f7c02342276e5aac4d0b42d55dd1a997f4564f34",
  "Sources/Networking/RemoteConfigBlobDownloader.swift": "cdc0f7621cb0141d82c15bb66e3d2176cabfe53738a7b0d59f6698b5f76f4327",
  "Sources/Ads/AdTracker.swift": "b8195ce419cfad308040af9fef69e407758e5e6bbf49600deaf1bf50897cc2aa",
  "Sources/Events/EventsManager.swift": "00d5d45ff19cede11b79f21062876966fb044b6541b07694d9af4208bbbbbe24",
  "Sources/Diagnostics/FileHandler.swift": "6511396dd658a8a966fa1a34028ccfea23e055ea262175c7e5aaa57b0296a78e",
  "Sources/Ads/Events/Networking/PostAdEventsOperation.swift": "d2d025e5a72721425bb5329252b07dcc2e0a39ef5860cf31d4c298e0a0f81eac",
  "Sources/Events/FeatureEvents/Networking/PostFeatureEventsOperation.swift": "f17bff74204435eaa8ddd4c67d09b489f1a215d43ce0c0ffd28f1721a7aec456",
  "Sources/Purchasing/Purchases/Purchases.swift": "a4acb2bbce5b6e1ab21a66b997ebec49ed5350b093fc0d6eb8da5ea62dbcaec6",
  "Sources/Purchasing/Purchases/PurchasesOrchestrator.swift": "1af8db54c9c3ee56aba81dfa73d5e375ca4ee718a23c7cf61846f9ce9ad9a200",
  "Sources/Misc/SystemInfo.swift": "e3f2a5612d7cf735a43c0de9cfe473b709f78e94601ed3e89f13df40be4e60d8"
};

const patchedHashes={
  "Sources/Networking/HTTPClient/HTTPClient.swift": "eb914290b333d88a1db5368aef91215bc10d965533b47d21c617274958ddff81",
  "Sources/Networking/RemoteConfigBlobDownloader.swift": "33467b8bec741e0f321088e874a5f34c0f03e0ba296cb7fbd6ee7cb1a3ee3c70",
  "Sources/Ads/AdTracker.swift": "96c005354992dab564ee9484bf919adcfa0934b13b83f663b5e23278671ad5f0",
  "Sources/Events/EventsManager.swift": "3c758e4981ecbf12b67bee53b7f38f3681e8082d8cab491f068f15d471c0c5c3",
  "Sources/Diagnostics/FileHandler.swift": "26f4ba649afe58ae35d4c817f6b777c1a0794aaadead142326ccaf2e7f3c9c13",
  "Sources/Ads/Events/Networking/PostAdEventsOperation.swift": "7d828bc27f4bc4137a234718693e6acaf128896a595826265843a0a55c75c97e",
  "Sources/Events/FeatureEvents/Networking/PostFeatureEventsOperation.swift": "b0c1b5009b8369739f15e6adf0faaab68b6e414c30bd19ace60d0bdf3c738d81",
  "Sources/Purchasing/Purchases/Purchases.swift": "8e7189f2dcc635aba99714e332159bafbc1ead11e0707402db3efe9e2f1d4c97",
  "Sources/Purchasing/Purchases/PurchasesOrchestrator.swift": "b946cc4f12e3569892fbf7b3089d2c47edcce918563907516284283c4815e646",
  "Sources/Misc/SystemInfo.swift": "fc075b4d830bd1709c5a0424cefb68aeee89e32d4e150ac730f47b7f769f305e"
};

const marker="// FLAP_FIT_RC_PROCESSING_FENCE_V1";

const gate="\n// Flap Fit consent fence, pinned to RevenueCat 5.88.0. No age values leave the app.\n@objc(FFRevenueCatProcessingGate)\npublic final class FFRevenueCatProcessingGate: NSObject {\n    private final class State: @unchecked Sendable {\n        let lock = NSRecursiveLock()\n        var allowed = false\n        var networkPaused = false\n        // Tasks not yet resumed need an owner while transport is paused.\n        var pendingTasks = Set<URLSessionTask>()\n        var generation: UInt64 = 0\n        let tasks = NSHashTable<URLSessionTask>.weakObjects()\n        var files = Set<URL>()\n    }\n    // This build is exclusively ad measurement; unrelated SDK processing stays off.\n    static let allowsNonAdProcessing = false\n    private static let state = State()\n    @TaskLocal static var workGeneration: UInt64?\n\n    static var currentGeneration: UInt64 { workGeneration ?? generation }\n\n    static var generation: UInt64 {\n        state.lock.lock()\n        defer { state.lock.unlock() }\n        return state.generation\n    }\n\n    static func accepts(_ generation: UInt64) -> Bool {\n        state.lock.lock()\n        defer { state.lock.unlock() }\n        return state.allowed && state.generation == generation\n    }\n\n    // Every task is registered and resumed while holding the same lock used by\n    // withdrawal. Older queued requests never become eligible after a new grant.\n    static func resume(_ task: URLSessionTask, generation: UInt64) {\n        state.lock.lock()\n        defer { state.lock.unlock() }\n        if state.allowed && state.generation == generation {\n            state.tasks.add(task)\n            if state.networkPaused { state.pendingTasks.insert(task) }\n            else { task.resume() }\n        } else {\n            task.cancel()\n            task.resume() // Complete the SDK callback with cancellation, without networking.\n        }\n    }\n\n    static func isEventFile(_ url: URL) -> Bool {\n        return [\"ad_event_store\", \"paywall_event_store\"].contains(url.lastPathComponent)\n            && url.deletingLastPathComponent().lastPathComponent == \"revenuecat\"\n    }\n\n    static func withEventWrite<T>(url: URL, generation: UInt64, _ work: () throws -> T) throws -> T {\n        state.lock.lock()\n        defer { state.lock.unlock() }\n        if isEventFile(url) {\n            state.files.insert(url)\n            guard state.allowed && state.generation == generation else { throw URLError(.cancelled) }\n        }\n        return try work()\n    }\n\n    // Exercise pauses transport only. Keep consent, generations and queued events.\n    @objc(setNetworkPaused:)\n    public static func setNetworkPaused(_ paused: Bool) -> Bool {\n        state.lock.lock()\n        defer { state.lock.unlock() }\n        if state.networkPaused == paused { return true }\n        state.networkPaused = paused\n        for task in state.tasks.allObjects {\n            if paused && task.state == .running { task.suspend() }\n            if !paused && state.allowed && task.state == .suspended { task.resume() }\n        }\n        if !paused { state.pendingTasks.removeAll() }\n        return true\n    }\n\n    @objc(setProcessingAllowed:)\n    public static func setProcessingAllowed(_ allowed: Bool) -> Bool {\n        state.lock.lock()\n        defer { state.lock.unlock() }\n        if allowed && state.allowed { return true }\n        state.allowed = false\n        state.generation &+= 1\n        for task in state.tasks.allObjects {\n            task.cancel()\n            // A never-started task still needs its cancelled completion delivered.\n            if state.pendingTasks.contains(task) { task.resume() }\n        }\n        state.pendingTasks.removeAll()\n        state.tasks.removeAllObjects()\n        // Include files from an earlier process before Purchases is configured.\n        if let base = DirectoryHelper.defaultPersistenceBaseUrl {\n            let directory = base.appendingPathComponent(\"revenuecat\")\n            state.files.insert(directory.appendingPathComponent(\"ad_event_store\"))\n            state.files.insert(directory.appendingPathComponent(\"paywall_event_store\"))\n        }\n        do {\n            for url in state.files where FileManager.default.fileExists(atPath: url.path) {\n                let handle = try FileHandle(forWritingTo: url)\n                defer { try? handle.close() }\n                // Truncation also clears the inode referenced by existing SDK handles.\n                try handle.truncate(atOffset: 0)\n                try handle.synchronize()\n            }\n        } catch {\n            return false // Do not re-enable if persisted analytics could not be removed.\n        }\n        state.allowed = allowed\n        return true\n    }\n}\n";

function one(s,a,b){if(s.split(a).length!==2)throw Error('Expected one patch anchor: '+a);return s.replace(a,b);}

function wrapBody(s,anchor,open,close){const start=s.indexOf(anchor);if(start<0||s.indexOf(anchor,start+1)>=0)throw Error('Ambiguous function: '+anchor);const brace=s.indexOf('{',start);let depth=1,end=brace+1;for(;depth&&end<s.length;end++){if(s[end]==='{')depth++;if(s[end]==='}')depth--;}if(depth)throw Error('No matching brace');return s.slice(0,brace+1)+'\n'+open+s.slice(brace+1,end-1)+close+'\n    '+s.slice(end-1);}


// This app sells no purchases/subscriptions. Keep genuine AdTracker delivery,
// but do not start purchase, paywall, attribution or configuration collection.
function replaceBody(s,anchor,body){
 const start=s.indexOf(anchor);if(start<0||s.indexOf(anchor,start+1)>=0)throw Error('Ambiguous function: '+anchor);
 const brace=s.indexOf('{',start);let depth=1,end=brace+1;
 for(;depth&&end<s.length;end++){if(s[end]==='{')depth++;if(s[end]==='}')depth--;}
 if(depth)throw Error('No matching brace');
 return s.slice(0,brace+1)+'\n'+body+'\n    '+s.slice(end-1);
}
function adsOnlyTransform(name,s){
 if(name.endsWith('/HTTPClient.swift')){
  s=one(s,'        // NOTE: these authHeaders will not include any token-based Authorization headers',
   '        // Flap Fit uses RevenueCat only for publisher ad measurement.\n'+
   '        guard request.path is HTTPRequest.AdPath else {\n'+
   '            completionHandler?(.failure(.networkError(URLError(.cancelled))))\n'+
   '            return\n        }\n'+
   '        // NOTE: these authHeaders will not include any token-based Authorization headers');
  s=one(s,'        if let idfv = self.systemInfo.identifierForVendor {\n            headers["X-Apple-Device-Identifier"] = idfv\n        }',
   '        // Flap Fit does not collect/send IDFV for ad measurement.');
  s=one(s,'        let generation = FFRevenueCatProcessingGate.currentGeneration\n        let task = self.session.dataTask(with: url)',
   '        guard FFRevenueCatProcessingGate.allowsNonAdProcessing else { completion(.failure(URLError(.cancelled))); return }\n'+
   '        let generation = FFRevenueCatProcessingGate.currentGeneration\n        let task = self.session.dataTask(with: url)');
 } else if(name.endsWith('/RemoteConfigBlobDownloader.swift')){
  s=one(s,'        let generation = FFRevenueCatProcessingGate.currentGeneration',
   '        guard FFRevenueCatProcessingGate.allowsNonAdProcessing else { throw URLError(.cancelled) }\n'+
   '        let generation = FFRevenueCatProcessingGate.currentGeneration');
 } else if(name.endsWith('/Purchases.swift')){
  s=one(s,'            automaticDeviceIdentifierCollectionEnabled: automaticDeviceIdentifierCollectionEnabled)',
   '            automaticDeviceIdentifierCollectionEnabled: false) // Flap Fit: no attribution identifiers.');
  s=one(s,'            purchasesOrchestrator.setSK2PurchaseIntentListener(StoreKit2PurchaseIntentListener())',
   '            // Flap Fit has no purchases: do not register purchase-intent observation.');
  s=one(s,'        self.performInitialForegroundSetup()',
   '        // Flap Fit ads-only: no initial customer, offering, entitlement, config or health fetch.');
  s=one(s,'        if self.systemInfo.dangerousSettings.autoSyncPurchases {\n            self.paymentQueueWrapper.sk1Wrapper?.delegate = purchasesOrchestrator\n        } else {\n            Logger.warn(Strings.configure.autoSyncPurchasesDisabled)\n        }',
   '        // Flap Fit has no purchases: do not attach StoreKit transaction delegates.');
  s=one(s,'        self.paymentQueueWrapper.sk2Wrapper?.delegate = purchasesOrchestrator','        // No StoreKit 2 payment-queue delegate.');
  s=one(s,'        self.attributionPoster.postPostponedAttributionDataIfNeeded()',
   '        // No postponed attribution collection or sync.');
  s=one(s,'        self.transactionMetadataSyncHelper.syncIfNeeded(\n            allowSharingAppStoreAccount: purchasesOrchestrator.allowSharingAppStoreAccount\n        )',
   '        // No cached purchase metadata sync.');
  s=replaceBody(s,'    @objc func applicationDidBecomeActive() {',
   '        // Flap Fit has no purchase reconciliation on becoming active.');
  s=replaceBody(s,'    @objc func applicationWillEnterForeground() {',
   '        self.systemInfo.isAppBackgroundedState = false\n'+
   '        #if !ENABLE_CUSTOM_ENTITLEMENT_COMPUTATION\n'+
   '        self.purchasesOrchestrator.postEventsIfNeeded(delayed: true)\n'+
   '        #endif');
  s=replaceBody(s,'    func dispatchSyncSubscriberAttributes() {',
   '        // Flap Fit does not submit subscriber attributes.');
 } else if(name.endsWith('/PurchasesOrchestrator.swift')){
  const start='        storeKit2StorefrontListener.delegate = self';
  const end='        Task {\n            await syncDiagnosticsIfNeeded()\n        }';
  const i=s.indexOf(start),j=s.indexOf(end,i);
  if(i<0||j<0||s.indexOf(start,i+1)>=0||s.indexOf(end,j+1)>=0)throw Error('StoreKit startup anchors drift');
  s=s.slice(0,i)+'        // Flap Fit ads-only: no StoreKit/storefront/message listeners or diagnostic sync.'+s.slice(j+end.length);
 } else if(name.endsWith('/SystemInfo.swift')){
  s=one(s,'        return !self.dangerousSettings.customEntitlementComputation',
   '        return false // Flap Fit ads-only: no remote-config/paywall workflow startup.');
 } else if(name.endsWith('/EventsManager.swift')){
  s=one(s,'    func track(featureEvent: FeatureEvent) async {',
   '    func track(featureEvent: FeatureEvent) async {\n'+
   '        guard FFRevenueCatProcessingGate.allowsNonAdProcessing else { return }');
 }
 return s;
}

function transform(name,s){
 if(name.endsWith('/HTTPClient.swift')){
  s=one(s,'struct Request: CustomStringConvertible {','struct Request: CustomStringConvertible {\n        let flapFitGeneration = FFRevenueCatProcessingGate.currentGeneration');
  s=one(s,'        task.resume()','        FFRevenueCatProcessingGate.resume(task, generation: request.flapFitGeneration)');
  s=one(s,'        if let networkError = networkError {','        guard FFRevenueCatProcessingGate.accepts(request.flapFitGeneration) else {\n            return .failure(.networkError(URLError(.cancelled)))\n        }\n        if let networkError = networkError {');
  s=one(s,'        self.session.dataTask(with: url) { data, response, error in','        let generation = FFRevenueCatProcessingGate.currentGeneration\n        let task = self.session.dataTask(with: url) { data, response, error in\n            guard FFRevenueCatProcessingGate.accepts(generation) else { completion(.failure(URLError(.cancelled))); return }');
  s=one(s,'        }.resume()','        }\n        FFRevenueCatProcessingGate.resume(task, generation: generation)');
  s+='\n'+gate;
 } else if(name.endsWith('/RemoteConfigBlobDownloader.swift')){
  s=one(s,'        return try await withCheckedThrowingContinuation { continuation in','        let generation = FFRevenueCatProcessingGate.currentGeneration\n        return try await withCheckedThrowingContinuation { continuation in');
  s=one(s,'                if let error {','                guard FFRevenueCatProcessingGate.accepts(generation) else { continuation.resume(throwing: URLError(.cancelled)); return }\n                if let error {');
  s=one(s,'            task.resume()','            FFRevenueCatProcessingGate.resume(task, generation: generation)');
 } else if(name.endsWith('/AdTracker.swift')){
  const regex=/        Task \{\n([\s\S]*?)\n        \}/g;let count=0;
  s=s.replace(regex,(_,body)=>{count++;return '        let generation = FFRevenueCatProcessingGate.currentGeneration\n        guard FFRevenueCatProcessingGate.accepts(generation) else { return }\n        Task {\n            await FFRevenueCatProcessingGate.$workGeneration.withValue(generation) {\n                guard FFRevenueCatProcessingGate.accepts(generation) else { return }\n'+body+'\n            }\n        }';});
  if(count!==9)throw Error('Expected 9 AdTracker tasks, got '+count);
 } else if(name.endsWith('/EventsManager.swift')){
  for(const anchor of ['    func track(featureEvent: FeatureEvent) async {','    func track(adEvent: AdEvent) async {']){
   s=wrapBody(s,anchor,'        let generation = FFRevenueCatProcessingGate.currentGeneration\n        await FFRevenueCatProcessingGate.$workGeneration.withValue(generation) {\n            guard FFRevenueCatProcessingGate.accepts(generation) else { return }','\n        }');
  }
  for(const anchor of ['    func flushAllEvents(batchSize: Int) async throws -> Int {','    func flushFeatureEvents(batchSize: Int) async throws -> Int {']){
   s=wrapBody(s,anchor,'        let generation = FFRevenueCatProcessingGate.currentGeneration\n        return try await FFRevenueCatProcessingGate.$workGeneration.withValue(generation) {\n            guard FFRevenueCatProcessingGate.accepts(generation) else { return 0 }','\n        }');
  }
  s=one(s,'    nonisolated func withBackgroundTask(name: String, do work: @escaping () async -> Void) {','    nonisolated func withBackgroundTask(name: String, do work: @escaping () async -> Void) {\n        let generation = FFRevenueCatProcessingGate.currentGeneration\n        guard FFRevenueCatProcessingGate.accepts(generation) else { return }');
  s=one(s,'            await work()','            await FFRevenueCatProcessingGate.$workGeneration.withValue(generation) {\n                if FFRevenueCatProcessingGate.accepts(generation) { await work() }\n            }');
 } else if(name.endsWith('/FileHandler.swift')){
  // These bodies contain no await: the same recursive lock covers checking the
  // generation, all writes/file replacement, and withdrawal's truncate.
  for(const anchor of ['    func append(line: String) throws {','    func emptyFile() async throws {','    func removeFirstLines(_ count: Int) async throws {']){
   s=wrapBody(s,anchor,'        try FFRevenueCatProcessingGate.withEventWrite(url: self.url, generation: FFRevenueCatProcessingGate.currentGeneration) {','\n        }');
  }
 } else if(/Post(Ad|Feature)EventsOperation.swift$/.test(name)){
  s=one(s,'    private let configuration: Configuration','    private let flapFitGeneration = FFRevenueCatProcessingGate.currentGeneration\n    private let configuration: Configuration');
  s=wrapBody(s,'    override func begin(completion: @escaping () -> Void) {','        FFRevenueCatProcessingGate.$workGeneration.withValue(self.flapFitGeneration) {','\n        }');
 }
 return adsOnlyTransform(name,s)+'\n'+marker+'\n';
}

function patchPods(podsRoot,resolvedVersions){
 // Registry pods need not exist in Local Podspecs. CocoaPods supplies the actual
 // resolved root-spec versions from installer.pod_targets in post_install.
 for(const [name,expected] of Object.entries({PurchasesHybridCommon:'18.37.0',RevenueCat:'5.88.0'})){
  const actual=resolvedVersions && typeof resolvedVersions==='object' && !Array.isArray(resolvedVersions) ? resolvedVersions[name] : undefined;
  if(actual!==expected)throw Error('RevenueCat consent fence requires resolved '+name+' '+expected+'; got '+(actual??'missing'));
 }
 const changes=[];
 for(const [name,expected]of Object.entries(hashes)){
  const file=path.join(podsRoot,'RevenueCat',name);const source=fs.readFileSync(file,'utf8');
  if(source.includes(marker)){
   if(hash(source)===patchedHashes[name])continue;
   // A cached, byte-verified preceding fence can receive this one transport-only
   // addition. Unknown or hand-edited native sources still fail closed.
   if(name==='Sources/Networking/HTTPClient/HTTPClient.swift' && hash(source)==='7d08f4dba8b22ec9b67cf1460239f03d938796c47a919fc5b4d2f488436d96e8'){
    const start=source.indexOf('\n// Flap Fit consent fence, pinned to RevenueCat 5.88.0.');
    const end=source.indexOf('\n'+marker+'\n',start);
    if(start<0||end<0)throw Error('Previous RevenueCat fence boundary missing');
    const updated=source.slice(0,start)+gate+source.slice(end);
    if(hash(updated)!==patchedHashes[name])throw Error('Previous RevenueCat fence upgrade drift');
    changes.push([file,updated]);continue;
   }
   throw Error('Modified RevenueCat consent fence: '+name);
  }
  if(hash(source)!==expected)throw Error('RevenueCat source drift: '+name);
  changes.push([file,transform(name,source)]);
 }
 for(const [file,source]of changes){
  // CocoaPods can make downloaded sources read-only before post_install.
  // Only the version/hash-verified target is writable, then its mode is restored.
  const mode=fs.statSync(file).mode;
  try{fs.chmodSync(file,mode|0o200);fs.writeFileSync(file,source);}
  finally{fs.chmodSync(file,mode);}
 }
 console.log('RevenueCat 5.88.0 consent fence verified ('+changes.length+' files patched).');
 return changes.length;
}

function patchBridge(projectRoot){
 const packageFile=require.resolve('react-native-purchases/package.json',{paths:[projectRoot]});
 if(JSON.parse(fs.readFileSync(packageFile,'utf8')).version!=='10.9.1')throw Error('Consent bridge requires react-native-purchases 10.9.1');
 const file=path.join(path.dirname(packageFile),'ios/RNPurchases.m');let source=fs.readFileSync(file,'utf8');
 if(source.includes('flapFitSetNetworkPaused')){if(hash(source)!=='c303c99f7055c179aa1285ab70b20ac5263033743efbd63a21566566bee5b2f1')throw Error('Modified RN consent bridge');return;}
 const upgrading = hash(source)==='b5ddd8cee3a5d9961387410fe7b0db5c6b81efd8fb04165224b3248b40b66870';
 if(!upgrading && hash(source)!=='0580cbe71082f44919b0c8eb79504cde48157f2194e34c5ad6bdf7ae1bc1710a')throw Error('RN Purchases consent bridge source drift');
 if(!upgrading) source=one(source,'RCT_EXPORT_MODULE();',`RCT_EXPORT_MODULE();

// FLAP_FIT_RC_PROCESSING_FENCE_V1
RCT_EXPORT_METHOD(flapFitSetProcessingAllowed:(BOOL)allowed
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    Class gate = NSClassFromString(@"FFRevenueCatProcessingGate");
    SEL selector = NSSelectorFromString(@"setProcessingAllowed:");
    if (!gate || ![gate respondsToSelector:selector]) {
        reject(@"flap_fit_processing_fence_missing", @"RevenueCat processing fence missing", nil);
        return;
    }
    BOOL (*apply)(id, SEL, BOOL) = (BOOL (*)(id, SEL, BOOL))[gate methodForSelector:selector];
    resolve(@(apply(gate, selector, allowed)));
}
`);
 source=one(source,'RCT_EXPORT_MODULE();','RCT_EXPORT_MODULE();\n'+"\n// Exercise pause is separate from withdrawal: it never deletes stored events.\nRCT_EXPORT_METHOD(flapFitSetNetworkPaused:(BOOL)paused\n                  resolver:(RCTPromiseResolveBlock)resolve\n                  rejecter:(RCTPromiseRejectBlock)reject) {\n    Class gate = NSClassFromString(@\"FFRevenueCatProcessingGate\");\n    SEL selector = NSSelectorFromString(@\"setNetworkPaused:\");\n    if (!gate || ![gate respondsToSelector:selector]) {\n        reject(@\"flap_fit_network_pause_missing\", @\"RevenueCat network pause missing\", nil);\n        return;\n    }\n    BOOL (*apply)(id, SEL, BOOL) = (BOOL (*)(id, SEL, BOOL))[gate methodForSelector:selector];\n    resolve(@(apply(gate, selector, paused)));\n}\n");
 if(hash(source)!=='c303c99f7055c179aa1285ab70b20ac5263033743efbd63a21566566bee5b2f1')throw Error('Unexpected RN consent bridge output');
 fs.writeFileSync(file,source);
}

module.exports={patchPods,patchBridge,transform,gate,sourceFiles:Object.keys(hashes)};
if(require.main===module){
 let versions;
 try{versions=JSON.parse(process.argv[3]??'null');}catch{throw Error('RevenueCat consent fence requires CocoaPods resolved-version JSON');}
 patchPods(process.argv[2],versions);
}
