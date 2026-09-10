import puzzleData from '~/assets/data/nonograms.json'

export type CellState = 0 | 1 | 2 // empty | filled | marked-blank
export type Difficulty = 5 | 10 | 15
export interface Puzzle { id: string; img: string; g5: string[]; g10: string[]; g15: string[] }

const PUZZLES = puzzleData as Puzzle[]

const sameClue = (a: number[], b: number[]) =>
  a.length === b.length && a.every((n, i) => n === b[i])

/** Run lengths of filled cells in a line, e.g. "0110111" -> [2, 3]. */
function clueFor(line: string[]): number[] {
  const runs: number[] = []
  let run = 0
  for (const c of line) {
    if (c === '1') run++
    else if (run) { runs.push(run); run = 0 }
  }
  if (run) runs.push(run)
  return runs.length ? runs : [0]
}

export function useNonogram(options: { onEvent?: (n: SoundName) => void } = {}) {
  const emit = (n: SoundName) => options.onEvent?.(n)

  const difficulty = ref<Difficulty>(10)
  const puzzle = ref<Puzzle>(PUZZLES[0]!)
  const grid = ref<CellState[][]>([])
  const solved = ref(false)
  const seconds = ref(0)
  const hintsLeft = ref(3)
  const revealed = ref(false)

  let timer: ReturnType<typeof setInterval> | null = null

  const size = computed(() => difficulty.value)
  const solution = computed<string[]>(() => {
    const key = `g${difficulty.value}` as 'g5' | 'g10' | 'g15'
    return puzzle.value[key]
  })

  const rowClues = computed(() =>
    solution.value.map(row => clueFor(row.split('')))
  )
  const colClues = computed(() =>
    Array.from({ length: size.value }, (_, x) =>
      clueFor(solution.value.map(row => row[x]!))
    )
  )

  /** A player's line, as clue numbers. */
  const playerRowClue = (y: number) =>
    clueFor((grid.value[y] ?? []).map(c => (c === 1 ? '1' : '0')))
  const playerColClue = (x: number) =>
    clueFor(grid.value.map(row => (row[x] === 1 ? '1' : '0')))

  /**
   * A line is done when its runs match the clue — not when it matches the
   * stored picture, since a nonogram can have more than one valid solution.
   */
  const rowDone = computed(() =>
    rowClues.value.map((clue, y) => sameClue(clue, playerRowClue(y)))
  )
  const colDone = computed(() =>
    colClues.value.map((clue, x) => sameClue(clue, playerColClue(x)))
  )

  const filledCount = computed(() =>
    grid.value.reduce((n, row) => n + row.filter(c => c === 1).length, 0)
  )
  const targetCount = computed(() =>
    solution.value.reduce((n, row) => n + row.split('').filter(c => c === '1').length, 0)
  )

  function stopTimer() { if (timer) { clearInterval(timer); timer = null } }
  function startTimer() {
    stopTimer()
    timer = setInterval(() => { if (!solved.value) seconds.value++ }, 1000)
  }

  function blankGrid() {
    return Array.from({ length: size.value }, () =>
      Array.from({ length: size.value }, () => 0 as CellState))
  }

  function newPuzzle(level: Difficulty = difficulty.value, keepPicture = false) {
    difficulty.value = level
    if (!keepPicture) {
      puzzle.value = PUZZLES[Math.floor(Math.random() * PUZZLES.length)]!
    }
    grid.value = blankGrid()
    solved.value = false
    revealed.value = false
    seconds.value = 0
    hintsLeft.value = 3
    startTimer()
  }

  function reset() {
    grid.value = blankGrid()
    solved.value = false
    emit('undo')
  }

  function checkSolved() {
    if (solved.value) return
    const done = rowDone.value.every(Boolean) && colDone.value.every(Boolean)
    if (done) {
      solved.value = true
      revealed.value = true
      stopTimer()
      emit('win')
    }
  }

  /** Paint one cell; `value` is the state to apply (or 0 to erase). */
  function setCell(y: number, x: number, value: CellState) {
    if (solved.value) return
    const row = grid.value[y]
    if (!row || row[x] === undefined || row[x] === value) return
    const wasRowDone = rowDone.value[y]
    const wasColDone = colDone.value[x]
    row[x] = value
    emit(value === 1 ? 'place' : 'flip')
    // A little chime whenever a line falls into place.
    if ((!wasRowDone && rowDone.value[y]) || (!wasColDone && colDone.value[x])) emit('foundation')
    checkSolved()
  }

  /** Fills one correct cell the player hasn't found yet. */
  function useHint() {
    if (hintsLeft.value <= 0 || solved.value) return false
    const candidates: [number, number][] = []
    solution.value.forEach((row, y) => {
      row.split('').forEach((c, x) => {
        if (c === '1' && grid.value[y]![x] !== 1) candidates.push([y, x])
      })
    })
    if (!candidates.length) return false
    const [y, x] = candidates[Math.floor(Math.random() * candidates.length)]!
    hintsLeft.value--
    emit('hint')
    grid.value[y]![x] = 1
    checkSolved()
    return true
  }

  const timeLabel = computed(() => {
    const m = Math.floor(seconds.value / 60).toString().padStart(2, '0')
    const s = (seconds.value % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  })

  onUnmounted(stopTimer)

  return {
    difficulty, puzzle, grid, solved, revealed, seconds, timeLabel, hintsLeft,
    size, rowClues, colClues, rowDone, colDone, filledCount, targetCount,
    newPuzzle, reset, setCell, useHint
  }
}
