// damla service worker: makes the app installable, keeps build assets + card pictures cached,
// shows /offline when there is no connection. Pages and answers always go to the network
// (they are per-user and checked on the server), so nothing private is cached.
const V = "damla-v1";
const OFFLINE = "/offline";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;

  // immutable build files, card pictures, icons: cache first
  if (u.pathname.startsWith("/_next/static/") || u.pathname.startsWith("/img/") || u.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(r).then(
        (hit) =>
          hit ||
          fetch(r).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(V).then((c) => c.put(r, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (r.mode === "navigate") e.respondWith(fetch(r).catch(() => caches.match(OFFLINE)));
});
