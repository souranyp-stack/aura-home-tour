// The sponsor read, recorded on designcode.io: one take per page, in script order.
// Positions are in the 1440x900 viewport. A point is [x, y], or an anchor:
//   { a: 'regex' } is the centre of the first visible element whose text matches
//   (buttons and links first), offset by dx/dy; it scrolls with the page unless it
//   sits in a fixed or sticky bar.
// cursor: [t, point], eased between keys with a slight arc, like a hand.
// scroll: [t, y] in page pixels. press: times the mouse goes down (never up, so
// nothing navigates or submits). zoom: [t, z] for the edit, which frames the
// cursor; focus: [t, point] pins the frame somewhere else instead.

const DC = 'https://designcode.io';

export const TAKES = [
  // "Before we dive in, this video is sponsored by DesignCode. If you've ever
  // generated a website with AI and thought 'this looks like every other AI
  // website,' that's exactly the problem DesignCode is built to solve."
  {
    name: 'dc1_hero', url: `${DC}/`, path: '/', seconds: 14,
    scroll: [[0, 0]],
    cursor: [[0, [1250, 880]], [1.6, [1170, 760]], [3.8, [560, 330]], [6.6, { a: 'Avoid AI slops', dx: 40 }], [8.2, { a: 'Avoid AI slops', dx: 60, dy: 6 }],
      [9.8, { a: 'Enroll for', dy: 2 }], [12.2, { a: 'Enroll for', dx: 6, dy: 4 }], [13.8, [900, 560]]],
    zoom: [[0, 1], [3.4, 1], [4.8, 1.5], [8.6, 1.5], [10.0, 1.35], [12.6, 1.35], [13.9, 1]],
  },
  // "It's run by Meng To, and the whole idea is simple: AI can write the code,
  // but you still need the taste to make it good."
  {
    name: 'dc2_founder', url: `${DC}/`, path: '/', seconds: 9.8,
    scroll: [[0, { a: 'About the founder', dy: -150 }], [8.6, { a: 'About the founder', dy: 200 }]],
    cursor: [[0, [940, 760]], [2.6, [840, 560]], [6.0, [760, 470]], [8.2, [700, 330]], [9.3, { a: '^Courses$' }]],
    press: [9.45],
    zoom: [[0, 1.32], [3.0, 1.32], [5.4, 1], [8.4, 1], [9.6, 1.22]],
    focus: [[0, { a: 'About the founder', dy: 70 }], [3.0, { a: 'About the founder', dy: 80 }], [5.4, [720, 450]]],
  },
  // "You get more than 90 courses and 300+ hours of training on design, code and
  // AI workflows, including a new course on building with Claude Code, Codex and
  // Framer. Every course comes with the prompts, source files and templates, so
  // you're not just watching, you're building along in the real tools."
  {
    name: 'dc3_courses', url: `${DC}/courses`, path: '/courses', seconds: 19.8,
    scroll: [[0, 0], [1.2, 0], [3.2, 520], [11.0, 520], [18.0, 1090]],
    cursor: [[0, [720, 560]], [3.4, [600, 300]], [4.6, { a: '^All$', dx: 8 }], [6.6, { a: '^All$', dx: 10, dy: 2 }],
      [8.0, { a: 'DesignCode Webinars', dy: 60 }], [11.0, { a: 'DesignCode Webinars', dx: 10, dy: 90 }],
      [13.4, { a: 'Claude Code for Vibe', dy: 70 }], [15.6, { a: 'Claude Code for Vibe', dx: 10, dy: 90 }], [17.8, [880, 520]], [19.2, { a: '^Events$' }]],
    press: [19.4],
    zoom: [[0, 1], [3.6, 1], [4.6, 1.45], [6.8, 1.45], [7.9, 1.5], [11.0, 1.5], [12.2, 1.12], [17.6, 1.12], [19.6, 1.2]],
  },
  // "There are weekly live sessions,"
  {
    name: 'dc4_calendar', url: `${DC}/calendar`, path: '/calendar', seconds: 5.5,
    scroll: [[0, 520], [5.5, 600]],
    cursor: [[0, [1000, 720]], [2.0, { a: 'Build a Web App', dy: 10 }], [4.4, { a: 'Build a Web App', dx: 8, dy: 14 }], [5.5, { a: 'Build a Web App', dx: 10, dy: 16 }]],
    zoom: [[0, 1.12], [1.8, 1.5], [5.5, 1.5]],
  },
  // "a private Slack, agent skills you can drop into your own AI tools, and
  // certificates when you finish."
  {
    // the list cycles slowly, so this take runs long and the edit picks the stretch
    // where Private Slack, Agent Skills and Certificates come round
    name: 'dc5_included', url: `${DC}/`, path: '/', seconds: 24,
    scroll: [[0, 0]],
    cursor: [[0, [760, 760]], [2.2, [990, 660]], [21.8, [1000, 650]], [23.2, { a: '^Product Pass$' }]],
    press: [23.5],
    zoom: [[0, 1.72], [21.6, 1.78], [23.2, 1.25]],
    focus: [[0, { a: 'Included in package', dx: 40, dy: 140 }], [21.6, { a: 'Included in package', dx: 40, dy: 140 }], [23.2, [760, 200]]],
  },
  // "And here's the part that's relevant to this video: members get the Product
  // Pass, which includes a year of Aura Pro, where I published this site, and a
  // year of ThreeUI Pro, where the liquid bronze button on my page comes from.
  // Plus Framer, Mobbin and more."
  {
    name: 'dc6_pass', url: `${DC}/product-pass`, path: '/product-pass', seconds: 18.6,
    scroll: [[0, 620], [4.0, 680], [6.0, 1330], [14.2, 1380], [15.8, 960], [18.6, 950]],
    cursor: [[0, [720, 760]], [3.6, [740, 560]], [6.6, { a: '1 year of Aura Pro', dy: -60 }], [9.6, { a: '1 year of Aura Pro', dx: 8, dy: -50 }],
      [10.6, { a: '1 year of ThreeUI Pro', dy: -60 }], [13.8, { a: '1 year of ThreeUI Pro', dx: 8, dy: -50 }],
      [15.6, { a: '1 year of Framer Pro', dy: -60 }], [16.8, { a: '1 year of Mobbin Pro', dy: -60 }], [18.2, { a: '^Pricing$' }]],
    press: [18.4],
    zoom: [[0, 1], [1.2, 1.18], [4.0, 1.18], [5.8, 1], [6.6, 1.55], [9.8, 1.55], [10.6, 1.55], [13.8, 1.55], [14.8, 1], [18.6, 1.12]],
    focus: [[0, [720, 380]], [4.0, [720, 380]], [5.8, 'cursor']],
  },
  // "You can start free and preview the lessons, no card needed. And right now
  // there's a limited-time deal on the Lifetime plan. Check the link in the
  // description."
  {
    name: 'dc7_pricing', url: `${DC}/pricing`, path: '/pricing', seconds: 11.5,
    scroll: [[0, 360], [1.0, 360], [2.2, 520], [11.5, 560]],
    cursor: [[0, [720, 760]], [2.4, { a: 'start free', dy: 0 }], [5.0, { a: 'start free', dx: 8, dy: 2 }],
      [6.6, { a: 'buy lifetime', dy: 0 }], [10.2, { a: 'buy lifetime', dx: 10, dy: 2 }], [11.5, { a: 'buy lifetime', dx: 12, dy: 4 }]],
    zoom: [[0, 1], [2.0, 1], [3.0, 1.45], [5.2, 1.45], [6.6, 1.45], [9.6, 1.45], [11.0, 1.05]],
  },
];
