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

# The build: stack and first prompt

B-roll for the script from "What we're building and the stack" through the end of
"1. The first prompt" (`node edit/render.mjs --cut=ch1`, add `--clean` for no titles).
`out/aura-build-stack-first-prompt.mp4`, 1:10.

| Cut | Script line | Picture |
| --- | --- | --- |
| 0:00 | "I built it in the terminal with Claude Code, running Opus 5.5." | terminal, `claude` launching |
| 0:05 | "The stack is small:" | the real package.json dependencies |
| 0:07 | "Three.js for the 3D," | the sculpture in its beam |
| 0:09 | "GSAP and ScrollTrigger for the scroll choreography," | the paper roll unrolling |
| 0:12 | "Lenis for smooth scrolling," | the materials gallery |
| 0:14 | "and Vite to build it." | `npm run build` output |
| 0:16 | "And one rule from day one: no image files." | src/core, world, story, ui, then 0 image files |
| 0:20 | "Keep that in mind, because it saves me at the very end." | procedural stone macro |
| 0:25 | (the prompt on screen) | the first prompt typed, story beats underlined |
| 0:37 | "I didn't ask for 'a 3D house website.'" | the phrase struck out beside the prompt |
| 0:40 | "chapter by chapter, like a storyboard. That's the most important tip" | v1's eight chapters as a storyboard |
| 0:46 | "The more you describe the experience, not the tech" | the line as type over the board |
| 0:51 | "And version one worked. The masses floated, assembled, turned into stone and glass." | v1, one beat per word |
| 0:58 | "But look closer. The cliff looks like crazy paving." | push-in on v1's cliff, annotated |
| 1:02 | "The walls look like grey brick." | v1's brick pillar, annotated |
| 1:05 | "It's a demo, not architecture." | v1 dimmed, the line as a title |

# The build: the creative-director review

B-roll for "2. The creative-director review" (`node edit/render.mjs --cut=ch2`, add
`--clean` for no titles). `out/aura-build-creative-director-review.mp4`, 1:24.
Before is d668dca, after is 45dc2b6 (the commit that fixed the five problems), shot
from a shared camera (`window.__aura.cam`, added to the worktrees by
setup-versions.sh) so the wipes line up.

| Cut | Script line | Picture |
| --- | --- | --- |
| 0:00 | "This is the move I use on every project." | v1's cliff, dimmed |
| 0:03 | "Instead of saying 'make it better,'" | the phrase struck out |
| 0:05 | "I ask the AI to criticize its own work first." | the review prompt typed |
| 0:11 | "It came back with five problems." | the five, listed |
| 0:14 | 1. Materials read fake | wipes on the cliff, then the walls |
| 0:24 | 2. No golden hour | wipe on the wide view |
| 0:34 | 3. The camera stared at a blank wall | side by side |
| 0:44 | 4. The sculpture didn't make sense | side by side, then the assembly |
| 0:54 | 5. Performance | every mesh a colour, 349 to 119 draw calls |
| 1:04 | "Then I set a hard rule: ...60 frames per second." | the film, "60" |
| 1:09 | "turning off ambient occlusion..." | ambient occlusion on/off wipe on one shot |
| 1:15 | "and capping the pixel ratio." | the real one-line change |
| 1:19 | "You don't notice the difference. Your laptop fan does." | golden plate, the line as a title |

# The build: the hero

B-roll for "3. The hero: plans that become a house" (`node edit/render.mjs --cut=ch3`,
add `--clean` for no titles). `out/aura-build-the-hero.mp4`, 1:20. The heroes are the
real commits: tower 09a5de2, axonometric 9c39d09, window attempt 616b83a, today's desk.

| Cut | Script line | Picture |
| --- | --- | --- |
| 0:00 | "three versions... taste matters more than code." | the three heroes side by side |
| 0:06 | "Version one was a stacked tower sculpture..." | the tower |
| 0:13 | "It had nothing to do with the house." | the tower beside the finished house |
| 0:16 | "Version two was an exploded axonometric..." | one shot, the frame moving from the whole model to the bronze lines to the beam and dust |
| 0:30 | "...now the opening image is the product." | the v2 hero with its type |
| 0:33 | "Version three is what you saw at the start." | today's desk opening |
| 0:36 | "...the actual plans, lying on a walnut desk." | push-in on the plan |
| 0:40 | "the walls rise straight out of the drawing." | the rise |
| 0:46 | "Walls first... then the floors, then the roof." | the rise again, closer, labelled |
| 0:52 | (zoom on the desk) | weight, mug, rule, pencils, lamp |
| 0:58 | "a window cut into the paper" | 616b83a opening |
| 1:04 | "It read as a square overlay." | the window, outlined |
| 1:07 | "one camera and one house the whole way through." | desk into gallery, one take |
| 1:13 | "...baked from the real floor plans, so it always matches the model." | wipe from the plan to the model, one top-down camera |

# The build: the landing page sections

B-roll for "4. The landing page sections with GSAP" (`node edit/render.mjs --cut=ch4`,
add `--clean` for no titles). `out/aura-build-the-landing-page.mp4`, 1:50. The accordion
is c68c346 and the boxed map 008c734. The pin bug is the real one, put back by
setup-versions.sh: 7eadd7c with the approach's pin created before the Materials pin
and ScrollTrigger's markers on. At 1920×1080 it starts 1,379 px early.

| Cut | Script line | Picture |
| --- | --- | --- |
| 0:00 | "After the film, the page becomes a proper landing page," | the film handing over to the page |
| 0:04 | "and every section is animated with GSAP." | the six sections running side by side |
| 0:08 | Manifesto | the sentence lit word by word |
| 0:14 | Drawings | section A-A, then the plans, drawing themselves |
| 0:23 | Materials | the pinned gallery |
| 0:30 | A day on the headland | eighteen hours and the dial |
| 0:37 | The drawing | the roll unrolling |
| 0:41 | The approach | the flight down the road, the boxed map as an inset |
| 0:48 | "Two lessons from this part." | title |
| 0:50 | "First, the paper roll." | the closed roll |
| 0:52 | "CSS panels folding like an accordion," | c68c346 unfolding |
| 0:57 | "it looked stiff, because CSS can only hinge." | frozen on a fold, the crease drawn in |
| 1:01 | "Paper curls." | the line over the roll |
| 1:02 | "unrolls along a spiral," | the roll beside its spiral, from the sheet's real numbers |
| 1:08 | "and the roll shrinks as it goes." | close on the end of the roll |
| 1:11 | "a GSAP gotcha that cost me an hour." | the comment in page.js |
| 1:15 | "measures pinned sections in the order you create them." | diagram, in order |
| 1:19 | "Create them out of order..." | diagram, out of order |
| 1:22 | (the wrong place) | the real bug, the map landing early |
| 1:25 | "Mine started 1,400 pixels too early." | the count |
| 1:28 | "this button comes from ThreeUI, the Liquid Metal Button." | push in on Send enquiry |
| 1:33 | "Metal pours across it when you hover." | the hover, then the press |
| 1:36 | "It's MIT licensed, so I kept the license notice" | THIRD_PARTY_NOTICES.md |
| 1:41 | "wired it to upgrade normal links," | the link and initMetalButtons |
| 1:45 | "so it still works without WebGL." | the same link with and without |

# The build: walking through the house

B-roll for "5. Walking through the house" (`node edit/render.mjs --cut=ch5`, add
`--clean` for no titles). `out/aura-build-walking-through.mp4`, 1:15. The walk shots are
the real walk mode driven by real mouse, key and touch input (`clicks`, `hover` and
the phone shot in shots.mjs). The "before" is 9124819, the first version you could walk.
The cutaways slice the real model at waist height (`renderer.clippingPlanes`) and are
seen from straight above. The site's plans are a mirror image of the model, so the
wipes flip the drawing, as the desk opening does. The sound meters are the real
`walk.hearing()` numbers along the shot, saved to `edit/cuts/c5-sound.js` when it records.

| Cut | Script line | Picture |
| --- | --- | --- |
| 0:00 | "Then I wanted people to actually walk inside." | the real click on Walk the house |
| 0:04 | "Drag to look," | a real drag |
| 0:06 | "walk with the keys" | a real W, the key lit |
| 0:08 | "or a touch stick on your phone," | a phone viewport, real touch on the stick |
| 0:10 | "and jump to ... named places" | real clicks: fire, kitchen, bedroom, bath, gallery, cliff |
| 0:14 | "or four times of day." | real clicks through the four hours |
| 0:17 | "walking exposed everything the camera had been hiding." | 9124819, walking |
| 0:21 | "The dining chairs faced backwards." | the chairs, backs to the table |
| 0:23 | "The plans drew a stair that didn't exist." | the plan's stair beside the blank wall where it would be |
| 0:27 | "the plans showed bedrooms and bathrooms," | the old plan, wiped to the model cut open: nothing inside |
| 0:32 | "the lower floor was a solid block," | the plinth from the sea |
| 0:35 | "and there was no kitchen at all." | where the kitchen is now |
| 0:38 | "Nowhere to cook, sleep or wash." | the line |
| 0:40 | "The fix was one file, walkPlan.js." | the real room table |
| 0:43 | "the 3D walls, the walls you bump into, and the drawn plans all read from it." | three branches: the cutaway, the real collision map with a visitor sliding along it, the plan |
| 0:52 | "So they can never disagree again." | wipe from today's plan to today's model, lined up |
| 0:55 | "one source of truth." | kitchen, stair, bedroom, bath, then the line |
| 1:03 | "Then sound..." | sea to door to fire, the door closing, the curtains, real sound numbers |

# The build: what I learned and outro

B-roll for "What I learned and outro" (`node edit/render.mjs --cut=outro`, add `--clean`
for no titles). `out/aura-build-what-i-learned.mp4`, 1:09. The log is the site's real
history up to 03e3f97 (`edit/cuts/outro-log.js`), and hero-desk-prologue is the real
branch the desk opening was built on. The delete command is only typed, never run.

| Cut | Script line | Picture |
| --- | --- | --- |
| 0:00 | "So what actually made this work? Four things." | golden hour, title |
| 0:03 | "One: describe the experience, not the tech." | v1's eight chapters as a storyboard |
| 0:09 | "Two: ask the AI to critique before it improves." | "make it better" struck out, the real line, wipe from before to after |
| 0:16 | "Three: keep one source of truth," | today's plan wiped to the model |
| 0:20 | "Four: commit every step." | the real git log, 32 commits |
| 0:23 | "started as an experiment on its own branch." | `git switch -c hero-desk-prologue` and its two commits |
| 0:28 | "thrown it away in one command." | `git branch -D` over the desk |
| 0:32 | "Opus wrote most of the code." | the real rise code |
| 0:35 | "the tower was the wrong hero," | the tower |
| 0:40 | "or that paper should curl." | the roll |
| 0:42 | "That part is still you." | the line |
| 0:45 | "check out DesignCode, link in the description." | designcode.io, link pill |
| 0:51 | "go walk around the house." | the walk in a browser, the real address |
| 0:56 | "which part you want a deep dive on." | six tiles, the question |
| 1:01 | "Subscribe, and I'll see you in the next one." | end card over golden hour |
