# Apple test-device enrollment

The manual workflow is at `apps/mobile/.eas/workflows/register-apple-test-devices.yml`. It contains only Owner iPad and Brother iPhone registration jobs for Apple team `KM48R8T97P`. It does not build, submit, upload to TestFlight, register devices directly with Apple, or alter signing credentials.

From `apps/mobile`, run:

```text
eas workflow:run register-apple-test-devices.yml --non-interactive --json
```

The command returns JSON with `id` and `url`. Open that returned URL; each registration job displays its own enrollment link and QR code when action-required. Use the Owner iPad link on the owner's iPad and the Brother iPhone link on the brother's iPhone. Allow the registration-profile download and install it through Settings. Enter the device passcode if prompted. Approve each matching enrollment on Expo after checking its device class. Successful job outputs include device identifiers and metadata; do not commit these identifiers.

`eas workflow:view <run-id> --json --non-interactive` exposes job keys, statuses and completed outputs. The cached CLI does not promise pending enrollment URLs in this JSON; retrieve links from the returned workflow page rather than constructing them from job IDs.

Enrollment alone does not make a build installable. An Ad Hoc profile must subsequently include both UDIDs, the existing distribution certificate, `com.flapfit.game` and its Declared Age Range entitlement. The current App Store profile cannot be used for direct installation. This workflow deliberately has no build job.

Validation: current official schema fetched 2026-09-19, evaluated by the cached EAS CLI validator; exactly two registration jobs and only a manual trigger checked. Workflow not executed during preparation.

References: [registration job](https://docs.expo.dev/eas/workflows/pre-packaged-jobs/#apple-device-registration-request), [CLI](https://docs.expo.dev/eas/cli/#eas-workflowrun-file), [internal distribution](https://docs.expo.dev/tutorial/eas/internal-distribution-builds/).
