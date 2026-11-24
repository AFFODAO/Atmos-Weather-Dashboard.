const SHELL_VERSION = "2";
const scope = new URL(self.registration.scope);
const shellPrefix = "atmos-estrutura:" + scope.pathname + ":";
const shellCache = shellPrefix + SHELL_VERSION;
const entry = new URL("index.html", scope);
const shellFiles = new Set([
  "index.html", "style.css", "theme.js", "weather-data.js", "charts.js", "forecast-history.js",
  "cities.js", "compare.js", "environment.js", "insights.js", "advisories.js", "planner.js",
  "dashboard.js", "assistant-config.js", "assistant-analysis.js", "assistant.js", "offline-forecast.js",
  "pwa.js", "script.js", "manifest.webmanifest", "icons/atmos-192.png", "icons/atmos-512.png",
  "icons/atmos-maskable-512.png",
].map((file) => new URL(file, scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    // Recusar versões repetidas protege a estrutura que outras abas ainda usam.
    if (self.registration.active && await caches.has(shellCache)) {
      throw new Error("Incremente SHELL_VERSION antes de publicar a nova estrutura.");
    }
    const cache = await caches.open(shellCache);
    try {
      await cache.addAll([...shellFiles].map((url) =>
        new Request(url, { cache: "reload", credentials: "omit", redirect: "error" })));
    } catch (error) {
      await caches.delete(shellCache);
      throw error;
    }
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(shellPrefix) && key !== shellCache)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ATUALIZAR_ATMOS") event.waitUntil(self.skipWaiting());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("Authorization")) return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  const isEntry = request.mode === "navigate" && [scope.pathname, entry.pathname].includes(url.pathname);
  const key = isEntry ? entry.href : url.href;
  if (!shellFiles.has(key)) return;
  event.respondWith(caches.match(key, { cacheName: shellCache })
    .catch(() => undefined).then((saved) => saved ?? fetch(request)));
});
