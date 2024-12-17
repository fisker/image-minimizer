import * as path from 'node:path'
import {isSvgFile} from './utilities.js'
import {isSupportedImage, squooshImages} from './squoosh.js'
import optimizeSvg from './svgo.js'
import Cache from './cache.js'
import isSvg from 'is-svg'

const getFileExtensionErrorMessage = (image) =>
  `'${image.path ?? image.name}' is not a valid '${path.extname(image.path ?? image.name)}' file.`

const onFileExtensionErrorHandlers = new Map([
  [
    'warn',
    (image) => {
      console.warn(getFileExtensionErrorMessage(image))
    },
  ],
  [
    'error',
    (image) => {
      throw Object.assign(new Error(getFileExtensionErrorMessage(image)), {
        image,
      })
    },
  ],
])

class ImageMinimizer {
  #onFileExtensionError

  #cache

  constructor(options) {
    let onFileExtensionError = options?.onFileExtensionError
    const shouldEnableCache = options?.cache !== false

    if (
      typeof onFileExtensionError === 'string' &&
      onFileExtensionErrorHandlers.has(onFileExtensionError)
    ) {
      onFileExtensionError =
        onFileExtensionErrorHandlers.get(onFileExtensionError)
    }

    this.#onFileExtensionError = onFileExtensionError
    this.#cache = shouldEnableCache
      ? new Cache()
      : {
          getCachedData() {},
          updateCache() {},
          writeFile() {},
        }
  }

  async process(images) {
    const result = new WeakMap()

    await this.#minifyWithSquoosh(result, images)
    await this.#minifySvg(result, images)

    this.#cache.writeFile()

    return images.map((file) => result.get(file) || file.content)
  }

  async #minifyWithSquoosh(result, images) {
    images = images.filter((image) => isSupportedImage(image.name))

    if (images.length === 0) {
      return
    }

    const compressedImages = await squooshImages(images, {
      cache: this.#cache,
      onFileExtensionErrorHandlers: this.#onFileExtensionError,
    })

    for (const [index, image] of images.entries()) {
      const compressed = compressedImages[index]

      this.#cache.updateCache(image, compressed)
      result.set(image, compressed)
    }
  }

  async #minifySvg(result, images) {
    images = images.filter((image) => isSvgFile(image.name))

    for (const image of images) {
      const original = image.content

      let compressed = this.#cache.getCachedData(image)
      if (!compressed) {
        if (this.#onFileExtensionError && !isSvg(String(original))) {
          this.#onFileExtensionError(image)
        }

        compressed = optimizeSvg(original, {multipass: true})
      }

      this.#cache.updateCache(image, compressed)
      result.set(image, compressed)
    }
  }
}

async function minifyImages(imageOrImages, options) {
  const isArray = Array.isArray(imageOrImages)

  const imageMinimizer = new ImageMinimizer(options)
  const compressed = await imageMinimizer.process(
    isArray ? imageOrImages : [imageOrImages],
  )

  return isArray ? compressed : compressed[0]
}

export default minifyImages
