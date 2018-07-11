#!/bin/bash
set -e

# Prepare the package for its release, and amend the bump commit.
npm run build -s --if-present
npm run prepublish -s --if-present
npm run prepare -s --if-present
npm run prepublishOnly -s --if-present

git rm -r --cached .
git add -A
if ! [ -z "$(git status --porcelain)" ]; then
  git commit --amend --no-edit
fi
