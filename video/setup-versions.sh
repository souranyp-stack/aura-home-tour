#!/bin/sh
# Checks out the old versions the "first version" shots are recorded from, next
# to this folder, sharing the project's node_modules. Serve them with the
# broll-v1 / broll-tower launch configurations (ports 5301 / 5302).
set -e
cd "$(dirname "$0")/.."
for c in d668dca 45dc2b6; do
  [ -d "video/.versions/$c" ] && continue
  git worktree add --detach "video/.versions/$c" "$c"
  ln -s "$PWD/node_modules" "video/.versions/$c/node_modules"
done
