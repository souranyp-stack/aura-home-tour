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
  # a free camera for matched before/after shots (window.__aura.cam = {pos, tgt, fov})
  python3 - "video/.versions/$c/src/main.js" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
hook = "    if (window.__aura?.cam) { const c = window.__aura.cam; camera.clearViewOffset(); camera.fov = c.fov; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); camera.position.set(...c.pos); camera.lookAt(...c.tgt); }\n"
a = "    apply(prog, time, dt);\n"
open(p, 'w').write(s.replace(a, a + hook))
PY
done
