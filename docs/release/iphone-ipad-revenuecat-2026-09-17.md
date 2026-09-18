# Universal iPhone/iPad configuration and RevenueCat iOS setup

The owner confirmed that Flap Fit launches on both iPhone and iPad. The iOS configuration now enables tablet support and retains full-screen portrait exercise-camera gameplay. The release validator enforces both device families. The screenshot validator and capture plan require a separate genuine 13-inch iPad set at 2064 x 2752.

The Flap Fit RevenueCat iOS app is saved as app23ef6df569 with bundle ID com.flapfit.game. Its public SDK key is configured in the development, preview and production EAS profiles; the simulator compile profile inherits preview. Public SDK keys belong in the client configuration. The private Apple P8 is held separately and was uploaded directly to RevenueCat, never copied into this repository.

The owner created replacement Apple IAP key GXJ96NG8L7, named FLAP FIT REVENUECAT SHIPATON, and revoked the old key. The new key and matching issuer are saved in RevenueCat. Apple had no app identifiers or app records. The bundle ID is now registered under the existing developer team. RevenueCat still reports a bundle-ID/key compatibility validation failure. The unpublished App Store Connect record is prepared; creating it is pending explicit approval after automatic review enforced the earlier no-posting instruction. No build has been uploaded or submitted.

Local validation: native Expo configuration introspection passed with supportsTablet and UIRequiresFullScreen true, the expected bundle identifier and AdMob app ID. 5 focused sharing/ads suites and 40 tests passed. All three iOS monetization profile checks pass. Full production release validation remains blocked by the existing two pull-up physical-approval requirements; screenshot validation correctly reports missing genuine capture assets. Native-device validation remains required on iPhone and iPad.

This commit isolates the configuration and checklist changes from ongoing tracking and native monetization implementation. Existing local working files, HEAD and staged work are preserved.

Sources: https://docs.expo.dev/versions/latest/config/app/ and https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
