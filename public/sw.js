/*
 * Offline-Betrieb fuer Ninis Spieleecke.
 *
 * Die Seite wird serverseitig gerendert, es gibt also keine feste Dateiliste,
 * die man vorab ablegen koennte. Deshalb zwei einfache Regeln:
 *   - Seitenaufrufe: erst das Netz, sonst die zuletzt gesehene Fassung.
 *   - Alles andere (Skripte, Bilder, Toene): erst der Zwischenspeicher, im
 *     Hintergrund wird dabei aufgefrischt.
 * Die Hundebilder und der Gutschein liegen schon bei der Installation bereit,
 * damit das Spiel auch dann vollstaendig ist, wenn man es nie offline geoeffnet hat.
 */
const CACHE = 'nini-v1'

const PUPS = Array.from({ length: 28 }, (_, i) =>
  `/pups/pup-${String(i + 1).padStart(2, '0')}.webp`)

const VORRAT = [
  '/',
  '/favicon.svg',
  '/gutschein.webp',
  '/party-dog.webp',
  '/hurt-dog.webp',
  ...PUPS
]

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    // Einzeln, damit eine fehlende Datei nicht die ganze Installation kippt.
    await Promise.all(VORRAT.map(url => cache.add(url).catch(() => {})))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const namen = await caches.keys()
    await Promise.all(namen.filter(n => n !== CACHE).map(n => caches.delete(n)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Seitenaufrufe: frische Fassung bevorzugen, offline die letzte bekannte.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const antwort = await fetch(req)
        const cache = await caches.open(CACHE)
        cache.put('/', antwort.clone())
        return antwort
      } catch {
        return (await caches.match('/')) || Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const treffer = await cache.match(req)
    const netz = fetch(req).then(antwort => {
      if (antwort.ok) cache.put(req, antwort.clone())
      return antwort
    }).catch(() => treffer)
    return treffer || netz
  })())
})
