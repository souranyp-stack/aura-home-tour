// Procedural surface definitions, baked once on the GPU by bake.js.
// Each texture represents a fixed physical tile (noted per surface) so
// geometry can carry metric UVs and materials scale by 1 / tile size.

// Vein-cut travertine, 2.4 m tile: 1200 x 600 slabs in running bond.
export const TRAVERTINE = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  vec2 t = vec2(uv.x * 2.0, uv.y * 4.0);
  float row = floor(t.y);
  t.x += mod(row, 2.0) * 0.5;
  vec2 cell = floor(t);
  vec2 f = fract(t);
  float id = hash12(mod(cell, vec2(2.0, 4.0)) + 3.7);

  float w = pfbm(uv, vec2(3.0, 6.0), 3);
  float band = pfbm(vec2(uv.x + 0.04 * w, uv.y + id * 0.13), vec2(2.0, 22.0), 5);
  col = mix(vec3(0.88, 0.83, 0.74), vec3(0.79, 0.71, 0.59), smoothstep(-0.35, 0.55, band));
  float v = abs(pnoise(vec2(uv.x * 2.0, uv.y * 36.0 + w * 2.5), vec2(2.0, 36.0)));
  float vein = 1.0 - smoothstep(0.0, 0.07, v);
  col = mix(col, vec3(0.71, 0.63, 0.51), vein * 0.3);
  col *= 0.95 + 0.08 * id;
  col += vec3(0.01, 0.005, -0.01) * (id - 0.5);

  vec3 vo = pvoronoi(uv, vec2(26.0, 90.0));
  float pit = (1.0 - smoothstep(0.08, 0.2, vo.x)) * step(0.78, vo.z);
  float speck = pfbm(uv, vec2(64.0, 64.0), 2);
  col = mix(col, vec3(0.63, 0.55, 0.44), pit * 0.8);
  col *= 0.97 + 0.04 * speck;

  float jx = min(f.x, 1.0 - f.x) * 1.2;
  float jy = min(f.y, 1.0 - f.y) * 0.6;
  float joint = 1.0 - smoothstep(0.0012, 0.0032, min(jx, jy));
  col = mix(col, col * 0.72, joint);

  h = 0.7 + 0.04 * band - pit * 0.45 - joint * 0.6 + 0.02 * speck;
  r = 0.46 + 0.08 * band + pit * 0.35 + joint * 0.3;
}`;

// Split-face limestone in random-length courses, 3 m tile.
export const LIMESTONE = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float rows = 8.0;
  float ry = uv.y * rows;
  float row = floor(ry);
  float fy = fract(ry);
  float rh = hash12(vec2(row, 7.0));
  float n = 3.0 + floor(rh * 3.0);
  float off = hash12(vec2(row, 13.0));
  float rx = uv.x * n + off;
  float ci = floor(rx);
  float fx = fract(rx);
  float bid = hash12(vec2(mod(ci, n), row) + 0.37);

  float dx = min(fx, 1.0 - fx) * (3.0 / n);
  float dy = min(fy, 1.0 - fy) * (3.0 / rows);
  float d = min(dx, dy);
  float mortar = 1.0 - smoothstep(0.004, 0.009, d);
  float bevel = smoothstep(0.004, 0.06, d);

  float relief = pfbm(uv + bid, vec2(10.0, 10.0), 6);
  float fine = pfbm(uv, vec2(80.0, 80.0), 3);

  vec3 a = vec3(0.84, 0.78, 0.68);
  vec3 b = vec3(0.72, 0.68, 0.60);
  vec3 c = vec3(0.80, 0.69, 0.54);
  col = mix(a, b, smoothstep(0.2, 0.8, bid));
  col = mix(col, c, smoothstep(0.65, 0.95, hash12(vec2(bid, 5.0))) * 0.7);
  col *= 0.9 + 0.12 * relief + 0.05 * fine;
  col *= mix(0.86, 1.0, bevel);
  col = mix(col, vec3(0.56, 0.52, 0.47), mortar);

  h = mortar > 0.5 ? 0.05 : 0.35 + 0.45 * bevel * (0.65 + 0.5 * relief) + 0.04 * fine;
  r = mix(0.82 + 0.1 * fine, 0.95, mortar);
}`;

// Wide-plank white oak, 2 m tile, 200 mm boards.
export const OAK = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float rows = 10.0;
  float ry = uv.y * rows;
  float row = floor(ry);
  float fy = fract(ry);
  float off = hash12(vec2(row, 3.1));
  float fx = fract(uv.x + off);
  float pid = hash12(vec2(row, 8.4));

  float w = pfbm(uv, vec2(2.0, 20.0), 3);
  float g = pfbm(vec2(uv.x, uv.y + w * 0.015), vec2(3.0, 220.0), 4);
  float rings = sin((uv.y * rows * 5.0 + w * 3.0 + pid * 9.0) * 6.28318) * 0.5 + 0.5;
  rings = smoothstep(0.2, 1.0, rings);
  col = mix(vec3(0.74, 0.58, 0.41), vec3(0.60, 0.45, 0.30), rings * 0.45 + g * 0.5 + 0.1);
  col *= 0.9 + 0.18 * pid;
  col = mix(col, col * vec3(1.02, 0.98, 0.93), hash12(vec2(row, 1.9)));

  float d = min(min(fy, 1.0 - fy) * 0.2, min(fx, 1.0 - fx) * 2.0);
  float seam = 1.0 - smoothstep(0.0006, 0.0022, d);
  col = mix(col, col * 0.55, seam);

  h = 0.6 + g * 0.08 + rings * 0.03 - seam * 0.5;
  r = 0.52 + g * 0.12 + seam * 0.2;
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

// Stratified coastal limestone for the cliff, 14 m tile (triplanar).
export const ROCK = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  float warp = pfbm(uv, vec2(3.0, 3.0), 4);
  float strata = pfbm(vec2(uv.x + 0.1 * warp, uv.y), vec2(2.0, 26.0), 5);
  vec3 vo = pvoronoi(uv + warp * 0.05, vec2(9.0, 14.0));
  float crack = 1.0 - smoothstep(0.0, 0.06, vo.y - vo.x);
  float detail = pfbm(uv, vec2(40.0, 40.0), 4);
  float big = pfbm(uv, vec2(2.0, 2.0), 3);
  col = mix(vec3(0.64, 0.57, 0.47), vec3(0.50, 0.46, 0.40), smoothstep(-0.4, 0.5, strata));
  col = mix(col, vec3(0.66, 0.50, 0.36), smoothstep(0.2, 0.6, big) * 0.45);
  col = mix(col, vec3(0.30, 0.28, 0.25), smoothstep(0.3, 0.75, detail + strata * 0.3) * 0.35);
  col *= 0.9 + 0.15 * vo.z;
  col = mix(col, col * 0.45, crack);
  h = 0.5 + 0.25 * strata + 0.15 * detail + 0.1 * vo.x - crack * 0.4;
  r = 0.9;
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

// Large abstract canvas for the living room wall.
export const ARTWORK = /* glsl */ `
void surface(vec2 uv, out vec3 col, out float h, out float r){
  vec2 p = uv;
  float brush = pfbm(vec2(p.x, p.y), vec2(3.0, 60.0), 5);
  float brush2 = pfbm(p, vec2(30.0, 4.0), 4);
  vec3 ground = mix(vec3(0.86, 0.80, 0.70), vec3(0.80, 0.72, 0.60), smoothstep(-0.3, 0.4, brush));
  float arc = abs(length((p - vec2(0.38, 0.0)) * vec2(1.0, 1.25)) - 0.55);
  float stroke = 1.0 - smoothstep(0.06, 0.075 + 0.02 * brush2, arc);
  vec3 terracotta = mix(vec3(0.55, 0.25, 0.14), vec3(0.66, 0.33, 0.18), brush2 * 0.5 + 0.5);
  col = mix(ground, terracotta, stroke * step(0.06, p.y));
  float band = smoothstep(0.69, 0.7, p.y) * (1.0 - smoothstep(0.76, 0.765 + 0.01 * brush, p.y));
  col = mix(col, vec3(0.16, 0.15, 0.14), band * step(0.12, p.x) * (1.0 - step(0.9, p.x)));
  h = 0.5 + 0.2 * brush + 0.2 * stroke;
  r = 0.8;
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
