import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { W, H, C } from '../constants.js'

export class Background extends Container {
  constructor() {
    super()
    this._draw()
  }

  _draw() {
    this._drawSky()
    this._drawWalls()
    this._drawFloor()
    this._drawChandelier()
    this._drawVault()
    this._drawGoldDecor()
  }

  _drawSky() {
    const g = new Graphics()
    g.rect(0, 0, W, H).fill(C.bgDeep)
    g.rect(0, 60, W, H * 0.65).fill(C.bgDark)
    g.rect(0, 0, W, 80).fill(0x1e0f03)
    this.addChild(g)
  }

  _drawWalls() {
    const g = new Graphics()

    g.rect(0, 60, 220, H - 180).fill(C.wall)
    g.rect(10, 70, 200, H - 200).fill(C.wallLight)
    g.rect(20, 80, 180, H - 220).fill(C.wall)
    for (let y = 100; y < H - 180; y += 80) {
      g.rect(22, y, 176, 2).fill({ color: C.wallGold, alpha: 0.35 })
    }

    g.rect(W - 220, 60, 220, H - 180).fill(C.wall)
    g.rect(W - 210, 70, 200, H - 200).fill(C.wallLight)
    g.rect(W - 200, 80, 180, H - 220).fill(C.wall)
    for (let y = 100; y < H - 180; y += 80) {
      g.rect(W - 198, y, 176, 2).fill({ color: C.wallGold, alpha: 0.35 })
    }

    g.rect(0, 55, W, 10).fill(C.wallGold)
    g.rect(0, 60, W, 3).fill({ color: C.goldBright, alpha: 0.6 })

    g.rect(0, H - 130, W, 8).fill(C.wallGold)
    g.rect(0, H - 126, W, 2).fill({ color: C.goldBright, alpha: 0.5 })

    this.addChild(g)
  }

  _drawFloor() {
    const g = new Graphics()
    g.rect(0, H - 130, W, 130).fill(C.floor)
    for (let y = H - 120; y < H; y += 18) {
      g.rect(0, y, W, 1).fill({ color: C.floorLine, alpha: 0.6 })
    }
    g.rect(0, H - 130, W, 4).fill({ color: C.goldBright, alpha: 0.2 })
    this.addChild(g)
  }

  _drawChandelier() {
    const g = new Graphics()
    const cx = W / 2
    const cy = 30

    g.rect(cx - 3, 0, 6, 50).fill(C.metalMid)

    g.ellipse(cx, cy + 50, 60, 20).fill(C.gold)
    g.ellipse(cx, cy + 50, 55, 17).fill(C.goldBright)

    for (let i = -2; i <= 2; i++) {
      const ax = cx + i * 22
      g.rect(ax - 2, cy + 38, 4, 30).fill(C.metalMid)
      g.circle(ax, cy + 72, 6).fill(C.goldBright)
      g.circle(ax, cy + 72, 4).fill(C.goldLight)
    }

    const glowColors = [
      { r: 380, alpha: 0.04, color: C.goldLight },
      { r: 280, alpha: 0.05, color: C.goldBright },
      { r: 180, alpha: 0.06, color: C.goldLight },
      { r: 100, alpha: 0.08, color: C.goldBright },
    ]
    for (const { r, alpha, color } of glowColors) {
      g.ellipse(cx, cy + 80, r, r * 0.5).fill({ color, alpha })
    }

    this.addChild(g)
  }

  _drawVault() {
    const g = new Graphics()
    const cx = 155
    const cy = 340
    const R = 115

    g.ellipse(cx, cy, R + 30, R + 30).fill({ color: C.bgDeep, alpha: 0.6 })

    g.circle(cx, cy, R + 18).fill(C.metalDark)
    g.circle(cx, cy, R + 12).fill(C.metalMid)
    g.circle(cx, cy, R + 6).fill(C.metal)
    g.circle(cx, cy, R + 2).fill(C.metalLight)
    g.circle(cx, cy, R).fill(C.metalDark)

    g.circle(cx, cy, R - 8).fill(0x252525)

    g.circle(cx, cy, R - 20).fill({ color: C.metalMid, alpha: 0 })
    g.circle(cx, cy, R - 20).stroke({ color: C.metalLight, width: 2, alpha: 0.7 })
    g.circle(cx, cy, R - 40).stroke({ color: C.metalLight, width: 1.5, alpha: 0.5 })

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18)
      g.lineTo(cx + Math.cos(a) * (R - 22), cy + Math.sin(a) * (R - 22))
    }
    g.stroke({ color: C.metalLight, width: 3, alpha: 0.8 })

    g.circle(cx, cy, 14).fill(C.metalLight)
    g.circle(cx, cy, 10).fill(C.metalMid)
    g.circle(cx, cy, 6).fill(C.gold)

    g.rect(cx - 7, cy - R + 28, 14, (R - 28) * 2)
      .fill(C.metalLight)
    g.circle(cx, cy - R + 28, 10).fill(C.metalLight)
    g.circle(cx, cy + R - 28, 10).fill(C.metalLight)

    this.addChild(g)

    const sign = new Graphics()
    sign.roundRect(cx - 52, cy - R - 52, 104, 30, 4).fill(C.gold)
    sign.roundRect(cx - 50, cy - R - 50, 100, 26, 3).fill(0x5a3800)
    this.addChild(sign)

    const label = new Text({
      text: 'VAULT #1',
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 14,
        fill: C.goldBright,
        letterSpacing: 1,
      }),
    })
    label.anchor.set(0.5)
    label.position.set(cx, cy - R - 37)
    this.addChild(label)
  }

  _drawGoldDecor() {
    const g = new Graphics()

    const bars = [
      [50, 572, 75, 26],
      [35, 592, 78, 26],
      [62, 612, 70, 24],
    ]
    for (const [x, y, w, h] of bars) {
      g.rect(x, y, w, h).fill(C.gold)
      g.rect(x + 2, y + 2, w - 4, 6).fill({ color: C.goldLight, alpha: 0.5 })
      g.rect(x, y, w, h).stroke({ color: C.goldBright, width: 1 })
    }

    const bags = [[1185, 580, 28], [1215, 592, 22], [1160, 596, 20]]
    for (const [bx, by, br] of bags) {
      g.circle(bx, by, br).fill(0x6b3d0c)
      g.circle(bx, by - br * 0.5, br * 0.4).fill(0x8b5010)
      g.circle(bx, by + br * 0.1, br * 0.7).fill({ color: C.gold, alpha: 0.25 })
    }

    const dollar = new Text({
      text: '$',
      style: new TextStyle({ fontFamily: 'Arial Black', fontWeight: 'bold', fontSize: 22, fill: C.goldBright }),
    })
    dollar.anchor.set(0.5)
    dollar.position.set(1185, 580)
    this.addChild(dollar)

    const coins = [
      [80, 635, 10], [110, 645, 8], [55, 650, 7], [140, 638, 9],
      [1150, 640, 8], [1200, 632, 10], [1230, 648, 7],
    ]
    for (const [cx, cy, cr] of coins) {
      g.circle(cx, cy, cr).fill(C.gold)
      g.circle(cx, cy, cr).stroke({ color: C.goldBright, width: 1 })
      g.circle(cx - cr * 0.2, cy - cr * 0.2, cr * 0.3).fill({ color: C.goldLight, alpha: 0.6 })
    }

    this.addChild(g)
  }
}
