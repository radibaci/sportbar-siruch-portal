const CACHE_NAME = "tennis-club-portal-v62";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=58",
  "./app.js?v=58",
  "./manifest.webmanifest?v=58",
  "./assets/app-icon-192.png?v=54",
  "./assets/app-icon-512.png?v=54",
  "./assets/club-logo-dm.png?v=54",
  "./assets/club-logo-dm-192.png?v=54",
  "./assets/club-logo-dm-512.png?v=54",
  "./assets/court-top-view.png",
  "./assets/club-shop-hero.png",
  "./assets/event-doubles.png",
  "./assets/event-shoes.png",
  "./assets/order-cart-icon.png",
  "./assets/nav-icons.png",
  "./assets/home-section-icons.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { title: "Sportbar Siruch", body: event.data?.text() || "Nova zprava v portalu." };
  }
  const badgeCount = Number(data.badge || data.unread || 1);
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title || "Sportbar Siruch", {
      body: data.body || "Nova zprava v klubovem portalu.",
      icon: "assets/club-logo-dm-192.png?v=54",
      badge: "assets/club-logo-dm-192.png?v=54",
      data: { url: data.url || "./index.html" }
    }),
    self.navigator?.setAppBadge ? self.navigator.setAppBadge(badgeCount) : Promise.resolve()
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./index.html";
  event.waitUntil(clients.openWindow(targetUrl));
});
