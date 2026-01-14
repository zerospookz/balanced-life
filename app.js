
// app.js – v5.4.4 HOTFIX
// Fixes:
// - Syntax error
// - Clicks not working
// - SPA navigation

document.addEventListener("DOMContentLoaded", function () {
  console.log("Balanced Life v5.4.4 loaded");

  const views = document.querySelectorAll("[data-view]");
  const navButtons = document.querySelectorAll("[data-nav]");

  function showView(name) {
    views.forEach(function (v) {
      v.style.display = v.dataset.view === name ? "block" : "none";
    });
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const target = btn.dataset.nav;
      showView(target);
    });
  });

  showView("home");
});
