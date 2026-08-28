// Liquid Glass chrome — SVG displacement refraction on the live backdrop.
// Each button gets a generated displacement map (a rounded-rect lens with an
// eased edge bevel) applied through backdrop-filter: url(#...). The browser
// compositor refracts whatever is really behind the element, including the
// playing video, at full resolution and zero per-frame cost. This is the
// technique behind the well-known web "liquid glass" demos; it needs no page
// capture, so it is immune to the staleness/pixelation issues of the
// canvas-snapshot libraries. Chromium-only (backdrop-filter: url()).
(function () {
  const SELECTOR = '.elpill, .iconctl, [data-fk="tab-info"], [data-fk="tab-next"], [data-fk="skip-now"], [data-fk="vote-cast"], [data-fk="vote-change"], .lgx';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('style', 'position:absolute; width:0; height:0; overflow:hidden;');
  svg.setAttribute('aria-hidden', 'true');
  const defs = document.createElementNS(svgNS, 'defs');
  svg.appendChild(defs);
  const styleEl = document.createElement('style');
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(svg);
    document.head.appendChild(styleEl);
  });

  styleEl.textContent = `
    [data-lgf]{ position:relative; }
    [data-lgf]::after{ content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
      background:linear-gradient(165deg, rgba(255,255,255,.20), rgba(255,255,255,0) 36%, rgba(255,255,255,0) 66%, rgba(255,255,255,.07));
      box-shadow:inset 0 1px 1px rgba(255,255,255,.34), inset 0 -1px 1px rgba(255,255,255,.08); }
  `;
  const baseCss = styleEl.textContent;
  const rules = new Map(); // shape key -> css rule text

  // Displacement map: R/G encode the sampling offset. Interior is neutral;
  // an eased bevel at the rim samples outward, which reads as a thick glass
  // edge bending the backdrop.
  function makeFilter(key, w, h, r) {
    const SS = 2; // supersample the map
    const cw = Math.max(2, Math.round(w * SS));
    const ch = Math.max(2, Math.round(h * SS));
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(cw, ch);
    const data = img.data;
    const bx = w / 2, by = h / 2;
    const rr = Math.min(r, bx, by);
    const bevel = Math.max(5, Math.min(w, h) * 0.42);

    function sdf(px, py) { // distance inside (>0) a rounded rect centred at 0
      const qx = Math.abs(px) - (bx - rr);
      const qy = Math.abs(py) - (by - rr);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const outside = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - rr;
      return -outside;
    }

    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const px = (x + 0.5) / SS - bx;
        const py = (y + 0.5) / SS - by;
        const d = sdf(px, py);
        let nx = 0, ny = 0;
        if (d < bevel) {
          const e = 0.75;
          const gx = sdf(px + e, py) - sdf(px - e, py);
          const gy = sdf(px, py + e) - sdf(px, py - e);
          const len = Math.hypot(gx, gy) || 1;
          const t = 1 - Math.max(0, Math.min(1, d / bevel));
          const mag = t * t * (3 - 2 * t); // smoothstep ease into the rim
          nx = -(gx / len) * mag; // sample outward past the edge
          ny = -(gy / len) * mag;
        }
        const i = (y * cw + x) * 4;
        data[i] = Math.round(128 + nx * 127);
        data[i + 1] = Math.round(128 + ny * 127);
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const url = canvas.toDataURL('image/png');

    const scale = Math.max(10, Math.min(38, Math.min(w, h) * 0.5));
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', key);
    filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
    filter.setAttribute('width', String(w)); filter.setAttribute('height', String(h));
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    const feImage = document.createElementNS(svgNS, 'feImage');
    feImage.setAttribute('href', url);
    feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
    feImage.setAttribute('x', '0'); feImage.setAttribute('y', '0');
    feImage.setAttribute('width', String(w)); feImage.setAttribute('height', String(h));
    feImage.setAttribute('preserveAspectRatio', 'none');
    feImage.setAttribute('result', 'map');
    const feDisp = document.createElementNS(svgNS, 'feDisplacementMap');
    feDisp.setAttribute('in', 'SourceGraphic');
    feDisp.setAttribute('in2', 'map');
    feDisp.setAttribute('scale', String(scale));
    feDisp.setAttribute('xChannelSelector', 'R');
    feDisp.setAttribute('yChannelSelector', 'G');
    filter.appendChild(feImage);
    filter.appendChild(feDisp);
    defs.appendChild(filter);

    const bf = `url(#${key}) blur(0.8px) saturate(1.55) brightness(1.05)`;
    rules.set(key, `[data-lgf="${key}"]{ -webkit-backdrop-filter:${bf} !important; backdrop-filter:${bf} !important; }`);
    styleEl.textContent = baseCss + [...rules.values()].join('\n');
  }

  let enabled = true;

  function scan() {
    if (!enabled) return;
    for (const label of ['TV stage', 'Mobile stage']) {
      const stage = document.querySelector('[data-screen-label="' + label + '"]');
      if (!stage) continue;
      stage.querySelectorAll(SELECTOR).forEach((t) => {
        if (!t.isConnected || t.offsetParent === null) return;
        const w = t.offsetWidth, h = t.offsetHeight;
        if (w < 8 || h < 8) return;
        const br = parseFloat(getComputedStyle(t).borderTopLeftRadius) || h / 2;
        const r = Math.round(Math.min(br, h / 2, w / 2));
        const key = 'lgf' + Math.round(w) + 'x' + Math.round(h) + 'r' + r;
        if (!rules.has(key)) makeFilter(key, Math.round(w), Math.round(h), r);
        if (t.getAttribute('data-lgf') !== key) t.setAttribute('data-lgf', key);
      });
    }
  }

  function setEnabled(on) {
    enabled = on;
    const btn = document.getElementById('lg-toggle');
    if (btn) btn.textContent = on ? 'On' : 'Off';
    if (!on) document.querySelectorAll('[data-lgf]').forEach((el) => el.removeAttribute('data-lgf'));
    else scan();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('#lg-toggle');
    if (btn) setEnabled(!enabled);
  });

  let last = 0;
  function tick(ts) {
    if (ts - last > 250) { last = ts; try { scan(); } catch (e) {} }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
