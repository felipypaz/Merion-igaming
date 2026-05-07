import { GRID_COLS, GRID_ROWS, SYMBOLS } from '../constants.js'

const MIN_MATCH = 3
const REEL_WINDOW = GRID_ROWS + 3
const AUTO_STOP_MULTIPLIER = 5
const PAYOUT_SCALE = 1.85
const BONUS_SYMBOL = 'Bank'
const BONUS_TRIGGER_COUNT = 4
const BONUS_DISTINCT_REELS_REQUIRED = 4
const BONUS_FREE_SPINS_AWARD = 8
const FREE_SPIN_WIN_MULTIPLIER = 2

const PAYLINES = [
  [0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3, 3],
  [4, 4, 4, 4, 4, 4],
  [0, 1, 2, 1, 0, 1],
  [4, 3, 2, 3, 4, 3],
  [1, 2, 3, 2, 1, 2],
  [3, 2, 1, 2, 3, 2],
  [0, 0, 1, 2, 1, 0],
  [4, 4, 3, 2, 3, 4],
  [2, 1, 0, 1, 2, 3],
  [2, 3, 4, 3, 2, 1],
  [1, 0, 1, 2, 3, 4],
  [3, 4, 3, 2, 1, 0],
  [0, 1, 1, 1, 1, 0],
  [4, 3, 3, 3, 3, 4],
  [2, 2, 1, 1, 2, 2],
  [2, 2, 3, 3, 2, 2],
  [1, 2, 2, 2, 2, 1],
]

const PAYTABLE = {
  Bank:      { 3: 4.0, 4: 9.0, 5: 18.0, 6: 36.0 },
  Safe:      { 3: 3.5, 4: 8.0, 5: 16.0, 6: 30.0 },
  Dynamit:   { 3: 3.0, 4: 7.0, 5: 14.0, 6: 26.0 },
  Handcuffs: { 3: 2.6, 4: 6.0, 5: 12.0, 6: 22.0 },
  Cell:      { 3: 2.2, 4: 5.2, 5: 10.5, 6: 19.0 },
  A:         { 3: 2.0, 4: 4.8, 5: 9.6, 6: 17.0 },
  K:         { 3: 1.8, 4: 4.2, 5: 8.4, 6: 15.0 },
  Q:         { 3: 1.6, 4: 3.8, 5: 7.6, 6: 13.5 },
  J:         { 3: 1.4, 4: 3.2, 5: 6.6, 6: 12.0 },
  10:        { 3: 1.2, 4: 2.8, 5: 5.8, 6: 10.5 },
}

const REEL_BLUEPRINTS = [
  { 10: 8, J: 8, Q: 7, K: 7, A: 6, Cell: 5, Handcuffs: 5, Dynamit: 4, Safe: 4, Bank: 3 },
  { 10: 8, J: 7, Q: 7, K: 6, A: 6, Cell: 6, Handcuffs: 5, Dynamit: 4, Safe: 4, Bank: 3 },
  { 10: 8, J: 8, Q: 6, K: 6, A: 6, Cell: 5, Handcuffs: 5, Dynamit: 5, Safe: 4, Bank: 3 },
  { 10: 7, J: 8, Q: 7, K: 6, A: 6, Cell: 5, Handcuffs: 5, Dynamit: 4, Safe: 4, Bank: 4 },
  { 10: 8, J: 7, Q: 7, K: 6, A: 6, Cell: 5, Handcuffs: 5, Dynamit: 4, Safe: 5, Bank: 3 },
  { 10: 8, J: 8, Q: 7, K: 6, A: 6, Cell: 5, Handcuffs: 4, Dynamit: 4, Safe: 4, Bank: 4 },
]

const SYMBOL_KEY_SET = new Set(SYMBOLS.map(symbol => symbol.key))

function toTier(totalWin, bet) {
  const mult = totalWin / bet
  if (mult >= 30) return 'super_mega'
  if (mult >= 15) return 'mega'
  if (mult >= 5) return 'big'
  return 'total'
}

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let n = Math.imul(t ^ (t >>> 15), 1 | t)
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}

function buildReelStrip(blueprint, seed) {
  const pool = []
  for (const [symbol, count] of Object.entries(blueprint)) {
    if (!SYMBOL_KEY_SET.has(symbol)) {
      throw new Error(`Unknown symbol in reel blueprint: ${symbol}`)
    }
    for (let i = 0; i < count; i++) {
      pool.push(symbol)
    }
  }

  const rng = mulberry32(seed)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }

  return pool
}

const REEL_STRIPS = REEL_BLUEPRINTS.map((blueprint, index) => buildReelStrip(blueprint, 401 + index * 37))

function buildBoard(stops) {
  const board = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null))

  for (let col = 0; col < GRID_COLS; col++) {
    const strip = REEL_STRIPS[col]
    const stop = stops[col]
    for (let row = 0; row < GRID_ROWS; row++) {
      board[row][col] = strip[(stop + row) % strip.length]
    }
  }

  return board
}

function buildReelWindows(stops) {
  return stops.map((stop, col) => {
    const strip = REEL_STRIPS[col]
    const len = strip.length
    const start = (stop - 3 + len) % len
    return Array.from({ length: REEL_WINDOW }, (_, i) => strip[(start + i) % len])
  })
}

function evaluateLine(board, lineIndex, bet, winMultiplier) {
  const pattern = PAYLINES[lineIndex]
  const symbol = board[pattern[0]][0]

  let count = 1
  for (let col = 1; col < GRID_COLS; col++) {
    if (board[pattern[col]][col] !== symbol) break
    count++
  }

  if (count < MIN_MATCH) return null

  const baseMultiplier = PAYTABLE[symbol]?.[count]
  if (!baseMultiplier) return null

  const appliedMultiplier = baseMultiplier * PAYOUT_SCALE * winMultiplier
  const amount = Math.round(bet * appliedMultiplier)
  const positions = Array.from({ length: count }, (_, col) => ({
    col,
    row: pattern[col],
  }))

  return {
    lineIndex,
    linePattern: pattern,
    symbol,
    count,
    baseMultiplier,
    appliedMultiplier,
    amount,
    positions,
  }
}

function getBonusPositions(board) {
  const positions = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (board[row][col] === BONUS_SYMBOL) {
        positions.push({ row, col })
      }
    }
  }
  return positions
}

function getBonusReelCount(bonusPositions) {
  return new Set(bonusPositions.map(pos => pos.col)).size
}

function evaluateBoard(board, bet, winMultiplier) {
  const lineWins = []

  for (let lineIndex = 0; lineIndex < PAYLINES.length; lineIndex++) {
    const win = evaluateLine(board, lineIndex, bet, winMultiplier)
    if (win) {
      lineWins.push(win)
    }
  }

  const bonusPositions = getBonusPositions(board)
  const bonusReelCount = getBonusReelCount(bonusPositions)
  const bonusTriggered = (
    bonusPositions.length >= BONUS_TRIGGER_COUNT &&
    bonusReelCount >= BONUS_DISTINCT_REELS_REQUIRED
  )
  const awardedFreeSpins = bonusTriggered ? BONUS_FREE_SPINS_AWARD : 0

  const totalWin = lineWins.reduce((sum, win) => sum + win.amount, 0)
  const positions = new Map()
  for (const win of lineWins) {
    for (const pos of win.positions) {
      positions.set(`${pos.row}:${pos.col}`, pos)
    }
  }
  for (const pos of bonusPositions) {
    positions.set(`${pos.row}:${pos.col}`, pos)
  }

  const topLineWin = lineWins.reduce((best, win) => {
    if (!best || win.amount > best.amount) return win
    return best
  }, null)

  return {
    lineWins,
    totalWin,
    winningPositions: [...positions.values()],
    bonusPositions,
    bonusReelCount,
    bonusTriggered,
    awardedFreeSpins,
    topLineWin,
    tier: totalWin > 0 ? toTier(totalWin, bet) : null,
    shouldStopAuto: totalWin >= bet * AUTO_STOP_MULTIPLIER || bonusTriggered,
  }
}

export function getPaylines() {
  return PAYLINES.map(line => [...line])
}

export function getReelStrips() {
  return REEL_STRIPS.map(strip => [...strip])
}

export function getBonusConfig() {
  return {
    symbol: BONUS_SYMBOL,
    triggerCount: BONUS_TRIGGER_COUNT,
    distinctReelsRequired: BONUS_DISTINCT_REELS_REQUIRED,
    freeSpinsAward: BONUS_FREE_SPINS_AWARD,
    freeSpinWinMultiplier: FREE_SPIN_WIN_MULTIPLIER,
  }
}

export function getPaytableModel() {
  const symbolOrder = SYMBOLS.map(symbol => symbol.key)
  return {
    paylines: getPaylines(),
    minimumMatch: MIN_MATCH,
    payoutScale: PAYOUT_SCALE,
    bonus: getBonusConfig(),
    entries: symbolOrder.map(symbol => ({
      symbol,
      payouts: PAYTABLE[symbol],
    })),
  }
}

export function createSpinRound({
  balance,
  bet,
  rng = Math.random,
  isFreeSpin = false,
  winMultiplier = 1,
} = {}) {
  if (!Number.isFinite(balance) || !Number.isFinite(bet)) {
    return { ok: false, error: 'INVALID_ROUND_INPUT' }
  }

  if (bet <= 0) {
    return { ok: false, error: 'INVALID_BET' }
  }

  const spinCost = isFreeSpin ? 0 : bet
  if (!isFreeSpin && balance < bet) {
    return { ok: false, error: 'INSUFFICIENT_BALANCE' }
  }

  const stops = REEL_STRIPS.map(strip => Math.floor(rng() * strip.length))
  const board = buildBoard(stops)
  const evaluation = evaluateBoard(board, bet, winMultiplier)

  const round = {
    ok: true,
    id: `round-${Date.now()}-${Math.floor(rng() * 1_000_000)}`,
    bet,
    spinCost,
    isFreeSpin,
    winMultiplier,
    balanceBefore: balance,
    balanceAfterDebit: balance - spinCost,
    balanceAfterPayout: balance - spinCost + evaluation.totalWin,
    stops,
    board,
    reelWindows: buildReelWindows(stops),
    lineWins: evaluation.lineWins,
    totalWin: evaluation.totalWin,
    winningPositions: evaluation.winningPositions,
    topLineWin: evaluation.topLineWin,
    bonusPositions: evaluation.bonusPositions,
    bonusReelCount: evaluation.bonusReelCount,
    bonusTriggered: evaluation.bonusTriggered,
    awardedFreeSpins: evaluation.awardedFreeSpins,
    tier: evaluation.tier,
    shouldStopAuto: evaluation.shouldStopAuto,
  }

  return round
}

export function summarizeRound(round) {
  if (!round?.ok) return 'invalid round'
  if (round.totalWin <= 0 && !round.bonusTriggered) return `dead spin, bet ${round.bet}`

  const lead = round.topLineWin
  if (!lead) {
    return `bonus triggered with ${round.awardedFreeSpins} free spins`
  }

  return `${round.totalWin} on ${round.lineWins.length} line(s), top ${lead.symbol} x${lead.count}`
}
