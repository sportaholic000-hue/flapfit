# iOS pullup bar repair - October 8, 2026

The owner reported fragmented/different bars in the second and third pullup guides. The earlier blue/yellow figure cleanup omitted neutral gray parts of the original bar; later hand restoration introduced additional inconsistent bar segments.

Restore the original reference pixels in a narrow horizontal strip in `pullupTop.webp` and `pullupBottom.webp`, with a matte that includes neutral gray as well as the figure colors. No newly traced bar or generated anatomy. The bar uses the same 32% base opacity as the figure; existing yellow figure edges retain their stronger opacity. Outside the 33-row repair strips, every decoded RGBA pixel remains identical. Image dimensions, display bounds, all other assets, calibration measurements, hold rules, stages, fades, instructions and gameplay are unchanged.

The raised pose intentionally retains the original reference's eye-level bar; its position was not changed. The original reference labels that pose "Eye line at bar". This repair removes the artificial fragmented yellow bar outlines rather than changing the required calibration pose. Both original grips remain recognizable and are not redrawn.

Source reference: `dc4b47056ac9a9864f435c2025bff9022c56473d:apps/mobile/artwork/calibration/references/pullup.png`. Prior active artwork: `b472e7f827f54947fc5e476a683f94ab60a055e1`. Reproducible local repair, exact changed rows, dimensions, checksums and before/after crops are in [the repair folder](pullup-bar-repair-2026-10-08/). The inspection crops magnify opacity 2.5x to expose small artifacts; actual app assets remain translucent.

All thirteen images are embedded from their exact lossless WebP bytes by the existing generator. The new bar assets still require owner visual acceptance on the iPad. This change has no effect on the approved pushup calibration. No native build or Apple submission is started.

Verification: all 19 existing artwork/stage tests passed; all thirteen embedded image payloads match the active lossless files. Eleven other assets are byte-identical, all display bounds match the prior version, and calibration/stage source is unchanged.
