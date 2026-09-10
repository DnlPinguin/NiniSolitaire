import type { SoundName } from './useSounds'

export type Suit = '♠' | '♥' | '♦' | '♣'
export interface Card {
  id: string
  suit: Suit
  rank: number // 1 = Ace ... 13 = King
  faceUp: boolean
}

export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau'
export interface Source {
  type: PileType
  index: number
  cardIndex: number
}
export interface Target {
  type: 'foundation' | 'tableau'
  index: number
}
export interface Hint {
  from: Source
  to: Target
}

const SUITS: Suit[] = ['♥', '♠', '♦', '♣']
export const FOUNDATION_SUITS = SUITS
export const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export const isRed = (suit: Suit) => suit === '♥' || suit === '♦'

/** 28 puppy portraits; each card keeps the same one for the whole game. */
export const PUP_COUNT = 28
export function pupSrcFor(card: Card) {
  const n = ((card.rank - 1) * 4 + SUITS.indexOf(card.suit)) % PUP_COUNT
  return `/pups/pup-${String(n + 1).padStart(2, '0')}.webp`
}

function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: `${suit}${rank}`, suit, rank, faceUp: false })
    }
  }
  return deck
}

function shuffle(deck: Card[]) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i]!, deck[j]!] = [deck[j]!, deck[i]!]
  }
  return deck
}


/* ---------------- share codes ----------------
 * The whole position fits in a short URL: one byte per card (6 bits of card
 * identity + a face-up flag), preceded by the pile lengths. No server needed.
 */

const cardIndex = (c: Card) => SUITS.indexOf(c.suit) * 13 + (c.rank - 1)
const cardFromIndex = (i: number, faceUp: boolean): Card => {
  const suit = SUITS[Math.floor(i / 13)]!
  const rank = (i % 13) + 1
  return { id: `${suit}${rank}`, suit, rank, faceUp }
}

function bytesToCode(bytes: number[]): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function codeToBytes(code: string): number[] | null {
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
    return Array.from(bin, ch => ch.charCodeAt(0))
  } catch { return null }
}

export interface SolitaireOptions {
  onEvent?: (name: SoundName) => void
}

export function useSolitaire(options: SolitaireOptions = {}) {
  const emit = (name: SoundName) => options.onEvent?.(name)

  const stock = ref<Card[]>([])
  const waste = ref<Card[]>([])
  const foundations = ref<Card[][]>([[], [], [], []])
  const tableau = ref<Card[][]>([[], [], [], [], [], [], []])
  const moves = ref(0)
  const seconds = ref(0)
  const selection = ref<Source | null>(null)
  const hint = ref<Hint | null>(null)
  const hintsLeft = ref(3)
  /** 1 = Klondike draw-one, 3 = draw-three (the classic three-card version). */
  const drawCount = ref<1 | 3>(3)
  /** How many cards arrived on the last draw, so the view can animate them. */
  const lastDrawn = ref(0)

  const history: string[] = []
  const canUndo = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const won = computed(() => foundations.value.every(f => f.length === 13))

  function snapshot() {
    history.push(JSON.stringify({
      stock: stock.value, waste: waste.value,
      foundations: foundations.value, tableau: tableau.value,
      moves: moves.value
    }))
    if (history.length > 120) history.shift()
    canUndo.value = true
  }

  function undo() {
    const prev = history.pop()
    if (!prev) return
    const state = JSON.parse(prev)
    stock.value = state.stock
    waste.value = state.waste
    foundations.value = state.foundations
    tableau.value = state.tableau
    moves.value = state.moves
    selection.value = null
    hint.value = null
    canUndo.value = history.length > 0
    emit('undo')
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null }
  }

  function startTimer() {
    stopTimer()
    timer = setInterval(() => {
      if (!won.value) seconds.value++
      else stopTimer()
    }, 1000)
  }

  function newGame() {
    const deck = shuffle(buildDeck())
    const cols: Card[][] = [[], [], [], [], [], [], []]
    for (let col = 0; col < 7; col++) {
      for (let n = 0; n <= col; n++) {
        const card = deck.pop()!
        card.faceUp = n === col
        cols[col]!.push(card)
      }
    }
    tableau.value = cols
    stock.value = deck.map(c => ({ ...c, faceUp: false }))
    waste.value = []
    foundations.value = [[], [], [], []]
    moves.value = 0
    seconds.value = 0
    selection.value = null
    hint.value = null
    hintsLeft.value = 3
    lastDrawn.value = 0
    history.length = 0
    canUndo.value = false
    startTimer()
    // The riffle sound is played by the view, which owns the
    // collect -> shuffle -> deal sequence and its timing.
  }

  function drawFromStock() {
    snapshot()
    selection.value = null
    hint.value = null
    if (stock.value.length) {
      // In the three-card version you always turn three (or whatever is left).
      const n = Math.min(drawCount.value, stock.value.length)
      for (let i = 0; i < n; i++) {
        const card = stock.value.pop()!
        card.faceUp = true
        waste.value.push(card)
      }
      lastDrawn.value = n
      emit('draw')
    } else if (waste.value.length) {
      stock.value = waste.value.reverse().map(c => ({ ...c, faceUp: false }))
      waste.value = []
      lastDrawn.value = 0
      emit('recycle')
    }
    moves.value++
  }

  function pileFor(src: Source): Card[] {
    if (src.type === 'waste') return waste.value
    if (src.type === 'foundation') return foundations.value[src.index]!
    return tableau.value[src.index]!
  }

  function canStackTableau(card: Card, target: Card | undefined) {
    if (!target) return card.rank === 13
    return target.faceUp && isRed(target.suit) !== isRed(card.suit) && target.rank === card.rank + 1
  }

  function canStackFoundation(card: Card, pile: Card[]) {
    const top = pile[pile.length - 1]
    if (!top) return card.rank === 1
    return top.suit === card.suit && top.rank + 1 === card.rank
  }

  /** Can this stack legally land on that pile? Pure check, no mutation. */
  function canMove(src: Source, target: Target): boolean {
    const from = pileFor(src)
    const cards = from.slice(src.cardIndex)
    if (!cards.length || cards.some(c => !c.faceUp)) return false
    if (target.type === 'foundation') {
      return cards.length === 1 && canStackFoundation(cards[0]!, foundations.value[target.index]!)
    }
    if (src.type === 'tableau' && src.index === target.index) return false
    const col = tableau.value[target.index]!
    return canStackTableau(cards[0]!, col[col.length - 1])
  }

  function flipTopIfNeeded(col: Card[]): boolean {
    const top = col[col.length - 1]
    if (top && !top.faceUp) { top.faceUp = true; return true }
    return false
  }

  /** Moves the selected card (and any cards on top of it) to a target pile. */
  function tryMove(src: Source, targetType: 'foundation' | 'tableau', targetIndex: number): boolean {
    if (!canMove(src, { type: targetType, index: targetIndex })) return false
    snapshot()
    const from = pileFor(src)
    const cards = from.splice(src.cardIndex)

    if (targetType === 'foundation') {
      foundations.value[targetIndex]!.push(cards[0]!)
      emit('foundation')
    } else {
      tableau.value[targetIndex]!.push(...cards)
      emit('place')
    }

    if (src.type === 'tableau' && flipTopIfNeeded(from)) emit('flip')
    moves.value++
    selection.value = null
    hint.value = null
    return true
  }

  /** Double-click / auto shortcut: send a card to a foundation if it fits. */
  function sendToFoundation(src: Source): boolean {
    const pile = pileFor(src)
    if (src.cardIndex !== pile.length - 1) return false
    for (let i = 0; i < 4; i++) {
      if (tryMove(src, 'foundation', i)) return true
    }
    return false
  }

  function select(src: Source) {
    const pile = pileFor(src)
    const card = pile[src.cardIndex]
    if (!card || !card.faceUp) return
    const current = selection.value
    if (current && current.type === src.type && current.index === src.index && current.cardIndex === src.cardIndex) {
      selection.value = null
      return
    }
    if (current) {
      if (src.type === 'tableau' && tryMove(current, 'tableau', src.index)) return
      if (src.type === 'foundation' && tryMove(current, 'foundation', src.index)) return
    }
    selection.value = src
  }

  function clickEmpty(type: 'foundation' | 'tableau', index: number) {
    if (selection.value) tryMove(selection.value, type, index)
    else selection.value = null
  }

  function isSelected(type: PileType, index: number, cardIndex: number) {
    const s = selection.value
    return !!s && s.type === type && s.index === index && cardIndex >= s.cardIndex
  }

  /** All movable stacks: the waste top, plus every face-up run in the tableau. */
  function movableSources(): Source[] {
    const list: Source[] = []
    if (waste.value.length) list.push({ type: 'waste', index: 0, cardIndex: waste.value.length - 1 })
    tableau.value.forEach((col, i) => {
      col.forEach((card, ci) => {
        if (card.faceUp) list.push({ type: 'tableau', index: i, cardIndex: ci })
      })
    })
    return list
  }

  function findHint(): Hint | null {
    const targets: Target[] = [
      ...[0, 1, 2, 3].map(i => ({ type: 'foundation', index: i } as Target)),
      ...[0, 1, 2, 3, 4, 5, 6].map(i => ({ type: 'tableau', index: i } as Target))
    ]
    for (const from of movableSources()) {
      for (const to of targets) {
        // Skip shuffling a lone King between two empty columns.
        if (to.type === 'tableau' && from.type === 'tableau'
          && tableau.value[to.index]!.length === 0 && from.cardIndex === 0) continue
        if (canMove(from, to)) return { from, to }
      }
    }
    return null
  }

  /** Returns the hint it found, or null when no legal move exists (costs nothing). */
  function useHint(): Hint | null {
    if (hintsLeft.value <= 0) return null
    const found = findHint()
    hint.value = found
    if (found) hintsLeft.value--
    emit(found ? 'hint' : 'nohint')
    return found
  }

  function isHinted(type: PileType, index: number, cardIndex?: number) {
    const h = hint.value
    if (!h) return false
    // Empty drop slot.
    if (cardIndex === undefined) return h.to.type === type && h.to.index === index
    // Source stack.
    if (h.from.type === type && h.from.index === index && cardIndex >= h.from.cardIndex) return true
    // Top card of an occupied destination pile.
    if (h.to.type === type && h.to.index === index) {
      const pile = type === 'foundation' ? foundations.value[index]! : tableau.value[index]!
      return cardIndex === pile.length - 1
    }
    return false
  }

  const timeLabel = computed(() => {
    const m = Math.floor(seconds.value / 60).toString().padStart(2, '0')
    const s = (seconds.value % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  })

  watch(won, isWon => { if (isWon) emit('win') })

  onUnmounted(stopTimer)


  /** Encodes the current position as a short, URL-safe string. */
  function shareCode(): string {
    const piles: Card[][] = [
      stock.value, waste.value,
      ...foundations.value, ...tableau.value
    ]
    const header = [1, drawCount.value, ...piles.map(p => p.length)]
    const cards = piles.flat().map(c => cardIndex(c) | (c.faceUp ? 64 : 0))
    return bytesToCode([...header, ...cards])
  }

  /** Restores a position from a share code. Returns false if it isn't valid. */
  function loadCode(code: string): boolean {
    const bytes = codeToBytes(code)
    if (!bytes || bytes.length < 15 || bytes[0] !== 1) return false

    const draw = bytes[1] === 3 ? 3 : 1
    const lengths = bytes.slice(2, 15)
    const total = lengths.reduce((a, b) => a + b, 0)
    if (total !== 52 || bytes.length !== 15 + 52) return false

    const body = bytes.slice(15)
    const seen = new Set<number>()
    const piles: Card[][] = []
    let at = 0
    for (const len of lengths) {
      const pile: Card[] = []
      for (let i = 0; i < len; i++) {
        const b = body[at++]!
        const idx = b & 63
        if (idx > 51 || seen.has(idx)) return false   // corrupt or duplicated
        seen.add(idx)
        pile.push(cardFromIndex(idx, (b & 64) !== 0))
      }
      piles.push(pile)
    }
    if (seen.size !== 52) return false

    stock.value = piles[0]!
    waste.value = piles[1]!
    foundations.value = piles.slice(2, 6)
    tableau.value = piles.slice(6, 13)
    drawCount.value = draw as 1 | 3
    moves.value = 0
    seconds.value = 0
    selection.value = null
    hint.value = null
    hintsLeft.value = 3
    lastDrawn.value = 0
    history.length = 0
    canUndo.value = false
    startTimer()
    return true
  }

  function setDrawCount(n: 1 | 3) {
    drawCount.value = n
  }

  return {
    stock, waste, foundations, tableau, moves, seconds, timeLabel, won, selection,
    hint, hintsLeft, canUndo, drawCount, lastDrawn, setDrawCount, shareCode, loadCode,
    newGame, drawFromStock, select, clickEmpty, sendToFoundation, isSelected,
    tryMove, canMove, undo, useHint, isHinted, pileFor
  }
}
