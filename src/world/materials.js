import * as THREE from 'three';
import { bakeSurface, bakeRGBA } from '../core/bake.js';
import * as S from '../core/surfaces.js';

// Uniforms shared by every patched material. The story timeline drives them.
export const aura = {
  uSweep: { value: -40 },                         // material front, metres along SWEEP_DIR
  uPlaster: { value: new THREE.Color(0xdcd5c9) },  // maquette colour before materials arrive
  uEdge: { value: new THREE.Color(1.0, 0.7, 0.42).multiplyScalar(0.8) },
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
float auraS(){ return dot(vAuraWP, vec3(0.24, 0.96, 0.12)) + (auraFbm(vAuraWP * 0.35) - 0.5) * 0.7; }
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
  auraGlow = 1.0 - smoothstep(0.0, 0.1, abs(aS - uSweep + 0.25));
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
  // cast plaster: soft cloudy mottling and a fine trowelled grain
  vec3 plaster = uPlaster * (0.94 + 0.07 * auraFbm(vAuraWP * 0.9) + 0.025 * auraNoise(vAuraWP * 31.0));
  diffuseColor.rgb = mix(plaster, diffuseColor.rgb, auraM);
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
  // key surfaces bake at 2048 on desktop so they hold up at eye level indoors
  const hi = renderer.capabilities.maxTextureSize >= 4096 && !/Mobi|Android/i.test(navigator.userAgent) ? 2048 : 1024;
  const t = {
    travertine: bakeSurface(renderer, S.TRAVERTINE, { size: hi, depth: 0.012 }),
    limestone: bakeSurface(renderer, S.LIMESTONE, { size: hi, depth: 0.045 }),
    oak: bakeSurface(renderer, S.OAK, { size: hi, depth: 0.005 }),
    walnut: bakeSurface(renderer, S.WALNUT, { size: hi, depth: 0.0035 }),
    slab: bakeSurface(renderer, S.SLAB, { size: hi, depth: 0.003 }),
    limewash: bakeSurface(renderer, S.LIMEWASH, { size: 1024, depth: 0.002 }),
    linen: bakeSurface(renderer, S.LINEN, { size: 1024, depth: 0.0016 }),
    leather: bakeSurface(renderer, S.LEATHER, { size: hi, depth: 0.0022 }),
    bronze: bakeSurface(renderer, S.BRONZE, { size: 1024, depth: 0.002 }),
    boucle: bakeSurface(renderer, S.BOUCLE, { size: 1024, depth: 0.0045 }),
    wool: bakeSurface(renderer, S.WOOL, { size: 1024, depth: 0.003 }),
    render: bakeSurface(renderer, S.RENDER, { size: 512, depth: 0.004 }),
    rock: bakeSurface(renderer, S.ROCK, { size: 1024, depth: 0.08 }),
    ground: bakeSurface(renderer, S.GROUND, { size: 1024, depth: 0.012 }),
    waves: bakeSurface(renderer, S.WAVES, { size: 512, depth: 0.05 }),
    art: bakeSurface(renderer, S.ARTWORK, { size: 1024, depth: 0.004 }),
    leaves: bakeRGBA(renderer, S.LEAVES_MAIN, { size: 512 }),
  };

  const std = (params, opts) => auraPatch(new THREE.MeshStandardMaterial(params), opts);
  // physical layers where the eye expects them: fabric sheen, leather and oiled
  // wood clearcoat
  const phys = (params, opts) => auraPatch(new THREE.MeshPhysicalMaterial(params), opts);
  const set = (tx) => ({ map: tx.map, normalMap: tx.normalMap, roughnessMap: tx.roughnessMap });

  const m = {
    textures: t,
    travertine: std({ ...set(t.travertine), roughness: 1 }, { uvScale: 1 / 2.4 }),
    limestone: std({ ...set(t.limestone), roughness: 1 }, { uvScale: 1 / 3 }),
    oak: std({ ...set(t.oak), roughness: 1 }, { uvScale: 1 / 2.4 }),
    render: std({ ...set(t.render), roughness: 1 }, { uvScale: 1 / 4 }),
    bronze: phys({ ...set(t.bronze), metalness: 1, roughness: 1 }, { uvScale: 1 }),
    glass: auraPatch(
      new THREE.MeshPhysicalMaterial({
        color: 0xd7e3e2, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16,
        envMapIntensity: 1.6, specularIntensity: 1, ior: 1.5, depthWrite: false, side: THREE.DoubleSide,
      }),
      { mode: 'glass' }
    ),
    glassDark: std({ color: 0x101415, metalness: 0.2, roughness: 0.04, envMapIntensity: 1.5, transparent: true, opacity: 0.34 }, {}),
    pv: std({ color: 0x0b1118, metalness: 0.35, roughness: 0.12, envMapIntensity: 1.3 }, {}),
    poolWater: std({
      color: 0x15646a, metalness: 0, roughness: 0.03, normalMap: t.waves.normalMap, normalScale: new THREE.Vector2(0.4, 0.4),
      envMapIntensity: 1.5, transparent: true, opacity: 0.94,
    }, { uvScale: 1 / 3 }),

    // Interior (printed in by the sweep)
    floorOak: phys({ ...set(t.oak), roughness: 1, clearcoat: 0.18, clearcoatRoughness: 0.42 }, { uvScale: 1 / 2.4, mode: 'reveal' }),
    wallTravertine: std({ ...set(t.travertine), roughness: 1 }, { uvScale: 1 / 2.4, mode: 'reveal' }),
    boucle: phys({ ...set(t.boucle), roughness: 1, color: 0xf1ece3, sheen: 1, sheenRoughness: 0.75, sheenColor: 0xfff4e6 }, { uvScale: 1 / 0.4, mode: 'reveal' }),
    boucleDark: phys({ ...set(t.boucle), roughness: 1, color: 0xbdb2a0, sheen: 1, sheenRoughness: 0.7, sheenColor: 0xe9dcc8 }, { uvScale: 1 / 0.4, mode: 'reveal' }),
    wool: std({ ...set(t.wool), roughness: 1 }, { uvScale: 1, mode: 'reveal' }),
    walnut: phys({ ...set(t.walnut), roughness: 1, clearcoat: 0.16, clearcoatRoughness: 0.5 }, { uvScale: 1 / 1.2, mode: 'reveal' }),
    cognac: phys({ ...set(t.leather), roughness: 1, clearcoat: 0.08, clearcoatRoughness: 0.6, sheen: 0.25, sheenRoughness: 0.7, sheenColor: 0x8a4a2a }, { uvScale: 1 / 0.3, mode: 'reveal' }),
    cognacDark: phys({ ...set(t.leather), roughness: 1, color: 0x6a4f42, clearcoat: 0.08, clearcoatRoughness: 0.6 }, { uvScale: 1 / 0.3, mode: 'reveal' }),
    basalt: std({ color: 0x2b2926, roughness: 0.62, normalMap: t.render.normalMap }, { uvScale: 1, mode: 'reveal' }),
    bronzeInterior: phys({ ...set(t.bronze), metalness: 1, roughness: 1 }, { uvScale: 1, mode: 'reveal' }),
    ceramic: std({ color: 0xcfc6b8, roughness: 0.45 }, { mode: 'reveal' }),
    steel: std({ color: 0x1b1a19, metalness: 0.85, roughness: 0.55, normalMap: t.bronze.normalMap }, { uvScale: 1, mode: 'reveal' }),
    soot: std({ color: 0x050505, roughness: 1 }, { mode: 'reveal' }),
    ceramicDark: std({ color: 0x3a3430, roughness: 0.5 }, { mode: 'reveal' }),
    terracotta: std({ color: 0x9c5a3c, roughness: 0.85, normalMap: t.render.normalMap }, { uvScale: 2, mode: 'reveal' }),
    art: std({ ...set(t.art), roughness: 1 }, { uvScale: 1, mode: 'reveal' }),
    linen: std({ color: 0xf4f0e8, roughness: 1, transparent: true, opacity: 0.78, side: THREE.DoubleSide, normalMap: t.wool.normalMap, emissive: 0x2a2620 }, { uvScale: 1, mode: 'reveal' }),
    // warm limewash. The rooms have no sky of their own, so they take little of the cold
    // daylight environment and glow slightly warm while lit (see rooms.js)
    plaster: std({ ...set(t.limewash), roughness: 1, envMapIntensity: 0.22, emissive: 0xffd9ae, emissiveMap: t.limewash.map, emissiveIntensity: 0 }, { uvScale: 1 / 3, mode: 'reveal' }),
    ceiling: std({ ...set(t.limewash), roughness: 1, color: 0xfff6ea, envMapIntensity: 0.22, emissive: 0xffe2bd, emissiveMap: t.limewash.map, emissiveIntensity: 0 }, { uvScale: 1 / 3, mode: 'reveal' }),
    woolWarm: std({ ...set(t.wool), roughness: 1, color: 0xe6c49c }, { uvScale: 1, mode: 'reveal' }),
    thread: std({ color: 0x9c8a72, roughness: 0.8 }, { mode: 'reveal' }),
    // fabrics and stone for the private rooms
    linenSheet: phys({ ...set(t.linen), roughness: 1, color: 0xf3efe6, sheen: 0.6, sheenRoughness: 0.85, sheenColor: 0xffffff }, { uvScale: 1 / 0.3, mode: 'reveal' }),
    linenClay: phys({ ...set(t.linen), roughness: 1, color: 0xb69a7c, sheen: 0.6, sheenRoughness: 0.85, sheenColor: 0xe8d4bc }, { uvScale: 1 / 0.3, mode: 'reveal' }),
    linenCharcoal: phys({ ...set(t.linen), roughness: 1, color: 0x4b4640, sheen: 0.5, sheenRoughness: 0.85, sheenColor: 0x8d857a }, { uvScale: 1 / 0.3, mode: 'reveal' }),
    slab: std({ ...set(t.slab), roughness: 1, envMapIntensity: 0.5 }, { uvScale: 1 / 3, mode: 'reveal' }),
    slabDark: std({ ...set(t.slab), roughness: 1, color: 0x5d5850, envMapIntensity: 0.5 }, { uvScale: 1 / 3, mode: 'reveal' }),
    solid: std({ color: 0xece7dd, roughness: 0.32, envMapIntensity: 0.7 }, { mode: 'reveal' }),
    // stone lit from behind, and the lights of the private rooms, which stay on
    backlit: std({ map: t.slab.map, color: 0xffffff, roughness: 0.6, emissive: 0xffc98e, emissiveMap: t.slab.map, emissiveIntensity: 0, envMapIntensity: 0.3 }, { uvScale: 1 / 3, mode: 'reveal' }),
    roomGlow: std({ color: 0x111111, emissive: 0xffc890, emissiveIntensity: 0 }, { mode: 'reveal' }),
    roomShade: std({ color: 0xf6efe2, roughness: 0.5, emissive: 0xffd4a0, emissiveIntensity: 0, side: THREE.DoubleSide }, { mode: 'reveal' }),
    mirror: std({ color: 0x8d8478, metalness: 1, roughness: 0.38, envMapIntensity: 0.4 }, { mode: 'reveal' }),
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
    outdoorFabric: phys({ ...set(t.wool), roughness: 1, color: 0xefe8db, sheen: 0.8, sheenRoughness: 0.8, sheenColor: 0xfff6ea }, { uvScale: 2.2, mode: 'reveal' }),
    cord: std({ color: 0x3d3a35, roughness: 0.9, normalMap: t.wool.normalMap }, { uvScale: 6, mode: 'reveal' }),
    towel: phys({ ...set(t.boucle), roughness: 1, color: 0xb9a084, sheen: 1, sheenRoughness: 0.9, sheenColor: 0xf0e2cc }, { uvScale: 1 / 0.25, mode: 'reveal' }),
    teak: phys({ ...set(t.walnut), roughness: 1, color: 0xf0c49a, clearcoat: 0.12, clearcoatRoughness: 0.6 }, { uvScale: 1 / 1.2, mode: 'reveal' }),
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
