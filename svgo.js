import {optimize} from 'svgo'

function minify(content) {
  const result = optimize(content)
  return result.data
}

export default minify
