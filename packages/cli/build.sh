#!/bin/bash
set -e

mkdir --parent dist
yarn install
node packages/cli/esbuild.js
cd dist
echo "{}" > package.json
