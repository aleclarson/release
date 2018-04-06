
# Prepare the package for its release, and amend the bump commit.
npm run prepublish -s &&
npm run prepare -s &&
npm run prepublishOnly -s &&
git add -A &&
git commit --amend --no-edit

# Create a tag for the version, and push it.
git tag "$1" &&
git push -u "$2" "$3" --porcelain -f &&
git push "$2" "$1" --porcelain -f
