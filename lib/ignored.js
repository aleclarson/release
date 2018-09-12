const globRegex = require('glob-regex')
const recrawl = require('recrawl')
const path = require('path')

const dirsToSkip = ['.git', 'node_modules'];
const filesToSkip = ['.gitignore', 'package.json'];

['README', 'CHANGES', 'CHANGELOG',
 'HISTORY', 'LICENSE', 'LICENCE', 'NOTICE'
].forEach(uc => {
  let lc = uc.toLowerCase()
  filesToSkip.push(uc, lc, uc + '.*', lc + '.*')
})

function ignored(repo, opts) {
  let skip, only
  if (repo.pack && (skip = repo.pack.files)) {
    skip = skip.concat(filesToSkip)
    if (opts.ignore) {
      const ignore = globRegex(opts.ignore)
      skip = skip.filter(name => !ignore.test(name))
    }
  } else if (opts.ignore) {
    only = opts.ignore
  }

  if (only && only.length) {
    skip = filesToSkip
  } else if (!skip || !skip.length) {
    return null
  }

  let main = path.resolve(repo.dir, repo.pack.main || 'index')
  try {
    main = require.resolve(main)
    skip.push('/' + path.relative(repo.dir, main))
  } catch(e) {}

  let ignored = []
  let crawl = recrawl({
    skip,
    only,
    enter(dir) {
      if (dirsToSkip.includes(dir)) {
        ignored.push('/' + dir)
        return false
      }
      dir += '/'
      if (skip) {
        let inDir = (name) => name.startsWith(dir)
        if (skip.some(inDir)) return true
      }
      if (only) {
        return true
      }
      ignored.push('/' + dir)
      return false
    }
  })

  crawl(repo.dir, (file) => {
    ignored.push('/' + file)
  })
  return ignored
}

module.exports = ignored
