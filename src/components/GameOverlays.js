import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { C, W, H } from '../constants.js'

const BUTTON_W = 96
const BUTTON_H = 34

function money(value) {
  return `$ ${Number(value || 0).toLocaleString('en-US')}`
}

function shortId(id) {
  if (!id) return 'N/A'
  return id.length <= 12 ? id : id.slice(-12)
}

function formatWinningLines(lineWins = [], limit = 4) {
  if (!lineWins.length) return '-'
  const ids = lineWins.slice(0, limit).map(win => `#${win.lineIndex + 1}`)
  return `${ids.join(', ')}${lineWins.length > limit ? '...' : ''}`
}

function formatMultiplier(value) {
  if (!Number.isFinite(value) || value <= 0) return '-'
  return `x${value >= 10 ? value.toFixed(1) : value.toFixed(2)}`
}

export class GameOverlays extends Container {
  constructor() {
    super()
    this._paytableModel = null
    this._snapshot = null
    this._modalKind = null
    this._realityActive = false
    this._onTurboToggle = null
    this._onCooldown = null
    this._onSelfExclude = null
    this._onRealityContinue = null
    this._build()
  }

  set onTurboToggle(fn) { this._onTurboToggle = fn }
  set onCooldown(fn) { this._onCooldown = fn }
  set onSelfExclude(fn) { this._onSelfExclude = fn }
  set onRealityContinue(fn) { this._onRealityContinue = fn }

  _build() {
    this._buildUtilityButtons()
    this._buildLastRoundCard()
    this._buildFreeSpinBanner()
    this._buildModal()
  }

  _buildUtilityButtons() {
    this._buttons = new Container()
    this._buttons.position.set(W - 420, 24)
    this.addChild(this._buttons)

    this._payBtn = this._makeButton(0, 'PAYTABLE', () => this.togglePanel('paytable'))
    this._historyBtn = this._makeButton(106, 'HISTORY', () => this.togglePanel('history'))
    this._rgBtn = this._makeButton(212, 'SAFE', () => this.togglePanel('rg'))
    this._turboBtn = this._makeButton(318, 'TURBO', () => this._onTurboToggle?.())
  }

  _makeButton(x, label, handler) {
    const btn = new Container()
    btn.position.set(x, 0)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'

    const bg = new Graphics()
    bg.roundRect(0, 0, BUTTON_W, BUTTON_H, 10)
      .fill({ color: 0x100d13, alpha: 0.94 })
      .stroke({ color: C.uiBorder, width: 2 })
    bg.rect(2, 2, BUTTON_W - 4, 6).fill({ color: C.white, alpha: 0.07 })
    btn.addChild(bg)

    const text = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontSize: 11,
        fontWeight: 'bold',
        fill: C.goldBright,
        letterSpacing: 1,
      }),
    })
    text.anchor.set(0.5)
    text.position.set(BUTTON_W / 2, BUTTON_H / 2 + 1)
    btn.addChild(text)

    btn.on('pointerdown', handler)
    btn.on('pointerover', () => { bg.tint = 0xffdd88 })
    btn.on('pointerout', () => { bg.tint = 0xffffff })
    this._buttons.addChild(btn)
    return { root: btn, bg, text }
  }

  _buildLastRoundCard() {
    const CARD_W = 236
    const CARD_H = 208
    const ROW_START_Y = 42
    const ROW_H = 20

    const card = new Container()
    card.position.set(W - CARD_W - 16, 74)
    this.addChild(card)

    const bg = new Graphics()
    bg.roundRect(0, 0, CARD_W, CARD_H, 18)
      .fill({ color: 0x120904, alpha: 0.96 })
      .stroke({ color: 0xbe7a1d, width: 2 })
    bg.roundRect(3, 3, CARD_W - 6, CARD_H - 6, 15)
      .stroke({ color: 0x4f2f0a, width: 1, alpha: 0.8 })
    bg.rect(2, 2, CARD_W - 4, 9).fill({ color: C.white, alpha: 0.07 })
    bg.rect(2, 26, CARD_W - 4, 1).fill({ color: 0xffd27a, alpha: 0.35 })

    for (let i = 0; i < 8; i++) {
      const y = ROW_START_Y + i * ROW_H
      bg.roundRect(8, y - 1, CARD_W - 16, ROW_H - 2, 6)
        .fill({ color: i % 2 === 0 ? 0x221006 : 0x190b05, alpha: 0.9 })
    }
    card.addChild(bg)

    const title = this._makeText('LAST ROUND', 14, C.goldBright, 1.4, 'left', {
      stroke: { color: C.black, width: 3 },
      dropShadow: { color: C.black, alpha: 0.7, distance: 1, blur: 0, angle: Math.PI / 4 },
    })
    title.position.set(14, 9)
    card.addChild(title)

    this._lastRoundLines = []
    const labels = ['Round', 'Win', 'Lines', 'Win Lines', 'Top Symbol', 'Multiplier', 'Bonus', 'State']
    for (let i = 0; i < labels.length; i++) {
      const y = ROW_START_Y + i * ROW_H
      const label = this._makeText(labels[i], 11, C.goldLight, 0.25, 'left', {
        stroke: { color: C.black, width: 2 },
      })
      label.position.set(16, y)
      card.addChild(label)

      const value = this._makeText('-', 11, C.white, 0, 'right', {
        stroke: { color: C.black, width: 2 },
        dropShadow: { color: C.black, alpha: 0.6, distance: 1, blur: 0, angle: Math.PI / 4 },
      })
      value.anchor.set(1, 0)
      value.position.set(CARD_W - 14, y)
      card.addChild(value)
      this._lastRoundLines.push(value)
    }

    this._lastRoundCard = card
  }

  _buildFreeSpinBanner() {
    const banner = new Container()
    banner.position.set(W / 2, 52)
    banner.visible = false
    this.addChild(banner)

    const bg = new Graphics()
    bg.roundRect(-150, -18, 300, 36, 16)
      .fill({ color: 0x10220f, alpha: 0.95 })
      .stroke({ color: 0x7dff8d, width: 2 })
    banner.addChild(bg)

    const text = this._makeText('', 14, C.white, 1.2, 'center')
    text.anchor.set(0.5)
    banner.addChild(text)

    this._freeSpinBanner = banner
    this._freeSpinText = text
  }

  _buildModal() {
    const modal = new Container()
    modal.visible = false
    modal.eventMode = 'static'
    modal.cursor = 'default'
    this.addChild(modal)

    const dim = new Graphics()
    dim.rect(0, 0, W, H).fill({ color: C.black, alpha: 0.68 })
    modal.addChild(dim)

    const panel = new Container()
    panel.position.set(W / 2, H / 2)
    modal.addChild(panel)

    this._modal = modal
    this._modalPanel = panel
  }

  _resetModal() {
    this._modalPanel.removeChildren().forEach(child => child.destroy?.({ children: true }))
  }

  _buildModalFrame(titleText, height = 470) {
    this._resetModal()

    const bg = new Graphics()
    bg.roundRect(-390, -height / 2, 780, height, 24)
      .fill({ color: 0x08060a, alpha: 0.97 })
      .stroke({ color: C.uiBorder, width: 3 })
    bg.rect(-386, -height / 2 + 3, 772, 10).fill({ color: C.white, alpha: 0.08 })
    this._modalPanel.addChild(bg)

    const title = this._makeText(titleText, 22, C.goldBright, 1.8, 'center')
    title.anchor.set(0.5)
    title.position.set(0, -height / 2 + 28)
    this._modalPanel.addChild(title)

    const close = this._makeActionButton(300, -height / 2 + 26, 116, 34, 'CLOSE', () => this.hideModal())
    this._modalPanel.addChild(close)
  }

  _makeActionButton(x, y, w, h, label, handler, active = true, customBgColor = null) {
    const btn = new Container()
    btn.position.set(x, y)
    btn.eventMode = active ? 'static' : 'none'
    btn.cursor = active ? 'pointer' : 'default'

    const bg = new Graphics()
    const bgColor = customBgColor ?? (active ? 0x1f3e17 : 0x262626)
    bg.roundRect(-w / 2, -h / 2, w, h, 12)
      .fill({ color: bgColor, alpha: 0.94 })
      .stroke({ color: active ? 0x7dff8d : C.metalMid, width: 2 })
    btn.addChild(bg)

    const text = this._makeText(label, 11, active ? C.white : C.metalShine, 0.8, 'center')
    text.anchor.set(0.5)
    btn.addChild(text)

    if (active) {
      btn.on('pointerdown', handler)
      btn.on('pointerover', () => { bg.tint = 0xc8ffd0 })
      btn.on('pointerout', () => { bg.tint = 0xffffff })
    }

    return btn
  }

  _makeText(text, size, fill, letterSpacing = 0, align = 'left', styleOverrides = null) {
    return new Text({
      text,
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontSize: size,
        fontWeight: 'bold',
        fill,
        letterSpacing,
        align,
        ...(styleOverrides || {}),
      }),
    })
  }

  setPaytableModel(model) {
    this._paytableModel = model
  }

  setServerSnapshot(snapshot) {
    this._snapshot = snapshot
    this._applyLastRound(snapshot?.lastRound)
    this._applyFreeSpinState(snapshot?.freeSpins)
    this._applyTurboState(Boolean(snapshot?.preferences?.turbo))

    if (snapshot?.session?.realityCheckRequired && !this._realityActive) {
      this.showRealityCheck()
    }
  }

  _applyTurboState(active) {
    this._turboBtn.bg.tint = active ? 0x88ff88 : 0xffffff
    this._turboBtn.text.style.fill = active ? 0x0d3d18 : C.goldBright
  }

  _applyLastRound(round) {
    if (!this._lastRoundLines?.length) return
    const top = round?.topLineWin
    const values = round ? [
      shortId(round.id),
      money(round.totalWin),
      String(round.lineWins?.length ?? 0),
      formatWinningLines(round.lineWins),
      top ? `${top.symbol} x${top.count}` : '-',
      formatMultiplier(top?.appliedMultiplier),
      round.bonusTriggered ? `+${round.awardedFreeSpins} FS` : 'No',
      round.status ?? 'settled',
    ] : ['-', '-', '-', '-', '-', '-', '-', '-']

    for (let i = 0; i < this._lastRoundLines.length; i++) {
      this._lastRoundLines[i].text = values[i]
    }
  }

  _applyFreeSpinState(freeSpins) {
    const remaining = Number(freeSpins?.remaining || 0)
    if (remaining > 0) {
      this._freeSpinText.text = `FREE SPINS: ${remaining} | WIN MULT x${freeSpins.winMultiplier || 2}`
      this._freeSpinBanner.visible = true
    } else {
      this._freeSpinBanner.visible = false
    }
  }

  togglePanel(kind) {
    if (this._realityActive) return
    if (this._modal.visible && this._modalKind === kind) {
      this.hideModal()
      return
    }

    if (kind === 'paytable') {
      this.showPaytable()
    } else if (kind === 'history') {
      this.showHistory()
    } else if (kind === 'rg') {
      this.showResponsibleGaming()
    }
  }

  hideModal() {
    this._modal.visible = false
    this._modalKind = null
    this._realityActive = false
  }

  showPaytable() {
    const model = this._paytableModel
    if (!model) return

    this._modal.visible = true
    this._modalKind = 'paytable'
    this._buildModalFrame('PAYTABLE & BONUS RULES', 570)

    const leftX = -340
    const topY = -225
    let rowY = topY

    const info = [
      `Grid: 6x5`,
      `Paylines: ${model.paylines.length}`,
      `Min match: ${model.minimumMatch}`,
      `Bonus symbol: ${model.bonus.symbol}`,
      `Bonus trigger: ${model.bonus.triggerCount}+ anywhere`,
      `Bonus reels: at least ${model.bonus.distinctReelsRequired} reels`,
      `Bonus award: ${model.bonus.freeSpinsAward} free spins`,
      `Free spin multiplier: x${model.bonus.freeSpinWinMultiplier}`,
    ]

    for (const line of info) {
      const text = this._makeText(line, 13, C.offWhite, 0.4, 'left')
      text.position.set(leftX, rowY)
      this._modalPanel.addChild(text)
      rowY += 22
    }

    rowY += 10
    const headers = ['SYMBOL', '3', '4', '5', '6']
    headers.forEach((header, index) => {
      const text = this._makeText(header, 12, C.goldBright, 0.8, 'left')
      text.position.set(leftX + index * 100, rowY)
      this._modalPanel.addChild(text)
    })

    rowY += 26
    for (const entry of model.entries) {
      const cols = [
        entry.symbol,
        `x${entry.payouts[3]}`,
        `x${entry.payouts[4]}`,
        `x${entry.payouts[5]}`,
        `x${entry.payouts[6]}`,
      ]
      cols.forEach((col, index) => {
        const text = this._makeText(col, 12, C.offWhite, 0.4, 'left')
        text.position.set(leftX + index * 100, rowY)
        this._modalPanel.addChild(text)
      })
      rowY += 22
    }

    const note = this._makeText(
      'All payouts use the current bet. Bonus can pay as symbol and also trigger free spins.',
      12,
      C.metalShine,
      0.2,
      'left'
    )
    note.position.set(-340, 220)
    this._modalPanel.addChild(note)
  }

  showHistory() {
    this._modal.visible = true
    this._modalKind = 'history'
    this._buildModalFrame('ROUND HISTORY & AUDIT', 560)

    const history = [...(this._snapshot?.roundHistory ?? [])].reverse().slice(0, 8)
    const audits = [...(this._snapshot?.auditTrail ?? [])].reverse().slice(0, 6)
    const lastRound = this._snapshot?.lastRound

    const summaryLines = lastRound ? [
      `Last round: ${shortId(lastRound.id)}`,
      `Win: ${money(lastRound.totalWin)} | Bet: ${money(lastRound.bet)}`,
      `Lines: ${lastRound.lineWins?.length ?? 0} | Bonus: ${lastRound.bonusTriggered ? 'YES' : 'NO'}`,
      `Winning lines: ${formatWinningLines(lastRound.lineWins, 6)}`,
      `Top symbol: ${lastRound.topLineWin ? `${lastRound.topLineWin.symbol} x${lastRound.topLineWin.count}` : '-'}`,
      `Top multiplier: ${formatMultiplier(lastRound.topLineWin?.appliedMultiplier)}`,
    ] : ['No settled round yet.']

    let y = -215
    for (const line of summaryLines) {
      const text = this._makeText(line, 13, C.offWhite, 0.3, 'left')
      text.position.set(-340, y)
      this._modalPanel.addChild(text)
      y += 22
    }

    const historyTitle = this._makeText('RECENT ROUNDS', 14, C.goldBright, 1.1, 'left')
    historyTitle.position.set(-340, -105)
    this._modalPanel.addChild(historyTitle)

    y = -76
    if (!history.length) {
      const text = this._makeText('No rounds settled yet.', 12, C.metalShine, 0.2, 'left')
      text.position.set(-340, y)
      this._modalPanel.addChild(text)
    } else {
      for (const round of history) {
        const line = `${shortId(round.id)} | Bet ${money(round.bet)} | Win ${money(round.totalWin)} | Lines ${round.lineWins?.length ?? 0}${round.isFreeSpin ? ' | FS' : ''}${round.bonusTriggered ? ' | BONUS' : ''}`
        const text = this._makeText(line, 12, C.offWhite, 0.2, 'left')
        text.position.set(-340, y)
        this._modalPanel.addChild(text)
        y += 22
      }
    }

    const auditTitle = this._makeText('AUDIT TRAIL', 14, C.goldBright, 1.1, 'left')
    auditTitle.position.set(-340, 118)
    this._modalPanel.addChild(auditTitle)

    y = 146
    for (const audit of audits) {
      const line = `${new Date(audit.at).toLocaleTimeString()} | ${audit.type}`
      const text = this._makeText(line, 12, C.metalShine, 0.2, 'left')
      text.position.set(-340, y)
      this._modalPanel.addChild(text)
      y += 20
    }
  }

  showResponsibleGaming() {
    const session = this._snapshot?.session
    if (!session) return

    this._modal.visible = true
    this._modalKind = 'rg'
    this._buildModalFrame('RESPONSIBLE GAMING', 520)

    const cooldownActive = session.cooldownUntil > Date.now()
    const selfExcludeActive = session.selfExcludedUntil > Date.now()

    const lines = [
      `Session spins: ${session.spinsPlayed} / ${session.limits.sessionSpinLimit}`,
      `Cash bet: ${money(session.totalCashBet)}`,
      `Equivalent bet: ${money(session.totalEquivalentBet)}`,
      `Total win: ${money(session.totalWin)}`,
      `Net loss: ${money(session.netLoss)} / ${money(session.limits.lossLimit)}`,
      `Reality check every: ${session.limits.realityCheckMinutes} min`,
      `Cooldown active: ${cooldownActive ? 'YES' : 'NO'}`,
      `Self-exclusion active: ${selfExcludeActive ? 'YES' : 'NO'}`,
    ]

    let y = -180
    for (const line of lines) {
      const text = this._makeText(line, 13, C.offWhite, 0.3, 'left')
      text.position.set(-320, y)
      this._modalPanel.addChild(text)
      y += 28
    }

    const cooldownLabel = cooldownActive ? 'CANCEL COOLDOWN' : 'START 1M COOLDOWN'
    const cooldownActive_color = cooldownActive ? 0x8b4513 : 0x1f3e17

    const selfExcludeLabel = selfExcludeActive ? 'CANCEL SELF-EXCLUDE' : 'SELF-EXCLUDE 24H'
    const selfExcludeActive_color = selfExcludeActive ? 0x8b4513 : 0x1f3e17

    this._modalPanel.addChild(
      this._makeActionButton(-120, 172, 180, 42, cooldownLabel, () => this._onCooldown?.(), true, cooldownActive_color)
    )
    this._modalPanel.addChild(
      this._makeActionButton(120, 172, 180, 42, selfExcludeLabel, () => this._onSelfExclude?.(), true, selfExcludeActive_color)
    )
  }

  showRealityCheck() {
    const session = this._snapshot?.session
    if (!session) return

    this._modal.visible = true
    this._modalKind = 'reality'
    this._realityActive = true
    this._buildModalFrame('REALITY CHECK', 340)

    const lines = [
      `Spins this session: ${session.spinsPlayed}`,
      `Cash bet: ${money(session.totalCashBet)}`,
      `Total win: ${money(session.totalWin)}`,
      `Net loss: ${money(session.netLoss)}`,
      `Balance: ${money(this._snapshot?.wallet?.balance)}`,
    ]

    let y = -90
    for (const line of lines) {
      const text = this._makeText(line, 15, C.offWhite, 0.3, 'center')
      text.anchor.set(0.5, 0)
      text.position.set(0, y)
      this._modalPanel.addChild(text)
      y += 30
    }

    const continueBtn = this._makeActionButton(0, 112, 220, 44, 'CONTINUE PLAY', () => this._onRealityContinue?.())
    this._modalPanel.addChild(continueBtn)
  }
}
