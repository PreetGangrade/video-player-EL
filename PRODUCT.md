# Red Bull TV Player Prototype (v2)

## What this is

An interactive design prototype of the Red Bull TV video player used to explore
and demo player behavior with stakeholders: Ease Live interactive graphics
entry points, maturity-rating timing, ad squeeze-back formats, and 10-foot
focus/remote interaction. It plays a real Dance Your Style USA Qualifier video.
Not production code; it exists to make design decisions reviewable.

- **Register**: product (design serves the player UX; the chrome must feel
  native to a TV/mobile streaming app, never like a website).
- **Surfaces**: 10-foot TV stage (1280x720 design space, D-pad driven) and a
  mobile device frame (390x844 portrait / 844x390 landscape, touch driven).
  A control panel on the right is meta-tooling for the demo operator.
- **Audience**: Red Bull streaming-platform designers, PMs and engineers.

## Design system notes

- Type: Bull Text (Regular 400, Medium 500). Nothing renders bolder than
  Medium, ever. TV scale: 32 title / 24 overlay title / 19 module head /
  15 body / 16 tabular timestamps / 11 caps micro-labels.
- Color: black player stage on a #15151b workspace (subtle radial lift
  behind the TV so the player frame reads as a container), white type,
  translucent white glass chrome. Live edge / scrub head: red (#FF3B30
  marker with glow; knob white in the DVR buffer, #DB0640 on VOD),
  matching the mobile player. No em dashes in user-facing copy.
- Chrome: liquid-glass buttons via SVG displacement backdrop-filters plus a
  gloss rim; solid white is the focused state on 10-foot.
- Spacing (10-foot): 48px stage gutter (matches control rows), 24px gap
  between major regions, 12px between sibling controls.
- Motion: single committed ease per transition, ease-out expo-like curves
  (cubic-bezier(.3, 0, .18, 1)), 500-650ms for stage-level layout moves,
  a single quiet delayed fade for meta that follows them. Squeeze layouts
  move as ONE coordinated 600ms change: the video squeezes via pure
  transform (translate+scale, compositor-only) while the ad slides in from
  its own offscreen edge on the same curve, and exits along the same path.

## Constraints

- Runs locally via dev-server.py (no-store) on port 8899; Chromium only.
- The dc-runtime re-renders constantly; anything outside React must bind by
  selector/attribute, never by held node references.
- assets/feature.mp4 is gitignored (187MB); prototype needs it locally.
