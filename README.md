# release v0.2.2 

Easy semver releases.

- Creates a local branch named `latest`
- Stays in sync with `master`
- Runs the `prepublishOnly` script
- Bumps the version and tags it
- Pushes to `origin/latest` by default

### CLI

```sh
$ release <version>

  The <version> is required if no release type is specified.

  Options:

    -p --patch
      Bump the patch version. (eg: 1.0.0 -> 1.0.1)

    -m --minor
      Bump the minor version. (eg: 0.0.5 -> 0.1.0)

    -M --major
      Bump the major version. (eg: 0.1.1 -> 1.0.0)

    -P --pre
      Prepend "pre" to the release type, if -p, -m, or -M is specified.
      Otherwise, set the release type to "prerelease".
```

### Wishlist

- Delete prerelease tags before pushing a release
- Integrate https://github.com/zeit/release
- Look at commit messages to determine release type

