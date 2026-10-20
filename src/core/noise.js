// Shared GLSL noise. Periodic variants tile seamlessly when the period is an
// integer and the input is uv * period, which the texture baker relies on.
export const NOISE_GLSL = /* glsl */ `
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade2(vec2 t){ return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float hash13(vec3 p3){
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

// Periodic classic Perlin noise (Gustavson), range roughly [-1, 1].
float pnoise(vec2 P, vec2 rep){
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, rep.xyxy);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz; vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz; vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x); vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z); vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 f = fade2(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), f.x);
  return 2.3 * mix(n_x.x, n_x.y, f.y);
}

// Periodic fBm: p is uv in [0,1], freq is the integer base frequency per axis.
float pfbm(vec2 uv, vec2 freq, int oct){
  float s = 0.0, a = 0.5;
  vec2 f = freq;
  for (int i = 0; i < 8; i++){
    if (i >= oct) break;
    s += a * pnoise(uv * f + float(i) * 17.13, f);
    f *= 2.0; a *= 0.5;
  }
  return s;
}

// Periodic Voronoi. Returns (F1, F2, cell hash).
vec3 pvoronoi(vec2 uv, vec2 rep){
  vec2 p = uv * rep;
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 c = mod(i + g, rep);
    vec2 o = hash22(c);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < d1){ d2 = d1; d1 = d; id = hash12(c); }
    else if (d < d2){ d2 = d; }
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}

// Non-periodic 3D value noise for world-space effects.
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i), n100 = hash13(i + vec3(1,0,0));
  float n010 = hash13(i + vec3(0,1,0)), n110 = hash13(i + vec3(1,1,0));
  float n001 = hash13(i + vec3(0,0,1)), n101 = hash13(i + vec3(1,0,1));
  float n011 = hash13(i + vec3(0,1,1)), n111 = hash13(i + vec3(1,1,1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm3(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ s += a * vnoise3(p); p *= 2.03; a *= 0.5; }
  return s;
}
`;
