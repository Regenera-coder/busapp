const CACHE_NAME = "mybus-shell-v2";
const SHELL_FILES = ["./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the app shell: always try to fetch the latest index.html/
// manifest.json when online (so updates you push actually reach installed
// users), and only fall back to the cached copy if the network is unavailable
// (offline use). This trades a tiny bit of load latency for never getting
// stuck on a stale version -- the previous cache-first approach silently froze
// installed users on whatever shell was cached at install time.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace("./", "")));

  if (isShellFile) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
