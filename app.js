
/* Balanced life v5.6 – Finances/Nutrition/Workouts CRUD + Live ring + transitions (SPA) */
(function(){
  "use strict";

  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const $ = (sel, root=document) => root.querySelector(sel);
  const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  const KEY = "bl_v56_store";
  const THEME_KEY = "bl_theme";

  const nowISO = () => new Date().toISOString().slice(0,10);

  function startOfWeek(d=new Date()){
    const x = new Date(d);
    const day = (x.getDay()+6)%7; // Monday=0
    x.setDate(x.getDate()-day);
    x.setHours(0,0,0,0);
    return x;
  }
  function inLastDays(dateISO, days){
    const d = new Date(dateISO + "T00:00:00");
    const cut = new Date();
    cut.setDate(cut.getDate()-days);
    cut.setHours(0,0,0,0);
    return d >= cut;
  }
  function inThisMonth(dateISO){
    const d = new Date(dateISO + "T00:00:00");
    const n = new Date();
    return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth();
  }
  function inThisWeek(dateISO){
    const d = new Date(dateISO + "T00:00:00");
    const s = startOfWeek();
    const e = new Date(s); e.setDate(s.getDate()+7);
    return d>=s && d<e;
  }

  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function money(n){
    const sign = n<0 ? "-" : "";
    const v = Math.abs(n);
    return sign + "$" + v.toFixed(0);
  }

  function defaultStore(){
    return {
      goals: {
        caloriesPerDay: 2000,
        workoutsPerWeek: 3,
        savingsPerMonth: 300, // target positive balance
      },
      finances: [],
      meals: [],
      workouts: [],
    };
  }

  function loadStore(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return defaultStore();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultStore(), parsed, {goals: Object.assign(defaultStore().goals, parsed.goals||{})});
    }catch(e){
      console.warn("Store load failed, resetting.", e);
      return defaultStore();
    }
  }

  function saveStore(){
    localStorage.setItem(KEY, JSON.stringify(store));
    refreshAll();
  }

  let store = loadStore();

  // Theme tokens
  function applyTheme(theme){
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }
  applyTheme(localStorage.getItem(THEME_KEY) || "light");

  // SPA navigation
  const views = $$("[data-view]");
  const navButtons = $$("[data-nav]");

  function setActiveNav(name){
    navButtons.forEach(b => b.classList.toggle("active", b.dataset.nav===name));
  }

  function showView(name){
    views.forEach(v=>{
      const is = v.dataset.view===name;
      v.classList.toggle("active", is);
    });
    setActiveNav(name);
  }

  function navigate(name){
    location.hash = "#" + name;
  }

  window.addEventListener("hashchange", () => {
    const name = (location.hash || "#home").slice(1);
    showView(name);
  });

  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-nav]");
    if(btn){
      e.preventDefault();
      navigate(btn.dataset.nav);
      return;
    }
  });

  // Plus button: context add
  $("#navPlus").addEventListener("click", ()=>{
    const current = (location.hash||"#home").slice(1);
    if(current==="finances") openFinanceModal();
    else if(current==="nutrition") openMealModal();
    else if(current==="workouts") openWorkoutModal();
    else openQuickAddModal();
  });

  $("#btnQuickAdd").addEventListener("click", openQuickAddModal);

  // Modal helpers
  const modal = $("#modal");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");
  const modalActions = $("#modalActions");
  $("#modalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", (e)=>{ if(e.target===modal) closeModal(); });

  function openModal(title, bodyHTML, actions){
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHTML;
    modalActions.innerHTML = "";
    actions.forEach(a=>{
      const b = document.createElement("button");
      b.className = a.className || "pill";
      b.type = "button";
      b.textContent = a.label;
      b.addEventListener("click", a.onClick);
      modalActions.appendChild(b);
    });
    modal.classList.remove("hidden");
    setTimeout(()=>{ const first = modal.querySelector("input,select,textarea,button"); if(first) first.focus(); }, 30);
  }
  function closeModal(){ modal.classList.add("hidden"); }

  // Dashboard ring
  const CIRC = 2 * Math.PI * 46; // r=46
  function setRing(p){
    const prog = $(".ringProg");
    const off = CIRC * (1 - clamp01(p));
    prog.style.strokeDasharray = String(CIRC);
    prog.style.strokeDashoffset = String(off);
    $("#ringPct").textContent = Math.round(clamp01(p)*100) + "%";
  }

  function computeStats(){
    // Finance: monthly balance / savings target
    const finMonth = store.finances.filter(x=>inThisMonth(x.date));
    const income = finMonth.filter(x=>x.type==="income").reduce((s,x)=>s+Number(x.amount||0),0);
    const expense = finMonth.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount||0),0);
    const balance = income - expense;
    const financeProgress = store.goals.savingsPerMonth>0 ? clamp01(balance / store.goals.savingsPerMonth) : 0;

    // Nutrition: closeness to daily goal (today)
    const today = nowISO();
    const calsToday = store.meals.filter(m=>m.date===today).reduce((s,m)=>s+Number(m.calories||0),0);
    const goalC = Math.max(1, Number(store.goals.caloriesPerDay||2000));
    const nutritionScore = clamp01(1 - Math.min(Math.abs(calsToday-goalC)/goalC, 1));

    // Workouts: weekly count / goal
    const woWeek = store.workouts.filter(w=>inThisWeek(w.date));
    const woCount = woWeek.length;
    const woGoal = Math.max(1, Number(store.goals.workoutsPerWeek||3));
    const workoutsProgress = clamp01(woCount / woGoal);

    const balanced = (financeProgress + nutritionScore + workoutsProgress) / 3;

    // Weekly mini stats
    const meals7 = store.meals.filter(m=>inLastDays(m.date,7)).reduce((s,m)=>s+Number(m.calories||0),0);
    const wo7 = store.workouts.filter(w=>inLastDays(w.date,7)).length;

    const woMinWeek = woWeek.reduce((s,w)=>s+Number(w.minutes||0),0);

    return {
      income, expense, balance,
      financeProgress,
      calsToday, goalC, nutritionScore,
      woCount, woGoal, woMinWeek, workoutsProgress,
      balanced,
      meals7, wo7
    };
  }

  // Render: Dashboard + minis + summaries
  function renderDashboard(){
    const st = computeStats();

    setRing(st.balanced);

    $("#kpiFinance").textContent = money(st.balance);
    $("#kpiFinanceSub").textContent = Math.round(st.financeProgress*100) + "% от целта (" + money(store.goals.savingsPerMonth) + ")";

    $("#kpiCalories").textContent = st.calsToday.toFixed(0) + " kcal";
    $("#kpiCaloriesSub").textContent = "цел: " + st.goalC;

    $("#kpiWorkouts").textContent = String(st.woCount);
    $("#kpiWorkoutsSub").textContent = "цел/седм: " + st.woGoal;

    $("#miniBalance").textContent = money(st.balance);
    $("#miniBalanceSub").textContent = "баланс този месец";

    $("#miniWeekCalories").textContent = String(st.meals7.toFixed(0));
    $("#miniWeekWorkouts").textContent = String(st.wo7);
  }

  // Finances CRUD
  function openFinanceModal(existingId=null){
    const isEdit = !!existingId;
    const item = isEdit ? store.finances.find(x=>x.id===existingId) : null;
    const t = isEdit ? "Редактирай запис" : "Нов запис";
    openModal(t, `
      <div class="formGrid">
        <div>
          <label>Тип</label>
          <select id="f_type" class="input">
            <option value="income"${item?.type==="income"?" selected":""}>Приход</option>
            <option value="expense"${item?.type==="expense"?" selected":""}>Разход</option>
          </select>
        </div>
        <div>
          <label>Сума</label>
          <input id="f_amount" class="input" type="number" inputmode="decimal" placeholder="например 50" value="${item? String(item.amount):""}">
        </div>
        <div>
          <label>Категория</label>
          <input id="f_cat" class="input" placeholder="например Храна" value="${item? (item.category||""):""}">
        </div>
        <div>
          <label>Бележка</label>
          <input id="f_note" class="input" placeholder="по желание" value="${item? (item.note||""):""}">
        </div>
        <div>
          <label>Дата</label>
          <input id="f_date" class="input" type="date" value="${item? item.date: nowISO()}">
        </div>
      </div>
    `, [
      {label:"Отказ", className:"ghost", onClick: closeModal},
      ...(isEdit ? [{label:"Изтрий", className:"danger", onClick: ()=>{ deleteFinance(existingId); closeModal(); }}] : []),
      {label: isEdit ? "Запази" : "Добави", className:"pill", onClick: ()=>{ saveFinance(existingId); }}
    ]);
  }

  function saveFinance(existingId=null){
    const type = $("#f_type").value;
    const amount = Number($("#f_amount").value || 0);
    const category = $("#f_cat").value.trim();
    const note = $("#f_note").value.trim();
    const date = $("#f_date").value || nowISO();
    if(!amount || amount<=0){
      alert("Моля въведи сума > 0");
      return;
    }
    if(existingId){
      const idx = store.finances.findIndex(x=>x.id===existingId);
      if(idx>=0) store.finances[idx] = {id:existingId,type,amount,category,note,date};
    }else{
      store.finances.unshift({id:uid(),type,amount,category,note,date});
    }
    closeModal();
    saveStore();
    navigate("finances");
  }

  function deleteFinance(id){
    store.finances = store.finances.filter(x=>x.id!==id);
    saveStore();
  }

  function renderFinances(){
    const st = computeStats();
    $("#sumIncome").textContent = money(st.income);
    $("#sumExpense").textContent = money(st.expense);
    $("#sumBalance").textContent = money(st.balance);

    const filter = $("#finFilter").value;
    const q = $("#finSearch").value.trim().toLowerCase();

    const rows = store.finances
      .filter(x => filter==="all" ? true : x.type===filter)
      .filter(x => !q ? true : ((x.category||"").toLowerCase().includes(q) || (x.note||"").toLowerCase().includes(q)));

    const el = $("#financeList");
    el.innerHTML = "";
    if(rows.length===0){
      el.innerHTML = `<div class="sub">Няма записи. Натисни “+ Добави”.</div>`;
      return;
    }
    rows.forEach(x=>{
      const sign = x.type==="expense" ? "-" : "+";
      const icon = x.type==="expense" ? "🧾" : "💵";
      const title = (x.category|| (x.type==="expense"?"Разход":"Приход")) + " " + icon;
      const meta = `${x.date}${x.note? " • "+x.note:""}`;
      const wrap = document.createElement("div");
      wrap.className = "item";
      wrap.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${title}</div>
          <div class="itemMeta">${meta}</div>
          <div class="badge">${x.type==="income"?"Приход":"Разход"}</div>
        </div>
        <div class="itemActions">
          <div class="amount">${sign}${money(x.amount)}</div>
          <button class="small" data-edit-fin="${x.id}">Edit</button>
          <button class="small" data-del-fin="${x.id}">Del</button>
        </div>
      `;
      el.appendChild(wrap);
    });
  }

  // Nutrition CRUD
  function openMealModal(existingId=null){
    const isEdit = !!existingId;
    const item = isEdit ? store.meals.find(x=>x.id===existingId) : null;
    openModal(isEdit ? "Редактирай храна" : "Нова храна", `
      <div class="formGrid">
        <div>
          <label>Храна</label>
          <input id="m_name" class="input" placeholder="например Ориз + пилешко" value="${item? (item.name||""):""}">
        </div>
        <div>
          <label>Калории</label>
          <input id="m_cal" class="input" type="number" inputmode="decimal" placeholder="например 650" value="${item? String(item.calories):""}">
        </div>
        <div>
          <label>Дата</label>
          <input id="m_date" class="input" type="date" value="${item? item.date: nowISO()}">
        </div>
      </div>
    `, [
      {label:"Отказ", className:"ghost", onClick: closeModal},
      ...(isEdit ? [{label:"Изтрий", className:"danger", onClick: ()=>{ deleteMeal(existingId); closeModal(); }}] : []),
      {label: isEdit ? "Запази" : "Добави", className:"pill", onClick: ()=>{ saveMeal(existingId); }}
    ]);
  }

  function saveMeal(existingId=null){
    const name = $("#m_name").value.trim();
    const calories = Number($("#m_cal").value || 0);
    const date = $("#m_date").value || nowISO();
    if(!name){
      alert("Моля въведи име на храна");
      return;
    }
    if(!calories || calories<=0){
      alert("Моля въведи калории > 0");
      return;
    }
    if(existingId){
      const idx = store.meals.findIndex(x=>x.id===existingId);
      if(idx>=0) store.meals[idx] = {id:existingId,name,calories,date};
    }else{
      store.meals.unshift({id:uid(),name,calories,date});
    }
    closeModal();
    saveStore();
    navigate("nutrition");
  }

  function deleteMeal(id){
    store.meals = store.meals.filter(x=>x.id!==id);
    saveStore();
  }

  function renderNutrition(){
    const today = nowISO();
    const goalC = Number(store.goals.caloriesPerDay||2000);
    const todayC = store.meals.filter(m=>m.date===today).reduce((s,m)=>s+Number(m.calories||0),0);
    const weekC = store.meals.filter(m=>inLastDays(m.date,7)).reduce((s,m)=>s+Number(m.calories||0),0);

    $("#nutToday").textContent = todayC.toFixed(0) + " kcal";
    $("#nutGoal").textContent = goalC.toFixed(0) + " kcal";
    $("#nutWeek").textContent = weekC.toFixed(0) + " kcal";

    const q = $("#mealSearch").value.trim().toLowerCase();
    const rows = store.meals.filter(m=> !q ? true : (m.name||"").toLowerCase().includes(q));

    const el = $("#mealList");
    el.innerHTML = "";
    if(rows.length===0){
      el.innerHTML = `<div class="sub">Няма записи. Натисни “+ Храна”.</div>`;
      return;
    }
    rows.forEach(m=>{
      const wrap = document.createElement("div");
      wrap.className = "item";
      wrap.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${m.name}</div>
          <div class="itemMeta">${m.date}</div>
          <div class="badge">🥗 ${m.calories} kcal</div>
        </div>
        <div class="itemActions">
          <button class="small" data-edit-meal="${m.id}">Edit</button>
          <button class="small" data-del-meal="${m.id}">Del</button>
        </div>
      `;
      el.appendChild(wrap);
    });
  }

  // Workouts CRUD
  function openWorkoutModal(existingId=null){
    const isEdit = !!existingId;
    const item = isEdit ? store.workouts.find(x=>x.id===existingId) : null;
    openModal(isEdit ? "Редактирай тренировка" : "Нова тренировка", `
      <div class="formGrid">
        <div>
          <label>Тип</label>
          <select id="w_type" class="input">
            <option value="strength"${item?.type==="strength"?" selected":""}>Сила</option>
            <option value="cardio"${item?.type==="cardio"?" selected":""}>Кардио</option>
            <option value="skills"${item?.type==="skills"?" selected":""}>Skills</option>
          </select>
        </div>
        <div>
          <label>Минути</label>
          <input id="w_min" class="input" type="number" inputmode="decimal" placeholder="например 45" value="${item? String(item.minutes):""}">
        </div>
        <div>
          <label>Бележка</label>
          <input id="w_note" class="input" placeholder="например Planche + Pull" value="${item? (item.note||""):""}">
        </div>
        <div>
          <label>Дата</label>
          <input id="w_date" class="input" type="date" value="${item? item.date: nowISO()}">
        </div>
      </div>
    `, [
      {label:"Отказ", className:"ghost", onClick: closeModal},
      ...(isEdit ? [{label:"Изтрий", className:"danger", onClick: ()=>{ deleteWorkout(existingId); closeModal(); }}] : []),
      {label: isEdit ? "Запази" : "Добави", className:"pill", onClick: ()=>{ saveWorkout(existingId); }}
    ]);
  }

  function saveWorkout(existingId=null){
    const type = $("#w_type").value;
    const minutes = Number($("#w_min").value || 0);
    const note = $("#w_note").value.trim();
    const date = $("#w_date").value || nowISO();
    if(!minutes || minutes<=0){
      alert("Моля въведи минути > 0");
      return;
    }
    if(existingId){
      const idx = store.workouts.findIndex(x=>x.id===existingId);
      if(idx>=0) store.workouts[idx] = {id:existingId,type,minutes,note,date};
    }else{
      store.workouts.unshift({id:uid(),type,minutes,note,date});
    }
    closeModal();
    saveStore();
    navigate("workouts");
  }

  function deleteWorkout(id){
    store.workouts = store.workouts.filter(x=>x.id!==id);
    saveStore();
  }

  function renderWorkouts(){
    const week = store.workouts.filter(w=>inThisWeek(w.date));
    const woCount = week.length;
    const woMin = week.reduce((s,w)=>s+Number(w.minutes||0),0);
    $("#woWeekCount").textContent = String(woCount);
    $("#woWeekMin").textContent = String(woMin);
    $("#woGoal").textContent = String(store.goals.workoutsPerWeek||3);

    const typeFilter = $("#woType").value;
    const rows = store.workouts.filter(w => typeFilter==="all" ? true : w.type===typeFilter);

    const el = $("#workoutList");
    el.innerHTML = "";
    if(rows.length===0){
      el.innerHTML = `<div class="sub">Няма записи. Натисни “+ Тренировка”.</div>`;
      return;
    }
    rows.forEach(w=>{
      const icon = w.type==="strength" ? "🏋️" : (w.type==="cardio" ? "🏃" : "🤸");
      const wrap = document.createElement("div");
      wrap.className = "item";
      wrap.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${icon} ${w.type.toUpperCase()}</div>
          <div class="itemMeta">${w.date}${w.note? " • "+w.note:""}</div>
          <div class="badge">⏱ ${w.minutes} min</div>
        </div>
        <div class="itemActions">
          <button class="small" data-edit-wo="${w.id}">Edit</button>
          <button class="small" data-del-wo="${w.id}">Del</button>
        </div>
      `;
      el.appendChild(wrap);
    });
  }

  // Goals modal (shared)
  function openGoalsModal(){
    openModal("Goals", `
      <div class="formGrid">
        <div>
          <label>Calories per day</label>
          <input id="g_cal" class="input" type="number" value="${store.goals.caloriesPerDay}">
        </div>
        <div>
          <label>Workouts per week</label>
          <input id="g_wo" class="input" type="number" value="${store.goals.workoutsPerWeek}">
        </div>
        <div>
          <label>Savings per month ($)</label>
          <input id="g_save" class="input" type="number" value="${store.goals.savingsPerMonth}">
        </div>
        <div class="sub">Dashboard ring = средно(финансов прогрес, точност калории, тренировки)</div>
      </div>
    `, [
      {label:"Отказ", className:"ghost", onClick: closeModal},
      {label:"Запази", className:"pill", onClick: ()=>{
        const cal = Number($("#g_cal").value||2000);
        const wo = Number($("#g_wo").value||3);
        const save = Number($("#g_save").value||300);
        store.goals.caloriesPerDay = Math.max(1, cal);
        store.goals.workoutsPerWeek = Math.max(1, wo);
        store.goals.savingsPerMonth = Math.max(1, save);
        closeModal();
        saveStore();
      }}
    ]);
  }

  function openQuickAddModal(){
    openModal("Quick add", `
      <div class="formGrid">
        <div class="sub">Избери какво искаш да добавиш</div>
      </div>
    `, [
      {label:"Finances", className:"pill", onClick: ()=>{ closeModal(); openFinanceModal(); }},
      {label:"Nutrition", className:"pill", onClick: ()=>{ closeModal(); openMealModal(); }},
      {label:"Workouts", className:"pill", onClick: ()=>{ closeModal(); openWorkoutModal(); }},
      {label:"Close", className:"ghost", onClick: closeModal},
    ]);
  }

  // Settings: export/import/reset/theme
  function exportJSON(){
    const blob = new Blob([JSON.stringify(store, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "balanced-life-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = JSON.parse(String(reader.result||"{}"));
        store = Object.assign(defaultStore(), parsed, {goals: Object.assign(defaultStore().goals, parsed.goals||{})});
        saveStore();
        alert("Импорт успешно ✅");
      }catch(e){
        alert("Невалиден JSON");
      }
    };
    reader.readAsText(file);
  }
  function resetAll(){
    if(!confirm("Сигурен ли си? Това ще изтрие всички локални данни.")) return;
    store = defaultStore();
    saveStore();
  }

  // Event wiring
  function wire(){
    // Finances
    $("#btnFinanceAdd").addEventListener("click", ()=>openFinanceModal());
    $("#finFilter").addEventListener("change", renderFinances);
    $("#finSearch").addEventListener("input", renderFinances);
    $("#btnFinanceGoals").addEventListener("click", openGoalsModal);

    // Nutrition
    $("#btnMealAdd").addEventListener("click", ()=>openMealModal());
    $("#mealSearch").addEventListener("input", renderNutrition);
    $("#btnNutritionGoals").addEventListener("click", openGoalsModal);

    // Workouts
    $("#btnWorkoutAdd").addEventListener("click", ()=>openWorkoutModal());
    $("#woType").addEventListener("change", renderWorkouts);
    $("#btnWorkoutGoals").addEventListener("click", openGoalsModal);

    // Settings
    $("#btnExport").addEventListener("click", exportJSON);
    $("#fileImport").addEventListener("change", (e)=>{ const f=e.target.files?.[0]; if(f) importJSON(f); e.target.value=""; });
    $("#btnReset").addEventListener("click", resetAll);
    $("#btnLight").addEventListener("click", ()=>applyTheme("light"));
    $("#btnDark").addEventListener("click", ()=>applyTheme("dark"));
    $("#btnAllGoals").addEventListener("click", openGoalsModal);

    // Delegated list actions
    document.addEventListener("click", (e)=>{
      const ef = e.target.closest("[data-edit-fin]");
      const df = e.target.closest("[data-del-fin]");
      const em = e.target.closest("[data-edit-meal]");
      const dm = e.target.closest("[data-del-meal]");
      const ew = e.target.closest("[data-edit-wo]");
      const dw = e.target.closest("[data-del-wo]");
      if(ef){ openFinanceModal(ef.dataset.editFin); }
      if(df){ if(confirm("Изтрий?")) deleteFinance(df.dataset.delFin); }
      if(em){ openMealModal(em.dataset.editMeal); }
      if(dm){ if(confirm("Изтрий?")) deleteMeal(dm.dataset.delMeal); }
      if(ew){ openWorkoutModal(ew.dataset.editWo); }
      if(dw){ if(confirm("Изтрий?")) deleteWorkout(dw.dataset.delWo); }
    });
  }

  function refreshAll(){
    renderDashboard();
    renderFinances();
    renderNutrition();
    renderWorkouts();
  }

  // Boot
  document.addEventListener("DOMContentLoaded", ()=>{
    wire();
    // default route
    const route = (location.hash || "#home").slice(1);
    showView(route);
    refreshAll();
  });

})();
