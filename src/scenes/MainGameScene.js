import { Container, Sprite } from 'pixi.js'
import { FreeSpinsPopup, ensureFreeSpinsPopupAsset } from '../components/FreeSpinsPopup.js'
import { GameLogo } from '../components/GameLogo.js'
import { GameOverlays } from '../components/GameOverlays.js'
import { FoxCharacter } from '../components/FoxCharacter.js'
import { SlotGrid } from '../components/SlotGrid.js'
import { GameUI } from '../components/GameUI.js'
import { WinPopup, ensureWinPopupAssets } from '../components/WinPopup.js'
import {
  acknowledgeRealityCheck,
  authorizeSpin,
  cancelCooldown,
  cancelSelfExclusion,
  getServerState,
  recoverCurrentRound,
  settleRound,
  setSelfExclusion,
  setTurboPreference,
  startCooldown,
} from '../backend/gameServer.js'
import { getPaytableModel } from '../game/slotEngine.js'
import { animate, delay } from '../tween.js'
import { W, H } from '../constants.js'

const GRID_X = Math.round(429 * (1280 / 1920))
const GRID_Y = Math.round(156 * (720 / 1080))
const FOX_CX = Math.round(((1539 + 1918) / 2) * (1280 / 1920))
const FOX_BOT = Math.round(988 * (720 / 1080))
const MAX_BET = 10_000

export class MainGameScene extends Container {
  constructor() {
    super()
    this._balance = 4000
    this._bet = 100
    this._popup = null
    this._freeSpinsPopup = null
    this._autoActive = false
    this._autoRemaining = 0
    this._roundState = 'idle'
    this._serverSnapshot = null
    this._build()
  }

  _build() {
    const bg = Sprite.from('/slot-assets/PSD/MAIN%20GAME/background.png')
    bg.width = W
    bg.height = H
    this.addChild(bg)

    this._grid = new SlotGrid()
    this._grid.position.set(GRID_X, GRID_Y)
    this.addChild(this._grid)

    const gridBounds = this._grid.getLocalBounds()
    const logo = new GameLogo(
      Math.round(this._grid.x + gridBounds.x + gridBounds.width / 2),
      0,
      0.58
    )
    const logoBounds = logo.getLocalBounds()
    const logoGap = 4
    logo.y = Math.round(
      this._grid.y + gridBounds.y - logoGap - (logoBounds.y + logoBounds.height)
    )
    this.addChild(logo)

    this._fox = new FoxCharacter()
    this._fox.scale.set(0.63)
    this._fox.position.set(FOX_CX, FOX_BOT)
    this._fox.init()
    this.addChild(this._fox)

    this._ui = new GameUI()
    this._ui.onSpin = () => this._onSpin()
    this._ui.onBetUp = () => this._changeBet(50)
    this._ui.onBetDown = () => this._changeBet(-50)
    this._ui.onAutoSelect = count => this._startAuto(count)
    this._ui.onAutoStop = () => this._stopAuto()
    this.addChild(this._ui)

    this._overlays = new GameOverlays()
    this._overlays.setPaytableModel(getPaytableModel())
    this._overlays.onTurboToggle = () => this._toggleTurbo()
    this._overlays.onCooldown = () => this._startResponsibleCooldown()
    this._overlays.onSelfExclude = () => this._activateSelfExclusion()
    this._overlays.onRealityContinue = () => this._acknowledgeRealityCheck()
    this.addChild(this._overlays)
  }

  async start() {
    const snapshot = await getServerState()
    this._applySnapshot(snapshot)

    const recovered = await recoverCurrentRound()
    this._applySnapshot(recovered.snapshot)
    if (recovered.ok && recovered.round) {
      this._ui.showNotice('RODADA RECUPERADA APOS RELOAD.', 'info', 2200)
      await this._resumeRound(recovered.round)
    }
  }

  async _onSpin() {
    if (this._grid.isSpinning || this._roundState !== 'idle') return
    if (!this._canSpin()) return
    await this._runSpin()
  }

  _startAuto(count) {
    if (this._autoActive || this._roundState !== 'idle') return
    if (!this._canSpin()) return

    this._autoActive = true
    this._autoRemaining = count
    this._ui.setAutoActive(true, count)
    this._autoLoop()
  }

  _stopAuto() {
    this._autoActive = false
    this._autoRemaining = 0
    this._ui.setAutoActive(false)
  }

  async _autoLoop() {
    while (this._autoActive && this._autoRemaining > 0) {
      if (!this._hasEnoughBalance()) {
        this._showBalanceMessage()
        break
      }
      if (this._grid.isSpinning || this._roundState !== 'idle') break

      const round = await this._runSpin()
      if (!round || !this._autoActive) break

      this._autoRemaining--
      this._ui.updateAutoCount(this._autoRemaining)

      if (this._autoRemaining <= 0) break
      if (!this._hasEnoughBalance()) {
        this._showBalanceMessage()
        break
      }
    }

    this._stopAuto()
  }

  async _runSpin() {
    const response = await authorizeSpin({ bet: this._bet })
    this._applySnapshot(response.snapshot)

    if (!response.ok) {
      this._showRoundError(response.error)
      return null
    }

    return this._playAuthorizedRound(response.round)
  }

  async _resumeRound(round) {
    if (!round) return null
    return this._playAuthorizedRound(round, { recovering: true })
  }

  async _playAuthorizedRound(round, { recovering = false } = {}) {
    this._roundState = 'spinning'
    this._ui.hideNotice()
    this._ui.disableSpin()
    this._ui.setWin(0)

    if (recovering) {
      this._ui.showNotice('RECUPERANDO RODADA EM ANDAMENTO.', 'info', 1800)
    }

    this._fox.playWin()
    this._removePopup()
    this._removeFreeSpinsPopup()

    await this._grid.spin(round, { turbo: this._isTurboActive() })
    this._roundState = 'settling'

    const settled = await settleRound(round.id)
    this._applySnapshot(settled.snapshot)

    if (!settled.ok) {
      this._showRoundError(settled.error)
      this._roundState = 'idle'
      this._ui.enableSpin()
      return null
    }

    if (settled.round.totalWin > 0) {
      this._ui.setWin(settled.round.totalWin)
      await this._showWinPopup(settled.round.totalWin, settled.round.bet)
    } else if (!settled.round.bonusTriggered) {
      this._fox.playIdle()
    }

    if (settled.round.bonusTriggered) {
      await this._showFreeSpinsPopup(settled.round.awardedFreeSpins)
    }

    if (settled.round.shouldStopAuto && this._autoActive) {
      this._autoActive = false
      this._ui.showNotice('AUTO PAROU EM BIG WIN OU BONUS.', 'info', 2400)
    }

    if (this._serverSnapshot?.session?.realityCheckRequired) {
      this._stopAuto()
      this._overlays.showRealityCheck()
    }

    if (this._balance === 0 && (this._serverSnapshot?.freeSpins?.remaining ?? 0) <= 0) {
      this._showBalanceMessage()
    }

    this._roundState = 'idle'
    this._ui.enableSpin()
    return settled.round
  }

  _applySnapshot(snapshot) {
    if (!snapshot) return
    this._serverSnapshot = snapshot
    this._balance = snapshot.wallet.balance
    this._ui.setBalance(this._balance)
    this._ui.setWin(snapshot.lastRound?.totalWin ?? 0)
    this._overlays.setServerSnapshot(snapshot)
  }

  _isTurboActive() {
    return Boolean(this._serverSnapshot?.preferences?.turbo)
  }

  async _toggleTurbo() {
    const snapshot = await setTurboPreference(!this._isTurboActive())
    this._applySnapshot(snapshot)
    this._ui.showNotice(
      this._isTurboActive() ? 'TURBO SPIN ATIVADO.' : 'TURBO SPIN DESATIVADO.',
      'info',
      1500
    )
  }

  async _startResponsibleCooldown() {
    const isActive = this._serverSnapshot?.session?.cooldownUntil > Date.now()
    
    let snapshot
    if (isActive) {
      snapshot = await cancelCooldown()
      this._applySnapshot(snapshot)
      this._ui.showNotice('COOLDOWN CANCELADO.', 'info', 1800)
    } else {
      snapshot = await startCooldown()
      this._applySnapshot(snapshot)
      this._stopAuto()
      this._ui.showNotice('COOLDOWN DE 1 MINUTO ATIVADO.', 'warn', 2200)
    }
    
    this._overlays.hideModal()
  }

  async _activateSelfExclusion() {
    const isActive = this._serverSnapshot?.session?.selfExcludedUntil > Date.now()
    
    let snapshot
    if (isActive) {
      snapshot = await cancelSelfExclusion()
      this._applySnapshot(snapshot)
      this._ui.showNotice('SELF-EXCLUSION CANCELADA.', 'info', 1800)
    } else {
      snapshot = await setSelfExclusion()
      this._applySnapshot(snapshot)
      this._stopAuto()
      this._ui.showNotice('SELF-EXCLUSION DE 24H ATIVADA.', 'warn', 2600)
    }
    
    this._overlays.hideModal()
  }

  async _acknowledgeRealityCheck() {
    const snapshot = await acknowledgeRealityCheck()
    this._applySnapshot(snapshot)
    this._overlays.hideModal()
    this._ui.showNotice('REALITY CHECK CONFIRMADO.', 'info', 1600)
  }

  _changeBet(delta) {
    if (this._roundState !== 'idle') {
      this._ui.showNotice('AGUARDE O FIM DO SPIN.', 'info', 1600)
      return
    }

    if (this._autoActive) {
      this._ui.showNotice('PARE O AUTO SPIN PARA ALTERAR A BET.', 'info', 1800)
      return
    }

    this._bet = Math.max(50, Math.min(MAX_BET, this._bet + delta))
    this._ui.updateBet(this._bet)
  }

  _hasEnoughBalance() {
    const freeSpins = this._serverSnapshot?.freeSpins?.remaining ?? 0
    if (freeSpins > 0) return true
    return this._balance > 0 && this._balance >= this._bet
  }

  _canSpin() {
    if (this._serverSnapshot?.session?.realityCheckRequired) {
      this._overlays.showRealityCheck()
      return false
    }

    if (this._hasEnoughBalance()) {
      return true
    }

    this._showBalanceMessage()
    return false
  }

  _showRoundError(error) {
    if (error === 'INSUFFICIENT_BALANCE') {
      this._showBalanceMessage()
      return
    }

    if (error === 'SELF_EXCLUDED') {
      this._ui.showNotice('SELF-EXCLUSION ATIVA. JOGO BLOQUEADO.', 'warn', 2800)
      return
    }

    if (error === 'COOLDOWN_ACTIVE') {
      this._ui.showNotice('COOLDOWN ATIVO. AGUARDE PARA JOGAR.', 'warn', 2400)
      return
    }

    if (error === 'REALITY_CHECK_REQUIRED') {
      this._overlays.showRealityCheck()
      return
    }

    if (error === 'SESSION_LIMIT_REACHED') {
      this._ui.showNotice('LIMITE DE SESSAO ATINGIDO.', 'warn', 2200)
      return
    }

    if (error === 'LOSS_LIMIT_REACHED') {
      this._ui.showNotice('LOSS LIMIT ATINGIDO.', 'warn', 2200)
      return
    }

    if (error === 'ROUND_IN_PROGRESS') {
      this._ui.showNotice('JA EXISTE UMA RODADA PENDENTE.', 'warn', 1800)
      return
    }

    if (error === 'ROUND_NOT_FOUND') {
      this._ui.showNotice('RODADA NAO ENCONTRADA PARA SETTLE.', 'warn', 2000)
      return
    }

    if (error === 'INVALID_BET') {
      this._ui.showNotice('BET INVALIDA.', 'warn', 1800)
      return
    }

    this._ui.showNotice('NAO FOI POSSIVEL INICIAR A RODADA.', 'warn', 1800)
  }

  _showBalanceMessage() {
    const message = this._balance <= 0
      ? 'SALDO ZERADO. TENTE NOVAMENTE.'
      : 'SALDO INSUFICIENTE PARA ESTA BET.'

    this._ui.showNotice(message, 'warn', 2200)
  }

  async _showWinPopup(amount, bet) {
    try {
      await ensureWinPopupAssets(amount, bet)
    } catch (error) {
      console.warn('[MainGameScene] Win popup preload failed:', error?.message, error)
    }

    this._popup = new WinPopup(amount, bet)
    this._popup.position.set(W / 2, H / 2 - 20)
    this._popup.alpha = 0
    this.addChild(this._popup)

    await new Promise(resolve =>
      animate({ from: 0, to: 1, duration: 0.2, onUpdate: v => { this._popup.alpha = v }, onComplete: resolve })
    )
    await delay(this._isTurboActive() ? 900 : this._autoActive ? 1600 : 2800)
    await new Promise(resolve =>
      animate({ from: 1, to: 0, duration: 0.22, onUpdate: v => { this._popup.alpha = v }, onComplete: resolve })
    )
    this._removePopup()
    this._fox.playIdle()
  }

  async _showFreeSpinsPopup(freeSpinsAwarded) {
    if (freeSpinsAwarded <= 0) return

    try {
      await ensureFreeSpinsPopupAsset()
    } catch (error) {
      console.warn('[MainGameScene] Free spins popup preload failed:', error?.message, error)
      this._ui.showNotice(`BONUS TRIGGERED: +${freeSpinsAwarded} FREE SPINS`, 'info', 2600)
      this._fox.playIdle()
      return
    }

    this._removeFreeSpinsPopup()

    this._freeSpinsPopup = new FreeSpinsPopup()
    this._freeSpinsPopup.position.set(W / 2, H / 2 - 10)
    this._freeSpinsPopup.alpha = 0
    this.addChild(this._freeSpinsPopup)

    await new Promise(resolve =>
      animate({ from: 0, to: 1, duration: 0.2, onUpdate: v => { this._freeSpinsPopup.alpha = v }, onComplete: resolve })
    )
    await delay(this._isTurboActive() ? 950 : this._autoActive ? 1500 : 2300)
    await new Promise(resolve =>
      animate({ from: 1, to: 0, duration: 0.2, onUpdate: v => { this._freeSpinsPopup.alpha = v }, onComplete: resolve })
    )

    this._removeFreeSpinsPopup()
    this._fox.playIdle()
  }

  _removePopup() {
    if (this._popup) {
      this.removeChild(this._popup)
      this._popup.destroy()
      this._popup = null
    }
  }

  _removeFreeSpinsPopup() {
    if (this._freeSpinsPopup) {
      this.removeChild(this._freeSpinsPopup)
      this._freeSpinsPopup.destroy()
      this._freeSpinsPopup = null
    }
  }

  fadeIn() {
    this.alpha = 0
    animate({ from: 0, to: 1, duration: 0.6, onUpdate: v => { this.alpha = v } })
  }
}
