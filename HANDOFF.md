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
- Overlay always opens split; INTERACTIVE SPLIT slider (40-70%, default 62%)
  controls video width, panel takes the rest, corner bug follows via CSS calc.
- Overlay tabs: Vote (current dancer vs "Lil Nova" placeholder, white
  selection, Cast vote pinned bottom, success screen), About (curated
  profile), Music (now-playing only), Participants (lineup, jump-to:
  seeking really moves the video, resumes play, and books the delta into
  behindS on Live DVR). The focused module tab is SOLID white (segF), not
  translucent. Cast vote when no dancer is picked is a true disabled state:
  dim, bordered, and NOT focusable (empty data-fk; move() skips blank fks).
  No red in interactive UI.
- Scrubber (RBUP reference, matched to mobile portrait): height slider in
  panel (CSS var --sbh). Track is glass (backdrop blur; the displacement
  lens needs >=8px so the 6px track uses plain blur). Red glowing live-edge
  marker (#FF3B30) at 65% stays put and sits ABOVE the knob, so the scrub
  head reads red at the live edge; the knob itself is white in the DVR
  buffer (VOD/linear knob stays #DB0640). Timestamps live BELOW the bar:
  Live DVR shows behind-time bottom-left only when behind (no LIVE label
  there; the LIVE badge above the title carries it), VOD elapsed/remaining,
  linear program times. Paused shows the circled pause glyph.
- Ad breaks (full): QR + video-only variants, clean text lockups.
- Ad squeezes (video keeps playing): 50/50 (exactly equal, aligned panes),
  L-shape, ad focus (small video with proper 48px gutter + 24px gap beside
  a 62% ad; left/right panel toggle), video PiP. Side panel format REMOVED
  (user call, Aug 2026). Motion is one coordinated 600ms
  cubic-bezier(.3,0,.18,1) move: the video squeezes via pure transform
  (translate+scale, GPU; radii pre-divided by scale) while the ad slides in
  from its own offscreen edge on the same curve, and everything exits back
  along the same path (sqOut state, 620ms). No staggered pop-ins; captions
  are a single delayed fade (.sqe-f). During a squeeze the ONLY on-stage
  control is a centered transient play/pause (sq-strip focus scope, wakes
  on any key, 4s auto-hide); pausing pauses the content video AND the ad,
  and holds the countdown. Dismissing an ad lives in the operator panel
  ("Dismiss active ad"), NOT in the player UI; Back only hides the strip.
  A quiet "Advertisement · Back in Ns" caption sits bottom-center on every
  layout except L-shape (removed there by request). Mobile mirrors with
  stack (ad hero, video shrinks below) + banner.
- Sound toggle in Content Format (video has audio; muted by default for
  autoplay). Works on both stages.
- Mobile: Apex Component Library player icons 1:1, People tab, full-width
  scrub bar with corner timestamps (no LIVE label at the live edge; the
  badge above carries it), red scrub knob. Panel sliders control the track
  height (`scrubh` attr, default 6px; marker and head scale with it) and
  the landscape interactive split (`lssplit` attr, 40-70%, default 62 to
  match 10ft). The volume pill collapses to a perfect circle (42/40px).
- Mobile panel AD TRIGGERS mirrors the 10ft section: split (portrait hero),
  50/50, L-shape, ad focus, video PiP, Dismiss active ad, plus an
  "AD SQUEEZE · YOUR VIDEO SITS" toggle (`sqpos` attr, 'lead'/'trail');
  its labels read Top/Bottom in portrait and Left/Right in landscape and it
  applies to split (hero above/below), 50/50 (both orientations) and
  landscape ad focus (video left/right). Landscape "split" plays the 50/50
  layout. Mobile CONTENT FORMAT has the same Sound toggle as 10ft.
- Portrait top chrome (close / PiP / AirPlay / volume) follows the player
  controls: `pChromeOn` in renderVals fades it out with them on clean
  playback and keeps it hidden through a squeeze (play/pause is the only
  control there); it stays up while a panel is open or a full ad break
  owns the screen. The phone status bar (9:41 / signal / battery) is not
  player chrome and always stays.
- Ad audio system (both stages): ad.mp4 HAS a stereo AAC track. While an ad
  trigger runs, the content audio eases down to the panel's
  "Content audio during ads" percentage (duckPct state on 10ft, `duck` attr
  on mobile; default 20%) and the ad video fades in unmuted; both ease back
  over ~600ms when the ad ends (fadeVol/syncAudio in both components).
  Everything respects the Sound toggle; unmuted autoplay rejections fall
  back to muted playback.
- Info tab placement is FINAL as-is on both orientations: portrait shows
  the open-panel tabs at the TOP of the panel (under the video, engaged
  translucent state, no chevron); landscape tabs ride up with the info
  card. Two separate "pin the tab so it can't jump" experiments were
  built and REVERTED at the user's request — do not reintroduce them.
- Portrait corner bug scales with the squeeze (34px → 31px in 50/50,
  20px in stack). Landscape maturity rating sits at top:19 so it centers
  against the corner bug line; landscape meta row sits at bottom:96,
  ~8px above the scrub track.
- Mobile portrait structure (Aug 2026 round): Jump to Live is a 36px circle
  in the TOP row — order live · wand · ellipsis — with the row width
  reserved (124px) and the title at 19px/ellipsized so nothing reflows.
  The video's top spacer is ONE animated div (.vslide, 650ms house curve:
  312px centered, 120px panel open — clearing the chrome pills, 527px
  stack squeeze, 481px 50/50), so panel opens/closes and squeezes read as
  a single coordinated move; panel content gets a quiet fade only. The
  squeezed-to-top video has NO scrub bar. Maturity rating sits ON the
  video, top-left, vertically centered against the corner bug (top 17px)
  and travels with it. Info panel: Start over + More Details sit directly
  under the meta chips; the Info tab shows an engaged translucent state
  while open (tap again to close; chevron removed). Interactive panel:
  title header (Dance Your Style + collapse chevron) first, segmented
  tabs one layer below (10ft pattern). The full ad break is a sheet at
  top:120px (padding under the chrome pills) that slides in/out
  (.adsheet + data-adout; closeAd is animated).
- Mobile ad squeezes (banner format REMOVED, user call): portrait has
  'stack' (full-bleed ad hero, video 60% below) and 'half' (two equal
  stacked 16:9 videos, 16px margins — the 50/50, centered in the FULL
  screen: slots at 215px and 428px; `sqpos` picks which one the video
  takes, and the ad slides in from whichever edge is nearer its slot). The ad is a finished
  container (no ADVERTISEMENT ribbon) that slides down from above the
  screen (transform-only, .psq-t) while the .vslide spacer moves the video
  on the same curve; exits reverse the path. Landscape mirrors ALL 10ft
  formats — 50/50, L-shape, ad focus, PiP — with the landscape video on a
  pure transform (translate+scale, lsVidTf/lsVidR bindings, radii
  pre-divided by scale) and ads sliding from their own edge (.lsq-*).
  L-shape/ad focus/PiP triggered in portrait rotate the device first
  (ensureLs). During any squeeze: quiet bottom-center
  "Advertisement · Back in Ns" caption (except L-shape) + a transient
  bottom-center play/pause (tap to reveal); pausing pauses content AND ad
  and holds the countdown. Dismissing lives in the operator panel
  ("Dismiss active ad" → mCmd 'ad-end'), not in the player UI.
- Mobile landscape chrome: meta row (title + wand/cc/audio/settings) sits
  at bottom:104px, ~16px above the scrub track. The interactive side
  panel slides in from the right (.lspanel) with the title + close button
  aligned in one header row; panel width follows the split slider.
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
