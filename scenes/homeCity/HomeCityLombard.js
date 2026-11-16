// =============================================================================
// HomeCityLombard.js - Honest Ziggy's Pawn on the Old Quarter map:
// footprint (x25-27, y13-15, door 26,16), palette (brick + striped awnings +
// the three golden balls on the roof) and the props around the entrance.
// Imported by HomeCityPostOfficeScene.js; the palette registers as a side effect.
// NOTE: texts are plain strings (not __dialogueText).
// =============================================================================
import { PALETTES } from './HomeCityConfig.js';

export const LOMBARD_BUILDING = {
  id: 'pawn-shop', name: "Honest Ziggy's Pawn", x: 25, y: 13, w: 3, h: 3,
  color: 0x8a4b3a, message: '', sceneKey: 'LombardScene'
};
export const LOMBARD_PROPS = [
  { x: 24, y: 13, kind: 'bush' }, { x: 25, y: 16, kind: 'lamp' }, { x: 25, y: 17, kind: 'bench' }
];

PALETTES['pawn-shop'] = {
  wall: 0x8a4b3a, shade: 0x5e3329, roof: 0x3a2f2a,
  trim: 0xd9c58a, glass: 0x27413a, accent: 0xe0b84a,
  height: 120, style: 'brick', door: 0x2f4a3a,
  lit: 0.6, shop: true, awning: [0x2f5d3a, 0xe8d9a8], blade: 'pawn', sign: "ZIGGY'S PAWN",
  features: [{ t: [1, 2], k: 'pawnballs', dy: 8 }, { t: [0, 0], k: 'vent' }]
};