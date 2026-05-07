import { AnimatedSprite, Assets, BlurFilter, Container, Graphics, Texture, Ticker } from 'pixi.js'
import { SEQ, SYMBOLS, SYMBOL_TOTAL_FRAMES, SYMBOL_STEP, GRID_COLS, GRID_ROWS, C } from '../constants.js'
import { animate, easeOut } from '../tween.js'

const CELL_W = 118
const CELL_H = 104
const FRAME_W = GRID_COLS * CELL_W
const FRAME_H = GRID_ROWS * CELL_H

const BUFFER = 3
const STRIP_LEN = GRID_ROWS + BUFFER
const SPIN_SPEED = 55

const SYMBOL_BY_KEY = new Map(SYMBOLS.map(symbol => [symbol.key, symbol]))
const WIN_LINE_COLORS = [
  0xffd166,
  0x90e0ef,
  0xff7b7b,
  0xcaffbf,
  0xd0bfff,
]

export function getSymbolUrls() {
  const urls = []
  for (const sym of SYMBOLS) {
    for (let f = 0; f < SYMBOL_TOTAL_FRAMES; f += SYMBOL_STEP) {
      const p = String(f).padStart(2, '0')
      urls.push(`${SEQ}/${sym.dir}/${sym.prefix}_${p}.png`)
    }
  }
  return urls
}

export class SlotGrid extends Container {
  constructor() {
    super()
    this._reels = []
    this._spinning = false
    this._symbolFrames = new Map()
    this._build()
    Ticker.shared.add(() => this._tick())
  }

  _build() {
    const pad = 16
    const frame = new Graphics()

    frame.roundRect(-pad - 6, -pad - 8, FRAME_W + (pad + 6) * 2, FRAME_H + (pad + 8) * 2, 24)
      .fill({ color: C.black, alpha: 0.32 })
    frame.roundRect(-pad - 2, -pad - 2, FRAME_W + (pad + 2) * 2, FRAME_H + (pad + 2) * 2, 20)
      .fill({ color: 0x120f11, alpha: 0.96 })
    frame.roundRect(-pad - 2, -pad - 2, FRAME_W + (pad + 2) * 2, FRAME_H + (pad + 2) * 2, 20)
      .stroke({ color: 0xb8bdc6, width: 3 })
    frame.roundRect(-pad + 3, -pad + 3, FRAME_W + (pad - 3) * 2, 10, 6)
      .fill({ color: C.white, alpha: 0.16 })
    frame.roundRect(-pad + 4, FRAME_H + pad - 10, FRAME_W + (pad - 4) * 2, 6, 5)
      .fill({ color: C.black, alpha: 0.24 })

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * CELL_W
        const y = row * CELL_H
        const cellColor = (row + col) % 2 === 0 ? 0x0f1116 : 0x0b0d12

        frame.rect(x, y, CELL_W, CELL_H).fill({ color: cellColor, alpha: 0.98 })
        frame.rect(x + 1, y + 1, CELL_W - 2, 18).fill({ color: C.white, alpha: 0.025 })
        frame.rect(x + 1, y + CELL_H - 16, CELL_W - 2, 15).fill({ color: C.black, alpha: 0.12 })
      }
    }

    for (let c = 1; c < GRID_COLS; c++) {
      const lx = c * CELL_W
      frame.rect(lx - 4, 0, 2, FRAME_H).fill({ color: 0xff7a55, alpha: 0.18 })
      frame.rect(lx - 1.5, 0, 3, FRAME_H).fill({ color: C.gridLine, alpha: 0.92 })
      frame.rect(lx + 2, 0, 2, FRAME_H).fill({ color: 0xff7a55, alpha: 0.18 })
    }

    for (let r = 1; r < GRID_ROWS; r++) {
      const ly = r * CELL_H
      frame.rect(0, ly - 1, FRAME_W, 2).fill({ color: 0xb5bcc8, alpha: 0.34 })
      frame.rect(0, ly + 2, FRAME_W, 1).fill({ color: C.black, alpha: 0.28 })
    }

    frame.roundRect(-2, -2, FRAME_W + 4, FRAME_H + 4, 10)
      .stroke({ color: C.white, alpha: 0.08, width: 2 })

    const bolts = [
      { x: -pad + 11, y: -pad + 11 },
      { x: FRAME_W + pad - 11, y: -pad + 11 },
      { x: -pad + 11, y: FRAME_H + pad - 11 },
      { x: FRAME_W + pad - 11, y: FRAME_H + pad - 11 },
    ]
    for (const bolt of bolts) {
      frame.circle(bolt.x, bolt.y, 8).fill(0x6f7782)
      frame.circle(bolt.x, bolt.y, 8).stroke({ color: C.white, alpha: 0.3, width: 1.5 })
      frame.circle(bolt.x - 1, bolt.y - 1, 3).fill({ color: C.white, alpha: 0.2 })
    }

    this.addChild(frame)

    for (let col = 0; col < GRID_COLS; col++) {
      this._reels.push(this._buildReel(col))
    }

    this._winLayer = new Graphics()
    this.addChild(this._winLayer)

    const mask = new Graphics()
    mask.rect(-1, -1, FRAME_W + 2, FRAME_H + 2).fill(C.white)
    this.addChild(mask)
    this.mask = mask

    const overlay = new Graphics()
    overlay.rect(0, 0, FRAME_W, 22).fill({ color: C.white, alpha: 0.035 })
    overlay.rect(0, FRAME_H - 26, FRAME_W, 26).fill({ color: C.black, alpha: 0.15 })
    overlay.roundRect(-1, -1, FRAME_W + 2, FRAME_H + 2, 10)
      .stroke({ color: 0xf9fafb, alpha: 0.06, width: 2 })
    this.addChild(overlay)
  }

  _buildReel(col) {
    const container = new Container()
    container.x = col * CELL_W
    this.addChild(container)

    const sprites = []
    const initialWindow = this._createRandomWindow()
    for (let i = 0; i < STRIP_LEN; i++) {
      const spr = this._makeSprite(initialWindow[i])
      spr.x = CELL_W / 2
      spr.y = (i - BUFFER) * CELL_H + CELL_H / 2
      container.addChild(spr)
      sprites.push(spr)
    }

    return { container, sprites, offset: 0, speed: 0, currentWindow: initialWindow }
  }

  _tick() {
    const dt = Ticker.shared.deltaTime
    for (const reel of this._reels) {
      if (reel.speed <= 0) continue
      reel.offset += reel.speed * dt
      reel.container.y = reel.offset
      this._recycle(reel)
    }
  }

  _recycle(reel) {
    for (const spr of reel.sprites) {
      if (spr.y + reel.offset + CELL_H / 2 > FRAME_H) {
        const topY = Math.min(...reel.sprites.map(sprite => sprite.y))
        spr.y = topY - CELL_H
        this._setSpriteSymbol(spr, this._pickRandomSymbol())
      }
    }
  }

  _pickRandomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].key
  }

  _createRandomWindow() {
    return Array.from({ length: STRIP_LEN }, () => this._pickRandomSymbol())
  }

  _framesForKey(key) {
    if (this._symbolFrames.has(key)) {
      return this._symbolFrames.get(key)
    }

    const symbol = SYMBOL_BY_KEY.get(key)
    if (!symbol) {
      return [Texture.WHITE]
    }

    const frames = []
    for (let f = 0; f < SYMBOL_TOTAL_FRAMES; f += SYMBOL_STEP) {
      const p = String(f).padStart(2, '0')
      const tex = Assets.get(`${SEQ}/${symbol.dir}/${symbol.prefix}_${p}.png`)
      if (tex) frames.push(tex)
    }

    const result = frames.length ? frames : [Texture.WHITE]
    this._symbolFrames.set(key, result)
    return result
  }

  _applyFrames(spr, frames) {
    spr.textures = frames
    spr.animationSpeed = 0.18 + Math.random() * 0.07
    spr.gotoAndPlay(0)

    if (frames[0] !== Texture.WHITE) {
      const maxDim = Math.min(CELL_W, CELL_H) * 0.8
      const orig = Math.max(frames[0].width, frames[0].height)
      if (orig > 0) spr.scale.set(maxDim / orig)
    }
  }

  _setSpriteSymbol(spr, symbolKey) {
    spr.symbolKey = symbolKey
    this._applyFrames(spr, this._framesForKey(symbolKey))
  }

  _makeSprite(symbolKey) {
    const spr = new AnimatedSprite(this._framesForKey(symbolKey))
    spr.anchor.set(0.5)
    spr.loop = true
    spr.play()
    spr.symbolKey = symbolKey
    this._applyFrames(spr, this._framesForKey(symbolKey))
    return spr
  }

  _applyWindow(reel, windowKeys) {
    const window = windowKeys?.length === STRIP_LEN ? windowKeys : this._createRandomWindow()
    reel.currentWindow = [...window]
    reel.offset = 0
    reel.container.y = 0

    for (let i = 0; i < reel.sprites.length; i++) {
      const spr = reel.sprites[i]
      spr.y = (i - BUFFER) * CELL_H + CELL_H / 2
      this._setSpriteSymbol(spr, window[i])
    }
  }

  _clearWinHighlights() {
    this._winLayer.clear()
  }

  _drawWinHighlights(lineWins, winningPositions) {
    this._clearWinHighlights()
    if (!lineWins?.length) return

    for (let lineIndex = 0; lineIndex < lineWins.length; lineIndex++) {
      const win = lineWins[lineIndex]
      const color = WIN_LINE_COLORS[lineIndex % WIN_LINE_COLORS.length]

      for (let posIndex = 0; posIndex < win.positions.length; posIndex++) {
        const pos = win.positions[posIndex]
        const cx = pos.col * CELL_W + CELL_W / 2
        const cy = pos.row * CELL_H + CELL_H / 2

        if (posIndex === 0) {
          this._winLayer.moveTo(cx, cy)
        } else {
          this._winLayer.lineTo(cx, cy)
        }
      }

      this._winLayer.stroke({ color, width: 4, alpha: 0.38 })
    }

    for (const pos of winningPositions ?? []) {
      const x = pos.col * CELL_W + 10
      const y = pos.row * CELL_H + 10
      this._winLayer.roundRect(x, y, CELL_W - 20, CELL_H - 20, 14)
        .fill({ color: 0xfff2a8, alpha: 0.08 })
        .stroke({ color: 0xfff2a8, width: 3, alpha: 0.58 })
    }
  }

  async spin(round = null, options = {}) {
    if (this._spinning) return
    this._spinning = true
    this._clearWinHighlights()

    const turbo = Boolean(options.turbo)
    const startDelay = turbo ? 380 : 900
    const stopStepDelay = turbo ? 95 : 180
    const settleDuration = turbo ? 0.22 : 0.45
    const blur = new BlurFilter({ strengthX: 0, strengthY: 14, quality: 2 })
    const reelWindows = round?.reelWindows ?? this._reels.map(() => this._createRandomWindow())

    for (const reel of this._reels) {
      reel.speed = SPIN_SPEED
      reel.container.filters = [blur]
    }

    await new Promise(resolve => setTimeout(resolve, startDelay))

    for (let col = 0; col < this._reels.length; col++) {
      await new Promise(resolve => setTimeout(resolve, stopStepDelay))
      await this._stopReel(this._reels[col], reelWindows[col], settleDuration)
    }

    if (round?.lineWins?.length) {
      this._drawWinHighlights(round.lineWins, round.winningPositions)
    }

    this._spinning = false
  }

  _stopReel(reel, finalWindow, settleDuration) {
    return new Promise(resolve => {
      reel.speed = 0

      const from = reel.offset
      const target = Math.ceil((from + CELL_H * 3) / CELL_H) * CELL_H

      animate({
        from,
        to: target,
        duration: settleDuration,
        ease: easeOut,
        onUpdate: v => {
          reel.offset = v
          reel.container.y = v
          this._recycle(reel)
        },
        onComplete: () => {
          reel.container.filters = []
          this._applyWindow(reel, finalWindow)
          resolve()
        },
      })
    })
  }

  get isSpinning() {
    return this._spinning
  }
}
