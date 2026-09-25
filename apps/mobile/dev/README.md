# Championship preview

From `apps/mobile`, run:

```sh
node dev/start-championship-preview.cjs
```

Open `http://127.0.0.1:8990`. The first browser bundle can take several minutes on a slower computer. This is a local development server, not a native build or an OTA publication.

The preview uses the actual achievement cards, championship badge, result heading, evolution ceremony, and championship ceremony with isolated sample progress. It does not launch the app's startup services, camera, ads, or recording, and its controls do not write to the game store.

Test the first win, evolution plus championship, repeat wins, and the sample progression buttons. The full app's existing recording/share/results actions remain outside this display preview.

The standalone launcher corrects the existing web-polyfill path bypass only for this local server. On Windows, mixed path separators in the regular Metro configuration otherwise make the ScrollView alias import itself. The release Metro configuration is unchanged.

Native development builds can also open the development-only preview button at the bottom of Stats, or the `/championship-preview` route. That route redirects to Stats in release builds.
