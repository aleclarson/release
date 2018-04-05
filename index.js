const inArray = require('in-array')
const semver = require('semver')
const path = require('path')
const fs = require('fsx')
const cp = require('child_process')

const publishPath = path.join(__dirname, 'publish.sh')
const incRE = /^(major|premajor|minor|preminor|patch|prepatch|prerelease)$/
const zero = '0.0.0'

function release(dir, ver, opts = {}) {
  let git = new Git(dir)

  if (git.exec('status', '--porcelain'))
    fatal('Please stash or commit your changes', 'NOT_CLEAN')

  // Logging function
  let log = opts.log || Function.prototype

  // Find all version tags.
  let tags = git.tags()
    .map(semver.clean)
    .filter(x => x)

  // Find the latest version tag.
  let latest = tags.reduce(reduceLatest, null)

  if (!opts.rebase) {
    if (incRE.test(ver))
      ver = semver.inc(latest || zero, ver)

    else if (!semver.valid(ver))
      fatal('Invalid version: ' + ver, 'BAD_VER')

    else if (semver.gt(latest || zero, ver))
      fatal(`Latest version (${latest}) is greater than ` + ver, 'BAD_VER')

    else if (ver == latest || ver == zero)
      fatal('The given version is already released: ' + ver, 'BAD_VER')
  }
  else if (!latest) {
    fatal('Cannot rebase when no version exists', 'BAD_REBASE')
  }
  else {
    ver = latest
  }

  // Get commits since previous version.
  let sha_range
  if (latest) {
    let latest_sha = git.grep(`^${latest}$`)[0]
    if (!latest_sha)
      fatal(`Cannot find commit for v${latest}`, 'NO_LATEST_SHA')

    let head_sha = git.head()
    if (opts.rebase) {
      if (head_sha != latest_sha)
        fatal('Expected HEAD to be a bump commit', 'BAD_REBASE')
    }
    else if (head_sha == latest_sha) {
      fatal(`Nothing has changed since v${latest}`, 'NO_CHANGES')
    }
  }

  if (opts.rebase) {
    log(ver + ' (rebase)')
    git.exec('tag', '-d', ver)
  } else {
    log((latest || zero) + ' -> ' + ver)
    git.bump(ver)
  }

  // See if the `latest` branch exists.
  if (inArray(git.branches(), 'latest')) {
    git.checkout('latest')
    git.reset('master', {hard: true})
  } else {
    git.checkout('latest', true)
  }

  // Use the existing upstream, or the default.
  let upstream = git.upstream() || 'origin/latest'

  log('Pushing to: ' + upstream)

  // Publish the new version.
  git._exec('sh', publishPath, ver, ...upstream.split('/'))

  // Return to the `master` branch.
  git.checkout('master')
}

module.exports = release

function reduceLatest(latest, tag) {
  return !latest || semver.gt(tag, latest) ? tag : latest
}

class Git {
  constructor(dir) {
    this.dir = dir
    this.git = path.join(dir, '.git')
    if (!fs.isDir(this.git)) {
      fatal('Not a git directory: ' + dir, 'NOT_GIT')
    }
  }
  head() {
    return this.exec('rev-list', '-n', 1, 'HEAD')
  }
  tags() {
    return fs.readDir(path.join(this.git, 'refs/tags'))
  }
  branches() {
    return fs.readDir(path.join(this.git, 'refs/heads'))
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
    } catch(err) {
      if (!/^Switched to /.test(err.message))
        throw err
    }
  }
  upstream(ref) {
    try {
      return this.exec(
        'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
    } catch(err) {
      if (!/no upstream /.test(err.message))
        throw err
    }
  }
  reset(ref, opts = {}) {
    let flags = []
    if (opts.hard) flags.push('--hard')
    this.exec('reset', ...flags, ref)
  }
  bump(ver) {
    // Update the version in `package.json`
    let packPath = path.join(this.dir, 'package.json')
    let packJson = fs.readFile(packPath)
    let pack = JSON.parse(packJson)
    pack.version = ver
    packJson = JSON.stringify(pack, null, 2) + /\n*$/.exec(packJson)[0]
    fs.writeFile(packPath, packJson)

    // Update the version in `README.md`
    let readmePath = path.join(this.dir, 'README.md')
    if (fs.isFile(readmePath)) {
      let readme = fs.readFile(readmePath)
      fs.writeFile(readmePath, readme.replace(/\bv[\w\-\.]+\b/, 'v' + ver))
    }

    this.exec('add', '-A')
    this.exec('commit', '-m', ver, '--allow-empty')
  }
  exec(...args) {
    return this._exec('git', ...args)
  }
  _exec(cmd, ...args) {
    let res = cp.spawnSync(cmd, args, {cwd: this.dir})

    if (res.error)
      throw res.error

    if (res.stderr.length == 0)
      return res.stdout.toString().trim()

    throw Error(res.stderr.toString().trim())
  }
}

function fatal(msg, code) {
  let err = new Error(msg)
  err.code = code
  throw err
}
