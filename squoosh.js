import module from 'node:module'
import * as path from 'node:path'
import url from 'node:url'
import os from 'node:os'
import fs from 'node:fs/promises'
import isJpeg from 'is-jpg'
import isWebp from 'is-webp'
import isPng from 'is-png'

const LIB_SQUOOSH_HACK_CODE = 'var fetch;'

async function importLibrarySquoosh() {
  const libsquooshEntry = module
    .createRequire(import.meta.url)
    .resolve('@frostoven/libsquoosh')
  const content = await fs.readFile(libsquooshEntry, 'utf8')

  if (!content.startsWith(LIB_SQUOOSH_HACK_CODE)) {
    await fs.writeFile(libsquooshEntry, LIB_SQUOOSH_HACK_CODE + content)
  }

  return import(url.pathToFileURL(libsquooshEntry).href)
}

const encoders = new Map([
  ['.jpg', {id: 'mozjpeg', test: isJpeg}],
  ['.jpeg', {id: 'mozjpeg', test: isJpeg}],
  ['.webp', {id: 'webp', test: isWebp}],
  // ['.avif', {id: 'avif'}],
  // [
  //   '.jxl',
  //   {
  //     id: 'jxl',
  //     options: {effort: 7, photonNoiseIso: 0, lossyModular: false},
  //   },
  // ],
  // ['.wp2', {id:'wp2'}],
  ['.png', {id: 'oxipng', test: isPng}],
])

function getEncoder(filename) {
  return encoders.get(path.extname(filename).toLowerCase())
}

/**
 * @param {{content: Buffer, name: string}[]} files
 * @returns {Uint8Array[]}
 */
async function squooshImages(files, {cache, onFileExtensionError}) {
  if (files.length === 0) {
    return []
  }

  let imagePoolLoadPromise
  let imagePool

  function getImagePool() {
    imagePoolLoadPromise ??= (async () => {
      const {ImagePool} = await importLibrarySquoosh()
      imagePool = new ImagePool(os.cpus().length)
      return imagePool
    })()

    return imagePoolLoadPromise
  }

  let result

  try {
    result = await Promise.all(
      files.map(async ({content: original, name, _image}) => {
        const encoder = getEncoder(name)
        if (!encoder) {
          return original
        }

        const cached = cache.getCachedData(original)

        if (cached) {
          return cached
        }

        if (onFileExtensionError && !encoder.test(original)) {
          onFileExtensionError(_image)
        }

        const imagePool = await getImagePool()
        const image = imagePool.ingestImage(original)
        await image.encode({
          [encoder.id]: encoder.options,
        })
        const result = await image.encodedWith[encoder.id]
        const compressed = result.binary
        const data = compressed.length < original.length ? compressed : original

        return data
      }),
    )
  } finally {
    await imagePool?.close()
  }

  return result
}

const isSupportedImage = (filename) => Boolean(getEncoder(filename))

export {squooshImages, isSupportedImage}
