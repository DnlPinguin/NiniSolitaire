/**
 * Meldet den Service Worker an, damit das Spiel auch ohne Netz laeuft.
 * Erst nach dem Laden - waehrend des Starts zaehlt jede Millisekunde.
 *
 * Nur in der fertigen Fassung: Waehrend der Entwicklung liefert Vite jede
 * Datei einzeln und veraenderlich aus, ein Zwischenspeicher wuerde dabei
 * nur alte oder falsch eingeordnete Dateien zurueckgeben.
 */
export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return

  if (import.meta.dev) {
    // Aufraeumen, falls vorher schon einmal einer angemeldet war.
    navigator.serviceWorker.getRegistrations()
      .then(regs => regs.forEach(r => r.unregister()))
      .catch(() => {})
    return
  }

  const anmelden = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* egal, dann eben online */ })
  }
  if (document.readyState === 'complete') anmelden()
  else window.addEventListener('load', anmelden, { once: true })
})
