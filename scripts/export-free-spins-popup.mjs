import fs from 'node:fs/promises'
import path from 'node:path'
import PSD from 'psd'
import { PNG } from 'pngjs'

const INPUT = path.resolve('BANK ROBERRY SLOT/PSD/POP UPS/POP UPS.psd')
const OUTPUT = path.resolve('BANK ROBERRY SLOT/PSD/POP UPS/FREE_SPINS_8.png')
const POPUP_PATH = ['POPUP 2']

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function blendPixel(dst, src, opacity = 1) {
  const srcAlpha = (src[3] / 255) * opacity
  const dstAlpha = dst[3] / 255
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha)

  if (outAlpha <= 0) {
    return [0, 0, 0, 0]
  }

  const out = [0, 0, 0, 0]
  for (let i = 0; i < 3; i++) {
    const srcColor = src[i] / 255
    const dstColor = dst[i] / 255
    const outColor = (
      srcColor * srcAlpha +
      dstColor * dstAlpha * (1 - srcAlpha)
    ) / outAlpha
    out[i] = clampByte(outColor * 255)
  }
  out[3] = clampByte(outAlpha * 255)
  return out
}

function collectVisibleLayers(node) {
  if (!node?.visible?.()) return []

  if (node.isLayer?.()) {
    if (node.width <= 0 || node.height <= 0) return []
    return [node]
  }

  if (!node.children) return []

  const output = []
  const children = node.children().slice().reverse()
  for (const child of children) {
    output.push(...collectVisibleLayers(child))
  }
  return output
}

function drawLayer(canvas, layer, originLeft, originTop) {
  const png = layer.toPng()
  const opacity = Number(layer.layer.opacity ?? 255) / 255
  const offsetX = layer.left - originLeft
  const offsetY = layer.top - originTop

  for (let y = 0; y < png.height; y++) {
    const targetY = offsetY + y
    if (targetY < 0 || targetY >= canvas.height) continue

    for (let x = 0; x < png.width; x++) {
      const targetX = offsetX + x
      if (targetX < 0 || targetX >= canvas.width) continue

      const srcIndex = (png.width * y + x) * 4
      const dstIndex = (canvas.width * targetY + targetX) * 4

      const src = [
        png.data[srcIndex],
        png.data[srcIndex + 1],
        png.data[srcIndex + 2],
        png.data[srcIndex + 3],
      ]

      if (src[3] === 0) continue

      const dst = [
        canvas.data[dstIndex],
        canvas.data[dstIndex + 1],
        canvas.data[dstIndex + 2],
        canvas.data[dstIndex + 3],
      ]

      const out = blendPixel(dst, src, opacity)
      canvas.data[dstIndex] = out[0]
      canvas.data[dstIndex + 1] = out[1]
      canvas.data[dstIndex + 2] = out[2]
      canvas.data[dstIndex + 3] = out[3]
    }
  }
}

async function main() {
  const psd = PSD.fromFile(INPUT)
  psd.parse()

  const popup = psd.tree().childrenAtPath(POPUP_PATH)[0]
  if (!popup) {
    throw new Error(`Popup path not found: ${POPUP_PATH.join('/')}`)
  }

  const canvas = new PNG({
    width: popup.width,
    height: popup.height,
    colorType: 6,
    inputHasAlpha: true,
  })

  for (const layer of collectVisibleLayers(popup)) {
    drawLayer(canvas, layer, popup.left, popup.top)
  }

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true })
  const buffer = PNG.sync.write(canvas)
  await fs.writeFile(OUTPUT, buffer)

  console.log(`Exported ${OUTPUT}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
