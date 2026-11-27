// =============================================================================
// HomeCityShootingRange.js - Holloway's Shooting Range on the Old Quarter map.
//
// Takes over the old construction-site plot (x33-35, y3-5, door 34,6), exactly
// as HomeCityConstruction.js prepared it: same footprint, a sceneKey, a palette.
// The construction module stays imported for its prop arts / quips only.
//
// Imported by HomeCityScene.js; the palette registers as a side effect.
// NOTE: texts are plain strings (not __dialogueText).
// =============================================================================
import { PALETTES } from './HomeCityConfig.js';
import { SITE_FOOTPRINT } from './HomeCityConstruction.js';

export const SHOOTING_RANGE_ID = 'shooting-range';

export const SHOOTING_RANGE_BUILDING = {
  id: SHOOTING_RANGE_ID, name: "Holloway's Range", ...SITE_FOOTPRINT,
  color: 0x6f6a4a, message: '', sceneKey: 'ShootingRangeScene'
};

// the door cell (34,6) and the cell in front of it (34,7) stay free
export const SHOOTING_RANGE_PROPS = [
  { x: 33, y: 6, kind: 'crate' }, { x: 35, y: 6, kind: 'lamp' }, { x: 35, y: 7, kind: 'bin' }
];

PALETTES[SHOOTING_RANGE_ID] = {
  wall: 0x7c7656, shade: 0x55503a, roof: 0x34342c,
  trim: 0xd8cf9e, glass: 0x2d3b36, accent: 0xc8452f,
  height: 112, style: 'brick', door: 0x3b3a2c,
  lit: 0.45, blinds: true, blade: 'target', sign: 'SHOOTING RANGE',
  features: [{ t: [2, 0], k: 'flag' }, { t: [0, 0], k: 'vent' }]
};
