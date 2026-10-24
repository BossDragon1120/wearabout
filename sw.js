// WearAbout service worker: keeps the app shell available offline and fast to open.
// Network first, so a new deploy shows up on the next open; the cache is only a fallback.
const CACHE = "wearabout-v4";
const SHELL = ["./", "index.html", "styles.css", "app.js", "config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // never touch Supabase or AI calls
  const fromNet = fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  });
  const fallback = () => caches.match(e.request).then((r) => r || caches.match("index.html"));
  // On a weak signal, don't leave the app blank: after 3 seconds use the saved copy (the network copy still updates the cache).
  const slow = new Promise((resolve) => setTimeout(resolve, 3000)).then(() => caches.match(e.request));
  e.respondWith(
    Promise.race([fromNet.catch(() => null), slow]).then((r) => r || fromNet.catch(fallback)).catch(fallback)
  );
});

// Notifications: show what the server sent, and open the right screen when tapped.
self.addEventListener("push", (e) => {
  let m = { title: "WearAbout", body: "", url: "./" };
  try { m = { ...m, ...e.data.json() }; } catch {}
  e.waitUntil(self.registration.showNotification(m.title, { body: m.body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: m.url } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) { c.postMessage({ go: new URL(target).searchParams.get("go") }); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
