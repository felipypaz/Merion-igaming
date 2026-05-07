import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { W, C } from '../constants.js'

const PANEL_H = 82
const PANEL_Y = 638
const INFO_W = 155
const INFO_H = 52

const BET_BTN_R = 20
const BET_BTN_GAP = 14

const BAL_CX = Math.round((307 + 438) / 2)
const WIN_CX = BAL_CX + 186
const BET_CX = WIN_CX + 214

const AUTO_OPTS = [10, 30, 50, 80, 100, 500, 1000]

export class GameUI extends Container {
  constructor() {
    super()
    this._balance = 4000
    this._win = 0
    this._bet = 100
    this._onSpin = null
    this._onBetUp = null
    this._onBetDn = null
    this._onAutoSelect = null
    this._onAutoStop = null
    this._autoActive = false
    this._selector = null
    this._autoCostLabels = []
    this._noticeTimer = null
    this._build()
  }

  set onSpin(fn) { this._onSpin = fn }
  set onBetUp(fn) { this._onBetUp = fn }
  set onBetDown(fn) { this._onBetDn = fn }
  set onAutoSelect(fn) { this._onAutoSelect = fn }
  set onAutoStop(fn) { this._onAutoStop = fn }

  setWin(value) {
    this._win = value
    this._winLabel.text = `$ ${value.toLocaleString()}`
  }

  setBalance(value) {
    this._balance = value
    this._balLabel.text = `$ ${value.toLocaleString()}`
  }

  enableSpin() {
    this._spinBtn.alpha = 1
    this._spinBtn.eventMode = 'static'
  }

  disableSpin() {
    this._spinBtn.alpha = 0.5
    this._spinBtn.eventMode = 'none'
  }

  setAutoActive(active, remaining = -1) {
    this._autoActive = active
    if (active) {
      this._closeSelector()
    }
    this._updateAutoBtn(active, remaining)
  }

  updateAutoCount(remaining) {
    if (!this._autoActive) return
    this._updateAutoBtn(true, remaining)
  }

  updateBet(value) {
    this._bet = value
    this._betLabel.text = `$ ${value.toLocaleString()}`
    this._refreshSelectorCosts()
  }

  showNotice(message, tone = 'warn', duration = 1800) {
    if (!this._notice || !this._noticeText) return

    if (this._noticeTimer) {
      clearTimeout(this._noticeTimer)
      this._noticeTimer = null
    }

    const palette = tone === 'info'
      ? { bg: 0x0b1c2b, stroke: 0x66b9ff, text: C.white }
      : { bg: 0x2c1208, stroke: 0xffb35c, text: C.goldBright }

    this._noticeText.text = message
    this._noticeText.style.fill = palette.text

    if (this._noticeBg) {
      this._notice.removeChild(this._noticeBg)
      this._noticeBg.destroy()
    }

    const width = Math.max(320, Math.ceil(this._noticeText.width + 54))
    const height = 42
    const bg = new Graphics()
    bg.roundRect(-width / 2, -height / 2, width, height, 16)
      .fill({ color: palette.bg, alpha: 0.95 })
      .stroke({ color: palette.stroke, width: 2 })
    bg.rect(-width / 2 + 2, -height / 2 + 2, width - 4, 7)
      .fill({ color: C.white, alpha: 0.08 })

    this._noticeBg = bg
    this._notice.addChildAt(bg, 0)
    this._notice.visible = true
    this._notice.alpha = 1

    this._noticeTimer = setTimeout(() => {
      this.hideNotice()
    }, duration)
  }

  hideNotice() {
    if (this._noticeTimer) {
      clearTimeout(this._noticeTimer)
      this._noticeTimer = null
    }
    if (this._notice) {
      this._notice.visible = false
      this._notice.alpha = 0
    }
  }

  _build() {
    const panel = new Graphics()
    panel.rect(0, PANEL_Y - 2, W, PANEL_H + 4).fill(C.uiPanel)
    panel.rect(0, PANEL_Y - 2, W, 3).fill(C.uiBorder)
    panel.rect(0, PANEL_Y - 2, W, 1).fill({ color: C.goldBright, alpha: 0.6 })
    this.addChild(panel)
    this._buildNotice()

    const trioY = PANEL_Y + (PANEL_H - INFO_H) / 2

    this._balLabel = this._addInfoBox(BAL_CX, trioY, 'BALANCE', `$ ${this._balance.toLocaleString()}`)
    this._winLabel = this._addInfoBox(WIN_CX, trioY, 'WIN', `$ ${this._win.toLocaleString()}`)
    this._betLabel = this._addInfoBox(BET_CX, trioY, 'BET', `$ ${this._bet.toLocaleString()}`)

    this._addCoinBtn(
      BET_CX - INFO_W / 2 - BET_BTN_R - BET_BTN_GAP,
      trioY + INFO_H / 2,
      false,
      () => this._onBetDn?.()
    )
    this._addCoinBtn(
      BET_CX + INFO_W / 2 + BET_BTN_R + BET_BTN_GAP,
      trioY + INFO_H / 2,
      true,
      () => this._onBetUp?.()
    )

    const spinCx = Math.round((1207 + 1665) / 2 * (1280 / 1920))
    const spinCy = Math.round((929 + 1090) / 2 * (720 / 1080))
    this._spinBtn = this._buildSpinBtn(spinCx, spinCy)
    this.addChild(this._spinBtn)

    this._autoBtnCX = spinCx + 108
    this._autoBtnCY = spinCy
    this._buildAutoBtn(this._autoBtnCX, this._autoBtnCY)
  }

  _buildNotice() {
    const notice = new Container()
    notice.position.set(W / 2, PANEL_Y - 22)
    notice.visible = false
    notice.alpha = 0

    this._noticeBg = new Graphics()
    notice.addChild(this._noticeBg)

    const text = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 14,
        fill: C.goldBright,
        stroke: { color: C.black, width: 3 },
        letterSpacing: 0.5,
      }),
    })
    text.anchor.set(0.5)
    notice.addChild(text)

    this._notice = notice
    this._noticeText = text
    this.addChild(notice)
  }

  _addInfoBox(cx, y, label, value) {
    const g = new Graphics()
    g.roundRect(cx - INFO_W / 2, y, INFO_W, INFO_H, 6).fill(0x0a0604)
    g.roundRect(cx - INFO_W / 2, y, INFO_W, INFO_H, 6).stroke({ color: C.uiBorder, width: 1.5 })
    g.rect(cx - INFO_W / 2 + 2, y + 2, INFO_W - 4, 14).fill({ color: C.white, alpha: 0.04 })
    this.addChild(g)

    const lbl = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 11,
        fill: C.gold,
        letterSpacing: 1.5,
      }),
    })
    lbl.anchor.set(0.5, 0)
    lbl.position.set(cx, y + 5)
    this.addChild(lbl)

    const val = new Text({
      text: value,
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 20,
        fill: C.goldBright,
        dropShadow: { color: C.black, alpha: 0.8, distance: 2, blur: 1, angle: Math.PI / 4 },
      }),
    })
    val.anchor.set(0.5)
    val.position.set(cx, y + INFO_H * 0.62)
    this.addChild(val)
    return val
  }

  _addCoinBtn(cx, cy, isPlus, handler) {
    const g = new Graphics()
    g.circle(0, 0, BET_BTN_R).fill(C.btnGreen)
    g.circle(0, 0, BET_BTN_R).stroke({ color: C.metalLight, width: 1.5 })
    g.circle(0, 0, BET_BTN_R - 4).fill({ color: C.white, alpha: 0.08 })
    g.position.set(cx, cy)
    g.eventMode = 'static'
    g.cursor = 'pointer'
    if (handler) g.on('pointerdown', handler)
    this.addChild(g)

    const t = new Text({
      text: isPlus ? '+' : '-',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 24,
        fill: C.white,
        stroke: { color: 0x0b3b1a, width: 2 },
      }),
    })
    t.anchor.set(0.5)
    t.position.set(cx, cy + (isPlus ? 0 : -1))
    this.addChild(t)
  }

  _buildSpinBtn(cx, cy) {
    const btn = new Container()
    btn.position.set(cx, cy)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'

    const g = new Graphics()
    g.circle(0, 0, 48).fill({ color: C.spinRed, alpha: 0.3 })
    g.circle(0, 0, 42).fill(C.spinRed)
    g.circle(0, 0, 42).stroke({ color: 0xff6644, width: 2 })
    g.ellipse(0, -16, 22, 12).fill({ color: C.white, alpha: 0.2 })
    g.circle(0, 0, 42).stroke({ color: 0x6b0000, width: 4, alpha: 0.7 })
    btn.addChild(g)

    const label = new Text({
      text: 'SPIN',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 20,
        fill: C.white,
        stroke: { color: 0x6b0000, width: 4 },
        dropShadow: { color: C.black, alpha: 0.8, distance: 2, blur: 2, angle: Math.PI / 4 },
      }),
    })
    label.anchor.set(0.5)
    btn.addChild(label)

    btn.on('pointerdown', () => {
      if (btn.alpha >= 0.8) this._onSpin?.()
    })
    btn.on('pointerover', () => {
      if (btn.alpha >= 0.8) g.tint = 0xff6655
    })
    btn.on('pointerout', () => {
      g.tint = 0xffffff
    })
    return btn
  }

  _buildAutoBtn(cx, cy) {
    const btn = new Container()
    btn.position.set(cx, cy)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'

    const g = new Graphics()
    g.circle(0, 0, 36).fill({ color: 0x1a1a1a, alpha: 0.4 })
    g.circle(0, 0, 30).fill(0x1e1e1e)
    g.circle(0, 0, 30).stroke({ color: C.metalLight, width: 2 })
    g.ellipse(0, -11, 18, 9).fill({ color: C.white, alpha: 0.1 })
    btn.addChild(g)
    this._autoG = g

    const line1 = new Text({
      text: 'AUTO',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 11,
        fill: C.white,
      }),
    })
    line1.anchor.set(0.5)
    line1.position.set(0, -4)
    btn.addChild(line1)
    this._autoLine1 = line1

    const line2 = new Text({
      text: 'SPIN',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 9,
        fill: C.metalShine,
      }),
    })
    line2.anchor.set(0.5)
    line2.position.set(0, 8)
    btn.addChild(line2)
    this._autoLine2 = line2

    btn.on('pointerdown', () => {
      if (this._autoActive) {
        this._onAutoStop?.()
      } else {
        this._toggleSelector()
      }
    })
    btn.on('pointerover', () => { g.tint = 0xbbffbb })
    btn.on('pointerout', () => { g.tint = 0xffffff })
    this.addChild(btn)
  }

  _updateAutoBtn(active, remaining) {
    if (active) {
      this._autoG.tint = 0x22dd55
      this._autoLine1.style.fill = 0x000000
      this._autoLine1.style.fontSize = remaining >= 1000 ? 11 : remaining >= 100 ? 13 : 16
      this._autoLine1.text = String(remaining)
      this._autoLine1.position.set(0, -4)
      this._autoLine2.text = 'SPINS'
      this._autoLine2.style.fill = 0x000000
    } else {
      this._autoG.tint = 0xffffff
      this._autoLine1.style.fill = C.white
      this._autoLine1.style.fontSize = 11
      this._autoLine1.text = 'AUTO'
      this._autoLine1.position.set(0, -4)
      this._autoLine2.text = 'SPIN'
      this._autoLine2.style.fill = C.metalShine
    }
  }

  _toggleSelector() {
    if (this._selector) {
      this._closeSelector()
    } else {
      this._openSelector()
    }
  }

  _openSelector() {
    if (this._selector) return
    this._selector = this._buildSelector()
    this.addChild(this._selector)
  }

  _closeSelector() {
    if (!this._selector) return
    this.removeChild(this._selector)
    this._selector.destroy({ children: true })
    this._selector = null
    this._autoCostLabels = []
  }

  _buildSelector() {
    const BTN_W = 68
    const BTN_H = 68
    const GAP = 8
    const HDR = 34
    const ROW1 = 4
    const ROW2 = AUTO_OPTS.length - ROW1
    const PW = ROW1 * BTN_W + (ROW1 + 1) * GAP
    const PH = 2 * BTN_H + 3 * GAP + HDR

    const panel = new Container()
    this._autoCostLabels = []

    const px = this._autoBtnCX - PW / 2
    const py = this._autoBtnCY - PH - 18
    panel.position.set(
      Math.max(4, Math.min(W - 4 - PW, px)),
      Math.max(4, py)
    )

    const bg = new Graphics()
    bg.roundRect(0, 0, PW, PH, 10).fill({ color: 0x080503, alpha: 0.96 })
    bg.roundRect(0, 0, PW, PH, 10).stroke({ color: C.uiBorder, width: 2 })
    bg.roundRect(2, 2, PW - 4, 3, 2).fill({ color: C.goldBright, alpha: 0.5 })
    panel.addChild(bg)

    const title = new Text({
      text: 'AUTO SPIN',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 13,
        fill: C.gold,
        letterSpacing: 2,
      }),
    })
    title.anchor.set(0.5, 0)
    title.position.set(PW / 2, 9)
    panel.addChild(title)

    const xBtn = new Graphics()
    xBtn.circle(0, 0, 9).fill(0x2a0808)
    xBtn.circle(0, 0, 9).stroke({ color: C.metalMid, width: 1 })
    xBtn.position.set(PW - 13, 13)
    xBtn.eventMode = 'static'
    xBtn.cursor = 'pointer'
    xBtn.on('pointerdown', () => this._closeSelector())
    panel.addChild(xBtn)

    const xLbl = new Text({
      text: 'X',
      style: new TextStyle({ fontFamily: 'Arial', fontSize: 9, fill: C.metalShine }),
    })
    xLbl.anchor.set(0.5)
    xLbl.position.set(PW - 13, 13)
    panel.addChild(xLbl)

    for (let i = 0; i < ROW1; i++) {
      const bx = GAP + i * (BTN_W + GAP)
      const by = HDR + GAP
      panel.addChild(this._buildOptBtn(bx, by, BTN_W, BTN_H, AUTO_OPTS[i]))
    }

    const row2TotalW = ROW2 * BTN_W + (ROW2 - 1) * GAP
    const row2StartX = (PW - row2TotalW) / 2
    for (let j = 0; j < ROW2; j++) {
      const bx = row2StartX + j * (BTN_W + GAP)
      const by = HDR + GAP + BTN_H + GAP
      panel.addChild(this._buildOptBtn(bx, by, BTN_W, BTN_H, AUTO_OPTS[ROW1 + j]))
    }

    return panel
  }

  _buildOptBtn(x, y, w, h, count) {
    const btn = new Container()
    btn.position.set(x, y)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'

    const g = new Graphics()
    g.roundRect(0, 0, w, h, 7).fill(0x120c04)
    g.roundRect(0, 0, w, h, 7).stroke({ color: C.uiBorder, width: 1.5 })
    btn.addChild(g)

    const countLbl = new Text({
      text: String(count),
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 20,
        fill: C.goldBright,
        dropShadow: { color: C.black, alpha: 0.7, distance: 1, blur: 1, angle: Math.PI / 4 },
      }),
    })
    countLbl.anchor.set(0.5, 0)
    countLbl.position.set(w / 2, 7)
    btn.addChild(countLbl)

    const costLbl = new Text({
      text: this._fmtCost(count * this._bet),
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 10,
        fill: C.metalShine,
      }),
    })
    costLbl.anchor.set(0.5, 1)
    costLbl.position.set(w / 2, h - 7)
    btn.addChild(costLbl)
    this._autoCostLabels.push({ count, label: costLbl })

    btn.on('pointerdown', () => {
      this._closeSelector()
      this._onAutoSelect?.(count)
    })
    btn.on('pointerover', () => { g.tint = 0xffdd88 })
    btn.on('pointerout', () => { g.tint = 0xffffff })
    return btn
  }

  _refreshSelectorCosts() {
    for (const item of this._autoCostLabels) {
      item.label.text = this._fmtCost(item.count * this._bet)
    }
  }

  _fmtCost(n) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
    return `$${n}`
  }
}
