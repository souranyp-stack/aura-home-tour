import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Material samples for the landing page: each is a bevelled slab of the real
// baked surface, turned slightly to show its edge and lit by a raking key so
// relief, pores and grain read. Rendered once into images.

const SAMPLES = {
  limestone: { tile: 3, view: 1.9, metal: 0, size: [0.62, 0.78, 0.09] },
  travertine: { tile: 2.4, view: 1.3, metal: 0, size: [0.62, 0.78, 0.04] },
  oak: { tile: 2.4, view: 1.1, metal: 0, size: [0.62, 0.78, 0.03] },
  bronze: { tile: 1, view: 0.6, metal: 1, size: [0.62, 0.78, 0.012] },
  boucle: { tile: 0.4, view: 0.32, metal: 0, size: [0.62, 0.78, 0.05], color: 0xf3efe7 },
  leather: { tile: 0.3, view: 0.26, metal: 0, size: [0.62, 0.78, 0.008] },
};

export function renderSamples(renderer, M, envMap, { width = 640, height = 800 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141210);
  scene.environment = envMap;
  scene.environmentIntensity = 0.35;
  const cam = new THREE.PerspectiveCamera(26, width / height, 0.1, 20);
  cam.position.set(0.05, 0.08, 2.25);
  cam.lookAt(0, 0, 0);
  const key = new THREE.DirectionalLight(0xfff0e0, 3.4);
  key.position.set(-1.6, 1.4, 0.55);
  const rim = new THREE.DirectionalLight(0xffe7cc, 1.2);
  rim.position.set(1.4, 0.3, -0.6);
  scene.add(key, rim, new THREE.HemisphereLight(0xfff6ea, 0x1a1714, 0.25));

  const rt = new THREE.WebGLRenderTarget(width, height, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  const pixels = new Uint8Array(width * height * 4);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, height);
  const out = {};
  const prevTone = renderer.toneMapping;

  for (const [name, cfg] of Object.entries(SAMPLES)) {
    const tx = M.textures[name];
    const [w, h, d] = cfg.size;
    const geo = new RoundedBoxGeometry(w, h, d, 3, Math.min(0.012, d * 0.4));
    const uv = geo.attributes.uv;
    // the slab shows `view` metres of surface across its width, so each sample reads at a
    // representative scale (a wall of stone, a hand's width of leather)
    const k = cfg.view / w;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((w * k) / cfg.tile), uv.getY(i) * ((h * k) / cfg.tile));
    const mat = new THREE.MeshStandardMaterial({
      map: tx.map, normalMap: tx.normalMap, roughnessMap: tx.roughnessMap,
      roughness: 1, metalness: cfg.metal, color: cfg.color ?? 0xffffff, envMapIntensity: cfg.metal ? 1.4 : 1,
    });
    const slab = new THREE.Mesh(geo, mat);
    slab.rotation.set(-0.06, -0.32, 0.0);
    scene.add(slab);

    renderer.setRenderTarget(rt);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, width, height, pixels);
    renderer.setRenderTarget(null);
    for (let y = 0; y < height; y++) {
      const src = (height - 1 - y) * width * 4;
      img.data.set(pixels.subarray(src, src + width * 4), y * width * 4);
    }
    ctx.putImageData(img, 0, 0);
    out[name] = canvas.toDataURL('image/jpeg', 0.9);

    scene.remove(slab);
    geo.dispose();
    mat.dispose();
  }
  renderer.toneMapping = prevTone;
  rt.dispose();
  return out;
}
