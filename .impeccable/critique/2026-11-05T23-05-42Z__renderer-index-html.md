---
target: current design of Waifu2x Batch
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/claude/waifu2x-batch/renderer/index.html"
target_fingerprint: "sha256:3e8737a27bcebc5b98bc09c9adbe3389b502018b3a59658ee5ef80b8d3506c9b"
target_path: /home/claude/waifu2x-batch/renderer/index.html
timestamp: 2026-11-05T23-05-42Z
slug: renderer-index-html
---
# Critique: Waifu2x Batch renderer (renderer/index.html)

Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Progress panel only exists on its own tab; a re-run from Viewer shows plain text, install progress vanishes when leaving Setup |
| 2 | Match system / real world | 3 | waifu2x.net terms reused; Tile size and TTA unexplained |
| 3 | User control and freedom | 3 | Nothing overwritten; Cancel only on Batch |
| 4 | Consistency and standards | 1 | Top tabs, uppercase kicker labels, no icons, native alert/confirm; matches none of the suite |
| 5 | Error prevention | 2 | Upscale enabled with no engine installed; Reset app data not styled as danger |
| 6 | Recognition rather than recall | 2 | Undocumented shortcuts; version checkbox vs label click mean different things; labels truncate ("noise Mediu…") |
| 7 | Flexibility and efficiency | 2 | No range select, no filter, no keyboard re-run |
| 8 | Aesthetic and minimalist design | 2 | Permanent empty log box on Batch; Setup gaps; nested card (detector) |
| 9 | Error recovery | 2 | alert() dialogs; failures only in the log |
| 10 | Help and documentation | 2 | Good inline hints, no shortcut list |
| Total | | 21/40 | Acceptable functionally, weak on consistency |

## Design Specificity Verdict
Functional core is product-specific (live "done" badges tied to output tags, aligned compare world box, honest progress with stall warning). Visual layer is a generic Electron starter: top tab pills, default buttons, uppercase kickers, no icons, thumbnails or status bar; it does not read as part of the owner's suite.
Deterministic scan: CLI 3 findings, all false positives (cramped-padding on the image stage, marquee = indeterminate progress sweep, repeating-stripes = transparency checkerboard). Browser overlay found 2 true positives on Setup: nested-cards (#engProg inside .panel.wide) and cramped-padding (log 6px). Batch state clean.

## Suite drift
Accent: this app #6aa9ff, Media Toolbox #4a9eff, Image Seek green #3dae5f, Nirvash teal-violet gradient. Fonts: Segoe UI / Satoshi / Inter / Segoe UI Variable. Controls: ~28-30 / 28 / 30 / ~30 px. Radii: 5-6 / 5-7 / 7-10 / 8-12. Navigation: top tabs / 176-44 sidebar / 52 rail / 84 labelled rail. Shared ground across the suite: left navigation, bottom status/activity bar, outline icons, sentence-case labels; this app has none of them.

## Priority Issues
- [P1] Progress visible only on its own tab. Breaks the owner's standing rule. Fix: global 36 px status bar (job, bar, %, elapsed, time left, Stop, Log) plus log drawer, as Media Toolbox.
- [P1] No engine gating on first run. Fix: open on Engine when missing or show an install banner and disable Upscale; hand off "Engine ready, choose a folder".
- [P1] Look and navigation outside the suite. Fix: suite shell (left navigation, one-line header, toolbar, results, status bar), suite tokens, outline icons, no kickers, in-app dialogs.
- [P2] Version list ambiguity: truncated labels, hidden checkbox-vs-click meaning, "1 versions". Fix: two-line rows, explicit eye toggle for side-by-side, current row highlighted.
- [P2] Large batches: names only. Fix: thumbnails, shift-click ranges, Not done / Done / All filter.

## Persona Red Flags
Power user: focus stays in re-run selects so arrows/Space are swallowed; no range select or search; re-run cannot be cancelled from Viewer; pan is right-drag here but left-drag in Image Seek.
First-run user: lands on Batch with no warning the engine is missing; install progress hides on tab switch; no handoff after install; Viewer empty state is a bare checkerboard.

## Minor Observations
Hold badge orange collides with warning colour; "Hold: original" label shown while upscaled is visible; re-run form shares saved settings with Batch; "Upscale this image" enabled with no image; 300 px right column squeezes the stage at 1280.

## Questions to Consider
Should Batch and Compare be one screen? Should the suite settle one accent and navigation before a fourth app adds drift? Should a small preview at 2-3 settings come before batching?
