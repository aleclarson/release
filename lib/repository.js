const { gray, red, yellow } = require('chalk')
const exec = require('./exec')
const path = require('path')
const fs = require('saxon/sync')

// Git commands with side effects
const effective = [
  'add',
  'checkout',
  'commit',
  'rebase',
  'reset',
  'revert',
  'rm',
  'stash',
  'tag',
]

// Git commands that need not be logged
const ignored = ['rev-parse', 'status']

class Repository {
  constructor(dir, opts = {}) {
    if (!fs.isDir(path.join(dir, '.git'))) {
      throw Error('Not a git directory: ' + dir)
    }
    this.dir = dir
    this.opts = opts
    this.pack = this.read('package.json')
    this.log = opts.log || Function.prototype
  }
  head() {
    return this.exec('rev-list', '-n', 1, 'HEAD')
  }
  tags() {
    return fs.list(path.join(this.dir, '.git/refs/tags'))
  }
  branches() {
    return fs.list(path.join(this.dir, '.git/refs/heads'))
  }
  hooks() {
    return fs.list(path.join(this.dir, '.git/hooks'))
  }
  branch() {
    return this.exec('rev-parse', '--abbrev-ref', 'HEAD')
  }
  hook(name) {
    return path.join(this.dir, '.git/hooks', name)
  }
  grep(regex) {
    let commits = this.exec('log', '--grep', regex, '--pretty=format:"%H"')
    return commits ? commits.split('\n').map(JSON.parse) : []
  }
  checkout(branch, is_new) {
    let flags = []
    if (is_new) flags.push('-b')
    try {
      this.exec('checkout', ...flags, branch)
    } catch (err) {
      if (!/^Switched to /.test(err.message)) throw err
    }
  }
  upstream(ref) {
    try {
      return this.exec(
        'rev-parse',
        '--abbrev-ref',
        '--symbolic-full-name',
        '@{u}'
      )
    } catch (err) {
      if (!/no upstream /.test(err.message)) throw err
    }
  }
  reset(ref, opts = {}) {
    let flags = []
    if (opts.hard) flags.push('--hard')
    else flags.push('--soft')
    this.exec('reset', ...flags, ref)
  }
  read(name) {
    try {
      const file = fs.read(path.join(this.dir, name))
      return path.extname(name) == '.json' ? JSON.parse(file) : file
    } catch (e) {}
  }
  write(name, data) {
    if (this.opts.dry) {
      return
    }
    if (path.extname(name) == '.json' && typeof data != 'string') {
      data = JSON.stringify(data, null, 2) + '\n'
    }
    fs.write(path.join(this.dir, name), data)
  }
  bump(ver) {
    if (this.pack) {
      // Update the version in `package.json`
      let prev = this.pack.version
      this.pack.version = ver
      this.write('package.json', this.pack)

      // Update the `README.md` file
      let readme = this.read('README.md')
      if (readme) {
        // Replace the version in the title.
        let name = this.pack.name.split('/').pop()
        let titleRE = new RegExp(name + ' v' + prev.replace(/\./g, '\\.'))
        this.write('README.md', readme.replace(titleRE, name + ' v' + ver))
      }
    }

    this.exec('add', '-A')
    this.exec('commit', '-m', ver, '--allow-empty')
  }
  exec(...args) {
    if (this.opts.dry) {
      let cmd = args[0]
      let hasEffects = effective.indexOf(cmd) >= 0

      if (ignored.indexOf(cmd) < 0) {
        let color = hasEffects ? red : yellow
        this.log('')
        this.log(
          gray(hasEffects ? '(skip) ' : '') + color('git ' + args.join(' '))
        )
      }

      // Avoid side effects.
      if (hasEffects) return
    }
    return exec('git', args, this.dir)
  }
  dryLog(...args) {
    this.log('\n' + gray('(skip)'), ...args)
  }
}

module.exports = Repository
