import url from 'node:url'
import fs from 'node:fs/promises'
import {expect, test} from 'vitest'
import prettyBytes from 'pretty-bytes'
import minifyImages from './index.js'
import path from 'node:path'

const FIXTURES_DIRECTORY = new URL('./fixtures/', import.meta.url)
const prettySize = (size) => `${prettyBytes(size)} (${size})`

async function run() {
  let files = await fs.readdir(FIXTURES_DIRECTORY, {
    withFileTypes: true,
    recursive: true,
  })

  files = await Promise.all(
    files
      .filter((dirent) => dirent.isFile())
      .map(async (file) => ({
        name: file.name,
        content: await fs.readFile(path.join(file.path, file.name)),
      })),
  )

  files.sort((fileA, fileB) => fileA.name.localeCompare(fileB.name))

  const compressed = await minifyImages(files)

  const result = await Promise.all(
    files.map((file, index) => {
      const originalSize = file.content.length
      const compressedSize = compressed[index].length
      const savedBytes = compressedSize - originalSize
      const savedPercentage = `${((savedBytes / originalSize) * 100).toFixed(2)}%`

      return {
        name: file.name,
        original: prettySize(originalSize),
        compressed: prettySize(compressedSize),
        saved: {
          percentage: savedPercentage,
          size: prettySize(savedBytes),
        },
      }
    }),
  )

  return result
}

test('Main', async () => {
  const result = await run()

  expect(result).toMatchSnapshot()
})
