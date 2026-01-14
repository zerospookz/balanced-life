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
})();

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
