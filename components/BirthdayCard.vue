<script setup lang="ts">
/**
 * Interaktive Geburtstagskarte: antippen zum Aufklappen, dann durchblättern.
 */
const emit = defineEmits<{ done: [] }>()
const { play } = useSounds()

// Nini: 11. September 1997
const GEBURTSJAHR = 1997
const ALTER_JETZT = 29          // Stand 2026, dient auch als Wert fuers Server-Rendering

// Das Alter, das sie in diesem Kalenderjahr wird. Erst nach dem Mounten
// berechnet, damit Server und Browser beim Hydrieren nicht auseinanderlaufen.
const alter = ref(ALTER_JETZT)
onMounted(() => {
  alter.value = new Date().getFullYear() - GEBURTSJAHR
})

const de = (n: number) => Math.round(n).toLocaleString('de-DE')
const mrd = (n: number) => (n / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 })

const funFacts = computed(() => {
  const ALTER = alter.value
  const TAGE = ALTER * 365.25
  return [
  { icon: '🐶', text: `In Hundejahren wärst du <b>${ALTER * 7}</b>.` },
  { icon: '🌞', text: `<b>${de(TAGE)}</b> Tage – und jeder einzelne zählt.` },
  { icon: '💗', text: `Dein Herz hat rund <b>${mrd(TAGE * 24 * 60 * 70)}</b> Milliarden Mal geschlagen.` },
  { icon: '🪐', text: `<b>${ALTER}</b> Runden um die Sonne – rund <b>${mrd(ALTER * 940e6)}</b> Milliarden Kilometer.` },
  { icon: '😴', text: `Etwa <b>${de(ALTER / 3)}</b> Jahre davon hast du verschlafen. Verdient.` }
  ]
})

interface Page { img?: string; title: string; text?: string; facts?: boolean; boop?: boolean }

const pages = computed<Page[]>(() => [
  {
    img: '/pups/pup-11.webp',
    title: 'Alles Gute zum<br>Geburtstag, Nini!',
    text: '11. September – heute wird gefeiert. ♡'
  },
  {
    img: '/pups/pup-18.webp',
    title: 'Was Kleines für dich',
    text: 'Falls du mal ein bisschen<br>Ablenkung brauchst.'
  },
  {
    title: `${alter.value} Jahre –<br>in Zahlen`,
    facts: true
  },
  {
    img: '/pups/pup-25.webp',
    title: 'Ich hoffe es<br>gefällt dir, Bebi',
    text: 'Ich wusste nicht genau,<br>was du willst. ♡',
    boop: true
  }
])

const opened = ref(false)
const page = ref(0)
const leaving = ref(false)
const isLast = computed(() => page.value === pages.value.length - 1)

interface Confetti { id: number; left: number; delay: number; dur: number; size: number; glyph: string }
const confetti = ref<Confetti[]>([])

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

onMounted(() => {
  // Zufallswerte erst im Browser — sonst weicht der Server ab (Hydration).
  confetti.value = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: Math.round(Math.random() * 96),
    delay: Math.round(Math.random() * 900),
    dur: 2600 + Math.round(Math.random() * 1800),
    size: 12 + Math.round(Math.random() * 18),
    glyph: ['💖', '💕', '🩷', '♡', '✨'][i % 5]!
  }))
})

/* ---------------- Boop the snoot ---------------- */
const boops = ref(0)
const boopReaktion = ref('')
const boopHerzen = ref<{ id: number; left: number; rot: number }[]>([])
let herzId = 0
let boopTimer: ReturnType<typeof setTimeout> | null = null

const REAKTIONEN = [
  'Boop! 🐽',
  'Nochmal! 💕',
  'Er mag das ☺️',
  'Schwanzwedeln 🐕',
  'Bester Boop 🏆'
]

function boop() {
  boops.value++
  boopReaktion.value = REAKTIONEN[Math.min(boops.value - 1, REAKTIONEN.length - 1)]!
  play('foundation')
  navigator.vibrate?.(12)

  const id = herzId++
  boopHerzen.value.push({ id, left: 30 + Math.random() * 40, rot: Math.random() * 50 - 25 })
  setTimeout(() => {
    boopHerzen.value = boopHerzen.value.filter(h => h.id !== id)
  }, 900)

  if (boopTimer) clearTimeout(boopTimer)
  boopTimer = setTimeout(() => (boopReaktion.value = ''), 1600)
}

onBeforeUnmount(() => { if (boopTimer) clearTimeout(boopTimer) })

function open() {
  if (opened.value) return
  opened.value = true
  play('win')
}

function next() {
  if (isLast.value) return
  page.value++
  play('foundation')
}

function back() {
  if (page.value === 0) return
  page.value--
  play('flip')
}

function finish() {
  if (leaving.value) return
  leaving.value = true
  setTimeout(() => emit('done'), reduced() ? 0 : 420)
}
</script>

<template>
  <div class="overlay" :class="{ leaving }">
    <span
      v-for="c in confetti"
      v-show="opened"
      :key="c.id"
      class="confetti"
      :style="{
        left: `${c.left}%`,
        animationDelay: `${c.delay}ms`,
        animationDuration: `${c.dur}ms`,
        fontSize: `${c.size}px`
      }"
    >{{ c.glyph }}</span>

    <div class="stage">
      <div class="card" :class="{ open: opened }">
        <!-- Rückwand, damit unter der letzten Seite nichts durchscheint -->
        <div class="sheet backdrop" />

        <!-- Seiten: die aktuelle liegt oben, geblätterte klappen nach links weg -->
        <div
          v-for="(p, i) in pages"
          :key="i"
          class="sheet page"
          :class="{ turned: i < page }"
          :style="{ zIndex: pages.length - i }"
        >
          <template v-if="p.boop">
            <h2 class="compact" v-html="p.title" />
            <p class="letter script" v-html="p.text" />

            <button class="snoot" :class="{ booped: boops }" @click="boop">
              <img :src="p.img" alt="" draggable="false">
              <span class="nose">🐽</span>
              <span
                v-for="h in boopHerzen"
                :key="h.id"
                class="boop-heart"
                :style="{ left: `${h.left}%`, transform: `rotate(${h.rot}deg)` }"
              >💗</span>
            </button>

            <span class="boop-label">
              {{ boopReaktion || (boops ? `${boops} Boops 🐾` : 'Boop the snoot 👆') }}
            </span>
          </template>

          <template v-else>
            <img v-if="p.img" class="pup" :src="p.img" alt="" draggable="false">
            <h2 :class="{ compact: p.facts }" v-html="p.title" />
            <p v-if="p.text" class="script" v-html="p.text" />
          </template>

          <ul v-if="p.facts" class="facts">
            <li v-for="(f, fi) in funFacts" :key="fi">
              <span class="fact-icon">{{ f.icon }}</span>
              <span v-html="f.text" />
            </li>
          </ul>

          <div class="nav">
            <button v-if="i > 0" class="page-btn ghost" @click="back">←</button>
            <button v-if="i < pages.length - 1" class="page-btn" @click="next">Weiter →</button>
            <button v-else class="btn btn-primary start" @click="finish">Los geht's 🎉</button>
          </div>

          <div class="dots">
            <span v-for="(_, d) in pages" :key="d" :class="{ on: d === page }" />
          </div>
        </div>

        <!-- Deckel -->
        <div class="cover" :style="{ zIndex: pages.length + 2 }" @click="open">
          <div class="face front">
            <img class="party-dog" src="/party-dog.webp" alt="" draggable="false">
            <h3>Für Nini</h3>
            <span class="script hint">Tippen zum Öffnen ♡</span>
            <span class="ribbon" />
          </div>
          <div class="face back" />
        </div>
      </div>
    </div>

    <button class="skip" @click="finish">{{ opened ? 'Zum Spiel' : 'Überspringen' }}</button>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 90;
  display: grid; place-items: center;
  background: radial-gradient(60% 50% at 50% 40%, rgba(255, 214, 236, .96), rgba(255, 198, 228, .99));
  overflow: hidden;
  transition: opacity .4s ease, transform .4s ease;
}
.overlay.leaving { opacity: 0; transform: scale(1.04); pointer-events: none; }

.stage { perspective: 1400px; }
.card {
  position: relative;
  width: min(330px, 82vw);
  aspect-ratio: 3 / 4;
  transform-style: preserve-3d;
  animation: float 4s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50%      { transform: translateY(-10px) rotate(1deg); }
}
.card.open { animation: none; }

/* ---------- Seiten ---------- */
.sheet {
  position: absolute; inset: 0;
  border-radius: 22px;
  background: linear-gradient(170deg, #fffdfe, #fff1f8);
  box-shadow: 0 22px 50px rgba(214, 51, 132, .28);
}
.backdrop { z-index: 0; }
.page {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 22px 18px 16px; text-align: center;
  transform-origin: left center;
  backface-visibility: hidden;
  transition: transform .85s cubic-bezier(.35, .75, .25, 1);
}
.page.turned { transform: rotateY(-172deg); }

.pup { width: 40%; max-width: 120px; object-fit: contain; }
.page h2 {
  margin: 8px 0 0;
  font-family: 'Baloo 2', sans-serif;
  font-size: clamp(18px, 5.2vw, 23px); line-height: 1.15;
  color: var(--pink-600);
}
.page .script { margin: 6px 0 0; font-size: 16px; line-height: 1.3; color: var(--pink-400); }

.facts {
  list-style: none;
  margin: 12px 0 0;
  padding: 0 2px;
  display: flex; flex-direction: column; gap: 9px;
  text-align: left;
}
.facts li {
  display: flex; align-items: flex-start; gap: 9px;
  font-size: 13px; line-height: 1.35;
  color: var(--ink-soft); font-weight: 600;
}
.facts :deep(b) { color: var(--pink-600); font-weight: 800; }
.fact-icon { font-size: 16px; line-height: 1.1; flex: none; }
h2.compact { font-size: clamp(17px, 4.8vw, 21px); }

.nav { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
.page-btn {
  border: 0; cursor: pointer; font: inherit; font-weight: 800; font-size: 15px;
  padding: 11px 20px; border-radius: 999px;
  background: linear-gradient(180deg, var(--pink-400), var(--pink-500)); color: #fff;
  box-shadow: 0 8px 18px rgba(246, 51, 140, .34);
}
.page-btn.ghost {
  background: rgba(246, 51, 140, .1); color: var(--pink-500);
  box-shadow: none; padding: 11px 15px;
}

.dots { display: flex; gap: 6px; margin-top: 14px; }
.dots span {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(246, 51, 140, .22); transition: .2s;
}
.dots span.on { background: var(--pink-500); transform: scale(1.25); }

/* ---------- Boop the snoot ---------- */
.letter {
  margin: 8px 0 2px !important;
  font-size: 17px !important;
  line-height: 1.35;
}
.snoot {
  position: relative;
  border: 0; padding: 0; margin: 6px 0 0;
  background: none; cursor: pointer;
  width: 52%; max-width: 150px;
  touch-action: manipulation;
  transition: transform .16s cubic-bezier(.34, 1.7, .5, 1);
}
.snoot img { width: 100%; display: block; object-fit: contain; }
.snoot:active { transform: scale(.9) rotate(-2deg); }

/* der Hinweis wippt, bis einmal gestupst wurde */
.nose {
  position: absolute; left: 50%; top: 34%;
  transform: translate(-50%, -50%);
  font-size: 20px; opacity: .0;
  animation: nose-hint 1.6s ease-in-out infinite;
  pointer-events: none;
}
.snoot.booped .nose { animation: none; opacity: 0; }
@keyframes nose-hint {
  0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(.8); }
  50%      { opacity: .85; transform: translate(-50%, -60%) scale(1.15); }
}

.boop-heart {
  position: absolute; bottom: 40%;
  font-size: 20px; pointer-events: none;
  animation: boop-rise .9s ease-out forwards;
}
@keyframes boop-rise {
  from { opacity: 1; }
  to   { opacity: 0; translate: 0 -70px; }
}

.boop-label {
  margin-top: 8px;
  font-family: 'Caveat', cursive;
  font-size: 19px; color: var(--pink-500); font-weight: 600;
  min-height: 24px;
}

/* ---------- Deckel ---------- */
.cover {
  position: absolute; inset: 0;
  transform-origin: left center; transform-style: preserve-3d;
  cursor: pointer;
  transition: transform 1.05s cubic-bezier(.35, .75, .25, 1);
}
.card.open .cover { transform: rotateY(-158deg); }
.face {
  position: absolute; inset: 0;
  border-radius: 22px; backface-visibility: hidden; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
}
.face.front {
  background:
    radial-gradient(circle at 20% 18%, rgba(255,255,255,.28) 0 16%, transparent 17%),
    radial-gradient(circle at 82% 78%, rgba(255,255,255,.22) 0 14%, transparent 15%),
    linear-gradient(160deg, #ff85c0, var(--pink-500) 60%, var(--pink-600));
  box-shadow: 0 22px 50px rgba(214, 51, 132, .34);
  color: #fff;
}
.face.back {
  transform: rotateY(180deg);
  background: linear-gradient(160deg, #ffd9ec, #ffc2e0);
  box-shadow: inset 0 0 40px rgba(214, 51, 132, .12);
}
.party-dog {
  width: 74%; max-width: 230px;
  object-fit: contain;
  filter: drop-shadow(0 10px 16px rgba(122, 18, 70, .34));
}
.face.front h3 {
  margin: 0; font-family: 'Baloo 2', sans-serif;
  font-size: clamp(26px, 7vw, 34px); letter-spacing: .5px;
}
.face.front .hint { color: #fff; }
.hint { font-size: 18px; opacity: .92; animation: breathe 1.9s ease-in-out infinite; }
@keyframes breathe { 50% { opacity: .5; transform: translateY(2px); } }
.ribbon {
  position: absolute; left: 0; right: 0; bottom: 5%;
  height: 10px;
  background: rgba(255,255,255,.22);
  box-shadow: 0 0 0 1px rgba(255,255,255,.18) inset;
}

/* ---------- Konfetti ---------- */
.confetti {
  position: absolute; bottom: -40px;
  animation-name: rise; animation-timing-function: ease-in;
  animation-iteration-count: infinite; pointer-events: none;
}
@keyframes rise {
  from { transform: translateY(0) rotate(0); opacity: 0; }
  15%  { opacity: 1; }
  to   { transform: translateY(-105vh) rotate(220deg); opacity: 0; }
}

.skip {
  position: absolute; bottom: 26px;
  border: 0; background: none; cursor: pointer;
  font: inherit; font-weight: 700; font-size: 14px;
  color: var(--pink-500); opacity: .75;
}
.skip:hover { opacity: 1; text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  .card, .hint, .confetti { animation: none; }
  .cover, .page { transition-duration: .01ms; }
}
</style>
