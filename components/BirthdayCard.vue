<script setup lang="ts">
/**
 * Geburtstagskarte: antippen zum Aufklappen, dann durchblättern.
 * Geblättert wird per Wischen oder über das umgeknickte Eck unten rechts.
 */
const emit = defineEmits<{ done: [] }>()
const { play } = useSounds()

/* ---------------- Alter & Fun Facts ---------------- */
// Nini: 11. September 1997
const GEBURTSJAHR = 1997
const ALTER_JETZT = 29        // Startwert fuers Server-Rendering

// Erst nach dem Mounten berechnet, damit Server und Browser beim
// Hydrieren nicht auseinanderlaufen.
const alter = ref(ALTER_JETZT)
onMounted(() => { alter.value = new Date().getFullYear() - GEBURTSJAHR })

const de = (n: number) => Math.round(n).toLocaleString('de-DE')
const mrd = (n: number) => (n / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 })

const funFacts = computed(() => {
  const A = alter.value
  const TAGE = A * 365.25
  return [
    { icon: '🐶', text: `In Hundejahren wärst du <b>${A * 7}</b>.` },
    { icon: '🌞', text: `<b>${de(TAGE)}</b> Tage – und jeder einzelne zählt.` },
    { icon: '💗', text: `Dein Herz hat rund <b>${mrd(TAGE * 24 * 60 * 70)}</b> Milliarden Mal geschlagen.` },
    { icon: '🪐', text: `<b>${A}</b> Runden um die Sonne – rund <b>${mrd(A * 940e6)}</b> Milliarden Kilometer.` },
    { icon: '😴', text: `Etwa <b>${de(A / 3)}</b> Jahre davon hast du verschlafen. Verdient.` }
  ]
})

/* ---------------- Seiten ---------------- */
type Art = 'text' | 'facts' | 'boop' | 'aua' | 'schatz'
interface Page { art: Art; img?: string; title: string; text?: string }

const pages = computed<Page[]>(() => [
  {
    art: 'text',
    img: '/pups/pup-11.webp',
    title: 'Alles Gute zum<br>Geburtstag, Nini!',
    text: '11. September – heute wird gefeiert. ♡'
  },
  {
    art: 'text',
    img: '/pups/pup-18.webp',
    title: 'Ich hoffe es<br>gefällt dir, Bebi',
    text: 'Ich wusste nicht genau,<br>was du willst. ♡'
  },
  { art: 'facts', title: `${alter.value} Jahre –<br>in Zahlen` },
  {
    art: 'boop',
    img: '/treasure-dog.webp',
    title: 'Er sitzt auf<br>deinem Geschenk',
    text: 'Boop the snoot,<br>damit er weggeht 👆'
  },
  {
    art: 'aua',
    img: '/hurt-dog.webp',
    title: 'Ohhh neeein,<br>das war zu fest!',
    text: 'Gib ihm schnell ein Leckerli. 🥺'
  },
  {
    art: 'schatz',
    title: 'Er macht die<br>Truhe auf!',
    text: 'Dein eigenes Solitaire-Deck. ✨'
  }
])

const page = ref(0)
const leaving = ref(false)
const isLast = computed(() => page.value === pages.value.length - 1)

/* ---------------- Konfetti ---------------- */
interface Confetti { id: number; left: number; delay: number; dur: number; size: number; glyph: string }
const confetti = ref<Confetti[]>([])
const opened = ref(false)

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

onMounted(() => {
  // Zufall nur im Browser, sonst weicht der Server ab.
  confetti.value = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: Math.round(Math.random() * 96),
    delay: Math.round(Math.random() * 900),
    dur: 2600 + Math.round(Math.random() * 1800),
    size: 12 + Math.round(Math.random() * 18),
    glyph: ['💖', '💕', '🩷', '♡', '✨'][i % 5]!
  }))
})

/* ---------------- Blättern ---------------- */
function next() {
  if (isLast.value) return
  page.value++
  play('swipe')
}
function back() {
  if (page.value === 0) return
  page.value--
  play('swipe')
}

// Auf den Mitmach-Seiten geht es erst weiter, wenn man sie geloest hat.
const gesperrt = computed(() => {
  const art = pages.value[page.value]?.art
  return art === 'boop' || art === 'aua'
})

// Wischen
const swipe = reactive({ x: 0, active: false })
function onSwipeStart(e: PointerEvent) {
  swipe.x = e.clientX
  swipe.active = true
}
function onSwipeEnd(e: PointerEvent) {
  if (!swipe.active) return
  swipe.active = false
  if (gesperrt.value) return
  const dx = e.clientX - swipe.x
  if (Math.abs(dx) < 45) return
  dx < 0 ? next() : back()
}

/* ---------------- Boop the snoot ---------------- */
const boops = ref(0)
const boopReaktion = ref('')
interface Knall { id: number; wort: string; left: number; top: number; rot: number; farbe: string }
const knaller = ref<Knall[]>([])
let knallId = 0

const COMIC_WORTE = ['BAMM!', 'POW!', 'BOOP!', 'PENG!', 'ZACK!', 'WHAM!', 'BOING!', 'PUFF!', 'KAWUMM!']
const COMIC_FARBEN = ['#ffd76e', '#ff8fc4', '#7bdff2', '#ffb3d8', '#ffe27a']
const timers: ReturnType<typeof setTimeout>[] = []

const BOOPS_NOETIG = 30
const BOSS_NAME = 'Sir Flausch, Wächter der Truhe'
const REST_LEBEN = 8   // so viel bleibt ihm am Ende - er stirbt nicht, er geht

/** Leben in Prozent: voll bei 0 Boops, knapp ueber null beim letzten. */
const leben = computed(() =>
  100 - (boops.value / BOOPS_NOETIG) * (100 - REST_LEBEN)
)
// gruen -> gelb -> rot
const lebenFarbe = computed(() => `hsl(${Math.round(leben.value * 1.25)}, 78%, 48%)`)

// ab welchem Boop welcher Spruch steht
const REAKTIONEN: [number, string][] = [
  [1, 'Boop! 🐽'],
  [3, 'Er guckt dich an … 👀'],
  [6, 'Nochmal! 💗'],
  [10, 'Schwanzwedeln 🐕'],
  [15, 'Halbzeit! 💪'],
  [20, 'Er wird müde … 😪'],
  [25, 'Gleich hast du ihn 🔥'],
  [29, 'Noch einer! ✨']
]

function spruchFuer(n: number) {
  let s = REAKTIONEN[0]![1]
  for (const [ab, text] of REAKTIONEN) if (n >= ab) s = text
  return s
}

function boop(e?: MouseEvent) {
  if (boops.value >= BOOPS_NOETIG) return
  boops.value++
  boopReaktion.value = spruchFuer(boops.value)
  play('punch')
  if (e?.isTrusted) navigator.vibrate?.(12)

  const id = knallId++
  knaller.value.push({
    id,
    wort: COMIC_WORTE[Math.floor(Math.random() * COMIC_WORTE.length)]!,
    left: 8 + Math.random() * 62,
    top: 6 + Math.random() * 54,
    rot: Math.random() * 34 - 17,
    farbe: COMIC_FARBEN[Math.floor(Math.random() * COMIC_FARBEN.length)]!
  })
  timers.push(setTimeout(() => {
    knaller.value = knaller.value.filter(k => k.id !== id)
  }, 700))

  // Beim letzten Mal war es dann doch zu fest …
  if (boops.value === BOOPS_NOETIG) {
    boopReaktion.value = 'Ups … 😬'
    play('invalid')
    timers.push(setTimeout(next, 850))
  }
}

/* ---------------- Leckerli: auf den Hund ziehen ---------------- */
const leckerliGegeben = ref(false)
const futter = reactive({ x: 0, y: 0, zieht: false, drueber: false })

function leckerli(echt = false) {
  if (leckerliGegeben.value) return
  leckerliGegeben.value = true
  play('bark')
  if (echt) navigator.vibrate?.(20)
  timers.push(setTimeout(next, 1600))
}

/** Liegt der Punkt über dem Hund? */
function ueberHund(x: number, y: number) {
  const el = document.querySelector('.aua-bild')
  if (!el) return false
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

function futterStart(e: PointerEvent) {
  if (leckerliGegeben.value) return
  e.preventDefault()
  futter.zieht = true
  futter.x = e.clientX
  futter.y = e.clientY
  window.addEventListener('pointermove', futterZieht)
  window.addEventListener('pointerup', futterLos)
  window.addEventListener('pointercancel', futterLos)
}

function futterZieht(e: PointerEvent) {
  if (!futter.zieht) return
  futter.x = e.clientX
  futter.y = e.clientY
  futter.drueber = ueberHund(e.clientX, e.clientY)
}

function futterLos(e: PointerEvent) {
  window.removeEventListener('pointermove', futterZieht)
  window.removeEventListener('pointerup', futterLos)
  window.removeEventListener('pointercancel', futterLos)
  if (!futter.zieht) return
  futter.zieht = false
  futter.drueber = false
  if (ueberHund(e.clientX, e.clientY)) leckerli(e.isTrusted)
}

function finish() {
  if (leaving.value) return
  leaving.value = true
  timers.push(setTimeout(() => emit('done'), reduced() ? 0 : 420))
}

function open() {
  if (opened.value) return
  opened.value = true
  play('win')
}

onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
  window.removeEventListener('pointermove', futterZieht)
  window.removeEventListener('pointerup', futterLos)
  window.removeEventListener('pointercancel', futterLos)
})
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
      <div
        class="card"
        :class="{ open: opened }"
        @pointerdown="onSwipeStart"
        @pointerup="onSwipeEnd"
      >
        <div class="sheet backdrop" />

        <div
          v-for="(p, i) in pages"
          :key="i"
          class="sheet page"
          :class="{ turned: i < page }"
          :style="{ zIndex: pages.length - i }"
        >
          <!-- Fun Facts -->
          <template v-if="p.art === 'facts'">
            <h2 class="compact" v-html="p.title" />
            <ul class="facts">
              <li v-for="(f, fi) in funFacts" :key="fi">
                <span class="fact-icon">{{ f.icon }}</span>
                <span v-html="f.text" />
              </li>
            </ul>
          </template>

          <!-- Hund auf der Truhe -->
          <template v-else-if="p.art === 'boop'">
            <div class="boss">
              <span class="boss-name">{{ BOSS_NAME }}</span>
              <div class="hp">
                <span
                  class="hp-fuellung"
                  :style="{ width: `${leben}%`, background: lebenFarbe }"
                />
                <span class="hp-segmente" />
              </div>
            </div>
            <h2 class="compact" v-html="p.title" />
            <button class="snoot" :class="{ weg: boops >= BOOPS_NOETIG }" @click.stop="boop($event)">
              <img :src="p.img" alt="" draggable="false">
              <span v-if="!boops" class="nose">🐽</span>
              <span
                v-for="k in knaller"
                :key="k.id"
                class="comic"
                :style="{
                  left: `${k.left}%`,
                  top: `${k.top}%`,
                  '--rot': `${k.rot}deg`,
                  '--farbe': k.farbe
                }"
              >
                <svg class="stern" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polygon
                    :fill="k.farbe"
                    points="50,0 61,20 80,9 76,31 98,35 82,50 98,65 76,69 80,91 61,80 50,100 39,80 20,91 24,69 2,65 18,50 2,35 24,31 20,9 39,20"
                  />
                </svg>
                <b>{{ k.wort }}</b>
              </span>
            </button>
            <p class="script hinweis">{{ boopReaktion || '' }}</p>
            <p v-if="!boops" class="script anleitung" v-html="p.text" />
          </template>

          <!-- Aua: Leckerli geben -->
          <template v-else-if="p.art === 'aua'">
            <h2 class="compact" v-html="p.title" />
            <div class="aua-bild" :class="{ geheilt: leckerliGegeben }">
              <img :src="p.img" alt="" draggable="false">
              <span v-if="leckerliGegeben" class="heil-herz">💕</span>
            </div>
            <p v-if="!leckerliGegeben" class="script anleitung">Zieh ihm das Leckerli hin. 🦴</p>
            <p v-else class="script anleitung">Schon viel besser. 🥰</p>

            <span
              v-if="!leckerliGegeben"
              class="futter"
              :class="{ unsichtbar: futter.zieht }"
              @pointerdown.stop="futterStart"
            >🦴</span>
          </template>

          <!-- Die Truhe geht auf -->
          <template v-else-if="p.art === 'schatz'">
            <h2 class="compact" v-html="p.title" />
            <button class="truhe" @click.stop="finish">
              <span class="strahlen" />
              <img src="/treasure-open.webp" alt="" draggable="false">
            </button>
            <p class="script anleitung" v-html="p.text" />
          </template>

          <!-- normale Seite -->
          <template v-else>
            <img v-if="p.img" class="pup" :src="p.img" alt="" draggable="false">
            <h2 v-html="p.title" />
            <p v-if="p.text" class="script" v-html="p.text" />
          </template>

          <!-- nur auf der ersten Seite: zeigen, wie es weitergeht -->
          <span v-if="i === 0 && page === 0" class="wisch">
            <span class="finger">👆</span>
            <span class="script">wischen ♡</span>
          </span>

          <!-- umgeknicktes Eck: weiterblättern -->
          <button
            v-if="i < pages.length - 1 && p.art !== 'boop' && p.art !== 'aua'"
            class="eselsohr"
            title="Weiterblättern"
            @click.stop="next"
          >
            <span class="knick" />
          </button>
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

    <!-- Die Karte ist ein 3D-Kontext; darin waere "fixed" relativ zur Karte.
         Deshalb haengt das gezogene Leckerli am <body>. -->
    <Teleport to="body">
      <span
        v-if="futter.zieht"
        class="futter-zeiger"
        :class="{ treffer: futter.drueber }"
        :style="{ left: `${futter.x}px`, top: `${futter.y}px` }"
      >🦴</span>
    </Teleport>

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
  touch-action: pan-y;
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
  gap: 4px; padding: 20px 18px 22px; text-align: center;
  transform-origin: left center;
  backface-visibility: hidden;
  transition: transform .85s cubic-bezier(.35, .75, .25, 1);
  overflow: hidden;
}
.page.turned { transform: rotateY(-172deg); }

.pup { width: 40%; max-width: 120px; object-fit: contain; }
.page h2 {
  margin: 8px 0 0;
  font-family: 'Baloo 2', sans-serif;
  font-size: clamp(18px, 5.2vw, 23px); line-height: 1.15;
  color: var(--pink-600);
}
h2.compact { font-size: clamp(17px, 4.8vw, 21px); }
.page .script { margin: 6px 0 0; font-size: 16px; line-height: 1.3; color: var(--pink-400); }
.anleitung { font-size: 17px !important; }
.hinweis { min-height: 22px; font-size: 18px !important; color: var(--pink-500) !important; }

/* ---------- umgeknicktes Eck ---------- */
.eselsohr {
  position: absolute; right: 0; bottom: 0;
  width: 62px; height: 62px;
  border: 0; padding: 0; background: none;
  cursor: pointer;
  border-bottom-right-radius: 22px;
  overflow: hidden;
  touch-action: manipulation;
}
.knick {
  position: absolute; right: 0; bottom: 0;
  width: 0; height: 0;
  border-style: solid;
  border-width: 0 0 54px 54px;
  border-color: transparent transparent #ffd9ec transparent;
  filter: drop-shadow(-3px -3px 5px rgba(214, 51, 132, .22));
  transition: border-width .25s ease;
}
.eselsohr:hover .knick, .eselsohr:active .knick { border-width: 0 0 66px 66px; }

/* ---------- Fun Facts ---------- */
.facts {
  list-style: none; margin: 12px 0 0; padding: 0 2px;
  display: flex; flex-direction: column; gap: 9px; text-align: left;
}
.facts li {
  display: flex; align-items: flex-start; gap: 9px;
  font-size: 13px; line-height: 1.35;
  color: var(--ink-soft); font-weight: 600;
}
.facts :deep(b) { color: var(--pink-600); font-weight: 800; }
.fact-icon { font-size: 16px; line-height: 1.1; flex: none; }

/* ---------- Boop ---------- */
.snoot {
  position: relative;
  border: 0; padding: 0; margin: 8px 0 0;
  background: none; cursor: pointer;
  width: 82%; max-width: 210px;
  touch-action: manipulation;
  transition: transform .5s cubic-bezier(.34, 1.5, .5, 1), opacity .5s;
}
.snoot img { width: 100%; display: block; object-fit: contain; }
.snoot:active { transform: scale(.94) rotate(-2deg); }
.snoot.weg { transform: translate(120%, 12%) rotate(14deg); opacity: 0; }

/* Bossleiste über dem Hund */
.boss { width: 100%; margin: 2px 0 6px; }
.boss-name {
  display: block;
  font-family: 'Baloo 2', sans-serif;
  font-size: 11px; font-weight: 800;
  letter-spacing: .09em; text-transform: uppercase;
  color: var(--plum);
  margin-bottom: 4px;
}
.hp {
  position: relative;
  height: 13px; width: 100%;
  border-radius: 4px;
  background: #6b2547;
  border: 2px solid #4a1026;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, .45);
  overflow: hidden;
}
.hp-fuellung {
  position: absolute; inset: 0 auto 0 0;
  border-radius: 2px;
  background-image: linear-gradient(180deg, rgba(255,255,255,.4), transparent 55%);
  transition: width .28s cubic-bezier(.3, .9, .4, 1), background-color .28s linear;
}
/* die typischen Kerben einer Spielleiste */
.hp-segmente {
  position: absolute; inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 9.6%,
    rgba(0, 0, 0, .28) 9.6%, rgba(0, 0, 0, .28) 10%
  );
  pointer-events: none;
}


.nose {
  position: absolute; left: 50%; top: 24%;
  transform: translate(-50%, -50%);
  font-size: 20px; opacity: 0;
  animation: nose-hint 1.6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes nose-hint {
  0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(.8); }
  50%      { opacity: .9; transform: translate(-50%, -62%) scale(1.15); }
}
/* Comic-Knaller beim Anstupsen */
.comic {
  position: absolute; z-index: 5;
  pointer-events: none;
  display: grid; place-items: center;
  width: 84px; height: 84px;
  animation: knall .7s cubic-bezier(.3, 1.5, .5, 1) forwards;
}
.comic .stern {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
.comic b {
  position: relative;
  font-family: 'Baloo 2', sans-serif;
  font-weight: 800; font-size: 14px; letter-spacing: .3px;
  color: #4a1026;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .55);
}
@keyframes knall {
  0%   { opacity: 0; transform: rotate(var(--rot)) scale(.2); }
  35%  { opacity: 1; transform: rotate(var(--rot)) scale(1.18); }
  60%  { opacity: 1; transform: rotate(var(--rot)) scale(1); }
  100% { opacity: 0; transform: rotate(var(--rot)) scale(1.05) translateY(-10px); }
}

/* ---------- Aua ---------- */
.aua-bild { position: relative; width: 58%; max-width: 165px; margin-top: 8px; }
.aua-bild img { width: 100%; display: block; object-fit: contain; transition: transform .5s ease; }
.aua-bild.geheilt img { transform: scale(1.06) rotate(-2deg); }
.heil-herz {
  position: absolute; top: -6px; right: 2px; font-size: 30px;
  animation: heil .9s ease-out;
}
@keyframes heil {
  from { opacity: 0; transform: scale(.4); }
  60%  { opacity: 1; transform: scale(1.25); }
  to   { opacity: 1; transform: scale(1); }
}
/* das Leckerli zum Ziehen */
.futter {
  margin-top: 10px;
  font-size: 34px; line-height: 1;
  cursor: grab; touch-action: none;
  user-select: none; -webkit-user-select: none;
  filter: drop-shadow(0 5px 8px rgba(122, 18, 70, .3));
  animation: futter-wackel 1.8s ease-in-out infinite;
  z-index: 8;
}
.futter.unsichtbar { opacity: .18; }
@keyframes futter-wackel {
  0%, 100% { transform: rotate(-7deg); }
  50%      { transform: rotate(7deg) translateY(-3px); }
}
/* der Hund freut sich schon, wenn das Leckerli drüber schwebt */
.aua-bild { transition: transform .2s ease; }

/* ---------- Schatztruhe ---------- */
.truhe {
  position: relative;
  border: 0; background: none; padding: 0; cursor: pointer;
  touch-action: manipulation;
  width: 88%; max-width: 215px;
  margin: 8px 0 0;
  display: grid; place-items: center;
  animation: truhe-auf .7s cubic-bezier(.3, 1.4, .5, 1) backwards;
}
@keyframes truhe-auf {
  from { opacity: 0; transform: scale(.72) translateY(14px); }
}
.truhe img { width: 100%; display: block; object-fit: contain; position: relative; z-index: 1; }
.strahlen {
  position: absolute; left: 50%; top: 52%;
  width: 260px; height: 260px; margin: -130px 0 0 -130px;
  background: radial-gradient(circle, rgba(255, 215, 110, .85) 0%, rgba(255, 215, 110, .28) 40%, transparent 68%);
  animation: leuchten 2.6s ease-in-out infinite;
}
@keyframes leuchten { 50% { transform: scale(1.12); opacity: .75; } }

.start { margin-top: 14px; }

/* ---------- Deckel der Karte ---------- */
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
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 16px 14px;
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
  width: 74%; max-width: 230px; object-fit: contain;
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

/* Wisch-Hinweis */
.wisch {
  position: absolute; left: 0; right: 0; bottom: 16px;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  pointer-events: none;
}
.wisch .script { font-size: 15px; color: var(--pink-400); }
.finger {
  font-size: 19px;
  animation: wisch-weg 1.9s ease-in-out infinite;
}
@keyframes wisch-weg {
  0%, 100% { transform: translateX(9px); opacity: .35; }
  40%      { transform: translateX(-9px); opacity: 1; }
}

.skip {
  position: absolute; bottom: 26px;
  border: 0; background: none; cursor: pointer;
  font: inherit; font-weight: 700; font-size: 14px;
  color: var(--pink-500); opacity: .75;
}
.skip:hover { opacity: 1; text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  .card, .hint, .confetti, .futter, .strahlen, .truhe, .finger { animation: none; }
  .cover, .page, .snoot { transition-duration: .01ms; }
}
</style>
