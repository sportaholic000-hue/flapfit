# Synthetic recorder fixtures

These MP4s contain generated animation/tone only, with no user footage, camera, or microphone input.

- chromium-duration-defect.mp4: 216,080 bytes; Windows Edge/Chromium 153; H.264 without audio; the original local recorder produced 3.836833 seconds of video samples with mdhd duration 0.1279 seconds.
- chromium-audio-duration-defect.mp4: 513,364 bytes; Windows Edge/Chromium 153; H.264/AAC; generated audio frames; an uncorrected file with 5.764067 seconds of video and 4.839188 seconds of audio. The early diagnostic producer did not maintain equal audio/video wall time. This fixture checks each existing timeline independently, not lip synchronization.

The recorder and bridge were extracted from the existing local app. recording-mp4.test.ts verifies that finalization changes only the recognized mdhd fields and preserves every other byte, including encoded media and fragment indexes. These fixtures do not certify phone playback or social sharing.