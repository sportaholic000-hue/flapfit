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
  static let defaultPersistenceBaseUrl: URL? = {
    if let directory = ProcessInfo.processInfo.environment["FLAP_FIT_FENCE_TEST_DIRECTORY"] {
      return URL(fileURLWithPath: directory, isDirectory: true)
    }
    return FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
  }()
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
    precondition(!FFRevenueCatProcessingGate.allowsNonAdProcessing, "purchase, feature and configuration processing must remain disabled")
    let base = DirectoryHelper.defaultPersistenceBaseUrl!.appendingPathComponent("revenuecat")
    try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
    let file = base.appendingPathComponent("ad_event_store")
    let featureFile = base.appendingPathComponent("paywall_event_store")
    if CommandLine.arguments.contains("--seed-relaunch") {
      precondition(!FFRevenueCatProcessingGate.accepts(FFRevenueCatProcessingGate.currentGeneration))
      precondition(FFRevenueCatProcessingGate.setProcessingAllowed(true))
      let generation = FFRevenueCatProcessingGate.currentGeneration
      for eventFile in [file, featureFile] {
        try FFRevenueCatProcessingGate.withEventWrite(url: eventFile, generation: generation) {
          try Data("previous-process queued test data".utf8).write(to: eventFile)
        }
      }
      print("Previous process wrote local test files; no network events were sent.")
      return
    }
    if CommandLine.arguments.contains("--verify-relaunch") {
      precondition(!fileIsEmpty(file) && !fileIsEmpty(featureFile), "seed process must persist files")
      precondition(!FFRevenueCatProcessingGate.accepts(FFRevenueCatProcessingGate.currentGeneration), "new process starts closed even after previous process granted")
      for eventFile in [file, featureFile] {
        do {
          try FFRevenueCatProcessingGate.withEventWrite(url: eventFile, generation: FFRevenueCatProcessingGate.currentGeneration) {
            try Data("must not append".utf8).write(to: eventFile)
          }
          preconditionFailure("relaunch must reject writes before a new permitted decision")
        } catch { /* expected cancellation */ }
      }
      precondition(FFRevenueCatProcessingGate.setProcessingAllowed(false))
      precondition(fileIsEmpty(file) && fileIsEmpty(featureFile), "withdrawn relaunch purges previous-process event files")
      print("RevenueCat native fence: separate-process relaunch starts closed and purges retained event files.")
      return
    }
    try Data("cached event".utf8).write(to: file)
    try Data("cached feature event".utf8).write(to: featureFile)
    precondition(!FFRevenueCatProcessingGate.accepts(FFRevenueCatProcessingGate.currentGeneration), "cold launch must be denied")
    precondition(FFRevenueCatProcessingGate.setProcessingAllowed(false))
    precondition(fileIsEmpty(file) && fileIsEmpty(featureFile), "cold launch purges both event stores")

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
    precondition(fileIsEmpty(file) && fileIsEmpty(featureFile), "withdrawal purges stored analytics")
    // Purge failure must be an explicit failure and must not reopen processing.
    let obstructed = base.appendingPathComponent("ad_event_store")
    try FileManager.default.removeItem(at: obstructed)
    try FileManager.default.createDirectory(at: obstructed, withIntermediateDirectories: false)
    precondition(!FFRevenueCatProcessingGate.setProcessingAllowed(true), "failed purge cannot acknowledge a grant")
    precondition(!FFRevenueCatProcessingGate.accepts(FFRevenueCatProcessingGate.currentGeneration))
    try FileManager.default.removeItem(at: obstructed)
    try Data().write(to: obstructed)

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
    precondition(FFRevenueCatProcessingGate.setNetworkPaused(true))
    precondition(FFRevenueCatProcessingGate.currentGeneration == fresh)
    precondition(FFRevenueCatProcessingGate.accepts(fresh), "exercise pause preserves consent")
    let retained = try Data(contentsOf: file)
    weak var held: URLSessionTask?
    do {
      let task = session.dataTask(with: URL(string: "https://consent-test.invalid/held")!) { _, _, _ in completed.signal() }
      held = task
      FFRevenueCatProcessingGate.resume(task, generation: fresh)
    }
    precondition(SinkProtocol.counters.didStart.wait(timeout: .now() + 0.2) == .timedOut)
    precondition(held?.state == .suspended, "new transport is retained and waits during exercise")
    let stillRetained = try Data(contentsOf: file)
    precondition(stillRetained == retained, "pause retains pending events")
    precondition(FFRevenueCatProcessingGate.setNetworkPaused(false))
    precondition(SinkProtocol.counters.didStart.wait(timeout: .now() + 5) == .success)
    precondition(FFRevenueCatProcessingGate.setNetworkPaused(true))
    precondition(held?.state == .suspended, "active transport can be paused")
    precondition(FFRevenueCatProcessingGate.setProcessingAllowed(false))
    precondition(completed.wait(timeout: .now() + 5) == .success)
    precondition(fileIsEmpty(file), "withdrawal still purges while exercise is paused")
    precondition(FFRevenueCatProcessingGate.setNetworkPaused(false))
    precondition(!FFRevenueCatProcessingGate.accepts(fresh), "resume cannot grant withdrawn consent")
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
// Two invocations of the compiled native gate share only the temporary directory.
// This proves that a prior process's grant never survives a genuine process restart.
const relaunchDirectory = path.join(folder, 'relaunch-persistence');
for (const mode of ['--seed-relaunch', '--verify-relaunch']) {
  const result = spawnSync(executable, [mode], {
    stdio: 'inherit', timeout: 30000,
    env: { ...process.env, FLAP_FIT_FENCE_TEST_DIRECTORY: relaunchDirectory },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
