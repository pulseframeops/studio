# PulseFrame Studio · Alpha 0.2.8

**Последнее обновление:** [Retro TV & Pulsy Runner](RELEASE_NOTES_RU.md).

# PulseFrame Studio · Alpha 0.2.7 Retro Deluxe

## Обновление Retro и аркады

- Живые сцены **Outrun Highway** и **Speed Platformer**: движущаяся дорога, гонка, параллакс-окружение, кольца, препятствия, пиксельный персонаж.
- Анимированные море, горы, ретро-комната и космос. Пикселизированные логотипы выбранных музыкальных площадок внутри Retro-пресета.
- Больше движения: басовые импульсы, краткие RGB-сдвиги, CRT и пиксельное свечение, привязанные к таймкодам музыки.
- **Звездопад**: правила перед стартом, два этапа (ночь 5 обычных и 2 золотые; рассвет 5 золотых и 5 бриллиантовых), шанс золотой звезды **45%**, метеоры из верхних углов и затухание за 0,5 сек.
- Секреты: после двух этапов можно ввести `027` или `plsframe` для оригинальной пиксельной платформенной мини-игры. Для движения A/D или стрелки, для прыжка пробел.
- В Retro-оформлении аркада использует пиксельную подачу, в остальных темах обычную. Восемь автономных звуковых эффектов синтезированы для проекта (без онлайн-зависимостей).
- Полноэкранный код `fullscreen` / `flscrn`: **15 секунд начинаются с нажатия первой буквы `f`**, вне текстовых полей. Esc закрывает сначала полноэкранный предпросмотр, потом приложение.
- Убраны вспомогательные пояснения из редактора, сохранены функциональные инструкции в справке.

**Совместимость:** проектный формат `.pulseframe`, старые переходы, монтажные дорожки, пресеты Neon и Montagem не мигрировались. Это описание предыдущей Alpha **0.2.7**; текущая версия **0.2.8**.

**Запуск:** Windows: `RUN_WINDOWS.bat` (Node.js); macOS/Linux: `bash RUN_MAC_LINUX.sh`. Для экспорта MP4 можно указать portable `ffmpeg.exe` из папки `bin`.

**Проверка:** `npm test`. Встроенный HTML-предпросмотр не умеет экспортировать MP4, в отличие от Electron.

**Звуки:** в поставке включены оригинальные синтезированные chiptune WAV. Для дальнейшей замены или расширения звукового набора можно использовать пакет [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds), CC0.

**Лицензии:** исходники проекта MIT, зависимости и элементы графики могут иметь отдельные лицензии, см. `THIRD_PARTY_NOTICES.md`.

---

# PulseFrame Studio Alpha 0.2.7

A local-first music-visualizer / lightweight edit-background video editor, for Windows, macOS and Linux. **Experimental source build, not an installer**.

## Launch

- **Browser preview:** open `PulseFrame-Preview.html` in Chrome / Chromium / Edge. Browser preview can load music, images and video, but cannot export MP4.
- **Desktop:** install Node.js; execute `npm install` followed by `npm start` in the extracted folder. On Windows, use `RUN_WINDOWS.bat`.
- **Portable FFmpeg:** when exporting in the desktop application, select your `bin/ffmpeg.exe` using `Экспорт → Указать ffmpeg.exe`. No permanent PATH changes necessary.

## Retro Refresh UI hotfix (same Alpha 0.2.7)

This build fixes a startup crash that disabled the toolbar and Help when the application tried to bind a handler to a removed montage setting. **New**, **Open**, **Save**, **Help** and Support now work in browser smoke tests; `.pulseframe` project schema remains v2. The ALPHA version badge is now hidden in Retro only. The original PulseFrame icon has a transparent background and a refreshed Windows `.ico`.

The new automated test `tests/ui-startup.test.cjs` checks that statically referenced UI control IDs exist and the removed setting is not referenced. Run `npm test`.

**Important:** extract this ZIP into a new directory, not over the previous source directory. Back up important `.pulseframe` files before testing. The HTML preview cannot export MP4; an end-to-end Electron export test on Windows is still pending.

## Alpha 0.2.7 changes

1. **Cuts-only edit-background loop:** the 2 primary videos play ONCE at their authored positions. ONLY the up-to-20 cuts (short video/photo clips) repeat across the rest of the main scene, beginning from the first cut. Primary videos never reappear in later cycles. Without cuts, primary videos do not repeat; the last frame is held when needed. Looping does not affect intro/outro.
2. **True edit preview:** Montagem Editor canvas draws the raw edit video/images and transitions only. Final cover, color grading/darkening, platform icons, visualizer and watermark are visible instead in the main Editor preview.
3. **Editor timeline:** primary and cut lanes, distinct transition lane, repeat lane, scrollable time ruler and zoom. Clips keep true pixel widths as the window narrows: scroll instead of squeeze. Assign Cut / Fade / Wipe / Zoom / Blur transition to a selected clip.
4. **Neon:** removed the purple solid-color color-wash; cover or user background remains recognizable behind blur, dimming and vignette.
5. **Montagem cover:** glow hue is sampled from the most prominent saturated tones of the loaded cover image. Camera motion and video FX use shorter, damped pulses, with a lower-resolution cached intermediate for dynamic blur.
6. **Help:** in-app manual, copyright / brand notice, software and third-party licensing sections.

## Shorts / TikTok teaser editor

A new rail tab **«Анонс»** opens an independent 9:16 workspace. After importing music and cover, choose a song start time and 10–30 second duration. Recommended: at least 15 seconds, not mandatory. Intro (0–5 s), main and release outro (2–6 s) are all included in the chosen duration. The audio starts with intro, not after it. Date left empty → **«СКОРО»**. Add optional camera-wide FX markers at chosen times. Export from this tab produces vertical 1080×1920 MP4, 30 or 60 FPS using Electron + FFmpeg. This does not change the full-length project.

## Black-frame safeguard

The live montage background now retains the last **decoded** frame during seek/loop boundaries instead of clearing to black. Export validates every montage frame and stops with an error if the requested video cannot be decoded. This prevents silently baking a known missing video frame into the output; it is not a replacement for testing codecs and GPU drivers on the destination computer.

## Controls and workflow

1. Import music (MP3, WAV, OGG, etc.), cover (required) and optional image background.
2. Set metadata, choose Neon or Montagem, configure intro/outro.
3. For Montagem, switch to **Монтаж**, add up to 2 primary video and 20 cut/photo elements, select a clip and configure its start, duration, effect and transition before it.
4. The **Montagem Editor preview** displays ONLY the edit footage so you can judge cuts. The **Editor preview** shows the final music visualizer and the processed, looping video background.
5. The repeat lane shows only the short cuts looping; primary clips are never repeated. The montage timeline maintains fixed time scale. Adjust **Масштаб таймлайна**, scroll to a different location, and click the time ruler to seek.
6. Optional: trim the music for a short clip, add corner images or PNG watermark.
7. Save `.pulseframe` and export MP4 through desktop Electron + portable/system FFmpeg.

Keyboard: `Space` play/pause; `Ctrl+B` split selected clip; `C` copy; `V` paste; `Ctrl+S` save; `Ctrl+Z` undo; left/right step. C/V shortcuts don't fire in text fields.

### Notes and limits

- Source clips/images must remain available at their original paths. Project files are JSON references, not self-contained archives.
- ONLY cut footage loops visually. **Original audio from the two primary videos is mixed at their original one-time placement**, not repeated; this is intentional. Sound from repeating cuts is not mixed yet. Sound from other short clips is not mixed.
- Some video codecs are unavailable in Chromium and must be converted before import.
- Dynamic video-background blur is rendered via a reduced-resolution intermediate to lower preview cost. End-to-end MP4 export needs validation on your actual Windows/macOS/Linux installation.
- The editor is not a complete replacement for CapCut/After Effects: keyframe animation, sophisticated ripple editing, proxies and per-track color correction are not included.
- Intro and outro design remains the same; in the final visualizer the edit background is played in the main scene and fades out for the outro.

## Documentation and licensing

- `USER_GUIDE_RU.md`: use instructions and troubleshooting.
- `THIRD_PARTY_NOTICES.md`: licenses, font, FFmpeg and musical-platform marks.
- `LICENSE`: MIT license for PulseFrame Studio original code.

All user-provided media retain their existing rights and are **not** relicensed by the MIT license. Platform logo images are included as user-supplied identification assets; the brands do not endorse the project.


## New in Alpha 0.2.7

The editor now supports selectable preview quality and FPS independent of MP4 export, local PNG icons, RU/EN UI language switch, updated vertical teaser intro/outro plus adjustable framing, and a flexible watermark mode (built-in image/animated/custom/off) alongside a separate Visual by PulseFrame credit. See `USER_GUIDE_EN.md`, `USER_GUIDE_RU.md` and `CHANGELOG.md`.


### Alpha 0.2.7 notes
- Fixed Shorts montage source timing: montage uses the selected original music timestamp, not zero.
- Fullscreen Shorts background uses cover-fill + independent X/Y/zoom.
- Native application menu disabled, built-in project controls unchanged.
- User-provided PulseFrame logo is bundled locally and shown as default system image watermark.
- New beat-reactive particle easing (100–500 ms) and artwork-derived colors.
- Added montage editing FX inspired by user-provided examples; existing `transition` values preserved.
- Frame transport for FFmpeg: Fast (JPEG 98%, compressed intermediate) or Precise (lossless PNG intermediate).
- Export frame-by-frame still incurs video decoding work; speedups are expected but unverified on user's PC.

## Alpha 0.2.7 / Ночной редактор

- Анонс целиком использует статичную обложку или выбранное изображение; видеомонтаж в анонсе отключён без изменения исходных монтажных дорожек.
- Settings: язык RU/EN и темы Dark / Night; тема хранится локально.
- Создание новых переходов: Cut, Pull In, Pull Out, Shake, Spin. Legacy-переходы из сохранённых проектов **сохраняются и по-прежнему рендерятся**.
- В Montagem Editor: перемещение и обрезка клипов мышкой на шкале времени; позиционирование кадра перетаскиванием на предпросмотре, масштаб колесом, точные числовые настройки.
- Pull In может скрыть элементы визуализатора перед первой волной нарезок и вернуть их со второго повтора.
- Площадки выбираются отдельно: Spotify, YouTube Music, Apple Music, VK Музыка, Яндекс Музыка. В экспорт попадают только отмеченные.
- Прежние проекты .pulseframe имеют схему 2; параметрам не требуется массовое преобразование. Сделайте резервную копию перед обновлением.
- В этой альфе нет продвинутой системы ключевых кадров, многодорожечных композиций и GPU-рендера. Производительность проверяйте на реальных исходниках.


## Alpha 0.2.7 Refresh (minor refresh, version unchanged)

- New **Retro** preset with city, beach, mountains, room, space backdrops, optional CRT scanlines, and a pixel-style application skin. Retro switches back to Neon/Montagem with a liquid-style transition. Google Fonts **Press Start 2P** is loaded when the app can access the internet; offline systems fall back to monospace.
- New PulseFrame Studio icon/branding from the creator's supplied artwork.
- **Ctrl+B** split shortcut receives keyboard events before the browser default and falls back to the selected clip midpoint when the playhead is outside the clip. Timeline left trimming is bounded by available source media and timeline start.
- **Pull In** and **Pull Out** removed from new effects menus; existing project files using them remain readable and renderable.
- Stronger time-based beat hit response in Neon and Montagem.
- Help now includes Support / Ko-fi (https://ko-fi.com/tihsmile). All donations are optional.
- **Starfall** minigame: click falling stars before they reach mid-screen; complete its hidden milestone and secret 027 sequence for the easter egg.
- Secret whole-app fullscreen: type `fullscreen` or `flscrn` within 15 seconds while not typing into a form field; press Esc to exit. Preview fullscreen exits before whole-app fullscreen.

### Hardware recommendations

| | Minimum | Recommended |
|---|---|---|
| CPU | 2 cores, modern browser support | Recent 4–6+ core processor |
| RAM | 4 GB | 8–16 GB |
| Storage | 1 GB free for app, plus video exports | SSD and space for temporary renders |
| Graphics | Functional driver / Canvas 2D | GPU acceleration, recent drivers |
| Preview | Low, 24 FPS | Medium/High, 30–60 FPS |

Several simultaneous MP4 layers are substantially heavier than static visuals; actual export speed depends on codec, disk speed and FFmpeg preset.

Конечно, и на 4 гигах ОЗУ потянет, но с Пентиумом... соболезную... (пособолезнуйте мне тоже).
