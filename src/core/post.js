import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// Final pass: ACES tone mapping and sRGB output (what OutputPass does), plus
// the film finish — lens falloff and fine grain — in the same full-screen draw.
const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1 },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.28 },
    uGrain: { value: 0.028 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uExposure; uniform float uTime; uniform vec2 uRes; uniform float uVignette; uniform float uGrain;
    varying vec2 vUv;
    // ACES filmic fit (Hill), matching three.js ACESFilmicToneMapping
    vec3 rrtOdt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 c){
      const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      c *= uExposure / 0.6;
      return clamp(outM * rrtOdt(inM * c), 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c){ return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
    void main(){
      vec3 c = toSRGB(aces(texture2D(tDiffuse, vUv).rgb));
      vec2 d = vUv - 0.5; d.x *= uRes.x / uRes.y;
      c *= mix(1.0 - uVignette, 1.0, smoothstep(1.15, 0.2, length(d)));
      float g = fract(sin(dot(floor(vUv * uRes) + fract(uTime * 7.13) * 91.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      c += g * uGrain * (1.0 - 0.6 * dot(c, vec3(0.333)));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// Ground-truth AO whose depth/normal pre-pass ignores everything that isn't an
// opaque surface: glass, sea, sky, the void and alpha-cut foliage would
// otherwise occlude like solid slabs.
class SurfaceAOPass extends GTAOPass {
  overrideVisibility() {
    super.overrideVisibility();
    this.scene.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      if (o.userData.noAO || (m && (m.transparent || m.alphaTest > 0 || m.isShaderMaterial))) o.visible = false;
    });
  }
}

// Draws a second scene over the film, with its own alpha, so the film shows through
// wherever that scene paints nothing. Sits before the bloom and the film finish.
class OverlayPass extends Pass {
  constructor(samples) {
    super();
    this.scene = null;
    this.camera = null;
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tFilm: { value: null }, tOver: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tFilm; uniform sampler2D tOver; varying vec2 vUv;
        void main(){ vec4 o = texture2D(tOver, vUv); gl_FragColor = vec4(o.rgb + texture2D(tFilm, vUv).rgb * (1.0 - o.a), 1.0); }`,
      depthTest: false, depthWrite: false,
    }));
  }
  setSize(w, h) { this.rt.setSize(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha(), auto = renderer.autoClear;
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.render(this.scene, this.camera);
    renderer.setClearColor(clear, alpha);
    renderer.autoClear = auto;
    this.quad.material.uniforms.tFilm.value = readBuffer.texture;
    this.quad.material.uniforms.tOver.value = this.rt.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}

export function createPost(renderer, scene, camera, { mobile }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: mobile ? 0 : 4,
  });
  const composer = new EffectComposer(renderer, rt);
  const film = new RenderPass(scene, camera);
  composer.addPass(film);
  let ao = null;
  if (!mobile) {
    ao = new SurfaceAOPass(scene, camera, size.x / 2, size.y / 2, undefined,
      { radius: 0.9, distanceExponent: 1.6, thickness: 1.6, scale: 1.15, samples: 10, distanceFallOff: 1 },
      { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    ao.blendIntensity = 0.9;
    composer.addPass(ao);
  }
  const overlay = new OverlayPass(mobile ? 0 : 4);
  overlay.enabled = false;
  composer.addPass(overlay);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.2, 0.5, 1.05);
  composer.addPass(bloom);
  const grade = new ShaderPass(FinalShader);
  grade.material.toneMapped = false;
  grade.uniforms.uExposure.value = renderer.toneMappingExposure;
  composer.addPass(grade);

  function setSize(w, h, dpr) {
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    // the bloom is a soft glow; a quarter-resolution chain looks the same and costs far less
    bloom.setSize(Math.round((w * dpr) / 2), Math.round((h * dpr) / 2));
    // contact shadows are low-frequency too: half resolution, denoised
    ao?.setSize(Math.round((w * dpr) / 2), Math.round((h * dpr) / 2));
    grade.uniforms.uRes.value.set(w * dpr, h * dpr);
  }
  setSize(innerWidth, innerHeight, renderer.getPixelRatio());

  // show a scene over the film; with hideFilm the film isn't drawn at all, since nothing can see it
  function setOverlay(sc, cam, on, hideFilm) {
    overlay.scene = sc;
    overlay.camera = cam;
    overlay.enabled = on;
    film.enabled = !(on && hideFilm);
  }

  return { composer, bloom, grade, ao, setSize, setOverlay };
}
