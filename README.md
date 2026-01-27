# LifeSync

## Build
**v10.3.0** — Home screen modern refresh: unified glass cards, better spacing on desktop (no overlap with bottom nav), cleaner dashboard visuals

Static PWA (offline-first) - open index.html or serve with a static server.

## Run locally
python3 -m http.server 8080

Then open http://localhost:8080

## Deploy
Upload this folder to GitHub and enable GitHub Pages (branch main / root).


**v10.3.0** — Dashboard visual refresh: lighter glass cards, improved spacing, hover depth, cleaner hierarchy.


**v10.3.1** — Dashboard KPI redesign: thinner donut rings, calmer contrast, clearer values.


**v10.3.2** — Micro-interactions: subtle hover/tap feedback across dashboard cards, habits and buttons.


**v10.4.0** — Habit UX upgrade: instant tap-to-check, long-press placeholder for notes/edit, today highlight, streak glow.


**v10.4.1** — Habit UX: real notes modal on long-press, undo toast after check.


**v10.4.2** — Habit notes indicator: subtle dot on days with notes; zero clutter.


**v10.5.0** — Personalization: hide habits, reorder them, and set per-habit color accents.


**v10.5.1** — Personalization: reorder/hide habits from Settings; custom order respected everywhere.


**v10.6.0** — Insight mode: Home summary with checks count, active days, and habits used.


**v10.6.1** — Hotfix: Insight mode crash fix when state is not initialized.


**v10.6.2** — Hotfix: initialize state.habitPrefs to prevent crash in personalization/insight code.


**v10.6.3** — Insight mode upgraded: real last-7-days analysis with best day, weak day and weekly checks.


**v10.6.4** — Habits UI cleanup: removed double background, single surface only.


**v10.7.0** — Finance page hotfix: syntax error fixed, finance overview restored.


**v10.6.4.1** — Hotfix: fixed duplicated Insight code causing a syntax error (Unexpected token '}').


**v10.6.5** — Habits page single-background fix (removed all container cards, only global background remains).


**v10.6.6** — Habits UX hotfix: fixed mobile tap animation jitter (screen tremble) by removing transform scaling on habit cells and using shadow/brightness pulse.


**v10.6.8** — Hotfix: removed listener accumulation (memory leak) via delegated handlers; disabled transform/lift interactions on Habits to stop full-screen tremble.


**v10.6.9** — Hotfix: delegated event handlers now pass correct currentTarget to action dispatcher; Habits buttons and ticks work again.


**v10.6.10** — Hotfix: expose setRoute globally so delegated navigation works; Habits buttons and ticks respond again.


**v10.6.11** — Hotfix: interactions restored on mobile (Habits ticks/buttons) using pointerup delegation + duplicate click suppression.


**v10.6.12** — Hotfix: restored Habits ticks/buttons by making handleAction resolve the clicked element via closest('[data-action]').
