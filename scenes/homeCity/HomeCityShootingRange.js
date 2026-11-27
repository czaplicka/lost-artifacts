// =============================================================================
// HomeCityShootingRange.js - Holloway's Shooting Range on the Old Quarter map.
//
// Started on the original construction-site plot (x33-35, y3-5) and moved to
// Foundry Lane, the third street: west block, below the police station.
//
// Imported by HomeCityScene.js; the palette registers as a side effect.
// NOTE: texts are plain strings (not __dialogueText).
// =============================================================================
import { PALETTES } from './HomeCityConfig.js';

export const SHOOTING_RANGE_ID = 'shooting-range';
export const SHOOTING_RANGE_FOOTPRINT = { x: 5, y: 21, w: 3, h: 3 };   // Foundry Lane, west block (door 6,24)

export const SHOOTING_RANGE_BUILDING = {
  id: SHOOTING_RANGE_ID, name: "Holloway's Range", ...SHOOTING_RANGE_FOOTPRINT,
  color: 0x6f6a4a, message: '', sceneKey: 'ShootingRangeScene'
};

// the door cell (6,24) and the cell in front of it (6,25) stay free
export const SHOOTING_RANGE_PROPS = [
  { x: 5, y: 24, kind: 'crate' }, { x: 7, y: 24, kind: 'lamp' }, { x: 7, y: 25, kind: 'bin' }
];

PALETTES[SHOOTING_RANGE_ID] = {
  wall: 0x7c7656, shade: 0x55503a, roof: 0x34342c,
  trim: 0xd8cf9e, glass: 0x2d3b36, accent: 0xc8452f,
  height: 112, style: 'brick', door: 0x3b3a2c,
  lit: 0.45, blinds: true, blade: 'target', sign: 'SHOOTING RANGE',
  features: [{ t: [2, 0], k: 'flag' }, { t: [0, 0], k: 'vent' }]
};
