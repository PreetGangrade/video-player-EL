# Handoff — Red Bull TV Player Prototype (v2)

Context file for continuing work in a fresh session. Read this plus
PRODUCT.md and you have everything the previous sessions knew.

## What this is

Interactive prototype of the Red Bull TV player (10-foot TV + mobile),
playing the Dance Your Style USA Qualifier best-moments video. Built to
demo Ease Live interactive graphics entry points, maturity-rating timing,
ad squeeze-back formats, and remote/touch interaction to stakeholders.

- Repo: `~/Documents/video-player-EL` → github.com/PreetGangrade/video-player-EL
- Published: https://preetgangrade.github.io/video-player-EL/ (GitHub Pages, main branch)
- `index.html` = v2 (current). `v1.html` = the original Rally TV prototype,
  kept intact; a deliberately low-contrast "v1" link sits at the very
  bottom of the control panel.

## Run locally

- Dev server: `python3 dev-server.py 8899` (repo root; sends
  Cache-Control: no-store so plain reload always picks up edits).
  There is a launch.json entry named `video-player-el` in
  `~/.claude/launch.json` for the Claude browser preview.
- Chromium only (the glass uses `backdrop-filter: url(#svg-filter)`).

## Architecture

- `index.html` — the whole 10-foot app: helmet CSS, TV stage markup, the
  operator control panel, and one big `<script type="text/x-dc">` class
  (`Component extends DCLogic`) with all TV logic. Rendered by
  `assets/dc-runtime.js` (a React-based design-canvas runtime; pulls React
  from unpkg, so internet is required). Template bindings are `{{ name }}`,
  conditionals `<sc-if value="{{ x }}">`, lists `<sc-for list="{{ xs }}" as="y">`.
- `assets/mobile.js` — loader that fetches `assets/mobile-template.html` +
  `assets/mobile-logic.js` (cache-busted) and registers the
  "Interactive Overlay Mobile" component used by the Mobile stage.
- `assets/glass-chrome.js` — liquid glass. Generates a rounded-rect
  displacement map per button shape and applies it via
  `backdrop-filter: url(#lgf...)`; compositor refracts the live backdrop
  (video included) with zero per-frame JS. Selector list at the top
  controls which elements get glass. Panel has an On/Off toggle.
- Editing rule: the dc runtime re-renders constantly; external JS must
  bind by selector/attribute (data-*), never hold node references, and
  never inject children into React-managed elements.

## Assets

- `assets/feature.mp4` — 1280x720 ~83MB H.264 re-encode (made with
  AVAssetWriter, 1.8Mbps) committed so GitHub Pages can serve it.
- `assets/feature-original.mp4` — the full 187MB 1080p source, gitignored,
  local only. Swap the filenames if full quality is needed locally.
- `assets/fonts/BullText-{Regular,Medium}.woff2` — brand type. @font-face
  maps Medium to weights 500-900 so nothing ever renders bold.
- `assets/corner-rbtv.png` — white RBTV corner bug (44px on the full
  stage; CSS-scaled in split/squeeze modes).
- `assets/redbull.png` — legacy 1920x1080 bull watermark, edge-cropped
  artwork; intentionally no longer used in visible UI (looks broken at
  card sizes). Sponsor lockups are text-only.
- `assets/ad.mp4` — Red Bull commercial used by all ad demos.

## Design decisions so far (chronological-ish)

- Rebrand from Rally TV to Red Bull TV; splash video removed, RBTV splash
  art is the poster; titles are Dance Your Style USA Qualifier.
- Type: Bull Text, no bold anywhere. TV scale 32/24/19/15/16-tabular/11.
- Maturity rating follows the sp-specs timing model (show once per
  playback keyed to first controls dismiss, ~5s hold, re-armed on format
  change/start-over; never overlaps controls). Demo trigger in panel.
- Ease Live entry: two options only — single Interactive button (wand)
  and three configurable buttons (icon dropdown + label in panel; all
  open the same experience). Wake focus is always the scrubber; when
  behind live, Jump to Live is first in the row and takes wake focus.
- Overlay always opens split; INTERACTIVE SPLIT slider (40-70%) controls
  video width, panel takes the rest, corner bug follows via CSS calc.
- Overlay tabs: Vote (current dancer vs "Lil Nova" placeholder, white
  selection, Cast vote pinned bottom, success screen), About (curated
  profile), Music (now-playing only), Participants (lineup, jump-to).
  No red in interactive UI; violet #8B5CF6 is the player accent.
- Scrubber (RBUP reference): height slider in panel (CSS var --sbh),
  timestamps live BELOW the bar (Live DVR: left shows behind-time only
  when paused; VOD: elapsed/remaining; linear: program times), violet
  live-edge marker stays put, red (#DB0640) tick playhead appears only
  when behind live, behind-time follows the playhead, paused shows
  corner timestamp + circled pause glyph and controls stay up.
- Ad breaks (full): QR + video-only variants, clean text lockups.
- Ad squeezes (video keeps playing): 50/50, side panel, L-shape,
  ad focus (video flush to left OR right edge — panel toggle; plain
  black bg per ServusTV reference), video PiP. 48px gutters / 24px gaps,
  600ms cubic-bezier(.3,0,.18,1) video move with staggered content
  entrances (.sq-1/.sq-2/.sq-3), countdown + X dismiss chip on every
  layout, OK/Back also dismiss. Mobile mirrors with stack (ad hero,
  video shrinks below) + banner.
- Sound toggle in Content Format (video has audio; muted by default for
  autoplay). Works on both stages.
- Mobile: Apex Component Library player icons 1:1, collapse chevron on
  the portrait interactive panel, People tab, full-width scrub bar with
  corner timestamps, red scrub knob.
- Dancer segments hardcoded in both logic files (SEGMENTS): 00:00 Jesse
  Sykes, 00:58 Harini, 01:59 Jabari, 02:58 Vik White, 03:59 Rylee
  Prodigy, 04:59 Jesse Sykes. Vote resets when the segment changes.

## Known quirks

- Paused <video> can flash black in Chrome when its box is re-laid-out;
  resumes on play. Not a logic bug.
- The raw `<x-dc>` template throws harmless console errors for
  `{{ b.d }}` SVG path bindings before hydration.
- The 5s controls auto-hide races screenshot verification; pin with
  `#ctl-transient[data-vis="0"]{opacity:1 !important}` while testing.
- Glass is Chromium-only; the toggle exists partly for comparison.

## Open items

- The user reviews mobile in rounds; expect more mobile edits.
- "Lil Nova" is an invented opponent placeholder; real battle data TBD.
- Ad-focus/PiP layouts are explicitly "not final design" territory;
  expect more reference screenshots.
- v1.html is untouched by design; never edit it.
