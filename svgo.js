import {optimize} from 'svgo'

import {Buffer} from 'node:buffer'

function minify(content) {
  const result = optimize(content)
  return Buffer.from(result.data)
}

export default minify
