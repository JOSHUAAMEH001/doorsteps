/*
 * DOORS service worker.
 *
 * Deliberately conservative so it can never show stale or private data:
 *  - Page navigations always go to the network. Pages are NEVER cached (they can contain
 *    signed-in data, orders, prices). If the network fails, a static offline page is shown.
 *  - Only immutable, content-hashed build files (/_next/static/...) and the PWA icons are
 *    cached, so repeat visits load faster.
 *  - Everything else (server actions, API routes, Supabase, images, POST requests) is not
 *    touched at all and behaves exactly as without a service worker.
 */
const VERSION = "doors-v1"
const STATIC_CACHE = `${VERSION}-static`
const OFFLINE_URL = "/offline.html"
const PRECACHE = [OFFLINE_URL, "/pwa/icon-192.png", "/pwa/icon-512.png", "/brand/doors-logo-white.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("doors-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Pages: network only, offline page as a fallback. Never cached.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
    )
    return
  }

  // Immutable hashed build assets: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa/")) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })),
    )
  }
  // Anything else: default browser behaviour (no respondWith).
})

/*
 * Push notifications (sent by the "send-push" Supabase Edge Function).
 * Payload: { id, title, body, link, tag }. `link` is always a path on this site.
 */
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }
  const title = typeof data.title === "string" && data.title ? data.title : "DOORS"
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/pwa/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : undefined,
      renotify: Boolean(data.tag),
      data: { link: typeof data.link === "string" && data.link.startsWith("/") ? data.link : "/" },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const link = event.notification.data && typeof event.notification.data.link === "string" ? event.notification.data.link : "/"
  const target = new URL(link.startsWith("/") ? link : "/", self.location.origin)
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (open) {
      // DOORS is already open: bring it forward and let the app switch screens itself.
      await open.focus()
      open.postMessage({ type: "doors-open", link: target.pathname + target.search })
      return
    }
    await self.clients.openWindow(target.href)
  })())
})
