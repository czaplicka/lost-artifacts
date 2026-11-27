// =============================================================================
// ShootingRangeData.js - numbers, texts and asset list for Holloway's Range.
//
// GRAPHICS: every image below is optional. Drop a file at
//   assets/pi/shooting-range/<name>.webp
// and it replaces the procedural placeholder (ShootingRangeArt.js) on the next
// page load. Keep the sizes: hit zones are measured in texture pixels.
// NOTE: texts are plain strings (not __dialogueText).
// =============================================================================

export const KEY = 'ShootingRangeScene';
export const W = 1920, H = 1080;
export const FONT = { body: 'SpecialElite, monospace', pixel: 'PressStart2P, monospace' };
export const ASSET_DIR = 'assets/pi/shooting-range';

export const ROUND = Object.freeze({
  price: 3,            // dollars per round - deliberately cheap
  seconds: 45,
  cylinder: 6,         // shots before a reload
  reloadMs: 1100,
  maxTargets: 4
});

// name -> texture key + size. `w`/`h` are the expected file dimensions.
export const IMAGES = Object.freeze({
  lobby:     { key: 'range_lobby',     w: 1920, h: 1080 },
  lanes:     { key: 'range_lanes',     w: 1920, h: 1080 },
  sarge:     { key: 'range_sarge',     w: 520,  h: 760 },
  bullseye:  { key: 'range_bullseye',  w: 200,  h: 340 },
  thug:      { key: 'range_thug',      w: 200,  h: 340 },
  thugFront: { key: 'range_thug_front', w: 200, h: 340 },
  civilian:  { key: 'range_civilian',  w: 200,  h: 340 },
  civilian2: { key: 'range_civilian2', w: 200,  h: 340 },
  bottle:    { key: 'range_bottle',    w: 70,   h: 70 },
  revolver:  { key: 'range_revolver',  w: 560,  h: 420 },
  crosshair: { key: 'range_crosshair', w: 96,   h: 96 },
  hole:      { key: 'range_hole',      w: 28,   h: 28 },
  bullet:    { key: 'range_bullet',    w: 22,   h: 48 }
});

// Optional sounds: assets/audio/pi/shooting-range/<name>.mp3 (synth fallback otherwise)
export const SOUNDS = Object.freeze({
  shot:   { key: 'range_sfx_shot',   file: 'shot' },
  empty:  { key: 'range_sfx_empty',  file: 'empty' },
  reload: { key: 'range_sfx_reload', file: 'reload' },
  ding:   { key: 'range_sfx_ding',   file: 'ding' },
  glass:  { key: 'range_sfx_glass',  file: 'glass' }
});

// Three lanes = the rails painted in lanes.webp (measured: y 380 / 534 / 678).
// Targets stand on the rail line `y`, drawn at `scale`.
export const LANES = Object.freeze([
  { y: 380, scale: 0.46, minX: 480, maxX: 1450, depth: 10 },
  { y: 534, scale: 0.62, minX: 570, maxX: 1360, depth: 20 },
  { y: 678, scale: 0.82, minX: 370, maxX: 1560, depth: 30 }
]);
export const SHELF = Object.freeze({ y: 260, scale: 1.15, minX: 660, maxX: 1280, depth: 5 });
export const BOOTH_TOP = 833;   // top edge of the booth counter in lanes.webp

// Each kind has image variants; hit zones are in texture pixels (origin top-left),
// measured from the alpha of the delivered files. `hold` scales how long a pop-up stays.
export const TARGETS = Object.freeze({
  bullseye: { weight: 38, variants: [
    { image: 'bullseye', ring: { x: 100, y: 138, r: 79, bull: 0.2, inner: 0.62 }, board: { x: 7, y: 46, w: 186, h: 186 } }
  ] },
  thug: { weight: 36, variants: [
    { image: 'thug',      head: { x: 85,  y: 42, r: 30 }, body: { x: 34, y: 80, w: 104, h: 245 } },
    { image: 'thugFront', head: { x: 100, y: 42, r: 30 }, body: { x: 46, y: 78, w: 112, h: 250 }, hold: 0.7 } // quick draw - aiming at you
  ] },
  civilian: { weight: 16, variants: [
    { image: 'civilian',  head: { x: 100, y: 48, r: 38 }, body: { x: 30, y: 92, w: 140, h: 240 } },
    { image: 'civilian2', head: { x: 99,  y: 42, r: 32 }, body: { x: 32, y: 78, w: 136, h: 255 } }
  ] },
  bottle: { weight: 10, variants: [
    { image: 'bottle', body: { x: 21, y: 2, w: 28, h: 68 } }
  ] }
});

export const POINTS = Object.freeze({
  bull: 10, inner: 5, outer: 2, head: 15, chest: 8, bottle: 12, civilian: -15
});

export const RANKS = Object.freeze([
  { min: 220, name: 'Dead-Eye Detective' },
  { min: 150, name: 'Sharpshooter' },
  { min: 90,  name: 'Marksman' },
  { min: 40,  name: 'Deputy' },
  { min: -Infinity, name: 'Rookie' }
]);
export const rankFor = score => RANKS.find(r => score >= r.min).name;

export const SARGE = {
  name: 'Sgt. Ruth Holloway',
  greetFirst: 'Holloway. Thirty years teaching cadets which end goes bang. Three bucks buys you forty-five seconds on the line and a full cylinder. Reloads are free. My patience is not.',
  greet: [
    'Back again? Good. Paper does not shoot back - best kind of practice.',
    'Ears on, eyes open, finger off the trigger till you mean it.',
    'Lane three is yours. Try not to hit the light fixtures this time.',
    'Three dollars, detective. Cheapest therapy in town.'
  ],
  broke: 'Three bucks. Not two-fifty, not "a favour later". Come back when your wallet does.',
  topics: [
    { label: 'How does scoring work?', text: 'Paper rings pay by the ring - ten for the bull, five inside, two on the edge. Cardboard thugs: fifteen for the head, eight for the chest. Bottles on the back shelf are a bonus twelve.' },
    { label: 'And the cardboard civilians?', text: 'Little old lady with the shopping bag? You shoot her, I take fifteen points off and you buy me a coffee. In this job, knowing when NOT to pull the trigger is the whole job.' },
    { label: 'Any tips?', text: 'Do not chase. Let the target walk into your sights. Count your shots - six, then reload. R key or right mouse, I do not care which, just do not wave it at me.' },
    { label: 'Who are you, anyway?', text: 'Police firearms instructor, retired. Pension was small, the range was cheap. The pigeons on the roof came with the lease. Nobody shoots the pigeons. House rule.' }
  ],
  after: {
    'Rookie': ['Well. The backstop is safe from you, at least.', 'Everybody starts somewhere. You started below somewhere.'],
    'Deputy': ['Not bad. Not good either. Come back tomorrow.', 'You hit things. Some of them were even targets.'],
    'Marksman': ['Now we are talking. Steady hands, steady head.', 'Good grouping. I have seen cadets do worse. Most of them.'],
    'Sharpshooter': ['That is real shooting. I am almost impressed.', 'I would put you on my old team. The good one.'],
    'Dead-Eye Detective': ['...I am pinning that sheet on the wall. Do not let it go to your head.', 'Thirty years. Maybe five people shot like that. You are six.']
  },
  civilianHit: 'And you hit a civilian. Out there that is not minus fifteen - it is a funeral and an inquiry.'
};

export const HINT = 'Click - shoot     R / right mouse - reload     Esc - stop';
