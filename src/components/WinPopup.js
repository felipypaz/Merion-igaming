import { AnimatedSprite, Assets, Container, Graphics, Text, TextStyle } from 'pixi.js'
import { C, SEQ } from '../constants.js'

const WINS_BASE = `${SEQ}/Wins`
const WIN_SEQUENCE_CACHE = globalThis.__MERION_WIN_SEQUENCE_CACHE__ ?? new Map()
globalThis.__MERION_WIN_SEQUENCE_CACHE__ = WIN_SEQUENCE_CACHE

function pad(n) {
  return String(n).padStart(2, '0')
}

function createWinConfig(key, folder, prefix) {
  return {
    key,
    folder,
    prefix,
    urls: Array.from({ length: 46 }, (_, i) => `${WINS_BASE}/${folder}/${prefix}_${pad(i)}.png`),
    maxWidth: 530,
    maxHeight: 460,
    amountInsetX: 18,
    amountInsetY: 26,
  }
}

const WIN_POPUP = {
  total: createWinConfig('total', 'Total_Win', 'Total_Win'),
  big: createWinConfig('big', 'Big_Win', 'Big_Win'),
  mega: createWinConfig('mega', 'Mega_Win', 'Mega_Win'),
  super_mega: createWinConfig('super_mega', 'Super_MEga_Win', 'Super_Mega_Win'),
}

export function getWinTier(amount, bet) {
  const mult = amount / bet
  if (mult >= 30) return 'super_mega'
  if (mult >= 15) return 'mega'
  if (mult >= 5) return 'big'
  return 'total'
}

export function getWinPopupConfigByTier(tier) {
  return WIN_POPUP[tier] ?? null
}

export function getWinPopupUrls() {
  return Object.values(WIN_POPUP).flatMap(cfg => cfg.urls)
}

function getLoadedTextures(cfg) {
  return cfg.urls
    .map(url => Assets.get(url))
    .filter(texture => texture?.source)
}

export async function preloadWinPopupAsset(cfg) {
  if (!cfg) return []

  const cached = WIN_SEQUENCE_CACHE.get(cfg.key)
  if (cached) {
    return cached
  }

  if (cfg.urls.every(url => Assets.get(url))) {
    const ready = Promise.resolve(getLoadedTextures(cfg))
    WIN_SEQUENCE_CACHE.set(cfg.key, ready)
    return ready
  }

  const pending = Promise.all(cfg.urls.map(url => Assets.load(url)))
    .then(() => getLoadedTextures(cfg))
    .catch(error => {
      WIN_SEQUENCE_CACHE.delete(cfg.key)
      throw error
    })

  WIN_SEQUENCE_CACHE.set(cfg.key, pending)
  return pending
}

export async function ensureWinPopupAssets(amount, bet) {
  const cfg = getWinPopupConfigByTier(getWinTier(amount, bet))
  if (!cfg) return null
  await preloadWinPopupAsset(cfg)
  return cfg
}

export class WinPopup extends Container {
  constructor(amount, bet) {
    super()

    const tier = getWinTier(amount, bet)
    const cfg = getWinPopupConfigByTier(tier)
    const layout = this._buildSequence(cfg)

    if (layout) {
      this._addAmountLabel(amount, layout.amountX, layout.amountY)
    } else {
      this._buildFallback(amount, tier)
    }
  }

  _buildSequence(cfg) {
    try {
      const textures = getLoadedTextures(cfg)
      if (!textures.length) return null

      const animation = new AnimatedSprite(textures)
      animation.anchor.set(0.5)
      animation.loop = false
      animation.animationSpeed = 0.55

      const baseTexture = textures[0]
      const scale = Math.min(
        cfg.maxWidth / baseTexture.width,
        cfg.maxHeight / baseTexture.height,
        1
      )

      animation.scale.set(scale)
      animation.gotoAndPlay(0)
      this.addChild(animation)

      const bounds = animation.getLocalBounds()
      return {
        amountX: Math.round(bounds.x + bounds.width - cfg.amountInsetX),
        amountY: Math.round(bounds.y + cfg.amountInsetY),
      }
    } catch (error) {
      console.warn('[WinPopup] Sequence error:', error?.message, error)
      return null
    }
  }

  _addAmountLabel(amount, amountX, amountY) {
    const badge = new Container()
    badge.position.set(amountX, amountY)

    const caption = new Text({
      text: 'REAL WIN',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 12,
        fill: C.offWhite,
        letterSpacing: 1.4,
      }),
    })
    caption.anchor.set(1, 0)

    const valueText = `$ ${amount.toLocaleString('en-US')}`
    const fontSize = valueText.length >= 10 ? 26 : 30
    const value = new Text({
      text: valueText,
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize,
        fill: C.goldBright,
        stroke: { color: 0x5a2800, width: 5 },
        dropShadow: {
          color: C.black,
          alpha: 0.95,
          distance: 2,
          blur: 2,
          angle: Math.PI / 4,
        },
      }),
    })
    value.anchor.set(1, 0)
    value.y = 14

    const bgWidth = Math.max(190, Math.ceil(Math.max(caption.width, value.width) + 42))
    const bgHeight = Math.ceil(value.y + value.height + 18)

    const bg = new Graphics()
    bg.roundRect(-bgWidth, 0, bgWidth, bgHeight, 18)
      .fill({ color: 0x050505, alpha: 0.72 })
      .stroke({ color: C.white, alpha: 0.14, width: 2 })
    bg.rect(-bgWidth + 2, 2, bgWidth - 4, 6)
      .fill({ color: C.white, alpha: 0.08 })

    caption.position.set(-18, 10)
    value.position.set(-18, 24)

    badge.addChild(bg)
    badge.addChild(caption)
    badge.addChild(value)
    this.addChild(badge)
  }

  _buildFallback(amount, tier) {
    const labels = {
      total: 'TOTAL WIN',
      big: 'BIG WIN',
      mega: 'MEGA WIN',
      super_mega: 'SUPER MEGA WIN',
    }

    const bg = new Graphics()
    bg.roundRect(-240, -90, 480, 180, 20)
      .fill(C.metalDark)
      .stroke({ color: C.metalLight, width: 3 })
    this.addChild(bg)

    const label = new Text({
      text: labels[tier] ?? 'WIN',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 36,
        fill: C.white,
        stroke: { color: C.black, width: 5 },
      }),
    })
    label.anchor.set(0.5)
    label.y = -25
    this.addChild(label)

    const value = new Text({
      text: `$ ${amount.toLocaleString('en-US')}`,
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 46,
        fill: C.goldBright,
        stroke: { color: 0x5a2800, width: 6 },
      }),
    })
    value.anchor.set(0.5)
    value.y = 35
    this.addChild(value)
  }
}
