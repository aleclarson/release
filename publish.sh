#!/bin/bash
set -e

# Create a tag for the version, and push it.
git tag "$1"
git push -u "$2" "$3" --porcelain -f
git push "$2" "$1" --porcelain -f
