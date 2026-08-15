const CACHE_NAME = "tennis-club-portal-v124";
const APP_START_URL = "./index.html?v=124";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=124",
  "./app.js?v=124",
  "./manifest.webmanifest?v=124",
  "./assets/app-icon-192.png?v=124",
  "./assets/app-icon-512.png?v=124",
  "./assets/club-logo-dm.png?v=124",
  "./assets/club-logo-dm-192.png?v=124",
  "./assets/club-logo-dm-512.png?v=124",
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
  const request = event.request;
  const url = new URL(request.url);
  const freshFirst = request.mode === "navigate" || /\.(html|js|css|webmanifest)$/.test(url.pathname);
  if (freshFirst) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(APP_START_URL)) || caches.match("./index.html"))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
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
      icon: "assets/club-logo-dm-192.png?v=124",
      badge: "assets/club-logo-dm-192.png?v=124",
      tag: data.notificationId || undefined,
      renotify: true,
      data: { url: data.url || APP_START_URL, notificationId: data.notificationId }
    }),
    self.navigator?.setAppBadge ? self.navigator.setAppBadge(badgeCount) : Promise.resolve()
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || APP_START_URL;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(targetUrl);
      return existing.focus();
    }
    return clients.openWindow(targetUrl);
  }));
});
