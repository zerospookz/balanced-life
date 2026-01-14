
// Balanced Life v5.4.6 CLEAN NAV
// Goal: No syntax errors + all tiles/bottom-nav open panels (SPA, no reload)

(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function getAllPanels(){
    // support several conventions across versions
    const byClass = $$(".panel");
    const byIdTab = $$('[id^="tab-"]');
    const byIdPanel = $$('[id^="panel-"]');
    const byData = $$('[data-panel]');
    const all = [...new Set([...byClass, ...byIdTab, ...byIdPanel, ...byData])];
    return all;
  }

  function normalize(name){
    return String(name||"").trim().toLowerCase();
  }

  function panelFor(name){
    const n = normalize(name);
    if(!n) return null;
    // common ids
    return document.getElementById(`tab-${n}`) ||
           document.getElementById(`panel-${n}`) ||
           document.querySelector(`.panel[data-name="${n}"]`) ||
           document.querySelector(`[data-panel="${n}"]`);
  }

  function showPanel(name, opts={push:true}){
    const n = normalize(name);
    const panels = getAllPanels();

    // If no panels exist, nothing to do
    if(panels.length){
      panels.forEach(p => {
        // keep layout stable
        p.style.display = "none";
        p.setAttribute("aria-hidden","true");
      });
    }

    // Also hide any modal overlays if present
    $$(".modal,.sheet,.drawer,[data-overlay]").forEach(el => {
      el.classList.remove("open","active");
      el.style.display = "none";
    });

    // Find target
    const target = panelFor(n);

    if(target){
      target.style.display = "block";
      target.setAttribute("aria-hidden","false");
      target.scrollIntoView({block:"start", behavior:"smooth"});
    } else {
      // fallback: show home if exists
      const home = panelFor("home") || document.getElementById("tab-home") || document.querySelector(".home");
      if(home){
        home.style.display = "block";
        home.setAttribute("aria-hidden","false");
      }
    }

    // highlight bottom nav
    $$(".iosTab, .navBtn, [data-nav], [data-open]").forEach(btn => {
      const b = btn.getAttribute("data-open") || btn.getAttribute("data-nav");
      if(!b) return;
      btn.classList.toggle("active", normalize(b) === n);
      btn.setAttribute("aria-current", normalize(b)===n ? "page" : "false");
    });

    if(opts.push){
      try{
        const url = new URL(location.href);
        url.hash = n ? `#${n}` : "";
        history.pushState({panel:n}, "", url.toString());
      }catch(e){}
    }
  }

  function onClick(e){
    const el = e.target.closest("[data-open],[data-nav],a[href^='#']");
    if(!el) return;

    // If it's a normal external link, allow it
    if(el.tagName === "A"){
      const href = el.getAttribute("href") || "";
      if(href.startsWith("#")){
        e.preventDefault();
        const name = href.replace("#","") || "home";
        showPanel(name);
      }
      return;
    }

    const name = el.getAttribute("data-open") || el.getAttribute("data-nav");
    if(!name) return;

    // Do not block if some drag handle etc; but ensure click works
    e.preventDefault();
    showPanel(name);
  }

  function boot(){
    document.addEventListener("click", onClick, {capture:true});

    window.showPanel = showPanel; // expose for debug

    // initial route
    const initial = (location.hash || "").replace("#","") || "home";
    showPanel(initial, {push:false});

    window.addEventListener("popstate", (ev) => {
      const p = (ev.state && ev.state.panel) || (location.hash||"").replace("#","") || "home";
      showPanel(p, {push:false});
    });

    console.log("Balanced Life v5.4.6 CLEAN NAV ready");
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
