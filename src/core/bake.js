import * as THREE from 'three';
import { NOISE_GLSL } from './noise.js';

// Bakes procedural surfaces on the GPU into tileable, mipmapped textures.
// A surface is GLSL defining:
//   void surface(vec2 uv, out vec3 col, out float h, out float rough)
// where col is authored in sRGB, h is height in [0,1] and rough is roughness.

const quad = new THREE.PlaneGeometry(2, 2);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

function frag(surfaceGLSL, mode) {
  return /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTexel;
uniform float uDepth;
${NOISE_GLSL}
${surfaceGLSL}
void main(){
  vec3 c; float h; float r;
#if MODE == 0
  surface(vUv, c, h, r);
  gl_FragColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(2.2)), 1.0);
#elif MODE == 1
  float e = uTexel;
  float hl, hr, hd, hu;
  surface(fract(vUv - vec2(e, 0.0)), c, hl, r);
  surface(fract(vUv + vec2(e, 0.0)), c, hr, r);
  surface(fract(vUv - vec2(0.0, e)), c, hd, r);
  surface(fract(vUv + vec2(0.0, e)), c, hu, r);
  vec3 n = normalize(vec3((hl - hr) / (2.0 * e) * uDepth, (hd - hu) / (2.0 * e) * uDepth, 1.0));
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
#else
  surface(vUv, c, h, r);
  gl_FragColor = vec4(1.0, clamp(r, 0.0, 1.0), 0.0, 1.0);
#endif
}`;
}

function renderTo(renderer, material, size, colorSpace) {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    depthBuffer: false,
    colorSpace,
  });
  const mesh = new THREE.Mesh(quad, material);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.render(mesh, cam);
  renderer.setRenderTarget(prev);
  material.dispose();
  const tex = rt.texture;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function bakeSurface(renderer, surfaceGLSL, { size = 1024, depth = 0.02 } = {}) {
  const mk = (mode) =>
    new THREE.ShaderMaterial({
      defines: { MODE: mode },
      vertexShader: VERT,
      fragmentShader: frag(surfaceGLSL, mode),
      uniforms: { uTexel: { value: 1 / size }, uDepth: { value: depth } },
      depthTest: false,
      depthWrite: false,
    });
  return {
    map: renderTo(renderer, mk(0), size, THREE.SRGBColorSpace),
    normalMap: renderTo(renderer, mk(1), size, THREE.NoColorSpace),
    roughnessMap: renderTo(renderer, mk(2), size, THREE.NoColorSpace),
  };
}

// Bakes an arbitrary RGBA fragment (for alpha cut-outs such as foliage cards).
export function bakeRGBA(renderer, mainGLSL, { size = 512, srgb = true } = {}) {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: `precision highp float;\nvarying vec2 vUv;\n${NOISE_GLSL}\n${mainGLSL}`,
    depthTest: false,
    depthWrite: false,
  });
  return renderTo(renderer, material, size, srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace);
}
