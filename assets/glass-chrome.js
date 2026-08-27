// Liquid Glass chrome — applies the ybouane/liquidglass WebGL effect to the
// player buttons on both stages. The library requires glass elements to be
// direct children of its root, so a pool of proxy panels is kept as direct
// children of each stage and bound per-frame to whichever buttons are visible.
// The real buttons keep their content and interactivity; only their painted
// chrome (background / border / blur) is suppressed while a proxy covers them.
import { LiquidGlass } from './liquidglass.js';

const SLOTS_PER_STAGE = 14;
const TV_SELECTOR = '.elpill, .iconctl, [data-fk="tab-info"], [data-fk="tab-next"], [data-fk="skip-now"], [data-fk="vote-cast"], [data-fk="vote-change"]';
const MOBILE_SELECTOR = '.lgx';

const style = document.createElement('style');
style.textContent = `
  [data-lgh="1"]{ background:transparent !important; border-color:transparent !important;
    box-shadow:none !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important;
    color:transparent !important; }
  .lg-proxy{ position:absolute; pointer-events:none; z-index:49; }
  .lg-proxy > canvas{ border-radius:inherit; }
  .lg-scaler{ position:absolute; left:0; top:0; transform-origin:top left; z-index:2; pointer-events:none; }
  .lg-label-root{ background:transparent !important; border-color:transparent !important;
    box-shadow:none !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important;
    margin:0 !important; position:static !important; }
`;
document.head.appendChild(style);

let enabled = true;
const stages = [
  { label: 'TV stage', selector: TV_SELECTOR, inst: null, root: null, slots: [], initing: false },
  { label: 'Mobile stage', selector: MOBILE_SELECTOR, inst: null, root: null, slots: [], initing: false },
];

function clearStage(st) {
  if (st.mo) { try { st.mo.disconnect(); } catch (e) {} }
  st.mo = null;
  if (st.inst) { try { st.inst.destroy(); } catch (e) {} }
  st.inst = null;
  for (const slot of st.slots) { try { slot.el.remove(); } catch (e) {} }
  st.slots = [];
  st.root = null;
}

function unhideAll() {
  document.querySelectorAll('[data-lgh="1"]').forEach((el) => el.removeAttribute('data-lgh'));
}

async function initStage(st, root) {
  st.initing = true;
  st.root = root;
  if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
  st.slots = [];
  for (let i = 0; i < SLOTS_PER_STAGE; i++) {
    const el = document.createElement('div');
    el.className = 'lg-proxy';
    el.style.cssText = 'left:-9999px; top:0; width:40px; height:40px; border-radius:20px;';
    el.dataset.config = JSON.stringify({ cornerRadius: 20 });
    root.appendChild(el);
    st.slots.push({ el, target: null, sig: '' });
  }
  try {
    st.inst = await LiquidGlass.init({
      root,
      glassElements: st.slots.map((s) => s.el),
      defaults: {
        refraction: 0.42,
        blurAmount: 0.14,
        chromAberration: 0.04,
        edgeHighlight: 0.09,
        specular: 0.12,
        fresnel: 0.8,
        shadowOpacity: 0.22,
        shadowSpread: 7,
        zRadius: 16,
      },
    });
  } catch (e) {
    console.warn('[glass] init failed', e);
    clearStage(st);
    st.initing = false;
    return;
  }
  // The library caches static wrapper captures forever; the player chrome
  // mutates constantly, so flag a re-capture (throttled in tick) whenever the
  // stage content changes outside our own proxy elements.
  st.dirty = true;
  st.lastCap = 0;
  st.mo = new MutationObserver((muts) => {
    for (const m of muts) {
      const t = m.target;
      if (t && t.nodeType === 1 && t.closest && t.closest('.lg-proxy')) continue;
      if (t && t.nodeType === 3 && t.parentElement && t.parentElement.closest('.lg-proxy')) continue;
      st.dirty = true;
      return;
    }
  });
  st.mo.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
  st.initing = false;
}

function tick() {
  if (enabled) {
    try { tickStages(); } catch (e) { /* keep the loop alive */ }
  }
  requestAnimationFrame(tick);
}

function tickStages() {
  {
    for (const st of stages) {
      const root = document.querySelector('[data-screen-label="' + st.label + '"]');
      if (st.root && (st.root !== root || !st.root.isConnected)) clearStage(st);
      if (!st.root && root && !st.initing) initStage(st, root);
      if (!st.inst || !st.root) continue;

      const now = performance.now();
      if (st.dirty && now - st.lastCap > 250) {
        st.dirty = false;
        st.lastCap = now;
        try { st.inst.markChanged(); } catch (e) {}
      }

      const rootRect = st.root.getBoundingClientRect();
      const targets = [];
      st.root.querySelectorAll(st.selector).forEach((t) => {
        if (t.closest('.lg-proxy')) return;
        if (t.getAttribute('data-foc') === '1') { t.removeAttribute('data-lgh'); return; }
        if (!t.isConnected || t.offsetParent === null) return;
        const r = t.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return;
        // skip elements that are fully transparent (faded-out control chrome)
        let node = t, op = 1;
        while (node && node !== st.root) { op *= parseFloat(getComputedStyle(node).opacity || '1'); node = node.parentElement; }
        if (op < 0.15) { t.removeAttribute('data-lgh'); return; }
        targets.push({ t, r });
      });

      for (let i = 0; i < st.slots.length; i++) {
        const slot = st.slots[i];
        const hit = targets[i];
        if (!hit) {
          if (slot.target) { slot.target.removeAttribute('data-lgh'); slot.target = null; slot.sig = ''; }
          if (slot.el.style.left !== '-9999px') { slot.el.style.left = '-9999px'; st.inst.markChanged(slot.el); }
          continue;
        }
        const { t, r } = hit;
        const left = (r.left - rootRect.left).toFixed(1) + 'px';
        const top = (r.top - rootRect.top).toFixed(1) + 'px';
        const w = r.width.toFixed(1) + 'px';
        const h = r.height.toFixed(1) + 'px';
        const radius = Math.round(Math.min(r.height / 2, parseFloat(getComputedStyle(t).borderTopLeftRadius) || r.height / 2));
        const sig = left + '|' + top + '|' + w + '|' + h + '|' + radius;
        if (slot.target !== t) { slot.target = t; slot.content = ''; }
        if (t.getAttribute('data-lgh') !== '1') t.setAttribute('data-lgh', '1');
        if (slot.sig !== sig) {
          slot.sig = sig;
          slot.el.style.left = left;
          slot.el.style.top = top;
          slot.el.style.width = w;
          slot.el.style.height = h;
          slot.el.style.borderRadius = radius + 'px';
          slot.el.dataset.config = JSON.stringify({ cornerRadius: radius, zRadius: Math.min(16, Math.round(r.height / 3)) });
          slot.content = '';
          st.inst.markChanged(slot.el);
        }
        // crisp label: clone of the target's content above the glass canvas,
        // scaled from the target's unscaled box to the proxy's on-screen size
        const contentSig = t.innerHTML;
        if (slot.content !== contentSig) {
          slot.content = contentSig;
          const old = slot.el.querySelector('.lg-scaler');
          if (old) old.remove();
          const scaler = document.createElement('div');
          scaler.className = 'lg-scaler';
          const ow = t.offsetWidth || 1, oh = t.offsetHeight || 1;
          scaler.style.width = ow + 'px';
          scaler.style.height = oh + 'px';
          scaler.style.transform = 'scale(' + (r.width / ow) + ',' + (r.height / oh) + ')';
          const label = t.cloneNode(true);
          label.removeAttribute('data-fk');
          label.removeAttribute('data-lgh');
          label.removeAttribute('data-foc');
          label.classList.add('lg-label-root');
          label.style.width = ow + 'px';
          label.style.height = oh + 'px';
          scaler.appendChild(label);
          slot.el.appendChild(scaler);
        }
      }
    }
  }
}

function setEnabled(on) {
  enabled = on;
  const btn = document.getElementById('lg-toggle');
  if (btn) btn.textContent = on ? 'On' : 'Off';
  if (!on) {
    for (const st of stages) clearStage(st);
    unhideAll();
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target && e.target.closest && e.target.closest('#lg-toggle');
  if (btn) setEnabled(!enabled);
});

requestAnimationFrame(tick);
