import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Collapses the static meshes under `root` into one mesh per material (and
// shadow setting), expressed in root's local space. Objects listed in `keep`
// (and their subtrees) stay untouched so they can still animate.
export function mergeStatic(root, keep = []) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const keepSet = new Set();
  keep.forEach((k) => k.traverse((o) => keepSet.add(o)));

  const buckets = new Map();
  const victims = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || keepSet.has(o) || Array.isArray(o.material)) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
    const g = o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    buckets.get(key).geos.push(g);
    victims.push(o);
  });

  for (const o of victims) o.parent.remove(o);
  for (const { material, cast, receive, geos } of buckets.values()) {
    const indexed = geos.filter((g) => g.index);
    const flat = geos.filter((g) => !g.index);
    for (const set of [indexed, flat]) {
      if (!set.length) continue;
      const merged = mergeGeometries(set, false);
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      root.add(mesh);
    }
  }
  return root;
}
