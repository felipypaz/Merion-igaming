import { Container, AnimatedSprite, Assets, Texture } from 'pixi.js'
import { SEQ } from '../constants.js'

const IDLE_BASE = `${SEQ}/Character/Idle`
const WIN_BASE  = `${SEQ}/Character/Win`

function pad(n) { return String(n).padStart(2, '0') }

export function getIdleUrls() {
  return Array.from({ length: 61 }, (_, i) => `${IDLE_BASE}/Idle_${pad(i)}.png`)
}

export function getWinUrls() {
  return Array.from({ length: 61 }, (_, i) => `${WIN_BASE}/Win_${pad(i)}.png`)
}

function getTextures(urls) {
  const textures = urls.map(u => Assets.get(u)).filter(Boolean)
  return textures.length > 0 ? textures : [Texture.WHITE]
}

export class FoxCharacter extends Container {
  constructor() {
    super()
    this._idle = null
    this._win  = null
  }

  init() {
    const idleFrames = getTextures(getIdleUrls())
    const winFrames  = getTextures(getWinUrls())

    this._idle = new AnimatedSprite(idleFrames)
    this._idle.animationSpeed = 0.45
    this._idle.loop = true
    this._idle.anchor.set(0.5, 1)
    this.addChild(this._idle)

    this._win = new AnimatedSprite(winFrames)
    this._win.animationSpeed = 0.5
    this._win.loop = false
    this._win.anchor.set(0.5, 1)
    this._win.visible = false
    this._win.onComplete = () => this.playIdle()
    this.addChild(this._win)

    this.playIdle()
  }

  playIdle() {
    if (!this._idle) return
    if (this._win) { this._win.stop(); this._win.visible = false }
    this._idle.visible = true
    this._idle.gotoAndPlay(0)
  }

  playWin() {
    if (!this._win) return
    this._idle.stop(); this._idle.visible = false
    this._win.visible = true
    this._win.gotoAndPlay(0)
  }
}
