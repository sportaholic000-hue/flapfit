import Foundation
#if canImport(StoreKit)
import StoreKit
#endif

@MainActor
enum FlapFitAppTransactionBridge {
  private static func failure(_ status: String) -> [String: Any] {
    return ["status": status, "signedAppTransaction": NSNull()]
  }

  // The passive shared property can fail when StoreKit/authentication/network is
  // unavailable. Do not call refresh(): it can involve user interaction.
  static func getVerifiedAppTransaction() async -> [String: Any] {
    #if canImport(StoreKit)
    guard #available(iOS 16.0, *) else { return failure("unsupported") }
    do {
      let verification = try await AppTransaction.shared
      switch verification {
      case .verified(_):
        let signed = verification.jwsRepresentation
        guard !signed.isEmpty else { return failure("error") }
        // No identifier, age information or decoded payload is extracted here.
        // A verified download is not proof that parental consent remains active.
        return ["status": "verified", "signedAppTransaction": signed]
      case .unverified(_, _):
        return failure("unverified")
      @unknown default:
        return failure("error")
      }
    } catch is CancellationError {
      return failure("unavailable")
    } catch {
      // Never expose localized errors or unverified signed data to JavaScript.
      return failure("error")
    }
    #else
    return failure("unsupported")
    #endif
  }
}
