# Focused contrast review

The approved palette is preserved. These are review findings, not silent color changes or a claim about an Apple review outcome.

Reference: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
WCAG's text benchmark is 4.5:1 for normal text and 3:1 for qualifying large text. Inactive controls and decorative elements have different treatment.

Measured opaque color pairs:

| Pair | Ratio | Review |
| --- | ---: | --- |
| Orange #F59E0B / white #FFFFFF | 2.15:1 | Insufficient for normal or large text |
| White #FFFFFF / sky #4AABDE | 2.57:1 | Insufficient for normal or large text |
| Navy #06223D / sky #4AABDE | 6.27:1 | Meets normal-text benchmark |
| Orange #F59E0B / navy #06223D | 7.50:1 | Meets normal-text benchmark |

Review locations include orange Best/New and accent text on white cards, white text where it sits directly on sky, and white text on orange buttons (the same 2.15:1 pair). Exact computed backgrounds matter for translucent/overlapping surfaces; these ratios do not certify every screen.

Focused options for owner approval:
- Use existing navy for essential small labels on white/sky, retaining orange borders, indicators and decorative accents.
- Use navy text on orange actions while retaining their orange background.
- Where white text is intentional, place it on the existing navy surface.

Do not replace disabled grays, skin colors, medals, achievement art or gameplay colors indiscriminately. Recheck longer localized labels and accessibility font sizes after languages are selected.
