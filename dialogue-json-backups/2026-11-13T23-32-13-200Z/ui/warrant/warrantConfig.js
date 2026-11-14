export const PENCIL_COLORS = {
  skin: {
    WHITE: 0xffe0bd,
    BLACK: 0x69422a,
    LATINO: 0xd19d70,
    'AMERICAN INDIAN': 0xbe7d55,
    ASIAN: 0xf2d6a2,
    'NATIVE HAWAIIAN': 0xc89868,
    NONE: 0xffffff,
    UNKNOWN: 0xffffff
  },
  eyes: {
    BLUE: 0x4a90e2,
    GREEN: 0x50e3c2,
    BROWN: 0x8b572a,
    HAZEL: 0xc69c6d,
    NONE: 0xffffff,
    UNKNOWN: 0xffffff
  },
  hair: {
    BLACK: 0x1a1a1a,
    BROWN: 0x4a2e2b,
    BLONDE: 0xe6c687,
    RED: 0xb83b28,
    GRAY: 0x9b9b9b,
    NONE: 0xffffff,
    UNKNOWN: 0xffffff
  }
};

// Cechy z danych (UPPERCASE) -> klucze załadowanych grafik.
export const FEATURE_TEXTURES = {
  BEARD: 'beard',
  'BIG FOREHEAD': 'big_forhead',
  EARRINGS: 'earings',
  EARRING: 'earings',
  GLASSES: 'glasses',
  GOATEE: 'gotee',
  'LONG HAIR': 'long_hair',
  MOUSTACHE: 'moustache',
  NECKLACE: 'neckles',
  'RAINBOW STREAK': 'rainbow_streak',
  'RAINBOW HAIR STREAK': 'rainbow_streak',
  SCAR: 'scar',
  TATTOO: 'tatoo'
};

// Cechy, które ukrywają domyślną warstwę sketch_hair.
export const HAIR_OVERRIDE_FEATURES = ['BIG FOREHEAD'];

// Cechy, które przyjmują kolor włosów.
export const HAIR_COLORED_FEATURES = [
  'LONG HAIR',
  'BIG FOREHEAD',
  'BEARD',
  'MOUSTACHE',
  'GOATEE'
];

export const NOTEBOOK_CONFIG = {
  DEPTH: 30,
  FONT_HAND: 'IndieFlower',
  PENCIL_DARK: '#2b2b2b',
  PENCIL_FAINT: '#777777',
  INK_RED: '#a92a2a',
  INK_BLUE: '#1e3d59',
  BACKGROUND_FRAME: 'notebook_bg',
  HIGHLIGHT: 0xfff2a8
};

export const SCREEN_W = 1920;
export const SCREEN_H = 1080;
export const RESULT_X = 1040;
export const RESULT_START_Y = 660;
export const RESULT_STEP = 95;
export const MAX_RESULTS = 3;
export const MIN_TRAITS = 3;

export const TRAIT_FIELDS = [
  ['gender', 'Gender'],
  ['race', 'Race / Skin'],
  ['hair', 'Hair'],
  ['eyes', 'Eyes'],
  ['accent', 'Accent'],
  ['features', 'Features']
];

export const NO_MATCH_JOKES = [
  'Nobody in our files looks like that.\nAre you sure you drew a person and not a potato?',
  'The registry shrugged. Try fewer traits.',
  'Zero matches. Maybe your witness had a few drinks.',
  'Our database has never seen this person.\nNeither has anyone else. Suspicious.',
  'No results. The clerk is pretending to look busy.'
];

export const WARRANT_JOKES = [
  'The judge signed it without reading. Efficiency!',
  'Warrant stamped. The coffee break can wait.',
  'Somewhere, a suspect just felt a chill.',
  'Paperwork done. The hard part is catching them.',
  'Signed, sealed, and slightly coffee-stained.'
];