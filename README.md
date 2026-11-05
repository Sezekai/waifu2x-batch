# Waifu2x Batch

Batch upscaler and comparison viewer for anime art, built on nunif's waifu2x. Upscaled files are saved next to their sources, and every version is kept so you can compare them and re-run with other settings.

## For users

1. Run `Waifu2x-Batch-<version>.exe`. No install needed.
2. Open the **Setup** tab and click **Install engine** (once). It downloads Python 3.12, PyTorch with CUDA 13.2, nunif and the waifu2x models into the app's data folder (several GB, mostly PyTorch), then tests an upscale. If it stops, click it again to continue. CUDA 13.2 needs a recent NVIDIA driver; without one, upscaling falls back to the CPU and the Setup tab says so.
3. Go to **Batch**, choose a folder, tick images, and click **Upscale selected**.

Defaults match waifu2x.net: Artwork, Noise Reduction Medium, 2x.

## Batch tab

- Outputs are named `name__artwork_medium_2x.png` in the same folder as the source.
- Images that already have a version with the same settings are skipped.
- Nothing is overwritten. Cancel stops the run, and finished files are kept.

## Viewer tab

- **Hold to compare:** hold left mouse (or Space) to see the original. Release for the upscaled version.
- **Slider:** drag the handle to split original and upscaled.
- **Side by side:** the original plus any versions ticked in the Versions list, with linked zoom and pan.
- Wheel zooms around the cursor. Right-drag or middle-drag pans.
- Keys: ← → change image, `+` `-` zoom, `0` fit, `1` 100%, `h` `s` `c` switch modes.
- **Upscale this image** adds a new version with the settings in the box.
- Removing a version from the list does not delete its file.

## Where things live

- Engine, version list and settings: the app data folder (shown in the Setup tab; by default `%APPDATA%\waifu2x-batch-upscaler`). Outside the exe, so updating the exe keeps everything.
- Upscaled images: next to the source images.
- Setup tab > **Reset app data** clears the version list and settings. It keeps the engine and never touches your images.
- Setup tab > **Move app data…** moves the whole data folder (about 3 GB with the engine) to another drive, such as an external drive. It copies first, then deletes the old copy, and the app closes so you can reopen it.
- The Setup tab shows download and install progress with a bar and the current step.
- Install log: `engine\install.log` in the data folder. It lists every step with timestamps, plus all output from the installer tools. Open it if the install looks stuck.
- Progress panels (Setup and Batch tabs) show a percentage, bytes or items done, speed, time elapsed and time left. Steps that cannot report their size (unpacking, some installs) show an animated bar and their elapsed time.

## For the developer

```
npm install
npm test
npm start
npm run dist      # builds dist/Waifu2x-Batch-<version>.exe
```

The GitHub Actions workflow in `.github/workflows/build.yml` builds the exe on Windows for every push, uploads it as an artifact, and publishes it to a release for `v*` tags.

Notes:
- Noise levels match waifu2x.net exactly (taken from nunif's website code): None, Low = 0, Medium = 1, High = 2, Highest = 3.
- nunif's 1.6x upscale is not in its CLI, so it is not offered.
- `lib/engine.js` follows nunif's own Windows installer (`windows_package/update.bat`): Python 3.12.10 embeddable with `..
unif` in its `._pth` file, then `requirements-torch.txt` (PyTorch, CUDA 13.2) and `requirements.txt`. The install ends by upscaling a small test image.
