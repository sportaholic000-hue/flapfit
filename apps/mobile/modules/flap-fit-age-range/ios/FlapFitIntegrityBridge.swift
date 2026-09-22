import Foundation
import DeviceCheck
import CryptoKit
import Security

// Keys never leave Apple's Secure Enclave. Only their identifiers and Apple's
// public attestation proof are retained; they are not synced or backed up.
@MainActor
enum FlapFitIntegrityBridge {
  private static let service = "com.flapfit.game.integrity"
  private static var pendingKeys: [String: Task<String, Error>] = [:]
  private struct Record: Codable {
    var keyId: String
    var challenge: String?
    var attestation: String?
  }
  private static func query(_ userId: String) -> [String: Any] {
    [kSecClass as String: kSecClassGenericPassword,
     kSecAttrService as String: service, kSecAttrAccount as String: userId]
  }
  private static func read(_ userId: String) throws -> Record? {
    var request = query(userId)
    request[kSecReturnData as String] = true
    request[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &result)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = result as? Data else { throw failure("Secure key storage is unavailable.") }
    return try JSONDecoder().decode(Record.self, from: data)
  }
  private static func save(_ record: Record, _ userId: String) throws {
    let attributes: [String: Any] = [
      kSecValueData as String: try JSONEncoder().encode(record),
      kSecAttrGeneric as String: Data(record.keyId.utf8),
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    ]
    let status = SecItemUpdate(query(userId) as CFDictionary, attributes as CFDictionary)
    if status == errSecItemNotFound {
      var item = query(userId)
      attributes.forEach { item[$0.key] = $0.value }
      guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw failure("Could not save the app verification key.") }
    } else if status != errSecSuccess { throw failure("Could not update the app verification key.") }
  }
  private static func failure(_ message: String) -> NSError {
    NSError(domain: "FlapFitIntegrity", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }
  static func key(_ userId: String) async throws -> String {
    guard DCAppAttestService.shared.isSupported else { throw failure("This device cannot verify online scores. Local play remains available.") }
    guard UUID(uuidString: userId) != nil else { throw failure("Invalid online identity.") }
    if let pending = pendingKeys[userId] { return try await pending.value }
    if let record = try read(userId) { return record.keyId }
    let task = Task { @MainActor in
      let keyId = try await DCAppAttestService.shared.generateKey()
      try save(Record(keyId: keyId), userId)
      return keyId
    }
    pendingKeys[userId] = task
    defer { pendingKeys[userId] = nil }
    return try await task.value
  }
  static func attest(_ userId: String, _ keyId: String, _ challenge: String) async throws -> String {
    guard var record = try read(userId), record.keyId == keyId,
          challenge.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else { throw failure("Invalid app verification request.") }
    if record.challenge == challenge, let proof = record.attestation { return proof }
    do {
      let proof = try await DCAppAttestService.shared.attestKey(keyId, clientDataHash: Data(SHA256.hash(data: Data(challenge.utf8))))
      record.challenge = challenge
      record.attestation = proof.base64EncodedString()
      try save(record, userId) // Retry the same proof after a lost registration reply.
      return proof.base64EncodedString()
    } catch {
      // Apple's transient service errors must retain the same key. A key that
      // cannot be used again is replaced on the next preparation attempt.
      if let error = error as? DCError, error.code == .invalidKey {
        SecItemDelete(query(userId) as CFDictionary)
      }
      throw error
    }
  }
  static func sign(_ keyId: String, _ runId: String, _ nonce: String, _ score: Int, _ duration: Int) async throws -> String {
    guard UUID(uuidString: runId) != nil, nonce.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
          score >= 0, score <= 100000, duration >= 0, duration <= 21600000 else { throw failure("Invalid game result.") }
    let result: [Any] = ["flapfit-result-v1", runId, nonce, score, duration]
    let payload = try JSONSerialization.data(withJSONObject: result, options: [.withoutEscapingSlashes])
    do {
      let proof = try await DCAppAttestService.shared.generateAssertion(keyId, clientDataHash: Data(SHA256.hash(data: payload)))
      return proof.base64EncodedString()
    } catch {
      if let error = error as? DCError, error.code == .invalidKey {
        // A restored installation can retain an identifier whose Secure Enclave
        // key no longer exists. Let the next run enroll a fresh key.
        SecItemDelete([kSecClass as String: kSecClassGenericPassword,
                       kSecAttrService as String: service,
                       kSecAttrGeneric as String: Data(keyId.utf8)] as CFDictionary)
      }
      throw error
    }
  }
  static func confirm(_ userId: String, _ keyId: String) throws {
    guard let record = try read(userId), record.keyId == keyId else { throw failure("App verification key changed.") }
    try save(Record(keyId: keyId), userId)
  }
  static func forget(_ userId: String) async throws {
    if let pending = pendingKeys[userId] { _ = try? await pending.value }
    let status = SecItemDelete(query(userId) as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else { throw failure("Could not remove the app verification key identifier.") }
  }
}
