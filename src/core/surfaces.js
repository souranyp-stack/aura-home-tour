// Procedural surface definitions, baked once on the GPU by bake.js.
// Each texture represents a fixed physical tile (noted per surface) so
// geometry can carry metric UVs and materials scale by 1 / tile size.

// Honed vein-cut travertine, 2.4 m tile: 1200 x 600 slabs in running bond.
// Fine parallel bedding that undulates slowly, sparse elongated pores, 2 mm
// filled joints; slab-to-slab tone shifts are kept small, as in a selected lot.
export const TRAVERTINE = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  vec2 t = vec2(uv.x * 2.0, uv.y * 4.0);
  float row = floor(t.y);
  t.x += mod(row, 2.0) * 0.5;
  vec2 cell = floor(t);
  vec2 f = fract(t);
  float id = hash12(mod(cell, vec2(2.0, 4.0)) + 3.7);

  float und = pfbm(uv + id * 0.37, vec2(2.0, 4.0), 3) * 0.03;
  float y = uv.y + und;
  float fine = pfbm(vec2(uv.x, y), vec2(2.0, 72.0), 4);
  float broad = pfbm(vec2(uv.x, y + id * 0.21), vec2(2.0, 12.0), 3);
  vec3 ivory = vec3(0.90, 0.86, 0.78);
  vec3 beige = vec3(0.82, 0.74, 0.62);
  vec3 honey = vec3(0.74, 0.63, 0.49);
  col = mix(ivory, beige, smoothstep(-0.35, 0.3, broad));
  // vein-cut bedding: many fine warm bands, some darker seams between them
  col = mix(col, honey, smoothstep(0.05, 0.5, fine) * 0.5);
  float seamB = 1.0 - smoothstep(0.0, 0.05, abs(pnoise(vec2(uv.x * 2.0, y * 46.0), vec2(2.0, 46.0))));
  col = mix(col, honey * 0.92, seamB * 0.35);
  col *= 0.985 + 0.035 * id;

  // pores: elongated along the bedding, soft-edged and shallow, never black
  vec3 vo = pvoronoi(vec2(uv.x, y), vec2(22.0, 170.0));
  float pore = (1.0 - smoothstep(0.08, 0.34, vo.x)) * step(0.8, vo.z);
  col = mix(col, col * vec3(0.84, 0.8, 0.74), pore * 0.7);

  float jx = min(f.x, 1.0 - f.x) * 1.2;
  float jy = min(f.y, 1.0 - f.y) * 0.6;
  float joint = 1.0 - smoothstep(0.0008, 0.0022, min(jx, jy));
  col = mix(col, vec3(0.72, 0.69, 0.64), joint * 0.85);

  h = 0.7 + 0.025 * fine - pore * 0.12 - joint * 0.4;
  r = 0.48 + 0.08 * fine + pore * 0.3 + joint * 0.2;
}`;

// Dry-laid split-face limestone, 3 m tile. Courses vary from 125 to 375 mm,
// stones from a hand's width to over a metre, each with its own split face,
// tone and set (proud or shy of the wall). Joints are shadow, not mortar.
export const LIMESTONE = /* glsl */ `
float courseStart(float u){ return (mod(u, 24.0) < 0.5 || hash12(vec2(mod(u, 24.0), 4.7)) > 0.5) ? 1.0 : 0.0; }
float stoneJit(float k, float n, float row){ return (hash12(vec2(mod(k, n), row + 1.3)) - 0.5) * 0.55; }
void surface(vec2 uv, out vec3 col, out float h, out float r){
  // courses: 24 units of 125 mm; a course spans one to three units
  float uy = uv.y * 24.0;
  float u = floor(uy);
  float c0 = u;
  for (int i = 0; i < 2; i++) { if (courseStart(c0) < 0.5) c0 -= 1.0; }
  float c1 = u + 1.0;
  for (int i = 0; i < 2; i++) { if (courseStart(c1) < 0.5) c1 += 1.0; }
  float row = mod(c0, 24.0);
  float cy = (uy - c0) / (c1 - c0);
  float courseH = (c1 - c0) * 0.125;

  // stones along the course: n per tile, boundaries jittered
  float n = 3.0 + floor(hash12(vec2(row, 7.0)) * 5.0);
  // head joints lean a little, as hand-split stones never meet square
  float x = uv.x * n + hash12(vec2(row, 13.0)) * n;
  float lean = (cy - 0.5) * 0.14;
  float k = floor(x);
  float j0 = stoneJit(k, n, row) + lean * (hash12(vec2(mod(k, n), row + 7.7)) - 0.5) * 2.0;
  float j1 = stoneJit(k + 1.0, n, row) + lean * (hash12(vec2(mod(k + 1.0, n), row + 7.7)) - 0.5) * 2.0;
  float b0 = k + j0;
  float b1 = k + 1.0 + j1;
  float sk = k, s0 = b0, s1 = b1;
  if (x < b0) { sk = k - 1.0; s0 = k - 1.0 + stoneJit(k - 1.0, n, row); s1 = b0; }
  else if (x >= b1) { sk = k + 1.0; s0 = b1; s1 = k + 2.0 + stoneJit(k + 2.0, n, row); }
  float sid = hash12(vec2(mod(sk, n), row) + 0.37);
  float len = (s1 - s0) * 3.0 / n;
  float dx = min(x - s0, s1 - x) * 3.0 / n;
  float dy = min(cy, 1.0 - cy) * courseH;
  float ragged = pfbm(uv + sid, vec2(40.0, 40.0), 3) * 0.011 + pfbm(uv, vec2(160.0, 160.0), 2) * 0.003;
  float d = min(dx, dy) + ragged;
  float gap = 1.0 - smoothstep(0.0015, 0.0045, d);
  float arris = smoothstep(0.0, 0.035, d);

  // split face: coarse conchoidal relief plus fine grain
  float face = pfbm(uv * vec2(1.0, 1.0) + sid * 5.3, vec2(9.0, 9.0), 5);
  float grain = pfbm(uv, vec2(120.0, 120.0), 3);
  float set = (hash12(vec2(sid, 2.0)) - 0.5) * 0.25;

  vec3 cream = vec3(0.86, 0.80, 0.70);
  vec3 sand = vec3(0.80, 0.72, 0.59);
  vec3 grey = vec3(0.72, 0.69, 0.63);
  col = mix(cream, sand, smoothstep(0.25, 0.75, sid));
  col = mix(col, grey, smoothstep(0.75, 0.95, hash12(vec2(sid, 9.0))) * 0.8);
  float iron = smoothstep(0.55, 0.8, pfbm(uv + sid * 2.0, vec2(5.0, 5.0), 3)) * step(0.7, hash12(vec2(sid, 3.0)));
  col = mix(col, col * vec3(1.02, 0.86, 0.68), iron * 0.6);
  col *= 0.92 + 0.1 * face + 0.04 * grain;
  col *= mix(0.88, 1.0, arris);
  col = mix(col, col * 0.55, gap);

  h = gap > 0.5 ? 0.02 : 0.4 + set + arris * (0.32 + 0.22 * face) + 0.03 * grain;
  r = mix(0.84 + 0.08 * grain, 1.0, gap);
}`;

// Wide-board white oak, 2.4 m tile: 240 mm boards, staggered butt joints,
// flat-sawn cathedral grain with the odd quartersawn fleck and pin knot,
// hard-wax oil (low sheen). Natural colour, not stained.
export const OAK = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float rows = 10.0;
  float ry = uv.y * rows;
  float row = floor(ry);
  float v = fract(ry);
  float pid0 = hash12(vec2(row, 8.4));
  // one or two butt joints per row per tile
  float j1 = hash12(vec2(row, 3.1));
  float two = step(0.5, hash12(vec2(row, 5.9)));
  float j2 = fract(j1 + 0.5);
  float ux = uv.x;
  // a row holds one 2.4 m board, or two boards between the joints; the board
  // that crosses the tile edge keeps one identity so the tiling stays seamless
  float jmin = min(j1, j2), jmax = max(j1, j2);
  float seg = two * ((ux >= jmin && ux < jmax) ? 1.0 : 0.0);
  float pid = hash12(vec2(row, pid0 * 31.0 + seg));
  float dj = min(abs(ux - j1), abs(ux - j1 - 1.0));
  dj = min(dj, abs(ux - j1 + 1.0));
  if (two > 0.5) dj = min(dj, min(abs(ux - j2), min(abs(ux - j2 - 1.0), abs(ux - j2 + 1.0))));

  // cathedral grain: growth rings sliced at a shallow angle
  float drift = pfbm(vec2(ux, uv.y), vec2(3.0, 20.0), 3);
  float arch = (v - 0.5) * 2.0;
  float g = abs(arch + 0.22 * sin(ux * 6.28318 * 2.0 + pid * 6.28) + drift * 0.3);
  float ringN = 14.0 + pid * 10.0;
  float ring = fract(g * ringN + ux * (1.0 + pid) * 2.0);
  float late = smoothstep(0.7, 0.96, ring) * (1.0 - smoothstep(0.96, 1.0, ring));
  float fine = pfbm(vec2(ux, uv.y + drift * 0.01), vec2(4.0, 260.0), 4);

  vec3 light = vec3(0.72, 0.56, 0.39);
  vec3 mid = vec3(0.62, 0.47, 0.32);
  vec3 dark = vec3(0.45, 0.32, 0.21);
  col = mix(light, mid, 0.3 + 0.45 * pid + 0.3 * fine);
  col = mix(col, dark, late * 0.32);
  // quartersawn ray flecks: rare, small, satin
  vec3 vo = pvoronoi(vec2(ux, uv.y), vec2(18.0, 300.0));
  float fleck = (1.0 - smoothstep(0.05, 0.25, vo.x)) * step(0.93, vo.z);
  col = mix(col, light * 1.06, fleck * 0.5);
  // pin knots
  vec3 kn = pvoronoi(uv, vec2(5.0, 10.0));
  float knot = (1.0 - smoothstep(0.015, 0.045, kn.x)) * step(0.97, kn.z);
  col = mix(col, vec3(0.36, 0.26, 0.18), knot);

  float seamV = 1.0 - smoothstep(0.0, 0.0035, min(v, 1.0 - v));
  float seamU = (1.0 - smoothstep(0.0, 0.0016, dj)) * 0.55;
  float seam = max(seamV, seamU);
  col = mix(col, col * 0.5, seam * 0.8);

  h = 0.6 + fine * 0.04 + late * 0.02 - seam * 0.5 - knot * 0.1;
  r = 0.6 + fine * 0.08 - late * 0.05 + seam * 0.2;
}`;

// Black walnut, 1.2 m tile, 150 mm straight-grained boards, oiled.
export const WALNUT = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float rows = 8.0;
  float row = floor(uv.y * rows);
  float v = fract(uv.y * rows);
  float pid = hash12(vec2(row, 2.2));
  float drift = pfbm(uv, vec2(2.0, 16.0), 3);
  float grain = pfbm(vec2(uv.x, uv.y + drift * 0.02), vec2(3.0, 240.0), 4);
  float ring = fract((v + drift * 0.3) * (5.0 + pid * 4.0) + uv.x * 0.5);
  float late = smoothstep(0.6, 0.95, ring);
  col = mix(vec3(0.38, 0.26, 0.18), vec3(0.27, 0.18, 0.12), 0.4 * pid + 0.4 * late + 0.25 * grain);
  col = mix(col, vec3(0.46, 0.33, 0.22), smoothstep(0.55, 0.9, pfbm(uv, vec2(3.0, 6.0), 3)) * 0.35);
  float seam = 1.0 - smoothstep(0.0, 0.004, min(v, 1.0 - v));
  col = mix(col, col * 0.55, seam);
  h = 0.6 + grain * 0.05 + late * 0.02 - seam * 0.4;
  r = 0.5 + grain * 0.08;
}`;

// Vegetable-tanned saddle leather, 0.3 m tile: pebble grain and creases.
export const LEATHER = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  vec3 a = pvoronoi(uv, vec2(90.0, 90.0));
  vec3 b = pvoronoi(uv + 0.31, vec2(170.0, 170.0));
  float pebble = smoothstep(0.0, 0.55, a.x) * 0.65 + smoothstep(0.0, 0.5, b.x) * 0.35;
  float crease = 1.0 - smoothstep(0.0, 0.05, a.y - a.x);
  float tone = pfbm(uv, vec2(4.0, 4.0), 4);
  float wear = smoothstep(0.35, 0.7, pfbm(uv, vec2(2.0, 2.0), 3));
  col = mix(vec3(0.56, 0.31, 0.17), vec3(0.45, 0.23, 0.12), 0.5 + 0.5 * tone);
  col = mix(col, vec3(0.64, 0.38, 0.22), wear * 0.25);
  col *= 0.94 + 0.08 * (1.0 - pebble);
  col = mix(col, col * 0.78, crease * 0.6);
  h = 1.0 - pebble * 0.7 - crease * 0.3;
  r = 0.5 + 0.12 * pebble - wear * 0.12;
}`;

// Patinated bronze, 1 m tile: fine directional brushing, slow patina drift.
export const BRONZE = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float brush = pfbm(vec2(uv.x, uv.y), vec2(2.0, 420.0), 3);
  float scratch = pfbm(vec2(uv.x, uv.y), vec2(6.0, 900.0), 2);
  float patina = smoothstep(0.1, 0.7, pfbm(uv, vec2(3.0, 3.0), 5));
  float verd = smoothstep(0.55, 0.8, pfbm(uv + 0.4, vec2(5.0, 5.0), 4));
  col = mix(vec3(0.46, 0.33, 0.21), vec3(0.30, 0.22, 0.15), patina);
  col = mix(col, vec3(0.28, 0.30, 0.24), verd * 0.35);
  col *= 0.94 + 0.08 * brush;
  h = 0.5 + 0.1 * brush + 0.05 * scratch;
  r = 0.28 + 0.18 * patina + 0.08 * brush;
}`;

// Boucle upholstery, 0.4 m tile.
export const BOUCLE = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  vec3 v = pvoronoi(uv, vec2(72.0, 72.0));
  vec3 v2 = pvoronoi(uv + 0.5, vec2(130.0, 130.0));
  float loops = smoothstep(0.0, 0.55, v.x) * 0.6 + smoothstep(0.0, 0.5, v2.x) * 0.4;
  h = 1.0 - loops;
  float n = pfbm(uv, vec2(8.0, 8.0), 3);
  col = vec3(0.93, 0.91, 0.87) * (0.8 + 0.2 * h) * (0.96 + 0.06 * n);
  r = 0.92;
}`;

// Hand-loomed wool for rugs, 1 m tile.
export const WOOL = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float wx = sin(uv.x * 6.28318 * 220.0) * 0.5 + 0.5;
  float wy = sin(uv.y * 6.28318 * 110.0) * 0.5 + 0.5;
  float n = pfbm(uv, vec2(24.0, 24.0), 4);
  float big = pfbm(uv, vec2(3.0, 3.0), 3);
  h = mix(wx, wy, step(0.5, fract(uv.y * 110.0))) * 0.6 + n * 0.3;
  col = vec3(0.80, 0.75, 0.67) * (0.88 + 0.12 * h) * (0.95 + 0.08 * big);
  r = 0.97;
}`;

// Fine light concrete / lime render, 4 m tile.
export const RENDER = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float n = pfbm(uv, vec2(4.0, 4.0), 6);
  float f = pfbm(uv, vec2(96.0, 96.0), 3);
  col = vec3(0.84, 0.82, 0.78) * (0.95 + 0.07 * n + 0.03 * f);
  h = 0.5 + 0.3 * f + 0.1 * n;
  r = 0.86 + 0.06 * f;
}`;

// Bedded coastal limestone for the cliff, 24 m tile (triplanar; y is vertical).
// Horizontal beds of varying thickness, sparse vertical joints, rain streaks.
export const ROCK = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float warp = pfbm(uv, vec2(3.0, 2.0), 4);
  float by = uv.y * 11.0 + warp * 0.7;
  float layer = floor(by);
  float lf = fract(by);
  float lid = hash12(vec2(mod(layer, 11.0), 1.3));
  float lid2 = hash12(vec2(mod(layer, 11.0), 8.9));

  // each bed weathers back at its top and bottom
  float bed = smoothstep(0.0, 0.07 + 0.06 * lid, lf) * smoothstep(1.0, 0.9 - 0.06 * lid2, lf);

  // vertical joints, a few per bed, slightly wandering
  float jn = 2.0 + floor(lid * 4.0);
  float jx = fract(uv.x * jn + lid2 * 3.0 + warp * 0.08);
  float joint = (1.0 - smoothstep(0.0, 0.018, min(jx, 1.0 - jx))) * step(0.35, lid2);

  float pit = pfbm(uv, vec2(28.0, 28.0), 5);
  float streak = pfbm(vec2(uv.x, uv.y), vec2(48.0, 2.0), 4);
  float patchy = pfbm(uv, vec2(6.0, 6.0), 4);

  vec3 cream = vec3(0.80, 0.73, 0.61);
  vec3 grey = vec3(0.66, 0.63, 0.58);
  vec3 ochre = vec3(0.76, 0.60, 0.43);
  col = mix(cream, grey, smoothstep(0.25, 0.85, lid));
  col = mix(col, ochre, smoothstep(0.75, 0.95, lid2) * 0.55);
  col *= 0.9 + 0.12 * pit;
  col = mix(col, vec3(0.40, 0.38, 0.35), smoothstep(0.05, 0.45, streak) * 0.42);
  col = mix(col, vec3(0.70, 0.69, 0.58), smoothstep(0.35, 0.6, patchy) * 0.18);
  col *= mix(0.74, 1.0, bed);
  col = mix(col, col * 0.4, joint);

  h = 0.25 + 0.45 * bed + 0.18 * pit - joint * 0.35;
  r = 0.92;
}`;

// Dry Mediterranean ground cover, 8 m tile.
export const GROUND = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float big = pfbm(uv, vec2(2.0, 2.0), 4);
  float mid = pfbm(uv, vec2(9.0, 9.0), 4);
  float blades = pfbm(vec2(uv.x, uv.y), vec2(160.0, 60.0), 3);
  vec3 straw = vec3(0.64, 0.58, 0.38);
  vec3 olive = vec3(0.34, 0.37, 0.21);
  vec3 earth = vec3(0.48, 0.39, 0.29);
  col = mix(straw, olive, smoothstep(-0.2, 0.4, big));
  col = mix(col, earth, smoothstep(0.25, 0.6, mid) * 0.6);
  col *= 0.8 + 0.3 * (blades * 0.5 + 0.5);
  vec3 vo = pvoronoi(uv, vec2(60.0, 60.0));
  float pebble = (1.0 - smoothstep(0.12, 0.22, vo.x)) * step(0.9, vo.z);
  col = mix(col, vec3(0.70, 0.66, 0.58), pebble);
  h = 0.5 + 0.3 * blades + 0.2 * pebble;
  r = 0.95;
}`;

// Tileable small-wave height for ocean and pool normals.
export const WAVES = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float a = pfbm(uv, vec2(6.0, 6.0), 6);
  float b = 1.0 - abs(pnoise(uv * vec2(12.0, 9.0) + a, vec2(12.0, 9.0)));
  h = a * 0.7 + b * 0.35;
  col = vec3(h);
  r = 0.05;
}`;

// The living-room canvas: a raw-umber colour field over a primed linen weave,
// broad horizontal strokes, a darker band low on the canvas, feathered edges.
export const ARTWORK = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float weave = (sin(uv.x * 6.28318 * 420.0) * 0.5 + 0.5) * (sin(uv.y * 6.28318 * 280.0) * 0.5 + 0.5);
  float stroke = pfbm(vec2(uv.x, uv.y), vec2(3.0, 48.0), 5);
  float stroke2 = pfbm(vec2(uv.x + 0.3, uv.y), vec2(6.0, 90.0), 3);
  float y = uv.y + stroke * 0.012;
  vec3 ground = mix(vec3(0.74, 0.62, 0.46), vec3(0.67, 0.53, 0.38), smoothstep(-0.3, 0.4, stroke));
  float band = smoothstep(0.24, 0.3, y) * (1.0 - smoothstep(0.46, 0.53, y));
  vec3 umber = mix(vec3(0.33, 0.24, 0.17), vec3(0.42, 0.30, 0.20), smoothstep(-0.3, 0.4, stroke2));
  col = mix(ground, umber, band * 0.92);
  float glow = smoothstep(0.55, 0.9, y) * (1.0 - smoothstep(0.92, 0.99, y));
  col = mix(col, vec3(0.80, 0.69, 0.52), glow * 0.35);
  float edge = smoothstep(0.0, 0.04, uv.x) * smoothstep(1.0, 0.96, uv.x) * smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);
  col = mix(vec3(0.86, 0.83, 0.77), col, edge);
  col *= 0.97 + 0.05 * weave;
  h = 0.5 + 0.12 * stroke + 0.05 * weave;
  r = 0.85 - 0.1 * band;
}`;

// Leaf-cluster card with alpha, tinted per species through instance colour.
export const LEAVES_MAIN = /* glsl */ `
void main(){
  vec2 p = vUv - 0.5;
  float a = 0.0;
  vec3 c = vec3(0.0);
  for (int i = 0; i < 110; i++){
    float fi = float(i);
    vec2 rnd = hash22(vec2(fi, 1.7));
    float ang = hash12(vec2(fi, 4.2)) * 6.28318;
    float rad = sqrt(rnd.x) * 0.38;
    vec2 center = vec2(cos(rnd.y * 6.28318), sin(rnd.y * 6.28318)) * rad;
    vec2 d = p - center;
    float cs = cos(ang), sn = sin(ang);
    d = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
    float L = 0.05 + 0.04 * hash12(vec2(fi, 9.1));
    float t = d.x / L;
    float wid = L * 0.3 * (1.0 - t * t);
    float inside = step(abs(t), 1.0) * (1.0 - smoothstep(wid * 0.8, wid, abs(d.y)));
    if (inside > 0.5){
      float shade = hash12(vec2(fi, 2.3));
      vec3 leaf = mix(vec3(0.55, 0.60, 0.50), vec3(0.85, 0.88, 0.78), shade);
      leaf *= 0.82 + 0.25 * (t * 0.5 + 0.5);
      leaf *= 1.0 - 0.2 * smoothstep(0.0, 0.004, abs(d.y)) * (1.0 - smoothstep(0.004, 0.01, abs(d.y)));
      c = leaf;
      a = 1.0;
    }
  }
  gl_FragColor = vec4(pow(c, vec3(2.2)), a);
}`;
