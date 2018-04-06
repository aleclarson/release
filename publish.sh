#!/bin/bash
set -e

# Prepare the package for its release, and amend the bump commit.
npm run prepublish -s --if-present
npm run prepare -s --if-present
npm run prepublishOnly -s --if-present

git add -A
if ! [ -z "$(git status --porcelain)" ]; then
  git commit --amend --no-edit
fi

# Create a tag for the version, and push it.
git tag "$1"
git push -u "$2" "$3" --porcelain -f
git push "$2" "$1" --porcelain -f
