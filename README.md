# Waifu2x Batch

Batch upscaler and comparison viewer for anime art, built on nunif's waifu2x. Upscaled files are saved next to their sources, and every version is kept so you can compare them and re-run with other settings.

## For users

1. Download `Waifu2x-Batch-<version>.exe` from the latest release and run it. No install needed.
2. Open **Engine** in the left rail and click **Install engine** (once). It downloads Python 3.12, PyTorch with CUDA 13.2, nunif and the waifu2x models into the app's data folder (several GB, mostly PyTorch), then tests an upscale. If it stops, click **Resume install** and it carries on. CUDA 13.2 needs a recent NVIDIA driver; without one, upscaling falls back to the CPU and the Engine screen says so.
3. Open **Batch**, choose a folder, tick images, and click **Upscale**.

Defaults match waifu2x.net: Artwork, Noise Reduction Medium, 2x.

## Batch

- **Ticking:** tick images (Shift-click ticks a range), or untick everything to upscale the whole folder. Filter by All, Not done or Done for the current settings.
- **Table:** shows each image's size, its output size, how many versions it has, and its status. While a batch runs, each row says Done, Upscaling, Queued or Failed.
- **Outputs:** named `name__artwork_medium_2x.png`, in the same folder as the source.
- **Skipping:** images that already have a version with the same settings are skipped.
- **Nothing is overwritten.** Stop ends the run, and finished files are kept.
- **Review:** double-click an image to open it in Compare. After a batch, **Review** in the status bar opens the first result.

## Compare

- **Hold:** hold the left mouse button or Space to see the original.
- **Split:** drag the seam between the original and the version.
- **Side by side:** the original and every version with the eye icon on, all sharing zoom and pan.
- **Space** shows the original in every mode.
- **Zoom and pan:** the wheel zooms around the cursor. Drag to pan (right-drag in Hold mode).
- **Versions:** click a version card to show it. Use the eye for side by side, and × to remove it from the list (the file stays).
- **Run again** makes a new version with other settings.
- **Keys:** ← → change image, `+` `-` zoom, `0` fit, `1` original pixels at 100%, `H` `S` `C` switch modes. **Keys** in the rail lists them all.

## Appearance (Look)

- **Presets:** mix and match 13 backgrounds, 20 accents, 21 bundled fonts plus your own, 5 corner styles and 3 densities.
- **Every colour is changeable:** all 12 background colours, the 3 state colours, and a gradient of 1 to 4 colours with its direction.
- **Your own fonts:** **Add font…** copies font files into the app data folder.
- **Themes:** save looks as themes, and export or import them as `.theme.json` files. The same format works in every app that follows DESIGN.md.
- **Default:** Obsidian, Lime → Teal, Inter, Standard corners, Compact density. **Reset to default** brings it back.

## Window

- **No menu bar.** The title bar matches the theme. Drag it to move the window.
- **F11:** full screen.
- **Ctrl+Shift+I:** developer tools (useful for bug reports).
- **Ctrl+Shift+R:** reloads the window when nothing is running.

## Status bar and log

- **Status bar:** every task shows a bar, a percentage, the time elapsed and the time left. Downloads also show bytes and speed. After 20 seconds with no new progress it says so.
- **Log:** opens with **Log** or `L`, and opens by itself on an error. The engine install also writes `engine\install.log` in the data folder.

## Where things live

- **App data:** the engine, version list, settings, themes and fonts. The default folder is `%APPDATA%\waifu2x-batch-upscaler`, and the Engine screen shows the current one. It's outside the exe, so updating keeps everything.
- **Upscaled images:** next to the source images.
- **Move app data…** copies the whole data folder to another drive, deletes the old copy, and closes the app so you can reopen it.
- **Reset app data…** clears the version list and settings. Your images, themes, fonts and the engine stay.

## For the developer

```
npm install
npm test
npm start
npm run dist      # builds dist/Waifu2x-Batch-<version>.exe
```

- **Startup check:** `W2X_SMOKE=out.png npm start` opens the app, writes a screenshot and `out.log`, and exits with code 1 if the page script didn't start. CI runs it on the packaged exe before publishing.
- **Builds:** every push to `main` builds the exe on Windows and publishes it as the GitHub release for the version in `package.json`.
- **Design:** DESIGN.md is the design guideline for all the suite's apps. PRODUCT.md describes this app.
- **Fonts:** bundled fonts are in `renderer/fonts` (SIL Open Font License, licences included).

Notes:

- **Noise levels** match waifu2x.net exactly (taken from nunif's website code): None, Low = 0, Medium = 1, High = 2, Highest = 3.
- **1.6x upscaling** isn't in nunif's CLI, so it isn't offered.
- **The installer** (`lib/engine.js`) follows nunif's own Windows installer (`windows_package/update.bat`):
  1. Python 3.12.10 embeddable, with `..\nunif` in its `._pth` file.
  2. `requirements-torch.txt` (PyTorch, CUDA 13.2).
  3. `requirements.txt`.
  4. A test upscale of a small image.
