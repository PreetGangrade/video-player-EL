// Registers the "Interactive Overlay Mobile" component with the dc-runtime.
// Template and logic live in editable files next to this one — fetched at load
// time so the prototype can be iterated without re-bundling.
(function(){
  var NAME = "Interactive Overlay Mobile";
  var PROPS = JSON.stringify({
    "$preview": {"width": 1280, "height": 860},
    "orientation": {"editor": "enum", "options": ["portrait", "landscape"], "default": "portrait", "tsType": "string"},
    "format": {"editor": "enum", "options": ["live-dvr", "live", "vod", "linear"], "default": "live-dvr", "tsType": "string"}
  });
  var tpl = null, js = null;
  fetch('assets/mobile-template.html').then(function(r){ return r.text(); }).then(function(t){ tpl = t; go(); });
  fetch('assets/mobile-logic.js').then(function(r){ return r.text(); }).then(function(t){ js = t; go(); });
  var tries = 0;
  function go(){
    if(tpl === null || js === null) return;
    if(!window.__dcUpdate){ tries++; if(tries < 400) return setTimeout(go, 25); return; }
    try{ if(PROPS) window.__dcUpdate(NAME, "props", PROPS, false); }catch(e){}
    window.__dcUpdate(NAME, "html", tpl, false);
    window.__dcUpdate(NAME, "js", js, false);
    try{ if(window.__dcRegistry && window.__dcRegistry[NAME]) window.__dcRegistry[NAME].fetched = true; }catch(e){}
  }
})();
