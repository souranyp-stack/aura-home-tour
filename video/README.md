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
- `shots.mjs` lists the shots and `edit/cuts/intro.js` is the edit, run by the
  compositor in `edit/edit.js`. Each layer is a DOM element whose CSS is set per
  frame; `edit/render.mjs` screenshots it to H.264.

# DesignCode sponsor read

A screen recording of designcode.io for the sponsor segment, cut to the read in
the script doc. It's one browser window on a dark violet backdrop, zooming toward
whatever the cursor is doing, with the real address in the bar.

- `out/aura-sponsor-designcode.mp4`: with a "Sponsored by DesignCode" tag at the
  start and a "designcode.io · Link in the description" pill at the end.
- `out/aura-sponsor-designcode-clean.mp4`: the same with no type.

| Cut | Script line | Page | What happens |
| --- | --- | --- | --- |
| 0:00 | "Before we dive in, this video is sponsored by DesignCode." | designcode.io | the hero, cursor comes in |
| 0:04 | "...this looks like every other AI website..." | designcode.io | zoom on "Avoid AI slops.", then the enrol button |
| 0:13 | "It's run by Meng To... the taste to make it good." | designcode.io | the founder section scrolls; click on Courses |
| 0:23 | "more than 90 courses and 300+ hours..." | /courses | the "All 94" filter |
| 0:30 | "...a new course on building with Claude Code, Codex and Framer." | /courses | the Build with AI webinar course |
| 0:34 | "Every course comes with the prompts, source files and templates..." | /courses | scrolling the catalogue; click on Events |
| 0:42 | "There are weekly live sessions," | /calendar | the weekly session on the calendar |
| 0:45 | "a private Slack, agent skills..., and certificates" | designcode.io | the "Included in package" list, then the page loads to Product Pass |
| 0:52 | "members get the Product Pass, which includes a year of Aura Pro... ThreeUI Pro... Framer, Mobbin" | /product-pass | the offers, Aura, ThreeUI, then Framer and Mobbin; click on Pricing |
| 1:10 | "You can start free... no card needed." | /pricing | the Free plan |
| 1:15 | "...a limited-time deal on the Lifetime plan. Check the link in the description." | /pricing | the Lifetime plan, then the link pill |

Recorded logged out, so no account details appear. The cursor only hovers and
presses; it never releases a click, so nothing on the site was opened or submitted.

```bash
npm run record:sponsor -- dc6 --force   # one take (or none for all missing ones)
npm run render:sponsor                  # with type
npm run render:sponsor:clean            # without
```

`sponsor/takes.mjs` has each take's scroll, cursor, clicks and zoom, anchored to
the site's text so it keeps working if the layout moves a little.
The "Included in package" list on designcode.io steps on the real clock rather
than the page's, so it ran about 4x fast in the recording; the edit plays that
stretch at 0.25x to put it back at its own pace.
