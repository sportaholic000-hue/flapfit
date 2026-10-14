# Navigation icon provenance

Home and Info reuse the exact Ionicons glyph outlines selected by design commit 30e54a90331b9472452633e4ea9da4123e8ed5eb in sportaholic000-hue/flap-fit-nav-design.

The design locks @expo/vector-icons to 15.0.2. Source: build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf, glyphs home (62338) and information-circle (62360). Font SHA-256: fa2ab7d2557819b2bfe5009e46844efa7170cf177be7735d43aa2ac1295f1d54.

The TrueType contour points (including quadratic curves and implied midpoints) are preserved as SVG paths. The font uses 512 units per em and ascent 454; the SVG transform preserves its coordinate system. Levels, Compete and Stats remain the exact SVG implementation from the design commit. The existing react-native-svg dependency renders all five icons; no package, font-loading behavior, or native dependency was added.

The distributed source license is retained in LICENSE-Ionicons.txt. Original icon family: https://github.com/ionic-team/ionicons.

The accompanying license file retains both Ionic artwork attribution and the bundled vector-icons wrapper attribution.
