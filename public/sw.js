/**
 * Service Worker for Fynvita PWA
 * Provides offline support, caching, and push notifications
 */

const CACHE_NAME = "fynvita-v2";
const STATIC_CACHE = "fynvita-static-v2";
const DYNAMIC_CACHE = "fynvita-dynamic-v2";

// Static assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/login",
  "/offline",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  // User & Profile
  "/api/profile",
  "/api/health",

  // Credit & Financial
  "/api/credit-repair/score",
  "/api/credit-monitoring/history",
  "/api/financial/health-score",
  "/api/financial/ai-insights",
  "/api/financial/spending/insights",
  "/api/financial/spending/ai-insights",
  "/api/financial/budget/ai-optimize",
  "/api/financial/goals/ai-optimize",
  "/api/financial/bills/ai-optimize",
  "/api/financial/credit/ai-insights",
  "/api/financial/disputes/ai-strategy",
  "/api/financial/credit-builder/ai-roadmap",
  "/api/financial/credit-repair/ai-strategy",

  // Investment APIs
  "/api/investments/allocation-analysis",
  "/api/investments/portfolio-analysis",
  "/api/investments/comprehensive-analysis",
  "/api/investments/portfolio",
  "/api/investments/holdings",
  "/api/investments/analyze",
  "/api/investments/recommendations",
  "/api/investments/alerts",
  "/api/investments/patterns",
  "/api/investments/signals",
  "/api/investments/market-data",
  "/api/financial/investments/ai-insights",

  // Real-time & Monitoring
  "/api/ws/market-data",
  "/api/monitoring/health",
  "/api/monitoring/history",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip external requests
  if (url.origin !== location.origin) return;

  // API requests - network first, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages - stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match("/offline");
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return (
      cached ||
      new Response(JSON.stringify({ error: "Offline" }), {
        headers: { "Content-Type": "application/json" },
      })
    );
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then((c) => c.put(request, response.clone()));
      return response;
    })
    .catch(() => cached || caches.match("/offline"));

  return cached || fetchPromise;
}

// Check if request is for static asset
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/.test(pathname);
}

// Push notification handling
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch (e) {
    // If not JSON, use text
    data = { body: event.data?.text() || "New notification from Fynvita" };
  }

  const options = {
    body: data.body || "New notification from Fynvita",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-72x72.png",
    image: data.image,
    vibrate: data.silent ? [] : [100, 50, 100],
    tag: data.tag || "fynvita-notification",
    renotify: !!data.tag, // Renotify if same tag
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    data: {
      url: data.url || "/dashboard",
      type: data.type,
      timestamp: data.timestamp || Date.now(),
      ...data.data,
    },
    actions: data.actions || [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Fynvita", options),
  );
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  let targetUrl = data.url || "/dashboard";

  // Handle specific actions
  if (action === "dismiss") {
    return; // Just close the notification
  }

  if (action === "pay" && data.type === "payment_reminder") {
    targetUrl = "/financial/bills";
  }

  if (action === "review" && data.type === "security_alert") {
    targetUrl = "/settings/security";
  }

  if (action === "snooze") {
    // Could implement snooze logic here
    return;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an existing window and navigate to the URL
        for (const client of clientList) {
          if ("focus" in client && "navigate" in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        // If no existing window, open a new one
        return clients.openWindow(targetUrl);
      }),
  );
});

// Handle notification close (for analytics)
self.addEventListener("notificationclose", (event) => {
  const data = event.notification.data || {};
  // Could send analytics here
  console.log("Notification closed:", data.type, data.timestamp);
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-disputes") {
    event.waitUntil(syncDisputes());
  }
});

async function syncDisputes() {
  // Sync any pending dispute submissions when back online
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();

  for (const request of requests) {
    if (request.url.includes("/api/disputes") && request.method === "POST") {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.error("Sync failed:", error);
      }
    }
  }
}
