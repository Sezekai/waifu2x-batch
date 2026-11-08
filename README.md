# Waifu2x Batch

Batch upscaler and comparison viewer for anime art, built on nunif's waifu2x. Upscaled files are saved next to their sources, and every version is kept so you can compare them and re-run with other settings.

## For users

1. Download `Waifu2x-Batch-<version>.exe` from the latest release and run it. No install needed.
2. Open **Engine** in the left rail and click **Install engine** (once). It downloads Python 3.12, PyTorch with CUDA 13.2, nunif and the waifu2x models into the app's data folder (several GB, mostly PyTorch), then tests an upscale. If it stops, click **Resume install** and it carries on. CUDA 13.2 needs a recent NVIDIA driver; without one, upscaling falls back to the CPU and the Engine screen says so.
3. Open **Batch**, choose a folder, tick images, and click **Upscale**.

Defaults match waifu2x.net: Artwork, Noise Reduction Medium, 2x.

## Batch

- **Folders:** add as many as you like with **Add folder…**. The tree on the left lists them with their subfolders; click one to show only that folder (and what's under it). Ticks stay when you switch. × takes a folder off the list without touching it.
- **Views:** List, Grid and Gallery. The slider (or Ctrl + mouse wheel) makes thumbnails bigger or smaller in List and Grid. In List, hovering a thumbnail or file name shows a larger preview (turn it off, or change its size, under the options button ⚙).
- **Sorting:** click any column header (click again to reverse), or use the Sort drop-down and the arrow button.
- **Selecting and ticking:** a click selects an image. Ctrl+click or the tick box ticks it for upscaling; hold Shift as well to tick everything in between. Ctrl+A ticks everything shown. In the options you can switch to "click ticks" instead.
- **Settings per image:** tick images (or select one) and change Style, Noise, Upscale, Tile or TTA in the bar above the list; only those images change. The Settings column shows each image's settings, own settings in the accent colour. **Use defaults** puts them back on the toolbar's settings.
- **Gallery:** double-click an image (or Enter). No overlays on the image; the panel on the right has the details, the tick, the image's settings and the actions. ← → or PgUp PgDn: previous / next. Home End: first / last. ↑ ↓ or the wheel: zoom (around the middle of the view). X: tick. F or F11: full screen with just the image and the panel.
- **Upscaling and the queue:** **Upscale** runs the ticked images, or every image shown when nothing is ticked. Pressing it again while something runs (or **Upscale again** in Compare) adds to the queue instead. The status bar shows one bar for the whole queue. **Stop** stops the current image and empties the queue; finished files are kept.
- **Outputs:** named `name__artwork_medium_2x.png`, in the same folder as the source. Nothing is overwritten. Images already done with the same settings are skipped.
- **Review:** after a run, **Review** in the status bar opens the first result in Compare.

## Compare

- **Images:** the folder chosen on the Batch screen, in the same order.
- **Hold:** hold the left mouse button or Space to see the original. Dragging while you hold pans.
- **Split:** drag the seam between the original and the version.
- **Side by side:** the original and every version with the eye icon on, all sharing zoom and pan.
- **Sequence:** one image at a time; ← → step through the original and its versions, keeping the zoom. ↑ ↓ change image.
- **H:** hides everything but the images (full screen). H or Esc brings it all back.
- **Space** shows the original in every mode.
- **Zoom and pan:** the wheel zooms around the cursor. Drag to pan (right-drag in Hold mode).
- **Versions:** click a version card to show it. Use the eye for side by side. Hover a card for:
  - **Keep + original:** the version moves to `Upscaled Images` and the original to `Upscaled Images - Originals` (both inside the image's folder). Other versions go to the Recycle Bin.
  - **Keep only this:** the same, but the original goes to the Recycle Bin too.
  - **Bin icon:** that file (original or version) goes to the Recycle Bin.
  - When nothing of an image is left in its folder (kept or deleted), it leaves the list and isn't added again, even if you add the folder again. Those two folders are never scanned.
- **Run again** makes a new version with other settings.
- **Keys:** ← → change image, `+` `-` zoom, `0` fit, `1` original pixels at 100%, `Q` `W` `E` `R` Hold, Split, Side by side, Sequence, `H` just the images. **Keys** in the rail (or `K`) lists them all.

## Appearance (Look)

- **Presets:** mix and match 13 backgrounds, 20 accents, 21 bundled fonts plus your own, 5 corner styles and 3 densities.
- **Every colour is changeable:** all 12 background colours, the 3 state colours, and a gradient of 1 to 4 colours with its direction.
- **Your own fonts:** **Add font…** copies font files into the app data folder.
- **Themes:** save looks as themes, and export or import them as `.theme.json` files. The same format works in every app that follows DESIGN.md.
- **Default:** Obsidian, Lime → Teal, Inter, Standard corners, Compact density. **Reset to default** brings it back.

## GPU

- **Which PyTorch:** the installer asks the NVIDIA driver which CUDA version it supports and installs the PyTorch build that matches (CUDA 13.2, 13.0 or 12.6). CUDA 13 builds need driver 580 or newer.
- **Diagnose GPU** (Engine screen) checks Windows' display adapters (both GPUs, and whether the NVIDIA one is disabled or erroring), the NVIDIA driver, the CUDA library, PyTorch and a real calculation on the GPU. It lists what it found, with a fix for each problem, and saves `engine\gpu-report.txt` in the data folder. **Copy report** copies it. It runs by itself when the install test finds PyTorch can't use the GPU.
- **Repair GPU support** reinstalls just PyTorch with the right build for your driver, then tests again.
- **Upscale on:** Auto (the NVIDIA GPU when it works, otherwise the CPU), a specific GPU, or the CPU.
- **Two GPUs** (like an AMD integrated GPU and an NVIDIA one) are fine: CUDA only ever uses the NVIDIA GPU. In Task Manager, upscaling shows on the NVIDIA GPU's "Cuda" or "Compute_0" graph, not the default "3D" graph.
- **While upscaling,** the status bar shows the GPU's load and video memory every 2 seconds, or "On the CPU (slow)".
- **Out of video memory:** the log says so; choose a smaller Tile size.

## Window

- **No menu bar.** The title bar matches the theme. Drag it to move the window.
- **F or F11:** full screen.
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
