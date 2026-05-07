import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { C } from '../constants.js'

export class GameLogo extends Container {
  constructor(x, y, scale = 1) {
    super()
    this.position.set(x, y)
    this._build(scale)
  }

  _build(s) {
    const fontSize = Math.round(88 * s)
    const strokeW  = Math.round(10 * s)
    const shadowD  = Math.round(8 * s)

    const banner = new Graphics()
    const bw = Math.round(460 * s)
    const bh = Math.round(90 * s)
    banner.roundRect(-bw / 2, -bh / 2 - 4, bw, bh + 8, 12).fill({ color: 0x1a0e00, alpha: 0.55 })
    banner.roundRect(-bw / 2, -bh / 2 - 4, bw, bh + 8, 12).stroke({ color: C.gold, width: 2, alpha: 0.7 })
    this.addChild(banner)

    const shadow = new Text({
      text: 'GAME LOGO',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize,
        fill: 0x000000,
        align: 'center',
      }),
    })
    shadow.anchor.set(0.5)
    shadow.position.set(shadowD, shadowD)
    shadow.alpha = 0.7
    this.addChild(shadow)

    const textBase = new Text({
      text: 'GAME LOGO',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize,
        fill: C.gold,
        stroke: { color: 0x5a2800, width: strokeW },
        align: 'center',
        dropShadow: {
          color: 0x000000,
          alpha: 0.6,
          angle: Math.PI / 4,
          distance: shadowD,
          blur: 6,
        },
      }),
    })
    textBase.anchor.set(0.5)
    this.addChild(textBase)

    const textTop = new Text({
      text: 'GAME LOGO',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize,
        fill: C.goldBright,
        align: 'center',
      }),
    })
    textTop.anchor.set(0.5)
    textTop.position.set(0, -Math.round(fontSize * 0.18))
    textTop.alpha = 0.45
    textTop.scale.y = 0.4
    this.addChild(textTop)

    const lineLen = Math.round(30 * s)
    const lineY = Math.round(2 * s)
    const lineX = Math.round(220 * s)
    const deco = new Graphics()
    deco.rect(-lineX - lineLen, lineY, lineLen, 3).fill({ color: C.goldBright, alpha: 0.8 })
    deco.rect(lineX, lineY, lineLen, 3).fill({ color: C.goldBright, alpha: 0.8 })
    this.addChild(deco)
  }
}
