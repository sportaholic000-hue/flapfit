import ExpoModulesCore
import UIKit
#if canImport(DeclaredAgeRange)
import DeclaredAgeRange
#endif

public class FlapFitAgeRangeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FlapFitAgeRange")

    AsyncFunction("getIntegrityKey") { (userId: String, promise: Promise) in
      Task { @MainActor in
        do { promise.resolve(try await FlapFitIntegrityBridge.key(userId)) }
        catch { promise.reject("INTEGRITY_ERROR", error.localizedDescription, error) }
      }
    }
    AsyncFunction("attestIntegrityKey") { (userId: String, keyId: String, challenge: String, promise: Promise) in
      Task { @MainActor in
        do { promise.resolve(try await FlapFitIntegrityBridge.attest(userId, keyId, challenge)) }
        catch { promise.reject("INTEGRITY_ERROR", error.localizedDescription, error) }
      }
    }
    AsyncFunction("signCompetitionResult") { (keyId: String, runId: String, nonce: String, score: Int, duration: Int, promise: Promise) in
      Task { @MainActor in
        do { promise.resolve(try await FlapFitIntegrityBridge.sign(keyId, runId, nonce, score, duration)) }
        catch { promise.reject("INTEGRITY_ERROR", error.localizedDescription, error) }
      }
    }
    AsyncFunction("forgetIntegrityKey") { (userId: String, promise: Promise) in
      Task { @MainActor in
        do { try await FlapFitIntegrityBridge.forget(userId); promise.resolve(nil) }
        catch { promise.reject("INTEGRITY_ERROR", error.localizedDescription, error) }
      }
    }
    AsyncFunction("confirmIntegrityKey") { (userId: String, keyId: String, promise: Promise) in
      Task { @MainActor in
        do { try FlapFitIntegrityBridge.confirm(userId, keyId); promise.resolve(nil) }
        catch { promise.reject("INTEGRITY_ERROR", error.localizedDescription, error) }
      }
    }

    AsyncFunction("getVerifiedAppTransaction") { (promise: Promise) in
      Task { @MainActor in
        promise.resolve(await FlapFitAppTransactionBridge.getVerifiedAppTransaction())
      }
    }

    AsyncFunction("getRequirements") { (promise: Promise) in
      Task { @MainActor in
        promise.resolve(await FlapFitAppleAgeBridge.getRequirements())
      }
    }

    AsyncFunction("requestAgeRange") { (promise: Promise) in
      Task { @MainActor in
        promise.resolve(await FlapFitAppleAgeBridge.requestAgeRange())
      }
    }

    AsyncFunction("requestAgeRangeWithGates") { (gates: [Double], promise: Promise) in
      Task { @MainActor in
        promise.resolve(await FlapFitAppleAgeBridge.requestAgeRange(gates))
      }
    }
  }
}

@MainActor
private enum FlapFitAppleAgeBridge {
  private static var requestInFlight = false

  private static func compiledCapabilities() -> [String: Bool] {
    var result = [
      "ageRange": false, "regionalEligibility": false,
      "regulatoryFeatures": false, "confirmedAssurance": false
    ]
    #if canImport(DeclaredAgeRange)
    result["ageRange"] = true
    #if FLAPFIT_AGE_ELIGIBILITY
    result["regionalEligibility"] = true
    #endif
    #if FLAPFIT_AGE_REGULATORY_FEATURES
    result["regulatoryFeatures"] = true
    #endif
    #if FLAPFIT_AGE_CONFIRMED
    result["confirmedAssurance"] = true
    #endif
    #endif
    return result
  }

  private static func requirements(
    _ status: String,
    supported: Bool = false,
    eligibility: Bool? = nil,
    featuresSupported: Bool = false,
    features: [String] = []
  ) -> [String: Any] {
    return [
      "status": status,
      "ageRangeSupported": supported,
      "compiledCapabilities": compiledCapabilities(),
      "eligibility": eligibility.map { $0 as Any } ?? NSNull(),
      "regulatoryFeaturesSupported": featuresSupported,
      "regulatoryFeatures": features
    ]
  }

  private static func emptyRange(_ status: String) -> [String: Any] {
    return [
      "status": status,
      "lowerBound": NSNull(),
      "upperBound": NSNull(),
      "assurance": "unknown",
      "communicationLimits": NSNull()
    ]
  }

  static func getRequirements() async -> [String: Any] {
    #if canImport(DeclaredAgeRange)
    guard #available(iOS 26.0, *) else {
      return requirements("unsupported")
    }
    #if FLAPFIT_AGE_ELIGIBILITY
    // DAR itself exists on 26.0, but regional eligibility does not.
    guard #available(iOS 26.2, *) else {
      return requirements("available", supported: true)
    }

    var eligibility: Bool? = nil
    do {
      eligibility = try await AgeRangeService.shared.isEligibleForAgeFeatures
      #if FLAPFIT_AGE_REGULATORY_FEATURES
      if #available(iOS 26.4, *) {
        let required = try await AgeRangeService.shared.requiredRegulatoryFeatures
        var features: [String] = []
        for feature in required {
          switch feature {
          case .declaredAgeRangeRequired:
            features.append("declaredAgeRangeRequired")
          case .significantAppChangeRequiresParentalConsent:
            features.append("significantAppChangeRequiresParentalConsent")
          case .significantAppChangeRequiresAdultNotification:
            features.append("significantAppChangeRequiresAdultNotification")
          @unknown default:
            features.append("unknown")
          }
        }
        return requirements(
          "available", supported: true, eligibility: eligibility,
          featuresSupported: true, features: features.sorted()
        )
      }
      #endif
      return requirements("available", supported: true, eligibility: eligibility)
    } catch AgeRangeService.Error.notAvailable {
      return requirements("unavailable", supported: true, eligibility: eligibility)
    } catch {
      // Never return localized errors: they may contain account/device details.
      return requirements("error", supported: true, eligibility: eligibility)
    }
    #else
    return requirements("available", supported: true)
    #endif
    #else
    return requirements("unsupported")
    #endif
  }

  private static func validatedGates(_ supplied: [Double]) -> [Int]? {
    guard (1...3).contains(supplied.count), supplied.allSatisfy({
      $0.isFinite && $0 >= 2 && $0 <= 9_007_199_254_740_991 && $0.rounded() == $0
    }) else { return nil }
    let gates = supplied.map { Int($0) }
    for index in gates.indices.dropFirst() {
      guard gates[index] - gates[index - 1] >= 2 else { return nil }
    }
    return gates
  }

  static func requestAgeRange(_ suppliedGates: [Double] = [13, 16, 18]) async -> [String: Any] {
    guard let gates = validatedGates(suppliedGates) else { return emptyRange("error") }
    #if canImport(DeclaredAgeRange)
    guard #available(iOS 26.0, *) else { return emptyRange("unsupported") }
    guard !requestInFlight else { return emptyRange("unavailable") }
    guard let presenter = activePresenter() else { return emptyRange("unavailable") }
    requestInFlight = true
    defer { requestInFlight = false }
    do {
      let response = try await AgeRangeService.shared.requestAgeRange(
        ageGates: gates[0],
        gates.count > 1 ? gates[1] : nil,
        gates.count > 2 ? gates[2] : nil,
        in: presenter
      )
      switch response {
      case .declinedSharing:
        return emptyRange("declined")
      case .sharing(let range):
        return [
          "status": "shared",
          "lowerBound": range.lowerBound.map { $0 as Any } ?? NSNull(),
          "upperBound": range.upperBound.map { $0 as Any } ?? NSNull(),
          "assurance": assurance(range.ageRangeDeclaration),
          "communicationLimits": range.activeParentalControls.contains(.communicationLimits)
        ]
      @unknown default:
        return emptyRange("unknown")
      }
    } catch AgeRangeService.Error.notAvailable {
      return emptyRange("unavailable")
    } catch {
      return emptyRange("error")
    }
    #else
    return emptyRange("unsupported")
    #endif
  }

  #if canImport(DeclaredAgeRange)
  @available(iOS 26.0, *)
  private static func assurance(
    _ declaration: AgeRangeService.AgeRangeDeclaration?
  ) -> String {
    guard let declaration else { return "unknown" }
    #if FLAPFIT_AGE_CONFIRMED
    if #available(iOS 26.5, *), declaration == .confirmed {
      return "confirmed"
    }
    #endif
    #if FLAPFIT_AGE_ELIGIBILITY
    if #available(iOS 26.2, *) {
      switch declaration {
      case .paymentChecked, .governmentIDChecked, .checkedByOtherMethod,
           .guardianPaymentChecked, .guardianGovernmentIDChecked, .guardianCheckedByOtherMethod:
        // Normalize assurance only; never expose the identity-check method.
        return "confirmed"
      default:
        break
      }
    }
    #endif
    switch declaration {
    case .selfDeclared: return "selfDeclared"
    case .guardianDeclared: return "guardianDeclared"
    default: return "unknown"
    }
  }
  #endif

  private static func activePresenter() -> UIViewController? {
    guard UIApplication.shared.applicationState == .active else { return nil }
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    guard let window = scenes
      .filter({ $0.activationState == .foregroundActive })
      .flatMap({ $0.windows })
      .first(where: { $0.isKeyWindow }),
      var presenter = window.rootViewController else { return nil }
    while let presented = presenter.presentedViewController {
      guard !presented.isBeingDismissed else { return nil }
      presenter = presented
    }
    guard presenter.viewIfLoaded?.window != nil, !presenter.isBeingDismissed else { return nil }
    return presenter
  }
}
