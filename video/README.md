# AURA intro B-roll

B-roll for the first 1:24 of the YouTube video, cut to the hook in the script
(the "Aura Home Tour — YouTube Script" doc). It is recorded from the real site,
frame by frame, so every camera move is perfectly smooth whatever the GPU does.

- `out/aura-intro-broll.mp4`: the edit with titles (1920×1080, 60 fps, H.264).
- `out/aura-intro-broll-clean.mp4`: the same edit with no type, for your own titles.
- `clips/`: every shot on its own, with handles, if you'd rather cut it yourself.

## Cut list

Times are where each shot sits in the edit; the line is what you're saying over it.
The voice-over timing is estimated, so slip shots by a few frames to land on your words.

| Edit | Script line | Shot |
| --- | --- | --- |
| 0:00 | "This is an architectural plan. Lines on paper." | `01_plan`: the blueprint on the desk, slow push in |
| 0:04 | "Walls, rooms, a stair." / "Now watch what happens when I scroll." | `01b_plan_detail`: across the drawing, 2× crop |
| 0:09 | "The walls rise straight out of the paper..." | `02_rise`: the walls, slabs and roof extrude from the plan |
| 0:19 | "...standing on a cliff above the sea at golden hour." | `04_golden`, through a light sweep |
| 0:23 | [beat: the sculpture, then it snaps together] | `05_sculpture`, `06_assemble` |
| 0:29 | "And this isn't a video. It's a website... built with Three.js." | `07_site` shrinks into a browser window; tech chips |
| 0:34 | "Every stone, every board of oak, the sea, the sunset, ... the fire" | `08a`–`08e`, one per word, labelled |
| 0:40 | "There's not a single image file on this page." | `08f_aerial` with the "0 image files" title |
| 0:44 | "You can scroll through it like a film," | `09_door`: through the sliding door |
| 0:47 | "or step inside and walk the whole house." | `10_living` |
| 0:50 | "Down the stair, into the bedrooms, out onto the terrace." | `11_stair`, `12_bedroom`, `13_terrace` |
| 0:55 | "Most of the code was written by Claude Opus 5.5." | the real `desk.js` rise code being typed, lower third |
| 0:58 | "But the first version looked nothing like this." ... "no kitchen" | `15a`–`15d` from v1 (`d668dca`), VERSION 1 tag |
| 1:06 | [quick flash of v1] | six-frame strobe, then a flash |
| 1:07 | "...how I got from that to this." | v1 cliff, wiped by a bronze line into today's house |
| 1:10 | "The prompts I used, the mistakes, and the few tricks..." | `16c` materials, `16b` paper roll, `16e` map, `16f` bronze button |
| 1:15 | "...turn an architectural plan, or any idea," | `16d` a day on the headland, `01_plan` |
| 1:18 | "...into something like this." | `17_end` with the AURA title, fade out |

## Re-making it

```bash
npm install
npm run versions   # the old versions for the "first version" shots
```

Start the `aura` and `broll-v1` launch configurations (the dev servers on 5288 and
5301), then:

```bash
npm run record -- 08a_stone --force   # one shot (any name prefix), or no names for all missing ones
npm run render                        # the titled edit
npm run render:clean                  # the clean plate
node edit/render.mjs --still=42.3     # single frames, for checking
```

How it works:

- `lib/virtual-time.js` holds the page's clock: `performance.now`, `Date.now`,
  `requestAnimationFrame`, timers and CSS animations only move when the recorder
  steps them, exactly 1/60 s per frame.
- `src/main.js` has a dev-only `window.__aura.director` hook (stripped from the
  Aura build) that sets the film, the day, the walk or a free camera for a frame.
- Every shot renders at twice the output size and is scaled down, so edges are
  supersampled. Crops of down to half the frame stay sharp.
- `shots.mjs` lists the shots and `edit/edit.js` is the edit. Each layer is a DOM
  element whose CSS is set per frame; `edit/render.mjs` screenshots it to H.264.
