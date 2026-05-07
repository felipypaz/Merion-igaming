import { Application, Assets } from 'pixi.js'
import { MainGameScene } from './scenes/MainGameScene.js'
import { PreloaderScene } from './scenes/PreloaderScene.js'

async function boot() {
  const app = new Application()

  await app.init({
    width: 1280,
    height: 720,
    backgroundColor: 0x080503,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  })

  document.body.appendChild(app.canvas)

  function resize() {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    app.canvas.style.width = `${Math.round(1280 * scale)}px`
    app.canvas.style.height = `${Math.round(720 * scale)}px`
  }

  window.addEventListener('resize', resize)
  resize()

  await Assets.load([
    '/slot-assets/PSD/MAIN%20GAME/preloader.png',
    '/slot-assets/PSD/MAIN%20GAME/background.png',
  ])

  const preloader = new PreloaderScene()
  app.stage.addChild(preloader)

  preloader.once('complete', () => {
    const main = new MainGameScene()
    app.stage.addChild(main)
    main.fadeIn()
    main.start().catch(error => {
      console.error('[Main] Scene start error:', error)
    })

    preloader.fadeOut(() => {
      app.stage.removeChild(preloader)
      preloader.destroy({ children: true })
    })
  })

  preloader.start().catch(error => {
    console.error('[Main] Preloader error:', error)
    preloader.emit('complete')
  })
}

boot().catch(error => {
  console.error('[Main] Boot error:', error)
})
