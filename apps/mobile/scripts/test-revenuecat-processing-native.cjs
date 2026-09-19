/* Run on the macOS iOS build host; exercises the actual generated Swift fence. */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { gate } = require('./patch-revenuecat-processing.cjs');
if (process.platform !== 'darwin') {
  console.log('RevenueCat native fence tests require macOS; not executed on this host.');
  process.exit(0);
}
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'flapfit-rc-fence-'));
const source = path.join(folder, 'FenceCheck.swift');
const executable = path.join(folder, 'FenceCheck');
const harness = `
import Foundation

enum DirectoryHelper {
  static let defaultPersistenceBaseUrl: URL? = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
}
${gate}

final class SinkProtocol: URLProtocol {
  final class Counters: @unchecked Sendable {
    let lock = NSLock()
    var started = 0
    let didStart = DispatchSemaphore(value: 0)
  }
  static let counters = Counters()
  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    Self.counters.lock.lock(); Self.counters.started += 1; Self.counters.lock.unlock()
    Self.counters.didStart.signal()
    // Deliberately remains in flight until the consent fence cancels it.
  }
  override func stopLoading() {}
  static var started: Int { counters.lock.lock(); defer { counters.lock.unlock() }; return counters.started }
}

func fileIsEmpty(_ url: URL) -> Bool { (try? Data(contentsOf: url))?.isEmpty == true }

@main struct FenceCheck {
  static func main() async throws {
    let base = DirectoryHelper.defaultPersistenceBaseUrl!.appendingPathComponent("revenuecat")
    try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
    let file = base.appendingPathComponent("ad_event_store")
    try Data("cached event".utf8).write(to: file)
    precondition(!FFRevenueCatProcessingGate.accepts(FFRevenueCatProcessingGate.currentGeneration), "cold launch must be denied")
    precondition(FFRevenueCatProcessingGate.setProcessingAllowed(false))
    precondition(fileIsEmpty(file), "cold launch purges cached events")

    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [SinkProtocol.self]
    let session = URLSession(configuration: config)
    let completed = DispatchSemaphore(value: 0)
    let denied = session.dataTask(with: URL(string: "https://consent-test.invalid/denied")!) { _, _, _ in completed.signal() }
    FFRevenueCatProcessingGate.resume(denied, generation: FFRevenueCatProcessingGate.currentGeneration)
    precondition(completed.wait(timeout: .now() + 5) == .success)
    precondition(SinkProtocol.started == 0, "denied request must not enter transport")

    precondition(FFRevenueCatProcessingGate.setProcessingAllowed(true))
    let grantedGeneration = FFRevenueCatProcessingGate.currentGeneration
    try FFRevenueCatProcessingGate.withEventWrite(url: file, generation: grantedGeneration) { try Data("allowed event".utf8).write(to: file) }
    let active = session.dataTask(with: URL(string: "https://consent-test.invalid/active")!) { _, _, _ in completed.signal() }
    FFRevenueCatProcessingGate.resume(active, generation: grantedGeneration)
    precondition(SinkProtocol.counters.didStart.wait(timeout: .now() + 5) == .success)
    precondition(FFRevenueCatProcessingGate.setProcessingAllowed(false))
    precondition(completed.wait(timeout: .now() + 5) == .success, "withdrawal cancels in-flight transport")
    precondition(fileIsEmpty(file), "withdrawal purges stored analytics")

    precondition(FFRevenueCatProcessingGate.setProcessingAllowed(true))
    let stale = session.dataTask(with: URL(string: "https://consent-test.invalid/stale")!) { _, _, _ in completed.signal() }
    FFRevenueCatProcessingGate.resume(stale, generation: grantedGeneration)
    precondition(completed.wait(timeout: .now() + 5) == .success)
    precondition(SinkProtocol.started == 1, "new grant cannot revive old queued transport")
    await FFRevenueCatProcessingGate.$workGeneration.withValue(grantedGeneration) {
      await Task.yield()
      do {
        try FFRevenueCatProcessingGate.withEventWrite(url: file, generation: FFRevenueCatProcessingGate.currentGeneration) { try Data("stale event".utf8).write(to: file) }
        preconditionFailure("old asynchronous writes must be rejected")
      } catch { /* expected cancellation */ }
    }
    precondition(fileIsEmpty(file))
    let fresh = FFRevenueCatProcessingGate.currentGeneration
    try FFRevenueCatProcessingGate.withEventWrite(url: file, generation: fresh) { try Data("new event".utf8).write(to: file) }
    precondition(!fileIsEmpty(file), "genuinely permitted reporting remains available")
    precondition(FFRevenueCatProcessingGate.setProcessingAllowed(false))
    session.invalidateAndCancel()
    print("RevenueCat native fence: cold launch, active cancellation, persistent purge, stale generation rejection and fresh grant passed.")
  }
}
`;
fs.writeFileSync(source, harness);
// CocoaPods may inherit an iOS SDKROOT; this executable runs on the build Mac.
const sdk = spawnSync('xcrun', ['--sdk', 'macosx', '--show-sdk-path'], { encoding: 'utf8', timeout: 30000 });
if (sdk.error) throw sdk.error;
if (sdk.status !== 0 || !sdk.stdout.trim()) throw Error('macOS SDK unavailable for RevenueCat native fence checks');
const target = (process.arch === 'arm64' ? 'arm64' : 'x86_64') + '-apple-macos13.0';
for (const [command, args] of [['xcrun', ['--sdk', 'macosx', 'swiftc', '-sdk', sdk.stdout.trim(), '-target', target, '-parse-as-library', source, '-o', executable]], [executable, []]]) {
  const result = spawnSync(command, args, { stdio: 'inherit', timeout: 120000 });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}