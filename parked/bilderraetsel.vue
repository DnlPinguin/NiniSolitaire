<script setup lang="ts">
import type { CellState, Difficulty } from '~/composables/useNonogram'

useHead({ title: 'Bilderrätsel · Ninis Spieleecke' })

const { play, muted, toggleMute } = useSounds()
const {
  difficulty, puzzle, grid, solved, revealed, timeLabel, hintsLeft,
  size, rowClues, colClues, rowDone, colDone, filledCount, targetCount,
  newPuzzle, reset, setCell, useHint
} = useNonogram({ onEvent: play })

const LEVELS: { value: Difficulty; label: string }[] = [
  { value: 5, label: 'Leicht' },
  { value: 10, label: 'Mittel' },
  { value: 15, label: 'Kniffl' }
]

/** In "Malen" mode taps fill cells; in "Markieren" they place a ✕. */
const markMode = ref(false)

onMounted(() => newPuzzle(10))

/* ---------- drag painting ---------- */
let paintValue: CellState | null = null

function cellAt(e: PointerEvent): [number, number] | null {
  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  const cell = el?.closest('[data-y]') as HTMLElement | null
  if (!cell) return null
  return [Number(cell.dataset.y), Number(cell.dataset.x)]
}

function onCellDown(e: PointerEvent, y: number, x: number) {
  e.preventDefault()
  const current = grid.value[y]![x]
  // Right-click always marks, whatever the mode is.
  const want: CellState = (e.button === 2 || markMode.value) ? 2 : 1
  paintValue = current === want ? 0 : want // tapping again erases
  setCell(y, x, paintValue)
  window.addEventListener('pointermove', onPaintMove)
  window.addEventListener('pointerup', onPaintUp)
}

function onPaintMove(e: PointerEvent) {
  if (paintValue === null) return
  const at = cellAt(e)
  if (at) setCell(at[0], at[1], paintValue)
}

function onPaintUp() {
  paintValue = null
  window.removeEventListener('pointermove', onPaintMove)
  window.removeEventListener('pointerup', onPaintUp)
}

onBeforeUnmount(onPaintUp)

const maxRowClue = computed(() => Math.max(...rowClues.value.map(c => c.length)))
const maxColClue = computed(() => Math.max(...colClues.value.map(c => c.length)))
</script>

<template>
  <main class="container" :class="`size-${size}`">
    <header class="topbar">
      <NuxtLink to="/" class="back">← Zurück</NuxtLink>
      <div class="title">
        <h1>Bilderrätsel <span>🐾</span></h1>
        <p class="script">Male die Felder aus –<br>und finde den Hund. ♡</p>
      </div>
      <div class="stat-group">
        <div class="stat"><span>Felder</span><b>{{ filledCount }}/{{ targetCount }}</b></div>
        <div class="stat"><span>Zeit</span><b>{{ timeLabel }}</b></div>
        <button class="sound" :title="muted ? 'Ton an' : 'Ton aus'" @click="toggleMute">
          {{ muted ? '🔇' : '🔊' }}
        </button>
      </div>
    </header>

    <div class="levels">
      <button
        v-for="lvl in LEVELS"
        :key="lvl.value"
        class="level"
        :class="{ on: difficulty === lvl.value }"
        @click="newPuzzle(lvl.value)"
      >
        {{ lvl.label }} <em>{{ lvl.value }}×{{ lvl.value }}</em>
      </button>
    </div>

    <section class="puzzle-wrap">
      <div class="puzzle" @contextmenu.prevent>
        <!-- corner + column clues -->
        <div class="corner" :style="{ '--rc': maxRowClue, '--cc': maxColClue }">
          <span class="corner-pup">🐾</span>
        </div>
        <div class="col-clues">
          <div
            v-for="(clue, x) in colClues"
            :key="`c${x}`"
            class="clue col"
            :class="{ done: colDone[x], band: Math.floor(x / 5) % 2 === 1 }"
          >
            <span v-for="(n, ni) in clue" :key="ni">{{ n }}</span>
          </div>
        </div>

        <!-- row clues -->
        <div class="row-clues">
          <div
            v-for="(clue, y) in rowClues"
            :key="`r${y}`"
            class="clue row"
            :class="{ done: rowDone[y], band: Math.floor(y / 5) % 2 === 1 }"
          >
            <span v-for="(n, ni) in clue" :key="ni">{{ n }}</span>
          </div>
        </div>

        <!-- the grid, with the photo revealed underneath -->
        <div class="board" :class="{ solved }">
          <img class="reveal" :src="puzzle.img" alt="">
          <div
            v-for="(row, y) in grid"
            :key="`row${y}`"
            class="grid-row"
          >
            <button
              v-for="(cell, x) in row"
              :key="`${y}-${x}`"
              class="cell"
              :class="[
                cell === 1 ? 'fill' : cell === 2 ? 'mark' : '',
                { edgeX: x % 5 === 0 && x > 0, edgeY: y % 5 === 0 && y > 0 }
              ]"
              :data-y="y"
              :data-x="x"
              @pointerdown="onCellDown($event, y, x)"
            >
              <span v-if="cell === 2">✕</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <div class="mode-row">
      <button class="mode" :class="{ on: !markMode }" @click="markMode = false">🩷 Malen</button>
      <button class="mode" :class="{ on: markMode }" @click="markMode = true">✕ Markieren</button>
      <span class="script tip">Rechtsklick markiert auch ♡</span>
    </div>

    <nav class="actions">
      <button class="action" @click="reset">
        <span class="a-ico">↺</span><span>Neu malen</span>
      </button>
      <button class="action" :disabled="hintsLeft === 0 || solved" @click="useHint">
        <span class="a-ico">💡<em v-if="hintsLeft > 0" class="badge">{{ hintsLeft }}</em></span>
        <span>Tipp</span>
      </button>
      <button class="action" @click="newPuzzle(difficulty)">
        <span class="a-ico">🐶</span><span>Neuer Hund</span>
      </button>
      <NuxtLink to="/" class="action">
        <span class="a-ico">🎮</span><span>Spiele</span>
      </NuxtLink>
    </nav>

    <Transition name="pop">
      <div v-if="solved" class="win" @click.self="solved = false">
        <div class="win-card">
          <img class="win-pup" :src="puzzle.img" alt="">
          <h2>Gelöst! 🎉</h2>
          <p>In {{ timeLabel }} – da ist er ja! 🐾</p>
          <div class="win-buttons">
            <button class="btn btn-primary" @click="newPuzzle(difficulty)">Nächster Hund</button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.container { max-width: 900px; padding: 14px 16px 30px; --cell: 34px; --clue: 15px; }
.size-15 { --cell: 27px; --clue: 13px; }
.size-5 { --cell: 46px; --clue: 17px; }

/* ---------- header (shared look with Solitaire) ---------- */
.topbar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: start; gap: 10px; margin-bottom: 14px; }
.back {
  justify-self: start; background: rgba(255,255,255,.8); color: var(--pink-500);
  font-weight: 800; font-size: 15px; padding: 12px 22px; border-radius: 999px; box-shadow: var(--shadow);
}
.back:hover { background: #fff; }
.title { text-align: center; }
.title h1 { margin: 0; font-size: clamp(24px, 4.6vw, 38px); color: var(--pink-600); }
.title .script { margin: 2px 0 0; font-size: 17px; line-height: 1.25; color: var(--pink-400); }
.stat-group { justify-self: end; display: flex; gap: 10px; }
.stat { min-width: 74px; text-align: center; background: rgba(255,255,255,.8); border-radius: 18px; padding: 8px 12px; box-shadow: var(--shadow); }
.stat span { display: block; font-size: 12px; font-weight: 700; color: var(--pink-400); }
.stat b { font-family: 'Baloo 2', sans-serif; font-size: 18px; color: var(--pink-600); }
.sound { width: 44px; border: 0; cursor: pointer; font-size: 19px; background: rgba(255,255,255,.8); border-radius: 18px; box-shadow: var(--shadow); }

/* ---------- difficulty ---------- */
.levels { display: flex; justify-content: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.level {
  border: 0; cursor: pointer; font: inherit; font-weight: 800; font-size: 14px;
  color: var(--pink-500); background: rgba(255,255,255,.66);
  padding: 9px 18px; border-radius: 999px; box-shadow: var(--shadow);
  transition: .15s;
}
.level em { font-style: normal; opacity: .6; font-size: 12px; }
.level:hover { background: #fff; }
.level.on { background: linear-gradient(180deg, var(--pink-400), var(--pink-500)); color: #fff; }
.level.on em { opacity: .85; }

/* ---------- puzzle ---------- */
.puzzle-wrap { display: flex; justify-content: center; overflow-x: auto; padding-bottom: 4px; }
.puzzle {
  display: grid;
  grid-template-columns: auto auto;
  gap: 6px;
  background: rgba(255,255,255,.55);
  padding: 14px;
  border-radius: 24px;
  box-shadow: var(--shadow);
}
.corner { display: grid; place-items: center; }
.corner-pup { font-size: 26px; opacity: .5; }

.col-clues { display: flex; gap: 2px; }
.clue.col {
  width: var(--cell); min-height: 62px;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  gap: 1px; padding-bottom: 4px; border-radius: 8px 8px 0 0;
}
.row-clues { display: flex; flex-direction: column; gap: 2px; }
.clue.row {
  height: var(--cell); min-width: 62px;
  display: flex; align-items: center; justify-content: flex-end;
  gap: 5px; padding-right: 6px; border-radius: 8px 0 0 8px;
}
.clue { font-weight: 800; font-size: var(--clue); color: var(--plum); transition: .2s; }
.clue.band { background: rgba(246,51,140,.055); }
.clue.done { color: var(--pink-200); }

.board { position: relative; display: flex; flex-direction: column; gap: 2px; border-radius: 10px; overflow: hidden; }
.reveal {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: contain; opacity: 0; transition: opacity .8s ease;
  pointer-events: none;
}
.board.solved .reveal { opacity: 1; }
.board.solved .cell { background: transparent !important; box-shadow: none; }
.board.solved .cell span { opacity: 0; }

.grid-row { display: flex; gap: 2px; }
.cell {
  width: var(--cell); height: var(--cell);
  border: 0; padding: 0; cursor: pointer;
  background: #fff;
  border-radius: 7px;
  touch-action: none;
  color: var(--pink-300, #ffb3d8);
  font-size: calc(var(--cell) * .45); font-weight: 800;
  display: grid; place-items: center;
  transition: background .12s, transform .12s;
}
.cell:hover { background: #ffeaf5; }
.cell.fill { background: linear-gradient(160deg, #ff7ab8, var(--pink-500)); }
.cell.mark { background: rgba(255,255,255,.45); color: var(--pink-400); }
.cell.edgeX { margin-left: 4px; }
.grid-row:nth-child(5n + 1) .cell { margin-top: 0; }

/* ---------- mode + actions ---------- */
.mode-row { display: flex; justify-content: center; align-items: center; gap: 10px; margin: 16px 0 10px; flex-wrap: wrap; }
.mode {
  border: 0; cursor: pointer; font: inherit; font-weight: 800; font-size: 14px;
  padding: 10px 20px; border-radius: 999px;
  background: rgba(255,255,255,.7); color: var(--pink-500); box-shadow: var(--shadow);
}
.mode.on { background: var(--pink-500); color: #fff; }
.tip { font-size: 16px; color: var(--pink-400); }

.actions {
  position: sticky; bottom: 14px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
  padding: 12px 8px; margin-top: 6px;
  background: rgba(255,235,245,.94); backdrop-filter: blur(12px);
  border-radius: 26px; box-shadow: var(--shadow);
}
.action {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  background: none; border: 0; font: inherit; cursor: pointer;
  font-size: 13px; font-weight: 800; color: var(--pink-500); padding: 4px 2px;
}
.action:hover:not(:disabled) { transform: translateY(-2px); }
.action:disabled { opacity: .38; cursor: default; }
.a-ico { position: relative; font-size: 24px; line-height: 1; }
.badge {
  position: absolute; top: -7px; right: -12px;
  background: var(--pink-500); color: #fff; font-size: 11px; font-style: normal; font-weight: 800;
  min-width: 19px; height: 19px; padding: 0 5px; border-radius: 999px;
  display: grid; place-items: center; border: 2px solid #ffeaf4;
}

/* ---------- win ---------- */
.win { position: fixed; inset: 0; z-index: 70; background: rgba(122,18,70,.55); backdrop-filter: blur(5px); display: grid; place-items: center; padding: 20px; }
.win-card { background: var(--card-solid); color: var(--plum); padding: 30px 40px; border-radius: var(--radius); text-align: center; box-shadow: var(--shadow); }
.win-pup { width: 170px; height: 170px; object-fit: contain; }
.win-card h2 { margin: 4px 0; }
.win-card p { margin: 0 0 18px; color: var(--ink-soft); font-weight: 700; }
.pop-enter-active, .pop-leave-active { transition: opacity .3s; }
.pop-enter-from, .pop-leave-to { opacity: 0; }

@media (max-width: 720px) {
  .container { --cell: 26px; --clue: 12px; }
  .size-15 { --cell: 19px; --clue: 10px; }
  .size-5 { --cell: 40px; }
  .topbar { grid-template-columns: auto 1fr; row-gap: 10px; }
  .title { grid-column: 1 / -1; order: 3; }
  .stat-group { order: 2; }
  .stat { min-width: 62px; padding: 6px 9px; }
  .stat b { font-size: 15px; }
  .sound { width: 34px; font-size: 15px; }
  .clue.col { min-height: 46px; }
  .clue.row { min-width: 46px; }
  .puzzle { padding: 10px; }
}
</style>
