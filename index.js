const inArray = require('in-array')
const semver = require('semver')
const path = require('path')
const fs = require('fsx')
const cp = require('child_process')

const publishPath = path.join(__dirname, 'publish.sh')
const incRE = /^(major|premajor|minor|preminor|patch|prepatch|prerelease)$/
const zero = '0.0.0'

function release(dir, ver, opts = {}) {
  let repo = new Repository(dir)

  if (!opts.unclean || opts.rebase) {
    if (repo.exec('status', '--porcelain'))
      fatal('Please stash or commit your changes', 'NOT_CLEAN')
  }

  // Logging function
  let log = opts.log || Function.prototype

  // Find all version tags.
  let tags = repo.tags()
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
    let latest_sha = repo.grep(`^${latest}$`)[0]
    if (!latest_sha)
      fatal(`Cannot find commit for v${latest}`, 'NO_LATEST_SHA')

    let head_sha = repo.head()
    if (opts.rebase) {
      if (head_sha != latest_sha)
        fatal('Expected HEAD to be latest: ' + latest, 'BAD_REBASE')
    }
    else if (head_sha == latest_sha) {
      fatal(`Nothing has changed since v${latest}`, 'NO_CHANGES')
    }
  }

  if (opts.rebase) {
    log(ver + ' (rebase)')
    repo.exec('tag', '-d', ver)
  } else {
    log((latest || zero) + ' -> ' + ver)
    repo.bump(ver)
  }

  // See if the `latest` branch exists.
  if (inArray(repo.branches(), 'latest')) {
    repo.checkout('latest')
    repo.reset('master', {hard: true})
  } else {
    repo.checkout('latest', true)
  }

  // Use the existing upstream, or the default.
  let upstream = repo.upstream() || 'origin/latest'

  log('Pushing to: ' + upstream)

  try {
    // Publish the new version.
    repo._exec('sh', publishPath, ver, ...upstream.split('/'))
  }
  catch(err) {
    // Revert the bump commit.
    repo.reset('HEAD^', {hard: true})
    repo.checkout('master')
    repo.reset('HEAD^', {hard: !opts.unclean})

    // Delete the tag if it exists.
    try {
      repo.exec('tag', '-d', ver)
    } catch(e) {}

    throw err
  }

  // End on master.
  repo.checkout('master')

  // Ensure source files exist.
  repo.reset('HEAD', {hard: !opts.unclean})

  // Ensure compiled files exist.
  repo._exec('npm', 'run', 'build', '-s', '--if-present')
}

module.exports = release

function reduceLatest(latest, tag) {
  return !latest || semver.gt(tag, latest) ? tag : latest
}

class Repository {
  constructor(dir) {
    if (!fs.isDir(path.join(dir, '.git'))) {
      fatal('Not a git directory: ' + dir, 'NOT_GIT')
    }
    this.dir = dir
  }
  head() {
    return this.exec('rev-list', '-n', 1, 'HEAD')
  }
  tags() {
    return fs.readDir(path.join(this.dir, '.git/refs/tags'))
  }
  branches() {
    return fs.readDir(path.join(this.dir, '.git/refs/heads'))
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
    else flags.push('--soft')
    this.exec('reset', ...flags, ref)
  }
  bump(ver) {
    // Update the version in `package.json`
    let packPath = path.join(this.dir, 'package.json')
    let packJson = fs.readFile(packPath)
    let pack = JSON.parse(packJson)
    let prev = pack.version
    pack.version = ver
    packJson = JSON.stringify(pack, null, 2) + /\n*$/.exec(packJson)[0]
    fs.writeFile(packPath, packJson)

    // Update the `README.md` file
    let readmePath = path.join(this.dir, 'README.md')
    if (fs.isFile(readmePath)) {
      let readme = fs.readFile(readmePath)

      // Replace the version in the title.
      let name = pack.name.split('/').pop()
      let titleRE = new RegExp(name + ' v' + prev.replace(/\./g, '\\.'))
      readme = readme.replace(titleRE, name + ' v' + ver)

      fs.writeFile(readmePath, readme)
    }

    this.exec('add', '-A')
    this.exec('commit', '-m', ver, '--allow-empty')
  }
  exec(...args) {
    return this._exec('git', ...args)
  }
  _exec(cmd, ...args) {
    let res = cp.spawnSync(cmd, args, {cwd: this.dir})
    let err = res.error
    if (!err) {
      let str = res.stderr.toString().trim()
      if (!str) str = res.stdout.toString().trim()
      if (res.status > 0) {
        err = Error(str.replace(/^error:\s*/i, ''))
      } else {
        return str
      }
    }
    throw err
  }
}

function fatal(msg, code) {
  let err = new Error(msg)
  err.code = code
  throw err
}
