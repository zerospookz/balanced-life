
/* Balanced life v5.8 (workouts plan + import/export) - static SPA */
(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const STORAGE_KEY = "balancedLife.v59";
  const todayISO = () => new Date().toISOString().slice(0,10);

  const pad2 = (n) => String(n).padStart(2,'0');
  const isoFromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const startOfWeekISO = (iso=todayISO()) => {
    const d = new Date(iso + "T00:00:00");
    // Monday as start
    const day = (d.getDay() + 6) % 7; // 0..6 where 0=Mon
    d.setDate(d.getDate() - day);
    return isoFromDate(d);
  };
  const weekISOs = (startISO) => {
    const d = new Date(startISO + "T00:00:00");
    return Array.from({length:7}, (_,i)=>{ const x=new Date(d); x.setDate(d.getDate()+i); return isoFromDate(x); });
  };
  const dayLabel = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return ["П","В","С","Ч","П","С","Н"][(d.getDay()+6)%7];
  };

  const defaultState = {
    lang: "en",
    route: "home",
    finances: [],
    nutrition: [],
    workouts: [], // workout logs (sessions)
    habits: [
      {id:"h_workouts", name:"Тренировки", icon:"🏋️", color:"#10B981"},
      {id:"h_nutrition", name:"Хранене", icon:"🥗", color:"#F59E0B"},
      {id:"h_finances", name:"Финанси", icon:"💰", color:"#2563EB"},
      {id:"h_steps", name:"Разходка", icon:"🚶", color:"#06B6D4"},
      {id:"h_sleep", name:"Сън", icon:"😴", color:"#8B5CF6"},
      {id:"h_cardio", name:"Кардио", icon:"🏃", color:"#EF4444"},
    ],
    habitLogs: {},
    workoutPlan: {"Понеделник": {"Фокус": "Push + Planche (тежко) + Handstand", "Skill: Handstand (15–20 мин)": ["Chest-to-wall 5×30–45 сек (линия)", "Kick-ups 6–10 опита ×10–25 сек", "Scap shrugs в стойка 3×10"], "Skill: Planche (8–12 мин)": ["Tuck/Frog holds 6–10×6–12 сек", "Planche leans 3×20 сек"], "Skill: Flag (8–12 мин)": ["(по желание) 2–4 леки опита"], "Сила — Блок A (тежко)": ["Bench press ИЛИ Weighted dips 4×4–6", "Overhead press 3×5–8"], "Сила — Блок B": ["Pseudo planche push-ups 4×6–10", "Hollow hold 4×20–40 сек"], "Аксесоари / Прехаб": ["Lateral raise 3×12–20", "Китки: wrist rocks 2×10"], "Кондиция / Спорт": [], "Център време (мин)": "70–95", "Бележки": "RPE 7–8; спри при разпад на форма"}, "Вторник": {"Фокус": "Pull (тежко) + Flag + Набирания", "Skill: Handstand (15–20 мин)": ["(кратко: 3–5 леки опита по 10–15 сек)"], "Skill: Planche (8–12 мин)": [], "Skill: Flag (8–12 мин)": ["Tuck/ластик 6–10×5–10 сек", "Негативи 4×3–6 сек (контрол)"], "Сила — Блок A (тежко)": ["Weighted pull-ups 5×3–5", "Chin-ups 3×6–10"], "Сила — Блок B": ["Row (щанга/опора) 4×6–10", "Lat pulldown 3×10–15"], "Аксесоари / Прехаб": ["Face pulls 3×15–20", "External rotations 3×15–20", "Side plank/Copenhagen 4×20–40 сек/страна"], "Кондиция / Спорт": [], "Център време (мин)": "70–95", "Бележки": "Фокус: стабилни рамене, лакът без болка"}, "Сряда": {"Фокус": "Крака (фитнес) + Core + лека стойка", "Skill: Handstand (15–20 мин)": ["Scap shrugs 3×10", "3–5 леки опита стойка (без борба)"], "Skill: Planche (8–12 мин)": [], "Skill: Flag (8–12 мин)": [], "Сила — Блок A (тежко)": ["Squat (back/front) 4×3–6", "RDL 4×5–8"], "Сила — Блок B": ["Bulgarian split squat 3×8–12/крак", "Leg curl ИЛИ Nordic прогресия 3×8–12"], "Аксесоари / Прехаб": ["Calves 4×10–20", "Ab wheel ИЛИ Hanging knee raises 4×8–15"], "Кондиция / Спорт": [], "Център време (мин)": "70–95", "Бележки": "Не до отказ (за да пазиш краката)"}, "Четвъртък": {"Фокус": "Кондиция: Бокс + Въже + Мобилност", "Skill: Handstand (15–20 мин)": [], "Skill: Planche (8–12 мин)": [], "Skill: Flag (8–12 мин)": [], "Сила — Блок A (тежко)": [], "Сила — Блок B": [], "Аксесоари / Прехаб": ["Прехаб 10 мин: scap push-ups 2×10", "Wrist rocks 2×10", "External rotations 3×15–20"], "Кондиция / Спорт": ["Въже 12×(40/40)", "Бокс 8–12 рунда × 2–3 мин"], "Център време (мин)": "45–75", "Бележки": "Дръж умерено (техника + дишане)"}, "Петък": {"Фокус": "Upper (обем/умение) + Planche + Pull-up вариации", "Skill: Handstand (15–20 мин)": ["6–10 опита ×10–25 сек (контрол)", "Wall line 2×30 сек"], "Skill: Planche (8–12 мин)": ["Holds 6–8×8–12 сек", "Lean 3×20 сек"], "Skill: Flag (8–12 мин)": ["4–6 леки опита ×5–8 сек (само чисто)"], "Сила — Блок A (тежко)": ["Explosive pull-ups / chest-to-bar 6×2–4", "Archer / Typewriter 4×3–6/страна"], "Сила — Блок B": ["Incline DB press 4×8–12", "Seated cable row 3×10–15"], "Аксесоари / Прехаб": ["Curls 3×10–15", "Triceps pushdown 3×10–15", "Farmer/Suitcase carry 6×20–40 м"], "Кондиция / Спорт": [], "Център време (мин)": "70–95", "Бележки": "Пази свежест за уикенда (без отказ)"}, "Събота": {"Фокус": "Футбол + кратък Skill/прехаб (леко)", "Skill: Handstand (15–20 мин)": ["8–12 мин лесни опита (или стена)"], "Skill: Planche (8–12 мин)": ["Lean 3×15–25 сек", "PPPUs 3×8 (леки)"], "Skill: Flag (8–12 мин)": ["Само ако си свеж: 1–3 опита ×5–8 сек"], "Сила — Блок A (тежко)": [], "Сила — Блок B": [], "Аксесоари / Прехаб": ["Face pulls 2×20", "External rotations 2×20", "Разтягане 5–10 мин"], "Кондиция / Спорт": ["Футбол (трен./мач)"], "Център време (мин)": "20–45 + футбол", "Бележки": "Ако мачът е тежък → само мобилност"}, "Неделя": {"Фокус": "Футбол + възстановяване", "Skill: Handstand (15–20 мин)": [], "Skill: Planche (8–12 мин)": [], "Skill: Flag (8–12 мин)": [], "Сила — Блок A (тежко)": [], "Сила — Блок B": [], "Аксесоари / Прехаб": ["Мобилност 10–15 мин (грасци/бедра/таз/гръб/рамене)"], "Кондиция / Спорт": ["Футбол", "Zone 2 20–40 мин (по желание)"], "Център време (мин)": "20–40 + футбол", "Бележки": "Цел: възстановяване"}},
  };
// ===== i18n v6.3.3 (EN/BG) =====
const I18N = {
  en: {
    offlineSub: "Offline • data stays on your phone",
    sort: "Sort",
    dashboardToday: "Today: budget • nutrition • workouts",
    weeklyOverview: "Weekly overview",
    quickLook7: "Quick look for the last 7 days",
    habitTracker: "Habit tracker",
    thisWeek: "This week",
    week: "Week",
    addHabit: "+ Habit",
    habit: "Habit",
    completion: "Completion",
    checked: "Checked",
    habits: "Habits",
    noHabits: "No habits yet. Tap “+ Habit”.",
    workouts: "Workouts",
    finances: "Finances",
    nutrition: "Nutrition",
    calories: "Calories",
    walk: "Walk",
    sleep: "Sleep",
    cardio: "Cardio",
    entry: "Entry",
    food: "Food",
    workout: "Workout",
    noEntries: "No entries yet.",
    noSections: "No sections.",
  },
  bg: {
    offlineSub: "Офлайн • данните са на телефона",
    sort: "Подреди",
    dashboardToday: "Днес: бюджет • хранене • тренировки",
    weeklyOverview: "Weekly overview",
    quickLook7: "Бърз поглед за последните 7 дни",
    habitTracker: "Habit tracker",
    thisWeek: "Тази седмица",
    week: "Седмица",
    addHabit: "+ Навик",
    habit: "Навик",
    completion: "Изпълнение",
    checked: "Отметнати",
    habits: "Навици",
    noHabits: "Нямаш навици. Натисни “+ Навик”.",
    workouts: "Тренировки",
    finances: "Финанси",
    nutrition: "Хранене",
    calories: "Калории",
    walk: "Разходка",
    sleep: "Сън",
    cardio: "Кардио",
    entry: "Запис",
    food: "Храна",
    workout: "Тренировка",
    noEntries: "Няма записи.",
    noSections: "Няма секции.",
  }
};

function t(key){
  const lang = state?.lang || "en";
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

function setLang(lang){
  state.lang = (lang === "bg") ? "bg" : "en";
  updateHeaderUI();
  saveState();
  render();
}

function updateHeaderUI(){
  document.documentElement.setAttribute("lang", (state.lang||"en")==="bg" ? "bg" : "en");
  const sub = document.querySelector(".brandSub");
  if(sub) sub.textContent = t("offlineSub");
  const r = document.getElementById("btnReorder");
  if(r) r.textContent = t("sort");

  const enBtn = document.getElementById("btnLangEN");
  const bgBtn = document.getElementById("btnLangBG");
  if(enBtn) enBtn.classList.toggle("isActive", (state.lang||"en") === "en");
  if(bgBtn) bgBtn.classList.toggle("isActive", (state.lang||"en") === "bg");
}

function habitDisplayName(h){
  if(!h) return "";
  const id = h.id || "";
  const lang = state.lang || "en";
  const map = {
    h_workouts: {en: I18N.en.workouts, bg: I18N.bg.workouts},
    h_nutrition:{en: I18N.en.nutrition, bg: I18N.bg.nutrition},
    h_finances: {en: I18N.en.finances, bg: I18N.bg.finances},
    h_steps:   {en: I18N.en.walk, bg: I18N.bg.walk},
    h_sleep:   {en: I18N.en.sleep, bg: I18N.bg.sleep},
    h_cardio:  {en: I18N.en.cardio, bg: I18N.bg.cardio},
  };
  if(map[id]) return map[id][lang] || map[id].en;
  return h.name || "";
}
// ===== end i18n =====


  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      // merge defaults (forward compat)
      return {
        ...structuredClone(defaultState),
        ...parsed,
        workoutPlan: parsed.workoutPlan || structuredClone(defaultState.workoutPlan),
      };
    } catch(e) {
      console.warn("State load failed, resetting", e);
      return structuredClone(defaultState);
    }
  }

  
  // ===== THEME_MODE v6.2.5 (manual light/dark) =====
const APP_VERSION = "6.3.5";
const THEME_KEY = "bl_theme_mode"; // light | dark

function applyTheme(mode){
  const root = document.documentElement;
  const m = (mode === "dark") ? "dark" : "light";
  root.setAttribute("data-theme", m);
  root.setAttribute("data-sky", m === "dark" ? "night" : "day");
  localStorage.setItem(THEME_KEY, m);
}

applyTheme(localStorage.getItem(THEME_KEY) || "light");

function toggleThemeQuick(){
    const cur = localStorage.getItem(THEME_KEY) || "light";
    const next = (cur === "dark") ? "light" : "dark";
    applyTheme(next);
    render();
  }

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render(); // keep UI consistent after any write
  }

  let state = loadState();

  // ---------- Router ----------
  function setRoute(route) {
    state.route = route;
    const hash = "#" + route;
    if (location.hash !== hash) location.hash = hash;
    render();
  }

  window.addEventListener("hashchange", () => {
    const h = (location.hash || "#home").replace("#","");
    state.route = h || "home";
    render();
  });

  // ---------- Modal ----------
  const modalEl = $("#modal");
  const modalTitleEl = $("#modalTitle");
  const modalBodyEl = $("#modalBody");
  $("#modalClose").addEventListener("click", closeModal);
  modalEl.addEventListener("click", (e) => {
    if(e.target === modalEl) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && !modalEl.classList.contains("hidden")) closeModal();
  });

  function openModal(title, bodyHTML) {
    modalTitleEl.textContent = title;
    modalBodyEl.innerHTML = bodyHTML;
    modalEl.classList.remove("hidden");
    // focus first input if exists
    const first = modalBodyEl.querySelector("input,select,textarea,button");
    if(first) setTimeout(()=>first.focus(), 0);
  }
  function closeModal() {
    modalEl.classList.add("hidden");
    modalTitleEl.textContent = "—";
    modalBodyEl.innerHTML = "";
  }

  // ---------- Helpers ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function money(n) {
    const x = Number(n||0);
    return x.toLocaleString("bg-BG", {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  // ---------- Dashboard ring (simple but real data) ----------
  function ringSVG(progress) {
    const r=54;
    const c=2*Math.PI*r;
    const p=Math.max(0, Math.min(1, progress));
    const dash = (c*p).toFixed(2);
    return `
      <svg class="ring" width="150" height="150" viewBox="0 0 150 150" aria-label="Progress ring">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(37,99,235,1)"/>
            <stop offset="50%" stop-color="rgba(16,185,129,1)"/>
            <stop offset="100%" stop-color="rgba(245,158,11,1)"/>
          </linearGradient>
        </defs>
        <circle cx="75" cy="75" r="${r}" fill="none" stroke="rgba(0,0,0,.10)" stroke-width="12"/>
        <circle cx="75" cy="75" r="${r}" fill="none" stroke="url(#grad)" stroke-width="12"
          stroke-linecap="round"
          stroke-dasharray="${dash} ${(c-dash).toFixed(2)}"
          transform="rotate(-90 75 75)">
          <animate attributeName="stroke-dasharray" dur="600ms" fill="freeze"
            from="0 ${c.toFixed(2)}" to="${dash} ${(c-dash).toFixed(2)}"/>
        </circle>
        <rect x="47" y="47" width="56" height="56" rx="14" fill="rgba(0,0,0,.04)" stroke="rgba(0,0,0,.05)"/>
        <text x="75" y="78" text-anchor="middle" font-size="18" font-weight="900" fill="var(--text)">${Math.round(p*100)}%</text>
        <text x="75" y="98" text-anchor="middle" font-size="12" font-weight="800" fill="var(--sub)"<span class="energyLabel">Energy</span>/text>
      </svg>
    `;
  }

  function computeDashboard() {
    // Finances: sum income-expense this month
    const now = new Date();
    const ym = now.toISOString().slice(0,7);
    let income=0, expense=0;
    for(const it of state.finances){
      if((it.date||"").slice(0,7)===ym){
        if(it.type==="income") income += Number(it.amount||0);
        else expense += Number(it.amount||0);
      }
    }
    // Nutrition: calories today
    const today = todayISO();
    let kcal=0;
    for(const it of state.nutrition){
      if(it.date===today) kcal += Number(it.kcal||0);
    }
    // Workouts: minutes last 7 days
    const cut = new Date(Date.now()-6*24*3600*1000);
    let wmin=0;
    for(const s of state.workouts){
      const d=new Date(s.date||"");
      if(!isNaN(d) && d>=cut) wmin += Number(s.minutes||0);
    }
    // progress: simplistic normalized score
    const budget = Math.max(0, income-expense);
    const p = Math.min(1, (budget/200 + kcal/2000 + wmin/180)/3);
    return {income, expense, budget, kcal, wmin, progress:p};
  }

  // ---------- Views ----------
  
  function viewHabitTracker(){
    const now = new Date();
    const isoNow = (typeof getISOWeek === "function") ? getISOWeek(now) : {year: now.getFullYear(), week: 1};
    const year = isoNow.year || now.getFullYear();
    const weeks = (typeof buildISOWeeksForYear === "function") ? buildISOWeeksForYear(year) : [];
    const fallbackVal = `${year}-W${String(isoNow.week||1).padStart(2,"0")}`;
    const saved = state._habitWeekFull || fallbackVal;
    const selWeek = Number(saved.split("W")[1] || (isoNow.week||1));

    const startDate = (typeof startOfISOWeekFromYearWeek === "function")
      ? startOfISOWeekFromYearWeek(year, selWeek)
      : new Date(now.getTime() - ((now.getDay()+6)%7)*86400000);

    const start = isoFromDate(startDate);
    const days = weekISOs(start);

    const dayLetters = (state.lang === "bg") ? ["П","В","С","Ч","П","С","Н"] : ["M","T","W","T","F","S","S"];

    const weekOptions = weeks.length ? weeks.map(w=>{
      const val = `${year}-W${String(w.week).padStart(2,"0")}`;
      const label = `W${String(w.week).padStart(2,"0")} • ${w.start} → ${w.end}`;
      return `<option value="${val}" ${val===saved?"selected":""}>${label}</option>`;
    }).join("") : `<option value="${saved}">${saved}</option>`;

    const habits = state.habits || [];
    const logs = state.habitLogs || {};

    const weekCounts = habits.map(h=>{
      let c=0;
      for(const iso of days){
        if(logs[iso] && logs[iso][h.id]) c++;
      }
      return c;
    });

    const totalDone = weekCounts.reduce((a,b)=>a+b,0);
    const totalPossible = habits.length * days.length;
    const pct = totalPossible ? Math.round((totalDone/totalPossible)*100) : 0;

    return `
      <section class="card section habitSectionFix">
        <div class="cardHead">
          <div>
            <div class="habitTitle">Habit tracker</div>
            <div class="habitRange">
              <span class="mutedInline">${t("thisWeek")}</span> • ${start} → ${days[6]}
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
            <div class="weekFilter" title="${t("week")}">
              <span class="small" style="font-weight:900">${t("week")}</span>
              <select data-action="setHabitWeekFull">
                ${weekOptions}
              </select>
            </div>
            <button class="btn primary habitAddBtn" type="button" data-action="addHabit">${t("addHabit")}</button>
          </div>
        </div>

        <div class="habitWrap">
          <div class="habitHeadRow" role="row">
            <div class="habitHeadName" role="columnheader">${t("habit")}</div>
            ${days.map((d,i)=>`<div class="habitDay" role="columnheader">${dayLetters[i]||""}</div>`).join("")}
          </div>

          ${habits.length ? habits.map((h,idx)=>`
            <div class="habitRow" role="row">
              <div class="habitName" role="cell">
                <div class="habitNameInner">
                  <span class="habitIcon">${h.icon||"✅"}</span>
                  <span class="habitText" style="color:${h.color||"#60a5fa"}">${escapeHtml(habitDisplayName(h)||t("habit"))}</span>
                  <span class="chip">${weekCounts[idx]}/7</span>
                </div>
              </div>
              ${days.map(d=>{
                const on = !!(logs[d] && logs[d][h.id]);
                return `<button class="habitBox ${on?"on":""}" type="button" style="--hc:${h.color||"#60a5fa"}"
                          data-action="toggleHabit" data-habit="${h.id}" data-date="${d}"></button>`;
              }).join("")}
            </div>
          `).join("") : `<div class="muted" style="padding:10px 6px">${t("noHabits")}</div>`}
        </div>

        <div class="habitStats">
          <div class="kpi">
            <div class="l">${t("completion")}</div>
            <div class="v">${pct}%</div>
          </div>
          <div class="kpi">
            <div class="l">${t("checked")}</div>
            <div class="v">${totalDone}</div>
          </div>
          <div class="kpi">
            <div class="l">${t("habits")}</div>
            <div class="v">${habits.length}</div>
          </div>
        </div>
      </section>
    `;
  }

function viewHome() {
    const d = computeDashboard();
    return `
      <div class="pageStack">
      <section class="card section featured">
        <div class="h1">Dashboard</div>
        <div class="sub">${t("dashboardToday")}</div>
        <div class="donutRow">
  <div class="donutCard">
    ${(()=>{
      const goal = Number(state.workoutGoalMin||state.goals?.workoutMin||180);
      const prog = donutProgress(d.wmin, goal);
      return radialBarsSVG({id:"w", value: prog.pct, centerValue: `${Math.round(prog.pct*100)}%`, centerLabel:"Workouts"});
    })()}
  </div>

  <div class="donutCard">
    ${(()=>{
      const inc = Math.max(0, Number(d.income||0));
      const exp = Math.max(0, Number(d.expense||0));
      const total = inc + exp;
      const share = total ? inc/total : 0;
      // show net in center like finance dashboards
      const net = inc - exp;
      const netTxt = (total? `${Math.round(share*100)}%` : "—");
      return radialBarsSVG({id:"f", value: share, centerValue: netTxt, centerLabel:"Finances"});
    })()}
  </div>

  <div class="donutCard">
    ${(()=>{
      const goal = Number(state.kcalGoal||state.goals?.kcal||2000);
      const prog = donutProgress(d.kcal, goal);
      return radialBarsSVG({id:"k", value: prog.pct, centerValue: `${Math.round(prog.pct*100)}%`, centerLabel:"Calories"});
    })()}
  </div>
</div>
      </section>

      <section class="card section featured">
        <div class="h1">Weekly overview</div>
        <div class="sub">${t("quickLook7")}</div>
        <div class="weekTiles">
          <button class="weekTile" type="button" data-route="finances" aria-label="Finances tile">
            <div class="weekTileTop">
              <div class="weekTileTitle">Finances</div>
              <div class="weekTileIcon">💰</div>
            </div>
            <div class="weekTileValue">${money(d.budget)} лв</div>
            <div class="weekTileSub">Month: +${money(d.income)} • -${money(d.expense)}<br/>Remaining: ${money(d.budget + d.income - d.expense)} лв</div>
          </button>

          <button class="weekTile" type="button" data-route="nutrition" aria-label="Nutrition tile">
            <div class="weekTileTop">
              <div class="weekTileTitle">Nutrition</div>
              <div class="weekTileIcon">🥗</div>
            </div>
            <div class="weekTileValue">${Math.round(d.kcal)} kcal</div>
            <div class="weekTileSub">Today • add food<br/>Цел: ${Math.round(d.kcalGoal||0)} kcal</div>
          </button>

          <button class="weekTile" type="button" data-route="workouts" aria-label="Workouts tile">
            <div class="weekTileTop">
              <div class="weekTileTitle">Workouts</div>
              <div class="weekTileIcon">🏋️</div>
            </div>
            <div class="weekTileValue">${Math.round(d.wmin)} min</div>
            <div class="weekTileSub">Last 7 days • ${Math.round(d.wCount||0)} sessions<br/>Plan inside</div>
          </button>
        </div>
</section>
      ${viewHabitTracker()}
      </div>
    `;
  }

  function viewFinances() {
    const rows = state.finances
      .slice()
      .sort((a,b)=> (b.date||"").localeCompare(a.date||""))
      .map((it, idx)=>`
        <tr class="tr">
          <td><div style="font-weight:900">${it.type==="income" ? "Приход" : "Разход"}</div><div class="small">${escapeHtml(it.note||"")}</div></td>
          <td class="small">${escapeHtml(it.date||"")}</td>
          <td style="font-weight:900">${it.type==="income" ? "+" : "-"}${money(it.amount)} лв</td>
          <td><button class="btn ghost" data-action="delFinance" data-idx="${idx}">Delete</button></td>
        </tr>
      `).join("");
    return `
      <section class="card section">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <div class="h1">Finances</div>
            <div class="sub">Income and expenses</div>
          </div>
          <button class="btn primary" data-action="addFinance" type="button">+ Entry</button>
        </div>
        <div style="margin-top:10px" class="small">Stored locally (offline-first).</div>
        <table class="table" style="margin-top:10px">
          <tbody>${rows || `<tr><td class="small">No entries yet. Tap “+ Entry”.</td></tr>`}</tbody>
        </table>
      </section>
    `;
  }

  function viewNutrition() {
    const rows = state.nutrition
      .slice()
      .sort((a,b)=> (b.date||"").localeCompare(a.date||""))
      .map((it, idx)=>`
        <tr class="tr">
          <td><div style="font-weight:900">${escapeHtml(it.food||"")}</div><div class="small">${escapeHtml(it.note||"")}</div></td>
          <td class="small">${escapeHtml(it.date||"")}</td>
          <td style="font-weight:900">${Math.round(Number(it.kcal||0))} kcal</td>
          <td><button class="btn ghost" data-action="delFood" data-idx="${idx}">Delete</button></td>
        </tr>
      `).join("");
    return `
      <section class="card section">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <div class="h1">Nutrition</div>
            <div class="sub">Food, calories & photos (manual)</div>
          </div>
          <button class="btn primary" data-action="addFood" type="button">+ Food</button>
        </div>
        <div style="margin-top:10px" class="small">* Автоматично калкулиране от снимка изисква AI/външен API. Тук е ръчно въвеждане.</div>
        <table class="table" style="margin-top:10px">
          <tbody>${rows || `<tr><td class="small">No entries yet. Tap “+ Food”.</td></tr>`}</tbody>
        </table>
      </section>
    `;
  }

  function viewWorkouts() {
    const dayNames = Object.keys(state.workoutPlan);
    const selected = state._selectedPlanDay || dayNames[0];
    const plan = state.workoutPlan[selected] || {};

    const dayOptions = dayNames.map(d=>`<option value="${escapeHtml(d)}" ${d===selected?"selected":""}>${escapeHtml(d)}</option>`).join("");

    const sections = Object.keys(plan).filter(k=>k!=="Фокус" && k!=="Център време (мин)" && k!=="Бележки");
    const sectionCards = sections.map(sec=>{
      const items = (plan[sec]||[]);
      const lis = items.length ? items.map((x,i)=>`
        <li style="display:flex;gap:10px;align-items:flex-start">
          <div style="flex:1">${escapeHtml(x)}</div>
          <button class="btn ghost" data-action="delPlanItem" data-day="${escapeHtml(selected)}" data-sec="${escapeHtml(sec)}" data-i="${i}">✕</button>
        </li>
      `).join("") : `<div class="small">—</div>`;
      return `
        <div class="kpi" style="background:rgba(0,0,0,.02)">
          <div class="l" style="margin-bottom:8px">${escapeHtml(sec)}</div>
          <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px">${lis}</ul>
          <div style="margin-top:10px">
            <button class="btn ghost" data-action="addPlanItem" data-day="${escapeHtml(selected)}" data-sec="${escapeHtml(sec)}" type="button">+ Add</button>
          </div>
        </div>
      `;
    }).join("");

    // logs
    const rows = state.workouts
      .slice()
      .sort((a,b)=> (b.date||"").localeCompare(a.date||""))
      .map((it, idx)=>`
        <tr class="tr">
          <td><div style="font-weight:900">${escapeHtml(it.title||"Тренировка")}</div><div class="small">${escapeHtml(it.note||"")}</div></td>
          <td class="small">${escapeHtml(it.date||"")}</td>
          <td style="font-weight:900">${Math.round(Number(it.minutes||0))} мин</td>
          <td><button class="btn ghost" data-action="delWorkout" data-idx="${idx}">Delete</button></td>
        </tr>
      `).join("");

    const tab = state._workoutsTab || "plan";

    return `
      <section class="card section">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <div class="h1">Workouts</div>
            <div class="sub">План • сесии • цели</div>
          </div>
          <div class="row">
            <button class="btn ghost" data-action="setWorkoutsTab" data-tab="plan" type="button" style="${tab==="plan"?"border-color:rgba(37,99,235,.45)":""}">План</button>
            <button class="btn ghost" data-action="setWorkoutsTab" data-tab="logs" type="button" style="${tab==="logs"?"border-color:rgba(37,99,235,.45)":""}">Сесии</button>
            <button class="btn primary" data-action="addWorkout" type="button">+ Тренировка</button>
          </div>
        </div>

        ${tab==="plan" ? `
          <div style="margin-top:12px" class="row">
            <div class="pill">📅 Ден:
              <select id="planDaySelect" data-action="selectPlanDay" style="padding:8px 10px;border-radius:12px">
                ${dayOptions}
              </select>
            </div>
            <button class="btn ghost" data-action="exportPlan" type="button">Export план</button>
            <label class="btn ghost" style="display:inline-flex;gap:10px;align-items:center;cursor:pointer">
              Import план
              <input id="importPlanFile" type="file" accept="application/json" style="display:none" data-action="importPlanFile">
            </label>
          </div>

          <div style="margin-top:12px" class="small">
            <div><b>Фокус:</b> ${escapeHtml(plan["Фокус"]||"—")}</div>
            <div><b>Време:</b> ${escapeHtml(plan["Център време (мин)"]||"—")}</div>
            <div><b>Бележки:</b> ${escapeHtml(plan["Бележки"]||"—")}</div>
          </div>

          <div class="grid2" style="margin-top:12px">
            ${sectionCards || `<div class="small">No sections.</div>`}
          </div>
        ` : `
          <table class="table" style="margin-top:12px">
            <tbody>${rows || `<tr><td class="small">No entries yet. Tap “+ Workout”.</td></tr>`}</tbody>
          </table>
        `}
      </section>
    `;
  }

  function viewSettings() {
    return `
      <section class="card section">
        <div class="h1">Settings</div>
        <div class="sub">Build: <b>${APP_VERSION}</b></div>
        <div class="sub">Appearance</div>
        <div class="row" style="margin-top:10px;align-items:center">
          <div class="pill">🌓 Theme:
            <select id="themeSelect" data-action="setTheme" style="padding:8px 10px;border-radius:12px">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
        <div class="sub">Import / Export & Reset</div>

        <div class="row" style="margin-top:12px">
          <button class="btn ghost" data-action="exportAll" type="button">Export all data</button>
          <label class="btn ghost" style="display:inline-flex;gap:10px;align-items:center;cursor:pointer">
            Import всички данни
            <input id="importAllFile" type="file" accept="application/json" style="display:none" data-action="importAllFile">
          </label>
          <button class="btn" data-action="resetAll" type="button">Reset</button>
        </div>

        <div class="small" style="margin-top:12px">
          Съвет: Export → запази JSON файл като backup. Import ще замени локалните данни.
        </div>
      </section>
    `;
  }

  function render() {
    const view = $("#view");
    const route = (state.route || "home").replace(/[^a-z]/g,"");
    const html =
      route === "finances" ? viewFinances() :
      route === "nutrition" ? viewNutrition() :
      route === "workouts" ? viewWorkouts() :
      route === "settings" ? viewSettings() :
      viewHome();
    view.innerHTML = html;

    // attach internal route buttons
    $$("[data-route]").forEach(btn=>btn.addEventListener("click", ()=>setRoute(btn.dataset.route)));

    // bottom nav active
    $$(".bottomnav .tab").forEach(t=>t.classList.toggle("active", t.dataset.route===route));

    // actions
    $$("[data-action]").forEach(el=>{ if(el.dataset.action==="selectPlanDay" && el.tagName==="SELECT") return; el.addEventListener("click", handleAction); });
    // change actions
    $$("[data-action='selectPlanDay']").forEach(el=>el.addEventListener("change", handleAction));
    $$("[data-action='setTheme']").forEach(el=>el.addEventListener("change", handleAction));
    $$("[data-action='setHabitWeekFull']").forEach(el=>el.addEventListener("change", handleAction));
    // set selected theme value
    const tSel = $("#themeSelect"); if(tSel){ const v = localStorage.getItem("bl_theme_mode") || "light"; tSel.value = (v==="dark") ? "dark" : "light"; }
    $$("[data-action='importPlanFile']").forEach(el=>el.addEventListener("change", handleImportPlan));
    $$("[data-action='importAllFile']").forEach(el=>el.addEventListener("change", handleImportAll));
  }

  function handleAction(e) {
    const a = e.currentTarget.dataset.action;
    if(a==="toggleHabit") return toggleHabit(e.currentTarget.dataset.habit, e.currentTarget.dataset.date);
    if(a==="setHabitWeekFull") { state._habitWeekFull = e.currentTarget.value; saveState(); return render(); }
    if(a==="addHabit") return openAddHabit();
    if(a==="addFinance") return openAddFinance();
    if(a==="delFinance") {
      const idx = Number(e.currentTarget.dataset.idx);
      state.finances.splice(idx,1);
      return saveState();
    }
    if(a==="addFood") return openAddFood();
    if(a==="delFood") {
      const idx=Number(e.currentTarget.dataset.idx);
      state.nutrition.splice(idx,1);
      return saveState();
    }
    if(a==="addWorkout") return openAddWorkout();
    if(a==="delWorkout") {
      const idx=Number(e.currentTarget.dataset.idx);
      state.workouts.splice(idx,1);
      return saveState();
    }
    if(a==="setWorkoutsTab") {
      state._workoutsTab = e.currentTarget.dataset.tab;
      return render();
    }
    if(a==="setTheme") { applyTheme(e.currentTarget.value); return; }
    if(a==="selectPlanDay") {
      const v = e.currentTarget.value;
      state._selectedPlanDay = v;
      return render();
    }
    if(a==="addPlanItem") {
      return openAddPlanItem(e.currentTarget.dataset.day, e.currentTarget.dataset.sec);
    }
    if(a==="delPlanItem") {
      const day=e.currentTarget.dataset.day;
      const sec=e.currentTarget.dataset.sec;
      const i=Number(e.currentTarget.dataset.i);
      const arr = state.workoutPlan?.[day]?.[sec];
      if(Array.isArray(arr)) arr.splice(i,1);
      return saveState();
    }
    if(a==="exportPlan") return exportJSON({workoutPlan: state.workoutPlan}, "balanced-life-plan.json");
    if(a==="exportAll") return exportJSON(state, "balanced-life-backup.json");
    if(a==="resetAll") {
      if(confirm("Сигурен ли си? Това ще изтрие всички локални данни.")) {
        state = structuredClone(defaultState);
        saveState();
      }
      return;
    }
  }

  function exportJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImportPlan(e) {
    const file = e.currentTarget.files?.[0];
    if(!file) return;
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);
      if(!parsed.workoutPlan || typeof parsed.workoutPlan!=="object") throw new Error("Invalid plan JSON");
      state.workoutPlan = parsed.workoutPlan;
      saveState();
      alert("Планът е импортнат успешно.");
    } catch(err) {
      alert("Грешка при импорт: " + err.message);
    } finally {
      e.currentTarget.value = "";
    }
  }

  async function handleImportAll(e) {
    const file = e.currentTarget.files?.[0];
    if(!file) return;
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);
      // basic shape
      state = {
        ...structuredClone(defaultState),
        ...parsed,
        workoutPlan: parsed.workoutPlan || structuredClone(defaultState.workoutPlan),
      };
      saveState();
      alert("Данните са импортнати успешно.");
    } catch(err) {
      alert("Грешка при импорт: " + err.message);
    } finally {
      e.currentTarget.value = "";
    }
  }

  // ---------- Forms ----------
  function openAddFinance() {
    openModal("Нов запис (Finances)", `
      <div class="field">
        <label>Тип</label>
        <select id="fType">
          <option value="expense">Разход</option>
          <option value="income">Приход</option>
        </select>
      </div>
      <div class="field">
        <label>Сума (лв)</label>
        <input id="fAmount" type="number" step="0.01" inputmode="decimal" placeholder="0.00"/>
      </div>
      <div class="field">
        <label>Дата</label>
        <input id="fDate" type="date" value="${todayISO()}"/>
      </div>
      <div class="field">
        <label>Бележка</label>
        <input id="fNote" type="text" placeholder="напр. Храна, Наем..."/>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" id="cancel">Отказ</button>
        <button class="btn primary" id="save">Запази</button>
      </div>
    `);
    $("#cancel").addEventListener("click", closeModal);
    $("#save").addEventListener("click", () => {
      const it={
        type: $("#fType").value,
        amount: Number($("#fAmount").value||0),
        date: $("#fDate").value || todayISO(),
        note: $("#fNote").value || ""
      };
      state.finances.unshift(it);
      closeModal();
      saveState();
    });
  }

  function openAddFood() {
    openModal("Нова храна (Nutrition)", `
      <div class="field">
        <label>Храна</label>
        <input id="nFood" type="text" placeholder="напр. Ориз + пиле"/>
      </div>
      <div class="field">
        <label>Калории (kcal)</label>
        <input id="nKcal" type="number" step="1" inputmode="numeric" placeholder="0"/>
      </div>
      <div class="field">
        <label>Дата</label>
        <input id="nDate" type="date" value="${todayISO()}"/>
      </div>
      <div class="field">
        <label>Бележка</label>
        <input id="nNote" type="text" placeholder="по желание"/>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" id="cancel">Отказ</button>
        <button class="btn primary" id="save">Запази</button>
      </div>
    `);
    $("#cancel").addEventListener("click", closeModal);
    $("#save").addEventListener("click", () => {
      const it={
        food: $("#nFood").value || "Храна",
        kcal: Number($("#nKcal").value||0),
        date: $("#nDate").value || todayISO(),
        note: $("#nNote").value || ""
      };
      state.nutrition.unshift(it);
      closeModal();
      saveState();
    });
  }

  function openAddWorkout() {
    openModal("Нова тренировка (Сесия)", `
      <div class="field">
        <label>Заглавие</label>
        <input id="wTitle" type="text" placeholder="напр. Upper + Planche"/>
      </div>
      <div class="field">
        <label>Минути</label>
        <input id="wMin" type="number" step="1" inputmode="numeric" placeholder="0"/>
      </div>
      <div class="field">
        <label>Дата</label>
        <input id="wDate" type="date" value="${todayISO()}"/>
      </div>
      <div class="field">
        <label>Бележка</label>
        <textarea id="wNote" placeholder="как мина..."></textarea>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" id="cancel">Отказ</button>
        <button class="btn primary" id="save">Запази</button>
      </div>
    `);
    $("#cancel").addEventListener("click", closeModal);
    $("#save").addEventListener("click", () => {
      const it={
        title: $("#wTitle").value || "Тренировка",
        minutes: Number($("#wMin").value||0),
        date: $("#wDate").value || todayISO(),
        note: $("#wNote").value || ""
      };
      state.workouts.unshift(it);
      closeModal();
      saveState();
    });
  }

  function openAddPlanItem(day, sec) {
    openModal("Add exercise", `
      <div class="field">
        <label>Ден</label>
        <input type="text" value="${escapeHtml(day)}" disabled />
      </div>
      <div class="field">
        <label>Секция</label>
        <input type="text" value="${escapeHtml(sec)}" disabled />
      </div>
      <div class="field">
        <label>Текст</label>
        <input id="pText" type="text" placeholder="напр. Bench press 4×4–6"/>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" id="cancel">Отказ</button>
        <button class="btn primary" id="save">Добави</button>
      </div>
    `);
    $("#cancel").addEventListener("click", closeModal);
    $("#save").addEventListener("click", () => {
      const t = $("#pText").value.trim();
      if(!t) return;
      if(!state.workoutPlan[day]) state.workoutPlan[day]={};
      if(!Array.isArray(state.workoutPlan[day][sec])) state.workoutPlan[day][sec]=[];
      state.workoutPlan[day][sec].push(t);
      closeModal();
      saveState();
    });
  }

  
  function openAddHabit(){
    const habits = state.habits || [];
    const listHtml = habits.map(h=>`
      <div class="row" style="justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(15,23,42,.06)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:18px">${h.icon||"✅"}</span>
          <div>
            <div style="font-weight:700">${escapeHtml(habitDisplayName(h)||t("habit"))}</div>
            <div class="muted" style="font-size:12px">${h.id}</div>
          </div>
        </div>
        <button class="btn danger" type="button" data-habit-del="${h.id}">Delete</button>
      </div>
    `).join("") || `<div class="muted">Нямаш навици.</div>`;

    openModal(`
      <div class="modalHeader">
        <div>
          <div class="modalTitle">Нови навици</div>
          <div class="muted">Добави / изтрий навик за Habit tracker.</div>
        </div>
        <button class="btn ghost" type="button" data-modal-close>✕</button>
      </div>

      <form id="habitForm" class="form">
        <div class="grid2">
          <label class="field">
            <span>Име</span>
            <input id="habitName" required placeholder="Напр. Стречинг" />
          </label>
          <label class="field">
            <span>Иконка (emoji)</span>
            <input id="habitIcon" placeholder="🧘" maxlength="4" />
          </label>
        </div>
        <div class="row" style="justify-content:flex-end;gap:10px;margin-top:10px">
          <button class="btn" type="submit">Добави</button>
        </div>
      </form>

      <div style="margin-top:12px">
        <div class="muted" style="font-size:12px;margin-bottom:6px">Текущи навици</div>
        ${listHtml}
      </div>
    `);

    document.querySelectorAll("[data-habit-del]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const hid = btn.getAttribute("data-habit-del");
        state.habits = (state.habits||[]).filter(h=>h.id!==hid);
        // clean logs
        const logs = state.habitLogs || {};
        Object.keys(logs).forEach(d=>{ if(logs[d]) delete logs[d][hid]; });
        saveState();
        closeModal();
        render();
        toast("Навикът е изтрит.");
      });
    });

    const form = document.getElementById("habitForm");
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const name = document.getElementById("habitName").value.trim();
      const icon = document.getElementById("habitIcon").value.trim() || "✅";
      if(!name) return;
      const id = "h_" + Date.now().toString(36);
      state.habits = [...(state.habits||[]), {id, name, icon}];
      saveState();
      closeModal();
      render();
      toast("Навикът е добавен.");
    });
  }

  function toggleHabit(hid, iso){
    if(!hid || !iso) return;
    state.habitLogs = state.habitLogs || {};
    state.habitLogs[iso] = state.habitLogs[iso] || {};
    state.habitLogs[iso][hid] = !state.habitLogs[iso][hid];
    // remove empty
    if(!state.habitLogs[iso][hid]) delete state.habitLogs[iso][hid];
    if(Object.keys(state.habitLogs[iso]).length===0) delete state.habitLogs[iso];
    saveState();
    render();
  }


// ---------- Init ----------
  const btnTheme = $("#btnTheme");
  if(btnTheme){ btnTheme.addEventListener("click", toggleThemeQuick); }

  const btnReorder = $("#btnReorder");
if(btnReorder){
  btnReorder.addEventListener("click", () => {
    alert(state.lang==="bg"
      ? "Подреждане: в тази версия плочките са премахнати (ползва се долната навигация)."
      : "Sort: tiles were removed in this version (use the bottom navigation)."
    );
  });
}

const btnLangEN = $("#btnLangEN");
const btnLangBG = $("#btnLangBG");
if(btnLangEN) btnLangEN.addEventListener("click", ()=>setLang("en"));
if(btnLangBG) btnLangBG.addEventListener("click", ()=>setLang("bg"));

updateHeaderUI();

// first route
  const initial = (location.hash || "#home").replace("#","");
  state.route = initial || "home";
  render();

  // register SW
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }


// ===== Dashboard Donuts v6.2.9 =====
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

function donutSVG({pct=0.5, title="Title", valueText="0%", subText="" , arcs=null}={}){
  const size = 150;
  const r = 58;
  const c = 2*Math.PI*r;
  const sw = 14;
  const track = `<circle class="donutTrack" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${sw}" />`;

  let segs = "";
  let offset = 0;
  if(Array.isArray(arcs) && arcs.length){
    for(const a of arcs){
      const p = clamp01(a.pct||0);
      const dash = (p*c).toFixed(2);
      const gap = (c - p*c).toFixed(2);
      segs += `<circle class="donutArc" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${a.color}"
                  stroke-width="${sw}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${(-offset*c).toFixed(2)}" />`;
      offset += p;
    }
  }else{
    const p = clamp01(pct);
    const dash = (p*c).toFixed(2);
    const gap = (c - p*c).toFixed(2);
    segs = `<circle class="donutArc" cx="${size/2}" cy="${size/2}" r="${r}" fill="none"
              stroke="url(#grad)" stroke-width="${sw}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="0" />`;
  }

  const defs = `
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#A78BFA"/>
        <stop offset="55%" stop-color="#60A5FA"/>
        <stop offset="100%" stop-color="#34D399"/>
      </linearGradient>
    </defs>
  `;

  return `
    <div class="donut">
      <svg viewBox="0 0 ${size} ${size}" aria-label="${escapeHtml(title)}">
        ${defs}
        ${track}
        ${segs}
      </svg>
      <div class="center">
        <div class="t">${escapeHtml(title)}</div>
        <div class="v">${escapeHtml(valueText)}</div>
        ${subText?`<div class="s">${escapeHtml(subText)}</div>`:""}
      </div>
    </div>
  `;
}

function donutProgress(current, goal){
  const g = Number(goal||0);
  const c = Number(current||0);
  if(g<=0) return {pct:0, txt:"0%", sub:`${Math.round(c)}`};
  const p = clamp01(c/g);
  return {pct:p, txt:`${Math.round(p*100)}%`, sub:`${Math.round(c)} / ${Math.round(g)}`};
}
// ===== end donuts =====



// ===== v6.3.0 Radial bars (reference-like) =====
function _hash01(str){
  // deterministic pseudo-rand 0..1
  let h = 2166136261;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function radialBarsSVG({id, value=0.5, centerValue="0", centerLabel="", mode="single"}={}){
  const size = 220;
  const cx = size/2, cy = size/2;
  const innerR = 42;
  const baseR = 62;
  const maxExtra = 26;
  const bars = 56;
  const gapDeg = 2.4; // gap between bars
  const barDeg = (360 / bars) - gapDeg;

  // palette close to reference (purple/pink/orange/blue)
  const pal = ["#60A5FA", "#8B5CF6", "#D946EF", "#FB7185", "#FB923C"];
  const bgRing = "rgba(255,255,255,0.10)";

  // create bar heights with a subtle wave pattern + deterministic noise
  const seed = _hash01(id);
  const wave = (i)=> (0.55 + 0.45*Math.sin((i/bars)*Math.PI*2 + seed*6.28));
  const noise = (i)=> (0.75 + 0.25*Math.sin((i*12.9898 + seed*78.233)*0.6));
  const activeBars = Math.round(clamp01(value) * bars);

  const defs = `
    <defs>
      <linearGradient id="rg-${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#60A5FA"/>
        <stop offset="35%" stop-color="#8B5CF6"/>
        <stop offset="65%" stop-color="#D946EF"/>
        <stop offset="82%" stop-color="#FB7185"/>
        <stop offset="100%" stop-color="#FB923C"/>
      </linearGradient>
      <filter id="rbglow-${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3.0" result="blur"/>
        <feColorMatrix in="blur" type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 0.7 0" result="glow"/>
        <feMerge>
          <feMergeNode in="glow"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  `;

  const toRad = (deg)=> (deg*Math.PI/180);
  const polar = (r, deg)=> ({ x: cx + r*Math.cos(toRad(deg)), y: cy + r*Math.sin(toRad(deg)) });

  function arcPath(r1, r2, startDeg, endDeg){
    const p1 = polar(r2, startDeg);
    const p2 = polar(r2, endDeg);
    const p3 = polar(r1, endDeg);
    const p4 = polar(r1, startDeg);
    const large = (endDeg-startDeg) > 180 ? 1 : 0;
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${r2} ${r2} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${r1} ${r1} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      "Z"
    ].join(" ");
  }

  let shapes = "";
  for(let i=0;i<bars;i++){
    const start = (i*(360/bars)) + (gapDeg/2) - 90;
    const end = start + barDeg;
    const h = wave(i)*noise(i); // 0..~1
    const r2 = baseR + (h*maxExtra);
    const r1 = innerR + 18; // thickness
    const active = i < activeBars;

    const fill = active ? `url(#rg-${id})` : bgRing;
    const op = active ? 1 : 0.35;
    shapes += `<path d="${arcPath(r1, r2, start, end)}" fill="${fill}" opacity="${op}" ${active?`filter="url(#rbglow-${id})"`:""} />`;
  }

  // extra outer ticks ring (faint)
  let ticks = "";
  const tickBars = 84;
  for(let i=0;i<tickBars;i++){
    const ang = (i*(360/tickBars)) - 90;
    const p1 = polar(baseR + maxExtra + 8, ang);
    const p2 = polar(baseR + maxExtra + 14, ang);
    ticks += `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="rgba(255,255,255,0.10)" stroke-width="2" stroke-linecap="round" />`;
  }

  const center = `
    <circle cx="${cx}" cy="${cy}" r="${innerR+8}" fill="rgba(0,0,0,0.25)" />
    <text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="30" font-weight="900" fill="rgba(255,255,255,0.92)">${escapeHtml(centerValue)}</text>
    <text x="${cx}" y="${cy+22}" text-anchor="middle" font-size="12" font-weight="800" fill="rgba(255,255,255,0.60)">${escapeHtml(centerLabel)}</text>
  `;

  return `
    <div class="donut">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-label="${escapeHtml(centerLabel)}">
        ${defs}
        ${ticks}
        ${shapes}
        ${center}
      </svg>
    </div>
  `;
}
// ===== end v6.3.0 =====

})();
