/* Akhar offline cache — precaches shell; runtime-caches audio/fonts */
const CACHE = 'akhar-v3'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        './',
        './index.html',
        './manifest.webmanifest',
        './favicon.svg',
      ]).catch(() => undefined),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Audio & fonts: cache-first after first fetch
  if (url.pathname.includes('/audio/') || url.pathname.includes('/fonts/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      }),
    )
    return
  }

  // App shell: network-first, fall back to cache (only store successful responses)
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
        }
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))),
  )
})
