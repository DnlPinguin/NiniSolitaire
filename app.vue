<script setup lang="ts">
/**
 * WhatsApp und Instagram zeigen Webseiten in einem Fenster, ueber das sie
 * ihre EIGENEN Bedienleisten legen. Fuer die Seite ist das unsichtbar - sie
 * haelt sich fuer bildschirmfuellend. Deshalb helfen weder svh noch dvh noch
 * die Sicherheitsabstaende: Die Seite wird hoeher als das, was man sieht,
 * und der Browser scrollt den Ueberhang von selbst weg.
 *
 * Einzig visualViewport meldet den wirklich sichtbaren Ausschnitt. Der Wert
 * landet in --vvh, an dem sich die Hoehenangaben orientieren. Weil die Seite
 * dabei normal fliesst, bleibt bei einer Fehlmessung schlimmstenfalls etwas
 * zu scrollen - unerreichbar wird nichts.
 */
function messeSichtfeld() {
  // Kein einzelner Wert ist verlaesslich: Beim Oeffnen aus einer anderen App
  // meldet visualViewport zu viel (die Rueckkehr-Leiste rechnet es nicht mit),
  // waehrend clientHeight den echten Ausschnitt kennt. Der kleinste gewinnt.
  const kandidaten = [
    window.visualViewport?.height,
    document.documentElement.clientHeight,
    window.innerHeight
  ].filter((n): n is number => typeof n === 'number' && n > 200)

  if (!kandidaten.length) return
  const hoehe = Math.round(Math.min(...kandidaten))
  document.documentElement.style.setProperty('--vvh', `${hoehe}px`)

  // Safari kann den sichtbaren Ausschnitt verschieben, ohne zu scrollen -
  // dann liegt unser Seitenanfang oberhalb des Sichtbaren. Diesen Versatz
  // gleichen wir aus.
  const versatz = Math.round(window.visualViewport?.offsetTop ?? 0)
  document.documentElement.style.setProperty('--vvo', `${Math.max(0, versatz)}px`)
}

let messungen: ReturnType<typeof setTimeout>[] = []
function messeMehrfach() {
  messungen.forEach(clearTimeout)
  // In-App-Browser melden erst nach dem Aufbau brauchbare Werte.
  messungen = [0, 80, 300, 800, 1500, 2500].map(ms => setTimeout(messeSichtfeld, ms))
}

/**
 * Oeffnet iOS einen Link aus einer anderen App (WhatsApp, Notizen), zeichnet
 * Safari die Seite unter seine eigene Leiste - und meldet das nirgends: Alle
 * Werte (scrollY, offsetTop, clientHeight, Lage der App) sind dann korrekt,
 * trotzdem fehlt oben ein Stueck.
 *
 * Von Hand scrollen behebt es. Also macht die Seite genau das selbst: Sie
 * wird kurz ein paar Pixel hoeher gemacht, einmal angescrollt und wieder
 * zurueckgesetzt. Das zwingt Safari, seine Leisten und den Ausschnitt neu zu
 * berechnen - dasselbe, was beim Wischen von Hand passiert.
 */
function stupsSafari() {
  const koerper = document.body

  // Erst messen, dann Safari zwingen, alles neu zu zeichnen. Das Ausblenden
  // fuer einen Wimpernschlag verwirft den alten, falschen Aufbau - genau das,
  // was sonst erst das Schliessen und Neuoeffnen bewirkt.
  messeSichtfeld()
  const vorher = koerper.style.display
  koerper.style.display = 'none'
  void koerper.offsetHeight        // erzwingt den Neuaufbau
  koerper.style.display = vorher

  // danach noch ein kurzer Scroll-Stups, damit Safari seine Leisten festlegt
  const hoehe = koerper.style.minHeight
  koerper.style.minHeight = `calc(var(--vvh, 100svh) + 3px)`
  requestAnimationFrame(() => {
    window.scrollTo(0, 2)
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      koerper.style.minHeight = hoehe
      messeSichtfeld()
    })
  })
}

onMounted(() => {
  messeMehrfach()
  // mehrfach, weil Safari erst nach dem Aufbau seine Leisten festlegt
  ;[60, 350, 900, 1800].forEach(ms => setTimeout(stupsSafari, ms))
  const vv = window.visualViewport
  vv?.addEventListener('resize', messeSichtfeld)
  window.addEventListener('resize', messeSichtfeld)
  window.addEventListener('orientationchange', messeMehrfach)
  window.addEventListener('pageshow', () => {
    messeMehrfach(); setTimeout(stupsSafari, 120)
  })
  document.addEventListener('visibilitychange', () => { messeMehrfach(); setTimeout(stupsSafari, 120) })
})

/* Messanzeige, nur mit ?debug=1 in der Adresse sichtbar. */
const zeigeWerte = ref(false)
const werte = ref('')

function werteSammeln() {
  const d = document.documentElement
  const vv = window.visualViewport
  werte.value = [
    `innerHeight   ${window.innerHeight}`,
    `visualVP h ${Math.round(vv?.height ?? -1)}  offsetTop ${Math.round(vv?.offsetTop ?? -1)}`,
    `clientHeight  ${d.clientHeight}`,
    `app top/bot   ${Math.round(document.querySelector('.app')?.getBoundingClientRect().top ?? 0)} / ${Math.round(document.querySelector('.app')?.getBoundingClientRect().bottom ?? 0)}`,
    `kopf top      ${Math.round(document.querySelector('.topbar')?.getBoundingClientRect().top ?? -999)}`,
    `--vvh         ${getComputedStyle(d).getPropertyValue('--vvh').trim() || '-'}`,
    `body          ${Math.round(document.body.getBoundingClientRect().height)}`,
    `scrollHeight  ${d.scrollHeight}   clientHeight ${d.clientHeight}`,
    `scrollY       ${Math.round(window.scrollY)}`,
    `safe top/bot  ${getComputedStyle(d).getPropertyValue('--sat') || '?'}`
  ].join('\n')
}

onMounted(() => {
  if (typeof location !== 'undefined' && location.search.includes('debug=1')) {
    zeigeWerte.value = true
    werteSammeln()
    setInterval(werteSammeln, 400)
  }
})

onBeforeUnmount(() => {
  messungen.forEach(clearTimeout)
  const vv = window.visualViewport
  vv?.removeEventListener('resize', messeSichtfeld)
  window.removeEventListener('resize', messeSichtfeld)
  window.removeEventListener('orientationchange', messeMehrfach)
  window.removeEventListener('pageshow', messeMehrfach)
  document.removeEventListener('visibilitychange', messeMehrfach)
})

/*
 * Tab-Bar stillgelegt (2026-09-10): Es gibt nur noch Solitaire, also führt
 * keine Navigation mehr irgendwohin. Zum Reaktivieren zusammen mit dem
 * <nav>-Block unten und parked/hub-index.vue wieder einkommentieren.
 *
 * const route = useRoute()
 * const nav = [
 *   { to: '/', label: 'Home', icon: 'home' },
 *   { to: '/', label: 'Spiele', icon: 'pad' },
 *   { to: '/', label: 'Favoriten', icon: 'heart' },
 *   { to: '/', label: 'Einstellungen', icon: 'gear' }
 * ]
 * const isHome = computed(() => route.path === '/')
 * const showTabs = computed(() => !route.path.startsWith('/games/'))
 */
</script>

<template>
  <div class="app no-tabs">
    <pre v-if="zeigeWerte" class="messwerte">{{ werte }}</pre>
    <NuxtPage />

<!--
    <nav v-if="showTabs" class="tabbar">
      <NuxtLink
        v-for="(item, i) in nav"
        :key="item.label"
        :to="item.to"
        class="tab"
        :class="{ active: i === 0 && isHome }"
      >
        <span class="ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <template v-if="item.icon === 'home'">
              <path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" />
            </template>
            <template v-else-if="item.icon === 'pad'">
              <rect x="2.5" y="7.5" width="19" height="11" rx="4.5" /><path d="M7 11v3M5.5 12.5h3M16 12h.01M18 14h.01" />
            </template>
            <template v-else-if="item.icon === 'heart'">
              <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
            </template>
            <template v-else>
              <circle cx="12" cy="12" r="3.1" /><path d="M19.3 14.5a1.5 1.5 0 0 0 .3 1.65l.05.05a1.8 1.8 0 1 1-2.55 2.55l-.05-.05a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37v.14a1.8 1.8 0 1 1-3.6 0v-.07a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.05.05a1.8 1.8 0 1 1-2.55-2.55l.05-.05a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H4.2a1.8 1.8 0 1 1 0-3.6h.07a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.05-.05A1.8 1.8 0 1 1 7.84 4.86l.05.05a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .9-1.37V3.7a1.8 1.8 0 1 1 3.6 0v.07a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.05-.05a1.8 1.8 0 1 1 2.55 2.55l-.05.05a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.9h.14a1.8 1.8 0 1 1 0 3.6h-.07a1.5 1.5 0 0 0-1.37.9Z" />
            </template>
          </svg>
        </span>
        <span class="lbl">{{ item.label }}</span>
      </NuxtLink>
    </nav>
    -->
  </div>
</template>

<style scoped>
/* Messanzeige fuer die Fehlersuche auf echten Geraeten */
.messwerte {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 999;
  margin: 0; padding: 6px 8px;
  background: rgba(0, 0, 0, .82); color: #7CFFB2;
  font: 600 11px/1.35 ui-monospace, monospace;
  white-space: pre; pointer-events: none;
}

.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  height: var(--nav-h);
  display: grid; grid-template-columns: repeat(4, 1fr);
  background: rgba(255, 240, 247, .92);
  backdrop-filter: blur(14px);
  border-top: 1px solid rgba(246, 51, 140, .12);
  box-shadow: 0 -8px 26px rgba(214, 51, 132, .12);
}
.tab {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  color: var(--ink-soft); font-size: 12px; font-weight: 700;
  transition: color .15s;
}
.tab:hover { color: var(--pink-500); }
.tab.active { color: var(--pink-500); }
.ico svg { width: 24px; height: 24px; display: block; }
.tab.active .ico svg { fill: rgba(246,51,140,.16); }
</style>
