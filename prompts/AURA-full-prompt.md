You are a senior creative developer and three.js technical artist. Build AURA, The Living Sanctuary: a complete, cinematic, scroll-driven 3D landing page for a fictional luxury house on a limestone cliff. It should read as an award-level architectural visualization that runs live in the browser.

Build the whole thing from this brief in one project. Every number and every line of copy below is final, so use them exactly as written. Where the brief leaves a detail open, choose the most realistic and restrained option.

# Hard rules

1. No image, 3D model, video, audio or font files ship with the site. Every surface is generated in the browser with GLSL baked to textures. Every still is captured from the live scene at runtime. All sound is synthesised with WebAudio.
2. No AI slop. No chapter numbers anywhere (no 01 / 02 / 03). No gradient text, no emoji, no glowing cards, no decorative UI.
3. Restrained light. Glow must stay subtle and clean. Bloom only touches the true highlights. No white flares and no glitter on metal. Do not use material anisotropy on bronze, because it creates bad pixels that bloom amplifies.
4. No magnetic button effects.
5. Motion everywhere, always with GSAP. Headlines reveal by line with SplitText, rules and drawings draw on with DrawSVG, and sections are pinned or scrubbed with ScrollTrigger. Lenis handles smooth scroll. Respect `prefers-reduced-motion`.
6. Every architectural element has real dimensions, in metres. Bevel every box edge (RoundedBox, radius about 25 mm). No perfect machine edges.
7. Modern luxury everywhere, indoors and out. Furniture faces the way a person would use it: the two armchairs turn toward the sofa, never toward a wall.
8. Verify your work repeatedly in a real browser, as described at the end, and fix what you find until it is right.

# Stack (pin these exact versions)

- three 0.169.0 (r169), gsap 3.13.0 (ScrollTrigger, SplitText, DrawSVGPlugin), lenis 1.1.14
- vite 5.4.10, terser 5.51.2
- Plain JavaScript modules, no framework
- Google Fonts: Cormorant Garamond (italic and roman, weights 300 and 400) and Manrope (300 to 600)
- Vite build with terser: module on, toplevel on, 3 passes
- The dev server runs on port 5288

Suggested layout: `index.html`, `src/style.css`, `src/main.js`, `src/core/` (surfaces, snapshot, sound), `src/world/` (house, interior, landscape, vegetation, desk, walkPlan), `src/story/timeline.js`, `src/ui/` (ui, page, walk, metalButton).

# The one borrowed component

The primary CTAs use the Liquid Metal Button from ThreeUI's free community package, `@designcodeio/threeui` 1.2.0 (https://threeui.com/buttons/liquid-metal-button, MIT, Copyright (c) 2026 Meng To). Keep its shaders, tone the metal to bronze, and replace its React wrapper with plain JavaScript in `src/ui/metalButton.js`. Add a per-frame check that re-measures the canvas when it falls out of step with its element, so the ring never goes stale after a resize. Include the MIT notice in `THIRD_PARTY_NOTICES.md`. Use nothing from ThreeUI PRO.

# Design tokens

```css
--ink:#0b0a09; --ink-2:#121110; --bone:#efe9df;
--mute:rgba(239,233,223,.68); --faint:rgba(239,233,223,.4); --line:rgba(239,233,223,.14);
--bronze:#c9a36b; --glass:rgba(16,14,12,.46);
--serif:'Cormorant Garamond'; --sans:'Manrope';
--gutter:clamp(16px,3.2vw,48px); --ease:cubic-bezier(.22,1,.36,1);
--bar:72px; /* 56px on phones */
```

The film scroll spacer is `height:1940vh`. The hero word AURA is `clamp(96px,14.2vw,250px)`, weight 300, in the serif. The header is frosted glass. Italic serif is used for the emphasised words marked with asterisks below. Text must always have strong contrast against what is behind it.

# Rendering

- Post chain: RenderPass (film scene), then GTAO on desktop only, then an OverlayPass that composites the desk scene and handles its dissolve, then UnrealBloom (strength 0.2, radius 0.5, threshold 1.05), then a final shader with ACES tone mapping, sRGB output, vignette .28 and film grain .028.
- Exposure 0.92. Device pixel ratio capped at 1.5, with adaptive resolution that lowers it when frames run long.
- Three.js `Water` (waterColor 0x0b2630, distortionScale 3.2) and `Sky`.
- Render a real shadow map from the sun. Foliage is split by distance so only planting near the house renders into the shadow frustum.
- Runtime stills and material swatches are drawn from the live model to WebP blobs (`src/core/snapshot.js`).

# Procedural surfaces (`src/core/surfaces.js`)

Write one `bakeSurface` helper that renders GLSL into albedo, normal and roughness textures on the GPU. Tile sizes are physical, and geometry uses metric UVs so the scale is true everywhere:

| Surface | Tile | Character |
|---|---|---|
| TRAVERTINE | 2.4 m | 1200 × 600 mm slabs in running bond, vein-cut, open pores |
| LIMESTONE | 3 m | Split-face, courses 125 to 375 mm high, dry-laid with shadow joints |
| OAK | 2.4 m | 240 mm wide boards, hard-wax oil |
| WALNUT | 1.2 m | Dark furniture walnut |
| DESK_WALNUT | 2.2 × 1.2 m | Straight, realistic desk-top grain with no waviness |
| LEATHER | .3 m | Pebbled saddle leather |
| BRONZE | 1 m | Patinated, darkened |
| BOUCLE | .4 m | Heavy looped undyed weave |
| WOOL | 1 m | Fine wool |
| LINEN | .3 m | Woven linen |
| RENDER | 4 m | Warm mineral plaster |
| LIMEWASH | 3 m | Soft cloudy limewash for the lower level |
| SLAB | 3 m | Large-format stone |
| ROCK | 24 m | Triplanar cliff limestone |
| GROUND | 8 m | Dry coastal ground |
| WAVES, ARTWORK, LEAVES_MAIN | | Water normals, an abstract painting, foliage card |

Everything must hold up in close-up. Avoid repeating patterns that are visible at a distance.

# World coordinates

The plateau is at y = 0, the sea at y = −34, and the sea lies toward −z. The cliff edge is near z = −3 to −3.5, and the coast bends back on both sides so the house stands on the point of a promontory. The upper floor level is FL = 4.05. Build a sculpted limestone headland, an open western sea, umbrella pines with flat-topped crowns, olive trees and low planting, all instanced. There is no other building in view.

# The house: nine masses (`src/world/house.js`)

All are bevelled boxes with metric UVs, merged per material.

| Mass | Centre (x, y, z) | Size and detail |
|---|---|---|
| Plinth | 1, 1.8, 4 | 28 × 3.6 × 11.7, a 300 mm stone skin, window band from x −8.5 to 11.5 at local y −.425 to .925, eight bronze-mullioned bays at 2.5 m, front door at world x 2.2 to 3.8 on the north side |
| Spine wall | −9.6, 1.5, 2 | 1.2 × 16 × 26 limestone blade, runs through both floors and out past the cliff |
| Fin wall | 17.1, 3.75, 4 | .8 × 7.5 × 6 |
| Hearth | −8.1, 7.125, 5.75 | 1.8 × 6.15 × 2.5 |
| Floor slab | 3, 3.825, 1 | 26 wide, .45 thick plates with an opening for the pool, frameless glass balustrade with bronze shoe and cap, and a 22-step external stair at world x ≈ 13 |
| Pavilion | 1, 5.775, 2 | 3.45 m clear height, eight sea-facing panes 2.46 m wide (the fifth, index 4, is the sliding door with a bronze pull), bronze mullions at 2.5 m, four panes on the east elevation, travertine back wall |
| Pool | 10.25, 3.3, −6.2 | 13.5 × 1.3 × 3.6 basin, water 12.9 × 3.2, a vanishing edge that stops 12 mm below the stone |
| Entry court | 3, .12, 13 | 24 × .24 × 6 |
| Roof | 3.75, 7.775, .25 | 27.5 × .55 × 19.5, a 450 mm plate behind a 220 mm bronze fascia over a 120 mm shadow gap, oak soffit, 10 × 5 photovoltaic panels of 1.68 × 1.0 m set flush |

Exploded offsets and the assembly windows that bring each mass home (in assemble progress 0 to 1):

| Mass | Offset | Window |
|---|---|---|
| Court | 0, −3.4, 0 | 0 to .32 |
| Plinth | 0, 0, 0 | 0 to .2 |
| Spine | −9, 4, 0 | .06 to .44 |
| Fin | 7.5, 5, 0 | .1 to .48 |
| Slab | 0, 5, 0 | .18 to .56 |
| Pool | 0, 2.2, −6.5 | .3 to .66 |
| Pavilion | 0, 8.6, 0 | .38 to .76 |
| Hearth | 0, 13.2, 0 | .52 to .88 |
| Roof | 0, 18.5, 0 | .6 to 1 |

Bronze dashed projection lines (colour 0xe0bd84) run from each floating mass to where it will land. While exploded, the whole group sways slowly, .36·sin(.1t) about the pivot (3, 8.5, 2), with a little drift.

# Opening scene: the plan on the desk (`src/world/desk.js`)

The page opens on a photoreal top-down view of an architect's desk. No square window or container overlay is ever used.

- An A1 cyanotype sheet (.841 × .594 m, FOV 28). The desk group is scaled by `34/((u1−u0)·SW)` and turned π so the drawn plan lies exactly under the 3D model.
- Blueprint canvas, 2400 px wide (1500 on mobile): colour from #1b4f8d to #113769, a fine grid, a double border, a large mirrored upper-level plan, a column with the lower-level plan and section A-A, fold creases, and a title block reading "AURA / The living sanctuary / Sheet A-101 · Upper level plan · 1:100".
- Objects, all ultra-detailed: DESK_WALNUT top with a physical clearcoat; turned brass weights on two corners; a steel rule with millimetre graduations; hexagonal pencils with brass ferrules; a glazed mug with coffee; a stoneware pencil cup; a leather notebook with an elastic band; a jointed black desk lamp with an enamel shade and brass knobs; soft contact shadows under each object.
- Light: a warm SpotLight sun (0xffdcb6, intensity 4.2, decay 0) with a soft window-shaped cookie map; a warm lamp spot; hemisphere .62; a room directional.
- Hero copy sits over the desk, on the left: eyebrow, the giant AURA, then the subtitle directly below the title, then the CTA. There is no other content column.

Scroll takes the desk through progress k over the first 2.4 viewport heights:

- The plan becomes real. The masses rise out of the drawing, in this order: `['spine','fin','hearth','court','plinth','pool','slab','pavilion','roof']`. Each turn starts at `a = .08 + .038·turn` and rises over `smoothstep(k, a, a + .2)`, extruding upward from the plan with `rise(plane, level)` and standing with `stand()`.
- Plan lines glow softly as they lift.
- Assemble value is `1 − smoothstep(k, .56, .9)`. The house leaves the rising state and moves into the exploded film pose.
- The desk dissolves with `1 − smoothstep(k, .62, .94)`.
- Camera starts top-down (elevation 80°, sheet at 68% of screen width and 50% wide; on tall screens the sheet is 92% wide at 30% height) and spherically interpolates to the film camera over `smoothstep(k, .1, .96)`.
- The house object is lent to the desk scene during this pass. Add these 240vh to the spacer.

# The film (`src/story/timeline.js`)

Hermite interpolation through these camera keys (p, position, target, fov, vertical shift):

```
0     (88,52,-98)     (3,9.5,2)    22   .22
.07   (64,47,-112)    (3,9,2)      22   .2
.15   (30,40,-112)    (3,7,2)      24   .13
.24   (52,26,-72)     (3,5,2)      28  -.14
.33   (44,9,-26)      (3,4,2)      32  -.12
.39   (24,3.2,-30)    (3,4.5,0)    30   .12
.45   (10,9,-52)      (2,3,1)      32   .06
.52   (-40,26,-125)   (2,-4,0)     34  -.06
.6    (-95,-16,-128)  (4,-5,0)     24  -.1
.66   (-46,10,-52)    (4,3,0)      34   0
.71   (-6,6.3,-21)    (3,5.3,0)    40   0
.745  (2.3,5.7,-7.2)  (2.3,5.5,2)  44   0
.79   (2,5.65,0)      (-4,5,5.5)   46   0
.85   (-1,5.6,6.6)    (1,5.1,-6)   44   .1
.92   (-6,5.55,7)     (3,5,-5)     42   0
1     (-6.5,5.6,7.2)  (3,5,-5)     42   0
```

State driven by film progress p:

- `assemble` = remap(.13, .33)
- `sweep` = lerp(−12, 18) over .33 to .45. Materials print in behind this moving plane, with a thin warm edge line (`uEdge` colour × .3, low noise, never jagged).
- `studio` = 1 − smoothstep(.43, .53), and `void` the same over .44 to .53. The house starts in a dark studio void.
- `worldR` = 2800·t^2.2 for p from .435 to .58. The landscape grows outward from the house as a reveal radius.
- `door` = smoothstep(.7, .745). The glass slides open.
- `interior` = .75·smoothstep(.72, .82)
- `fire` = smoothstep(.74, .8)
- `time` goes from 18.7 to 19.72
- `controls` = smoothstep(.885, .925)

Sky colour keys for the day cycle (hour, zenith, mid, horizon, sea, sun):

```
5.4   #151c2c #3a4356 #7c8290 #3c424e #9fb3d8
6.4   #2d3a58 #8a7f8c #eda987 #6d5a56 #ffc79a
8.0   #44709c #8fb2c8 #dfe6e0 #4e6a78 #fff0d0
13.25 #2f6698 #6d9fc4 #c2dae6 #3f6377 #fff6e0
17.0  #3d6a94 #86a5b6 #ecd9ae #5b6a68 #ffe6b0
19.0  #3f4d70 #a9846f #f4a95f #70533c #ffbe70
20.1  #262b4c #7c4f60 #e5704a #5a3530 #ff8f58
20.9  #121832 #26305a #47567f #1f2740 #7c8cc0
22.0  #070a18 #0d1328 #172038 #0e1422 #7c8cc0
23.4  #05070f #090d1c #10172a #0a0e18 #7c8cc0
```

# Interior (`src/world/interior.js`)

Every interior material uses a reveal mode so it prints in behind the sweep.

Upper level, living pavilion, x −9 to 11, z −4 to 8, ceiling FL + 3.45: oak floor and oak soffit; a firebox of blackened steel set proud of the limestone hearth on a bed of ceramic pebbles; a large bouclé sofa facing the sea with crowned, slightly uneven cushions; two channel-tufted saddle-leather lounge chairs on slim bronze frames (780 × 820 mm, seat at 400 mm) turned toward the sofa, with every seam stitched; a dining table with modern dining chairs (500 × 520 mm, seat at 460 mm, properly joined legs, bowed back, stitched pad); a modern kitchen; sheer pleated curtains that stay the same pleat depth and look fuller as they gather; an abstract artwork; a reeded and fluted detail language.

Terrace: teak chaises with side rails on square legs, wheels at the head, 22 slats, a hinged slatted back, thick piped cushions and a rolled towel.

Lower level, stone plinth, ceiling 3.28: warm, cozy, modern and luxurious, never basement-like. Limewash walls, soft concealed light, wallA at z 4.5 to 4.65 and wallB at z 6.9 to 7.02. Four bedrooms between x −9 and −3.5, −3.5 and 2, 2 and 7.5, 7.5 and 14.4, each with a lobby and its own beautiful bathroom. A corridor and gallery on the north side. The internal stair runs x −6.6 to −.66, z 7 to 8.

Anything soft is built with vertices across its faces so it can crown and ease like something filled. Every piece of furniture has piping, stitches, real joints and tapered members.

# Page structure and exact copy (`index.html`)

## Loader
"AURA", then a status line that advances: Quarrying stone, Setting nine masses, Shaping the headland, Waiting for the light, Laying out the plans, Polishing the glass. If WebGL is missing: "This browser could not start WebGL".

## Header (glass)
Brand AURA. Nav: Film, Residence, Drawings, A day, Materials, Details, Walk. A sound button with four animated bars. A metal pill, "Private viewing".

## Film frames (data-in and data-out are film progress)

- −1 to .055, hero. Eyebrow "Concept residence" and "38 m above the sea". H1 "AURA". Sub "*The living* sanctuary". Metal CTA "Walk the house" with a round ↓.
- .075 to .145, left. "The house, *drawn apart*". "Before it was built, it was taken to pieces: nine masses lifted off one another, each one still above the place it will land. The bronze lines show where each one falls."
- .215 to .30, right. "Gravity *decides*". "Each mass comes down its own line, from the ground up. The limestone blade slides into the rock. The floor plate reaches nearly five metres past the cliff, and the roof lands last, as thin as a sheet of paper."
- .345 to .44, left low. "Matter rises *from the ground*". Spec list: Walls, "Split-face limestone, quarried on site". Floors, "Vein-cut travertine & white oak". Edges, "Patinated bronze". Openings, "Low-iron glass, floor to ceiling".
- .5 to .6, right low. "Then the world *arrives*". "A limestone headland, an open western sea and nothing between the terrace and the horizon." Stats: 38 m above the sea, 580 m² of living space, 4.5 m terrace beyond the edge.
- .665 to .735, centre. "The glass *steps aside*".
- .78 to .875, left. "Inside, the horizon *is the fourth wall*". "Oak underfoot, a fire set into the stone, and twenty metres of glass facing the sunset."
- .925 to 2, left. "Live in it *at any hour*". "The house is rendered live. Change the hour, the weather, the lights and the fire, and watch the stone respond." CTAs "Walk the house" and "Request a viewing".

## Atmosphere panel
Eyebrow "Atmosphere", clock 19:43. Presets:

```
Dawn    time 6.85  interior .25  fire 0  mist .42
Noon    time 13    interior 0    fire 0  mist .06
Golden  time 19.3  interior .5   fire 1  mist .06
Night   time 22.4  interior .9   fire 1  mist .06
```

Daylight slider 5 to 23.5 (default 19.72). Weather: Clear (.06), Haze (.42), Sea fog (.9). Interior light 75%. Sheer curtains and Hearth switches, in a 2 × 2 grid on phones so nothing overflows.

## Bottom index (film only)
Chapter name (Prologue, Sculpture, Gravity, Matter, Ground, Threshold, Interior, Atmosphere), the cue "Nine masses · one house", and an elegant eight-tick rail. No numbers.

## Manifesto
Label "The intent". "We wanted a house that sits on the rock as if it had always been there, and leaves the horizon exactly as it found it." Then "— Design brief, sheet 01".

## Residence
"A house built from the headland it stands on."

"AURA is a concept for a single-family house on a limestone promontory 38 metres above an open western sea. It has two levels. Below is a stone plinth set into the rock for sleeping and bathing. Above is a glass pavilion for living, cooking and watching the weather come in."

"The stone dug out for the plinth becomes its walls. A limestone blade 26 metres long anchors the house to the cliff and carries the roof, which reaches nine metres out over the terrace without a column on the sea side."

Facts: Built area 580 m², Terrace 180 m², Levels 2, Bedrooms 4, Clear height 3.45 m, Sea glazing 20 m, Pool 12.9 × 3.2 m, Elevation +38 m.

## A day (pinned, the live scene scrubs from dawn to night)
Label "A day on the headland". "Eighteen hours, one scroll." Clock starts 05:24, with a sun dial. Note "Rendered live as you scroll". Moments by hour:

- 5.0 First light. The sea turns pewter before the sky does.
- 7.2 Morning. Sun on the spine wall; the terrace still in shade.
- 11.0 Noon. The deep roof keeps the glass in its own shadow.
- 15.0 Afternoon. The stone has stored the heat and starts to give it back.
- 18.6 Golden hour. The western face turns the colour of the cliff.
- 20.2 Blue hour. The house begins to glow from inside.
- 21.4 Night. A lantern on the headland.

## Drawings
"Two levels, one wall." "The spine wall runs through both floors and out past the cliff edge. Every room faces the sea, and the service spaces sit against the hill. Scroll to draw the house." Fully detailed SVG section A-A, with the mobile hint "Swipe to read the drawing", and two plans: "Upper level — Living pavilion · +4.05 m" and "Lower level — Stone plinth · ±0.00 m". They draw on with DrawSVG as you scroll. Real architectural detail: wall hatching, door swings, furniture, dimensions, level marks.

## The sheet (pinned WebGL paper roll)
Label "The drawing". "Unroll the house." "Sheet A-101, the upper level at 1:100, rolled the way the builders received it. Keep scrolling to open it." Hint "Scroll to unroll". A big sheet of paper physically and smoothly unrolls in WebGL, following the curl along the paper with no cut-off edge.

## Materials (pinned, horizontal)
"Six materials, chosen to weather." "Each sample is the same surface the film uses, lit in real time as the page loads. Nothing is painted, laminated or veneered."

- Split-face limestone. "Quarried from the plinth excavation and dry-laid in long, low courses. Used for the spine, the fin and the hearth."
- Vein-cut travertine. "Honed and unfilled, so the pores stay open and grip wet feet. Used for the terraces, the pool coping and the gallery wall."
- White oak. "Wide boards with a hard-wax oil finish. Used for the floor and the soffit, so floor and ceiling read as one material."
- Patinated bronze. "Left to darken in the salt air. Used for the roof edge, the mullions and the door pulls."
- Wool bouclé. "A heavy, undyed weave for the living-room seating."
- Saddle leather. "Vegetable-tanned, for the lounge chairs. It darkens where hands rest."

## Details at 1:1
"The house is in the joints." "Close-ups rendered from the same model. Hover to look closer." Each is a runtime still from this camera (position, target, fov, then hour):

- Roof edge. "A 220 mm bronze fascia over a 120 mm shadow gap. From the terrace, the roof is a single line." (20.6,6.3,−12.9) (16.6,7.75,−8.9) 30, 19.3
- Saddle leather. "Channels stuffed and stitched by hand, so the seams carry the light." (−1.72,5.02,1.72) (−1.02,4.42,1.44) 40, 19.6, fire on
- Vanishing edge. "The water stops 12 mm below the stone and spills toward the sea." (12.8,4.3,−9.7) (10.2,3.95,−7.6) 34, 19.4
- Dry-laid limestone. "No mortar: each course is shimmed and split by hand, so the joints are shadow." (−7.6,3.8,−15.2) (−9.6,3,−11) 30, 19.2
- Teak chaise. "Twenty-two slats, a hinged back and a piped cushion." (−3.05,4.85,−7.05) (−3.95,4.33,−6.25) 34, 19.4
- Firebox. "Blackened steel set proud of the stone, on a bed of ceramic pebbles." (−5.7,4.98,5.1) (−7.2,4.84,5.75) 36, 21.6, fire on

## Spaces
"Three hours of the same day." "Taken from the live model as you reach this section. Each one is the same house at a different hour." Button "Walk through it yourself". Stills:

- 19:30 "The terrace and the vanishing edge" (22,5.3,−23) (1,4.9,−5) 36, time 19.5, mist .06, interior .45
- 21:40 "The hearth after dark" (.9,5.35,1) (−7.2,4.85,5.75) 46, time 21.7, mist .06, interior .85, fire on, curtains .65
- 07:05 "Sea fog over the headland" (−46,−4,−72) (4,1,0) 30, time 7.1, mist .55, interior .3

## How it lives
"Designed for the climate, not against it."

- 11 h, Thermal lag. "Stone walls 600 mm thick soak up the afternoon heat and give it back after midnight."
- 0, Air-conditioned rooms. "The pavilion's glass walls slide open on two sides, so the onshore breeze crosses the room from the sea to the hill."
- 86 m², Hidden solar. "Photovoltaic panels sit flush inside the bronze roof edge. They can't be seen from the terrace or the sea."
- 38 m³, Rainwater. "A cistern under the entry court collects every winter storm for the garden and the pool."

## Approach (pinned WebGL relief map of the coast)
"Six kilometres of coast road, then nothing." Beautifully lit terrain with the road drawing on, with live km and elevation readouts. Steps:

- 00.0 The harbour village
- 02.4 The coast road leaves the last houses
- 04.6 Through the olive terraces
- 05.9 A bronze gate in a dry-stone wall
- 06.2 AURA, 38 m above the sea

## Private viewing
Label "Private viewing". "Walk through it with the architect." "Viewings are held one party at a time, in the model or on the headland. Tell us a little about yourself and we'll reply within two working days." Note "AURA is an architectural concept. This form doesn't send anything yet." Fields: Name, Email, Interest (A private viewing, Commissioning a residence, Press and publication), Message (optional). Metal button "Send enquiry →".

## Footer
"The living sanctuary. An architectural concept rendered in real time. Every surface is generated in the browser, with no photographs and no downloaded textures." Links: Watch the film, Residence, Drawings, Materials, Private viewing, and ↑. A giant "AURA". "© 2026 AURA", "Concept, not for sale", "Built with three.js and GSAP".

# Walk mode (`src/ui/walk.js`, `src/world/walkPlan.js`)

"Walk the house" opens a full-screen, free first-person visit, indoors and out, at eye height 1.62 m, with collision against the real plan and stairs between levels.

- Hint: "Drag to look. Click the floor, or use W A S D, to walk. Hold Shift to go faster. M mutes." On touch: "Drag to look. Use the stick, or tap the floor, to walk."
- Named places to jump to: Pool, Terrace, Living room, Fire, Dining, Kitchen, Bedroom, Bathroom, Gallery, East deck, Entry court, Cliff edge. The current place name and a short note are shown.
- Controls: Mute outside and fire, Close glass door (the sliding pane by the pool, and it must open and close for real), Close curtains, and hours (Dawn, Noon, Golden hour, Night).
- A minimap for each level. A virtual joystick on touch screens. The dock uses `minmax(0,1fr)` columns so it never overflows.

# Sound (`src/core/sound.js`)

All synthesised. Two looping sea buffers of 17 s and 23 s, band-passed wind, and a crackling fire whose level depends on distance to the hearth. Indoors the outside sound goes through a lowpass filter, and opening the glass door lifts it. The mute state is saved in localStorage under `aura-sound`. Sound starts only after a user gesture.

# Quality, performance and responsive

- Holds a smooth frame rate on a modern laptop. Lower resolution adaptively and skip GTAO on phones.
- Full layouts at phone, tablet and desktop widths. Every pinned section works on touch. No horizontal page scroll. Nothing is cut off.
- Sections have no leftover empty space. Text and imagery fill their layouts deliberately.
- Add a `build:aura` script (`vite build && node scripts/single-file.mjs`) that inlines JS and CSS into one HTML file, squeezes GLSL, drops unused three.js shaders (toon, phong and matcap, but keep Lambert for the coast map) and fails if the result is above 995,000 characters.

# Verification (do not skip)

Run the site in a real browser with hardware WebGL. Scroll the whole page and inspect screenshots at the hero, each stage of the plan rising, each film frame, every section, and the walk mode indoors and outdoors, on desktop and at phone width. Check the console for errors. Check for flares, jagged edges, stale canvases, clipped text and furniture that makes no sense. Fix everything you find, then verify again, until it would win an award. Report honestly anything you could not test, including sound if you cannot hear it.
