# Product

<!-- impeccable:product-schema 1 -->

## Platform

Windows desktop app (Electron), shipped as one portable .exe built by GitHub Actions and published as a GitHub release. The design language is desktop Windows, following the suite guideline in DESIGN.md.

## Users

The owner, on their own Windows laptop (Lenovo IdeaPad Gaming 3, RTX 3060 Laptop GPU, mostly on a 27" 1440p monitor). They upscale low-resolution anime art that they used to run through waifu2x.net one image at a time.

## Product Purpose

Waifu2x Batch upscales a whole folder of images with nunif's waifu2x, then lets you check each result against the original and re-run any image with other settings, keeping every version. Success means a batch runs unattended with clear progress, and the best version of each image is easy to judge and keep.

## Positioning

The same settings as waifu2x.net (style, noise reduction, upscaling) run locally on the GPU for any number of images. A comparison viewer is built around waifu2x results: hold to see the original, a split seam, side by side with shared zoom, and unlimited versions per image.

## Operating Context

- The owner points the app at a folder (optionally with its subfolders), ticks images, and runs a batch.
- Results are saved next to each source as `name__<settings>.png`. Nothing is ever overwritten.
- Images already done with the same settings are skipped.
- After a batch, the owner reviews each image in Compare and re-runs some with other settings.
- The engine (Python 3.12, PyTorch with CUDA 13.2, nunif, models) is installed once from inside the app, into the app data folder. The app data folder can be moved to an external drive.

## Capabilities and Constraints

- **Settings:** Style (Artwork, Artwork/Scans, Photo), Noise (None, Low, Medium, High, Highest, mapped exactly as on waifu2x.net), Upscale (None, 2x, 4x), Tile size, and TTA.
- **Engine install:** follows nunif's own Windows installer, and ends with a test upscale before it reports ready.
- **Progress:** every download and task shows a bar, a percentage, the time elapsed and the time left (the owner's standing rule).
- **Appearance:** fully customisable (themes, colours, gradients, fonts, corners, density), with themes shareable between the owner's apps as theme files.
- **Storage:** app data, settings, themes and fonts live outside the program folder, so updates keep them.
- **Never in the app:** 1.6x upscaling (not in nunif's CLI), and video upscaling (images only).

## Brand Commitments

App name: Waifu2x Batch. The owner chose the default look (Obsidian, Lime → Teal, Inter, Standard corners, Compact density) and wants every option to stay changeable.

## Evidence on Hand

None needed. Screenshots and mockups use generated placeholder art, not real images.

## Product Principles

- Nothing is overwritten or lost: new versions sit beside the originals.
- The owner can always see what is running, how far along it is and how long is left.
- Reviewing results is as important as making them.
- One look across all of the owner's apps, and every part of it can be changed.
