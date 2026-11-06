# Suite design guideline

Version 1. Applies to every desktop app in the suite: Waifu2x Batch (the reference implementation), Media Toolbox, Image Seek, Nirvash, Ginkgo, and any new app. When an app is changed or a new one is made, it follows this page. Where an app needs something this page doesn't cover, add it here first so the next app gets it too.

## Mode and scene

Operate. One person on their own Windows PC (a 27" 1440p monitor, sometimes the 15" 1080p laptop screen) works through folders of images, videos and files. The screen should be mostly the work: lists, images, results. Controls stay small, aligned and in the same place in every app.

## Default look

| Part | Default |
| --- | --- |
| Background | Obsidian |
| Accent | Lime → Teal (`#b6f05a` → `#2fd6b4`, 90°) |
| Font | Inter, 13 px |
| Corners | Standard: 6 px on controls, 10 px on panels |
| Density | Compact: 28 px controls, 24 px rows |

Every app also has an Appearance screen (see Appearance) where all of this can be changed and saved as themes. Themes move between apps as theme files.

## Colour tokens

Every colour on screen comes from one of these. Nothing else is hard-coded, except the black labels drawn over images.

| Token | Job | Obsidian |
| --- | --- | --- |
| `ground` | Window background | `#0a0a0b` |
| `rail` | Side rail | `#060607` |
| `panel` | Panels, status bar, drawers | `#111113` |
| `raised` | Buttons, cards, chips | `#19191c` |
| `raised2` | Hover, selected segment, progress track | `#232327` |
| `field` | Text boxes, lists, tables | `#070708` |
| `line` | Borders and dividers | `#212125` |
| `line2` | Stronger borders, checkbox edges | `#2e2e33` |
| `text` | Main text | `#ececee` |
| `sec` | Secondary text, labels | `#a0a0a7` |
| `faint` | Hints, placeholders, metadata | `#7d7d84` |
| `stage` | Behind images | `#040405` |
| `ok` / `warn` / `danger` | Success, warning, danger | `#52d39a` / `#f2b64c` / `#f0616d` |
| accent stops | 1 to 4 colours and an angle | `#b6f05a`, `#2fd6b4`, 90° |

Derived values:

- **Gradient** (`grad`) is drawn from the stops. With one stop, it's a solid colour.
- **Text on the accent** (`on-acc`) is dark (`#0b0c0f`) or white, whichever has the better contrast against every stop. It can be pinned to dark or light.
- **Tints** for selection and hover are the accent mixed into the surface: about 9% for the selected row, 13% for ticked rows, 20% for active pills.

**Contrast:** text, secondary text and faint text all stay at 4.5:1 or above on `panel`. Every preset is checked against this.

### The accent is only for

- the main button (one per toolbar),
- progress bars,
- the compare seam,
- checkboxes, focus rings and the selected item,
- the active rail item,
- the logo tile.

Never use the accent as decoration. State colours carry meaning only: `ok` for done, `warn` for "needs attention", `danger` for failed and for actions that delete.

## Type

- **One family for the whole interface.** Weights 400 for text, 600 for buttons and labels, 700 for page titles.
- **Sizes:** 13 px text, 12 px captions and column headers, 15 px page titles. The text size setting moves all three together.
- **Monospace** (JetBrains Mono) only in the log and in hex colour fields.
- **Tabular numbers** wherever digits line up.
- **Bundled fonts** are Latin subsets, 400, 600 and 700, all SIL Open Font License: Inter, Geist, Manrope, Figtree, Onest, Rubik, Lexend, IBM Plex Sans, Atkinson Hyperlegible Next, Ubuntu, Plus Jakarta Sans, DM Sans, Work Sans, Public Sans, Nunito Sans, Sora, Space Grotesk, Outfit, Red Hat Text, Albert Sans and JetBrains Mono.

## Sizes

- **Height:** every button, text box, drop-down and segmented control is `--ch` tall (28 px compact).
- **Rows:** list rows are `--rh` tall (24 px). Two-line rows with a 32 px thumbnail are `--rh` + 20 px.
- **Gaps:** 8 px between controls and between panels, 10 px inside panels, 12 px around the page.
- **Labels:** field labels in toolbars share one 88 px column, so fields line up from row to row.
- **Corners:** `--rc` on controls, `--rp` on panels. Thumbnails use the control radius minus 1 px.
- **No shadows,** except on things that float: dialogs, toasts and the compare seam's grip.

## Layout

```
┌──────┬───────────────────────────────────────────────────────────────┐
│ rail │ Title  One-line description of what this screen does           │
│ 64px │ ┌ toolbar panel ───────────────────────────────────────────┐ │
│      │ │ Label  [ field ……………… ] [Browse] ☐ option │ [Stop] [Main] │ │
│ tool │ │ Label  setting ▾  setting ▾  setting ▾  ☐ option    note │ │
│ tool │ └──────────────────────────────────────────────────────────┘ │
│ tool │ ┌ work area: list, table or image, takes all the height ─┐  │
│      │ │ summary · filter [All|Not done|Done] [Select all] ……… │  │
│ ──── │ │                                                         │  │
│ Look │ └─────────────────────────────────────────────────────────┘  │
│ Keys │                                                               │
│ Log  ├───────────────────────────────────────────────────────────────┤
│      │ Job  file · settings ……… ▬▬▬▬▬▬▱▱ 58%  1:12 elapsed · about 0:52 left [Stop] [Log] │
└──────┴───────────────────────────────────────────────────────────────┘
```

- **Rail (64 px):**
  - The logo tile is first, in the accent.
  - Tools come next, each a 19 px icon with an 11 px label.
  - **Look** (Appearance), **Keys** (shortcuts) and **Log** sit at the bottom.
  - The active tool gets a `raised` background and an accent icon.
  - A small accent dot marks a tool that needs attention, for example the engine not being installed.
- **Header:** one line: the title, then what the screen does, cut short with "…" when narrow.
- **Toolbar panel:**
  - Row one is the main input and the main action.
  - Row two holds the settings for that action.
  - Rows wrap on narrow windows; they never scroll sideways.
- **Work area:** fills the remaining height. A summary line with the filters and list buttons sits on top.
- **Side panel:** when a screen needs a list and a detail view (Compare, Appearance), the list is a 292 px panel on the left.
- **Status bar (36 px):** on every screen (see Progress).
- **Log drawer (220 px):** slides up over the bottom of the screen. It has Copy, Clear and Close, and opens by itself on an error.
- **No sideways scrolling, anywhere.** Tables use fixed column widths, and the first text column takes the spare width and truncates with "…".
- **Minimum window:** 1100 × 680. Every screen is checked at 1100, 1440 and 1920 wide.

## Progress (the owner's rule)

Every download and every task shows a progress bar, a percentage, the time elapsed and the time left. It must always be possible to tell that something is really running.

- **Status bar:** the job name (and "3 of 6" for batches), what it's working on, the bar, the %, then "1:12 elapsed · about 0:52 left".
- **While the rate is unknown,** it says "working out time left…".
- **Sizes:** downloads show bytes ("1.21 GB of 3.01 GB · 11.8 MB/s").
- **Unknown size:** when a step has no size to report, the bar becomes a sliding bar and says "size not known yet". Elapsed time still counts.
- **Stall warning:** after 20 s with no new progress, the status line turns `warn` and says how long it has been, and that the log shows what is running.
- **Cap at 99%:** the percentage stops at 99% until the task has really finished.
- **Detail lists:** where a task has steps or items, each one shows its own state: Done ✓, current (accent, sliding mini bar), Queued, Failed (danger). The batch table does this per file, and the Engine screen does it per install step.
- **Finishing:** the status bar says what happened ("Finished: 6 made, 0 failed · took 2:04") and offers the next step (Review). It never silently clears.

## Components

- **Buttons:**
  - Primary: gradient, `on-acc` text, weight 600, one per toolbar.
  - Default: `raised` with a `line` border.
  - Ghost: no fill, `sec` text.
  - Danger-ghost: `danger` text with a soft danger border, for things like Reset.
  - Danger: solid, used only inside a confirmation dialog.
- **Drop-downs:** native `<select>` (or the platform's own combo box) with a 14 px chevron.
- **Checkboxes, radio buttons and sliders:** native, coloured with the accent (`accent-color`).
- **Segmented control:** a `field`-coloured track with 2 px padding. The chosen segment is `raised2`. Counts sit in `faint` after the label ("Not done 8").
- **Pills:** 24 px, round, for filters in side panels.
- **Tags:** 20 px round labels for status: `ok`, `warn`, and an accent tint.
- **Tables:**
  - A sticky header in `panel` at 12 px / 600 / `sec`, with a checkbox column first.
  - Rows `--rh` tall with an 18 px thumbnail.
  - Ticked rows get a faint accent tint; the row being worked on gets the selection tint.
  - Shift-click ticks a range, and double-click opens the item.
- **Cards** (versions, themes): `raised`, with a 1 px `line` border that becomes the accent when chosen. Small actions appear on hover.
- **Banners:** one line with an icon, a bold lead, a sentence and one button. Tinted from the accent (6% fill, 26% border), never brown or yellow. Use them for "needs setting up first" states.
- **Empty states:** a 28 px faint icon, one sentence on what goes here, and the button that fills it.
- **Dialogs:** in-app only (no Windows pop-ups). A title, a sentence, an optional input, and actions on the right. Enter confirms, Esc cancels.
- **Toasts:** bottom right, 4–7 s, an icon in `ok` / `danger` / accent. Used for "done" and short errors. Long errors go to the log.
- **Icons:** one outline set on a 24-unit grid, 1.6 stroke, round ends, 16 px in controls and 19 px in the rail. No emoji, and no mixed icon sets.
- **Focus:** a 2 px accent ring on every interactive element.
- **Motion:** 150–250 ms. Only the drawer, toasts, the sliding progress bars, and nothing decorative. Respect reduced motion.

## Appearance (every app has this screen)

A **Look** item at the bottom of the rail opens the Appearance screen.

- **Themes panel (left):**
  - Lists the built-in Default and every saved theme, each with a swatch strip (ground, panel, raised, gradient), its name and its font.
  - Clicking a theme uses it.
  - Each saved theme has Rename, Duplicate, Export, Delete, and Update when the current look has been edited away from it.
  - At the bottom: Save as theme…, Import… and Export….
- **Preview:** sample buttons, a select, a checkbox, a progress bar, statuses and tags, so changes can be judged without leaving the screen.
- **Background:**
  - Presets: Obsidian, Carbon, Graphite, Midnight, Ink blue, Slate, Aubergine, Wine, Forest, Deep teal, Mocha, and the light themes Daylight and Linen.
  - A colour picker and a hex field for each of the 12 tokens and the 3 state colours.
- **Accent:**
  - Presets: 13 gradients and 7 solid colours.
  - The gradient editor has 1 to 4 colours (add or remove), a direction slider, and text on accent (Auto, Dark or Light) with a live contrast readout that warns below 4.5:1.
- **Font:**
  - Bundled fonts, each shown in its own face.
  - Fonts on this computer (Segoe UI, Segoe UI Variable, Satoshi, Bahnschrift, Aptos, Calibri), marked installed or not installed.
  - Fonts added by the user. **Add font…** picks the font files (all weights at once), guesses the name and weights from the file names, asks for the name, and copies the files into the app data folder.
  - Text size: 12, 13, 14 or 15 px.
- **Shape and spacing:**
  - Corners: Square, Sharp, Standard, Soft or Round, plus sliders for control and panel radius.
  - Density: Compact, Comfortable or Roomy, plus sliders for control and row height.
- **Reset to default** brings back Obsidian, Lime → Teal, Inter, Standard and Compact. Saved themes stay.

**Live changes:** everything applies as it changes. Pickers and sliders update in place without redrawing the form.

**Storage:** the current look, the active theme and the saved themes are kept in `appearance.json` in the app's data folder, outside the program, so updates keep them. Added fonts are kept in `fonts/<id>/` with a `fonts/index.json` listing the family, file, weight and style.

### Theme file (`*.theme.json`)

The same format in every app, so a theme exported from one can be imported into another.

```json
{
  "version": 1,
  "name": "My theme",
  "background": {
    "ground": "#0a0a0b", "rail": "#060607", "panel": "#111113", "raised": "#19191c", "raised2": "#232327",
    "field": "#070708", "line": "#212125", "line2": "#2e2e33", "text": "#ececee", "sec": "#a0a0a7",
    "faint": "#7d7d84", "stage": "#040405"
  },
  "states": { "ok": "#52d39a", "warn": "#f2b64c", "danger": "#f0616d" },
  "accent": { "stops": ["#b6f05a", "#2fd6b4"], "angle": 90, "onAccent": "auto" },
  "font": { "family": "Inter", "size": 13 },
  "corners": { "control": 6, "panel": 10 },
  "density": { "control": 28, "row": 24 }
}
```

The rules for reading a theme:

- Missing or invalid values fall back to the default.
- Colours are `#rgb` or `#rrggbb`.
- Accent: 1 to 4 stops, angle 0–360.
- Font size 11–16, control radius 0–16, panel radius 0–24, control height 24–44, row height 20–40.
- `onAccent` is `auto`, `dark` or `light`.

A font named in a theme that isn't available falls back to Inter. The reference code is `lib/theme.js` in waifu2x-batch.

### Carrying it to other toolkits

- **Electron (Image Seek):** reuse `lib/theme.js` and the CSS variable names as they are.
- **PySide6 (Media Toolbox, Nirvash):** build the QSS from the same tokens. Use `qlineargradient` for the accent gradient. Add custom fonts with `QFontDatabase.addApplicationFont` from the data folder.
- **WPF (Ginkgo):** put the tokens in a `ResourceDictionary` as `SolidColorBrush`es plus one `LinearGradientBrush`. Swap the dictionary to change themes. Load custom fonts with `FontFamily` pointing at the data-folder files.

## Not in this world

- Glass, blur or glows.
- Drop shadows on panels.
- Coloured side borders.
- Uppercase kicker labels above headings.
- Decorative monospace.
- Gradient text.
- Windows pop-up dialogs.
- Sideways scrolling.
- Illustrations in empty states.
- More than one primary button in a toolbar.
