
// ===== V541_CLICK_DELEGATION (fix: tiles/buttons not clickable when rendered dynamically) =====
(function(){
  function openPanel(name){
    if(!name) return;
    if(typeof window.showPanel === "function"){
      window.showPanel(name);
    }else{
      window.__pendingOpen = name;
      // try again soon
      setTimeout(()=>{ if(typeof window.showPanel==="function" && window.__pendingOpen){ window.showPanel(window.__pendingOpen); window.__pendingOpen=null; } }, 50);
    }
  }

  // Delegate ALL clicks for elements with data-open (tiles, pills, buttons)
  document.addEventListener("click", function(ev){
    const el = ev.target.closest && ev.target.closest("[data-open]");
    if(!el) return;
    const target = el.getAttribute("data-open");
    if(!target) return;
    ev.preventDefault();
    ev.stopPropagation();
    openPanel(target);
  }, true);

  // Delegate "reorder" button (supports id or data-action)
  document.addEventListener("click", function(ev){
    const btn = ev.target.closest && ev.target.closest("#reorderBtn,[data-action='reorder']");
    if(!btn) return;
    // do not block if JS below owns it; just ensure it fires even if dynamically injected
    if(typeof window.toggleReorderMode === "function"){
      ev.preventDefault();
      ev.stopPropagation();
      window.toggleReorderMode();
    }
  }, true);
})();

(() => {
  const LS_KEY = "balanced_life_v1";
  const LEGACY_KEYS = ["calis_progress_v1", "calis_progress"];
  const TILES_KEY = "balanced_life_tiles_order";
  const DAYS_BG = ["Понеделник","Вторник","Сряда","Четвъртък","Петък","Събота","Неделя"];

  const WEEKLY_PLAN_FULL = [
    { day:"Понеделник", focus:"Push + Planche (тежко) + Handstand",
      items:[
        "Handstand: Chest-to-wall 5×30–45 сек + 6–10 kick-up опита",
        "Planche: 6–10×6–12 сек (tuck/frog) + leans 3×20 сек",
        "Bench press ИЛИ Weighted dips 4×4–6",
        "Overhead press 3×5–8",
        "Pseudo planche push-ups 4×6–10",
        "Lateral raise 3×12–20",
        "Hollow hold 4×20–40 сек"
      ],
      note:"RPE 7–8, без разпад на форма"
    },
    { day:"Вторник", focus:"Pull (тежко) + Flag + Набирания",
      items:[
        "Flag: 6–10×5–10 сек (tuck/ластик)",
        "Flag negatives: 4×3–6 сек",
        "Weighted pull-ups 5×3–5",
        "Chin-ups 3×6–10",
        "Row 4×6–10",
        "Lat pulldown 3×10–15",
        "Face pulls + external rotations 3×15–20",
        "Side plank/Copenhagen 4×20–40 сек/страна"
      ],
      note:"Фокус: стабилни рамене"
    },
    { day:"Сряда", focus:"Крака (фитнес) + Core + лека стойка",
      items:[
        "Handstand: scap shrugs 3×10 + 3–5 леки опита",
        "Squat 4×3–6",
        "RDL 4×6–8",
        "Bulgarian split squat 3×8–12/крак",
        "Leg curl или Nordic 3×8–12",
        "Calves 4×10–20",
        "Ab wheel или hanging knee raises 4×8–15"
      ],
      note:"Не до отказ"
    },
    { day:"Четвъртък", focus:"Кондиция: Бокс + Въже + Мобилност",
      items:[
        "Въже 12×(40/40)",
        "Бокс 8–12 рунда × 2–3 мин",
        "Прехаб: scap push-ups 2×10, wrist rocks 2×10, external rotations 3×15–20"
      ],
      note:"Умерено темпо, техника"
    },
    { day:"Петък", focus:"Upper (обем/умение) + Planche + Pull-up вариации",
      items:[
        "Handstand: 6–10 опита × 10–25 сек + wall line 2×30 сек",
        "Planche: holds 6–8×6–12 сек + leans 3×20 сек",
        "Flag: 4–6 леки опита × 5–8 сек (само чисто)",
        "Explosive pull-ups / chest-to-bar 6×2–4",
        "Archer/Typewriter 4×3–6/страна",
        "Incline DB press 4×8–12",
        "Seated cable row 3×10–15",
        "Curls 3×10–15",
        "Triceps pushdown 3×10–15",
        "Farmer/Suitcase carry 6×20–40 м"
      ],
      note:"Пази свежест за уикенда"
    },
    { day:"Събота", focus:"Футбол + кратък Skill/прехаб (леко)",
      items:[
        "Футбол",
        "Handstand: 8–12 мин лесни опита (или стена)",
        "Planche: leans 3×15–25 сек + PPPU 3×8 (леки)",
        "Flag: 1–3 опита × 5–8 сек (само ако си свеж)",
        "Face pulls 2×20 + External rotations 2×20",
        "Разтягане 5–10 мин"
      ],
      note:"Ако мачът е тежък → само мобилност"
    },
    { day:"Неделя", focus:"Футбол + възстановяване",
      items:[
        "Футбол",
        "Zone 2 20–40 мин (по желание)",
        "Мобилност 10–15 мин (прасци/бедра/таз/гръб/рамене)"
      ],
      note:"Цел: възстановяване"
    }
  ];

  const $ = (id) => document.getElementById(id);

  function migrateLegacy() {
    try {
      if (localStorage.getItem(LS_KEY)) return;
      for (const k of LEGACY_KEYS) {
        const raw = localStorage.getItem(k);
        if (raw) { localStorage.setItem(LS_KEY, raw); return; }
      }
    } catch {}
  }

  function todayISO() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  }
  function dayNameFromISO(iso) {
    const d = new Date(iso + "T00:00:00");
    const idx = (d.getDay() + 6) % 7;
    return DAYS_BG[idx];
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { entries: [] };
      const parsed = JSON.parse(raw);
      if (!parsed.entries) parsed.entries = [];
      return parsed;
    } catch {
      return { entries: [] };
    }
  }
  function saveState(state) { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

  function numOrNull(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function fmt(x) { return (x===null || x===undefined || x==="") ? "—" : String(x); }
  function entryKey(e) { return `${e.date}|${e.createdAt}`; }
  function normalize(s){ return (s||"").toString().toLowerCase(); }

  // Panels
  const panelIds = ["home","log","plan","charts","settings","finance","calendar","nutrition"];
  const panels = Object.fromEntries(panelIds.map(k => [k, $("tab-"+k)]));
  let activePanel = "home";

  function showPanel(name) {
    if (name === activePanel) return;
    const next = panels[name];
    const prev = panels[activePanel];
    if (!next) return;

    if (prev) prev.classList.remove("active");
    next.classList.add("active");
    activePanel = name;

    if (name === "charts") renderCharts();
    if (name === "plan") renderPlanPage();
    if (name === "home") initDashboard();
    if (name === "nutrition") renderNutrition();
    if (name === "finance") renderFinance();
    if (name === "calendar") { renderCalendar(); scheduleAllReminders(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  ["backHome1","backHome2","backHome3","backHome4","backHome5","backHome6","backHome7"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("click", () => showPanel("home"));
  });

  // ---- Tiles (Variant A) — FIXED: placeholder-based drag (no overlap) ----
  const DEFAULT_TILES = [
    { id:"log", icon:"📊", name:"Прогрес", desc:"Записвай резултати и стойности" },
    { id:"plan", icon:"🏋️", name:"Тренировки", desc:"Пълният 7-дневен план" },
    { id:"charts", icon:"📈", name:"PR/Графики", desc:"Прогрес във времето" },
    { id:"finance", icon:"💰", name:"Финанси", desc:"Разходи, приходи и цели" },
    { id:"calendar", icon:"🗓️", name:"Календар", desc:"Събития и напомняния" },
    { id:"settings", icon:"⚙️", name:"Настройки", desc:"Експорт/импорт/нулиране" },
  ];

  // v5.4.2: expose navigation helpers for global click delegation (Chrome/iOS reliability)
  try { window.showPanel = showPanel; } catch(e){}

  function loadTileOrder() {
    try {
      const raw = localStorage.getItem(TILES_KEY);
      if (!raw) return DEFAULT_TILES.map(t => t.id);
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_TILES.map(t => t.id);
      const valid = arr.filter(x => DEFAULT_TILES.some(t => t.id === x));
      const missing = DEFAULT_TILES.map(t => t.id).filter(x => !valid.includes(x));
      return [...valid, ...missing];
    } catch {
      return DEFAULT_TILES.map(t => t.id);
    }
  }
  function saveTileOrder(order) { try { localStorage.setItem(TILES_KEY, JSON.stringify(order)); } catch {} }

  let tileOrder = loadTileOrder();
  let editMode = false;
  const tileEls = new Map();

  function ensureTiles() {
    const grid = $("tilesGrid");
    if (!grid) return;
    DEFAULT_TILES.forEach(t => {
      if (tileEls.has(t.id)) return;
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.tileId = t.id;
      tile.innerHTML = `
        <div class="handle">⠿</div>
        <div class="ticon">${t.icon}</div>
        <div class="tname">${t.name}</div>
        <div class="tdesc">${t.desc}</div>
      `;
      tile.addEventListener("click", () => {
        if (editMode) return;
        showPanel(t.id);
      });
      tileEls.set(t.id, tile);
    });
  }

  function renderTilesToGrid(order) {
    const grid = $("tilesGrid");
    ensureTiles();
    order.forEach(id => {
      const el = tileEls.get(id);
      if (el) grid.appendChild(el);
    });
  }

  // FLIP helper for smoother reorder
  function flip(elements, applyChanges) {
    const first = new Map();
    elements.forEach(el => first.set(el, el.getBoundingClientRect()));
    applyChanges();
    elements.forEach(el => {
      const f = first.get(el);
      const l = el.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (dx || dy) {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.transition = "transform 0s";
        requestAnimationFrame(() => {
          el.style.transition = "transform 240ms cubic-bezier(.2,.95,.2,1)";
          el.style.transform = "";
        });
      }
    });
  }

  let drag = null;

  function cleanupDrag() {
    if (!drag) { document.body.classList.remove("draggingTiles"); return; }
    if (drag.raf) cancelAnimationFrame(drag.raf);
    drag.raf = null;

    try { drag.tile.releasePointerCapture(drag.pointerId); } catch {}

    // put tile back into grid at placeholder position
    const grid = $("tilesGrid");
    if (drag.placeholder && drag.placeholder.parentNode) {
      flip(Array.from(grid.children).filter(x => x !== drag.tile), () => {
        drag.placeholder.replaceWith(drag.tile);
      });
    }

    drag.tile.classList.remove("draggingFixed");
    drag.tile.style.position = "";
    drag.tile.style.left = "";
    drag.tile.style.top = "";
    drag.tile.style.width = "";
    drag.tile.style.height = "";
    drag.tile.style.zIndex = "";
    drag.tile.style.pointerEvents = "";
    drag.tile.style.transform = "";

    if (drag.placeholder && drag.placeholder.parentNode) {
      drag.placeholder.remove();
    }

    drag = null;
    document.body.classList.remove("draggingTiles");

    // update order from DOM
    tileOrder = Array.from($("tilesGrid").children)
      .map(el => el.dataset.tileId)
      .filter(Boolean);
    saveTileOrder(tileOrder);
  }

  function setEditMode(on) {
    if (!on) cleanupDrag(); // IMPORTANT: stop any stuck drag when leaving edit mode
    editMode = on;
    document.body.classList.toggle("editMode", editMode);
    $("editHint").style.display = editMode ? "block" : "none";
    $("editTilesBtn").textContent = editMode ? "Готово" : "Подреди";
  }

  function attachDragHandlers() {
    const grid = $("tilesGrid");
    const tiles = tileOrder.map(id => tileEls.get(id)).filter(Boolean);

    tiles.forEach(tile => {
      tile.onpointerdown = (ev) => {
        if (!editMode) return;
        if (drag) cleanupDrag();

        tile.setPointerCapture(ev.pointerId);

        const rect = tile.getBoundingClientRect();
        const placeholder = document.createElement("div");
        placeholder.className = "tile placeholder";
        placeholder.style.height = rect.height + "px";
        placeholder.style.minHeight = rect.height + "px";

        // move tile to body as fixed and leave placeholder in grid
        flip(Array.from(grid.children).filter(x => x !== tile), () => {
          tile.replaceWith(placeholder);
        });

        document.body.appendChild(tile);
        tile.classList.add("draggingFixed");
        tile.style.position = "fixed";
        tile.style.left = "0px";
        tile.style.top = "0px";
        tile.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(1.02)`;
        tile.style.width = rect.width + "px";
        tile.style.height = rect.height + "px";
        tile.style.zIndex = "9999";
        tile.style.pointerEvents = "none"; // avoid elementFromPoint hitting the dragged tile

        document.body.classList.add("draggingTiles");

        drag = {
          tile,
          placeholder,
          pointerId: ev.pointerId,
          offsetX: ev.clientX - rect.left,
          offsetY: ev.clientY - rect.top,
          tx: rect.left,
          ty: rect.top,
          x: rect.left,
          y: rect.top,
          raf: null,
        };

        const step = () => {
          if (!drag) return;
          const ease = 0.28; // smooth follow
          drag.x += (drag.tx - drag.x) * ease;
          drag.y += (drag.ty - drag.y) * ease;
          drag.tile.style.transform = `translate3d(${drag.x}px, ${drag.y}px, 0) scale(1.02)`;
          drag.raf = requestAnimationFrame(step);
        };
        drag.raf = requestAnimationFrame(step);

        ev.preventDefault();
      };

      tile.onpointermove = (ev) => {
        if (!drag || drag.pointerId !== ev.pointerId) return;

        drag.tx = ev.clientX - drag.offsetX;
        drag.ty = ev.clientY - drag.offsetY;

        const grid = $("tilesGrid");
        const children = Array.from(grid.children).filter(el => el !== drag.placeholder);
        if (children.length === 0) return;

        const px = ev.clientX;
        const py = ev.clientY;

        // compute insertion index by closest center
        let bestIdx = 0;
        let bestDist = Infinity;
        children.forEach((el, idx) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width/2;
          const cy = r.top + r.height/2;
          const dist = (cx - px)**2 + (cy - py)**2;
          if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
        });

        const targetEl = children[bestIdx];
        const tr = targetEl.getBoundingClientRect();

        // before/after rule
        const after = (py > tr.top + tr.height/2) || (px > tr.left + tr.width/2);
        const insertBefore = after ? targetEl.nextSibling : targetEl;

        // only move placeholder if needed
        if (insertBefore !== drag.placeholder && insertBefore !== drag.placeholder.nextSibling) {
          const elsForFlip = Array.from(grid.children);
          flip(elsForFlip, () => {
            grid.insertBefore(drag.placeholder, insertBefore);
          });
        }

        ev.preventDefault();
      };
    });
  }

  // Global cleanup (fix iOS Safari stuck drag / overlaps)
  window.addEventListener("pointerup", () => cleanupDrag(), { capture: true });
  window.addEventListener("pointercancel", () => cleanupDrag(), { capture: true });
  window.addEventListener("blur", () => cleanupDrag());
  document.addEventListener("visibilitychange", () => { if (document.hidden) cleanupDrag(); });

  $("editTilesBtn").addEventListener("click", () => setEditMode(!editMode));

  function renderTiles() {
    // ULTRA SAFE: tiles are rendered in HTML (Safari-safe). Only bind click handlers.
    var grid = $("tilesGrid");
    if (!grid) return;
    var tiles = grid.querySelectorAll("[data-open]");
    for (var i=0;i<tiles.length;i++){
      (function(el){
        el.addEventListener("click", function(){
          var target = el.getAttribute("data-open");
          if (target) showPanel(target);
        });
      })(tiles[i]);
    }
  }

  // ---- Log + Plan (same as before) ----
  migrateLegacy();
  const state = loadState();

  const dateEl = $("date");
  const dayPlanEl = $("dayPlan");
  DAYS_BG.forEach(d => {
    const o = document.createElement("option");
    o.value = d; o.textContent = d;
    dayPlanEl.appendChild(o);
  });

  let planInputs = [];
  function renderPlanFields(dayName) {
    const day = WEEKLY_PLAN_FULL.find(x => x.day === dayName);
    const items = day?.items || [];
    const root = $("planFields");
    root.innerHTML = "";
    planInputs = [];

    if (!items.length) {
      const div = document.createElement("div");
      div.className = "muted";
      div.textContent = "Няма упражнения за този ден.";
      root.appendChild(div);
      return;
    }

    items.forEach((name, i) => {
      const row = document.createElement("div");
      row.className = "planRow";

      const label = document.createElement("div");
      label.className = "name";
      label.textContent = `${i+1}. ${name}`;
      row.appendChild(label);

      const input = document.createElement("input");
      input.className = "input";
      input.placeholder = "стойност (напр. 4×6@60kg или best 20s)";
      input.autocomplete = "off";
      input.spellcheck = false;
      row.appendChild(input);

      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "btn small";
      clear.textContent = "⟲";
      clear.addEventListener("click", () => input.value = "");
      row.appendChild(clear);

      root.appendChild(row);
      planInputs.push({ name, input });
    });
  }

  function renderDay(dayName) {
    const d = WEEKLY_PLAN_FULL.find(x => x.day === dayName);
    $("dayHint").textContent = d ? `${d.day} — ${d.focus}` : dayName;
    renderPlanFields(dayName);
  }

  function setDate(iso) {
    dateEl.value = iso;
    const dn = dayNameFromISO(iso);
    dayPlanEl.value = dn;
    renderDay(dn);
  }

  setDate(todayISO());

  dateEl.addEventListener("change", () => {
    if (!dateEl.value) return;
    const dn = dayNameFromISO(dateEl.value);
    dayPlanEl.value = dn;
    renderDay(dn);
  });
  dayPlanEl.addEventListener("change", () => renderDay(dayPlanEl.value));
  $("quickToday").addEventListener("click", () => setDate(todayISO()));

  // Custom exercises
  let custom = [];
  const UNIT_OPTIONS = ["повт.","сек","кг","мин","м","сет","рунд","друго"];

  function renderCustom() {
    const root = $("customList");
    root.innerHTML = "";
    if (custom.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Няма добавени упражнения.";
      root.appendChild(empty);
      return;
    }
    custom.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "customRow";

      const name = document.createElement("input");
      name.className = "input";
      name.placeholder = "Име (напр. Dips)";
      name.value = c.name || "";
      name.addEventListener("input", (e) => custom[idx].name = e.target.value);

      const value = document.createElement("input");
      value.className = "input";
      value.placeholder = "Стойност (напр. 4x8)";
      value.value = c.value || "";
      value.addEventListener("input", (e) => custom[idx].value = e.target.value);

      const unit = document.createElement("select");
      unit.className = "input";
      UNIT_OPTIONS.forEach(u => {
        const o = document.createElement("option");
        o.value = u; o.textContent = u;
        unit.appendChild(o);
      });
      unit.value = c.unit || "повт.";
      unit.addEventListener("change", (e) => custom[idx].unit = e.target.value);

      const del = document.createElement("button");
      del.className = "btn small";
      del.type = "button";
      del.textContent = "🗑️";
      del.addEventListener("click", () => {
        custom = custom.filter((_, i) => i !== idx);
        renderCustom();
      });

      row.appendChild(name);
      row.appendChild(value);
      row.appendChild(unit);
      row.appendChild(del);
      root.appendChild(row);
    });
  }

  $("addCustom").addEventListener("click", () => {
    custom.push({ name:"", value:"", unit:"повт." });
    renderCustom();
  });
  renderCustom();

  // Charts parsing helpers
  function parseBestSeconds(text) {
    if (!text) return null;
    const t = text.toString().toLowerCase();
    const m = t.match(/(\d+(?:[.,]\d+)?)\s*(s|sec|сек|seconds)/);
    if (!m) return null;
    const v = Number(m[1].replace(",", "."));
    return Number.isFinite(v) ? v : null;
  }
  function parseBestKg(text) {
    if (!text) return null;
    const t = text.toString().toLowerCase();
    const m = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|кг)/);
    if (!m) return null;
    const v = Number(m[1].replace(",", "."));
    return Number.isFinite(v) ? v : null;
  }

  function extractMetrics(entry) {
    let hs = typeof entry.hsBest === "number" ? entry.hsBest : null;
    let pl = typeof entry.plBest === "number" ? entry.plBest : null;
    let fl = typeof entry.flBest === "number" ? entry.flBest : null;
    let pu = typeof entry.pullKg === "number" ? entry.pullKg : null;
    let sq = typeof entry.squatKg === "number" ? entry.squatKg : null;
    let pr = typeof entry.pressKg === "number" ? entry.pressKg : null;

    const pv = Array.isArray(entry.planValues) ? entry.planValues : [];
    pv.forEach(p => {
      const name = (p.name || "").toLowerCase();
      const val = p.value || "";
      if (name.startsWith("handstand")) {
        const s = parseBestSeconds(val);
        if (s != null) hs = hs==null ? s : Math.max(hs, s);
      }
      if (name.startsWith("planche")) {
        const s = parseBestSeconds(val);
        if (s != null) pl = pl==null ? s : Math.max(pl, s);
      }
      if (name.startsWith("flag")) {
        const s = parseBestSeconds(val);
        if (s != null) fl = fl==null ? s : Math.max(fl, s);
      }
      if (name.includes("weighted pull-ups")) {
        const k = parseBestKg(val);
        if (k != null) pu = pu==null ? k : Math.max(pu, k);
      }
      if (name.startsWith("squat")) {
        const k = parseBestKg(val);
        if (k != null) sq = sq==null ? k : Math.max(sq, k);
      }
      if (name.includes("bench press") || name.includes("weighted dips") || name.includes("overhead press") || name.includes("press")) {
        const k = parseBestKg(val);
        if (k != null) pr = pr==null ? k : Math.max(pr, k);
      }
    });

    return { hs, pl, fl, pu, sq, pr };
  }

  function bestSoFar(getter) {
    let m = null;
    for (const e of state.entries) {
      const v = getter(e);
      if (typeof v === "number" && isFinite(v)) m = (m===null ? v : Math.max(m, v));
    }
    return m;
  }

  function computeStreak() {
    const doneDates = new Set(state.entries.filter(e => e.done !== "no" && e.date).map(e => e.date));
    let streak = 0;
    let cursor = new Date(todayISO() + "T00:00:00");
    const t = todayISO();
    if (!doneDates.has(t)) cursor.setDate(cursor.getDate() - 1);
    while (true) {
      const iso = cursor.toISOString().slice(0,10);
      if (!doneDates.has(iso)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      if (streak > 3650) break;
    }
    return streak;
  }

  function refreshHeader() {
    const s = computeStreak();
    const hs = bestSoFar(e => extractMetrics(e).hs);
    const pl = bestSoFar(e => extractMetrics(e).pl);
    const fl = bestSoFar(e => extractMetrics(e).fl);
    $("streakLine").textContent = `Streak: ${s} дни • PR: HS ${fmt(hs)}s • PL ${fmt(pl)}s • FL ${fmt(fl)}s`;
  }

  // Entries list
  let searchText = "";
  function kvSpan(text) { const s = document.createElement("span"); s.textContent = text; return s; }

  function renderEntries() {
    const list = $("logList");
    list.innerHTML = "";

    const entries = [...state.entries].sort((a,b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
    const filtered = entries.filter(e => !searchText || normalize(JSON.stringify(e)).includes(searchText));

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Няма записи (или няма резултати).";
      list.appendChild(empty);
      return;
    }

    filtered.forEach(e => {
      const item = document.createElement("div");
      item.className = "item";

      const left = document.createElement("div");
      const badge = document.createElement("div");
      badge.className = "badge" + (e.done === "no" ? " no" : "");
      badge.textContent = `${e.date} • ${e.dayName} • ${e.done === "no" ? "Не" : "Да"}`;
      left.appendChild(badge);

      const kv = document.createElement("div");
      kv.className = "kv";

      const pv = Array.isArray(e.planValues) ? e.planValues : [];
      const filled = pv.filter(p => (p.value || "").trim() !== "");
      filled.slice(0, 8).forEach(p => {
        const shortName = (p.name || "").split(":")[0].slice(0, 18);
        kv.appendChild(kvSpan(`${shortName}: ${p.value}`));
      });
      if (filled.length > 8) kv.appendChild(kvSpan(`… +${filled.length-8} още`));

      if (Array.isArray(e.custom)) {
        e.custom.slice(0, 4).forEach(c => {
          const name = (c.name || "").trim();
          const val = (c.value || "").trim();
          const unit = (c.unit || "").trim();
          const label = [name, val].filter(Boolean).join(" ");
          if (label) kv.appendChild(kvSpan(`${label}${unit ? " " + unit : ""}`.trim()));
        });
      }

      if (e.rpe != null) kv.appendChild(kvSpan(`RPE ${fmt(e.rpe)}`));

      left.appendChild(kv);

      if (e.notes) {
        const note = document.createElement("div");
        note.className = "note";
        note.textContent = e.notes;
        left.appendChild(note);
      }

      const right = document.createElement("div");
      const del = document.createElement("button");
      del.className = "iconBtn";
      del.textContent = "🗑️";
      del.addEventListener("click", () => {
        if (!confirm("Да изтрия ли този запис?")) return;
        state.entries = state.entries.filter(x => entryKey(x) !== entryKey(e));
        saveState(state);
        refreshHeader();
        renderEntries();
        renderCharts();
      });
      right.appendChild(del);

      item.appendChild(left);
      item.appendChild(right);
      list.appendChild(item);
    });
  }

  function showPR(message) {
    const el = $("prLine");
    el.textContent = message;
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 4500);
  }

  $("logForm").addEventListener("submit", (ev) => {
    ev.preventDefault();

    const prevHs = bestSoFar(e => extractMetrics(e).hs);
    const prevPl = bestSoFar(e => extractMetrics(e).pl);
    const prevFl = bestSoFar(e => extractMetrics(e).fl);

    const dayName = dayPlanEl.value;
    const dayCfg = WEEKLY_PLAN_FULL.find(x => x.day === dayName);

    const planValues = planInputs.map(p => ({ name: p.name, value: (p.input.value || "").trim() }));

    const e = {
      date: dateEl.value,
      dayName,
      done: $("done").value,
      rpe: numOrNull($("rpe").value),
      sleep: numOrNull($("sleep").value),
      notes: ($("notes").value || "").trim(),
      planFocus: dayCfg?.focus || "",
      planValues,
      custom: custom.map(c => ({ name:(c.name||"").trim(), value:(c.value||"").trim(), unit:(c.unit||"").trim() }))
                    .filter(c => c.name || c.value),
      createdAt: new Date().toISOString(),
    };

    state.entries.push(e);
    saveState(state);

    planInputs.forEach(p => p.input.value = "");
    $("rpe").value = "";
    $("sleep").value = "";
    $("notes").value = "";
    custom = [];
    renderCustom();

    refreshHeader();
    renderEntries();
    renderCharts();

    const nowHs = bestSoFar(x => extractMetrics(x).hs);
    const nowPl = bestSoFar(x => extractMetrics(x).pl);
    const nowFl = bestSoFar(x => extractMetrics(x).fl);
    const msgs = [];
    if (typeof nowHs === "number" && (prevHs === null || nowHs > prevHs)) msgs.push(`🏆 Нов PR Handstand: ${nowHs}s`);
    if (typeof nowPl === "number" && (prevPl === null || nowPl > prevPl)) msgs.push(`🏆 Нов PR Planche: ${nowPl}s`);
    if (typeof nowFl === "number" && (prevFl === null || nowFl > prevFl)) msgs.push(`🏆 Нов PR Flag: ${nowFl}s`);
    if (msgs.length) showPR(msgs.join(" • "));
  });

  $("search").addEventListener("input", (e) => { searchText = normalize(e.target.value); renderEntries(); });
  $("clearSearch").addEventListener("click", () => { $("search").value=""; searchText=""; renderEntries(); });

  $("exportBtn").addEventListener("click", () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `balanced-life-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("importBtn").addEventListener("click", async () => {
    const f = $("importFile").files?.[0];
    if (!f) return alert("Избери JSON файл.");
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.entries)) throw new Error("bad format");
      const map = new Map();
      [...state.entries, ...parsed.entries].forEach(e => map.set(entryKey(e), e));
      state.entries = Array.from(map.values());
      saveState(state);
      refreshHeader();
      renderEntries();
      renderCharts();
      alert("Импортът е готов.");
    } catch {
      alert("Неуспешен импорт. Провери файла.");
    }
  });

  $("resetBtn").addEventListener("click", () => {
    if (!confirm("Сигурен ли си? Това изтрива всички записи от този телефон.")) return;
    state.entries = [];
    saveState(state);
    refreshHeader();
    renderEntries();
    renderCharts();
  });

  function renderPlanPage() {
    const todayName = dayNameFromISO(todayISO());
    const todayPlan = WEEKLY_PLAN_FULL.find(x => x.day === todayName);
    $("planToday").textContent = `Днес: ${todayPlan ? todayPlan.day + " — " + todayPlan.focus : todayName}`;

    const wrap = $("planList");
    wrap.innerHTML = "";
    WEEKLY_PLAN_FULL.forEach(d => {
      const card = document.createElement("div");
      card.className = "planDay" + (d.day === todayName ? " today" : "");
      const h = document.createElement("h4");
      h.textContent = `${d.day} — ${d.focus}`;
      card.appendChild(h);

      const small = document.createElement("div");
      small.className = "small";
      small.textContent = d.note || "";
      card.appendChild(small);

      const ul = document.createElement("ul");
      (d.items || []).forEach(it => {
        const li = document.createElement("li");
        li.textContent = it;
        ul.appendChild(li);
      });
      card.appendChild(ul);

      wrap.appendChild(card);
    });
  }

  // Charts
  let chartRange = 30;
  $("range30").addEventListener("click", () => { chartRange = 30; renderCharts(); });
  $("range90").addEventListener("click", () => { chartRange = 90; renderCharts(); });
  $("rangeAll").addEventListener("click", () => { chartRange = 99999; renderCharts(); });

  function lastNEntries(n) {
    const sorted = [...state.entries].sort((a,b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
    if (n >= sorted.length) return sorted;
    return sorted.slice(Math.max(0, sorted.length - n));
  }

  function renderCharts() {
    const entries = lastNEntries(chartRange).filter(e => e.date);
    const labels = entries.map(e => e.date.slice(5));
    drawLine($("cHs"), labels, entries.map(e => extractMetrics(e).hs ?? null));
    drawLine($("cPl"), labels, entries.map(e => extractMetrics(e).pl ?? null));
    drawLine($("cFl"), labels, entries.map(e => extractMetrics(e).fl ?? null));
    drawLine($("cPu"), labels, entries.map(e => extractMetrics(e).pu ?? null));
    drawLine($("cSq"), labels, entries.map(e => extractMetrics(e).sq ?? null));
    drawLine($("cPr"), labels, entries.map(e => extractMetrics(e).pr ?? null));
  }

  function drawLine(canvas, labels, values) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 600;
    const cssH = canvas.height;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    ctx.clearRect(0,0,cssW,cssH);

    const padL=34, padR=12, padT=12, padB=26;
    const w = cssW - padL - padR;
    const h = cssH - padT - padB;

    const pts = values.map((v,i)=>({v,i})).filter(p => typeof p.v === "number" && isFinite(p.v));

    ctx.strokeStyle = "rgba(11,14,20,.14)";
    ctx.lineWidth = 1;
    const gridN = 4;
    for (let g=0; g<=gridN; g++){
      const y = padT + (h*g)/gridN;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL+w, y); ctx.stroke();
    }

    if (pts.length === 0){
      ctx.fillStyle = "rgba(11,14,20,.60)";
      ctx.font = "12px Roboto, system-ui";
      ctx.fillText("Няма данни", padL, padT+16);
      return;
    }

    const minV = Math.min(...pts.map(p=>p.v), 0);
    const maxV = Math.max(...pts.map(p=>p.v), minV + 1e-6);
    const range = maxV - minV;

    ctx.fillStyle = "rgba(11,14,20,.62)";
    ctx.font = "11px Roboto, system-ui";
    for (let g=0; g<=gridN; g++){
      const v = maxV - (range*g)/gridN;
      const y = padT + (h*g)/gridN;
      ctx.fillText(v.toFixed(0), 6, y+4);
    }

    const xFor = (i) => labels.length<=1 ? padL : padL + (w*i)/(labels.length-1);
    const yFor = (v) => padT + (h*(maxV - v))/range;

    ctx.strokeStyle = "#0b0e14";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started=false;
    for (let i=0; i<values.length; i++){
      const v = values[i];
      if (typeof v !== "number" || !isFinite(v)) continue;
      const x=xFor(i), y=yFor(v);
      if (!started){ ctx.moveTo(x,y); started=true; }
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.fillStyle = "#0b0e14";
    for (let i=0; i<values.length; i++){
      const v=values[i];
      if (typeof v !== "number" || !isFinite(v)) continue;
      const x=xFor(i), y=yFor(v);
      ctx.beginPath(); ctx.arc(x,y,3.0,0,Math.PI*2); ctx.fill();
    }

    ctx.fillStyle = "rgba(11,14,20,.55)";
    ctx.font = "10px Roboto, system-ui";
    const step = Math.max(1, Math.floor(labels.length/6));
    for (let i=0; i<labels.length; i+=step){
      const x=xFor(i);
      ctx.fillText(labels[i], x-12, padT+h+18);
    }
  }



  function monthKey(iso){ return (iso||"").slice(0,7); } // YYYY-MM

  function renderFinSummary(items){
    const el = $("finSummary");
    if (!el) return;
    const now = new Date();
    const isoNow = new Date(now - now.getTimezoneOffset()*60000).toISOString().slice(0,10);
    const m = monthKey(isoNow);

    let incM=0, expM=0, incAll=0, expAll=0;
    for (const it of items){
      const amt = Number(it.amount||0) || 0;
      if (it.type === "income") incAll += amt; else expAll += amt;
      if (monthKey(it.date||"") === m){
        if (it.type === "income") incM += amt; else expM += amt;
      }
    }
    const balM = incM - expM;
    const balAll = incAll - expAll;
    const ratio = expM > 0 ? (incM/expM) : null;

    el.innerHTML = "";
    const add = (t) => { const s=document.createElement("span"); s.textContent=t; el.appendChild(s); };
    add(`Този месец: +${incM.toFixed(2)} / −${expM.toFixed(2)} / Баланс ${balM.toFixed(2)}`);
    if (ratio!=null) add(`Приход/Разход: ${ratio.toFixed(2)}×`);
    add(`Общо: +${incAll.toFixed(2)} / −${expAll.toFixed(2)} / Баланс ${balAll.toFixed(2)}`);
  }

  // ---- Finance + Calendar (simple offline modules) ----
  const FIN_KEY = "balanced_life_fin_v1";
  const CAL_KEY = "balanced_life_cal_v1";

  function loadArr(key){
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }
  function saveArr(key, arr){ try { localStorage.setItem(key, JSON.stringify(arr)); } catch {} }

  function renderFinance(){
    const list = $("finList");
    if (!list) return;
    const items = loadArr(FIN_KEY).sort((a,b)=> (b.ts||"").localeCompare(a.ts||""));
    renderFinSummary(items);
    list.innerHTML = "";
    if (items.length === 0){
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Няма записи още.";
      list.appendChild(empty);
      return;
    }
    items.slice(0, 30).forEach(it=>{
      const row = document.createElement("div");
      row.className = "item";
      const left = document.createElement("div");
      const badge = document.createElement("div");
      badge.className = "badge";
      const sign = it.type === "income" ? "+" : "−";
      badge.textContent = `${(it.date||"") || ""} • ${sign}${it.amount || 0} • ${it.cat || "—"}`;
      left.appendChild(badge);
      const note = document.createElement("div");
      note.className = "note";
      note.textContent = (it.note || "").trim() || " ";
      left.appendChild(note);

      const right = document.createElement("div");
      const del = document.createElement("button");
      del.className = "iconBtn";
      del.textContent = "🗑️";
      del.addEventListener("click", ()=>{
        if (!confirm("Да изтрия ли този финансов запис?")) return;
        const all = loadArr(FIN_KEY).filter(x => x.ts !== it.ts);
        saveArr(FIN_KEY, all);
        renderFinance();
      });
      right.appendChild(del);

      row.appendChild(left); row.appendChild(right);
      list.appendChild(row);
    });
  }

  function initFinance(){
    if (!$("finSave")) return;
    $("finSave").addEventListener("click", ()=>{
      const type = $("finType").value;
      const amount = Number(($("finAmount").value||"").toString().replace(",", "."));
      if (!isFinite(amount) || amount <= 0) return alert("Въведи сума > 0");
      const rec = {
        type,
        amount: Math.round(amount*100)/100,
        cat: ($("finCat").value||"").trim(),
        note: ($("finNote").value||"").trim(),
        date: todayISO(),
        ts: new Date().toISOString()
      };
      const all = loadArr(FIN_KEY);
      all.push(rec);
      saveArr(FIN_KEY, all);
      $("finAmount").value=""; $("finCat").value=""; $("finNote").value="";
      renderFinance();
    });
    $("finClear").addEventListener("click", ()=>{
      $("finAmount").value=""; $("finCat").value=""; $("finNote").value="";
    });
    $("finExport").addEventListener("click", ()=>{
      const all = loadArr(FIN_KEY);
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `balanced-life-finance-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    renderFinance();
  }


  let reminderTimers = [];

  function clearReminderTimers(){
    reminderTimers.forEach(t => clearTimeout(t));
    reminderTimers = [];
  }

  async function requestNotifications(){
    if (!("Notification" in window)) { alert("Няма поддръжка за нотификации."); return false; }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") { alert("Нотификациите са отказани от системата."); return false; }
    const res = await Notification.requestPermission();
    return res === "granted";
  }

  function showLocalNotification(title, body){
    try {
      if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
      else alert(title + "\n" + body);
    } catch { alert(title + "\n" + body); }
  }

  function scheduleReminderForEvent(ev){
    const remindMin = Number(ev.remindMin||0) || 0;
    if (!ev.when) return;
    const whenTs = Date.parse(ev.when);
    if (!isFinite(whenTs)) return;

    const remindTs = whenTs - remindMin*60*1000;
    const delay = remindTs - Date.now();

    // Only schedule while app is open, and only up to 7 days ahead
    if (delay <= 0 || delay > 7*24*60*60*1000) return;

    const t = setTimeout(() => {
      showLocalNotification("Balanced life • Напомняне", `${ev.title} (${ev.whenLabel||""})`);
      if (ev.repeat && ev.repeat !== "none") {
        const d = new Date(whenTs);
        if (ev.repeat === "daily") d.setDate(d.getDate()+1);
        if (ev.repeat === "weekly") d.setDate(d.getDate()+7);
        const nextDate = new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
        const nextTime = (ev.whenLabel || "").split("•")[1]?.trim() || "12:00";
        ev.when = `${nextDate}T${nextTime}:00`;
        ev.whenLabel = `${nextDate} • ${nextTime}`;
        const all = loadArr(CAL_KEY);
        const idx = all.findIndex(x => x.id === ev.id);
        if (idx >= 0) { all[idx] = ev; saveArr(CAL_KEY, all); }
        renderCalendar();
        scheduleAllReminders();
      }
    }, delay);

    reminderTimers.push(t);


  function scheduleAllReminders(){
    clearReminderTimers();
    const items = loadArr(CAL_KEY).sort((a,b)=> (a.when||"").localeCompare(b.when||""));
    items.forEach(scheduleReminderForEvent);
  }

  function renderCalendar(){
    const list = $("calList");
    if (!list) return;
    const items = loadArr(CAL_KEY)
      .sort((a,b)=> (a.when||"").localeCompare(b.when||""));
    list.innerHTML = "";
    if (items.length === 0){
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Няма събития още.";
      list.appendChild(empty);
      return;
    }
    items.slice(0, 50).forEach(it=>{
      const row = document.createElement("div");
      row.className = "item";
      const left = document.createElement("div");
      const badge = document.createElement("div");
      badge.className = "badge";
      const r = (Number(it.remindMin||0)||0);
      const rr = it.repeat && it.repeat !== "none" ? (" • " + (it.repeat==="daily"?"ежедневно":"седмично")) : "";
      const rm = r>0 ? (` • 🔔 ${r}м`) : "";
      badge.textContent = `${it.whenLabel || it.when || ""} • ${it.title || "—"}${rm}${rr}`;
      left.appendChild(badge);
      const note = document.createElement("div");
      note.className = "note";
      note.textContent = (it.note || "").trim() || " ";
      left.appendChild(note);

      const right = document.createElement("div");
      const del = document.createElement("button");
      del.className = "iconBtn";
      del.textContent = "🗑️";
      del.addEventListener("click", ()=>{
        if (!confirm("Да изтрия ли това събитие?")) return;
        const all = loadArr(CAL_KEY).filter(x => x.id !== it.id);
        saveArr(CAL_KEY, all);
        renderCalendar();
        scheduleAllReminders();
      });
      right.appendChild(del);

      row.appendChild(left); row.appendChild(right);
      list.appendChild(row);
    });
  }

  function initCalendar(){
    if (!$("calSave")) return;
    $("calDate").value = todayISO();

    if ($("notifBtn")) {
      $("notifBtn").addEventListener("click", async ()=>{
        const ok = await requestNotifications();
        if (ok) alert("Нотификациите са разрешени ✅");
      });
    }

    $("calSave").addEventListener("click", ()=>{
      const d = $("calDate").value || todayISO();
      const t = $("calTime").value || "12:00";
      const title = ($("calTitle").value||"").trim();
      if (!title) return alert("Въведи заглавие.");
      const when = `${d}T${t}:00`;
      const rec = {
        id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now()+"-"+Math.random()),
        when,
        whenLabel: `${d} • ${t}`,
        title,
        note: ($("calNote").value||"").trim(),
        remindMin: Number(($("calRemind")?.value||"").toString().replace(",", ".")) || 0,
        repeat: $("calRepeat")?.value || "none"
      };
      const all = loadArr(CAL_KEY);
      all.push(rec);
      saveArr(CAL_KEY, all);
      $("calTitle").value=""; $("calNote").value=""; $("calTime").value=""; if ($("calRemind")) $("calRemind").value=""; if ($("calRepeat")) $("calRepeat").value="none"; if ($("calRemind")) $("calRemind").value=""; if ($("calRepeat")) $("calRepeat").value="none";
      renderCalendar();
      scheduleAllReminders();
    });

    $("calClear").addEventListener("click", ()=>{
      $("calTitle").value=""; $("calNote").value=""; $("calTime").value=""; if ($("calRemind")) $("calRemind").value=""; if ($("calRepeat")) $("calRepeat").value="none";
    });

    $("calExport").addEventListener("click", ()=>{
      const all = loadArr(CAL_KEY);
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `balanced-life-calendar-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    renderCalendar();
    scheduleAllReminders();
  }

  $("installHint").addEventListener("click", () => { $("installHint").style.display="none"; });

  // Init
  refreshHeader();
  renderEntries();
  renderPlanPage();
  renderCharts();
  renderTiles();
  initFinance();
  initCalendar();
  initNutrition();
  initDashboard();
  bindBottomNav();
  setEditMode(false);
  showPanel("home");

  // ---- Nutrition (offline) ----
  var NUT_KEY = "balanced_life_nut_v1";
  var _nutPhotoCache = "";

  function nutLoad(){
    try { return JSON.parse(localStorage.getItem(NUT_KEY) || "[]"); } catch(e){ return []; }
  }
  function nutSaveArr(arr){
    try { localStorage.setItem(NUT_KEY, JSON.stringify(arr)); } catch(e){}
  }

  function renderNutrition(){
    var list = $("nutList");
    if (!list) return;
    var items = nutLoad();
    items = items.slice().reverse();
    list.innerHTML = "";
    if (items.length === 0){
      var empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Няма записи още.";
      list.appendChild(empty);
      return;
    }
    for (var i=0;i<items.length && i<30;i++){
      var it = items[i];
      var row = document.createElement("div");
      row.className = "item";
      var left = document.createElement("div");
      var badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = (it.date || "") + " • " + (it.kcal || "—") + " kcal";
      left.appendChild(badge);
      var note = document.createElement("div");
      note.className = "note";
      note.textContent = it.food || "—";
      left.appendChild(note);
      if (it.photo){
        var img = document.createElement("img");
        img.src = it.photo;
        img.alt = "Храна";
        img.style.width = "100%";
        img.style.maxWidth = "320px";
        img.style.marginTop = "10px";
        img.style.borderRadius = "18px";
        img.style.border = "1px solid rgba(11,14,20,.12)";
        left.appendChild(img);
      }
      row.appendChild(left);
      list.appendChild(row);
    }
  }

  function initNutrition(){
    if (!$("nutSave")) return;

    var photoInput = $("nutPhoto");
    if (photoInput){
      photoInput.addEventListener("change", function(){
        var f = photoInput.files && photoInput.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function(){
          _nutPhotoCache = String(reader.result || "");
          var img = $("nutPreview");
          var wrap = $("nutPreviewWrap");
          if (img && wrap){
            img.src = _nutPhotoCache;
            wrap.style.display = "block";
          }
        };
        reader.readAsDataURL(f);
      });
    }

    $("nutSave").addEventListener("click", function(){
      var food = ($("nutFood").value || "").trim();
      if (!food) { alert("Въведи храна."); return; }
      var kcal = Number(($("nutKcal").value || "").toString().replace(",", "."));
      if (!isFinite(kcal) || kcal < 0) kcal = null;

      var rec = {
        date: (new Date(Date.now() - new Date().getTimezoneOffset()*60000)).toISOString().slice(0,10),
        food: food,
        kcal: kcal ? Math.round(kcal) : null,
        photo: _nutPhotoCache || null,
        ts: new Date().toISOString()
      };

      var items = nutLoad();
      items.push(rec);
      nutSaveArr(items);

      $("nutFood").value = "";
      $("nutKcal").value = "";
      _nutPhotoCache = "";
      if (photoInput) photoInput.value = "";
      var wrap = $("nutPreviewWrap");
      var img = $("nutPreview");
      if (wrap) wrap.style.display = "none";
      if (img) img.src = "";

      renderNutrition();
    });

    $("nutClear").addEventListener("click", function(){
      $("nutFood").value = "";
      $("nutKcal").value = "";
      _nutPhotoCache = "";
      if (photoInput) photoInput.value = "";
      var wrap = $("nutPreviewWrap");
      var img = $("nutPreview");
      if (wrap) wrap.style.display = "none";
      if (img) img.src = "";
    });

    $("nutExport").addEventListener("click", function(){
      var all = nutLoad();
      var blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "balanced-life-nutrition-" + (new Date(Date.now() - new Date().getTimezoneOffset()*60000)).toISOString().slice(0,10) + ".json";
      a.click();
      URL.revokeObjectURL(a.href);
    });

    renderNutrition();
  }


  // ---- Dashboard (v4.8) ----
  function fmtMoney(n){
    try { return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(n); }
    catch(e){ return '$' + Math.round(n); }
  }
  function todayISO2(){
    return (new Date(Date.now() - new Date().getTimezoneOffset()*60000)).toISOString().slice(0,10);
  }
  function setText(id, t){ var el = document.getElementById(id); if (el) el.textContent = t; }
  function setWidth(id, pct){ var el = document.getElementById(id); if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%'; }

  function buildWeekStrip(){
    var wrap = document.getElementById('weekStrip');
    if (!wrap) return;
    wrap.innerHTML = '';
    var d = new Date();
    var day = d.getDay(); // 0 Sun
    var mondayOffset = (day + 6) % 7;
    var start = new Date(d); start.setDate(d.getDate() - mondayOffset);

    var names = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    for (var i=0;i<7;i++){
      var x = new Date(start); x.setDate(start.getDate()+i);
      var pill = document.createElement('div');
      pill.className = 'dayPill' + (x.toDateString()===d.toDateString() ? ' active':'');

      var b = document.createElement('b'); b.textContent = x.getDate();
      var s = document.createElement('span'); s.textContent = names[i];
      pill.appendChild(b); pill.appendChild(s);
      wrap.appendChild(pill);
    }
  }

  function readFinance(){
    var keys = ["balanced_life_fin_v1","balanced_life_finance_v1","balanced_life_fin_v2","balanced_life_finance_v2"];
    for (var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if (raw){ return JSON.parse(raw) || {}; }
      }catch(e){}
    }
    return {};
  }

  function sumNutrition7d(){
    var key = (typeof NUT_KEY !== 'undefined') ? NUT_KEY : "balanced_life_nut_v1";
    var items = [];
    try { items = JSON.parse(localStorage.getItem(key) || "[]"); } catch(e){ items=[]; }
    var now = new Date();
    var cut = new Date(now); cut.setDate(now.getDate()-6);
    var sum = 0;
    for (var i=0;i<items.length;i++){
      var it = items[i];
      var ts = it.ts ? new Date(it.ts) : null;
      if (ts && ts >= cut){ sum += Number(it.kcal)||0; }
    }
    return Math.round(sum);
  }

  function sumLast7(kind){
    var now = new Date();
    var cut = new Date(now); cut.setDate(now.getDate()-6);
    if (kind === "expense"){
      var fin = readFinance();
      var expenses = fin.expenses || fin.items || [];
      var sum = 0;
      for (var i=0;i<expenses.length;i++){
        var it = expenses[i];
        var dt = it.date ? new Date(it.date) : null;
        if (!dt || isNaN(dt.getTime())) continue;
        if (dt >= cut){
          if ((it.type||it.kind) === "expense" || it.isExpense) sum += Number(it.amount)||0;
        }
      }
      return Math.round(sum);
    }
    if (kind === "work"){
      var key2 = "balanced_life_log_v1";
      var log = [];
      try { log = JSON.parse(localStorage.getItem(key2) || "[]"); } catch(e){ log=[]; }
      var sum2 = 0;
      for (var j=0;j<log.length;j++){
        var r = log[j];
        var dt2 = r.date ? new Date(r.date) : null;
        if (!dt2 || isNaN(dt2.getTime())) continue;
        if (dt2 >= cut) sum2 += Number(r.minutes||r.duration||0)||0;
      }
      return Math.round(sum2);
    }
    return 0;
  }

  function initDashboard(){
    if (!document.getElementById('dashDate')) return;

    try{
      var d = new Date();
      var opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
      setText('dashDate', d.toLocaleDateString('en-US', opts));
    }catch(e){
      setText('dashDate', todayISO2());
    }

    buildWeekStrip();

    var fin = readFinance();
    var spentToday = 0, budget = 0;
    try{
      var iso = todayISO2();
      var expenses = fin.expenses || fin.items || [];
      for (var i=0;i<expenses.length;i++){
        var it = expenses[i];
        if ((it.date||"") === iso && ((it.type||it.kind) === "expense" || it.isExpense)) spentToday += Number(it.amount)||0;
      }
      budget = Number(fin.dailyBudget || fin.budgetDaily || fin.budget || 0) || 0;
    }catch(e){}

    var kcalToday = 0;
    try{
      var key = (typeof NUT_KEY !== 'undefined') ? NUT_KEY : "balanced_life_nut_v1";
      var items = JSON.parse(localStorage.getItem(key) || "[]");
      var iso2 = todayISO2();
      for (var j=0;j<items.length;j++){
        if ((items[j].date||"") === iso2) kcalToday += Number(items[j].kcal)||0;
      }
      kcalToday = Math.round(kcalToday);
    }catch(e){ kcalToday = 0; }

    var workMinToday = 0;
    try{
      var key2 = "balanced_life_log_v1";
      var log = JSON.parse(localStorage.getItem(key2) || "[]");
      var iso3 = todayISO2();
      for (var k=0;k<log.length;k++){
        var r = log[k];
        if ((r.date||"") === iso3){
          workMinToday += Number(r.minutes||r.duration||0)||0;
        }
      }
      workMinToday = Math.round(workMinToday);
    }catch(e){ workMinToday = 0; }

    var budgetTarget = budget || 60;
    var kcalTarget = Number(localStorage.getItem("balanced_life_kcal_target") || 2100) || 2100;
    var workTarget = Number(localStorage.getItem("balanced_life_work_target") || 60) || 60;

    var pMoney = budgetTarget ? (spentToday / budgetTarget) * 100 : 0;
    var pKcal = kcalTarget ? (kcalToday / kcalTarget) * 100 : 0;
    var pWork = workTarget ? (workMinToday / workTarget) * 100 : 0;

    setText('ringMoney', fmtMoney(spentToday) + " / " + fmtMoney(budgetTarget));
    setText('ringKcal', kcalToday.toLocaleString() + " kcal");

    setWidth('barMoney', Math.min(100, pMoney));
    setWidth('barKcal', Math.min(100, pKcal));
    setWidth('barWork', Math.min(100, pWork));

    var e1 = 100 - Math.min(100, pMoney);
    var e2 = 100 - Math.abs(100 - Math.min(200, pKcal));
    var e3 = Math.min(100, pWork);
    var energy = Math.round((e1*0.35 + e2*0.35 + e3*0.30));
    energy = Math.max(0, Math.min(100, energy));
    setText('ringPct', energy + "%");

    var ring = document.getElementById('energyRing');
    setRingProgressV49(energy);
    if (ring) ring.style.setProperty('--p', energy);

    setText('miniSpend', fmtMoney(sumLast7("expense")));
    setText('miniKcal', sumNutrition7d().toLocaleString() + " kcal");
    setText('miniWork', sumLast7("work") + " min");
  }

  function bindBottomNav(){
    var nav = document.querySelector('.bottomNav');
    if (!nav) return;
    nav.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-open]');
      if (!btn) return;
      var id = btn.getAttribute('data-open');
      if (!id) return;
      showPanel(id);
      var items = nav.querySelectorAll('.bnItem');
      for (var i=0;i<items.length;i++) items[i].classList.remove('active');
      if (btn.classList.contains('bnItem')) btn.classList.add('active');
    });

    var add = document.getElementById('bnAdd');
    if (add){
      add.addEventListener('click', function(){
        showPanel('log');
        var items = nav.querySelectorAll('.bnItem');
        for (var i=0;i<items.length;i++) items[i].classList.remove('active');
      });
    }
  }


// ===== v4.8.1 FIXPACK: ultra-safe click bindings =====
(function bindClicksUltraSafe(){
  function openPanel(id){
    try{
      if (typeof showPanel === "function") { showPanel(id); return; }
    }catch(e){}
    // fallback: data-panel show/hide
    document.querySelectorAll("[data-panel]").forEach(p => p.classList.add("hidden"));
    const target = document.querySelector(`[data-panel="${id}"]`);
    if (target) target.classList.remove("hidden");
  }

  // Delegate clicks for any element with data-open (tiles, nav buttons, etc.)
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-open]");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const id = el.getAttribute("data-open");
    if (id) openPanel(id);
  }, true);

  // Reorder button (Подреди) - support multiple selectors
  const reorderBtn =
    document.getElementById("reorderBtn") ||
    document.querySelector('[data-action="reorder"]') ||
    document.querySelector('button[aria-label="Подреди"]');

  if (reorderBtn) {
    reorderBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.toggle("reorderMode");
    }, { passive: false });
  }

  console.log("✅ Click bindings active");
})();


// Ensure app init after DOM (extra safe)
document.addEventListener("DOMContentLoaded", function(){
  // no-op if app already initialized
});


// ===== SPA_ROUTER_V49 =====
// ===== Embedded workouts plan from v4.2 =====
const WEEKLY_PLAN_FULL_V42 = [
    { day:"Понеделник", focus:"Push + Planche (тежко) + Handstand",
      items:[
        "Handstand: Chest-to-wall 5×30–45 сек + 6–10 kick-up опита",
        "Planche: 6–10×6–12 сек (tuck/frog) + leans 3×20 сек",
        "Bench press ИЛИ Weighted dips 4×4–6",
        "Overhead press 3×5–8",
        "Pseudo planche push-ups 4×6–10",
        "Lateral raise 3×12–20",
        "Hollow hold 4×20–40 сек"
      ],
      note:"RPE 7–8, без разпад на форма"
    },
    { day:"Вторник", focus:"Pull (тежко) + Flag + Набирания",
      items:[
        "Flag: 6–10×5–10 сек (tuck/ластик)",
        "Flag negatives: 4×3–6 сек",
        "Weighted pull-ups 5×3–5",
        "Chin-ups 3×6–10",
        "Row 4×6–10",
        "Lat pulldown 3×10–15",
        "Face pulls + external rotations 3×15–20",
        "Side plank/Copenhagen 4×20–40 сек/страна"
      ],
      note:"Фокус: стабилни рамене"
    },
    { day:"Сряда", focus:"Крака (фитнес) + Core + лека стойка",
      items:[
        "Handstand: scap shrugs 3×10 + 3–5 леки опита",
        "Squat 4×3–6",
        "RDL 4×6–8",
        "Bulgarian split squat 3×8–12/крак",
        "Leg curl или Nordic 3×8–12",
        "Calves 4×10–20",
        "Ab wheel или hanging knee raises 4×8–15"
      ],
      note:"Не до отказ"
    },
    { day:"Четвъртък", focus:"Кондиция: Бокс + Въже + Мобилност",
      items:[
        "Въже 12×(40/40)",
        "Бокс 8–12 рунда × 2–3 мин",
        "Прехаб: scap push-ups 2×10, wrist rocks 2×10, external rotations 3×15–20"
      ],
      note:"Умерено темпо, техника"
    },
    { day:"Петък", focus:"Upper (обем/умение) + Planche + Pull-up вариации",
      items:[
        "Handstand: 6–10 опита × 10–25 сек + wall line 2×30 сек",
        "Planche: holds 6–8×6–12 сек + leans 3×20 сек",
        "Flag: 4–6 леки опита × 5–8 сек (само чисто)",
        "Explosive pull-ups / chest-to-bar 6×2–4",
        "Archer/Typewriter 4×3–6/страна",
        "Incline DB press 4×8–12",
        "Seated cable row 3×10–15",
        "Curls 3×10–15",
        "Triceps pushdown 3×10–15",
        "Farmer/Suitcase carry 6×20–40 м"
      ],
      note:"Пази свежест за уикенда"
    },
    { day:"Събота", focus:"Футбол + кратък Skill/прехаб (леко)",
      items:[
        "Футбол",
        "Handstand: 8–12 мин лесни опита (или стена)",
        "Planche: leans 3×15–25 сек + PPPU 3×8 (леки)",
        "Flag: 1–3 опита × 5–8 сек (само ако си свеж)",
        "Face pulls 2×20 + External rotations 2×20",
        "Разтягане 5–10 мин"
      ],
      note:"Ако мачът е тежък → само мобилност"
    },
    { day:"Неделя", focus:"Футбол + възстановяване",
      items:[
        "Футбол",
        "Zone 2 20–40 мин (по желание)",
        "Мобилност 10–15 мин (прасци/бедра/таз/гръб/рамене)"
      ],
      note:"Цел: възстановяване"
    }
  ];

(function(){
  const PANEL_IDS = ["home","spending","nutritiondash","workoutsDash","plan","log","charts","nutrition","finance","calendar","settings"];

  function panelEl(name){ return document.getElementById("tab-" + name); }

  function setActiveNav(name){
    const nav = document.querySelector(".bottomNav");
    if (!nav) return;
    const items = nav.querySelectorAll(".bnItem");
    items.forEach(i => i.classList.remove("active"));
    const btn = nav.querySelector(`.bnItem[data-open="${name}"]`);
    if (btn) btn.classList.add("active");
  }

  window.showPanel = function(name, opts){
    opts = opts || {};
    if (!PANEL_IDS.includes(name)) name = "home";

    PANEL_IDS.forEach(id=>{
      const el = panelEl(id);
      if (el) el.classList.toggle("hidden", id !== name);
    });

    setActiveNav(name);

    // refresh dynamic sections
    try{
      if (name === "home" && typeof initDashboard === "function") initDashboard();
      if (name === "nutrition" && typeof renderNutrition === "function") renderNutrition();
      if (name === "finance" && typeof renderFinance === "function") renderFinance();
      if (name === "calendar" && typeof renderCalendar === "function") renderCalendar();
    }catch(e){}

    if (!opts.silent){
      // Use hash routing for GitHub Pages friendliness
      const h = "#/" + name;
      if (location.hash !== h) history.pushState({panel:name}, "", h);
    }
  };

  function routeFromURL(){
    const h = location.hash || "";
    const m = h.match(/^#\/([a-z]+)/i);
    const name = m ? m[1].toLowerCase() : "home";
    window.showPanel(name, {silent:true});
  }

  window.addEventListener("popstate", routeFromURL);
  window.addEventListener("hashchange", routeFromURL);

  document.addEventListener("DOMContentLoaded", function(){
    // Ensure every panel exists; if not, don't crash
    PANEL_IDS.forEach(id=>{
      const el = panelEl(id);
      if (el && id !== "home") el.classList.add("hidden");
    });

    // Delegate navigation clicks (tiles, bottom nav, buttons)
    document.addEventListener("click", (e)=>{
      const el = e.target.closest("[data-open]");
      if (!el) return;
      e.preventDefault();
      const id = el.getAttribute("data-open");
      if (id) window.showPanel(id);
    });

    routeFromURL();
  });
})();



function setRingProgressV49(pct){
  const c = document.getElementById("energyRingCircle");
  if (!c) return;
  const r = 46;
  const C = 2 * Math.PI * r; // ~289.03
  const p = Math.max(0, Math.min(100, pct));
  const off = C * (1 - p/100);
  c.style.strokeDasharray = String(C);
  c.style.strokeDashoffset = String(off);
}


// ===== V492_TILE_GUARD =====
document.addEventListener("click", (e)=>{
  const el = e.target.closest("[data-open]");
  if(!el) return;
  const id = el.getAttribute("data-open");
  if(!id) return;
  // If panel doesn't exist, route to home to avoid dead click
  const panel = document.getElementById("tab-"+id);
  if(!panel && typeof showPanel === "function"){
    // allow modules that exist under different names
    const map = { "progress":"log", "workouts":"plan", "settings":"settings" };
    if(map[id] && document.getElementById("tab-"+map[id])) showPanel(map[id]);
  }
}, true);


// ===== V496_APP: BottomNav + CRUD + Live Dashboard =====
(function(){
  const FIN_KEY = "bl_fin_v1";
  const NUT_KEY2 = "bl_nut_v1";
  const LOG_KEY = "bl_log_v1";

  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));

  function todayISO(){
    const d = new Date(Date.now() - new Date().getTimezoneOffset()*60000);
    return d.toISOString().slice(0,10);
  }
  function uid(){
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function load(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }
  function save(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---------- Finance ----------
  function renderFinanceCRUD(){
    const list = document.getElementById("finList");
    if(!list) return;
    const items = load(FIN_KEY, []);
    list.innerHTML = "";
    items.slice().reverse().slice(0,50).forEach(it=>{
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(it.desc)} <span class="itemMeta">(${it.type === "income" ? "приход" : "разход"})</span></div>
          <div class="itemMeta">${it.date} • ${formatMoney(it.amount)}</div>
        </div>
        <div class="itemBtns">
          <button class="smallBtn" data-del="fin" data-id="${it.id}">✕</button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  // ---------- Nutrition ----------
  function renderNutritionCRUD(){
    const list = document.getElementById("nutList");
    if(!list) return;
    const items = load(NUT_KEY2, []);
    list.innerHTML = "";
    items.slice().reverse().slice(0,50).forEach(it=>{
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(it.food)}</div>
          <div class="itemMeta">${it.date} • ${Math.round(it.kcal||0)} kcal${it.protein?(" • "+it.protein+"g P"):""}</div>
        </div>
        <div class="itemBtns">
          <button class="smallBtn" data-del="nut" data-id="${it.id}">✕</button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  // ---------- Log ----------
  function renderLogCRUD(){
    const list = document.getElementById("logList");
    if(!list) return;
    const items = load(LOG_KEY, []);
    list.innerHTML = "";
    items.slice().reverse().slice(0,50).forEach(it=>{
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(it.exercise)}</div>
          <div class="itemMeta">${it.date} • ${it.value} ${it.unit}</div>
        </div>
        <div class="itemBtns">
          <button class="smallBtn" data-del="log" data-id="${it.id}">✕</button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  // ---------- Dashboard live data ----------
  function computeDashboard(){
    const fin = load(FIN_KEY, []);
    const nut = load(NUT_KEY2, []);
    const log = load(LOG_KEY, []);

    const iso = todayISO();

    let spent = 0, income = 0;
    fin.forEach(it=>{
      if(it.date === iso){
        if(it.type === "expense") spent += Number(it.amount)||0;
        if(it.type === "income") income += Number(it.amount)||0;
      }
    });

    let kcal = 0;
    nut.forEach(it=>{ if(it.date === iso) kcal += Number(it.kcal)||0; });

    // workouts minutes today: sum entries where unit=min OR exercise contains "workout" etc.
    let workMin = 0;
    log.forEach(it=>{
      if(it.date !== iso) return;
      if(it.unit === "min") workMin += Number(it.value)||0;
      // if unit is reps/sec/kg we don't count minutes; user can log minutes entries explicitly
    });

    const budgetTarget = Number(localStorage.getItem("bl_budget_daily") || 60) || 60;
    const kcalTarget = Number(localStorage.getItem("bl_kcal_target") || 2100) || 2100;
    const workTarget = Number(localStorage.getItem("bl_work_target") || 60) || 60;

    const pMoney = Math.min(100, (spent / budgetTarget) * 100);
    const pKcal = Math.min(100, (kcal / kcalTarget) * 100);
    const pWork = Math.min(100, (workMin / workTarget) * 100);

    // Energy heuristic
    const e1 = 100 - pMoney;                  // less spending is better
    const e2 = 100 - Math.abs(100 - pKcal);   // closer to target is better
    const e3 = pWork;                         // more workout minutes is better
    let energy = Math.round((e1*0.35 + e2*0.35 + e3*0.30));
    energy = Math.max(0, Math.min(100, energy));

    return {spent, income, kcal, workMin, budgetTarget, kcalTarget, workTarget, energy};
  }

  function renderDashboardLive(){
    // Only if dashboard elements exist
    const ringPct = document.getElementById("ringPct");
    if(!ringPct) return;

    const d = computeDashboard();

    // Text
    setTextSafe("ringMoney", formatMoney(d.spent) + " / " + formatMoney(d.budgetTarget));
    setTextSafe("ringKcal", Math.round(d.kcal).toLocaleString() + " kcal");
    setTextSafe("ringPct", d.energy + "%");

    // Bars (if exist)
    setWidthSafe("barMoney", (d.spent/d.budgetTarget)*100);
    setWidthSafe("barKcal", (d.kcal/d.kcalTarget)*100);
    setWidthSafe("barWork", (d.workMin/d.workTarget)*100);

    // SVG ring
    if(typeof setRingProgressV49 === "function") setRingProgressV49(d.energy);
  }

  function setTextSafe(id, t){
    const el = document.getElementById(id);
    if(el) el.textContent = t;
  }
  function setWidthSafe(id, pct){
    const el = document.getElementById(id);
    if(!el) return;
    const p = Math.max(0, Math.min(100, pct||0));
    el.style.width = p + "%";
  }

  function formatMoney(n){
    const v = Number(n)||0;
    try{ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v); }
    catch(e){ return "$"+Math.round(v); }
  }

  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  // ---------- Bottom nav behavior ----------
  function bindBottomNav(){
    const nav = document.querySelector(".bottomNav");
    if(!nav) return;
    nav.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-open]");
      if(!btn) return;
      const id = btn.getAttribute("data-open");
      if(typeof showPanel === "function") showPanel(id);
      nav.querySelectorAll(".bnItem").forEach(b=>b.classList.remove("active"));
      if(btn.classList.contains("bnItem")) btn.classList.add("active");
    });

    const add = document.getElementById("bnAdd");
    if(add){
      add.addEventListener("click", ()=>{
        // Quick add -> open a simple chooser by routing to finance (fastest) and focusing input
        if(typeof showPanel === "function") showPanel("finance");
        setTimeout(()=>{ const el = document.getElementById("finDesc"); if(el) el.focus(); }, 250);
      });
    }
  }

  // ---------- Bind forms ----------
  function bindForms(){
    // dates default to today
    ["finDate","nutDate","logDate"].forEach(id=>{
      const el = document.getElementById(id);
      if(el && !el.value) el.value = todayISO();
    });

    const finForm = document.getElementById("finForm");
    if(finForm){
      finForm.addEventListener("submit", (e)=>{
        e.preventDefault();
        const desc = (document.getElementById("finDesc").value || "").trim();
        const amount = Number((document.getElementById("finAmount").value || "").replace(",", "."));
        const type = document.getElementById("finType").value;
        const date = document.getElementById("finDate").value || todayISO();
        if(!desc || !isFinite(amount)) return;
        const items = load(FIN_KEY, []);
        items.push({id:uid(), desc, amount, type, date});
        save(FIN_KEY, items);
        finForm.reset();
        document.getElementById("finType").value = type;
        document.getElementById("finDate").value = date;
        renderFinanceCRUD();
        renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497();
      });
    }

    const nutForm = document.getElementById("nutForm");
    if(nutForm){
      nutForm.addEventListener("submit", (e)=>{
        e.preventDefault();
        const food = (document.getElementById("nutFood").value || "").trim();
        const kcal = Number((document.getElementById("nutKcal").value || "").replace(",", "."));
        const protein = (document.getElementById("nutProtein").value || "").trim();
        const date = document.getElementById("nutDate").value || todayISO();
        if(!food || !isFinite(kcal)) return;
        const items = load(NUT_KEY2, []);
        items.push({id:uid(), food, kcal, protein, date});
        save(NUT_KEY2, items);
        nutForm.reset();
        document.getElementById("nutDate").value = date;
        renderNutritionCRUD();
        renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497();
      });
    }

    const logForm = document.getElementById("logForm");
    if(logForm){
      logForm.addEventListener("submit", (e)=>{
        e.preventDefault();
        const exercise = (document.getElementById("logExercise").value || "").trim();
        const value = (document.getElementById("logValue").value || "").trim();
        const unit = document.getElementById("logUnit").value;
        const date = document.getElementById("logDate").value || todayISO();
        if(!exercise || !value) return;
        const items = load(LOG_KEY, []);
        items.push({id:uid(), exercise, value, unit, date});
        save(LOG_KEY, items);
        logForm.reset();
        document.getElementById("logUnit").value = unit;
        document.getElementById("logDate").value = date;
        renderLogCRUD();
        renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497();
      });
    }

    // Clear buttons
    const finClear = document.getElementById("finClear");
    if(finClear) finClear.addEventListener("click", ()=>{ save(FIN_KEY, []); renderFinanceCRUD(); renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497(); });
    const nutClear = document.getElementById("nutClear");
    if(nutClear) nutClear.addEventListener("click", ()=>{ save(NUT_KEY2, []); renderNutritionCRUD(); renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497(); });
    const logClear = document.getElementById("logClear");
    if(logClear) logClear.addEventListener("click", ()=>{ save(LOG_KEY, []); renderLogCRUD(); renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497(); });

    // Delete handlers
    document.addEventListener("click", (e)=>{
      const del = e.target.closest("button[data-del]");
      if(!del) return;
      const kind = del.getAttribute("data-del");
      const id = del.getAttribute("data-id");
      if(!id) return;
      if(kind === "fin"){
        const items = load(FIN_KEY, []).filter(x=>x.id !== id);
        save(FIN_KEY, items);
        renderFinanceCRUD(); renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497();
      }
      if(kind === "nut"){
        const items = load(NUT_KEY2, []).filter(x=>x.id !== id);
        save(NUT_KEY2, items);
        renderNutritionCRUD(); renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497();
      }
      if(kind === "log"){
        const items = load(LOG_KEY, []).filter(x=>x.id !== id);
        save(LOG_KEY, items);
        renderLogCRUD(); renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497();
      }
    }, true);
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    bindBottomNav();
    bindForms();
    renderFinanceCRUD();
    renderNutritionCRUD();
    renderLogCRUD();
    // update dashboard once on load and whenever we go back home
    renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497();
  });

  // Hook into existing showPanel to refresh dashboard when navigating
  const oldShow = window.showPanel;
  if(typeof oldShow === "function"){
    window.showPanel = function(name, opts){
      oldShow(name, opts);
      if(name === "home") renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497();
      if(name === "finance") renderFinanceCRUD();
      if(name === "nutrition") renderNutritionCRUD();
      if(name === "log") renderLogCRUD();
    };
  }
})();


// ===== V497_PLAN_DATA (from v4.2 plan) =====
const WEEK_PLAN_V42 = [
  { day:"Понеделник", focus:"Push + Planche (тежко) + Handstand",
    items:[
      "Загрявка: 8–12 мин (рамена/китки/лопатки) + 2 леки серии",
      "Handstand: Chest-to-wall 5×30–45 сек + 6–10 kick-up опита",
      "Planche: 6–10×6–12 сек (tuck/frog) + leans 3×20 сек",
      "Паралелни: 4×6–10 (или кофички с тежест)",
      "Гимнастически лицеви / PPPU: 3×6–10",
      "Core: Hollow 3×30–45 сек + L-sit 4×10–20 сек",
      "Финиш: 5–10 мин въже (леко) или мобилност"
    ]
  },
  { day:"Вторник", focus:"Pull (тежко) + Flag + Набирания",
    items:[
      "Загрявка: лопатки + ластик 8–10 мин",
      "Flag: 6–10×5–10 сек (tuck/ластик)",
      "Flag negatives: 4×3–6 сек",
      "Набирания тежко: 5×3–6 (тежест ако можеш)",
      "Набирания вариации: archer/commando 3×6–10",
      "Гребане (халка/скрипец): 4×8–12",
      "Biceps + forearms: 3×10–15",
      "Handstand: scap shrugs 3×10 + 3–5 леки опита"
    ]
  },
  { day:"Сряда", focus:"Cardio + футбол/бокс + въже (лека сила)",
    items:[
      "Въже: 10×1 мин (30 сек почивка)",
      "Сянка/лапи: 6×2–3 мин (лека интензивност)",
      "Футбол: техника/спринтове 30–60 мин",
      "Лека сила: push-ups 3×15 + pull-ups 3×6–10",
      "Мобилност: 10–15 мин (рамена/бедра/глезени)"
    ]
  },
  { day:"Четвъртък", focus:"Lower body + gym (силова) + core",
    items:[
      "Клек (или лег преса): 5×5",
      "Румънска тяга: 4×6–10",
      "Напади/Български клек: 3×8–12",
      "Прасци: 4×12–20",
      "Core: hanging leg raises 4×8–12",
      "Кондиция: 8–12 мин леко кардио (по избор)"
    ]
  },
  { day:"Петък", focus:"Upper (обем/умение) + Planche + Pull-up вариации",
    items:[
      "Handstand: 6–10 опита × 10–25 сек + wall line 2×30 сек",
      "Planche: holds 6–8×6–12 сек + leans 3×20 сек",
      "Набирания: wide/close/grip switch 4×6–12",
      "Кофички: 4×8–12",
      "Раменна преса (дъмбели): 3×8–12",
      "Core: hollow rocks 3×20 + side plank 3×30 сек"
    ]
  },
  { day:"Събота", focus:"Футбол + умения (леко)",
    items:[
      "Футбол: мач/тренировка 60–90 мин",
      "Handstand: 8–12 мин лесни опита (или стена)",
      "Planche: leans 3×15–25 сек + PPPU 3×8 (леки)",
      "Мобилност: 10 мин"
    ]
  },
  { day:"Неделя", focus:"Recovery / бокс / леко въже + флаг",
    items:[
      "Леко въже: 10–15 мин",
      "Бокс техника: 20–30 мин",
      "Flag: 1–3 опита × 5–8 сек (само ако си свеж)",
      "Разтягане/ролер: 15–20 мин"
    ]
  }
];

function renderPlanV497(){
  const wrap = document.getElementById("planWeek");
  if(!wrap) return;
  wrap.innerHTML = "";
  WEEK_PLAN_V42.forEach((d, i)=>{
    const card = document.createElement("div");
    card.className = "dayCard";
    card.innerHTML = `
      <div class="dayTop">
        <div>
          <div class="dayName">${d.day}</div>
          <div class="dayFocus">${d.focus}</div>
        </div>
        <button class="dayToggle" type="button" data-plan-toggle="${i}">Покажи</button>
      </div>
      <ul class="dayList">
        ${d.items.map(x=>`<li>${x}</li>`).join("")}
      </ul>
    `;
    wrap.appendChild(card);
  });
}

document.addEventListener("click", (e)=>{
  const btn = e.target.closest("button[data-plan-toggle]");
  if(!btn) return;
  const card = btn.closest(".dayCard");
  if(!card) return;
  card.classList.toggle("open");
  btn.textContent = card.classList.contains("open") ? "Скрий" : "Покажи";
}, true);


// ===== V497_QUICK_MIN =====
document.addEventListener("click", (e)=>{
  const b = e.target.closest("button[data-quickmin]");
  if(!b) return;
  const mins = Number(b.getAttribute("data-quickmin")||0);
  if(!mins) return;

  const key = "bl_log_v1";
  const iso = (function(){
    const d = new Date(Date.now() - new Date().getTimezoneOffset()*60000);
    return d.toISOString().slice(0,10);
  })();
  const uid = Math.random().toString(36).slice(2) + Date.now().toString(36);

  let items = [];
  try{ items = JSON.parse(localStorage.getItem(key) || "[]"); }catch(e){ items=[]; }
  items.push({ id: uid, exercise: "Workout", value: String(mins), unit: "min", date: iso });
  localStorage.setItem(key, JSON.stringify(items));

  // refresh UI if functions exist
  try{
    if(typeof renderLogCRUD === "function") renderLogCRUD();
  }catch(e){}
  try{
    if(typeof renderDashboardLive === "function") renderDashboardLive();
    if(typeof renderPlanV497==='function') renderPlanV497();
  }catch(e){}

  // feedback
  b.textContent = "✓ " + mins + " мин";
  setTimeout(()=>{ b.textContent = "+" + mins + " мин"; }, 800);
}, true);


// ===== V496_CRUD + LIVE_DASH =====
(function(){
  // Targets (editable via localStorage; defaults are sensible)
  function getNum(key, def){
    var v = Number(localStorage.getItem(key));
    return isFinite(v) && v>0 ? v : def;
  }
  function todayISO2(){
    return (new Date(Date.now() - new Date().getTimezoneOffset()*60000)).toISOString().slice(0,10);
  }

  // ---------- Finance CRUD (edit) ----------
  function finLoadAll(){
    try{ return (typeof loadArr==="function") ? loadArr(FIN_KEY) : JSON.parse(localStorage.getItem(FIN_KEY)||"[]"); }
    catch(e){ return []; }
  }
  function finSaveAll(arr){
    try{ if (typeof saveArr==="function") return saveArr(FIN_KEY, arr); }
    catch(e){}
    try{ localStorage.setItem(FIN_KEY, JSON.stringify(arr)); }catch(e){}
  }

  function enableFinEdit(it){
    var tsEl = document.getElementById("finEditTs");
    if (tsEl) tsEl.value = it.ts || "";
    var t = document.getElementById("finType"); if (t) t.value = it.type || "expense";
    var a = document.getElementById("finAmount"); if (a) a.value = it.amount || "";
    var c = document.getElementById("finCat"); if (c) c.value = it.cat || "";
    var n = document.getElementById("finNote"); if (n) n.value = it.note || "";
    var btn = document.getElementById("finSave");
    if (btn) btn.textContent = "Обнови";
  }
  function resetFinEdit(){
    var tsEl = document.getElementById("finEditTs");
    if (tsEl) tsEl.value = "";
    var btn = document.getElementById("finSave");
    if (btn) btn.textContent = "Запази";
  }

  // Patch existing finance save handler: wrap click and do update if editing
  document.addEventListener("click", function(e){
    var btn = e.target.closest("#finSave");
    if (!btn) return;
    // let existing handler run first; we'll override by stopping default and performing our own
    e.preventDefault(); e.stopPropagation();

    var type = (document.getElementById("finType")||{}).value || "expense";
    var amount = Number(((document.getElementById("finAmount")||{}).value||"").toString().replace(",", "."));
    if (!isFinite(amount) || amount <= 0) return alert("Въведи сума > 0");
    var rec = {
      type: type,
      amount: Math.round(amount*100)/100,
      cat: ((document.getElementById("finCat")||{}).value||"").trim(),
      note: ((document.getElementById("finNote")||{}).value||"").trim(),
      date: (typeof todayISO==="function") ? todayISO() : todayISO2(),
      ts: new Date().toISOString()
    };

    var tsEl = document.getElementById("finEditTs");
    var editTs = tsEl ? (tsEl.value||"") : "";
    var all = finLoadAll();
    if (editTs){
      var idx = all.findIndex(x=>x.ts===editTs);
      if (idx>=0){
        rec.ts = editTs; // keep identity
        all[idx] = rec;
      } else {
        all.push(rec);
      }
      resetFinEdit();
    } else {
      all.push(rec);
    }
    finSaveAll(all);

    // clear inputs
    var a = document.getElementById("finAmount"); if (a) a.value="";
    var c = document.getElementById("finCat"); if (c) c.value="";
    var n = document.getElementById("finNote"); if (n) n.value="";
    // refresh UI
    try{ if (typeof renderFinance==="function") renderFinance(); }catch(err){}
    try{ if (typeof initDashboard==="function") initDashboard(); }catch(err){}
  }, true);

  // Add edit buttons to finance list rows (after render)
  var _oldRenderFinance = (typeof renderFinance==="function") ? renderFinance : null;
  if (_oldRenderFinance){
    window.renderFinance = function(){
      _oldRenderFinance();
      var list = document.getElementById("finList");
      if (!list) return;
      var items = finLoadAll().slice().sort((a,b)=> (b.ts||"").localeCompare(a.ts||""));
      var rows = Array.from(list.querySelectorAll(".item"));
      rows.forEach((row, i)=>{
        var it = items[i];
        if (!it) return;
        var right = row.querySelector(".right");
        if (!right) return;
        if (right.querySelector(".editBtn")) return;
        var edit = document.createElement("button");
        edit.type="button";
        edit.className="iconBtn editBtn";
        edit.textContent="✏️";
        edit.addEventListener("click", function(ev){
          ev.preventDefault(); ev.stopPropagation();
          enableFinEdit(it);
          // scroll to form
          var amt = document.getElementById("finAmount");
          if (amt) amt.scrollIntoView({behavior:"smooth", block:"center"});
        });
        right.insertBefore(edit, right.firstChild);
      });
    };
  }

  // ---------- Nutrition CRUD (edit + delete) ----------
  function nutLoadAll(){
    try{ return (typeof nutLoad==="function") ? nutLoad() : JSON.parse(localStorage.getItem(NUT_KEY)||"[]"); }
    catch(e){ return []; }
  }
  function nutSaveAll(arr){
    try{ if (typeof nutSaveArr==="function") return nutSaveArr(arr); }
    catch(e){}
    try{ localStorage.setItem(NUT_KEY, JSON.stringify(arr)); }catch(e){}
  }

  function enableNutEdit(it){
    var tsEl = document.getElementById("nutEditTs");
    if (tsEl) tsEl.value = it.ts || "";
    var f = document.getElementById("nutFood"); if (f) f.value = it.food || "";
    var k = document.getElementById("nutKcal"); if (k) k.value = (it.kcal!=null? it.kcal : "");
    // photo not auto restored into input; keep cached photo
    if (typeof _nutPhotoCache !== "undefined") _nutPhotoCache = it.photo || "";
    var wrap = document.getElementById("nutPreviewWrap");
    var img = document.getElementById("nutPreview");
    if (wrap && img && it.photo){
      img.src = it.photo;
      wrap.style.display="block";
    }
    var btn = document.getElementById("nutSave");
    if (btn) btn.textContent="Обнови";
  }
  function resetNutEdit(){
    var tsEl = document.getElementById("nutEditTs");
    if (tsEl) tsEl.value="";
    var btn = document.getElementById("nutSave");
    if (btn) btn.textContent="Запази";
  }

  // Override nut save click for edit support
  document.addEventListener("click", function(e){
    var btn = e.target.closest("#nutSave");
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();

    var food = ((document.getElementById("nutFood")||{}).value||"").trim();
    if (!food) return alert("Въведи храна.");
    var kcal = Number(((document.getElementById("nutKcal")||{}).value||"").toString().replace(",", "."));
    if (!isFinite(kcal) || kcal < 0) kcal = null;

    var rec = {
      date: (typeof todayISO==="function") ? todayISO() : todayISO2(),
      food: food,
      kcal: kcal ? Math.round(kcal) : null,
      photo: (typeof _nutPhotoCache !== "undefined" ? (_nutPhotoCache || null) : null),
      ts: new Date().toISOString()
    };

    var tsEl = document.getElementById("nutEditTs");
    var editTs = tsEl ? (tsEl.value||"") : "";
    var all = nutLoadAll();
    if (editTs){
      var idx = all.findIndex(x=>x.ts===editTs);
      if (idx>=0){
        rec.ts = editTs;
        all[idx] = rec;
      } else {
        all.push(rec);
      }
      resetNutEdit();
    } else {
      all.push(rec);
    }
    nutSaveAll(all);

    // clear fields
    var f = document.getElementById("nutFood"); if (f) f.value="";
    var k = document.getElementById("nutKcal"); if (k) k.value="";
    if (typeof _nutPhotoCache !== "undefined") _nutPhotoCache="";
    var p = document.getElementById("nutPhoto"); if (p) p.value="";
    var wrap = document.getElementById("nutPreviewWrap"); if (wrap) wrap.style.display="none";
    var img = document.getElementById("nutPreview"); if (img) img.src="";

    try{ if (typeof renderNutrition==="function") renderNutrition(); }catch(err){}
    try{ if (typeof initDashboard==="function") initDashboard(); }catch(err){}
  }, true);

  // Enhance nutrition list with edit/delete
  var _oldRenderNut = (typeof renderNutrition==="function") ? renderNutrition : null;
  if (_oldRenderNut){
    window.renderNutrition = function(){
      _oldRenderNut();
      var list = document.getElementById("nutList");
      if (!list) return;

      var items = nutLoadAll().slice().reverse(); // render order used
      var rows = Array.from(list.querySelectorAll(".item"));
      rows.forEach((row, i)=>{
        var it = items[i];
        if (!it) return;

        if (row.querySelector(".rightActions")) return;
        var actions = document.createElement("div");
        actions.className = "rightActions";
        actions.style.marginTop = "10px";

        var edit = document.createElement("button");
        edit.type="button";
        edit.className="iconBtn";
        edit.textContent="✏️";
        edit.addEventListener("click", function(ev){
          ev.preventDefault(); ev.stopPropagation();
          enableNutEdit(it);
          var foodEl = document.getElementById("nutFood");
          if (foodEl) foodEl.scrollIntoView({behavior:"smooth", block:"center"});
        });

        var del = document.createElement("button");
        del.type="button";
        del.className="iconBtn";
        del.textContent="🗑️";
        del.addEventListener("click", function(ev){
          ev.preventDefault(); ev.stopPropagation();
          if (!confirm("Да изтрия ли този запис за хранене?")) return;
          var all = nutLoadAll().filter(x=>x.ts !== it.ts);
          nutSaveAll(all);
          try{ window.renderNutrition(); }catch(err){}
          try{ if (typeof initDashboard==="function") initDashboard(); }catch(err){}
        });

        actions.appendChild(edit);
        actions.appendChild(del);
        row.appendChild(actions);
      });
    };
  }

  // ---------- Live Dashboard ring ----------
  // Override initDashboard to compute from real local data (finance, nutrition, workouts)
  var _oldDash = (typeof initDashboard==="function") ? initDashboard : null;
  if (_oldDash){
    window.initDashboard = function(){
      _oldDash();

      var iso = todayISO2();

      // finance: sum today's expense
      var fin = finLoadAll();
      var spent = 0;
      for (var i=0;i<fin.length;i++){
        var it = fin[i];
        if ((it.date||"") === iso && (it.type||"") === "expense") spent += Number(it.amount)||0;
      }
      var budget = getNum("balanced_life_budget_target", 60);

      // nutrition: today's kcal
      var nut = nutLoadAll();
      var kcal = 0;
      for (var j=0;j<nut.length;j++){
        var it2 = nut[j];
        if ((it2.date||"") === iso) kcal += Number(it2.kcal)||0;
      }
      kcal = Math.round(kcal);
      var kcalTarget = getNum("balanced_life_kcal_target", 2100);

      // workouts: if there is log module with entries in LS_KEY structure, try to read minutes/done.
      var workMin = 0;
      try{
        var state = JSON.parse(localStorage.getItem("balanced_life_v1")||"{}");
        var entries = state.entries || state.log || state.items || [];
        for (var k=0;k<entries.length;k++){
          var e = entries[k];
          if ((e.date||"") === iso && (e.done||"") === "yes"){
            workMin += Number(e.minutes||e.duration||45)||0;
          }
        }
      }catch(e){}
      var workTarget = getNum("balanced_life_work_target", 60);

      // Update visible numbers if present
      var rm = document.getElementById("ringMoney");
      if (rm) rm.textContent = `${spent.toFixed(0)} / ${budget.toFixed(0)} лв`;
      var rk = document.getElementById("ringKcal");
      if (rk) rk.textContent = `${kcal} / ${kcalTarget} kcal`;

      // bars
      function setW(id, pct){
        var el = document.getElementById(id);
        if (el) el.style.width = Math.max(0, Math.min(100, pct)) + "%";
      }
      setW("barMoney", budget ? (spent/budget*100) : 0);
      setW("barKcal", kcalTarget ? (kcal/kcalTarget*100) : 0);
      setW("barWork", workTarget ? (workMin/workTarget*100) : 0);

      // Energy score: low spend + good kcal alignment + workouts
      var pMoney = budget ? (spent/budget*100) : 0;
      var pK = kcalTarget ? (kcal/kcalTarget*100) : 0;
      var pW = workTarget ? (workMin/workTarget*100) : 0;

      var e1 = 100 - Math.min(100, pMoney);
      var e2 = 100 - Math.abs(100 - Math.min(200, pK));
      var e3 = Math.min(100, pW);
      var energy = Math.round((e1*0.35 + e2*0.35 + e3*0.30));
      energy = Math.max(0, Math.min(100, energy));

      var rp = document.getElementById("ringPct");
      if (rp) rp.textContent = energy + "%";
      if (typeof setRingProgressV49 === "function") setRingProgressV49(energy);
    };
  }
})();


// ===== V497_TARGETS_AND_PLAN =====
(function(){
  function num(v, def){
    const n = Number(String(v||"").replace(",", "."));
    return (isFinite(n) && n>0) ? n : def;
  }

  function loadTargetsToUI(){
    const b = document.getElementById("tBudget");
    const k = document.getElementById("tKcal");
    const w = document.getElementById("tWork");
    if(!b || !k || !w) return;
    b.value = localStorage.getItem("balanced_life_budget_target") || "60";
    k.value = localStorage.getItem("balanced_life_kcal_target") || "2100";
    w.value = localStorage.getItem("balanced_life_work_target") || "60";
  }

  function bindTargets(){
    const form = document.getElementById("targetsForm");
    if(!form) return;
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const b = document.getElementById("tBudget");
      const k = document.getElementById("tKcal");
      const w = document.getElementById("tWork");
      if(!b || !k || !w) return;
      localStorage.setItem("balanced_life_budget_target", String(num(b.value, 60)));
      localStorage.setItem("balanced_life_kcal_target", String(num(k.value, 2100)));
      localStorage.setItem("balanced_life_work_target", String(num(w.value, 60)));
      try{ if(typeof initDashboard==="function") initDashboard(); }catch(err){}
      alert("Запазено ✅");
    });
  }

  function renderPlanFull(){
    const root = document.getElementById("planFullV42");
    if(!root) return;
    if(typeof WEEKLY_PLAN_FULL_V42 === "undefined" || !Array.isArray(WEEKLY_PLAN_FULL_V42)){
      root.innerHTML = '<div class="muted">Липсват данни за плана.</div>';
      return;
    }
    root.innerHTML = "";
    WEEKLY_PLAN_FULL_V42.forEach(day=>{
      const card = document.createElement("div");
      card.className = "planDay";
      const head = document.createElement("div");
      head.className = "planDayHead";
      head.innerHTML = `
        <div class="planDayTitle">${day.day || ""}</div>
        <div class="planDayFocus">${day.focus || ""}</div>
      `;
      card.appendChild(head);

      const list = document.createElement("div");
      list.className = "planItems";
      (day.items||[]).forEach(txt=>{
        const row = document.createElement("div");
        row.className = "planItem";
        row.innerHTML = `<span class="planDot"></span><div class="planTxt">${escapeHtml(txt)}</div>`;
        list.appendChild(row);
      });
      card.appendChild(list);

      if(day.note){
        const note = document.createElement("div");
        note.className = "planNote";
        note.textContent = day.note;
        card.appendChild(note);
      }
      root.appendChild(card);
    });
  }

  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    loadTargetsToUI();
    bindTargets();
    renderPlanFull();
  });

  const oldShow = window.showPanel;
  if(typeof oldShow === "function"){
    window.showPanel = function(name, opts){
      oldShow(name, opts);
      if(name === "settings") loadTargetsToUI();
      if(name === "plan") renderPlanFull();
    };
  }
})();


// ===== V500: Daily Check-in + Streaks + Skills + Journal + Review + QuickAdd =====
(function(){
  const CHECKIN_KEY = "bl_checkin_v1";
  const SKILL_KEY = "bl_skills_v1";
  const JOURNAL_KEY = "bl_journal_v1";

  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));

  function isoDate(d){
    const dt = new Date(d);
    const x = new Date(dt.getTime() - dt.getTimezoneOffset()*60000);
    return x.toISOString().slice(0,10);
  }
  function todayISO(){
    return isoDate(Date.now());
  }
  function daysAgo(n){
    const d = new Date();
    d.setDate(d.getDate()-n);
    return isoDate(d);
  }
  function load(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }
  function save(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }
  function uid(){
    return Math.random().toString(36).slice(2)+Date.now().toString(36);
  }
  function esc(s){
    return String(s||"").replace(/[&<>"']/g,(c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  // ----- Check-in + streaks -----
  function computeStreak(map, field){
    let streak = 0;
    for(let i=0;i<365;i++){
      const d = daysAgo(i);
      const r = map[d];
      if(r && r[field]) streak++;
      else break;
    }
    return streak;
  }

  function loadCheckinUI(){
    const m = load(CHECKIN_KEY, {});
    const t = todayISO();
    const r = m[t] || {workout:false, nutrition:false, budget:false, mood:1};

    const a = $("#ciWorkout"), b = $("#ciNutrition"), c = $("#ciBudget"), mood = $("#ciMood");
    if(a) a.checked = !!r.workout;
    if(b) b.checked = !!r.nutrition;
    if(c) c.checked = !!r.budget;
    if(mood) mood.value = String(r.mood ?? 1);

    // streaks
    setText("stWorkout", computeStreak(m, "workout"));
    setText("stNutrition", computeStreak(m, "nutrition"));
    setText("stBudget", computeStreak(m, "budget"));
  }

  function saveCheckin(){
    const m = load(CHECKIN_KEY, {});
    const t = todayISO();
    m[t] = {
      workout: !!($("#ciWorkout") && $("#ciWorkout").checked),
      nutrition: !!($("#ciNutrition") && $("#ciNutrition").checked),
      budget: !!($("#ciBudget") && $("#ciBudget").checked),
      mood: Number(($("#ciMood") && $("#ciMood").value) || 0)
    };
    save(CHECKIN_KEY, m);
    loadCheckinUI();
    try{ if(typeof initDashboard==="function") initDashboard(); }catch(e){}
  }

  // ----- Skills tracker -----
  function renderSkills(){
    const list = $("#skillList");
    const sum = $("#skillsSummary");
    if(!list || !sum) return;

    const items = load(SKILL_KEY, []);
    list.innerHTML = "";
    const by = {handstand:[], planche:[], flag:[]};
    items.forEach(x=>{ if(by[x.name]) by[x.name].push(x); });

    function prFor(name){
      const arr = (by[name]||[]).slice().sort((a,b)=>Number(b.value)-Number(a.value));
      return arr[0] ? `${arr[0].value} ${arr[0].unit}` : "—";
    }
    sum.innerHTML = `
      <div class="skillPR">Handstand PR <span>${prFor("handstand")}</span></div>
      <div class="skillPR">Planche PR <span>${prFor("planche")}</span></div>
      <div class="skillPR">Flag PR <span>${prFor("flag")}</span></div>
    `;

    items.slice().reverse().slice(0,60).forEach(it=>{
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${it.name}</div>
          <div class="itemMeta">${it.date} • ${it.value} ${it.unit}</div>
        </div>
        <div class="itemBtns">
          <button class="smallBtn" data-skill-del="${it.id}">✕</button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  function bindSkills(){
    const date = $("#skillDate");
    if(date && !date.value) date.value = todayISO();

    const form = $("#skillForm");
    if(form){
      form.addEventListener("submit", (e)=>{
        e.preventDefault();
        const name = $("#skillName").value;
        const value = Number(($("#skillValue").value||"").replace(",", "."));
        const unit = $("#skillUnit").value;
        const dateV = $("#skillDate").value || todayISO();
        if(!isFinite(value)) return;
        const items = load(SKILL_KEY, []);
        items.push({id:uid(), name, value: Math.round(value*100)/100, unit, date: dateV});
        save(SKILL_KEY, items);
        $("#skillValue").value="";
        renderSkills();
        try{ if(typeof initDashboard==="function") initDashboard(); }catch(e){}
      });
    }

    const clear = $("#skillClear");
    if(clear){
      clear.addEventListener("click", ()=>{
        save(SKILL_KEY, []);
        renderSkills();
        try{ if(typeof initDashboard==="function") initDashboard(); }catch(e){}
      });
    }

    document.addEventListener("click",(e)=>{
      const b = e.target.closest("[data-skill-del]");
      if(!b) return;
      const id = b.getAttribute("data-skill-del");
      const items = load(SKILL_KEY, []).filter(x=>x.id!==id);
      save(SKILL_KEY, items);
      renderSkills();
      try{ if(typeof initDashboard==="function") initDashboard(); }catch(e){}
    }, true);
  }

  // ----- Journal -----
  function renderJournal(){
    const list = $("#jrList");
    if(!list) return;
    const items = load(JOURNAL_KEY, []);
    list.innerHTML = "";
    items.slice().reverse().slice(0,30).forEach(it=>{
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${it.date}</div>
          <div class="itemMeta">${esc(it.text).slice(0,120)}${it.text.length>120?"…":""}</div>
        </div>
        <div class="itemBtns">
          <button class="smallBtn" data-jr-load="${it.id}">↩︎</button>
          <button class="smallBtn" data-jr-del="${it.id}">✕</button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  function loadJournalForToday(){
    const t = todayISO();
    const items = load(JOURNAL_KEY, []);
    const it = items.slice().reverse().find(x=>x.date===t);
    if($("#jrText")) $("#jrText").value = it ? it.text : "";
  }

  function bindJournal(){
    const saveBtn = $("#jrSave");
    if(saveBtn){
      saveBtn.addEventListener("click", ()=>{
        const text = ($("#jrText").value||"").trim();
        const t = todayISO();
        const items = load(JOURNAL_KEY, []);
        // replace today
        const rest = items.filter(x=>x.date!==t);
        if(text) rest.push({id:uid(), date:t, text});
        save(JOURNAL_KEY, rest);
        renderJournal();
        try{ if(typeof initDashboard==="function") initDashboard(); }catch(e){}
      });
    }
    const clearBtn = $("#jrClear");
    if(clearBtn){
      clearBtn.addEventListener("click", ()=>{
        if($("#jrText")) $("#jrText").value="";
      });
    }
    document.addEventListener("click",(e)=>{
      const loadBtn = e.target.closest("[data-jr-load]");
      if(loadBtn){
        const id = loadBtn.getAttribute("data-jr-load");
        const it = load(JOURNAL_KEY, []).find(x=>x.id===id);
        if(it && $("#jrText")) $("#jrText").value = it.text;
      }
      const delBtn = e.target.closest("[data-jr-del]");
      if(delBtn){
        const id = delBtn.getAttribute("data-jr-del");
        const items = load(JOURNAL_KEY, []).filter(x=>x.id!==id);
        save(JOURNAL_KEY, items);
        renderJournal();
      }
    }, true);
  }

  // ----- Weekly review -----
  function renderReview(){
    const grid = $("#reviewGrid");
    const tips = $("#reviewTips");
    if(!grid || !tips) return;

    const c = load(CHECKIN_KEY, {});
    let w=0,n=0,b=0,mood=0,count=0;
    grid.innerHTML = "";
    for(let i=6;i>=0;i--){
      const d = daysAgo(i);
      const r = c[d] || {};
      const ww = !!r.workout, nn=!!r.nutrition, bb=!!r.budget;
      w += ww?1:0; n += nn?1:0; b += bb?1:0;
      mood += Number(r.mood||0); count += (r.mood!=null?1:0);

      const card = document.createElement("div");
      card.className="reviewCard";
      card.innerHTML = `
        <div class="reviewDay">${d.slice(5)}</div>
        <div class="reviewMeta">${ww?"🏋️":"—"} ${nn?"🥗":"—"} ${bb?"💰":"—"}</div>
      `;
      grid.appendChild(card);
    }
    const avgMood = count ? (mood/count).toFixed(1) : "—";
    const msg = [];
    msg.push(`Тренировки: ${w}/7 • Хранене: ${n}/7 • Бюджет: ${b}/7 • Mood avg: ${avgMood}`);
    if(w<3) msg.push("Tip: сложи 3 по-къси тренировки (30 мин) вместо 1 дълга.");
    if(n<4) msg.push("Tip: добави protein шаблон (яйца/кисело мляко) за бързи дни.");
    if(b<4) msg.push("Tip: запиши 1–2 основни разхода като шаблон, за да не ги пропускаш.");
    tips.textContent = msg.join("  •  ");
  }

  // ----- Quick Add modal -----
  function showModal(show){
    const m = $("#qaModal");
    if(!m) return;
    m.classList.toggle("hidden", !show);
    m.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function bindQuickAdd(){
    // hook plus button (if exists)
    const addBtn = $("#bnAdd");
    if(addBtn){
      addBtn.addEventListener("click", ()=>showModal(true));
    }
    const close = $("#qaClose");
    if(close) close.addEventListener("click", ()=>showModal(false));
    const modal = $("#qaModal");
    if(modal){
      modal.addEventListener("click", (e)=>{
        if(e.target === modal) showModal(false);
      });
    }
    document.addEventListener("click", (e)=>{
      const b = e.target.closest("[data-qa]");
      if(!b) return;
      const type = b.getAttribute("data-qa");
      showModal(false);
      if(typeof showPanel !== "function") return;
      if(type==="expense"){ showPanel("finance"); setTimeout(()=>{ const t=$("#finType"); if(t) t.value="expense"; const d=$("#finDesc"); if(d) d.focus(); }, 250); }
      if(type==="income"){ showPanel("finance"); setTimeout(()=>{ const t=$("#finType"); if(t) t.value="income"; const d=$("#finDesc"); if(d) d.focus(); }, 250); }
      if(type==="food"){ showPanel("nutrition"); setTimeout(()=>{ const f=$("#nutFood"); if(f) f.focus(); }, 250); }
      if(type==="skill"){ showPanel("skills"); setTimeout(()=>{ const v=$("#skillValue"); if(v) v.focus(); }, 250); }
      if(type==="checkin"){ showPanel("checkin"); }
      if(type==="note"){ showPanel("journal"); setTimeout(()=>{ const t=$("#jrText"); if(t) t.focus(); }, 250); }
    }, true);
  }

  // ----- Dashboard ring: incorporate check-in mood + skills PR bonus -----
  const oldDash = (typeof initDashboard==="function") ? initDashboard : null;
  if(oldDash){
    window.initDashboard = function(){
      oldDash();
      // add mood effect
      const c = load(CHECKIN_KEY, {});
      const r = c[todayISO()] || {};
      const mood = Number(r.mood||0);
      const pctEl = document.getElementById("ringPct");
      if(!pctEl) return;

      const cur = Number(String(pctEl.textContent||"0").replace("%","")) || 0;
      // skills PR bonus if today logged
      const skills = load(SKILL_KEY, []);
      const bonus = skills.some(x=>x.date===todayISO()) ? 3 : 0;
      let next = Math.max(0, Math.min(100, cur + mood*2 + bonus));
      pctEl.textContent = next + "%";
      if(typeof setRingProgressV49==="function") setRingProgressV49(next);
    };
  }

  function setText(id, v){
    const el = document.getElementById(id);
    if(el) el.textContent = String(v);
  }

  // ----- Bind everything on load and when navigating -----
  document.addEventListener("DOMContentLoaded", ()=>{
    // check-in
    loadCheckinUI();
    const ciSave = $("#ciSave");
    if(ciSave) ciSave.addEventListener("click", saveCheckin);

    // skills
    const sd = $("#skillDate");
    if(sd && !sd.value) sd.value = todayISO();
    bindSkills();
    renderSkills();

    // journal
    loadJournalForToday();
    bindJournal();
    renderJournal();

    // review
    renderReview();

    // quick add
    bindQuickAdd();
  });

  // refresh when panels open
  const oldShow = window.showPanel;
  if(typeof oldShow === "function"){
    window.showPanel = function(name, opts){
      oldShow(name, opts);
      if(name==="checkin") loadCheckinUI();
      if(name==="skills") renderSkills();
      if(name==="journal"){ loadJournalForToday(); renderJournal(); }
      if(name==="review") renderReview();
    };
  }
})();


// ===== V51_ROUTE_FIX (Chrome) =====
(function(){
  document.addEventListener("click", (e)=>{
    const t = e.target.closest("[data-open]");
    if(!t) return;
    const id = t.getAttribute("data-open");
    if(!id) return;
    // Prevent any accidental default on buttons/links
    e.preventDefault();
    // If modal overlay somehow exists, hide it
    const m = document.getElementById("qaModal");
    if(m && !m.classList.contains("hidden")) m.classList.add("hidden");
    if(typeof window.showPanel === "function") window.showPanel(id);
  }, true);
})();


// ===== V51_FEATURES (templates, monthly, sparklines, PR badge) =====
(function(){
  const FIN_KEY = "bl_fin_v1";
  const NUT_KEY = "bl_nut_v1";
  const SKILL_KEY = "bl_skills_v1";

  const $ = (s)=>document.querySelector(s);

  function load(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
  function isoToday(){
    const d = new Date(Date.now() - new Date().getTimezoneOffset()*60000);
    return d.toISOString().slice(0,10);
  }
  function monthKey(dStr){
    // YYYY-MM
    return (dStr||"").slice(0,7);
  }
  function esc(s){
    return String(s||"").replace(/[&<>"']/g,(c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  // ----- Nutrition templates -----
  function bindTemplates(){
    document.addEventListener("click",(e)=>{
      const b = e.target.closest("[data-tpl-food]");
      if(!b) return;
      const raw = b.getAttribute("data-tpl-food") || "";
      const [food,kcal,protein] = raw.split("|");
      if(typeof window.showPanel === "function") window.showPanel("nutrition");
      setTimeout(()=>{
        const f = document.getElementById("nutFood");
        const k = document.getElementById("nutKcal");
        const p = document.getElementById("nutProtein");
        const d = document.getElementById("nutDate");
        if(d && !d.value) d.value = isoToday();
        if(f) f.value = food || "";
        if(k) k.value = kcal || "";
        if(p) p.value = protein || "";
        if(f) f.focus();
      }, 200);
    }, true);
  }

  // ----- Finance monthly overview + safe-to-spend -----
  function getBudgetDaily(){
    const v = Number(localStorage.getItem("balanced_life_budget_target")||"60");
    return (isFinite(v) && v>0) ? v : 60;
  }

  function computeSafeToSpend(finItems){
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const start = new Date(y,m,1);
    const end = new Date(y,m+1,0);
    const daysInMonth = end.getDate();
    const day = now.getDate();

    let spent = 0;
    finItems.forEach(it=>{
      if((it.type||"")!=="expense") return;
      if(!it.date) return;
      const dt = new Date(it.date+"T00:00:00");
      if(dt.getFullYear()===y && dt.getMonth()===m) spent += Number(it.amount)||0;
    });

    const monthlyBudget = getBudgetDaily() * daysInMonth;
    const remaining = Math.max(0, monthlyBudget - spent);
    const daysLeft = Math.max(1, daysInMonth - day + 1);
    const perDay = remaining / daysLeft;

    return {spent, monthlyBudget, remaining, daysLeft, perDay};
  }

  function renderMonthly(){
    const list = document.getElementById("finMonthly");
    const safe = document.getElementById("safeSpend");
    const monthInput = document.getElementById("finMonth");
    if(!list || !safe || !monthInput) return;

    const fin = load(FIN_KEY, []);
    // default month to current
    const now = new Date();
    const cur = now.toISOString().slice(0,7);
    if(!monthInput.value) monthInput.value = cur;
    const targetMonth = monthInput.value;

    // safe-to-spend uses current month always
    const s = computeSafeToSpend(fin);
    safe.textContent = `Safe to spend today: ~ ${Math.round(s.perDay)} лв (ост. ${Math.round(s.remaining)} лв, ${s.daysLeft} дни)`;

    // category sums for selected month
    const cat = {};
    fin.forEach(it=>{
      if(!it.date) return;
      if(monthKey(it.date) !== targetMonth) return;
      const type = it.type || "expense";
      const c = (it.cat && it.cat.trim()) ? it.cat.trim() : (type==="income"?"Приход":"Друго");
      const sign = (type==="income") ? 1 : -1;
      cat[c] = (cat[c]||0) + sign*(Number(it.amount)||0);
    });

    const rows = Object.entries(cat).sort((a,b)=>Math.abs(b[1]) - Math.abs(a[1]));
    list.innerHTML = "";
    if(!rows.length){
      list.innerHTML = `<div class="muted">Няма записи за този месец.</div>`;
      return;
    }
    rows.forEach(([name, amt])=>{
      const row = document.createElement("div");
      row.className = "catRow";
      row.innerHTML = `<div class="catName">${esc(name)}</div><div class="catAmt">${Math.round(amt)} лв</div>`;
      list.appendChild(row);
    });
  }

  function bindMonthly(){
    const btn = document.getElementById("finMonthRefresh");
    if(btn) btn.addEventListener("click", renderMonthly);
  }

  // ----- Skills sparklines + PR badge -----
  function sparkPath(values, w=220, h=44, pad=4){
    if(!values.length) return "";
    const min = Math.min(...values), max = Math.max(...values);
    const span = (max-min) || 1;
    const step = (w - pad*2) / Math.max(1, values.length-1);
    return values.map((v,i)=>{
      const x = pad + i*step;
      const y = pad + (h - pad*2) * (1 - (v - min)/span);
      return (i===0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }).join(" ");
  }

  function renderSparks(){
    const grid = document.getElementById("sparkGrid");
    if(!grid) return;

    const items = load(SKILL_KEY, []);
    const names = [
      ["handstand","Handstand"],
      ["planche","Planche"],
      ["flag","Human Flag"]
    ];
    const today = isoToday();

    grid.innerHTML = "";
    names.forEach(([key,label])=>{
      const arr = items.filter(x=>x.name===key).slice().sort((a,b)=> (a.date||"").localeCompare(b.date||""));
      const last14 = arr.slice(-14);
      const vals = last14.map(x=>Number(x.value)||0);
      const pr = arr.reduce((m,x)=>Math.max(m, Number(x.value)||0), 0);
      const loggedToday = arr.some(x=>x.date===today);
      const isNewPRToday = loggedToday && pr>0 && arr.filter(x=>x.date===today).some(x=>Number(x.value)===pr);

      const card = document.createElement("div");
      card.className = "sparkCard";
      const badge = isNewPRToday ? `<span class="prBadge">New PR</span>` : ``;
      const d = sparkPath(vals, 220, 44, 4);
      card.innerHTML = `
        <div class="sparkTop">
          <div class="sparkName">${label}${badge}</div>
          <div class="sparkPR">PR: ${pr ? pr : "—"}</div>
        </div>
        <svg class="sparkSvg" viewBox="0 0 220 44" preserveAspectRatio="none" aria-label="sparkline">
          <path d="${d}" fill="none" stroke="rgba(30,58,138,0.65)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      `;
      grid.appendChild(card);
    });
  }

  // Hook into existing renderSkills if exists, so sparklines update
  const oldRenderSkills = window.renderSkills;
  if(typeof oldRenderSkills === "function"){
    window.renderSkills = function(){
      oldRenderSkills();
      renderSparks();
    };
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    bindTemplates();
    bindMonthly();
    // initial renders
    renderMonthly();
    renderSparks();
  });

  // refresh when opening finance/skills
  const oldShow = window.showPanel;
  if(typeof oldShow === "function"){
    window.showPanel = function(name, opts){
      oldShow(name, opts);
      if(name==="finance") renderMonthly();
      if(name==="skills") renderSparks();
    };
  }
})();

// v5.2 hub routing
(function(){
  document.addEventListener("click", (e)=>{
    const t = e.target.closest('[data-open]');
    if(!t) return;
    const id = t.getAttribute('data-open');
    if(id === 'training') { showPanel('trainingHub'); e.preventDefault(); }
    if(id === 'nutrition') { showPanel('nutritionHub'); e.preventDefault(); }
    if(id === 'finance') { showPanel('financeHub'); e.preventDefault(); }
  }, true);
})();


// ===== V53_HOME_DASH =====
(function(){
  const CHECKIN_KEY = "bl_checkin_v1";
  const FIN_KEY = "bl_fin_v1";
  const NUT_KEY = "bl_nut_v1";

  const $ = (s)=>document.querySelector(s);

  function isoToday(){
    const d = new Date(Date.now() - new Date().getTimezoneOffset()*60000);
    return d.toISOString().slice(0,10);
  }
  function daysAgo(n){
    const d = new Date();
    d.setDate(d.getDate()-n);
    const x = new Date(d.getTime() - d.getTimezoneOffset()*60000);
    return x.toISOString().slice(0,10);
  }
  function load(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }

  function streak(map, field){
    let s=0;
    for(let i=0;i<365;i++){
      const d = daysAgo(i);
      const r = map[d];
      if(r && r[field]) s++;
      else break;
    }
    return s;
  }

  function setChip(id, v){
    const el = document.getElementById(id);
    if(el) el.textContent = String(v);
  }

  function setTodayCard(elId, ok, text){
    const el = document.getElementById(elId);
    if(!el) return;
    el.classList.toggle("todayOk", ok === true);
    el.classList.toggle("todayBad", ok === false);
    const v = el.querySelector(".tVal");
    if(v) v.textContent = text;
  }

  function refreshHome(){
    // streaks
    const c = load(CHECKIN_KEY, {});
    setChip("chipWorkout", streak(c,"workout"));
    setChip("chipNutrition", streak(c,"nutrition"));
    setChip("chipBudget", streak(c,"budget"));

    const t = isoToday();
    const r = c[t] || {};

    // today status derives from check-in if present; else infer from data
    const fin = load(FIN_KEY, []);
    const nut = load(NUT_KEY, []);

    const spentToday = fin.filter(x=>x.date===t && x.type==="expense").reduce((a,b)=>a+(Number(b.amount)||0),0);
    const kcalToday = nut.filter(x=>x.date===t).reduce((a,b)=>a+(Number(b.kcal)||0),0);

    const budgetTarget = Number(localStorage.getItem("balanced_life_budget_target")||"60") || 60;
    const kcalTarget = Number(localStorage.getItem("balanced_life_kcal_target")||"2100") || 2100;

    const workoutOK = (r.workout != null) ? !!r.workout : null;
    const nutritionOK = (r.nutrition != null) ? !!r.nutrition : (kcalToday>0 ? (kcalToday>=kcalTarget*0.7 && kcalToday<=kcalTarget*1.3) : null);
    const budgetOK = (r.budget != null) ? !!r.budget : (spentToday>0 ? (spentToday<=budgetTarget) : null);

    setTodayCard("tsWorkout", workoutOK, workoutOK==null?"—":(workoutOK?"Done":"Missing"));
    setTodayCard("tsNutrition", nutritionOK, nutritionOK==null?"—":(nutritionOK?"OK":"Off"));
    setTodayCard("tsBudget", budgetOK, budgetOK==null?"—":(budgetOK?"OK":"Over"));

    // Pulse if all 3 true
    const ring = document.getElementById("ringPctWrap");
    if(ring){
      const all = (workoutOK===true && nutritionOK===true && budgetOK===true);
      ring.classList.toggle("pulseOk", all);
    }

    // Ensure dashboard numbers are updated
    try{ if(typeof initDashboard==="function") initDashboard(); }catch(e){}
  }

  // Quick actions
  document.addEventListener("click",(e)=>{
    const b = e.target.closest("[data-q]");
    if(!b) return;
    const q = b.getAttribute("data-q");
    if(typeof showPanel !== "function") return;
    if(q==="workout"){ showPanel("workoutsDash"); }
    if(q==="food"){ showPanel("nutrition"); setTimeout(()=>{ const f=document.getElementById("nutFood"); if(f) f.focus(); }, 250); }
    if(q==="expense"){ showPanel("finance"); setTimeout(()=>{ const d=document.getElementById("finDesc"); if(d) d.focus(); const t=document.getElementById("finType"); if(t) t.value="expense"; }, 250); }
    if(q==="skill"){ showPanel("skills"); setTimeout(()=>{ const v=document.getElementById("skillValue"); if(v) v.focus(); }, 250); }
  }, true);

  // Refresh on load and whenever home opens
  document.addEventListener("DOMContentLoaded", refreshHome);
  const oldShow = window.showPanel;
  if(typeof oldShow === "function"){
    window.showPanel = function(name, opts){
      oldShow(name, opts);
      if(name==="home") refreshHome();
    };
  }
})();


// ===== V54_PROGRESS (Unified Progress screen) =====
(function(){
  const CHECKIN_KEY = "bl_checkin_v1";
  const FIN_KEY = "bl_fin_v1";
  const NUT_KEY = "bl_nut_v1";
  const SKILL_KEY = "bl_skills_v1";

  let RANGE = 7;

  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));

  function load(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }
  function isoDate(d){
    const dt = new Date(d);
    const x = new Date(dt.getTime() - dt.getTimezoneOffset()*60000);
    return x.toISOString().slice(0,10);
  }
  function daysBack(n){
    const arr = [];
    for(let i=n-1;i>=0;i--){
      const d = new Date();
      d.setDate(d.getDate()-i);
      arr.push(isoDate(d));
    }
    return arr;
  }

  function sparkPath(values, w=260, h=54, pad=6){
    if(!values.length) return "";
    const min = Math.min(...values), max = Math.max(...values);
    const span = (max-min) || 1;
    const step = (w - pad*2) / Math.max(1, values.length-1);
    return values.map((v,i)=>{
      const x = pad + i*step;
      const y = pad + (h - pad*2) * (1 - (v - min)/span);
      return (i===0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }).join(" ");
  }

  function kpiCard(title, value, sub, series){
    const d = sparkPath(series||[]);
    return `
      <div class="kpiCard">
        <div class="kpiTop">
          <div class="kpiTitle">${title}</div>
          <div class="kpiValue">${value}</div>
        </div>
        <div class="kpiSub">${sub}</div>
        <svg class="kpiSvg" viewBox="0 0 260 54" preserveAspectRatio="none" aria-label="sparkline">
          <path d="${d}" fill="none" stroke="rgba(30,58,138,0.65)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </div>
    `;
  }

  function prFor(items, name){
    const arr = items.filter(x=>x.name===name);
    let pr = 0;
    arr.forEach(x=>{ const v = Number(x.value)||0; if(v>pr) pr=v; });
    return pr;
  }

  function renderProgress(){
    const root = document.getElementById("tab-progress");
    if(!root) return;

    const days = daysBack(RANGE);
    const today = days[days.length-1];

    const checkins = load(CHECKIN_KEY, {});
    const fin = load(FIN_KEY, []);
    const nut = load(NUT_KEY, []);
    const skills = load(SKILL_KEY, []);

    // ---------- Training ----------
    const wSeries = days.map(d => (checkins[d] && checkins[d].workout) ? 1 : 0);
    const wCount = wSeries.reduce((a,b)=>a+b,0);
    const wPct = Math.round((wCount / RANGE) * 100);
    const hsPR = prFor(skills, "handstand");
    const plPR = prFor(skills, "planche");
    const flPR = prFor(skills, "flag");

    const trGrid = document.getElementById("trGrid");
    if(trGrid){
      trGrid.innerHTML =
        kpiCard("Consistency", `${wCount}/${RANGE}`, `${wPct}% дни с тренировка`, wSeries) +
        kpiCard("Handstand PR", hsPR ? `${hsPR}` : "—", "най-добро (сек/бр)", skills.filter(x=>x.name==="handstand").slice(-RANGE).map(x=>Number(x.value)||0)) +
        kpiCard("Planche PR", plPR ? `${plPR}` : "—", "най-добро (сек/бр)", skills.filter(x=>x.name==="planche").slice(-RANGE).map(x=>Number(x.value)||0)) +
        kpiCard("Flag PR", flPR ? `${flPR}` : "—", "най-добро (сек/бр)", skills.filter(x=>x.name==="flag").slice(-RANGE).map(x=>Number(x.value)||0));
    }
    const trMeta = document.getElementById("trMeta");
    if(trMeta) trMeta.textContent = `Последни ${RANGE} дни • ${wPct}% consistency`;

    // ---------- Nutrition ----------
    const kcalTarget = Number(localStorage.getItem("balanced_life_kcal_target")||"2100") || 2100;
    const kcalSeries = days.map(d => Math.round(nut.filter(x=>x.date===d).reduce((a,b)=>a+(Number(b.kcal)||0),0)));
    const kcalAvg = Math.round(kcalSeries.reduce((a,b)=>a+b,0) / (kcalSeries.length||1));
    const onTarget = kcalSeries.filter(v=> v>0 && v>=kcalTarget*0.7 && v<=kcalTarget*1.3).length;

    const nuGrid = document.getElementById("nuGrid");
    if(nuGrid){
      nuGrid.innerHTML =
        kpiCard("Avg kcal", `${kcalAvg}`, `Target ${kcalTarget} • on-target дни: ${onTarget}`, kcalSeries) +
        kpiCard("Today kcal", `${kcalSeries[kcalSeries.length-1]||0}`, `днес (${today})`, kcalSeries.slice(-Math.min(14,kcalSeries.length)));
    }
    const nuMeta = document.getElementById("nuMeta");
    if(nuMeta) nuMeta.textContent = `Средно ${kcalAvg} kcal • On-target ${onTarget}/${RANGE}`;

    // ---------- Finance ----------
    const budgetTarget = Number(localStorage.getItem("balanced_life_budget_target")||"60") || 60;
    const spendSeries = days.map(d => Math.round(fin.filter(x=>x.date===d && x.type==="expense").reduce((a,b)=>a+(Number(b.amount)||0),0)));
    const spendSum = spendSeries.reduce((a,b)=>a+b,0);
    const spendAvg = Math.round(spendSum / (spendSeries.length||1));
    const underDays = spendSeries.filter(v=> v>0 && v<=budgetTarget).length;

    const fiGrid = document.getElementById("fiGrid");
    if(fiGrid){
      fiGrid.innerHTML =
        kpiCard("Avg spent", `${spendAvg} лв`, `Target ${budgetTarget} • under дни: ${underDays}`, spendSeries) +
        kpiCard("Total spent", `${Math.round(spendSum)} лв`, `последни ${RANGE} дни`, spendSeries);
    }
    const fiMeta = document.getElementById("fiMeta");
    if(fiMeta) fiMeta.textContent = `Общо ${Math.round(spendSum)} лв • Avg ${spendAvg} лв/ден`;

    // ---------- Insights ----------
    const insights = [];
    if(wCount < Math.max(2, Math.round(RANGE*0.35))) insights.push("🏋️ Добави 2 кратки тренировки (20–30 мин) за да вдигнеш consistency.");
    if(onTarget < Math.max(2, Math.round(RANGE*0.45))) insights.push("🥗 Ползвай Templates по-често за дни без време – важно е да имаш базови kcal.");
    if(underDays < Math.max(2, Math.round(RANGE*0.45))) insights.push("💰 Пиши разходите веднага (Quick Add) – така няма скрити дни със “0”, които после изненадват.");
    if(!insights.length) insights.push("✅ Стабилна седмица. Следваща цел: 1 нов PR + 1 ден с пълен check-in.");

    const elIns = document.getElementById("progInsights");
    if(elIns) elIns.textContent = insights.join("  •  ");
  }

  // Segmented control
  document.addEventListener("click",(e)=>{
    const b = e.target.closest(".segBtn[data-range]");
    if(!b) return;
    $$(".segBtn[data-range]").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    RANGE = Number(b.getAttribute("data-range")||"7") || 7;
    renderProgress();
  }, true);

  // Alias: if something opens "charts", route to progress
  document.addEventListener("click",(e)=>{
    const t = e.target.closest('[data-open="charts"]');
    if(!t) return;
    e.preventDefault();
    if(typeof showPanel==="function") showPanel("progress");
  }, true);

  document.addEventListener("DOMContentLoaded", renderProgress);

  const oldShow = window.showPanel;
  if(typeof oldShow === "function"){
    window.showPanel = function(name, opts){
      oldShow(name, opts);
      if(name==="progress") renderProgress();
    };
  }
})();