const CACHE_NAME = "pulse-shell-v1";
const STATIC_ASSETS = [
  "/",
  "/feed",
  "/pulse",
  "/explore",
  "/notifications",
  "/chats",
  "/profile",
  "/manifest.json",
  "/icons/icon.svg"
];

// 1. Install Event: Cache App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Cache addAll skipped non-critical routes:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Strategy:
// - API routes & Supabase: Network-first (NEVER serve stale user data)
// - Static assets & shell: Stale-while-revalidate or Network-first
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and chrome extension schemes
  if (event.request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Network-first for dynamic API routes
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline — Unable to reach server" }),
          {
            headers: { "Content-Type": "application/json" },
            status: 503,
          }
        );
      })
    );
    return;
  }

  // Static Assets / Page Navigation: Network first with Cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("/feed");
          }
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
      })
  );
});

// 4. Push Notifications Readiness
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Pulse Social";
    const options = {
      body: data.body || "New activity on Pulse",
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: {
        url: data.url || "/feed",
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Pulse Notification", {
        body: text,
        icon: "/icons/icon.svg",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/feed";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
