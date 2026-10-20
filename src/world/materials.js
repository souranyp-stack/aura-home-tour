import * as THREE from 'three';
import { bakeSurface, bakeRGBA } from '../core/bake.js';
import * as S from '../core/surfaces.js';

// Uniforms shared by every patched material. The story timeline drives them.
export const aura = {
  uSweep: { value: -40 },                         // material front, metres along SWEEP_DIR
  uPlaster: { value: new THREE.Color(0xe7e2d8) },  // maquette colour before materials arrive
  uEdge: { value: new THREE.Color(1.0, 0.66, 0.36).multiplyScalar(5) },
  uWorldR: { value: 0 },                          // radius of the revealed landscape
  uVoid: { value: new THREE.Color(0x0b0a09) },
  uTime: { value: 0 },
};

const AURA_FRAG_PARS = /* glsl */ `
varying vec3 vAuraWP;
uniform float uSweep;
uniform vec3 uPlaster;
uniform vec3 uEdge;
uniform float uWorldR;
uniform vec3 uVoid;
float auraHash(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float auraNoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(auraHash(i), auraHash(i + vec3(1,0,0)), f.x), mix(auraHash(i + vec3(0,1,0)), auraHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(auraHash(i + vec3(0,0,1)), auraHash(i + vec3(1,0,1)), f.x), mix(auraHash(i + vec3(0,1,1)), auraHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float auraFbm(vec3 p){ return auraNoise(p) * 0.55 + auraNoise(p * 2.1) * 0.3 + auraNoise(p * 4.3) * 0.15; }
float auraS(){ return dot(vAuraWP, vec3(0.24, 0.96, 0.12)) + (auraFbm(vAuraWP * 0.35) - 0.5) * 1.8; }
`;

/**
 * Injects the AURA behaviours into a built-in material.
 *  mode 'solid'  : plaster maquette until the sweep passes, then the real material
 *  mode 'glass'  : invisible until swept
 *  mode 'reveal' : not drawn until swept (interior objects print into existence)
 *  mode 'world'  : landscape that grows outward from the house within uWorldR
 *  mode 'none'   : metric UV scaling only
 */
export function auraPatch(material, { uvScale = 1, mode = 'solid' } = {}) {
  material.userData.uvScale = { value: uvScale };
  const defines = { solid: 'AURA_SOLID', glass: 'AURA_GLASS', reveal: 'AURA_REVEAL', world: 'AURA_WORLD', none: 'AURA_NONE' };
  material.defines = { ...(material.defines || {}), [defines[mode]]: '' };
  material.customProgramCacheKey = () => `aura-${mode}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, aura, { uUvScale: material.userData.uvScale });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vAuraWP;\nuniform float uUvScale;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
#ifdef USE_MAP
  vMapUv *= uUvScale;
#endif
#ifdef USE_NORMALMAP
  vNormalMapUv *= uUvScale;
#endif
#ifdef USE_ROUGHNESSMAP
  vRoughnessMapUv *= uUvScale;
#endif`
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vec4 auraP = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  auraP = instanceMatrix * auraP;
#endif
vAuraWP = (modelMatrix * auraP).xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + AURA_FRAG_PARS)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
float auraM = 1.0;
float auraGlow = 0.0;
float auraWV = 1.0;
#if defined(AURA_SOLID) || defined(AURA_GLASS) || defined(AURA_REVEAL)
  float aS = auraS();
  auraM = 1.0 - smoothstep(uSweep - 0.6, uSweep, aS);
  auraGlow = 1.0 - smoothstep(0.0, 0.3, abs(aS - uSweep + 0.25));
#endif
#ifdef AURA_REVEAL
  if (aS > uSweep + 0.02) discard;
  auraM = 1.0;
#endif
#ifdef AURA_GLASS
  diffuseColor.a *= auraM;
  auraGlow *= 0.35;
#endif
#ifdef AURA_SOLID
  diffuseColor.rgb = mix(uPlaster, diffuseColor.rgb, auraM);
#endif
#ifdef AURA_WORLD
  float wd = length(vAuraWP.xz - vec2(3.0, 2.0)) + (auraFbm(vAuraWP * 0.015) - 0.5) * 70.0;
  auraWV = 1.0 - smoothstep(uWorldR - 60.0, uWorldR, wd);
  if (auraWV < 0.002) discard;
#endif`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.92, roughnessFactor, auraM);'
      )
      .replace(
        '#include <metalnessmap_fragment>',
        '#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.0, metalnessFactor, auraM);'
      )
      .replace(
        '#include <normal_fragment_maps>',
        'vec3 auraN0 = normal;\n#include <normal_fragment_maps>\nnormal = normalize(mix(auraN0, normal, auraM));'
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance = totalEmissiveRadiance * auraM + uEdge * auraGlow;'
      )
      .replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\ngl_FragColor.rgb = mix(uVoid, gl_FragColor.rgb, auraWV);'
      );
  };
  return material;
}

let cache = null;

export function createMaterials(renderer) {
  if (cache) return cache;
  const t = {
    travertine: bakeSurface(renderer, S.TRAVERTINE, { size: 1024, depth: 0.012 }),
    limestone: bakeSurface(renderer, S.LIMESTONE, { size: 1024, depth: 0.05 }),
    oak: bakeSurface(renderer, S.OAK, { size: 1024, depth: 0.006 }),
    boucle: bakeSurface(renderer, S.BOUCLE, { size: 512, depth: 0.004 }),
    wool: bakeSurface(renderer, S.WOOL, { size: 512, depth: 0.003 }),
    render: bakeSurface(renderer, S.RENDER, { size: 512, depth: 0.004 }),
    rock: bakeSurface(renderer, S.ROCK, { size: 1024, depth: 0.05 }),
    ground: bakeSurface(renderer, S.GROUND, { size: 1024, depth: 0.012 }),
    waves: bakeSurface(renderer, S.WAVES, { size: 512, depth: 0.05 }),
    art: bakeSurface(renderer, S.ARTWORK, { size: 1024, depth: 0.004 }),
    leaves: bakeRGBA(renderer, S.LEAVES_MAIN, { size: 512 }),
  };

  const std = (params, opts) => auraPatch(new THREE.MeshStandardMaterial(params), opts);
  const set = (tx) => ({ map: tx.map, normalMap: tx.normalMap, roughnessMap: tx.roughnessMap });

  const m = {
    textures: t,
    travertine: std({ ...set(t.travertine), roughness: 1 }, { uvScale: 1 / 2.4 }),
    limestone: std({ ...set(t.limestone), roughness: 1 }, { uvScale: 1 / 3 }),
    oak: std({ ...set(t.oak), roughness: 1 }, { uvScale: 1 / 2 }),
    render: std({ ...set(t.render), roughness: 1 }, { uvScale: 1 / 4 }),
    bronze: std({ color: 0x3b2d20, metalness: 1, roughness: 0.36, normalMap: t.render.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) }, { uvScale: 1 / 2 }),
    glass: auraPatch(
      new THREE.MeshPhysicalMaterial({
        color: 0xd7e3e2, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16,
        envMapIntensity: 1.6, specularIntensity: 1, ior: 1.5, depthWrite: false, side: THREE.DoubleSide,
      }),
      { mode: 'glass' }
    ),
    glassDark: std({ color: 0x101415, metalness: 0.2, roughness: 0.04, envMapIntensity: 1.5 }, {}),
    poolWater: std({
      color: 0x15646a, metalness: 0, roughness: 0.03, normalMap: t.waves.normalMap, normalScale: new THREE.Vector2(0.4, 0.4),
      envMapIntensity: 1.5, transparent: true, opacity: 0.94,
    }, { uvScale: 1 / 3 }),

    // Interior (printed in by the sweep)
    floorOak: std({ ...set(t.oak), roughness: 1 }, { uvScale: 1 / 2, mode: 'reveal' }),
    wallTravertine: std({ ...set(t.travertine), roughness: 1 }, { uvScale: 1 / 2.4, mode: 'reveal' }),
    boucle: std({ ...set(t.boucle), roughness: 1, color: 0xf3efe7 }, { uvScale: 1 / 0.4, mode: 'reveal' }),
    wool: std({ ...set(t.wool), roughness: 1 }, { uvScale: 1, mode: 'reveal' }),
    walnut: std({ ...set(t.oak), roughness: 1, color: 0x8a6448 }, { uvScale: 1 / 2, mode: 'reveal' }),
    cognac: std({ color: 0x7b4a2b, roughness: 0.55, normalMap: t.render.normalMap, normalScale: new THREE.Vector2(0.4, 0.4) }, { uvScale: 2, mode: 'reveal' }),
    basalt: std({ color: 0x2b2926, roughness: 0.62, normalMap: t.render.normalMap }, { uvScale: 1, mode: 'reveal' }),
    bronzeInterior: std({ color: 0x3b2d20, metalness: 1, roughness: 0.32 }, { mode: 'reveal' }),
    ceramic: std({ color: 0xcfc6b8, roughness: 0.45 }, { mode: 'reveal' }),
    ceramicDark: std({ color: 0x3a3430, roughness: 0.5 }, { mode: 'reveal' }),
    terracotta: std({ color: 0x9c5a3c, roughness: 0.85, normalMap: t.render.normalMap }, { uvScale: 2, mode: 'reveal' }),
    art: std({ ...set(t.art), roughness: 1 }, { uvScale: 1, mode: 'reveal' }),
    linen: std({ color: 0xf4f0e8, roughness: 1, transparent: true, opacity: 0.78, side: THREE.DoubleSide, normalMap: t.wool.normalMap, emissive: 0x2a2620 }, { uvScale: 1, mode: 'reveal' }),
    lightStrip: std({ color: 0x111111, emissive: 0xffc890, emissiveIntensity: 0 }, { mode: 'reveal' }),
    pendantShade: std({ color: 0xefe6d6, roughness: 0.9, emissive: 0xffd4a0, emissiveIntensity: 0, side: THREE.DoubleSide }, { mode: 'reveal' }),
    books: std({ color: 0xffffff, roughness: 0.8, vertexColors: true }, { mode: 'reveal' }),

    // Landscape
    bark: std({ color: 0x6a5a4b, roughness: 0.95, normalMap: t.rock.normalMap }, { uvScale: 1 / 1.5, mode: 'world' }),
    leaves: (() => {
      const mat = auraPatch(
        new THREE.MeshStandardMaterial({ map: t.leaves, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, alphaToCoverage: true }),
        { mode: 'world' }
      );
      return mat;
    })(),
    outdoorFabric: std({ ...set(t.boucle), roughness: 1, color: 0xe9e2d4 }, { uvScale: 1 / 0.4, mode: 'reveal' }),
    teak: std({ ...set(t.oak), roughness: 1, color: 0x9a7356 }, { uvScale: 1 / 2, mode: 'reveal' }),
  };
  cache = m;
  return m;
}

// Rewrites a geometry's UVs to metric box projection so baked tiles keep scale.
export function metricUV(geometry) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, x, z);
    else if (ax >= az) uv.setXY(i, z, y);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
  return geometry;
}
