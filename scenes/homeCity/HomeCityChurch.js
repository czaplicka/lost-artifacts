// =============================================================================
// HomeCityChurch.js - everything the Old Quarter needs to know about
// St. John Church: footprint, palette, churchyard props, prop art and quips.
// Imported by HomeCityPostOfficeScene.js (side effects register the palette,
// the new prop art and re-route the pedestrian that used to walk through it).
// NOTE: texts are plain strings (not __dialogueText) - run your extractor on
// this file if you want them in extracted.json.
// =============================================================================
import { PALETTES, WALKERS } from './HomeCityConfig.js';
import { PROP_ART } from './HomeCityPropArt.js';
import { dark, light, pp, poly, rect, line, shadow, isoBox } from './HomeCityDrawing.js';

export const CHURCH_BUILDING = {
  id: 'church', name: 'St. John Church', x: 20, y: 21, w: 4, h: 3,   // Foundry Lane, below the cemetery
  color: 0xc9c3b0, message: '', sceneKey: 'ChurchScene'
};
// the tree that used to stand on the footprint
// Base props removed to make room for the church (none since it moved to Foundry Lane).
export const CHURCH_CLEARED_PROPS = [];
// bushes on the west side, lamp and notice board flank the door (22,24)
export const CHURCH_PROPS = [
  { x: 19, y: 21, kind: 'bush' }, { x: 19, y: 23, kind: 'bush' },
  { x: 21, y: 24, kind: 'lamp' }, { x: 23, y: 24, kind: 'churchboard' }
];
export const CHURCH_LABEL_LIFT = 140;   // keeps the nameplate above the steeple

PALETTES.church = {
  wall: 0xc9c3b0, shade: 0x9a947f, roof: 0x4d5560, trim: 0xe8e1c8, glass: 0x2b3a5c, accent: 0xd9b45a,
  height: 140, style: 'stone', door: 0x4a2f20, lit: 0.9, pilasters: true, gothic: true,
  blade: 'cross', sign: 'ST. JOHN CHURCH', signZ: 128, signW: 2.7,
  features: [
    { t: [2, 2], k: 'steeple', pad: 190 },
    { t: [0, 2], k: 'pinnacle', dx: -50 }, { t: [3, 2], k: 'pinnacle', dy: 24 }, { t: [3, 0], k: 'pinnacle', dx: 50 }
  ]
};

PROP_ART.churchboard = { w: 110, h: 170, ax: 55, ay: 150, draw(ctx) {
  shadow(ctx, 30, 9);
  for (const x of [-20, 20]) rect(ctx, x - 3, -62, 6, 62, 0x3a2d22);
  isoBox(ctx, 0, 0, 0.3, 0.07, 56, 112, 0x5a4636, 0x2f4a3a, 0x24392d, 0x141f19);
  // notice behind glass
  poly(ctx, pp([-24, -54], [24, -54], [24, -94], [-24, -94]).map(p => ({ x: p.x, y: p.y + (p.x + 24) * 0.0 })), 0xf1e6c8, 0x6b5a3a, 1.5);
  for (let i = 0; i < 5; i++) rect(ctx, -19, -88 + i * 7, i % 2 ? 30 : 38, 2, 0x8a7d62);
  rect(ctx, -24, -112, 48, 9, 0xd9b45a);
  poly(ctx, pp([-30, -112], [30, -112], [0, -132]), 0x24392d, 0x141f19);
  rect(ctx, -1.5, -150, 3, 20, 0xd9b45a); rect(ctx, -7, -144, 14, 3, 0xd9b45a);
  line(ctx, -24, -54, 24, -94, 'rgba(255,255,255,0.18)', 3);
  void dark; void light;
} };

export const CHURCH_PROP_QUIPS = {
  churchboard: [
    'SUNDAY SERMON: "Thou Shalt Not Covet Thy Neighbour\'s Wi-Fi." Coffee after. Bring your own cup.',
    'BINGO NIGHT is cancelled. Father Crumb says it "looked too much like gambling". It was, in fact, gambling.',
    'LOST: one organ pipe. If found, please DO NOT play it.',
    'CHOIR PRACTICE: Thursdays. Earplugs at the door. This is not a joke.'
  ]
};

// column 25 crosses the pawn shop; column 28 is clear on all three streets
if (WALKERS[2]?.tex === 'ped2') WALKERS[2].route = [[28, 1], [28, 25]];