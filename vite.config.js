import { defineConfig } from 'vite'
import { createReadStream, existsSync } from 'fs'
import { join, extname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dir = fileURLToPath(new URL('.', import.meta.url))
const ASSETS_DIR = join(__dir, 'BANK ROBERRY SLOT')
const COMPAT     = resolve(__dir, 'src/compat/pixi7-compat.js')

const MIME = {
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.ttf':   'font/truetype',
  '.otf':   'font/opentype',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.atlas': 'text/plain',
  '.json':  'application/json',
  '.skel':  'application/octet-stream',
  '.mp4':   'video/mp4',
}

export default defineConfig({
  // Map PixiJS 7 scoped packages → PixiJS 8 with compat shim
  resolve: {
    alias: {
      '@pixi/core':        COMPAT,
      '@pixi/display':     COMPAT,
      '@pixi/graphics':    COMPAT,
      '@pixi/mesh':        COMPAT,
      '@pixi/mesh-extras': COMPAT,
      '@pixi/sprite':      COMPAT,
      '@pixi/assets':      COMPAT,
    },
  },
  plugins: [
    {
      name: 'serve-slot-assets',
      configureServer(server) {
        server.middlewares.use('/slot-assets', (req, res, next) => {
          let decoded = decodeURIComponent(req.url.split('?')[0])

          // Spine binary skeletons are saved as .json but pixi-spine loads them as .skel
          // Redirect: .skel → .json (same binary content, just allows the binary parser)
          let filePath = join(ASSETS_DIR, decoded)
          if (!existsSync(filePath) && decoded.endsWith('.skel')) {
            const jsonPath = join(ASSETS_DIR, decoded.slice(0, -5) + '.json')
            if (existsSync(jsonPath)) filePath = jsonPath
          }

          if (!existsSync(filePath)) {
            console.warn('[assets] 404:', decoded)
            return next()
          }

          const ext  = extname(filePath).toLowerCase()
          const requestedExt = extname(decoded).toLowerCase()
          // If requested as .skel, serve as binary regardless of actual file extension
          const mime = requestedExt === '.skel'
            ? 'application/octet-stream'
            : (MIME[ext] ?? 'application/octet-stream')

          res.setHeader('Content-Type', mime)
          res.setHeader('Cache-Control', 'public, max-age=3600')
          res.setHeader('Access-Control-Allow-Origin', '*')

          const stream = createReadStream(filePath)
          stream.on('error', (err) => {
            console.error('[assets] stream error:', err.message, filePath)
            if (!res.headersSent) res.writeHead(500)
            res.end()
          })
          stream.pipe(res)
        })
      },
    },
  ],
})
