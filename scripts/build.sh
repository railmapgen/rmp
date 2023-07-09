#!/bin/bash
set -eux

# bump resources version
npm i -g npm-check-updates
ncu -f '/@railmapgen\/rmg-.*-resources/' -t patch -u
npm install

npm run lint:fix
npm run test

# git config
git config --global user.name 'github-actions[bot]'
git config --global user.email 'github-actions[bot]@users.noreply.github.com'

# variables
export APP_NAME=$(node -p "require('./package.json').name")
BRANCH=$(git branch | grep \* | cut -d ' ' -f2 | tr '/' '.')

# npm config
npm config set tag-version-prefix "${APP_NAME}-"

### BUMP VERSION
if [ "$BRANCH" = "main" ]
then
  # build with a normal version
  npm version $BUMP_VERSION -m "${APP_NAME}-%s release" --no-git-tag-version || { echo "Release Error"; exit 1; }
  export RMG_VER=$(node -p "require('./package.json').version")
else
  # build with a hashed version
  VERSION=$(node -p "require('./package.json').version")
  GITHASH=$(git log -n 1 --pretty=%h)
  export RMG_VER="$VERSION.$BRANCH.$GITHASH"
  # git tag -a "${APP_NAME}-${RMG_VER}" -m "${APP_NAME}-${RMG_VER}"
fi

### BUILD
CI='' npm run build

### PUSH TAG AND COMMIT
if [ "$BRANCH" = "main" ]
then
  git add .
  git commit -m "${APP_NAME}-${RMG_VER} release"
  git tag -a "${APP_NAME}-${RMG_VER}" -m "${APP_NAME}-${RMG_VER} release"
  git push --atomic origin HEAD "${APP_NAME}-${RMG_VER}"
fi

echo "Build Success: $APP_NAME-$RMG_VER"
echo "RMG_VER=$RMG_VER" >> $GITHUB_OUTPUT
