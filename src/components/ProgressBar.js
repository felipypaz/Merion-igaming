import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { C } from '../constants.js'

export class ProgressBar extends Container {
  constructor(x, y, width = 520, height = 34) {
    super()
    this.position.set(x - width / 2, y)
    this._w = width
    this._h = height
    this._progress = 0

    this._build()
  }

  _build() {
    const { _w: w, _h: h } = this
    const r = h / 2

    const shadow = new Graphics()
    shadow.roundRect(2, 2, w, h).fill({ color: C.black, alpha: 0.5 })
    this.addChild(shadow)

    const outer = new Graphics()
    outer.roundRect(0, 0, w, h, r).fill(C.metalDark)
    outer.roundRect(0, 0, w, h, r).stroke({ color: C.metalLight, width: 2 })
    this.addChild(outer)

    const track = new Graphics()
    track.roundRect(4, 4, w - 8, h - 8, r - 2).fill(0x090909)
    this.addChild(track)

    this._fill = new Graphics()
    this.addChild(this._fill)

    this._shine = new Graphics()
    this.addChild(this._shine)

    this._label = new Text({
      text: '0%',
      style: new TextStyle({
        fontFamily: 'GROBOLD, Arial Black, Arial',
        fontWeight: 'bold',
        fontSize: 14,
        fill: C.white,
        dropShadow: { color: C.black, alpha: 0.9, distance: 2, blur: 2, angle: Math.PI / 4 },
      }),
    })
    this._label.anchor.set(0.5)
    this._label.position.set(w / 2, h / 2 + 1)
    this.addChild(this._label)

    this._updateFill()
  }

  get progress() { return this._progress }

  set progress(value) {
    this._progress = Math.max(0, Math.min(1, value))
    this._updateFill()
    this._label.text = `${Math.round(this._progress * 100)}%`
  }

  _updateFill() {
    const { _w: w, _h: h } = this
    const pad = 4
    const innerH = h - pad * 2
    const r = innerH / 2
    const fillW = (w - pad * 2) * this._progress

    this._fill.clear()
    this._shine.clear()

    if (fillW < r * 2) return

    this._fill.roundRect(pad, pad, fillW, innerH, r).fill(C.barDark)
    const midW = fillW * 0.7
    this._fill.roundRect(pad + fillW * 0.15, pad + innerH * 0.15, midW, innerH * 0.7, r * 0.5)
      .fill({ color: C.barGreen, alpha: 0.9 })

    this._shine.roundRect(pad + 2, pad + 1, fillW - 4, innerH * 0.4, r * 0.4)
      .fill({ color: C.white, alpha: 0.18 })
  }
}
