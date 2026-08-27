// Liquid Glass chrome — naughtyduk/liquidGL applied to the player buttons.
// liquidGL renders every lens on one shared fixed canvas and refracts a
// snapshot of the page, compositing <video> elements live each frame.
// The player buttons are React-managed and constantly re-render, so instead
// of glassifying them directly we keep a fixed pool of lens divs on <body>,
// bind them per-frame to whichever buttons are visible, and draw the button
// icons/labels crisply in a layer above the shared canvas.
(function () {
  const POOL = 16;
  const LENS_Z = 60;   // liquidGL adopts the lens z-index for its canvas
  const LABEL_Z = 70;  // crisp content above the glass canvas
  const TV_SELECTOR = '.elpill, .iconctl, [data-fk="tab-info"], [data-fk="tab-next"], [data-fk="skip-now"], [data-fk="vote-cast"], [data-fk="vote-change"]';
  const MOBILE_SELECTOR = '.lgx';

  const style = document.createElement('style');
  style.textContent = `
    [data-lgh="1"]{ background:transparent !important; border-color:transparent !important;
      box-shadow:none !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important;
      color:transparent !important; }
    .lgl-lens{ position:fixed; left:-9999px; top:0; width:40px; height:40px; border-radius:20px;
      pointer-events:none; z-index:${LENS_Z}; }
    #lgl-labels{ position:fixed; inset:0; pointer-events:none; z-index:${LABEL_Z}; color:#fff;
      font-family:-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
    .lg-scaler{ position:absolute; transform-origin:top left; pointer-events:none; }
    .lg-label-root{ background:transparent !important; border-color:transparent !important;
      box-shadow:none !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important;
      margin:0 !important; position:static !important; }
  `;
  document.head.appendChild(style);

  let enabled = true;
  let booted = false;
  let recaptureAt = 0;
  const slots = [];
  let labelLayer = null;

  function ensurePool() {
    labelLayer = document.createElement('div');
    labelLayer.id = 'lgl-labels';
    labelLayer.setAttribute('data-liquid-ignore', '');
    document.body.appendChild(labelLayer);
    for (let i = 0; i < POOL; i++) {
      const el = document.createElement('div');
      el.className = 'lgl-lens';
      el.setAttribute('data-liquid-ignore', '');
      document.body.appendChild(el);
      const label = document.createElement('div');
      label.className = 'lg-scaler';
      label.style.left = '-9999px';
      labelLayer.appendChild(label);
      slots.push({ el, label, target: null, sig: '', content: '' });
    }
  }

  function renderer() { return window.__liquidGLRenderer__; }

  function requestRecapture(delay) {
    recaptureAt = Math.max(recaptureAt, performance.now()) + (delay || 0);
  }

  function collectTargets() {
    const out = [];
    for (const [label, sel] of [['TV stage', TV_SELECTOR], ['Mobile stage', MOBILE_SELECTOR]]) {
      const stage = document.querySelector('[data-screen-label="' + label + '"]');
      if (!stage) continue;
      stage.querySelectorAll(sel).forEach((t) => {
        if (t.closest('.lg-scaler')) return;
        if (!t.isConnected || t.offsetParent === null) return;
        // the button itself must never be part of the refracted snapshot
        if (!t.hasAttribute('data-liquid-ignore')) t.setAttribute('data-liquid-ignore', '');
        if (t.getAttribute('data-foc') === '1') { t.removeAttribute('data-lgh'); return; }
        const r = t.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return;
        let node = t, op = 1;
        while (node && node !== stage) { op *= parseFloat(getComputedStyle(node).opacity || '1'); node = node.parentElement; }
        if (op < 0.15) { t.removeAttribute('data-lgh'); return; }
        out.push({ t, r, op });
      });
    }
    return out;
  }

  function bind() {
    const targets = enabled ? collectTargets() : [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const hit = targets[i];
      if (!hit) {
        if (slot.target) { slot.target.removeAttribute('data-lgh'); slot.target = null; slot.sig = ''; slot.content = ''; }
        if (slot.el.style.left !== '-9999px') { slot.el.style.left = '-9999px'; slot.label.style.left = '-9999px'; }
        continue;
      }
      const { t, r, op } = hit;
      slot.label.style.opacity = op.toFixed(2);
      const radius = Math.min(r.height / 2, parseFloat(getComputedStyle(t).borderTopLeftRadius) || r.height / 2);
      const sig = [r.left.toFixed(1), r.top.toFixed(1), r.width.toFixed(1), r.height.toFixed(1), radius.toFixed(1)].join('|');
      if (slot.target !== t) { slot.target = t; slot.content = ''; }
      if (t.getAttribute('data-lgh') !== '1') t.setAttribute('data-lgh', '1');
      if (slot.sig !== sig) {
        slot.sig = sig;
        slot.el.style.left = r.left.toFixed(1) + 'px';
        slot.el.style.top = r.top.toFixed(1) + 'px';
        slot.el.style.width = r.width.toFixed(1) + 'px';
        slot.el.style.height = r.height.toFixed(1) + 'px';
        slot.el.style.borderRadius = radius.toFixed(1) + 'px';
        slot.label.style.left = r.left.toFixed(1) + 'px';
        slot.label.style.top = r.top.toFixed(1) + 'px';
      }
      const contentSig = t.innerHTML;
      if (slot.content !== contentSig) {
        slot.content = contentSig;
        slot.label.innerHTML = '';
        const ow = t.offsetWidth || 1, oh = t.offsetHeight || 1;
        slot.label.style.width = ow + 'px';
        slot.label.style.height = oh + 'px';
        slot.label.style.transform = 'scale(' + (r.width / ow) + ',' + (r.height / oh) + ')';
        const clone = t.cloneNode(true);
        clone.removeAttribute('data-fk');
        clone.removeAttribute('data-lgh');
        clone.removeAttribute('data-foc');
        clone.removeAttribute('data-liquid-ignore');
        clone.classList.add('lg-label-root');
        clone.style.width = ow + 'px';
        clone.style.height = oh + 'px';
        slot.label.appendChild(clone);
      } else {
        // keep the scale in sync even when only geometry changed
        const ow = t.offsetWidth || 1, oh = t.offsetHeight || 1;
        slot.label.style.transform = 'scale(' + (r.width / ow) + ',' + (r.height / oh) + ')';
      }
    }
  }

  function boot() {
    ensurePool();
    // never bake the transient player chrome into the snapshot
    document.querySelectorAll('#ctl-transient').forEach((el) => el.setAttribute('data-liquid-ignore', ''));
    bind(); // set ignore attributes before the first snapshot
    window.liquidGL({
      target: '.lgl-lens',
      snapshot: 'body',
      resolution: 2.5,
      refraction: 0.035,
      aberration: 0.35,
      bevelDepth: 0.14,
      bevelWidth: 0.32,
      frost: 1,
      shadow: false,
      specular: true,
      reveal: 'none',
      tilt: false,
      magnify: 1.04,
    });
    // re-snapshot when the page structure changes (overlay opening, squeeze
    // layouts, device switch) so the refracted background stays truthful
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type !== 'childList') continue;
        const t = m.target;
        if (t && t.nodeType === 1 && (t.closest('#lgl-labels') || t.classList.contains('lgl-lens'))) continue;
        requestRecapture(600);
        return;
      }
    });
    mo.observe(document.body, { subtree: true, childList: true });
    booted = true;
  }

  function tick() {
    try {
      if (!booted) {
        const stage = document.querySelector('[data-screen-label="TV stage"], [data-screen-label="Mobile stage"]');
        const vid = stage && stage.querySelector('video');
        if (stage && vid && vid.readyState >= 3 && window.liquidGL) boot();
      } else {
        bind();
        const r = renderer();
        if (r && r.canvas) r.canvas.style.display = enabled ? '' : 'none';
        if (enabled && recaptureAt && performance.now() > recaptureAt && r && r.captureSnapshot) {
          recaptureAt = 0;
          r.captureSnapshot();
        }
      }
    } catch (e) { /* keep the loop alive */ }
    requestAnimationFrame(tick);
  }

  function setEnabled(on) {
    enabled = on;
    const btn = document.getElementById('lg-toggle');
    if (btn) btn.textContent = on ? 'On' : 'Off';
    if (!on) {
      document.querySelectorAll('[data-lgh="1"]').forEach((el) => el.removeAttribute('data-lgh'));
    } else {
      requestRecapture(100);
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('#lg-toggle');
    if (btn) setEnabled(!enabled);
  });

  requestAnimationFrame(tick);
})();
