#!/usr/bin/env sh
set -eu

python3 scripts/store.py init
npm run scheduler:start &
npm run start
