/**
 * Auris — sw.js
 * =============
 * Service Worker for offline support.
 *
 * Strategy:
 *   - App shell (HTML, CSS, JS) → Cache First, update in background
 *   - Transformers.js CDN assets → Cache First (models are large, never change)
 *   - Google Fonts → Cache First
 *   - Everything else → Network First with cache fallback
 */

"use strict";

const CACHE_VERSION  = "auris-v1";
const SHELL_CACHE    = `${CACHE_VERSION}-shell`;
const CDN_CACHE      = `${CACHE_VERSION}-cdn`;

// App shell — all local static files
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/css/reset.css",
  "/css/tokens.css",
  "/css/layout.css",
  "/css/components.css",
  "/css/animations.css",
  "/js/main.js",
  "/js/audio.js",
  "/js/transcriber.js",
  "/js/export.js",
  "/js/ui.js",
  "/js/subtitle-editor.js",
  "/js/transcript-search.js",
  "/manifest.json",
];

// ── Install ───────────────────────────────────────────────
// Pre-cache all shell assets when SW is installed

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────
// Delete old caches from previous versions

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("auris-") && key !== SHELL_CACHE && key !== CDN_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // CDN assets (Transformers.js, ONNX, Google Fonts) → Cache First
  if (isCdnRequest(url)) {
    event.respondWith(cacheFirst(request, CDN_CACHE));
    return;
  }

  // App shell → Cache First with network update
  if (isShellRequest(url)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Everything else → Network First with cache fallback
  event.respondWith(networkFirst(request, SHELL_CACHE));
});

// ── Strategies ────────────────────────────────────────────

/**
 * Cache First — serve from cache, fall back to network and update cache.
 * Best for versioned assets that rarely change.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline — resource not cached", { status: 503 });
  }
}

/**
 * Network First — try network, fall back to cache.
 * Best for HTML pages that should be fresh when online.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response("Offline", { status: 503 });
  }
}

// ── Helpers ───────────────────────────────────────────────

function isCdnRequest(url) {
  return (
    url.hostname === "cdn.jsdelivr.net"      ||
    url.hostname === "fonts.googleapis.com"  ||
    url.hostname === "fonts.gstatic.com"
  );
}

function isShellRequest(url) {
  return (
    url.hostname === self.location.hostname &&
    (
      url.pathname === "/" ||
      url.pathname.endsWith(".html") ||
      url.pathname.startsWith("/css/") ||
      url.pathname.startsWith("/js/") ||
      url.pathname === "/manifest.json"
    )
  );
}
