import { createSpinRound } from '../game/slotEngine.js'

const STORAGE_KEY = 'merion-slot-server-state-v1'
const MAX_HISTORY = 25
const MAX_AUDIT = 120

const DEFAULT_LIMITS = {
  sessionSpinLimit: 300,
  lossLimit: 12_500,
  realityCheckMinutes: 15,
  cooldownMinutes: 1,
  selfExclusionHours: 24,
}

const memoryStorage = (() => {
  let store = new Map()
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
  }
})()

function getStorage() {
  return globalThis.localStorage ?? memoryStorage
}

function secureRandom() {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint32Array(1)
    globalThis.crypto.getRandomValues(bytes)
    return bytes[0] / 4294967296
  }
  return Math.random()
}

function now() {
  return Date.now()
}

function makeAuditEvent(type, payload = {}) {
  return {
    id: `audit-${now()}-${Math.floor(secureRandom() * 1_000_000)}`,
    type,
    at: now(),
    payload,
  }
}

function createDefaultState() {
  const ts = now()
  return {
    version: 1,
    wallet: {
      balance: 4000,
      currency: 'USD',
      transactions: [],
    },
    freeSpins: {
      remaining: 0,
      totalAwarded: 0,
      totalPlayed: 0,
      winMultiplier: 2,
    },
    preferences: {
      turbo: false,
    },
    session: {
      startedAt: ts,
      totalCashBet: 0,
      totalEquivalentBet: 0,
      totalWin: 0,
      netLoss: 0,
      spinsPlayed: 0,
      limits: { ...DEFAULT_LIMITS },
      cooldownUntil: 0,
      selfExcludedUntil: 0,
      nextRealityCheckAt: ts + DEFAULT_LIMITS.realityCheckMinutes * 60_000,
      realityCheckRequired: false,
    },
    currentRound: null,
    lastRound: null,
    roundHistory: [],
    auditTrail: [makeAuditEvent('SERVER_INITIALIZED', { balance: 4000 })],
  }
}

function readState() {
  const raw = getStorage().getItem(STORAGE_KEY)
  if (!raw) {
    const initial = createDefaultState()
    writeState(initial)
    return initial
  }

  try {
    return JSON.parse(raw)
  } catch {
    const initial = createDefaultState()
    writeState(initial)
    return initial
  }
}

function writeState(state) {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(state))
}

function capList(list, max) {
  if (list.length <= max) return list
  return list.slice(list.length - max)
}

function normalizeLocks(state) {
  const ts = now()
  if (state.session.cooldownUntil && state.session.cooldownUntil <= ts) {
    state.session.cooldownUntil = 0
  }
  if (state.session.selfExcludedUntil && state.session.selfExcludedUntil <= ts) {
    state.session.selfExcludedUntil = 0
  }
  if (!state.session.realityCheckRequired && state.session.nextRealityCheckAt <= ts) {
    state.session.realityCheckRequired = true
  }
}

function summarizeResponsibleState(session) {
  return {
    limits: { ...session.limits },
    startedAt: session.startedAt,
    spinsPlayed: session.spinsPlayed,
    totalCashBet: session.totalCashBet,
    totalEquivalentBet: session.totalEquivalentBet,
    totalWin: session.totalWin,
    netLoss: session.netLoss,
    cooldownUntil: session.cooldownUntil,
    selfExcludedUntil: session.selfExcludedUntil,
    nextRealityCheckAt: session.nextRealityCheckAt,
    realityCheckRequired: session.realityCheckRequired,
  }
}

function createWalletTransaction(type, amount, meta = {}) {
  return {
    id: `txn-${now()}-${Math.floor(secureRandom() * 1_000_000)}`,
    type,
    amount,
    at: now(),
    meta,
  }
}

function buildSnapshot(state) {
  normalizeLocks(state)
  return {
    wallet: {
      balance: state.wallet.balance,
      currency: state.wallet.currency,
    },
    freeSpins: { ...state.freeSpins },
    preferences: { ...state.preferences },
    session: summarizeResponsibleState(state.session),
    currentRound: state.currentRound,
    lastRound: state.lastRound,
    roundHistory: [...state.roundHistory],
    auditTrail: [...state.auditTrail],
  }
}

function persistAndSnapshot(state) {
  normalizeLocks(state)
  writeState(state)
  return buildSnapshot(state)
}

function getAuthorisationError(state, bet) {
  normalizeLocks(state)
  const ts = now()

  if (state.session.selfExcludedUntil > ts) return 'SELF_EXCLUDED'
  if (state.session.cooldownUntil > ts) return 'COOLDOWN_ACTIVE'
  if (state.session.realityCheckRequired) return 'REALITY_CHECK_REQUIRED'
  if (state.session.spinsPlayed >= state.session.limits.sessionSpinLimit) return 'SESSION_LIMIT_REACHED'
  if (state.session.netLoss >= state.session.limits.lossLimit) return 'LOSS_LIMIT_REACHED'
  if (state.currentRound?.status === 'authorized') return 'ROUND_IN_PROGRESS'
  if (state.freeSpins.remaining <= 0 && state.wallet.balance < bet) return 'INSUFFICIENT_BALANCE'
  return null
}

export async function getServerState() {
  const state = readState()
  return persistAndSnapshot(state)
}

export async function setTurboPreference(enabled) {
  const state = readState()
  state.preferences.turbo = Boolean(enabled)
  state.auditTrail.push(makeAuditEvent('TURBO_CHANGED', { enabled: state.preferences.turbo }))
  state.auditTrail = capList(state.auditTrail, MAX_AUDIT)
  return persistAndSnapshot(state)
}

export async function startCooldown(minutes = DEFAULT_LIMITS.cooldownMinutes) {
  const state = readState()
  state.session.cooldownUntil = now() + minutes * 60_000
  state.auditTrail.push(makeAuditEvent('COOLDOWN_STARTED', { minutes }))
  state.auditTrail = capList(state.auditTrail, MAX_AUDIT)
  return persistAndSnapshot(state)
}

export async function setSelfExclusion(hours = DEFAULT_LIMITS.selfExclusionHours) {
  const state = readState()
  state.session.selfExcludedUntil = now() + hours * 60 * 60_000
  state.auditTrail.push(makeAuditEvent('SELF_EXCLUSION_SET', { hours }))
  state.auditTrail = capList(state.auditTrail, MAX_AUDIT)
  return persistAndSnapshot(state)
}

export async function cancelCooldown() {
  const state = readState()
  state.session.cooldownUntil = 0
  state.auditTrail.push(makeAuditEvent('COOLDOWN_CANCELLED'))
  state.auditTrail = capList(state.auditTrail, MAX_AUDIT)
  return persistAndSnapshot(state)
}

export async function cancelSelfExclusion() {
  const state = readState()
  state.session.selfExcludedUntil = 0
  state.auditTrail.push(makeAuditEvent('SELF_EXCLUSION_CANCELLED'))
  state.auditTrail = capList(state.auditTrail, MAX_AUDIT)
  return persistAndSnapshot(state)
}

export async function acknowledgeRealityCheck() {
  const state = readState()
  state.session.realityCheckRequired = false
  state.session.nextRealityCheckAt = now() + state.session.limits.realityCheckMinutes * 60_000
  state.auditTrail.push(makeAuditEvent('REALITY_CHECK_ACKNOWLEDGED'))
  state.auditTrail = capList(state.auditTrail, MAX_AUDIT)
  return persistAndSnapshot(state)
}

export async function authorizeSpin({ bet } = {}) {
  const state = readState()
  const error = getAuthorisationError(state, bet)
  if (error) {
    return { ok: false, error, snapshot: persistAndSnapshot(state) }
  }

  const isFreeSpin = state.freeSpins.remaining > 0
  const round = createSpinRound({
    balance: state.wallet.balance,
    bet,
    rng: secureRandom,
    isFreeSpin,
    winMultiplier: isFreeSpin ? state.freeSpins.winMultiplier : 1,
  })

  if (!round.ok) {
    return { ok: false, error: round.error, snapshot: persistAndSnapshot(state) }
  }

  if (isFreeSpin) {
    state.freeSpins.remaining = Math.max(0, state.freeSpins.remaining - 1)
    state.freeSpins.totalPlayed += 1
  } else {
    state.wallet.balance = round.balanceAfterDebit
    state.wallet.transactions.push(createWalletTransaction('DEBIT_BET', round.spinCost, { roundId: round.id }))
  }

  state.session.spinsPlayed += 1
  state.session.totalCashBet += round.spinCost
  state.session.totalEquivalentBet += round.bet
  state.currentRound = {
    ...round,
    status: 'authorized',
    authorizedAt: now(),
  }

  state.auditTrail.push(makeAuditEvent('ROUND_AUTHORIZED', {
    roundId: round.id,
    bet: round.bet,
    spinCost: round.spinCost,
    isFreeSpin,
    balanceBefore: round.balanceBefore,
    balanceAfterDebit: state.wallet.balance,
  }))
  state.auditTrail = capList(state.auditTrail, MAX_AUDIT)

  return {
    ok: true,
    round: state.currentRound,
    snapshot: persistAndSnapshot(state),
  }
}

export async function settleRound(roundId) {
  const state = readState()
  const round = state.currentRound

  if (!round || round.id !== roundId) {
    return { ok: false, error: 'ROUND_NOT_FOUND', snapshot: persistAndSnapshot(state) }
  }

  if (round.status === 'settled') {
    return { ok: true, round, snapshot: persistAndSnapshot(state) }
  }

  if (round.totalWin > 0) {
    state.wallet.balance += round.totalWin
    state.wallet.transactions.push(createWalletTransaction('CREDIT_WIN', round.totalWin, { roundId: round.id }))
  }

  if (round.bonusTriggered && round.awardedFreeSpins > 0) {
    state.freeSpins.remaining += round.awardedFreeSpins
    state.freeSpins.totalAwarded += round.awardedFreeSpins
  }

  state.session.totalWin += round.totalWin
  state.session.netLoss = Math.max(0, state.session.totalCashBet - state.session.totalWin)

  const settledRound = {
    ...round,
    status: 'settled',
    settledAt: now(),
    balanceAfterPayout: state.wallet.balance,
    freeSpinsRemaining: state.freeSpins.remaining,
  }

  state.lastRound = settledRound
  state.roundHistory.push(settledRound)
  state.roundHistory = capList(state.roundHistory, MAX_HISTORY)
  state.currentRound = null

  state.auditTrail.push(makeAuditEvent('ROUND_SETTLED', {
    roundId: round.id,
    totalWin: round.totalWin,
    balanceAfterPayout: state.wallet.balance,
    bonusTriggered: round.bonusTriggered,
    awardedFreeSpins: round.awardedFreeSpins,
  }))
  if (round.bonusTriggered) {
    state.auditTrail.push(makeAuditEvent('BONUS_TRIGGERED', {
      roundId: round.id,
      freeSpinsAwarded: round.awardedFreeSpins,
    }))
  }
  state.auditTrail = capList(state.auditTrail, MAX_AUDIT)

  return {
    ok: true,
    round: settledRound,
    snapshot: persistAndSnapshot(state),
  }
}

export async function recoverCurrentRound() {
  const state = readState()
  return {
    ok: Boolean(state.currentRound),
    round: state.currentRound,
    snapshot: persistAndSnapshot(state),
  }
}

export async function getRoundHistory() {
  const state = readState()
  return [...state.roundHistory]
}

export async function getAuditTrail() {
  const state = readState()
  return [...state.auditTrail]
}
