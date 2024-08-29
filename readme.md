# image-minimizer

[![Build Status][github_actions_badge]][github_actions_link]
[![Coverage][coveralls_badge]][coveralls_link]
[![Npm Version][package_version_badge]][package_link]
[![MIT License][license_badge]][license_link]

[github_actions_badge]: https://img.shields.io/github/actions/workflow/status/fisker/image-minimizer/continuous-integration.yml?branch=main&style=flat-square
[github_actions_link]: https://github.com/fisker/image-minimizer/actions?query=branch%3Amain
[coveralls_badge]: https://img.shields.io/coveralls/github/fisker/image-minimizer/main?style=flat-square
[coveralls_link]: https://coveralls.io/github/fisker/image-minimizer?branch=main
[license_badge]: https://img.shields.io/npm/l/image-minimizer.svg?style=flat-square
[license_link]: https://github.com/fisker/image-minimizer/blob/main/license
[package_version_badge]: https://img.shields.io/npm/v/image-minimizer.svg?style=flat-square
[package_link]: https://www.npmjs.com/package/image-minimizer

> Image minimizer.

## Install

```bash
yarn add image-minimizer --dev
```

## Usage

Add `image-minimizer` to your Vite config file.

```js
import fs from 'node:fs/promises'
import path from 'node:path'
import minifyImages from 'image-minimizer'

const DIRECTORY = new URL('./path/to/directory/', import.meta.url)

let files = await fs.readdir(DIRECTORY, {withFileTypes: true, recursive: true})

files = await Promise.all(
  files
    .filter((dirent) => dirent.isFile())
    .map(async (file) => ({
      name: file.name,
      content: await fs.readFile(path.join(file.path, file.name)),
    })),
)

const compressed = await minifyImages(files)
```
