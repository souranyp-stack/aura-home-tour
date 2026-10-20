import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { aura } from './materials.js';
import { SEA } from './landscape.js';

// Sky, sun, sea, fog, image-based light and the dark "void" the sculpture
// floats in before the world arrives. update(state) is called every frame.

const C = (r, g, b) => new THREE.Color(r, g, b);
const SUNRISE = 6.4, SUNSET = 20.1;

export function sunDirection(hours, out = new THREE.Vector3()) {
  const t = (hours - SUNRISE) / (SUNSET - SUNRISE);
  const elev = THREE.MathUtils.degToRad(Math.sin(Math.PI * THREE.MathUtils.clamp(t, -0.2, 1.2)) * 58 - 2.5);
  // rises over the land, sets over the sea to the south-west of the terrace
  const az = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(290, 115, t));
  out.set(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
  return out;
}

function patchSky(sky) {
  const u = sky.material.uniforms;
  u.uGain = { value: 0.5 };
  u.uNight = { value: new THREE.Color(0x05070d) };
  sky.material.fragmentShader = sky.material.fragmentShader
    .replace('uniform vec3 up;', 'uniform vec3 up;\nuniform float uGain;\nuniform vec3 uNight;')
    .replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * uGain + uNight, 1.0 );');
}

export function createAtmosphere(renderer, scene, M, { mobile }) {
  const sky = new Sky();
  sky.scale.setScalar(9000);
  sky.frustumCulled = false;
  patchSky(sky);
  scene.add(sky);

  // The void: a soft gallery darkness with a faint warm horizon glow.
  const voidMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 1 }, uGlow: { value: C(0.028, 0.022, 0.017) }, uDark: { value: C(0.004, 0.0038, 0.0035) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uOpacity; uniform vec3 uGlow; uniform vec3 uDark; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c = mix(uGlow, uDark, smoothstep(0.0, 0.55, abs(h + 0.04)));
      gl_FragColor = vec4(c, uOpacity); }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  });
  const voidMesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), voidMat);
  voidMesh.frustumCulled = false;
  scene.add(voidMesh);

  // Sea
  const waterGeo = new THREE.PlaneGeometry(14000, 14000);
  const water = new Water(waterGeo, {
    textureWidth: mobile ? 256 : 512,
    textureHeight: mobile ? 256 : 512,
    waterNormals: M.textures.waves.normalMap,
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x0b2630,
    distortionScale: 3.2,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = SEA;
  water.material.uniforms.size.value = 1.6;
  Object.assign(water.material.uniforms, { uWorldR: aura.uWorldR, uVoid: aura.uVoid });
  water.material.fragmentShader = water.material.fragmentShader
    // physically plausible reflectance (F0 ≈ 0.02) and no grey lift in the mirror term
    .replace('float rf0 = 0.3;', 'float rf0 = 0.02;')
    .replace('( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight )', '( reflectionSample + reflectionSample * specularLight )')
    .replace('uniform vec3 waterColor;', 'uniform vec3 waterColor;\nuniform float uWorldR;\nuniform vec3 uVoid;')
    .replace(
      '#include <fog_fragment>',
      `#include <fog_fragment>
      float wd = length(worldPosition.xz - vec2(3.0, 2.0));
      float wv = 1.0 - smoothstep(uWorldR - 80.0, uWorldR, wd);
      gl_FragColor.rgb = mix(uVoid, gl_FragColor.rgb, wv);`
    );
  scene.add(water);
  const mirrorExcluded = [];
  const mirrorWasVisible = [];
  const renderMirror = water.onBeforeRender;
  water.onBeforeRender = (...args) => {
    mirrorExcluded.forEach((o, i) => { mirrorWasVisible[i] = o.visible; o.visible = false; });
    renderMirror(...args);
    mirrorExcluded.forEach((o, i) => { o.visible = mirrorWasVisible[i]; });
  };

  // Lights
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(mobile ? 2048 : 4096);
  const sc = sun.shadow.camera;
  sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 180;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  const focus = new THREE.Vector3(3, 3, 2);
  sun.target.position.copy(focus);
  scene.add(sun, sun.target);

  // gallery rim light for the sculpture, faded out as the world arrives
  const rim = new THREE.DirectionalLight(0xfff1e0, 0);
  rim.position.set(-40, 30, 70);
  rim.target.position.copy(focus);
  scene.add(rim, rim.target);

  const moon = new THREE.DirectionalLight(0x8fa6d8, 0);
  moon.position.set(-60, 80, -40);
  scene.add(moon);

  const hemi = new THREE.HemisphereLight(0xbfd2e6, 0x5a4b3a, 0.4);
  scene.add(hemi);

  scene.fog = new THREE.FogExp2(0x000000, 0.001);

  // Environment for reflections and ambient: a second sky plus a dark sea disc.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(1000);
  patchSky(envSky);
  envScene.add(envSky);
  const envSea = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshBasicMaterial({ color: 0x0b1a20 }));
  envSea.rotation.x = -Math.PI / 2;
  envSea.position.y = -8;
  envScene.add(envSea);
  let envRT = null;
  let lastEnvKey = '';
  let lastEnvAt = -1;

  const sunDir = new THREE.Vector3();
  const studioDir = new THREE.Vector3(0.55, 0.62, -0.56).normalize();
  const lightDir = new THREE.Vector3();
  const tmpC = new THREE.Color();
  const fogDay = C(0.70, 0.77, 0.86), fogGold = C(0.95, 0.72, 0.52), fogDusk = C(0.36, 0.33, 0.40), fogNight = C(0.025, 0.03, 0.05);
  const fogMist = C(0.62, 0.64, 0.66);

  const out = { elevation: 0, daylight: 1 };

  function skyParams(target, elevDeg, mist) {
    const gold = 1 - THREE.MathUtils.smoothstep(elevDeg, 3, 28);
    const u = target.material.uniforms;
    u.turbidity.value = THREE.MathUtils.lerp(2.0, 3.6, gold) + mist * 8;
    u.rayleigh.value = THREE.MathUtils.lerp(1.4, 2.2, gold) + mist * 0.5;
    u.mieCoefficient.value = THREE.MathUtils.lerp(0.003, 0.007, gold) + mist * 0.02;
    u.mieDirectionalG.value = 0.86;
    u.sunPosition.value.copy(sunDir);
    u.uGain.value = THREE.MathUtils.lerp(0.36, 0.5, gold) * (1 - mist * 0.35);
  }

  /**
   * state: { studio 0..1, time hours, mist 0..1, worldR metres, voidOpacity 0..1, now seconds }
   */
  function update(state) {
    sunDirection(state.time, sunDir);
    const elev = THREE.MathUtils.radToDeg(Math.asin(sunDir.y));
    out.elevation = elev;
    const day = THREE.MathUtils.smoothstep(elev, -4, 6);
    const gold = 1 - THREE.MathUtils.smoothstep(elev, 2, 30);
    out.daylight = day;

    skyParams(sky, elev, state.mist);

    // key light: studio key while in the void, the real sun afterwards
    lightDir.copy(sunDir).lerp(studioDir, state.studio).normalize();
    if (lightDir.y < 0.02) lightDir.y = 0.02;
    sun.position.copy(focus).addScaledVector(lightDir, 90);
    const sunCol = tmpC.setRGB(1.0, 0.95, 0.89).lerp(C(1.0, 0.6, 0.3), gold);
    const sunI = THREE.MathUtils.lerp(3.6, 4.2, gold) * THREE.MathUtils.smoothstep(elev, -2.5, 5) * (1 - state.mist * 0.75);
    sun.color.copy(sunCol).lerp(C(1.0, 0.95, 0.9), state.studio);
    sun.intensity = THREE.MathUtils.lerp(sunI, 3.0, state.studio);
    sun.castShadow = sun.intensity > 0.05;

    moon.intensity = (1 - day) * 0.35 * (1 - state.studio);
    rim.intensity = 2.4 * state.studio;

    hemi.color.setRGB(0.62, 0.72, 0.86).lerp(C(0.92, 0.72, 0.56), gold).lerp(C(0.12, 0.14, 0.24), 1 - day)
      .lerp(C(1.0, 0.9, 0.78), state.studio);
    hemi.groundColor.setRGB(0.36, 0.30, 0.24).multiplyScalar(0.3 + 0.7 * day).lerp(C(0.32, 0.24, 0.17), state.studio);
    // the gallery fill is warm and soft so plaster shadows stay umber, not slate
    hemi.intensity = THREE.MathUtils.lerp(0.05 + 0.22 * day * (1 - 0.5 * gold), 0.55, state.studio);

    // fog colour follows the horizon
    const fc = tmpC.copy(fogNight)
      .lerp(fogDusk, THREE.MathUtils.smoothstep(elev, -9, -2))
      .lerp(fogGold, THREE.MathUtils.smoothstep(elev, -2, 4))
      .lerp(fogDay, THREE.MathUtils.smoothstep(elev, 8, 30));
    const mistTone = fogMist.clone().multiplyScalar(0.15 + 0.85 * day);
    fc.lerp(mistTone, state.mist * 0.8);
    scene.fog.color.copy(fc).lerp(aura.uVoid.value, state.voidOpacity);
    scene.fog.density = (0.0011 + Math.pow(state.mist, 1.6) * 0.022) * (1 - state.voidOpacity * 0.9);

    voidMat.uniforms.uOpacity.value = state.voidOpacity;
    voidMesh.visible = state.voidOpacity > 0.001;
    aura.uWorldR.value = state.worldR;

    water.material.uniforms.sunDirection.value.copy(sunDir.y > 0 ? sunDir : moon.position.clone().normalize());
    water.material.uniforms.sunColor.value.copy(sunCol).multiplyScalar(0.4 + 0.9 * day).lerp(C(0.25, 0.3, 0.42), 1 - day);
    water.material.uniforms.waterColor.value.setRGB(0.012, 0.07, 0.095).multiplyScalar(0.3 + 0.7 * day);
    water.material.uniforms.time.value = state.now * 0.6;
    water.visible = state.worldR > 1;

    scene.environmentIntensity = THREE.MathUtils.lerp(0.1 + 0.9 * day * (1 - 0.45 * gold), 0.08, state.studio);

    // regenerate the environment map when the sky has visibly changed
    const key = `${state.time.toFixed(2)}|${state.mist.toFixed(2)}`;
    if (key !== lastEnvKey && (state.now - lastEnvAt > 0.12 || lastEnvAt < 0)) {
      lastEnvKey = key;
      lastEnvAt = state.now;
      skyParams(envSky, elev, state.mist);
      envSea.material.color.setRGB(0.03, 0.07, 0.09).multiplyScalar(0.3 + 0.7 * day);
      const next = pmrem.fromScene(envScene, 0, 0.1, 3000);
      scene.environment = next.texture;
      envRT?.dispose();
      envRT = next;
    }
    return out;
  }

  return { update, sun, water, sky, hemi, excludeFromReflection: (list) => mirrorExcluded.push(...list) };
}
