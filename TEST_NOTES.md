# Alpha 0.2.8 test notes

Automated `node --test tests/*.test.cjs` tests the inherited project logic and new Retro controls/arcade geometry. Separate live Chromium rendering via in-memory page content checked the Retro TV intro, main scene, outro options, and sprite-based game frames with zero JavaScript page errors. An in-memory Chromium UI check also exercised the Retro controls and Help button without exceptions.

**Not verified here:** native Electron video export on Windows, real-time long-game endurance on user's hardware, GPU-dependent fullscreen performance, and actual YouTube Studio interaction after upload. The standalone HTML preview intentionally cannot export MP4.

The YouTube recommendation outlines are only visual placeholders; videos require a YouTube Studio end screen added on upload for interactivity. YouTube Help: https://support.google.com/youtube/answer/6388789.

Backup important `.pulseframe` files before testing a new Alpha. The project schema remains version 2 and existing preset/transition properties are preserved.
