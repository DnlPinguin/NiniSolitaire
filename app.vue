<script setup lang="ts">
/**
 * In-App-Browser (WhatsApp, Instagram) legen ihre Leisten ueber die Seite und
 * melden trotzdem die volle Hoehe. Eine mit position: fixed verankerte App
 * ragt dann oben unter die Adressleiste und laesst unten Rest stehen.
 *
 * visualViewport meldet dagegen den wirklich sichtbaren Ausschnitt. Wir
 * schreiben Hoehe und Versatz in CSS-Variablen und richten die App danach.
 */
function passeAnSichtfeld() {
  const vv = window.visualViewport
  const wurzel = document.documentElement
  const hoehe = vv?.height ?? window.innerHeight
  const versatz = vv?.offsetTop ?? 0
  wurzel.style.setProperty('--app-h', `${Math.round(hoehe)}px`)
  wurzel.style.setProperty('--app-top', `${Math.round(versatz)}px`)
}

onMounted(() => {
  passeAnSichtfeld()
  const vv = window.visualViewport
  vv?.addEventListener('resize', passeAnSichtfeld)
  vv?.addEventListener('scroll', passeAnSichtfeld)
  window.addEventListener('resize', passeAnSichtfeld)
  window.addEventListener('orientationchange', passeAnSichtfeld)
  // Manche Browser melden erst kurz nach dem Aufbau die richtigen Werte.
  setTimeout(passeAnSichtfeld, 300)
  setTimeout(passeAnSichtfeld, 1200)
})

onBeforeUnmount(() => {
  const vv = window.visualViewport
  vv?.removeEventListener('resize', passeAnSichtfeld)
  vv?.removeEventListener('scroll', passeAnSichtfeld)
  window.removeEventListener('resize', passeAnSichtfeld)
  window.removeEventListener('orientationchange', passeAnSichtfeld)
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
