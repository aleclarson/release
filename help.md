
Usage:
  release 0.0.1   # specify exact version
  release -p      # bump the patch version
  release -m      # bump the minor version, set patch to 0
  release -M      # bump the major version, set patch/minor to 0
  release -R      # rebase the current version

Options:
  -p --patch    set release type to "patch"
  -m --minor    set release type to "minor"
  -M --major    set release type to "major"
  -P --pre      set release type to "prerelease"
  -R --rebase   rebase the current version
  -u --stash    stash changes and untracked files
  -x --exclude  exclude globs from the "latest" branch
