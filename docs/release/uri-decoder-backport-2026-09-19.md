# URI decoder security backport — September 19, 2026

The runtime malformed-URL denial of service in GHSA-vcc3-ghjq-m6fr is mitigated by a narrowly scoped Yarn patch. This supersedes the earlier decision to leave this particular runtime advisory unpatched in dependency-audit.md. Other dependency advisories are not claimed fixed by this change.

## Change and compatibility

Expo Router resolves query-string 7.1.3, which requires the CommonJS decode-uri-component 0.2.2 API. The upstream fixed 0.5.0 package uses an ESM export and no longer converts literal plus signs to spaces. Forcing that package version would change the consumer contract.

The checked-in patch backports the official 0.5.0 single-pass UTF-8 scanner into 0.2.2. It removes the recursive retry decoder, retains the CommonJS callable export, preserves plus-to-space handling, and preserves the existing BOM, incomplete `%C2`, and non-string TypeError behavior. The scanner is adapted to the existing source style without changing its logic. Malformed percent-separated UTF-8 sequences remain separate rather than being accidentally recombined into another character.

Only these dependency files changed:

- package.json: one scoped resolution for decode-uri-component@npm:^0.2.2.
- yarn.lock: one patch locator/checksum; all package versions are unchanged.
- .yarn/patches/decode-uri-component-npm-0.2.2-flapfit.patch: the single index.js backport, with upstream attribution.

There are no app/calibration/gameplay, native SDK, permission, or feature changes. The package's existing MIT license is retained.

## Verified against the installed package

- All 35 original 0.2.2 test cases passed.
- All 135 upstream 0.5.0 test cases (165 decoder invocations) passed compatibility comparison after accounting for the deliberately preserved literal-plus behavior. Valid Unicode, UTF-8 boundaries, malformed/truncated escapes, percent separators, BOMs, and non-string inputs are covered.
- Two tests using the actual installed query-string 7.1.3 passed: normal URL query values (including Unicode, repeated keys, spaces, and encoded plus signs) and malformed/truncated UTF-8 values.
- A worker-isolated reproduction on the original decoder exceeded a 3,000 ms timeout for 6,000 characters (`%EA` repeated 2,000 times).
- The installed backport processed 600,000 characters (`%EA` repeated 200,000 times), preserving the expected output, in 448 ms on this machine. It was subject to a 5,000 ms bound. These are measured regression checks, not a universal device-latency guarantee.
- Yarn 4.12.0 install completed successfully. Only the single patched package was added (+8.8 KiB).

The verification helper and its exact output are in the working evidence directory at work/audit-fixes-20260919/verify-uri-decoder.cjs and uri-decoder-verification.json. The runtime remains version-labelled 0.2.2, so version-only dependency scanners may continue to flag this advisory. Do not suppress the alert as if an upstream version upgrade occurred; retain this backport evidence until the consuming dependency supports a compatible upstream upgrade.

## Sources

- [GitHub reviewed advisory GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)
- [Official 0.5.0 release](https://github.com/SamVerschueren/decode-uri-component/releases/tag/v0.5.0)
- [Upstream scanner change fa479da](https://github.com/SamVerschueren/decode-uri-component/commit/fa479da)
- [Original 0.2.2 test vectors](https://github.com/SamVerschueren/decode-uri-component/blob/v0.2.2/test.js)
- [Upstream 0.5.0 test vectors](https://github.com/SamVerschueren/decode-uri-component/blob/v0.5.0/test.js)

## Reproducibility checks

A second `yarn install --immutable` completed successfully with no lockfile change. `git diff --check` passed for the manifest and lockfile. The existing EAS ignore rules exclude Yarn caches/install state but do not exclude the checked-in patches directory; the new patch must be included in the next real build archive.

- Patch SHA-256: `8205dd3564af0d958ccf9034df81f3d36095b91d2a88765374caae47b0a5eeb7`
- Installed `decode-uri-component/index.js` SHA-256: `d5408329ab34ad8f3534002a2fd95fc566504a18d46e62c84bb52b473fb1e960`

These checks do not replace compilation and installed-device validation of the signed iOS candidate.
`tsc --noEmit` also completed successfully after installation (exit 0).
