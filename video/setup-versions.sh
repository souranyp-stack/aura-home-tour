#!/bin/sh
# Checks out the old versions the "first version" shots are recorded from, next
# to this folder, sharing the project's node_modules. Serve them with the
# broll-v1 / broll-tower launch configurations (ports 5301 / 5302).
set -e
cd "$(dirname "$0")/.."
for c in d668dca 45dc2b6 09a5de2 9c39d09 616b83a c68c346 008c734 7eadd7c; do
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

# The pin-order bug, put back: 7eadd7c with the approach's pin created before the
# Materials pin, and ScrollTrigger's own markers on so the bad start shows.
b=video/.versions/pin-bug
if [ ! -d "$b" ]; then
  git worktree add --detach "$b" 7eadd7c
  ln -s "$PWD/node_modules" "$b/node_modules"
  python3 - "$b/src/ui/page.js" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
late = "  setUpApproach();\n\n  // the stills are rendered"
early = "  // ---------------------------------------------------------------- materials: pinned horizontal gallery"
assert late in s and early in s
s = s.replace(late, "  // the stills are rendered").replace(early, "  setUpApproach();\n  window.__ST = ScrollTrigger;\n\n" + early)
pin = "ScrollTrigger.create({ trigger: '#approach', pin: '.approach__pin',"
assert pin in s
s = s.replace(pin, pin + " id: 'approach', markers: { fontSize: '26px', startColor: '#ff5a4d', endColor: '#ff5a4d' },")
open(p, 'w').write(s)
PY
fi
