import {
  Texture as _Texture,
  TextureSource as _TextureSource,
  Container as _Container,
  MeshSimple as _MeshSimple,
} from 'pixi.js'

Object.defineProperties(_TextureSource.prototype, {
  realWidth:  { get() { return this.pixelWidth  }, configurable: true, enumerable: false },
  realHeight: { get() { return this.pixelHeight }, configurable: true, enumerable: false },
  resolution: { get() { return this._resolution  }, configurable: true, enumerable: false },
  valid:      { get() { return true              }, configurable: true, enumerable: false },
})
if (!_TextureSource.prototype.dispose) {
  _TextureSource.prototype.dispose = function () { this.destroy() }
}
if (!_TextureSource.prototype.setSize) {
  _TextureSource.prototype.setSize = function () {}
}

if (!Object.getOwnPropertyDescriptor(_Texture.prototype, 'baseTexture')) {
  Object.defineProperty(_Texture.prototype, 'baseTexture', {
    get () { return this.source },
    configurable: true, enumerable: false,
  })
}
if (!Object.getOwnPropertyDescriptor(_Texture.prototype, '_uvs')) {
  Object.defineProperty(_Texture.prototype, '_uvs', {
    get () { return this.uvs },
    configurable: true, enumerable: false,
  })
}

if (!Object.getOwnPropertyDescriptor(_Container.prototype, 'transform')) {
  Object.defineProperty(_Container.prototype, 'transform', {
    get () {
      if (!this.__transformCompat) {
        const self = this
        this.__transformCompat = {
          setFromMatrix (m) { self.setFromMatrix(m) },
        }
      }
      return this.__transformCompat
    },
    configurable: true, enumerable: false,
  })
}

export class Texture extends _Texture {
  constructor (sourceOrOpts, frame, orig, trim, rotate) {
    if (frame !== undefined) {
      super({ source: sourceOrOpts, frame, orig, trim, rotate })
    } else {
      super(sourceOrOpts)
    }
  }
}

export class SimpleMesh extends _MeshSimple {
  constructor (textureOrOpts, vertices, uvs, indices, drawMode) {
    if (vertices !== undefined) {
      super({
        texture:  textureOrOpts,
        vertices: vertices instanceof Float32Array ? vertices : new Float32Array(vertices || []),
        uvs:      uvs instanceof Float32Array      ? uvs      : new Float32Array(uvs || []),
        indices:  indices instanceof Uint16Array   ? indices  : new Uint16Array(indices || []),
        topology: drawMode ?? 'triangle-list',
      })
    } else {
      super(textureOrOpts)
    }
  }
}

export * from 'pixi.js'

export { MeshSimple } from 'pixi.js'

export const BLEND_MODES = {
  NORMAL:   'normal',
  ADD:      'add',
  MULTIPLY: 'multiply',
  SCREEN:   'screen',
  OVERLAY:  'overlay',
  DARKEN:   'darken',
  LIGHTEN:  'lighten',
  0: 'normal', 1: 'add', 2: 'multiply', 3: 'screen',
}

export const MIPMAP_MODES = {
  NONE:       'off',
  POW2:       'on-demand',
  ON:         'on',
  ON_MANUAL:  'on',
  0: 'off', 1: 'on-demand', 2: 'on', 3: 'on',
}

export const ALPHA_MODES = {
  NPM:                    'no-premultiply-alpha',
  UNPACK:                 'premultiply-alpha-on-upload',
  PMA:                    'premultiply-alpha-on-upload',
  NO_PREMULTIPLIED_ALPHA: 'no-premultiply-alpha',
  PREMULTIPLY_ON_UPLOAD:  'premultiply-alpha-on-upload',
  PREMULTIPLIED_ALPHA:    'premultiply-alpha-on-upload',
  0: 'no-premultiply-alpha', 1: 'premultiply-alpha-on-upload', 2: 'premultiply-alpha-on-upload',
}

export const utils = {
  rgb2hex ([r, g, b]) {
    return ((Math.round(r * 255) & 0xFF) << 16)
         | ((Math.round(g * 255) & 0xFF) << 8)
         |  (Math.round(b * 255) & 0xFF)
  },
  hex2rgb (hex, out = [0, 0, 0]) {
    out[0] = ((hex >> 16) & 0xFF) / 255
    out[1] = ((hex >> 8)  & 0xFF) / 255
    out[2] =  (hex        & 0xFF) / 255
    return out
  },
  path: {
    sep: '/',
    extname (url)          { const i = url.lastIndexOf('.'); return i < 0 ? '' : url.slice(i) },
    basename (url, ext='') { const n = url.split('/').pop() ?? ''; return ext && n.endsWith(ext) ? n.slice(0, -ext.length) : n },
    dirname (url)          { const p = url.split('/'); p.pop(); return p.join('/') },
    normalize (url) {
      const isAbs = url.startsWith('/')
      const parts = url.split('/').filter(p => p !== '' && p !== '.')
      const out = []
      for (const p of parts) {
        if (p === '..' && out.length > 0) out.pop()
        else out.push(p)
      }
      return (isAbs ? '/' : '') + out.join('/')
    },
  },
}

export const settings = {
  ADAPTER: { fetch: (...args) => globalThis.fetch(...args) },
}
