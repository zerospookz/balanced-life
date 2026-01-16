// Balanced Life service worker
// v6.6.1: cache-bust + pre-cache finance icons for offline-first UX
const CACHE = "balanced-life-v661";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",

  // Finance icons (embedded directly in the project root)
  "./fin_bank.png",
  "./fin_bills.png",
  "./fin_briefcase.png",
  "./fin_calculator.png",
  "./fin_creditcard.png",
  "./fin_freelance.png",
  "./fin_groceries.png",
  "./fin_investment.png",
  "./fin_jar.png",
  "./fin_piggy.png",
  "./fin_salary.png",
  "./fin_vacation.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => caches.match("./index.html"))
    )
  );
});
