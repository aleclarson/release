# release v0.6.2

Easy semver releases.

### How it works

Here is everything `release` does (in order):

- stash changes and untracked files (you must use the `-s` flag)
- if the `files` array exists in `package.json`:
  - delete any paths *not* in that array
- delete any paths matching the `-x` globs
- update the package version
- ensure the `latest` branch exists
- reset the `latest` branch to `master`
- run these scripts in order:
  - `build`, `prepublish`, `prepare`, `prepublishOnly`
- commit changes with a message like `1.0.0`
- create a semver tag like `1.0.0`
- force push to `origin/latest`
- end on `master` branch

Experiment with the `--dry` flag (so no changes are made).

## CLI

```sh
release 0.0.1   # specify exact version
release -p      # bump the patch version
release -m      # bump the minor version, set patch to 0
release -M      # bump the major version, set patch/minor to 0
release -R      # rebase the current version
```

#### Flags
- `-p --patch` set release type to "patch"
- `-m --minor` set release type to "minor"
- `-M --major` set release type to "major"
- `-P --pre` prepend "pre" when used with `-p`, `-m`, or `-M`; otherwise, set release type to "prerelease"
- `-R --rebase` update the current version (useful after a rebase)
- `-s --stash` stash changes and untracked files
- `-x --exclude` globs excluded from the `latest` branch
- `--dry` see what happens without doing it
