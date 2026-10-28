## Retro TV & Pulsy Runner (Alpha 0.2.8)

Select the Retro preset for an independent TV intro/outro. Configure the TV reveal (1–4 s), ending style (YouTube recommendation placeholders or listening platforms), and custom captions in the Retro options. Outro duration defaults to 10 s. Clickable YouTube end-screen elements must be added separately in YouTube Studio.

After completing both Starfall stages, the `plsframe` secret opens Pulsy Runner: three original stages, a sprite-based mascot, enemies, rings, checkpoints, double jumps and dash. A/D or arrow keys to move, Space to jump, Shift to dash, R to restart, M to mute. The three looping soundtracks work offline.

## Retro Deluxe / Starfall

Choose Retro and try the animated **Outrun Highway** or **Speed Platformer** scenes. Beach, mountains, room and space scenes also feature movement. Platform icons are pixelated in Retro only.

Starfall starts with a rules screen. Catch 5 regular and 2 gold stars at night, then catch 5 gold and 5 diamond stars at sunrise. Gold drop chance: 45%. Secret keyboard combinations unlock after both stages.

For app fullscreen, the 15-second timer begins with the first `f` and must finish with `fullscreen` or `flscrn` outside text fields.

# PulseFrame Studio Alpha 0.2.5 · English user guide

## Getting started

1. Run `npm install` and `npm start` in a desktop terminal (or open PulseFrame-Preview.html for a browser-only preview).
2. In the wizard, import an audio file and cover image. The background is optional. Enter track title and artist.
3. Choose Neon or Montagem. Open Editor to adjust the timeline, image position, effects, intro and outro.
4. Montagem allows up to 2 primary videos and 20 additional cuts. Only the cuts repeat until the main music section ends.
5. Set Preview Quality to Low / Medium / High and Preview FPS to 24 / 30 / 60. This **does not change MP4 export quality**.
6. For MP4 output use the desktop version and a suitable FFmpeg build, including portable FFmpeg in a `bin` folder.

## Teaser / Shorts

In the Teaser tab, pick 10–30 seconds of music (15 seconds recommended), then set the intro/outro durations. The teaser fades in from black while audio fades in; the outro dims the existing scene, fades the music out, and shows the track title plus release date or **COMING TO PLATFORMS**. The artist name is not shown during the teaser outro. The 9:16 framing controls adjust zoom and X/Y position. Both montage and standard backgrounds fill the output frame.

## Watermarks

The built-in PulseFrame watermark is enabled by default. You can turn it off, use PNG, or import an MP4/WebM animated watermark. Position, size and opacity are customizable. A separate **Visual by PulseFrame** credit is rendered above user overlay layers in the upper-right corner. This is an open-source application, so modifying the source can also modify the credit; there is no technical tamper-proof guarantee.

## Languages

Select Русский / English in the header. User-facing controls and most static interface labels are translated. Technical logs, filenames and some contextual runtime alerts may remain in Russian during the alpha stage.

## Keyboard shortcuts

Ctrl+S Save, Ctrl+Z Undo, Ctrl+B Split in Montage, C Copy selected clip, V Paste. The last two shortcuts do not interfere with text entry.

## Copyright and licenses

You are responsible for permissions to imported audio, videos, images and trademarks. PulseFrame's source code is offered under the included MIT LICENSE. Montserrat is available under SIL OFL (https://fonts.google.com/specimen/Montserrat). UI icons are raster PNG adaptations of Lucide (ISC) and social platform icons adapted from Simple Icons (CC0 package; check individual trademark rights). Read `THIRD_PARTY_NOTICES.md` for source links. FFmpeg is external and its licenses vary by build.

## Project links

Telegram https://t.me/PulseFrameOpS  
X https://x.com/pulseframeops  
GitHub https://github.com/pulseframeops/studio

## Known limitations

Electron MP4 export on an end-user Windows installation has not been confirmed in this environment. Preview quality/fps tuning does not affect frame-accurate rendering; the exporter may be slow. Project files currently reference external source media. In alpha, animated watermark video requires a supported browser codec.


### Alpha 0.2.6
The Shorts background references the selected original-song timestamp, including during intro and outro. Independent background zoom and pan controls fill the vertical frame without changing cover placement. New Montagem transitions and FX are additive, so previously saved transitions remain intact.

The default system watermark is now the author's PulseFrame PNG artwork. MP4 exports offer faster JPEG 98% intermediate frames or lossless PNG frames for fidelity. Both use H.264 video output.


### Alpha 0.2.7 changes

Teasers use cover art/custom still imagery instead of Montage edit footage. In Montage Editor, drag clips to reposition; drag clip edges to trim; drag within the preview to reposition the image or use the mouse wheel to zoom. New transitions: Cut, Pull In, Pull Out, Shake, Spin. Legacy transitions remain compatible with saved project files. The Settings tab contains language and theme. Platform logos can be selected individually.


## Alpha 0.2.7 refresh

New Retro video preset (city, beach, mountains, room, space), pixel-style application chrome with optional CRT, updated branding, a Starfall easter egg, Ko-fi support panel, reliable Ctrl+B capture, safer timeline trim boundaries, and punchier beats. Use `fullscreen` or `flscrn` outside editable fields within 15 seconds; Esc exits preview fullscreen before application fullscreen. Pull In/Out are no longer available for new edits, but remain compatible with legacy projects.

**Hardware guidance:** minimum 4 GB RAM, 2-core CPU, adequate graphics driver and disk space; recommended 8–16 GB RAM, newer 4–6-core CPU and SSD. More footage layers require more resources.

Конечно, и на 4 гигах ОЗУ потянет, но с Пентиумом... соболезную... (пособолезнуйте мне тоже).
