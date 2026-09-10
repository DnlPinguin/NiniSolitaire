<script setup lang="ts">
import { RANK_LABELS, isRed, pupSrcFor, type Card, type Source, type Suit } from '~/composables/useSolitaire'

useHead({ title: 'Solitaire · Ninis Spieleecke' })

const { play, muted, toggleMute } = useSounds()

const {
  stock, waste, foundations, tableau, moves, timeLabel, won,
  hintsLeft, canUndo, drawCount, lastDrawn, setDrawCount, shareCode, loadCode,
  newGame, drawFromStock, select, clickEmpty, sendToFoundation, isSelected,
  tryMove, undo, useHint, isHinted, pileFor
} = useSolitaire({ onEvent: play })

/* ---------------- shuffle + deal ---------------- */
// A face-down stand-in so the riffle is visible before any cards exist.
const shuffleCard: Card = { id: 'shuffle', suit: '♠', rank: 1, faceUp: false }

const shuffling = ref(false)   // riffle flourish on the stock
const collecting = ref(false)  // board cards are flying home to the deck
const dealing = ref(false)     // cards flying out to the columns
const dealKey = ref(0)         // remounts the cards so the animation replays
const boardRef = ref<HTMLElement | null>(null)

let dealTimers: ReturnType<typeof setTimeout>[] = []
let runId = 0                  // cancels an in-flight sequence if restarted

const wait = (ms: number) => new Promise<void>(resolve => {
  dealTimers.push(setTimeout(resolve, ms))
})

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** The order a card is dealt in, matching how Klondike is dealt: row by row. */
function dealOrder(col: number, row: number) {
  let n = 0
  for (let r = 0; r < row; r++) n += 7 - r
  return n + (col - row)
}
const DEAL_STEP = 42     // ms between dealt cards
const COLLECT_STEP = 10  // ms between collected cards
const COLLECT_DUR = 300  // ms a card takes to reach the deck

/**
 * Sweeps every card on the table back onto the deck. Clones the real card
 * nodes into a fixed layer so the flight is pixel-accurate for any pile,
 * whatever the layout — the board itself just hides underneath.
 */
function collectToDeck(): Promise<void> {
  const board = boardRef.value
  const stockEl = board?.querySelector('.stock') as HTMLElement | null
  if (!board || !stockEl || reducedMotion()) return Promise.resolve()

  const cards = Array.from(board.querySelectorAll('.card'))
    .filter(el => !el.closest('.stock')) as HTMLElement[]
  if (!cards.length) return Promise.resolve()

  const target = stockEl.getBoundingClientRect()
  const layer = document.createElement('div')
  layer.className = 'collect-layer'
  // Card sizing lives on the page container, so carry it over to the clones.
  const cs = getComputedStyle(board)
  for (const prop of ['--card-w', '--card-h', '--gap', '--stack', '--fan']) {
    layer.style.setProperty(prop, cs.getPropertyValue(prop))
  }
  document.body.appendChild(layer)

  // Last cards dealt come home first — it reads like tidying up.
  const flights = cards.reverse().map(el => {
    const r = el.getBoundingClientRect()
    const clone = el.cloneNode(true) as HTMLElement
    clone.style.position = 'fixed'
    clone.style.left = `${r.left}px`
    clone.style.top = `${r.top}px`
    clone.style.width = `${r.width}px`
    clone.style.height = `${r.height}px`
    clone.style.margin = '0'
    clone.style.transition =
      `transform ${COLLECT_DUR}ms cubic-bezier(.45,.05,.35,1), opacity ${COLLECT_DUR}ms ease-in`
    layer.appendChild(clone)
    return { clone, r }
  })

  requestAnimationFrame(() => {
    flights.forEach(({ clone, r }, i) => {
      const spin = (Math.random() * 14 - 7).toFixed(1)
      clone.style.transitionDelay = `${i * COLLECT_STEP}ms`
      clone.style.transform =
        `translate(${target.left - r.left}px, ${target.top - r.top}px) rotate(${spin}deg) scale(.94)`
      clone.style.opacity = '0.9'
    })
  })

  return wait(COLLECT_DUR + flights.length * COLLECT_STEP + 40)
    .then(() => { layer.remove() })
}

async function startGame() {
  const id = ++runId
  if (route.query.g) router.replace({ query: {} })
  fromShare.value = false
  dealTimers.forEach(clearTimeout)
  dealTimers = []
  dealing.value = false

  // 1. everything on the table flies back onto the deck
  collecting.value = true
  play('recycle')
  await collectToDeck()
  if (id !== runId) return

  // 2. the deck gets shuffled — the table stays cleared until the new deal,
  //    otherwise the old layout would flash back while the deck riffles
  shuffling.value = true
  play('deal')
  await wait(reducedMotion() ? 0 : 900)
  if (id !== runId) return
  shuffling.value = false

  // 3. and dealt back out
  newGame()
  collecting.value = false
  dealKey.value++
  dealing.value = true
  await wait(28 * DEAL_STEP + 500)
  if (id !== runId) return
  dealing.value = false
}

onBeforeUnmount(() => {
  stopCascade()
  runId++
  dealTimers.forEach(clearTimeout)
  document.querySelectorAll('.collect-layer').forEach(el => el.remove())
})

function chooseDraw(n: 1 | 3) {
  if (drawCount.value === n) return
  setDrawCount(n)
  startGame()
}

const FOUNDATION_SUITS = ['♥', '♠', '♦', '♣']
const route = useRoute()
const router = useRouter()
const fromShare = ref(false)

/* ---------------- Geburtstagskarte beim ersten Besuch ---------------- */
// Cookie statt localStorage, damit der Server schon beim Rendern weiß,
// ob die Karte noch fällig ist — sonst blitzt das Spiel kurz auf.
const cardSeen = useCookie<string | null>('nini-geburtstagskarte', {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax'
})
// Geteilte Links führen direkt ins Spiel, ohne Karte.
const showCard = ref(!cardSeen.value && !route.query.g)

function begin() {
  const code = route.query.g
  if (typeof code === 'string' && code && loadCode(code)) {
    fromShare.value = true              // restored: skip the deal animation
    showToast('Geteiltes Spiel geladen 💕')
    return
  }
  if (code) showToast('Dieser Link ließ sich nicht lesen 😕')
  startGame()
}

const replayingCard = ref(false)

function replayCard() {
  replayingCard.value = true
  showCard.value = true
}

function onCardDone() {
  showCard.value = false
  if (replayingCard.value) {
    replayingCard.value = false   // nur angesehen — das laufende Spiel bleibt
    return
  }
  cardSeen.value = '1'
  begin()
}

onMounted(() => {
  if (!showCard.value) begin()
})

/** Puts the current position in a link and copies it. */
async function shareGame() {
  const url = `${location.origin}${route.path}?g=${shareCode()}`
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Ninis Spieleecke – Solitaire', url })
      return
    }
  } catch { /* dialog dismissed — fall through to copying */ }
  try {
    await navigator.clipboard.writeText(url)
    showToast('Link kopiert 💕')
  } catch {
    prompt('Link zum Teilen:', url)
  }
}

const wasteTopIndex = computed(() => waste.value.length - 1)

/** The last three waste cards, fanned; only the last is playable. */
const wasteFan = computed(() =>
  waste.value.slice(-drawCount.value).map((card, i, arr) => ({
    card,
    index: waste.value.length - arr.length + i,
    top: i === arr.length - 1
  }))
)

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2600)
}

function onHint() {
  if (!useHint()) showToast('Kein Zug möglich – zieh eine Karte 💗')
}

/* ---------------- Gewinn: Kartenkaskade ---------------- */
const showWin = ref(false)

interface Flyer { el: HTMLElement; x: number; y: number; vx: number; vy: number; w: number; h: number }
let flyers: Flyer[] = []
let winLayer: HTMLElement | null = null
let winRaf = 0
let winTimers: ReturnType<typeof setTimeout>[] = []

function stopCascade() {
  cancelAnimationFrame(winRaf)
  winRaf = 0
  winTimers.forEach(clearTimeout)
  winTimers = []
  flyers = []
  winLayer?.remove()
  winLayer = null
}

/** Baut eine Kartenkopie mit anderem Wert aus einer vorhandenen Karte. */
function cloneAs(template: HTMLElement, suit: Suit, rank: number) {
  const el = template.cloneNode(true) as HTMLElement
  const rankEl = el.querySelector('.rank')
  const suitEl = el.querySelector('.suit')
  const img = el.querySelector('img') as HTMLImageElement | null
  if (rankEl) rankEl.textContent = RANK_LABELS[rank]!
  if (suitEl) suitEl.textContent = suit
  if (img) img.src = pupSrcFor({ id: '', suit, rank, faceUp: true })
  el.classList.toggle('red', isRed(suit))
  el.style.position = 'absolute'
  el.style.margin = '0'
  el.style.willChange = 'transform'
  return el
}

function runWinCascade() {
  const container = document.querySelector('.container') as HTMLElement | null
  const slots = Array.from(document.querySelectorAll('[data-drop-type="foundation"]')) as HTMLElement[]
  if (!container || slots.length !== 4 || reducedMotion()) {
    showWin.value = true
    return
  }

  const layer = document.createElement('div')
  layer.className = 'win-cascade'
  const cs = getComputedStyle(container)
  for (const prop of ['--card-w', '--card-h']) {
    layer.style.setProperty(prop, cs.getPropertyValue(prop))
  }
  document.body.appendChild(layer)
  winLayer = layer

  // Welle für Welle: König zuerst, aus allen vier Ablagen gleichzeitig
  for (let step = 0; step < 13; step++) {
    winTimers.push(setTimeout(() => {
      slots.forEach((slot, i) => {
        const template = slot.querySelector('.card') as HTMLElement | null
        const pile = foundations.value[i]
        if (!template || !pile?.length) return
        const suit = pile[0]!.suit
        const rank = 13 - step
        const r = template.getBoundingClientRect()
        const el = cloneAs(template, suit, rank)
        el.style.width = `${r.width}px`
        el.style.height = `${r.height}px`
        el.style.left = '0'
        el.style.top = '0'
        el.style.transform = `translate(${r.left}px, ${r.top}px)`
        layer.appendChild(el)
        flyers.push({
          el, x: r.left, y: r.top,
          vx: (i < 2 ? -1 : 1) * (1.4 + Math.random() * 2.6),
          vy: -(5 + Math.random() * 5),
          w: r.width, h: r.height
        })
      })
    }, step * 190))
  }

  const GRAVITY = 0.62
  const BOUNCE = 0.74
  function frame() {
    const floor = window.innerHeight
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i]!
      f.vy += GRAVITY
      f.x += f.vx
      f.y += f.vy
      if (f.y + f.h >= floor) {
        f.y = floor - f.h
        f.vy = -f.vy * BOUNCE
        if (Math.abs(f.vy) < 3.2) f.vy = -(3.5 + Math.random() * 3) // weiterhüpfen
      }
      f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.x * 0.12}deg)`
      if (f.x < -f.w * 2.5 || f.x > window.innerWidth + f.w * 2.5) {
        f.el.remove()
        flyers.splice(i, 1)
      }
    }
    winRaf = requestAnimationFrame(frame)
  }
  winRaf = requestAnimationFrame(frame)

  // Dialog erst, wenn die Kaskade schon läuft
  winTimers.push(setTimeout(() => (showWin.value = true), 4200))
  // Notbremse, falls doch mal etwas liegen bleibt
  winTimers.push(setTimeout(stopCascade, 22000))
}

watch(won, hasWon => {
  if (hasWon) runWinCascade()
  else { stopCascade(); showWin.value = false }
})

/* ---------------- drag & drop ---------------- */
const drag = reactive({
  active: false,
  src: null as Source | null,
  cards: [] as Card[],
  x: 0, y: 0,
  offsetX: 0, offsetY: 0,
  moved: false
})

const isDragged = (type: Source['type'], index: number, cardIndex: number) =>
  drag.active && !!drag.src && drag.src.type === type && drag.src.index === index && cardIndex >= drag.src.cardIndex

function onPointerDown(e: PointerEvent, src: Source) {
  const pile = pileFor(src)
  const card = pile[src.cardIndex]
  if (!card?.faceUp) return

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  drag.src = src
  drag.cards = pile.slice(src.cardIndex)
  drag.offsetX = e.clientX - rect.left
  drag.offsetY = e.clientY - rect.top
  drag.x = e.clientX
  drag.y = e.clientY
  drag.moved = false
  drag.active = false

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!drag.src) return
  const dist = Math.hypot(e.clientX - drag.x, e.clientY - drag.y)
  if (!drag.active && dist < 6) return
  drag.active = true
  drag.moved = true
  drag.x = e.clientX
  drag.y = e.clientY
}

function onPointerUp(e: PointerEvent) {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  const src = drag.src

  if (src && drag.moved) {
    // The ghost is pointer-events:none, so this hits the pile underneath.
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const zone = el?.closest('[data-drop-type]') as HTMLElement | null
    if (zone) {
      const type = zone.dataset.dropType as 'foundation' | 'tableau'
      if (!tryMove(src, type, Number(zone.dataset.dropIndex))) play('invalid')
    } else {
      play('invalid')
    }
  } else if (src) {
    select(src) // a plain click, not a drag
  }

  drag.active = false
  drag.src = null
  drag.cards = []
  drag.moved = false
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <main class="container">
    <header class="topbar">
      <!-- Kein Hub mehr — statt "Zurück" steht hier der Schriftzug.
           Zum Reaktivieren des Hubs:
           <NuxtLink to="/hub" class="back">← Zurück</NuxtLink> -->
      <span class="brandmark">Ninis <b>Spieleecke</b> 💖</span>
      <div class="stat-group">
        <div class="stat seg">
          <span>Ziehen</span>
          <div class="seg-btns">
            <button :class="{ on: drawCount === 1 }" @click="chooseDraw(1)">1</button>
            <button :class="{ on: drawCount === 3 }" @click="chooseDraw(3)">3</button>
          </div>
        </div>
        <div class="stat"><span>Züge</span><b>{{ moves }}</b></div>
        <div class="stat"><span>Zeit</span><b>{{ timeLabel }}</b></div>
        <button class="sound" :title="muted ? 'Ton an' : 'Ton aus'" @click="toggleMute">
          {{ muted ? '🔇' : '🔊' }}
        </button>
        <button class="sound card-again" title="Geburtstagskarte nochmal ansehen" @click="replayCard">
          💌
        </button>
      </div>
    </header>

    <section ref="boardRef" class="board" :class="{ collecting }">
      <div class="top-row">
        <div class="slot stock" :class="{ shuffling }">
          <template v-if="shuffling">
            <!-- the deck splits into two packets and riffles back together -->
            <PlayingCard :card="shuffleCard" class="deck-base" />
            <span class="half left" />
            <span class="half right" />
            <span v-for="f in 4" :key="`f${f}`" class="flick" :style="{ '--f': f }" />
          </template>
          <PlayingCard
            v-else-if="stock.length"
            :card="stock[stock.length - 1]!"
            @click="drawFromStock"
          />
          <div v-else class="empty recycle" @click="drawFromStock">↻</div>
        </div>

        <div class="slot waste-slot">
          <template v-if="waste.length">
            <div
              v-for="(entry, wi) in wasteFan"
              :key="entry.card.id"
              class="fanned"
              :style="{ left: `calc(var(--fan) * ${wi})`, zIndex: wi + 1 }"
            >
              <PlayingCard
                :key="entry.card.id"
                class="drawn"
                :style="{ '--d': wasteFan.length - 1 - wi }"
                :card="entry.card"
                :selected="entry.top && isSelected('waste', 0, wasteTopIndex)"
                :hinted="entry.top && isHinted('waste', 0, wasteTopIndex)"
                :dragging="entry.top && isDragged('waste', 0, wasteTopIndex)"
                :class="{ idle: !entry.top }"
                @pointerdown="entry.top && onPointerDown($event, { type: 'waste', index: 0, cardIndex: wasteTopIndex })"
                @dblclick="entry.top && sendToFoundation({ type: 'waste', index: 0, cardIndex: wasteTopIndex })"
              />
            </div>
          </template>
          <div v-else class="empty draw-hint" @click="drawFromStock">
            <span>Karte<br>ziehen</span>
            <i>←</i>
          </div>
        </div>

        <div class="spacer" />

        <div
          v-for="(pile, i) in foundations"
          :key="`f${i}`"
          class="slot"
          data-drop-type="foundation"
          :data-drop-index="i"
          @click="pile.length ? select({ type: 'foundation', index: i, cardIndex: pile.length - 1 }) : clickEmpty('foundation', i)"
        >
          <PlayingCard v-if="pile.length" :card="pile[pile.length - 1]!" :hinted="isHinted('foundation', i, pile.length - 1)" />
          <div v-else class="empty foundation" :class="{ glow: isHinted('foundation', i) }">
            <span class="fsuit" :class="{ red: i === 0 || i === 2 }">{{ FOUNDATION_SUITS[i] }}</span>
          </div>
        </div>
      </div>

      <div class="tableau">
        <div
          v-for="(col, i) in tableau"
          :key="`t${i}`"
          class="column"
          data-drop-type="tableau"
          :data-drop-index="i"
          @click="!col.length && clickEmpty('tableau', i)"
        >
          <div v-if="!col.length" class="empty tall" :class="{ glow: isHinted('tableau', i) }" />
          <div
            v-for="(card, ci) in col"
            :key="`${dealKey}-${card.id}`"
            class="stacked"
            :class="{ dealt: dealing }"
            :style="{
              top: `calc(var(--stack) * ${ci})`,
              zIndex: ci + 1,
              '--col': i,
              '--row': ci,
              '--delay': `${dealOrder(i, ci) * 42}ms`
            }"
          >
            <PlayingCard
              :card="card"
              :selected="isSelected('tableau', i, ci)"
              :hinted="isHinted('tableau', i, ci)"
              :dragging="isDragged('tableau', i, ci)"
              @pointerdown="onPointerDown($event, { type: 'tableau', index: i, cardIndex: ci })"
              @dblclick.stop="sendToFoundation({ type: 'tableau', index: i, cardIndex: ci })"
            />
          </div>
        </div>
      </div>

      <!-- Deko (Spruch, Pfote, "Du schaffst das!") entfernt (2026-09-10):
      <div class="decor">
        <span class="d-heart">♡</span>
        <p class="script quote">Kleine Spiele,<br>große Glücksmomente. ♡</p>
        <span class="paw-mark">🐾</span>
        <p class="script cheer">Du schaffst das! ♡</p>
      </div>
      -->
    </section>

    <!-- drag ghost -->
    <div
      v-if="drag.active"
      class="ghost"
      :style="{ left: `${drag.x - drag.offsetX}px`, top: `${drag.y - drag.offsetY}px` }"
    >
      <div
        v-for="(card, gi) in drag.cards"
        :key="card.id"
        class="ghost-card"
        :style="{ top: `calc(var(--stack) * ${gi})` }"
      >
        <PlayingCard :card="card" />
      </div>
    </div>

    <nav class="actions">
      <button class="action" :disabled="!canUndo" @click="undo">
        <span class="a-ico">↺</span><span>Rückgängig</span>
      </button>
      <!-- Tipp-Button entfernt (2026-09-10). Logik liegt weiter im Composable,
           zum Reaktivieren einfach wieder einkommentieren und .actions auf
           repeat(4, 1fr) zurücksetzen:
      <button class="action" :disabled="hintsLeft === 0" @click="onHint">
        <span class="a-ico">
          💡<em v-if="hintsLeft > 0" class="badge">{{ hintsLeft }}</em>
        </span>
        <span>Tipp</span>
      </button>
      -->
      <button class="action" @click="startGame">
        <span class="a-ico">🃏</span><span>Neues Spiel</span>
      </button>
      <button class="action" @click="shareGame">
        <span class="a-ico">💌</span><span>Teilen</span>
      </button>
    </nav>

    <BirthdayCard v-if="showCard" @done="onCardDone" />

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>

    <Transition name="pop">
      <div v-if="showWin" class="win" @click.self="showWin = false">
        <div class="win-card">
          <span class="sparkles">✨</span>
          <img class="win-pup" src="/pups/pup-11.webp" alt="">
          <h2>Gewonnen! 🎉</h2>
          <p>{{ moves }} Züge in {{ timeLabel }}</p>
          <div class="win-actions">
            <button class="btn btn-primary" @click="startGame">Nochmal spielen</button>
            <button class="btn btn-ghost" @click="showWin = false">Zuschauen</button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.container {
  /* Seven columns always fit the window, so nothing ever needs clipping.
     Everything else scales off the card width. */
  --gap: 12px;
  --card-w: min(92px, calc((100vw - 36px - var(--gap) * 6) / 7));
  --card-h: calc(var(--card-w) * 1.39);
  --stack: calc(var(--card-w) * 0.33);
  --fan: calc(var(--card-w) * 0.24);
  max-width: 900px;
  padding: 12px 16px 108px;
}

/* ---------- header ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 8px 10px;
  margin-bottom: 12px;
}
.back {
  justify-self: start;
  background: rgba(255,255,255,.8);
  color: var(--pink-500);
  font-weight: 800; font-size: 15px;
  padding: 12px 22px; border-radius: 999px;
  box-shadow: var(--shadow);
}
.back:hover { background: #fff; }
.brandmark {
  align-self: center;
  font-family: 'Baloo 2', sans-serif; font-weight: 600;
  font-size: 15px; color: var(--pink-400); white-space: nowrap;
}
.brandmark b { color: var(--pink-500); font-weight: 800; }
.stat-group { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; align-items: stretch; }
.stat {
  min-width: 60px; text-align: center;
  background: rgba(255,255,255,.8);
  border-radius: 14px; padding: 5px 9px;
  box-shadow: var(--shadow);
  display: flex; flex-direction: column; justify-content: center; gap: 1px;
}
.stat span { display: block; font-size: 10px; font-weight: 800; letter-spacing: .04em; color: var(--pink-400); }
.stat b { font-family: 'Baloo 2', sans-serif; font-size: 17px; line-height: 1.1; color: var(--pink-600); }
.sound {
  width: 38px; border: 0; cursor: pointer; font-size: 17px;
  background: rgba(255,255,255,.8);
  border-radius: 14px; box-shadow: var(--shadow);
  transition: transform .14s;
}
.sound:hover { transform: translateY(-2px); }
.card-again { font-size: 16px; }

/* ---------- board ---------- */
.board { position: relative; overflow: visible; }
.top-row { display: flex; gap: var(--gap); margin-bottom: 22px; }
.spacer { flex: 1; min-width: 10px; }
.slot { width: var(--card-w); height: var(--card-h); flex: none; position: relative; }
.waste-slot { width: calc(var(--card-w) + var(--fan) * 2); }
.fanned { position: absolute; top: 0; }
.fanned :deep(.card.idle) { cursor: default; }
.empty {
  width: 100%; height: 100%;
  border: 2px dashed rgba(255,255,255,.95);
  border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px;
  color: var(--pink-400); font-weight: 700;
  cursor: pointer;
}
.empty.foundation { background: rgba(255,255,255,.22); }
.fsuit { font-size: calc(var(--card-w) * .38); color: #c98aa9; }
.fsuit.red { color: var(--pink-400); }
.recycle { font-size: 30px; }
.draw-hint { font-size: 13px; text-align: center; line-height: 1.25; }
.draw-hint i { font-style: normal; font-size: 22px; }
.empty.glow { border-color: var(--pink-500); background: rgba(246,51,140,.14); animation: glow 1s ease-in-out infinite; }
@keyframes glow { 50% { box-shadow: 0 0 0 5px rgba(246,51,140,.25); } }

.tableau { display: flex; gap: var(--gap); }
.column { width: var(--card-w); position: relative; min-height: calc(var(--card-h) + var(--stack) * 8); }
.empty.tall { position: absolute; inset: 0 0 auto 0; height: var(--card-h); }
.stacked { position: absolute; left: 0; }

/* ---------- collecting cards back onto the deck ---------- */
.board.collecting :deep(.card) { visibility: hidden; }
.board.collecting .stock :deep(.card) { visibility: visible; }
.board.collecting .empty { opacity: .55; transition: opacity .2s; }

/* ---------- shuffle flourish: a riffle ---------- */
.stock.shuffling { perspective: 700px; }

/* the two packets the deck is split into */
.half {
  position: absolute; inset: 0;
  border-radius: 12px;
  border: 2px solid #fff;
  background:
    radial-gradient(circle at 22% 26%, rgba(255,255,255,.22) 0 12%, transparent 13%),
    radial-gradient(circle at 78% 72%, rgba(255,255,255,.22) 0 12%, transparent 13%),
    linear-gradient(160deg, #ff7ab8, var(--pink-500));
  box-shadow: 0 8px 16px rgba(214,51,132,.28);
  transform-origin: 50% 90%;
  animation: riffle-left 450ms cubic-bezier(.36,.05,.32,1) 2;
}
.half.right { animation-name: riffle-right; }

@keyframes riffle-left {
  0%   { transform: none; }
  30%  { transform: translate(-15%, -14%) rotate(-11deg) rotateY(16deg); }
  52%  { transform: translate(-9%, -5%) rotate(-5deg) rotateY(8deg); }
  74%  { transform: translate(-2%, 2%) rotate(-1deg); }
  88%  { transform: translate(0, -1%) rotate(0deg) scale(1.015); }
  100% { transform: none; }
}
@keyframes riffle-right {
  0%   { transform: none; }
  30%  { transform: translate(15%, -14%) rotate(11deg) rotateY(-16deg); }
  52%  { transform: translate(9%, -5%) rotate(5deg) rotateY(-8deg); }
  74%  { transform: translate(2%, 2%) rotate(1deg); }
  88%  { transform: translate(0, -1%) rotate(0deg) scale(1.015); }
  100% { transform: none; }
}

/* thin card edges flicking past each other as the packets mesh */
.flick {
  position: absolute; left: 8%; right: 8%; top: 0;
  height: 100%;
  border-radius: 10px;
  border-top: 3px solid rgba(255,255,255,.9);
  opacity: 0;
  animation: flick 450ms ease-out 2;
  animation-delay: calc(var(--f) * 26ms);
}
@keyframes flick {
  0%, 44%  { opacity: 0; transform: translateY(0) scaleX(.9); }
  58%      { opacity: .95; transform: translateY(-14%) scaleX(1); }
  100%     { opacity: 0; transform: translateY(4%) scaleX(.96); }
}

/* the deck itself settles as the packets land on it */
.stock.shuffling :deep(.deck-base) { animation: deck-settle 450ms ease-in-out 2; }
@keyframes deck-settle {
  0%, 40% { transform: none; }
  62%     { transform: scaleY(.965) translateY(2%); }
  80%     { transform: scaleY(1.02) translateY(-1%); }
  100%    { transform: none; }
}

/* ---------- dealing cards out to the columns ---------- */
.stacked.dealt {
  animation: deal-in .42s cubic-bezier(.22, .9, .3, 1) backwards;
  animation-delay: var(--delay);
}
@keyframes deal-in {
  from {
    /* start on top of the stock pile, then fly to the column */
    transform:
      translate(
        calc(-1 * var(--col) * (var(--card-w) + var(--gap))),
        calc(-1 * (var(--card-h) + 22px + var(--row) * var(--stack)))
      )
      rotate(-12deg) scale(.92);
    opacity: .85;
  }
  to { transform: none; opacity: 1; }
}

/* ---------- a drawn card is pulled off the deck ---------- */
.fanned { transition: left .24s cubic-bezier(.3,.8,.4,1); }
:deep(.card.drawn) {
  animation: draw-in .3s cubic-bezier(.25,.9,.35,1) backwards;
  animation-delay: calc(var(--d) * 90ms);
}
@keyframes draw-in {
  from {
    transform:
      translateX(calc(-1 * (var(--card-w) + var(--gap) + var(--fan) * var(--d))))
      rotateY(72deg) scale(.96);
    opacity: .5;
  }
  to { transform: none; opacity: 1; }
}

/* ---------- draw-mode switch (inline in the header) ---------- */
.stat.seg { min-width: 0; padding: 5px 7px; }
.seg-btns { display: flex; gap: 3px; }
.seg-btns button {
  border: 0; cursor: pointer; font: inherit; font-weight: 800; font-size: 13px;
  width: 24px; height: 21px; padding: 0; border-radius: 8px;
  background: rgba(246,51,140,.1); color: var(--pink-500);
  transition: .14s;
}
.seg-btns button:hover { background: rgba(246,51,140,.2); }
.seg-btns button.on {
  background: linear-gradient(180deg, var(--pink-400), var(--pink-500));
  color: #fff;
}

/* ---------- old full-width switch (unused) ---------- */
.mode-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 0 16px; }
.mode-label { font-weight: 800; font-size: 13px; color: var(--ink-soft); }
.mode {
  border: 0; cursor: pointer; font: inherit; font-weight: 800; font-size: 13px;
  padding: 8px 16px; border-radius: 999px;
  background: rgba(255,255,255,.72); color: var(--pink-500); box-shadow: var(--shadow);
  transition: .15s;
}
.mode:hover { background: #fff; }
.mode.on { background: linear-gradient(180deg, var(--pink-400), var(--pink-500)); color: #fff; }

@media (prefers-reduced-motion: reduce) {
  .stacked.dealt, :deep(.card.drawn), .stock.shuffling .half,
  .stock.shuffling .flick, .stock.shuffling :deep(.card) { animation: none; }
}

/* ---------- drag ghost ---------- */
.ghost { position: fixed; z-index: 60; pointer-events: none; width: var(--card-w); }
.ghost-card { position: absolute; left: 0; filter: drop-shadow(0 12px 20px rgba(214,51,132,.4)); }
.ghost-card :deep(.card) { transform: rotate(-3deg) scale(1.04); }

/* ---------- decorations ---------- */
.decor { position: relative; height: 120px; pointer-events: none; text-align: center; }
.d-heart { display: block; font-size: 34px; color: var(--pink-400); margin-top: 26px; }
.quote { font-size: 24px; color: var(--pink-400); margin: 6px 0 0; line-height: 1.35; }
.paw-mark {
  position: absolute; left: 0; bottom: -4px;
  font-size: 120px; opacity: .16; filter: grayscale(1) sepia(1) hue-rotate(285deg) saturate(4);
}
.cheer {
  position: absolute; right: 8px; bottom: 4px;
  font-size: 22px; color: var(--pink-400);
  transform: rotate(-8deg); line-height: 1.2; margin: 0;
}

/* ---------- action bar ---------- */
.actions {
  /* fest am unteren Bildschirmrand, nicht im Textfluss */
  position: fixed; z-index: 40;
  left: 50%; transform: translateX(-50%);
  bottom: 14px;
  width: min(868px, calc(100vw - 32px));
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 10px;
  padding: 12px 8px;
  background: rgba(255, 235, 245, .94);
  backdrop-filter: blur(12px);
  border-radius: 26px;
  box-shadow: var(--shadow);
}
.action {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  background: none; border: 0; font: inherit; cursor: pointer;
  font-size: 13px; font-weight: 800; color: var(--pink-500);
  padding: 4px 2px;
  transition: transform .14s, opacity .14s;
}
.action:hover:not(:disabled) { transform: translateY(-2px); }
.action:disabled { opacity: .38; cursor: default; }
.a-ico { position: relative; font-size: 24px; line-height: 1; }
.badge {
  position: absolute; top: -7px; right: -12px;
  background: var(--pink-500); color: #fff;
  font-size: 11px; font-style: normal; font-weight: 800;
  min-width: 19px; height: 19px; padding: 0 5px;
  border-radius: 999px; display: grid; place-items: center;
  border: 2px solid #ffeaf4;
}

/* ---------- toast ---------- */
.toast {
  position: fixed; left: 50%; bottom: 108px; transform: translateX(-50%);
  z-index: 65;
  background: rgba(122,18,70,.92); color: #fff;
  padding: 12px 22px; border-radius: 999px;
  font-weight: 700; font-size: 14px; white-space: nowrap;
  box-shadow: 0 10px 24px rgba(122,18,70,.35);
}
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 10px); }
.toast-enter-active, .toast-leave-active { transition: opacity .25s, transform .25s; }

/* ---------- Gewinn-Kaskade ---------- */
:global(.win-cascade) {
  position: fixed; inset: 0;
  z-index: 50;
  pointer-events: none;
  overflow: hidden;
}

/* ---------- win ---------- */
.win { position: fixed; inset: 0; z-index: 70; background: rgba(122,18,70,.55); backdrop-filter: blur(5px); display: grid; place-items: center; }
.win-card {
  background: var(--card-solid); color: var(--plum);
  padding: 34px 46px; border-radius: var(--radius);
  text-align: center; box-shadow: var(--shadow);
}
.win-pup { width: 120px; height: 120px; object-fit: contain; }
.win-card h2 { margin: 6px 0 4px; font-size: 30px; }
.sparkles {
  display: block; font-size: 26px;
  animation: twinkle 1.6s ease-in-out infinite;
}
@keyframes twinkle { 50% { opacity: .35; transform: scale(.85); } }
.win-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.pop-enter-active, .pop-leave-active { transition: opacity .35s ease, transform .35s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(.92); }
.win-card p { margin: 0 0 18px; color: var(--ink-soft); font-weight: 700; }

@media (max-width: 720px) {
  .container { --gap: 8px; }
    .paw-mark { font-size: 80px; }
}

/* Seven columns must fit the screen width without sideways scrolling. */
@media (max-width: 560px) {
  .container {
    --gap: 5px;
    --stack: calc(var(--card-w) * 0.42);
    padding-inline: 14px;
  }
  .back { padding: 10px 16px; font-size: 14px; }
  .stat { min-width: 62px; padding: 6px 9px; }
  .stat b { font-size: 17px; }
  .brandmark { font-size: 14px; }
  .sound { width: 34px; font-size: 15px; }
      .draw-hint { font-size: 10px; }
  .draw-hint i { font-size: 16px; }
  .decor { height: 100px; }
  .quote { font-size: 18px; }
  .cheer { font-size: 16px; }
  .action { font-size: 11px; }
  .a-ico { font-size: 20px; }
}
</style>
