# S9 Cocos assets inventory

- Source: `https://super9.bet`
- Manifest exported: 2026-07-20T21:23:10.757Z
- Downloaded: 2026-07-20T22:06:35.991Z
- Games: **crash2**, **fortuneGems** (skipped aviator / crash as requested)
- Folder: `/var/www/zee9/s9-cocos-assets/`
- Preview flat copies: `_preview/crash2/`, `_preview/fortuneGems/`
- Script: `scripts/download-cocos-assets.mjs`

## Manifest note

Full JSON also had: `hall`, `resources`, `crash`, `aviator`, `luckyLottery`, `mining`, `internal` — **not** downloaded.

Only fortune pack present: **fortuneGems** (no separate fortuneOx folder in this export).

## crash2

- Files OK: **34** / fail: 0 · **~2.8 MB**
- Layout: Cocos Creator pack (`config.*.json`, `index.*.js`, `import/`, `native/`)
- Native media: 8 PNG, 2 WebP, 4 MP3
- Notable art (from visual check):
  - Large VFX atlas: fireworks, smoke, confetti, coin (win/explosion FX)
  - UI atlas: fiery animated borders + “Profit this round” neon panel
  - Wide landscape/UI panels (~1900×700–900)
  - Spine/UI pieces (rocket/character-sized frames)
- Spine-ish names in import JSON: `jiantou`, `chouma`, `you_win_more_than`, `profit_this_round`, `win_biankuang`

## fortuneGems

- Files OK: **52** / fail: 0 · **~4.9 MB**
- Native media: 22 PNG, 3 WebP, 1 JPG, 1 MP3
- Notable art (from visual check):
  - Temple / Angkor-style **slot background** (1280×720)
  - Big-win text atlas: BIG / WIN / MEGA / SUPER + golden griffin + coins
  - Multiple UI bars, gems/symbol sheets, portrait panels
  - One long BGM/sfx mp3 (~264 KB)

## How to re-run

```bash
node /var/www/zee9/scripts/download-cocos-assets.mjs
```
