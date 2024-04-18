#!/usr/bin/env bash

port=4000
original_registry=`npm get registry`
registry="http://localhost:$port"
output="output.out"
ci=false
commit_to_revert="HEAD"

if [ "$1" = "ci" ];
then
  ci=true
fi

function cleanup {
  echo "Cleaning up"
  if [ "$ci" = false ];
  then
    lsof -ti tcp:4000 | xargs kill
    # Clean up generated dists if run locally
    shopt -s globstar extglob
    rm -rf packages/**/dist
    rm -rf storage/ ~/.config/verdaccio/storage/ $output
    if [ "$commit_to_revert" != "HEAD" ];
    then
      git fetch
      git reset --hard $commit_to_revert
      npm set registry $original_registry
    fi
  else
    # lsof doesn't work in circleci
    netstat -tpln | awk -F'[[:space:]/:]+' '$5 == 4000 {print $(NF-2)}' | xargs kill
  fi
}

trap cleanup EXIT
trap "exit 1" INT ERR

set -e
# Generate dists for the packages
make build

# Start verdaccio and send it to the background
yarn verdaccio --config "./.verdaccio-ci.config.yml" --listen $port &>${output}&

# Wait for verdaccio to start
grep -q 'http address' <(tail -f $output)

yarn config set npmPublishRegistry $registry
yarn config set npmRegistryServer $registry

if [ "$ci" = true ];
then
  git config --global user.email octobot@github.com
  git config --global user.name GitHub Actions
fi

# Bump all package versions (allow publish from current branch but don't push tags or commit)
yarn workspaces foreach --all --no-private version minor --deferred
yarn version apply --all
# set the npm registry because that will set it at a higher level, making local testing easier
npm set registry $registry
commit_to_revert="HEAD~0"

# Publish packages anonymously to verdaccio
yarn workspaces foreach --all --no-private npm publish

if [ "$ci" = true ];
then
  # build prod docs with a public url of /reactspectrum/COMMIT_HASH_BEFORE_PUBLISH/verdaccio/docs
  PUBLIC_URL=/reactspectrum/`git rev-parse HEAD~1`/verdaccio/docs make website-production

  # Rename the dist folder from dist/production/docs to verdaccio_dist/COMMIT_HASH_BEFORE_PUBLISH/verdaccio/docs
  # This is so we can have verdaccio build in a separate stream from deploy and deploy_prod
  verdaccio_path=verdaccio_dist/`git rev-parse HEAD~1`/verdaccio
  mkdir -p $verdaccio_path
  mv dist/production/docs $verdaccio_path

  # install packages in CRA test app
  cd examples/rsp-cra-18
  yarn install

  # Build CRA test app and move to dist folder. Store the size of the build in a text file.
  yarn build | tee build-stats.txt
  du -ka build/ | tee -a build-stats.txt
  mkdir -p ../../$verdaccio_path/publish-stats
  mv build-stats.txt ../../
  mv build ../../$verdaccio_path

  # install packages in webpack 4 test app
  cd ../../examples/rsp-webpack-4
  yarn install
  yarn jest

  # Build Webpack 4 test app and move to dist folder. Store the size of the build in a text file.
  yarn build | tee build-stats.txt
  du -ka dist/ | tee -a webpack-4-build-stats.txt
  mv webpack-4-build-stats.txt ../../$verdaccio_path/publish-stats
  mv dist ../../$verdaccio_path/webpack-4

  # install packages in NextJS test app
  cd ../../examples/rsp-next-ts
  yarn install

  # Build NextJS test app and move to dist folder. Store the size of the build in a text file.
  VERDACCIO=true yarn build | tee next-build-stats.txt
  yarn export
  du -ka out/ | tee -a next-build-stats.txt
  mv next-build-stats.txt ../../$verdaccio_path/publish-stats
  mv out ../../$verdaccio_path/next

  # Install/build RAC Tailwind app
  cd ../../examples/rac-tailwind
  yarn install
  yarn build --public-url ./
  mv dist ../../$verdaccio_path/rac-tailwind

  # Install/build RAC + Spectrum + Tailwind app
  cd ../../examples/rac-spectrum-tailwind
  yarn install
  yarn build --public-url ./
  mv dist ../../$verdaccio_path/rac-spectrum-tailwind

  cd ../..

  # Get the tarball size of each published package.
  node scripts/verdaccioPkgSize.js

  # Compare the size of the built app and the published packages.
  node scripts/compareSize.js

  # Store into folder for azure.
  mv size-diff.txt build-stats.txt publish.json $verdaccio_path/publish-stats
else
  # Wait for user input to do cleanup
  read -n 1 -p "Press a key to close server and cleanup"
fi
