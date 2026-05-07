import { Assets, Container, Graphics, Sprite } from 'pixi.js'

export const FREE_SPINS_POPUP_URL = '/slot-assets/PSD/POP%20UPS/FREE_SPINS_8.png'

let popupAssetPromise = globalThis.__MERION_FREE_SPINS_POPUP_ASSET__ ?? null
globalThis.__MERION_FREE_SPINS_POPUP_ASSET__ = popupAssetPromise

export function getFreeSpinsPopupUrls() {
  return [FREE_SPINS_POPUP_URL]
}

export async function preloadFreeSpinsPopupAsset() {
  if (popupAssetPromise) {
    return popupAssetPromise
  }

  popupAssetPromise = Assets.load(FREE_SPINS_POPUP_URL)
    .catch(error => {
      popupAssetPromise = null
      globalThis.__MERION_FREE_SPINS_POPUP_ASSET__ = null
      throw error
    })

  globalThis.__MERION_FREE_SPINS_POPUP_ASSET__ = popupAssetPromise
  return popupAssetPromise
}

export async function ensureFreeSpinsPopupAsset() {
  return preloadFreeSpinsPopupAsset()
}

export class FreeSpinsPopup extends Container {
  constructor() {
    super()

    const shadow = new Graphics()
    shadow.ellipse(0, 36, 320, 110)
      .fill({ color: 0x000000, alpha: 0.26 })
    this.addChild(shadow)

    const sprite = Sprite.from(FREE_SPINS_POPUP_URL)
    sprite.anchor.set(0.5)

    const maxWidth = 860
    const maxHeight = 470
    const scale = Math.min(
      maxWidth / sprite.texture.width,
      maxHeight / sprite.texture.height,
      1
    )
    sprite.scale.set(scale)
    this.addChild(sprite)
  }
}
