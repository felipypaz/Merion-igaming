import { Container, Assets, Sprite } from 'pixi.js'
import { getFreeSpinsPopupUrls } from '../components/FreeSpinsPopup.js'
import { ProgressBar } from '../components/ProgressBar.js'
import { FoxCharacter, getIdleUrls, getWinUrls } from '../components/FoxCharacter.js'
import { getSymbolUrls } from '../components/SlotGrid.js'
import { getWinPopupUrls } from '../components/WinPopup.js'
import { animate, delay } from '../tween.js'
import { W, H, BASE } from '../constants.js'

const BAR_CX = Math.round(((522 + 1300) / 2) * (1280 / 1920))
const BAR_CY = Math.round(((590 + 702) / 2) * (720 / 1080))
const BAR_W = Math.round((1300 - 522) * (1280 / 1920))
const BAR_H = 34

const FOX_CX = Math.round(((1243 + 1695) / 2) * (1280 / 1920))
const FOX_BOT = Math.round(986 * (720 / 1080))

async function loadOne(url) {
  try {
    await Assets.load(url)
  } catch {
  }
}

async function loadBatch(urls, onEach, concurrency = 8) {
  let idx = 0

  const worker = async () => {
    while (idx < urls.length) {
      await loadOne(urls[idx++])
      onEach()
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))
}

export class PreloaderScene extends Container {
  constructor() {
    super()
  }

  async start() {
    const bg = Sprite.from('/slot-assets/PSD/MAIN%20GAME/preloader.png')
    bg.width = W
    bg.height = H
    this.addChild(bg)

    const bar = new ProgressBar(BAR_CX, BAR_CY - BAR_H / 2, BAR_W, BAR_H)
    this.addChild(bar)

    const fontUrl = `${BASE}/PSD/MAIN%20GAME/GROBOLD%20(1).TTF`
    const foxIdle = getIdleUrls()
    const foxWin = getWinUrls()
    const symbolUrls = getSymbolUrls()
    const winPopupUrls = getWinPopupUrls()
    const freeSpinPopupUrls = getFreeSpinsPopupUrls()

    const total = 1 + foxIdle.length + foxWin.length + symbolUrls.length + winPopupUrls.length + freeSpinPopupUrls.length
    let loaded = 0
    const tick = () => {
      bar.progress = Math.min(1, ++loaded / total)
    }

    try {
      await Assets.load({ alias: 'GROBOLD', src: fontUrl, data: { family: 'GROBOLD' } })
    } catch (error) {
      console.warn('[Preloader] font failed:', error?.message)
    }
    tick()

    await loadBatch(foxIdle, tick, 8)

    const fox = new FoxCharacter()
    fox.scale.set(0.83)
    fox.position.set(FOX_CX, FOX_BOT)
    fox.alpha = 0
    fox.init()
    this.addChild(fox)
    animate({ from: 0, to: 1, duration: 0.3, onUpdate: v => { fox.alpha = v } })

    await loadBatch([...foxWin, ...symbolUrls], tick, 8)
    await loadBatch(winPopupUrls, tick, 8)
    await loadBatch(freeSpinPopupUrls, tick, 4)

    await new Promise(resolve =>
      animate({
        from: bar.progress,
        to: 1,
        duration: 0.35,
        onUpdate: v => { bar.progress = v },
        onComplete: resolve,
      })
    )

    await delay(700)
    this.emit('complete')
  }

  fadeOut(onDone) {
    animate({ from: 1, to: 0, duration: 0.5, onUpdate: v => { this.alpha = v }, onComplete: onDone })
  }
}
