import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Film finish applied after tone mapping: lens falloff and fine grain.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.28 },
    uGrain: { value: 0.028 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uVignette; uniform float uGrain;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 d = vUv - 0.5; d.x *= uRes.x / uRes.y;
      float v = smoothstep(1.15, 0.2, length(d));
      c *= mix(1.0 - uVignette, 1.0, v);
      float g = fract(sin(dot(floor(vUv * uRes) + fract(uTime * 7.13) * 91.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      c += g * uGrain * (1.0 - 0.6 * dot(c, vec3(0.333)));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function createPost(renderer, scene, camera, { mobile }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: mobile ? 0 : 4,
  });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.2, 0.5, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  function setSize(w, h, dpr) {
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    grade.uniforms.uRes.value.set(w * dpr, h * dpr);
  }
  setSize(innerWidth, innerHeight, renderer.getPixelRatio());

  return { composer, bloom, grade, setSize };
}
