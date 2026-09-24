# OTA privacy-policy supplement

Final wording for the approved Info-only update flow, published in website version 40. Apple’s Device ID → App Functionality save remains pending sign-in. See [the correction report](ota-corrections-2026-09-24/README.md).

## App updates

In versions that support in-app updates, Flap Fit uses Expo’s EAS Update service to check for and deliver compatible updates. A check starts when you select Check for updates in Info; normal app entry does not automatically check for updates. The app sends Expo technical information such as a randomly generated identifier for this app installation, the operating-system platform, and the installed update/runtime version. As with other internet services, Expo receives the request’s IP address. This supports update delivery, compatibility and service operation. This integration does not send your camera images, recordings, exercise results, leaderboard name or advertising identifier to Expo, and does not connect the update identifier to your leaderboard or advertising profile. If an update is available, you can choose Update now or Later. Requested checks, downloads and reloads take place in the update screen before returning to gameplay.

Expo explains its handling of operating-system information, randomized update tokens and service logs in its [privacy policy](https://expo.dev/privacy). Expo may process information outside Canada under that policy and its applicable service terms. Expo’s retention practices are separate from competition retention periods.

## Apple label reconciliation

Add App Functionality to the existing Device ID category. Preserve the existing combined linked Yes / tracking No answers and Google’s existing purposes. The native Device ID / App Functionality declaration is already present. This adds no workout collection, permission prompt, advertising choice or manual support workflow. Final native-artifact reconciliation remains part of release acceptance.
