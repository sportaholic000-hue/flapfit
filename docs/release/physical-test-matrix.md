# Flap Fit physical release test matrix

Use this checklist on the exact commit named at the top of the test session. Record the device,
operating-system version, app source (Expo Go, TestFlight, or Play internal), result, and a short note
for every failure. Do not submit a different commit from the one that completed this matrix.

## Expo Go gameplay approval

Run on at least one Android phone, one iPhone, and one iPad. Expo Go verifies JavaScript behavior and
the remote development tracker. It does not replace signed-build testing of native permissions,
recording, ads, purchases, or the bundled production tracker.

For each of Push-ups, Squats, Pull-ups, Bicep Curls, Lateral Raise, and Shoulder Press:

- [ ] Original tracking calibrates both positions after the two-second reading/setup buffer.
- [ ] Form Test calibrates both positions without requiring unsafe or unrealistic range of motion.
- [ ] The phone-placement instructions match the actual usable setup.
- [ ] Sky mode moves the bird correctly and a pipe collision immediately ends the run.
- [ ] Live Camera mode keeps the complete camera background framed correctly.
- [ ] Leaving the usable tracking frame does not create an exploitable indefinite pause.
- [ ] Level completion occurs at the configured target and never randomly before 60 pipes.
- [ ] Next Level preserves the selected background, recording choice, exercise, and Form Test mode.

Additional protected-form checks:

- [ ] Pull-ups allow bent knees and a slight elbow bend at the bottom.
- [ ] Pull-ups do not accept planted feet, one planted foot, head bobbing, or releasing the bar.
- [ ] Brief wrist/foot occlusion pauses with a useful message; sustained missing evidence ends the run.
- [ ] Push-ups work from a view where the player can still see the screen.
- [ ] Push-ups do not accept head bobbing or hands leaving the supporting surface.
- [ ] Squats do not accept bending only at the waist.

## Recording and sharing

- [ ] Record & Play asks for microphone permission only after the user chooses it.
- [ ] Continue without sound works after microphone denial.
- [ ] The red RECORDING indicator appears only while capture is active.
- [ ] Recording begins with the playable countdown/run, stops at the result, and includes the full
      camera/game composition.
- [ ] Shared video contains understandable game audio and microphone audio when permission is granted.
- [ ] Cancelled and completed share flows return safely to Flap Fit.
- [ ] A recording or share failure never loses the game result or blocks Done, Try Again, or Next
      Level.
- [ ] No old recording appears on a later result screen and no recording is stored in an in-app
      library.

## Progress, evolution, and Stats

- [ ] The selected bird and color survive a cold restart, including Onyx/black.
- [ ] The same evolution artwork appears on Home, Stats, and in flight.
- [ ] Stage changes occur at the documented tracked-time thresholds and Legend is unmistakably the
      strongest stage.
- [ ] Five-day and seven-day inactivity regression behaves as disclosed without deleting earned time.
- [ ] Total Stats bars show combined daily time.
- [ ] Each exercise filter shows only that exercise's daily and monthly time.
- [ ] New sessions show exercise, pipes, and tracked time without calories or misleading rep totals.

## Compete and player codes

- [ ] Main gameplay works before Competition Terms acceptance and while offline.
- [ ] Compete requires the current Terms before publishing a name, result, or challenge.
- [ ] Invalid, offensive, one-character, and over-20-character names are rejected; a valid name
      persists after restart.
- [ ] Endless results appear only for Push-ups, Squats, and Pull-ups and display true global rank.
- [ ] A six-character player challenge code can be created, shared, found on another device, played,
      and refreshed for all six exercises.
- [ ] Replaying the same server run does not duplicate or alter the result.
- [ ] A lower score does not replace a player's existing best result.
- [ ] Report and Block are visible and work; blocking does not renumber the displayed global ranks.
- [ ] With networking disabled at game-over, the result remains queued and appears after reconnection.
- [ ] Expired or invalid challenge codes fail clearly without crashing.
- [ ] Info > Delete online profile removes the online identity and competition rows while local game
      progress remains.

## Signed TestFlight and Play internal approval

Repeat all applicable checks above on the exact signed binaries, then verify:

- [ ] Splash, icon, bird art, exercise art, and the bundled MediaPipe tracker load on a clean install
      with no development server.
- [ ] Camera denial, microphone denial, Settings re-enable, interruption, background/foreground, low
      light, and cold start recover cleanly.
- [ ] Record & Play output opens and shares from the signed iOS and Android builds.
- [ ] Consent appears before any ad request where required and can be reopened from Info.
- [ ] Ads appear only after an eligible result action, never during gameplay, recording, or sharing.
- [ ] Closing or failing an ad always completes Done, Try Again, or Next Level exactly once.
- [ ] Purchase, restore-purchase, offline entitlement, and remove-ads behavior work with sandbox/test
      accounts and never block free gameplay.
- [ ] Public marketing, Privacy, Terms, deletion, and support links open signed out over HTTPS.
- [ ] Apple privacy and Google Data Safety answers match the exact SDK/network behavior observed.

## Store evidence

- [ ] Capture 1 to 10 genuine 6.9-inch iPhone screenshots from the approved production candidate.
- [ ] Capture 4 to 8 genuine Android phone screenshots from the approved production candidate.
- [ ] Remove personal notifications and test-account identifiers from captures.
- [ ] Run `corepack yarn workspace mobile release:assets` and resolve every failure.
- [ ] Save the completed matrix and final screenshot set in the private repository before submission.
