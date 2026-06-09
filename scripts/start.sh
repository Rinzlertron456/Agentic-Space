#!/usr/bin/env sh
set -eu

python scripts/store.py init
npm run scheduler:start &
npm run start
