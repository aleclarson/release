#!/bin/bash
set -e

npm run build -s --if-present
npm run prepublish -s --if-present

git rm -r --cached .
git add -A

# Amend the bump commit if necessary.
if ! [ -z "$(git status --porcelain)" ]; then
  git commit --amend --no-edit
fi
