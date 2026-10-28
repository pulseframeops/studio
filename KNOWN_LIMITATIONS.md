# Known limitations · Alpha 0.2.7 Refresh

- Direct local-file and localhost browser navigation are restricted in this runtime. However, live Chromium smoke tests now execute by loading the page source and compiled offline preview in memory: navigation, Help, New/Open/Save and Retro switching were verified. Full Electron window closing/fullscreen and MP4 export must still be tried on Windows/macOS/Linux.
- The Retro font Press Start 2P is requested from Google Fonts at runtime; without internet the interface uses a monospace fallback. No font files are distributed.
- Preview and offline movie encode performance depends strongly on the number and codec of input videos. Stronger beat reactions are time-derived, but may require reducing Shake or Zoom for photosensitive viewers.
- Pull In and Pull Out are removed from new effect dropdowns, but legacy saved projects remain compatible; do not overwrite source projects without making a backup.
- Project schema remains version 2; retro scene settings are an optional added property. Existing scene effects remain unchanged on load.
- The Starfall minigame uses time-based random spawning; it is not suitable for accessibility-critical keyboard-only workflows.
- To see the Retro Google Font online, the Google Fonts service must be reachable; the visual style still runs with a fallback font.
