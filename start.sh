#!/usr/bin/env sh
set -e

yarn build
cd dist
exec npx serve -s -l 3000
