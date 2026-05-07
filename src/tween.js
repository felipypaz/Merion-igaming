export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function easeIn(t) {
  return t * t * t
}

export function animate({ from = 0, to = 1, duration = 1, ease = easeInOut, onUpdate, onComplete }) {
  let rafId
  const start = performance.now()

  function tick(now) {
    const t = Math.min((now - start) / (duration * 1000), 1)
    onUpdate(from + (to - from) * ease(t))
    if (t < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      onComplete?.()
    }
  }

  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
