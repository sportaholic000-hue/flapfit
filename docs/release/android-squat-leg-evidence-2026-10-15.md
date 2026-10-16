# Android squat control with independent leg evidence

Branch: codex/android-design-integration. Preview/rules marker: 2026-10-15.4-squat-leg-evidence.

## Problem

The owner confirmed shoulder-based flight removed jitter but allowed flight with straight legs. Removing continuous squat validation was too permissive. This supersedes the validation in db21dcf while retaining its shoulder controller.

## Behavior

- Flight still uses only the two-shoulder midpoint. No raw hip coordinates steer flight, and hands are not assigned a required position. Feet/ankles remain unused.
- Calibration still verifies standing and deep-squat positions, shoulder/hip travel and upper-leg shortening. All artwork, holds and timing remain.
- During play, compare shoulder progress with hip descent AND upper-leg shortening relative to the same calibration. A large mismatch past 45% shoulder progress is evidence of moving the upper body without the calibrated leg movement. Allow 40 percentage points of difference for normal lean and noisy hip estimates.
- Evaluate only fresh camera observations. Accumulate mismatch time; recover gradually during matching motion instead of erasing evidence whenever a person briefly stands up. After 600 ms accumulated mismatch, latch a form failure. The existing 350 ms fatal confirmation and gravity/collision ending are unchanged. No new backend check or service.
- Missing lower-body evidence cannot establish valid squats indefinitely. Brief visibility loss retains the existing 1600 ms grace, without switching the flight signal to hips. Hands covering the hips may still affect the camera model; physical testing remains necessary.
- Reset evidence at new calibration. Preview diagnostics include the evidence accumulator for verification. Raw phone measurements remain local, outside Git.

## Verification and release status

Regression coverage includes legitimate squats with brief hip occlusion, hand placement changes and measured-scale hip noise; sustained straight-leg bends; rapid repeated bends with short upright resets; whole-body translation; fresh-frame-only timing; and reset. Replay compares the two earlier normal squat runs with the latest shoulder-only test run. 183 regression cases passed. Both earlier normal phone traces completed calibration and stayed in play with no form failure, preserving shoulder-driven flight. The latest shoulder-only phone trace triggered a confirmed form failure at camera time 37.718 s (play began at 30.626 s), followed by the existing gravity/collision ending. This is offline evidence, not physical-device sign-off.

This is a candidate for owner testing, not a release approval. Test phone on chair with feet cropped, normal hands in front, real squats and deliberately straight-leg bends. No iOS checkout, main, submitted tag, native dependency, recording code, build or OTA changed.

## Subsequent owner rejection

Physical testing rejected this version: calibration advanced while leaving the view and partial straight-leg movement still controlled flight. See [presence follow-up](android-squat-presence-2026-10-15.md) for the demonstrated defects and next testing candidate. This version is not release-approved.
