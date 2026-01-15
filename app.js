
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

  
  // ===== THEME_MODE v6.0 =====
  const THEME_KEY = "bl_theme_mode"; // system | light | dark
  function applyTheme(mode){
    const root = document.documentElement;
    if(mode==="dark"){
      root.setAttribute("data-theme","dark");
    }else if(mode==="light"){
      root.setAttribute("data-theme","light");
    }else{
      root.removeAttribute("data-theme"); // system via prefers-color-scheme
    }
    localStorage.setItem(THEME_KEY, mode);
  }
  applyTheme(localStorage.getItem(THEME_KEY) || "system");
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
    return String(s).replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
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
        <text x="75" y="98" text-anchor="middle" font-size="12" font-weight="800" fill="var(--sub)">Energy</text>
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
    const offset = Number(state._habitWeekOffset||0);
    const start = startOfWeekISO(isoFromDate(new Date(Date.now() + offset*7*24*3600*1000)));
    const days = weekISOs(start);
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
            <div class="muted"><span class="habitPeriod">Тази седмица</span> • ${start} → ${days[6]}</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
            <div class="weekFilter" title="Седмица">
              <span class="small" style="font-weight:900">Седмица</span>
              <select data-action="setHabitWeek">
                <option value="-1" ${offset===-1?"selected":""}>Минала</option>
                <option value="0" ${offset===0?"selected":""}>Тази</option>
                <option value="1" ${offset===1?"selected":""}>Следваща</option>
              </select>
            </div>
            <button class="btn primary habitAddBtn" type="button" data-action="addHabit">+ Навик</button>
          </div>
        </div>


        <div class="habitWrap" role="table" aria-label="Habit tracker">
          <div class="habitHeadRow" role="row">
            <div class="habitName" role="columnheader">Навик</div>
            ${days.map(d=>`<div class="habitDay" role="columnheader">${dayLabel(d)}</div>`).join("")}
          </div>

          ${habits.length ? habits.map((h,idx)=>`
            <div class="habitRow" role="row">
              <div class="habitName" role="cell">
                <div class="habitNameInner">
                  <span class="habitIcon">${h.icon||"✅"}</span>
                  <span class="habitText" style="color:${h.color||"#1e3a8a"}">${escapeHtml(h.name||"Навик")}</span>
                  <span class="chip">${weekCounts[idx]}/7</span>
                </div>
              </div>
              ${days.map(d=>{
                const on = !!(logs[d] && logs[d][h.id]);
                return `<button class="habitBox ${on?"on":""}" style="--hc:${h.color||'#1e3a8a'}" type="button" aria-label="${h.name} ${d}" data-action="toggleHabit" data-habit="${h.id}" data-date="${d}"></button>`;
              }).join("")}
            </div>
          `).join("") : `<div class="muted" style="padding:10px 6px">Нямаш навици. Натисни “+ Навик”.</div>`}
        </div>

        <div class="habitStats">
          <div class="statMini">
            <div class="statLabel">Изпълнение</div>
            <div class="statValue">${pct}%</div>
          </div>
          <div class="statMini">
            <div class="statLabel">Отметнати</div>
            <div class="statValue">${totalDone}</div>
          </div>
        <div class="statMini">
          <div class="statLabel">Навици</div>
          <div class="statValue">${habits.length}</div>
        </div>
      </div>
    </section>
    `;
  }

function viewHome() {
    const d = computeDashboard();
    return `
      <div class="pageStack">
      <section class="card section">
        <div class="h1">Dashboard</div>
        <div class="sub">Днес: бюджет • хранене • тренировки</div>
        <div class="row" style="margin-top:12px;align-items:center">
          <div style="min-width:170px;display:flex;justify-content:center">${ringSVG(d.progress)}</div>
          <div style="flex:1;min-width:240px">
            <div class="grid2">
              <div class="kpi">
                <div class="l">Бюджет (месец)</div>
                <div class="v">${money(d.budget)} лв</div>
                <div class="small">Приходи: ${money(d.income)} • Разходи: ${money(d.expense)}</div>
              </div>
              <div class="kpi">
                <div class="l">Калории (днес)</div>
                <div class="v">${Math.round(d.kcal)} kcal</div>
                <div class="small">Добави храна в Nutrition</div>
              </div>
              <div class="kpi">
                <div class="l">Тренировки (7 дни)</div>
                <div class="v">${Math.round(d.wmin)} мин</div>
                <div class="small">Планът е в Workouts → План</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card section">
        <div class="h1">Weekly overview</div>
        <div class="sub">Бърз поглед за последните 7 дни</div>
        <div class="row" style="margin-top:12px">
          <button class="btn ghost" data-route="finances" type="button">💰 Finances</button>
          <button class="btn ghost" data-route="nutrition" type="button">🥗 Nutrition</button>
          <button class="btn ghost" data-route="workouts" type="button">🏋️ Workouts</button>
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
          <td><button class="btn ghost" data-action="delFinance" data-idx="${idx}">Изтрий</button></td>
        </tr>
      `).join("");
    return `
      <section class="card section">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <div class="h1">Finances</div>
            <div class="sub">Приходи и разходи</div>
          </div>
          <button class="btn primary" data-action="addFinance" type="button">+ Запис</button>
        </div>
        <div style="margin-top:10px" class="small">Съхранява се локално (offline-first).</div>
        <table class="table" style="margin-top:10px">
          <tbody>${rows || `<tr><td class="small">Няма записи. Натисни “+ Запис”.</td></tr>`}</tbody>
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
          <td><button class="btn ghost" data-action="delFood" data-idx="${idx}">Изтрий</button></td>
        </tr>
      `).join("");
    return `
      <section class="card section">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <div class="h1">Nutrition</div>
            <div class="sub">Храна, калории и снимки (manual)</div>
          </div>
          <button class="btn primary" data-action="addFood" type="button">+ Храна</button>
        </div>
        <div style="margin-top:10px" class="small">* Автоматично калкулиране от снимка изисква AI/външен API. Тук е ръчно въвеждане.</div>
        <table class="table" style="margin-top:10px">
          <tbody>${rows || `<tr><td class="small">Няма записи. Натисни “+ Храна”.</td></tr>`}</tbody>
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
            <button class="btn ghost" data-action="addPlanItem" data-day="${escapeHtml(selected)}" data-sec="${escapeHtml(sec)}" type="button">+ Добави</button>
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
          <td><button class="btn ghost" data-action="delWorkout" data-idx="${idx}">Изтрий</button></td>
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
            ${sectionCards || `<div class="small">Няма секции.</div>`}
          </div>
        ` : `
          <table class="table" style="margin-top:12px">
            <tbody>${rows || `<tr><td class="small">Няма записи. Натисни “+ Тренировка”.</td></tr>`}</tbody>
          </table>
        `}
      </section>
    `;
  }

  function viewSettings() {
    return `
      <section class="card section">
        <div class="h1">Settings</div>
              <div class="sub">Appearance</div>
        <div class="sub">Импорт/експорт и нулиране</div>

        <div class="row" style="margin-top:12px">
          <button class="btn ghost" data-action="exportAll" type="button">Export всички данни</button>
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
    // set selected theme value
    const tSel = $("#themeSelect"); if(tSel){ tSel.value = localStorage.getItem("bl_theme_mode") || "system"; }
    $$("[data-action='importPlanFile']").forEach(el=>el.addEventListener("change", handleImportPlan));
    $$("[data-action='importAllFile']").forEach(el=>el.addEventListener("change", handleImportAll));
  }

  function handleAction(e) {
    const a = e.currentTarget.dataset.action;
    if(a==="toggleHabit") return toggleHabit(e.currentTarget.dataset.habit, e.currentTarget.dataset.date);
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
    openModal("Добави упражнение", `
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
            <div style="font-weight:700">${escapeHtml(h.name||"Навик")}</div>
            <div class="muted" style="font-size:12px">${h.id}</div>
          </div>
        </div>
        <button class="btn danger" type="button" data-habit-del="${h.id}">Изтрий</button>
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
  $("#btnReorder").addEventListener("click", () => {
    alert("Подреждане: в тази версия плочките са премахнати (ползва се долната навигация).");
  });

  // first route
  const initial = (location.hash || "#home").replace("#","");
  state.route = initial || "home";
  render();

  // register SW
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
})();
