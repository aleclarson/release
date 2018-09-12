const Repository = require('./lib/repository')
const ignored = require('./lib/ignored')
const semver = require('semver')
const exec = require('./lib/exec')
const path = require('path')
const fs = require('fsx')

const BUILD = path.join(__dirname, 'build.sh')
const PUBLISH = path.join(__dirname, 'publish.sh')

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

  if (opts.unclean) {
    repo.exec('stash', '-u')
  }

  try {
    if (opts.rebase) {
      log(ver + ' (rebase)')
      repo.exec('tag', '-d', ver)
    } else {
      log((latest || zero) + ' -> ' + ver)
      repo.bump(ver)
    }

    // See if the `latest` branch exists.
    if (repo.branches().includes('latest')) {
      repo.checkout('latest')
      repo.reset('master', {hard: true})
    } else {
      repo.checkout('latest', true)
    }

    try {
      // Run scripts.
      if (repo.pack) {
        exec('sh', [BUILD], repo.dir)
      }

      // Remove unpublished files
      let paths = ignored(repo, opts)
      if (paths) {
        repo.write('.gitignore', paths.join('\n'))
        repo.exec('rm', '-r', '--cached', '.')
        repo.exec('add', '-A')
        repo.exec('rm', '--cached', '.gitignore')
        repo.exec('commit', '--amend', '--no-edit')
      }

      // Use the existing upstream, or the default.
      let upstream = repo.upstream() || 'origin/latest'

      log('Pushing to: ' + upstream)
      upstream = upstream.split('/')

      // Publish the new version.
      exec('sh', [PUBLISH, ver, ...upstream], repo.dir)

      // End on master.
      repo.exec('checkout', 'master', '-f')

      // Ensure source files exist.
      repo.reset('HEAD', {hard: true})
    }
    catch(err) {
      // Revert the bump commits on the "latest" and "master" branches.
      repo.reset('HEAD^', {hard: true})
      repo.checkout('master')
      repo.reset('HEAD^', {hard: true})

      // Delete the tag if it exists.
      try {
        repo.exec('tag', '-d', ver)
      } catch(e) {}

      throw err
    }
  } finally {
    if (opts.unclean) {
      repo.exec('stash', 'pop')
    }
  }

  // Ensure compiled files exist.
  if (repo.pack) {
    exec('npm', ['run', 'build', '-s', '--if-present'], repo.dir)
  }
}

module.exports = release

function reduceLatest(latest, tag) {
  return !latest || semver.gt(tag, latest) ? tag : latest
}

function fatal(msg, code) {
  let err = new Error(msg)
  err.code = code
  throw err
}
