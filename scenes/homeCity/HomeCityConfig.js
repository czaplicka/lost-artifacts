const HW = 64, HH = 32;                    // keep in sync with HomeCityScene
const WORLD_W = 3300, WORLD_H = 2000;      // keep in sync with camera bounds in HomeCityScene
const FONT_UI = 'SpecialElite, monospace', FONT_PX = 'PressStart2P, monospace';
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];


// Fine-tuning for real sprites (anchor = bottom vertex of the building footprint / bottom-centre of a prop).
export const BUILDING_SPRITE_TWEAKS = {
  'pi-office': { dx: 0, dy: 0, scale: 1, height: 170 }, 'spy-shop': { dx: 0, dy: 0, scale: 1, height: 150 },
  tavern: { dx: 0, dy: 0, scale: 1, height: 160 }, 'police-station': { dx: 0, dy: 0, scale: 1, height: 190 },
  'your-home': { dx: 0, dy: 0, scale: 1, height: 160 }, cemetery: { dx: 0, dy: 0, scale: 1, height: 120 }
};
export const PROP_SPRITE_TWEAKS = {}; // e.g. { tree_0: { dx: 0, dy: 4, scale: 0.8 } }

const PALETTES = {
  'pi-office': { wall: 0xc4ab83, shade: 0x9a7d5b, roof: 0x57483e, trim: 0xe3cfaa, glass: 0x35494c, accent: 0xd7b16b, height: 142,
    style: 'brick', door: 0x3f2f26, lit: 0.35, blinds: true, blade: 'eye', sign: 'PRIVATE EYE (OPEN 9-ISH)',
    features: [{ t: [0, 0], k: 'chimney' }, { t: [2, 0], k: 'antenna' }, { t: [1, 1], k: 'vent' }, { t: [2, 2], k: 'vent', dx: 8 }] },
  'spy-shop': { wall: 0x78918a, shade: 0x4e6b66, roof: 0x343e3b, trim: 0xb8bfa4, glass: 0x233b3b, accent: 0xddd28e, height: 114,
    style: 'boards', door: 0x24403c, lit: 0.2, shop: true, awning: [0x2f6f66, 0xd9d4b4], blade: 'lens', sign: 'CLOSED. NOBODY WAS HERE.',
    features: [{ t: [1, 1], k: 'dish' }, { t: [2, 0], k: 'antenna' }] },
  tavern: { wall: 0xb58162, shade: 0x86563f, roof: 0x6c4235, trim: 0xe1bc87, glass: 0x78623d, accent: 0xe7b85c, height: 132,
    style: 'stucco', door: 0x4a2c20, lit: 1, shop: true, awning: [0x8c2f2a, 0xe9ddc0], blade: 'mug', sign: 'THE DRUNKEN ALIBI',
    features: [{ t: [0, 1], k: 'chimney', smoke: true }, { t: [2, 0], k: 'vent' }] },
  'police-station': { wall: 0x93a1a1, shade: 0x65757c, roof: 0x3d4d56, trim: 0xd1d1b8, glass: 0x344c58, accent: 0xc3a45b, height: 156,
    style: 'stone', door: 0x2b3a46, lit: 0.5, pilasters: true, blade: 'badge', sign: 'PRECINCT 13 1/2',
    features: [{ t: [3, 0], k: 'flag' }, { t: [1, 2], k: 'beacon' }, { t: [0, 1], k: 'vent' }] },
  'your-home': { wall: 0xc2b491, shade: 0x95896d, roof: 0x666d51, trim: 0xebe0bd, glass: 0x486064, accent: 0x839b72, height: 120,
    style: 'stucco', door: 0x4b5a3f, lit: 0.45, shutters: 0x5f7a52, blade: 'bird', sign: 'COO-COO LOFT',
    features: [{ t: [1, 1], k: 'loft' }, { t: [0, 0], k: 'chimney', smoke: true }] }
};

const STREET_TEXTS = [
  { t: 'RED HERRING RD', u: 10, v: 3.6, rot: 'v', size: 30 },
  { t: 'GUMSHOE AVE', u: 21.5, v: 10.6, rot: 'u', size: 30 },
  { t: 'SLOW: PIGEONS', u: 1.5, v: 15, rot: 'v', size: 26 },
  { t: 'OLD QUARTER', u: 15, v: 8.45, rot: 'u', size: 24 }
];
const WALKERS = [
  { tex: 'ped0', speed: 1.0, route: [[2, 20], [23, 20]] },
  { tex: 'ped1', speed: 0.9, route: [[3, 1], [3, 21]] },
  { tex: 'ped2', speed: 1.25, route: [[25, 1], [25, 21]] },
  { tex: 'dog', speed: 1.3, route: [[5, 7], [8, 7, 2.6], [11, 7], [8, 7, 1.2]] }
];


export { HW, HH, WORLD_W, WORLD_H, FONT_UI, FONT_PX, DIRS, PALETTES, STREET_TEXTS, WALKERS };
