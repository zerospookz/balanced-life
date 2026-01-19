
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
    finGoals: [], // {id,name,type:'auto'|'manual',target,period:'month'|'range',start,end,createdAt,archived:false,manualProgress?:number}
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
    prefs: { haptics: false, sound: false },
    workoutPlan: {"Понеделник": {"Фокус": "Push + Planche (тежко) + Handstand", "Skill: Handstand (15–20 мин)": ["Chest-to-wall 5×30–45 сек (линия)", "Kick-ups 6–10 опита ×10–25 сек", "Scap shrugs в стойка 3×10"], "Skill: Planche (8–12 мин)": ["Tuck/Frog holds 6–10×6–12 сек", "Planche leans 3×20 сек"], "Skill: Flag (8–12 мин)": ["(по желание) 2–4 леки опита"], "Сила — Блок A (тежко)": ["Bench press ИЛИ Weighted dips 4×4–6", "Overhead press 3×5–8"], "Сила — Блок B": ["Pseudo planche push-ups 4×6–10", "Hollow hold 4×20–40 сек"], "Аксесоари / Прехаб": ["Lateral raise 3×12–20", "Китки: wrist rocks 2×10"], "Кондиция / Спорт": [], "Център време (мин)": "70–95", "Бележки": "RPE 7–8; спри при разпад на форма"}, "Вторник": {"Фокус": "Pull (тежко) + Flag + Набирания", "Skill: Handstand (15–20 мин)": ["(кратко: 3–5 леки опита по 10–15 сек)"], "Skill: Planche (8–12 мин)": [], "Skill: Flag (8–12 мин)": ["Tuck/ластик 6–10×5–10 сек", "Негативи 4×3–6 сек (контрол)"], "Сила — Блок A (тежко)": ["Weighted pull-ups 5×3–5", "Chin-ups 3×6–10"], "Сила — Блок B": ["Row (щанга/опора) 4×6–10", "Lat pulldown 3×10–15"], "Аксесоари / Прехаб": ["Face pulls 3×15–20", "External rotations 3×15–20", "Side plank/Copenhagen 4×20–40 сек/страна"], "Кондиция / Спорт": [], "Център време (мин)": "70–95", "Бележки": "Фокус: стабилни рамене, лакът без болка"}, "Сряда": {"Фокус": "Крака (фитнес) + Core + лека стойка", "Skill: Handstand (15–20 мин)": ["Scap shrugs 3×10", "3–5 леки опита стойка (без борба)"], "Skill: Planche (8–12 мин)": [], "Skill: Flag (8–12 мин)": [], "Сила — Блок A (тежко)": ["Squat (back/front) 4×3–6", "RDL 4×5–8"], "Сила — Блок B": ["Bulgarian split squat 3×8–12/крак", "Leg curl ИЛИ Nordic прогресия 3×8–12"], "Аксесоари / Прехаб": ["Calves 4×10–20", "Ab wheel ИЛИ Hanging knee raises 4×8–15"], "Кондиция / Спорт": [], "Център време (мин)": "70–95", "Бележки": "Не до отказ (за да пазиш краката)"}, "Четвъртък": {"Фокус": "Кондиция: Бокс + Въже + Мобилност", "Skill: Handstand (15–20 мин)": [], "Skill: Planche (8–12 мин)": [], "Skill: Flag (8–12 мин)": [], "Сила — Блок A (тежко)": [], "Сила — Блок B": [], "Аксесоари / Прехаб": ["Прехаб 10 мин: scap push-ups 2×10", "Wrist rocks 2×10", "External rotations 3×15–20"], "Кондиция / Спорт": ["Въже 12×(40/40)", "Бокс 8–12 рунда × 2–3 мин"], "Център време (мин)": "45–75", "Бележки": "Дръж умерено (техника + дишане)"}, "Петък": {"Фокус": "Upper (обем/умение) + Planche + Pull-up вариации", "Skill: Handstand (15–20 мин)": ["6–10 опита ×10–25 сек (контрол)", "Wall line 2×30 сек"], "Skill: Planche (8–12 мин)": ["Holds 6–8×8–12 сек", "Lean 3×20 сек"], "Skill: Flag (8–12 мин)": ["4–6 леки опита ×5–8 сек (само чисто)"], "Сила — Блок A (тежко)": ["Explosive pull-ups / chest-to-bar 6×2–4", "Archer / Typewriter 4×3–6/страна"], "Сила — Блок B": ["Incline DB press 4×8–12", "Seated cable row 3×10–15"], "Аксесоари / Прехаб": ["Curls 3×10–15", "Triceps pushdown 3×10–15", "Farmer/Suitcase carry 6×20–40 м"], "Кондиция / Спорт": [], "Център време (мин)": "70–95", "Бележки": "Пази свежест за уикенда (без отказ)"}, "Събота": {"Фокус": "Футбол + кратък Skill/прехаб (леко)", "Skill: Handstand (15–20 мин)": ["8–12 мин лесни опита (или стена)"], "Skill: Planche (8–12 мин)": ["Lean 3×15–25 сек", "PPPUs 3×8 (леки)"], "Skill: Flag (8–12 мин)": ["Само ако си свеж: 1–3 опита ×5–8 сек"], "Сила — Блок A (тежко)": [], "Сила — Блок B": [], "Аксесоари / Прехаб": ["Face pulls 2×20", "External rotations 2×20", "Разтягане 5–10 мин"], "Кондиция / Спорт": ["Футбол (трен./мач)"], "Център време (мин)": "20–45 + футбол", "Бележки": "Ако мачът е тежък → само мобилност"}, "Неделя": {"Фокус": "Футбол + възстановяване", "Skill: Handstand (15–20 мин)": [], "Skill: Planche (8–12 мин)": [], "Skill: Flag (8–12 мин)": [], "Сила — Блок A (тежко)": [], "Сила — Блок B": [], "Аксесоари / Прехаб": ["Мобилност 10–15 мин (грасци/бедра/таз/гръб/рамене)"], "Кондиция / Спорт": ["Футбол", "Zone 2 20–40 мин (по желание)"], "Център време (мин)": "20–40 + футбол", "Бележки": "Цел: възстановяване"}},
  };

  // ---------- Finances helpers (v6.5.0) ----------
  const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

  function startOfMonthISO(iso = todayISO()){
    return iso.slice(0,7) + "-01";
  }

  function endOfMonthISO(iso = todayISO()){
    const d = new Date(iso + "T00:00:00");
    const end = new Date(d.getFullYear(), d.getMonth()+1, 0);
    return isoFromDate(end);
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function dateInRange(iso, startISO, endISO){
    if(!iso) return false;
    return iso >= startISO && iso <= endISO;
  }

  function sumFinances({startISO, endISO}){
    let income = 0, expense = 0;
    for(const it of (state.finances||[])){
      const d = it.date || "";
      if(!dateInRange(d, startISO, endISO)) continue;
      if(it.type === "income") income += Number(it.amount||0);
      else expense += Number(it.amount||0);
    }
    const net = income - expense;
    return { income, expense, net };
  }

  function fmtMoneyBGN(n){
    const x = Number(n||0);
    const sign = x < 0 ? "-" : "";
    const abs = Math.abs(x);
    return sign + abs.toLocaleString("bg-BG", {maximumFractionDigits:2, minimumFractionDigits:2}) + " лв";
  }

  function buildDailySeries({startISO, endISO}){
    const map = new Map();
    const start = new Date(startISO + "T00:00:00");
    const end = new Date(endISO + "T00:00:00");
    for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
      map.set(isoFromDate(d), {income:0, expense:0});
    }
    for(const it of (state.finances||[])){
      const d = it.date || "";
      if(!map.has(d)) continue;
      const rec = map.get(d);
      if(it.type === "income") rec.income += Number(it.amount||0);
      else rec.expense += Number(it.amount||0);
    }
    return Array.from(map.entries()).map(([date, v])=>({date, ...v}));
  }
// ===== i18n v6.3.3 (EN/BG) =====
const I18N = {
  en: {
    offlineSub: "Offline • data stays on your phone",
    langEN: "ENG",
    langBG: "BG",
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
    workoutsMeta1: "{done} / {goal} min",
    workoutsMeta2: "{sessions} sessions this week",
    nutritionMeta1: "{left} kcal left",
    nutritionMeta2: "Macros: —",
    insightKcalLeft: "You have {left} kcal left today.",
    insightWorkoutBehind: "You're {pct}% behind weekly workouts.",
    insightWorkoutAhead: "Nice — you're {pct}% ahead on workouts.",
    insightSpendingHigh: "Spending is +{pct}% vs usual.",
    insightOnTrack: "You're on track today.",
    openHabits: "Open habit tracker",
    habitsPage: "Habits",
    financesMeta1: "Savings rate: {rate}%",
    financesMeta2: "Income {inc} • Expenses {exp}",
    net: "Net",
    actionsWorkout: "+ Workout",
    actionsFinance: "+ Income/Expense",
    actionsFood: "+ Food",
    manageHabitsTitle: "Manage habits",
    manageHabitsSub: "Add / delete habits for the tracker.",
    name: "Name",
    iconEmoji: "Icon (emoji)",
    add: "Add",
    currentHabits: "Current habits",
    habitDeleted: "Habit deleted.",
    habitAdded: "Habit added.",
    maxHabits: "You can have up to 10 habits.",
    habitExists: "Already added.",
    noHabitsShort: "No habits yet."
  },
  bg: {
    offlineSub: "Офлайн • данните са на телефона",
    langEN: "ENG",
    langBG: "BG",
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
    workoutsMeta1: "{done} / {goal} мин",
    workoutsMeta2: "{sessions} тренировки тази седмица",
    nutritionMeta1: "Остават {left} kcal",
    nutritionMeta2: "Макроси: —",
    insightKcalLeft: "Остават ти {left} kcal за днес.",
    insightWorkoutBehind: "Изоставаш с {pct}% от седмичните тренировки.",
    insightWorkoutAhead: "Супер — напред си с {pct}% при тренировките.",
    insightSpendingHigh: "Разходите са +{pct}% спрямо обичайното.",
    insightOnTrack: "Вървиш по план днес.",
    openHabits: "Отвори навици",
    habitsPage: "Навици",
    financesMeta1: "Спестяване: {rate}%",
    financesMeta2: "Приходи {inc} • Разходи {exp}",
    net: "Нето",
    actionsWorkout: "+ Тренировка",
    actionsFinance: "+ Приход/разход",
    actionsFood: "+ Храна",
    manageHabitsTitle: "Нови навици",
    manageHabitsSub: "Добави / изтрий навик за тракъра.",
    name: "Име",
    iconEmoji: "Иконка (emoji)",
    add: "Добави",
    currentHabits: "Текущи навици",
    habitDeleted: "Навикът е изтрит.",
    habitAdded: "Навикът е добавен.",
    maxHabits: "Можеш да имаш до 10 навика.",
    habitExists: "Вече е добавен.",
    noHabitsShort: "Нямаш навици."
  }
};

function t(key){
  const lang = (state && state.lang) ? state.lang : "en";
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}


function setTheme(theme){
  // Hard lock to dark for now
  const t = "dark";
  document.documentElement.setAttribute("data-theme", t);
  try{ localStorage.setItem("theme", t); }catch(_){}
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

  const toggle = document.getElementById("btnLangToggle");
  if(toggle){
    const isBG = (state.lang||"en") === "bg";
    toggle.classList.toggle("isBG", isBG);
    toggle.setAttribute("aria-checked", isBG ? "true" : "false");

    // v6.9.2: show only the active language inside the circle
    const txt = toggle.querySelector(".langText");
    if(txt) txt.textContent = isBG ? "BG" : "EN";
  }
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
const APP_VERSION = "7.3";
const THEME_KEY = "bl_theme_mode"; // light | dark

// NOTE v6.9.2: Light theme is temporarily locked.
function applyTheme(_mode){
  const root = document.documentElement;
  const m = "light";
  root.setAttribute("data-theme", m);
  root.setAttribute("data-sky", "day");
  localStorage.setItem(THEME_KEY, m);
}

applyTheme("light");

function toggleThemeQuick(){
  // locked for now
  applyTheme("light");
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render(); // keep UI consistent after any write
  }

  let state = loadState();

  
  
  // THEME_LOCK_v702
  setTheme("dark");
  updateHeaderUI();
  validateRuntime();
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
    // Workouts: minutes + sessions last 7 days
    const cut = new Date(Date.now()-6*24*3600*1000);
    let wmin=0;
    let wsess=0;
    for(const s of state.workouts){
      const d=new Date(s.date||"");
      if(!isNaN(d) && d>=cut){
        wmin += Number(s.minutes||0);
        wsess += 1;
      }
    }
    // progress: simplistic normalized score
    const budget = Math.max(0, income-expense);
    const p = Math.min(1, (budget/200 + kcal/2000 + wmin/180)/3);
    const workoutGoalMin = Number(state.workoutGoalMin||state.goals?.workoutMin||180);
    const kcalGoal = Number(state.kcalGoal||state.goals?.kcal||2000);
    const kcalLeft = Math.max(0, kcalGoal - kcal);

    const net = income - expense;
    const savingsRateRaw = income > 0 ? (net / income) : 0;
    const savingsRate = Math.max(0, Math.min(1, savingsRateRaw));

    // Insight: one short sentence (Today focus)
    const insight = buildInsight({kcalLeft, kcalGoal, kcal, wmin, workoutGoalMin, expense, income});

    return {income, expense, budget, kcal, wmin, wsess, workoutGoalMin, kcalGoal, kcalLeft, net, savingsRate, insight, progress:p};
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

    // Show full week range in the comfy pill on mobile/desktop (not only YYYY-W01)
    const savedLabel = (weeks.length
      ? (weeks.map(w=>({
          val: `${year}-W${String(w.week).padStart(2,"0")}`,
          label: `W${String(w.week).padStart(2,"0")} • ${w.start} → ${w.end}`
        })).find(x=>x.val===saved)?.label)
      : null) || saved;

    const habits = state.habits || [];
    const logs = state.habitLogs || {};
    const nowMs = Date.now();
    const lastT = state._lastToggle;

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
            <div class="weekComfy" title="${t("week")}">
              <div class="weekComfyLabel">${t("week")}</div>
              <div class="weekComfyPill">
                <span class="weekComfyValue">${escapeHtml(savedLabel)}</span>
                <span class="weekComfyCaret">▾</span>
                <select class="weekComfySelect" data-action="setHabitWeekFull">
                ${weekOptions}
              </select>
              </div>
            </div>
            <button class="btn addPill habitAddBtn" type="button" data-action="addHabit">
              <span class="addPillInner">
                <span class="addPillText">${t("addHabit")}</span>
                <span class="addPillPlus">+</span>
              </span>
            </button>
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
                const pulse = !!(lastT && lastT.hid===h.id && lastT.iso===d && (nowMs-lastT.ts<900));
                return `<button class="habitBox ${on?"on":""} ${pulse?"pulse":""}" type="button" style="--hc:${h.color||"#60a5fa"}"
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
        <div class="insightRow">${escapeHtml(d.insight||t("insightOnTrack"))}</div>
        <div class="donutRow">
          <button class="donutCard donutCardLink" type="button" data-route="workouts" aria-label="Workouts">
            <div class="donutStack">
              ${(()=>{
                const prog = donutProgress(d.wmin, d.workoutGoalMin);
                return radialBarsSVG({id:"w", value: prog.pct, centerValue: `${Math.round(prog.pct*100)}%`, centerLabel: t("workouts")});
              })()}
              <div class="donutMeta">
                ${t("workoutsMeta1").replace("{done}", Math.round(d.wmin)).replace("{goal}", Math.round(d.workoutGoalMin))}<br/>
                ${t("workoutsMeta2").replace("{sessions}", d.wsess)}
              </div>
            </div>
          </button>

          <button class="donutCard donutCardLink" type="button" data-route="finances" aria-label="Finances">
            <div class="donutStack">
              ${(()=>{
                const netTxt = (d.net>=0?"+":"") + money(d.net);
                return radialBarsSVG({id:"f", value: d.savingsRate, centerValue: netTxt, centerLabel: t("net")});
              })()}
              <div class="donutMeta">
                ${t("financesMeta1").replace("{rate}", Math.round(d.savingsRate*100))}<br/>
                ${t("financesMeta2").replace("{inc}", money(d.income)).replace("{exp}", money(d.expense))}
              </div>
            </div>
          </button>

          <button class="donutCard donutCardLink" type="button" data-route="nutrition" aria-label="Nutrition">
            <div class="donutStack">
              ${(()=>{
                const prog = donutProgress(d.kcal, d.kcalGoal);
                return radialBarsSVG({id:"k", value: prog.pct, centerValue: `${Math.round(prog.pct*100)}%`, centerLabel: t("nutrition")});
              })()}
              <div class="donutMeta">
                ${t("nutritionMeta1").replace("{left}", Math.round(d.kcalLeft))}<br/>
                ${t("nutritionMeta2")}
              </div>
            </div>
          </button>
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
            <div class="weekTileSub">Today • add food<br/>Goal: ${Math.round(d.kcalGoal||0)} kcal</div>
          </button>

          <button class="weekTile" type="button" data-route="workouts" aria-label="Workouts tile">
            <div class="weekTileTop">
              <div class="weekTileTitle">Workouts</div>
              <div class="weekTileIcon">🏋️</div>
            </div>
            <div class="weekTileValue">${Math.round(d.wmin)} min</div>
            <div class="weekTileSub">Last 7 days • ${Math.round(d.wsess||0)} sessions<br/>Plan inside</div>
          </button>
</div>
</section>
      ${viewHabitsHome()}
      </div>
    `;
  }

  
    function viewHabitsHome(){
    return `
      <div class="homeHabitsInline">${viewHabitTracker()}</div>
      <section class="card section homeHabitsLink" data-route="habits" role="button" aria-label="Open habit tracker">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <div class="h1">${t("habitTracker")}</div>
            <div class="sub">${t("openHabits")}</div>
          </div>
          <div class="chev" aria-hidden="true">›</div>
</div>
      </section>
    `;
  }

function viewHabitsPage(){
    return `
      <div class="pageStack">
        ${viewHabitTracker()}
      </div>
    `;
  }

function viewFinances() {
    const today = todayISO();
    const monthStart = startOfMonthISO(today);
    const monthEnd = endOfMonthISO(today);

    const thisM = sumFinances({ startISO: monthStart, endISO: monthEnd });

    // previous month for % change
    const prevRange = (() => {
      const d = new Date(monthStart + "T00:00:00");
      d.setDate(0); // last day of previous month
      const prevEnd = isoFromDate(d);
      const prevStartDate = new Date(d.getFullYear(), d.getMonth(), 1);
      return { startISO: isoFromDate(prevStartDate), endISO: prevEnd };
    })();
    const prevM = sumFinances({ startISO: prevRange.startISO, endISO: prevRange.endISO });

    const pctChange = (cur, prev) => {
      const c = Number(cur || 0);
      const p = Number(prev || 0);
      if (!p) return c ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    const incomePct = pctChange(thisM.income, prevM.income);
    const expensePct = pctChange(thisM.expense, prevM.expense);

    // last 28 days chart
    const start28 = (() => {
      const d = new Date(today + "T00:00:00");
      d.setDate(d.getDate() - 27);
      return isoFromDate(d);
    })();
    const series = buildDailySeries({ startISO: start28, endISO: today });

    const chartSVG = (() => {
      const W = 900, H = 260, pad = 26;
      const maxV = Math.max(1, ...series.map(x => x.income), ...series.map(x => x.expense));
      const xStep = (W - pad * 2) / Math.max(1, (series.length - 1));
      const y = (v) => (H - pad) - (v / maxV) * (H - pad * 2);

      const points = (key) => series.map((d, i) => `${(pad + i * xStep).toFixed(2)},${y(d[key]).toFixed(2)}`).join(" ");
      const pInc = points("income");
      const pExp = points("expense");

      const last = series[series.length - 1] || { income: 0, expense: 0 };
      const lastX = (pad + (series.length - 1) * xStep).toFixed(2);

      return `
        <div class="finChart">
          <svg viewBox="0 0 ${W} ${H}" class="finSvg" aria-label="Finances chart">
            <defs>
              <linearGradient id="gInc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="rgba(52,211,153,1)"/>
                <stop offset="100%" stop-color="rgba(34,197,94,1)"/>
              </linearGradient>
              <linearGradient id="gExp" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="rgba(251,146,60,1)"/>
                <stop offset="100%" stop-color="rgba(239,68,68,1)"/>
              </linearGradient>
              <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.2" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            ${[0.2, 0.4, 0.6, 0.8].map(fr => {
              const yy = (H - pad) - fr * (H - pad * 2);
              return `<line x1="${pad}" y1="${yy.toFixed(2)}" x2="${W - pad}" y2="${yy.toFixed(2)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
            }).join("")}

            <polyline id="finIncLine" points="${pInc}" fill="none" stroke="url(#gInc)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" class="chart-line-income"/>
            <polyline id="finExpLine" points="${pExp}" fill="none" stroke="url(#gExp)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" class="chart-line-expense"/>

            ${series.map((pt, i) => {
              const cx = (pad + i * xStep).toFixed(2);
              const cyI = y(pt.income).toFixed(2);
              const cyE = y(pt.expense).toFixed(2);
              return `
                <circle class="chart-dot hit" cx="${cx}" cy="${cyI}" r="10" fill="transparent" data-kind="income" data-i="${i}" data-val="${pt.income}" />
                <circle class="chart-dot hit" cx="${cx}" cy="${cyE}" r="10" fill="transparent" data-kind="expense" data-i="${i}" data-val="${pt.expense}" />
              `;
            }).join("")}

            <circle cx="${lastX}" cy="${y(last.income).toFixed(2)}" r="6" fill="rgba(52,211,153,1)"/>
            <circle cx="${lastX}" cy="${y(last.expense).toFixed(2)}" r="6" fill="rgba(239,68,68,1)"/>
          </svg>
          <div id="finChartTip" class="finChartTip" hidden></div>

          <div class="finLegend">
            <span class="finLegendItem"><span class="finDot inc"></span>Income</span>
            <span class="finLegendItem"><span class="finDot exp"></span>Expenses</span>
          </div>
        </div>
      `;
    })();

    const goals = (state.finGoals || []).filter(g => !g.archived);

    function goalRange(g) {
      if (g.period === "range" && g.start && g.end) return { startISO: g.start, endISO: g.end };
      return { startISO: monthStart, endISO: monthEnd };
    }

    function goalCurrent(g) {
      if (g.type === "manual") return Number(g.manualProgress || 0);
      const r = goalRange(g);
      const s = sumFinances({ startISO: r.startISO, endISO: r.endISO });
      return Math.max(0, Number(s.net || 0));
    }

    function goalStatus(g, current) {
      const r = goalRange(g);
      if (r.startISO === monthStart && r.endISO === monthEnd) {
        const nowDay = Number(today.slice(8, 10));
        const endDay = Number(monthEnd.slice(8, 10));
        const expected = Number(g.target || 0) * (nowDay / Math.max(1, endDay));
        const diff = current - expected;
        if (diff >= Number(g.target || 0) * 0.05) return { label: "Ahead", cls: "ahead" };
        if (diff <= -Number(g.target || 0) * 0.05) return { label: "Behind", cls: "behind" };
        return { label: "On track", cls: "track" };
      }
      return { label: "In progress", cls: "track" };
    }

    // icon mapping using extracted icons (embedded in the project root)
    function finIconFor(note = "", type = "expense", category = "") {
      const s = String(note || "").toLowerCase();
      const c = String(category || "").toLowerCase();
      const has = (src, ...keys) => keys.some(k => s.includes(k) || c.includes(k));

      if (type === "income" && has("salary", "заплата")) return { src: "assets/fin/salary.png", alt: "Salary" };
      if (type === "income" && has("freelance", "фрий", "project", "проект")) return { src: "assets/fin/freelance.png", alt: "Freelance" };

      if (has("groceries", "grocery", "магазин", "храна", "kaufland", "lidl", "billa")) return { src: "assets/fin/groceries.png", alt: "Groceries" };
      if (has("bills", "bill", "сметка", "ток", "вода", "интернет")) return { src: "assets/fin/bills.png", alt: "Bills" };
      if (has("bank", "банка", "transfer", "превод")) return { src: "assets/fin/bank.png", alt: "Bank" };
      if (has("vacation", "почивка", "hotel", "airbnb")) return { src: "assets/fin/vacation.png", alt: "Vacation" };
      if (has("investment", "invest", "акции", "crypto", "крипто")) return { src: "assets/fin/investment.png", alt: "Investment" };
      if (has("credit", "card", "карта")) return { src: "assets/fin/creditcard.png", alt: "Credit card" };
      if (has("calculator", "calc", "калк")) return { src: "assets/fin/calculator.png", alt: "Calculator" };
      if (has("piggy", "спест", "savings", "emergency", "спешни")) return { src: "assets/fin/piggy.png", alt: "Piggy bank" };

      // fallback by type
      return type === "income"
        ? { src: "assets/fin/salary.png", alt: "Income" }
        : { src: "assets/fin/groceries.png", alt: "Expense" };
    }
    const goalsHtml = `
      <section class="card section finGlass">
        <div class="finSectionHead">
          <div>
            <div class="h1">Goals</div>
            <div class="sub">This month • Custom</div>
          </div>
          <button class="entry-btn finEntryBtn" data-action="addFinance" type="button">Entry <span class="plus">+</span></button>
        </div>

        <div class="finGoalsGrid2">
          ${goals.length ? goals.map(g => {
            const cur = goalCurrent(g);
            const target = Number(g.target || 0);
            const pct = target > 0 ? clamp(cur / target, 0, 1) : 0;
            const left = Math.max(0, target - cur);
            const st = goalStatus(g, cur);
            const range = goalRange(g);
            const rangeLabel = (range.startISO === monthStart && range.endISO === monthEnd) ? "This month" : `${range.startISO} → ${range.endISO}`;
            const typeChip = g.type === "manual" ? "MANUAL" : "AUTO";
            const chipCls = g.type === "manual" ? "manual" : "auto";
            const icon = g.type === "manual" ? "fin_piggy.png" : "fin_investment.png";

            return `
              <div class="finGoalCard2">
                <div class="finGoalHeader2">
                  <div class="finBubble">
                    <img src="${icon}" alt="" />
                  </div>
                  <div class="finGoalInfo2">
                    <div class="finGoalName2">${escapeHtml(g.name || "Goal")}</div>
                    <div class="finGoalMeta2">${escapeHtml(rangeLabel)} • <span class="finChip ${chipCls}">${typeChip}</span></div>
                  </div>
                  <button class="finIconBtn" title="Delete" data-action="delGoal" data-gid="${g.id}">⋯</button>
                </div>

                <div class="finGoalNumbers2">
                  <div class="finGoalNow2">${fmtMoneyBGN(cur)}</div>
                  <div class="finGoalOf2">/ ${fmtMoneyBGN(target)}</div>
                </div>

                <div class="finBar2" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}">
                  <div class="finBarFill2 ${st.cls}" style="width:${Math.round(pct * 100)}%"></div>
                </div>

                <div class="finGoalBottom2">
                  <div class="finGoalLeft2">Остават: <b>${fmtMoneyBGN(left)}</b></div>
                  <div class="finGoalStatus2 ${st.cls}">${st.label}</div>
                </div>

                ${g.type === "manual" ? `
                  <div class="finGoalActions2">
                    <button class="btn ghost" data-action="addGoalProgress" data-gid="${g.id}">+ Add</button>
                    <button class="btn ghost" data-action="resetGoalProgress" data-gid="${g.id}">- Remove</button>
                  </div>
                ` : ``}
              </div>
            `;
          }).join("") : `
            <div class="finEmpty">
              <div class="finEmptyTitle">No goals yet</div>
              <div class="small">Create a goal like “Save 100 BGN this month”.</div>
            </div>
          `}
        </div>
      </section>
    `;

    const q = (state._finQuery || "").trim().toLowerCase();
    const entries = (state.finances || []).map((it, i) => ({ ...it, __i: i }))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const filtered = q ? entries.filter(it => {
      const s = `${it.type} ${it.note || ""} ${it.date || ""} ${it.amount || ""}`.toLowerCase();
      return s.includes(q);
    }) : entries;

    const rows = filtered.map((it) => {
      const sign = it.type === "income" ? "+" : "-";
      const cls = it.type === "income" ? "inc" : "exp";
      const label = it.type === "income" ? "Income" : "Expense";
      const note = (it.note || "").trim();
      const icon = finIconFor(note, it.type);

      return `
        <div class="finEntryCard">
          <div class="finBubble">
            <img src="${icon.src}" alt="${escapeHtml(icon.alt)}" />
          </div>
          <div class="finEntryMain">
            <div class="finEntryTop">
              <div class="finEntryTitle">${escapeHtml(note || label)}</div>
              <div class="finEntryAmount ${cls}">${sign} ${fmtMoneyBGN(it.amount)}</div>
            </div>
            <div class="finEntrySub">
              <span class="finEntryTag ${cls}">${label}</span>
              <span class="finEntryDate">${escapeHtml(it.date || "")}</span>
            ${it.category ? ` • <span class="finEntryCat">${escapeHtml(it.category)}</span>` : ``}</div>
          </div>
          <button class="finEntryDel" data-action="delFinance" data-idx="${it.__i}" title="Delete">✕</button>
        </div>
      `;
    }).join("");

    return `
      <div class="pageStack financesPage">
        <section class="card section finHero">
          <div class="finHeroHead">
            <div>
              <div class="h1">Finances</div>
              <div class="sub">Income and expenses</div>
            </div>
            <button class="btn finEntryBtn" data-action="addFinance" type="button">
              <span class="addPillInner"><span class="addPillText">Entry <span class='plus'>+</span></span><span class="addPillPlus">+</span></span>
            </button>
          </div>

          <div class="finChartShell">
            <div class="finStats finStatsOverlay">
              <div class="finStatCard positive">
                <div class="finStatLabel">Income</div>
                <div class="finStatRow">
                  <div class="finStatValue">+ ${fmtMoneyBGN(thisM.income)}</div>
                  <div class="finStatDelta">▲ ${Math.abs(incomePct)}%</div>
                </div>
              </div>

              <div class="finBalancePill">
                <div class="finBalanceLabel">Balance</div>
                <div class="finBalanceValue">${fmtMoneyBGN(thisM.net)}</div>
                <div class="finPager"><span></span><span></span><span class="on"></span><span></span><span></span></div>
              </div>

              <div class="finStatCard negative">
                <div class="finStatLabel">Expenses</div>
                <div class="finStatRow">
                  <div class="finStatValue">- ${fmtMoneyBGN(thisM.expense)}</div>
                  <div class="finStatDelta">▼ ${Math.abs(expensePct)}%</div>
                </div>
              </div>
            </div>

            ${chartSVG}
          </div>
        </section>

        ${goalsHtml}

        <section class="card section finGlass recentSection">
          <div class="finSectionHead">
            <div>
              <div class="h1">Recent Entries</div>
              <div class="sub">Search and manage</div>
            </div>
            <input class="finSearch" type="search" placeholder="Search..." value="${escapeAttr(state._finQuery || "")}" data-action="finQuery" />
          </div>

          <div class="finEntriesGrid">
            ${rows || `<div class="finEmpty"><div class="finEmptyTitle">No entries yet</div><div class="small">Tap “Entry +” to add income or expenses.</div></div>`}
          </div>
        </section>
      </div>`;
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
          <button class="btn addPill" data-action="addFood" type="button"><span class="addPillInner"><span class="addPillText">+ Food</span><span class="addPillPlus">+</span></span></button>
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
            <button class="btn addPill smallAdd" data-action="addPlanItem" data-day="${escapeHtml(selected)}" data-sec="${escapeHtml(sec)}" type="button"><span class="addPillInner"><span class="addPillText">+ Add</span><span class="addPillPlus">+</span></span></button>
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
            <button class="btn addPill" data-action="addWorkout" type="button"><span class="addPillInner"><span class="addPillText">+ Workout</span><span class="addPillPlus">+</span></span></button>
          </div>
        </div>

        ${tab==="plan" ? `
          <div style="margin-top:12px" class="row">
            <div class="pill">📅 Ден:
              <select id="planDaySelect" data-action="selectPlanDay" style="padding:8px 10px;border-radius:12px">
                ${dayOptions}
              </select>
              </div>
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
        <div class="sub">Feedback</div>
        <div class="row" style="margin-top:10px;gap:12px;flex-wrap:wrap">
          <label class="pill" style="display:flex;gap:10px;align-items:center">
            <input type="checkbox" data-action="toggleHaptics" ${state.prefs && state.prefs.haptics ? "checked" : ""}>
            Haptics
          </label>
          <label class="pill" style="display:flex;gap:10px;align-items:center">
            <input type="checkbox" data-action="toggleSound" ${state.prefs && state.prefs.sound ? "checked" : ""}>
            Sound
          </label>
        </div>

        <div class="sub">Feedback</div>
        <div class="row" style="margin-top:10px;gap:12px;flex-wrap:wrap">
          <label class="pill" style="display:flex;gap:10px;align-items:center">
            <input type="checkbox" data-action="toggleHaptics" ${state.prefs && state.prefs.haptics ? "checked" : ""}>
            Haptics
          </label>
          <label class="pill" style="display:flex;gap:10px;align-items:center">
            <input type="checkbox" data-action="toggleSound" ${state.prefs && state.prefs.sound ? "checked" : ""}>
            Sound
          </label>
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

  function playClickSound(){
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 640;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.09);
    o.onended = ()=>{ try{ ctx.close(); }catch(e){} };
  }

  function feedbackTap(){
    try{
      const p = state.prefs || (state.prefs = {haptics:false,sound:false});
      if(p.haptics && navigator.vibrate) navigator.vibrate(12);
      if(p.sound) playClickSound();
    }catch(e){}
  }

  function tapBounce(el){
    if(!el) return;
    el.classList.remove("tapBounce");
    void el.offsetWidth; // restart animation
    el.classList.add("tapBounce");
    setTimeout(()=>el.classList.remove("tapBounce"), 240);
  }
  
function initFinancesUI(){
  const inc = document.getElementById("finIncLine");
  const exp = document.getElementById("finExpLine");
  const svg = document.querySelector(".finSvg");
  const tip = document.getElementById("finChartTip");

  if(inc && inc.getTotalLength){
    const L = inc.getTotalLength();
    inc.style.strokeDasharray = L;
    inc.style.strokeDashoffset = L;
    requestAnimationFrame(()=>{ inc.style.transition="stroke-dashoffset 900ms ease"; inc.style.strokeDashoffset="0"; });
  }
  if(exp && exp.getTotalLength){
    const L = exp.getTotalLength();
    exp.style.strokeDasharray = L;
    exp.style.strokeDashoffset = L;
    requestAnimationFrame(()=>{ exp.style.transition="stroke-dashoffset 900ms ease"; exp.style.strokeDashoffset="0"; });
  }

  if(svg && tip){
    const hits = svg.querySelectorAll(".chart-dot.hit");
    const fmt = v => (Number(v||0)).toFixed(2) + " BGN";
    hits.forEach(h=>{
      const show = ()=>{
        tip.textContent = (h.dataset.kind==="income"?"Income: ":"Expenses: ") + fmt(h.dataset.val);
        tip.hidden = false;
      };
      h.addEventListener("mouseenter", show);
      h.addEventListener("mouseleave", ()=> tip.hidden=true);
    });
  }
}

// ===== APP_GUARD_v697 (refactor barrier) =====
function safeRun(label, fn){
  try { return fn(); }
  catch(err){
    console.error("[BalancedLife]", label, err);
    try { toast("Error: " + (err && err.message ? err.message : String(err))); } catch(_){}
    return null;
  }
}

function validateRuntime(){
  const required = {render, setRoute, openModal, closeModal};
  const missing = Object.entries(required).filter(([k,v]) => typeof v !== "function").map(([k])=>k);
  if(missing.length){
    console.error("[BalancedLife] Missing functions:", missing);
  }
}
// ===== end APP_GUARD_v697 =====

function render() {
  return safeRun("render", () => {
    const view = $("#view");
    const route = (state.route || "home").replace(/[^a-z]/g,"");
    const html =
      route === "finances" ? viewFinances() :
      route === "nutrition" ? viewNutrition() :
      route === "workouts" ? viewWorkouts() :
      route === "habits" ? viewHabitsPage() :
      route === "settings" ? viewSettings() :
      viewHome();
    view.innerHTML = html;

    // attach internal route buttons
    $$("[data-route]").forEach(btn=>btn.addEventListener("click", ()=>setRoute(btn.dataset.route)));

    // bottom nav active
    $$(".bottomnav .tab").forEach(t=>t.classList.toggle("active", t.dataset.route===route));

    // actions
    $$("[data-action]").forEach(el=>{ if((el.dataset.action==="selectPlanDay" && el.tagName==="SELECT") || (el.dataset.action==="finQuery" && el.tagName==="INPUT")) return; el.addEventListener("click", handleAction); });
    // change actions
    $$("[data-action='selectPlanDay']").forEach(el=>el.addEventListener("change", handleAction));
    $$("[data-action='setTheme']").forEach(el=>el.addEventListener("change", handleAction));
    $$("[data-action='setHabitWeekFull']").forEach(el=>el.addEventListener("change", handleAction));
    $$("[data-action='finQuery']").forEach(el=>el.addEventListener("input", (e)=>{ state._finQuery = e.currentTarget.value || ""; render(); }));

    // set selected theme value
    const tSel = $("#themeSelect"); if(tSel){ const v = localStorage.getItem("bl_theme_mode") || "dark"; tSel.value = (v==="dark") ? "dark" : "light"; }
    $$("[data-action='importPlanFile']").forEach(el=>el.addEventListener("change", handleImportPlan));
    $$("[data-action='importAllFile']").forEach(el=>el.addEventListener("change", handleImportAll));
    if(route==="finances") requestAnimationFrame(()=>initFinancesUI());
  });
}

function handleAction(e) {
  return safeRun("action", () => {
    const a = e.currentTarget.dataset.action;
    // tap feedback for UI controls (optional via Settings)
    if(a!="toggleHabit") { feedbackTap(); tapBounce(e.currentTarget); }

    if(a==="toggleHabit") return toggleHabit(e.currentTarget.dataset.habit, e.currentTarget.dataset.date);
    if(a==="setHabitWeekFull") { state._habitWeekFull = e.currentTarget.value; saveState(); return render(); }
    if(a==="addHabit") return openAddHabit();
    if(a==="addFinance") return openAddFinance();

    // ----- Finances goals -----
    if(a==="addGoal") return openAddGoal();
    if(a==="delGoal") {
      const gid = e.currentTarget.dataset.gid;
      state.finGoals = (state.finGoals||[]).filter(g=>g.id!==gid);
      return saveState();
    }
    if(a==="addGoalProgress") return openAddGoalProgress(e.currentTarget.dataset.gid);
    if(a==="resetGoalProgress") {
      const gid = e.currentTarget.dataset.gid;
      const g = (state.finGoals||[]).find(x=>x.id===gid);
      if(g) g.manualProgress = 0;
      return saveState();
    }
    if(a==="explainAutoGoal") {
      openModal("Auto goal", `
        <div class="small">Auto goals calculate progress automatically:</div>
        <div class="pill" style="margin-top:10px">Saved = Income − Expenses (for the selected period)</div>
        <div class="small" style="margin-top:10px">Tip: If the net is negative, progress is shown as 0 (so it never punishes you).</div>
        <div class="row" style="justify-content:flex-end;margin-top:14px">
          <button class="btn primary" id="ok">Got it</button>
        </div>
      `);
      const ok = document.getElementById("ok");
      if(ok) ok.addEventListener("click", closeModal);
      return;
    }
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
if(a==="toggleHaptics") { state.prefs = state.prefs || {haptics:false,sound:false}; state.prefs.haptics = !state.prefs.haptics; saveState(); return render(); }
    if(a==="toggleSound") { state.prefs = state.prefs || {haptics:false,sound:false}; state.prefs.sound = !state.prefs.sound; saveState(); return render(); }

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
  });
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
    const cats = [
      {id:"salary", name:"Salary", icon:"assets/fin/salary.png"},
      {id:"vacation", name:"Vacation", icon:"assets/fin/vacation.png"},
      {id:"groceries", name:"Groceries", icon:"assets/fin/groceries.png"},
      {id:"briefcase", name:"Work", icon:"assets/fin/briefcase.png"},
      {id:"jar", name:"Savings", icon:"assets/fin/jar.png"},
      {id:"freelance", name:"Freelance", icon:"assets/fin/freelance.png"},
      {id:"bills", name:"Bills", icon:"assets/fin/bills.png"},
      {id:"bank", name:"Bank", icon:"assets/fin/bank.png"},
      {id:"calculator", name:"Calculator", icon:"assets/fin/calculator.png"},
      {id:"creditcard", name:"Credit card", icon:"assets/fin/creditcard.png"},
      {id:"investment", name:"Investment", icon:"assets/fin/investment.png"},
      {id:"piggy", name:"Piggy bank", icon:"assets/fin/piggy.png"},
    ];

    openModal("New entry", `
      <div class="finModalTop">
        <div class="finTypePills">
          <button type="button" class="finTypePill active" data-ftype="expense">Expense</button>
          <button type="button" class="finTypePill" data-ftype="income">Income</button>
          <input type="hidden" id="fType" value="expense"/>
        </div>
      </div>

      <div class="grid2">
        <div class="field">
          <label>Amount (BGN)</label>
          <input id="fAmount" type="number" step="0.01" inputmode="decimal" placeholder="0.00"/>
        </div>
        <div class="field">
          <label>Date</label>
          <input id="fDate" type="date" value="${todayISO()}"/>
        </div>
      </div>

      <div class="field">
        <label>Category</label>
        <div class="finCats" id="finCats">
          ${cats.map(c=>`
            <button type="button" class="finCatBtn" data-cat="${c.id}" title="${escapeHtml(c.name)}">
              <span class="finCatIcon"><img src="${c.icon}" alt="${escapeHtml(c.name)}"/></span>
              <span class="finCatLabel">${escapeHtml(c.name)}</span>
            </button>
          `).join("")}
        </div>
        <input type="hidden" id="fCategory" value="groceries"/>
      </div>

      <div class="field">
        <label>Note</label>
        <input id="fNote" type="text" placeholder="e.g. Rent, groceries…"/>
      </div>

      <div class="row" style="justify-content:flex-end;margin-top:14px;gap:10px">
        <button class="btn ghost" id="cancel">Cancel</button>
        <button class="btn primary" id="save">Save</button>
      </div>
    `, () => {
      const close = () => closeModal();
      $("#cancel").addEventListener("click", close);

      // type pills
      $$(".finTypePill").forEach(b=>{
        b.addEventListener("click", ()=>{
          $$(".finTypePill").forEach(x=>x.classList.remove("active"));
          b.classList.add("active");
          $("#fType").value = b.dataset.ftype || "expense";
          // small UX: if income, default category salary
          if($("#fType").value==="income") setCategory("salary");
        });
      });

      const setCategory = (id)=>{
        $("#fCategory").value = id;
        $$(".finCatBtn").forEach(x=>x.classList.toggle("active", x.dataset.cat===id));
      };

      // default selection
      setCategory("groceries");

      $$(".finCatBtn").forEach(b=>{
        b.addEventListener("click", ()=> setCategory(b.dataset.cat||"groceries"));
      });

      $("#save").addEventListener("click", () => {
        const type = ($("#fType").value || "expense");
        const amount = Number($("#fAmount").value || 0);
        const date = $("#fDate").value || todayISO();
        const note = ($("#fNote").value || "").trim();
        const category = $("#fCategory").value || "";

        if(!amount || amount <= 0) return toast("Enter a valid amount.");
        state.finances = state.finances || [];
        state.finances.push({ type, amount, date, note, category });
        saveState();
        close();
        render();
      });
    });
  }

  function openAddGoal(){
    const today = todayISO();
    const monthStart = startOfMonthISO(today);
    const monthEnd = endOfMonthISO(today);
    openModal("New goal", `
      <div class="field">
        <label>Goal name</label>
        <input id="gName" type="text" placeholder="e.g. Save 100 BGN" />
      </div>
      <div class="grid2">
        <div class="field">
          <label>Target (BGN)</label>
          <input id="gTarget" type="number" step="0.01" inputmode="decimal" placeholder="100" />
        </div>
        <div class="field">
          <label>Tracking</label>
          <select id="gType">
            <option value="auto">Auto (Income − Expenses)</option>
            <option value="manual">Manual (you add progress)</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Period</label>
        <select id="gPeriod">
          <option value="month">This month (${monthStart} → ${monthEnd})</option>
          <option value="range">Custom range</option>
        </select>
      </div>
      <div id="gRange" class="grid2" style="display:none">
        <div class="field">
          <label>Start</label>
          <input id="gStart" type="date" value="${monthStart}" />
        </div>
        <div class="field">
          <label>End</label>
          <input id="gEnd" type="date" value="${monthEnd}" />
        </div>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" id="cancel">Cancel</button>
        <button class="btn primary" id="save">Create</button>
      </div>
    `);

    const periodSel = document.getElementById("gPeriod");
    const range = document.getElementById("gRange");
    if(periodSel && range){
      const sync = ()=>{ range.style.display = (periodSel.value==="range") ? "grid" : "none"; };
      periodSel.addEventListener("change", sync);
      sync();
    }

    const cancel = document.getElementById("cancel");
    if(cancel) cancel.addEventListener("click", closeModal);

    const save = document.getElementById("save");
    if(save) save.addEventListener("click", ()=>{
      const name = (document.getElementById("gName").value||"").trim() || "Savings goal";
      const target = Number(document.getElementById("gTarget").value||0);
      if(!(target>0)) return alert("Please enter a target amount.");
      const type = document.getElementById("gType").value === "manual" ? "manual" : "auto";
      const period = document.getElementById("gPeriod").value === "range" ? "range" : "month";
      const start = (document.getElementById("gStart")?.value) || monthStart;
      const end = (document.getElementById("gEnd")?.value) || monthEnd;

      const g = {
        id: uid("g"),
        name,
        type,
        target,
        period,
        start: period==="range" ? start : null,
        end: period==="range" ? end : null,
        manualProgress: type==="manual" ? 0 : undefined,
        createdAt: Date.now(),
        archived: false
      };
      state.finGoals = [...(state.finGoals||[]), g];
      closeModal();
      saveState();
    });
  }

  function openAddGoalProgress(gid){
    const g = (state.finGoals||[]).find(x=>x.id===gid);
    if(!g) return;
    openModal("Add progress", `
      <div class="small">Goal: <b>${escapeHtml(g.name||"Goal")}</b></div>
      <div class="field" style="margin-top:10px">
        <label>Amount (BGN)</label>
        <input id="gpAmount" type="number" step="0.01" inputmode="decimal" placeholder="20" />
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" id="cancel">Cancel</button>
        <button class="btn primary" id="save">Add</button>
      </div>
    `);
    const cancel = document.getElementById("cancel");
    if(cancel) cancel.addEventListener("click", closeModal);
    const save = document.getElementById("save");
    if(save) save.addEventListener("click", ()=>{
      const amt = Number(document.getElementById("gpAmount").value||0);
      if(!(amt>0)) return;
      g.manualProgress = Number(g.manualProgress||0) + amt;
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

  // ===== v6.3.7 ${t("presetHabits")} =====
  const PRESET_HABITS = [
  {id: "h_workouts", name: "Workouts", icon: "🏋️"},
  {id: "h_walk", name: "Walk", icon: "🚶"},
  {id: "h_run", name: "Run", icon: "🏃"},
  {id: "h_cardio", name: "Cardio", icon: "❤️"},
  {id: "h_stretch", name: "Stretch", icon: "🧘"},
  {id: "h_mobility", name: "Mobility", icon: "🤸"},
  {id: "h_yoga", name: "Yoga", icon: "🕉️"},
  {id: "h_pushups", name: "Push-ups", icon: "💪"},
  {id: "h_pullups", name: "Pull-ups", icon: "🧗"},
  {id: "h_squats", name: "Squats", icon: "🦵"},
  {id: "h_sleep", name: "Sleep 8h", icon: "😴"},
  {id: "h_wakeup", name: "Wake up early", icon: "⏰"},
  {id: "h_no_snooze", name: "No snooze", icon: "🚫"},
  {id: "h_nap", name: "No nap", icon: "🛌"},
  {id: "h_sunlight", name: "Morning sunlight", icon: "🌞"},
  {id: "h_water", name: "Drink water", icon: "💧"},
  {id: "h_steps", name: "10k steps", icon: "👟"},
  {id: "h_meditation", name: "Meditation", icon: "🧠"},
  {id: "h_breath", name: "Breathing", icon: "🌬️"},
  {id: "h_coldshower", name: "Cold shower", icon: "🚿"},
  {id: "h_nutrition", name: "Track calories", icon: "🥗"},
  {id: "h_protein", name: "Hit protein", icon: "🍗"},
  {id: "h_fruit", name: "Eat fruit", icon: "🍎"},
  {id: "h_veggies", name: "Eat veggies", icon: "🥦"},
  {id: "h_no_sugar", name: "No sweets", icon: "🍬"},
  {id: "h_no_fastfood", name: "No fast food", icon: "🍟"},
  {id: "h_no_soda", name: "No soda", icon: "🥤"},
  {id: "h_cook", name: "Cook at home", icon: "🍳"},
  {id: "h_supplements", name: "Supplements", icon: "💊"},
  {id: "h_read_labels", name: "Read labels", icon: "📋"},
  {id: "h_finances", name: "Log finances", icon: "💰"},
  {id: "h_no_spend", name: "No-spend day", icon: "🧾"},
  {id: "h_budget", name: "Check budget", icon: "📊"},
  {id: "h_save", name: "Save money", icon: "🏦"},
  {id: "h_invest", name: "Invest", icon: "📈"},
  {id: "h_debt", name: "Pay debt", icon: "💳"},
  {id: "h_cash", name: "Cash-only", icon: "💵"},
  {id: "h_sell", name: "Sell item", icon: "🛒"},
  {id: "h_read", name: "Read 20 min", icon: "📚"},
  {id: "h_journal", name: "Journal", icon: "📝"},
  {id: "h_planning", name: "Plan tomorrow", icon: "🗓️"},
  {id: "h_focus", name: "Deep work", icon: "🎧"},
  {id: "h_learn", name: "Learn skill", icon: "🎓"},
  {id: "h_language", name: "Language practice", icon: "🗣️"},
  {id: "h_clean", name: "Tidy room", icon: "🧹"},
  {id: "h_outside", name: "Go outside", icon: "🌿"},
  {id: "h_social", name: "Reach out", icon: "🤝"},
  {id: "h_gratitude", name: "Gratitude", icon: "🙏"},
  {id: "h_screen", name: "Limit screen", icon: "📵"},
  {id: "h_no_alcohol", name: "No alcohol", icon: "🚫🍺"}
];

  function openAddHabit(){
    function canAddMore(){
      return (state.habits || []).length < 10;
    }

    function currentListHtml(){
      const habits = state.habits || [];
      return habits.map(h=>`
        <div class="row" style="justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--cardDivider, rgba(15,23,42,.06))">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">${h.icon||"✅"}</span>
            <div>
              <div style="font-weight:700">${escapeHtml(habitDisplayName(h)||t("habit"))}</div>
              <div class="muted" style="font-size:12px">${h.id}</div>
            </div>
          </div>
          <button class="btn danger" type="button" data-habit-del="${h.id}">Delete</button>
        </div>
      `).join("") || `<div class="muted">${t("noHabitsShort")}</div>`;
    }

    function refreshCurrentList(){
      const host = document.getElementById("currentHabitsList");
      if(!host) return;
      host.innerHTML = currentListHtml();
      wireDeleteButtons();
    }

    function addHabitObj(h){
      const existing = (state.habits || []).some(x=>x.id === h.id);
      if(existing){ toast(t("habitExists")); return; }
      if(!canAddMore()){ toast(t("maxHabits")); return; }
      state.habits = [...(state.habits||[]), h];
      saveState();
      refreshCurrentList();
      render();
      toast(t("habitAdded"));
    }

    openModal(
      t("manageHabitsTitle"),
      `
      <div class="modalHeader">
        <div>
          <div class="modalTitle">${t("manageHabitsTitle")}</div>
          <div class="muted">${t("manageHabitsSub")}</div>
        </div>
        <button class="btn ghost" type="button" data-modal-close>✕</button>
      </div>

      <div style="margin-top:12px">
        <div class="muted" style="font-size:12px;margin-bottom:6px">${t("presetHabits")}</div>
        <div class="presetGrid">
          ${PRESET_HABITS.map(p=>`
            <button class="presetBtn" type="button" data-habit-preset="${p.id}" title="${escapeHtml(p.name)}">
              <span class="presetEmoji">${p.icon}</span>
              <span style="display:flex;flex-direction:column;align-items:flex-start">
                <span class="presetName">${escapeHtml(p.name)}</span>
                <span class="presetTag">${t("add")}</span>
              </span>
            </button>
          `).join("")}
        </div>
      </div>

      <form id="habitForm" class="form">
        <div class="grid2">
          <label class="field">
            <span>${t("name")}</span>
            <input id="habitName" required placeholder="e.g. Stretching" />
          </label>
          <label class="field">
            <span>${t("iconEmoji")}</span>
            <input id="habitIcon" placeholder="🧘" maxlength="4" />
          </label>
        </div>
        <div class="row" style="justify-content:flex-end;gap:10px;margin-top:10px">
          <button class="btn" type="submit">${t("add")}</button>
        </div>
      </form>

      <div style="margin-top:12px">
        <div class="muted" style="font-size:12px;margin-bottom:6px">${t("currentHabits")}</div>
        <div class="muted" style="font-size:12px;margin:-2px 0 6px">${(state.habits||[]).length}/10</div>
        <div id="currentHabitsList">${currentListHtml()}</div>
      </div>
    `
    );

    function wireDeleteButtons(){
      document.querySelectorAll("[data-habit-del]").forEach(btn=>{
        btn.onclick = () => {
          const hid = btn.getAttribute("data-habit-del");
          state.habits = (state.habits||[]).filter(h=>h.id!==hid);
          // clean logs
          const logs = state.habitLogs || {};
          Object.keys(logs).forEach(d=>{ if(logs[d]) delete logs[d][hid]; });
          saveState();
          refreshCurrentList();
          render();
          toast(t("habitDeleted"));
        };
      });
    }
    wireDeleteButtons();

    // Clicking a preset adds it immediately to current habits
    document.querySelectorAll("[data-habit-preset]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const pid = btn.getAttribute("data-habit-preset");
        const p = PRESET_HABITS.find(x=>x.id===pid);
        if(!p) return;
        addHabitObj({id: p.id, name: p.name, icon: p.icon});
      });
    });

    const form = document.getElementById("habitForm");
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      if(!canAddMore()){ toast(t("maxHabits")); return; }
      const name = document.getElementById("habitName").value.trim();
      const icon = document.getElementById("habitIcon").value.trim() || "✅";
      if(!name) return;
      const id = "h_" + Date.now().toString(36);
      addHabitObj({id, name, icon});
      document.getElementById("habitName").value = "";
      document.getElementById("habitIcon").value = "";
    });
  }

  function toggleHabit(hid, iso){
    if(!hid || !iso) return;
    feedbackTap();
    state._lastToggle = {hid, iso, ts: Date.now()};
    state.habitLogs = state.habitLogs || {};
    state.habitLogs[iso] = state.habitLogs[iso] || {};
    state.habitLogs[iso][hid] = !state.habitLogs[iso][hid];
    // remove empty
    if(!state.habitLogs[iso][hid]) delete state.habitLogs[iso][hid];
    if(Object.keys(state.habitLogs[iso]).length===0) delete state.habitLogs[iso];
    saveState();
    render();
    setTimeout(()=>{ state._lastToggle = null; }, 700);
  }


// ---------- Init ----------
  const btnTheme = $("#btnTheme");
  if(btnTheme){ btnTheme.style.display = "none"; }

	const btnLangToggle = $("#btnLangToggle");
	if(btnLangToggle){
	  const flip = ()=> setLang((state.lang||"en") === "bg" ? "en" : "bg");
	  btnLangToggle.addEventListener("click", flip);
	  btnLangToggle.addEventListener("keydown", (e)=>{
	    if(e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
	  });
	}

updateHeaderUI();

// first route
  const initial = (location.hash || "#home").replace("#","");
  state.route = initial || "home";
  render();
  window.BL_API = { render, setRoute, openModal, closeModal };

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

  function buildInsight(d){
    try{
      // Priority: workouts behind > spending high > kcal left > on track
      const dow = (new Date()).getDay();
      const dayIndex = (dow+6)%7 + 1; // Mon=1..7
      const expected = (d.workoutGoalMin||0) * (dayIndex/7);
      const behindRaw = (expected - (d.wmin||0)) / Math.max(1,(d.workoutGoalMin||1));
      const behindPct = Math.round(Math.max(0, behindRaw) * 100);
      const aheadPct = Math.round(Math.max(0, -behindRaw) * 100);

      // Spending vs usual: compare month-to-date expense to avg of previous 3 months
      const now = new Date();
      const ymNow = now.toISOString().slice(0,7);
      const prev = [];
      for(let i=1;i<=3;i++){
        const dt = new Date(now.getFullYear(), now.getMonth()-i, 1);
        prev.push(dt.toISOString().slice(0,7));
      }
      let prevExp=0, prevCount=0;
      for(const it of state.finances||[]){
        if(it.type!=="expense") continue;
        const ym=(it.date||"").slice(0,7);
        if(prev.includes(ym)){ prevExp += Number(it.amount||0); prevCount++; }
      }
      // crude monthly usual: average monthly expense from previous months
      const monthsUsed = prev.length;
      const usualMonthly = monthsUsed ? (prevExp / monthsUsed) : 0;
      const spendingPct = (usualMonthly>0) ? Math.round(Math.max(0,(d.expense - usualMonthly) / usualMonthly) * 100) : 0;

      if(behindPct >= 15){
        return t("insightWorkoutBehind").replace("{pct}", behindPct);
      }
      if(spendingPct >= 15){
        return t("insightSpendingHigh").replace("{pct}", spendingPct);
      }
      if((d.kcalGoal||0) > 0 && (d.kcalLeft||0) > 0){
        return t("insightKcalLeft").replace("{left}", Math.round(d.kcalLeft));
      }
      if(aheadPct >= 15){
        return t("insightWorkoutAhead").replace("{pct}", aheadPct);
      }
      return t("insightOnTrack");
    }catch(e){
      return t("insightOnTrack");
    }
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
  const btnSettings = document.getElementById("btnSettings");
  if(btnSettings){
    btnSettings.addEventListener("click", ()=> setRoute("settings"));
  }

