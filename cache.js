import fs from 'node:fs'
import * as path from 'node:path'
import crypto from 'node:crypto'
import process from 'node:process'
import packageJson from './package-json-proxy.cjs'
import temporaryDirectory from 'temp-dir'
import iterateDirectoryUp from 'iterate-directory-up'

function hashFile({content, name}) {
  // eslint-disable-next-line sonarjs/hashing
  return crypto.createHash('sha1').update(name).update(content).digest('hex')
}

function hashString(content) {
  // eslint-disable-next-line sonarjs/hashing
  return crypto.createHash('sha1').update(content).digest('hex')
}

function getCacheDirectory(root) {
  const directoryName = hashString(root)

  for (const directory of iterateDirectoryUp(root)) {
    if (fs.existsSync(path.join(directory, 'node_modules'))) {
      return path.join(
        directory,
        `node_modules/.cache/${packageJson.name}/${directoryName}/`,
      )
    }

    if (fs.existsSync(path.join(directory, '.git'))) {
      break
    }
  }

  return path.join(temporaryDirectory, `${packageJson.name}/${directoryName}/`)
}

class Cache {
  #root

  #cacheDirectory

  #metaFile

  #files

  #updated = new Map()

  constructor() {
    this.#root = process.cwd()

    this.#cacheDirectory = getCacheDirectory(process.cwd())

    this.#metaFile = path.join(this.#cacheDirectory, 'meta.json')

    this.#files = this.#load() ?? new Set()
  }

  #load() {
    let data
    try {
      data = JSON.parse(fs.readFileSync(this.#metaFile))
    } catch {}

    if (
      !data ||
      data.version !== packageJson.version ||
      data.root !== this.#root ||
      !Array.isArray(data.files)
    ) {
      try {
        fs.rmSync(this.#cacheDirectory, {recursive: true})
      } catch {}
      return
    }

    return new Set(data.files)
  }

  getCachedData(file) {
    if (this.#files.size === 0 && this.#updated.size === 0) {
      return
    }

    const fileHash = hashFile(file)

    if (this.#updated.has(fileHash)) {
      return this.#updated.get(fileHash)
    }

    if (!this.#files.has(fileHash)) {
      return
    }

    let data
    try {
      data = fs.readFileSync(path.join(this.#cacheDirectory, fileHash))
    } catch {}

    if (!data) {
      return
    }

    this.#updated.set(fileHash, data)

    return data
  }

  updateCache(file, data) {
    const fileHash = hashFile(file)
    this.#updated.set(fileHash, data)
  }

  writeFile() {
    fs.mkdirSync(this.#cacheDirectory, {recursive: true})

    for (const [fileHash, data] of this.#updated) {
      fs.writeFileSync(path.join(this.#cacheDirectory, fileHash), data)
    }

    fs.writeFileSync(
      this.#metaFile,
      JSON.stringify(
        {
          version: packageJson.version,
          root: this.#root,
          files: [...new Set([...this.#files, ...this.#updated.keys()])],
          time: new Date(),
        },
        undefined,
        2,
      ),
    )
  }
}

export default Cache
