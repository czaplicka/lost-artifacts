import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
export const HAIR_OVERRIDE_FEATURES = [__dialogueText("ui/warrant/warrantConfig.js", "t_0da0810b1405d4a96303")];

// Cechy, które przyjmują kolor włosów.
export const HAIR_COLORED_FEATURES = [
  __dialogueText("ui/warrant/warrantConfig.js", "t_d4bf972585383546b102"),
  __dialogueText("ui/warrant/warrantConfig.js", "t_0da0810b1405d4a96303"),
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
  ['gender', __dialogueText("ui/warrant/warrantConfig.js", "t_a04630ef8bc3da8c864a")],
  ['race', __dialogueText("ui/warrant/warrantConfig.js", "t_9667a418b91c9c8b8155")],
  ['hair', __dialogueText("ui/warrant/warrantConfig.js", "t_ababed4823ab79d226ba")],
  ['eyes', __dialogueText("ui/warrant/warrantConfig.js", "t_a39e9d9816a99fc02aa4")],
  ['accent', __dialogueText("ui/warrant/warrantConfig.js", "t_a5c6fb18c9af89b22a79")],
  ['features', __dialogueText("ui/warrant/warrantConfig.js", "t_5697d03daef4de9cf8db")]
];

export const NO_MATCH_JOKES = [
  __dialogueText("ui/warrant/warrantConfig.js", "t_256ae5752d037a32998c"),
  __dialogueText("ui/warrant/warrantConfig.js", "t_715013924b3eedd7f7e1"),
  __dialogueText("ui/warrant/warrantConfig.js", "t_3dba5c83921ccddef60e"),
  __dialogueText("ui/warrant/warrantConfig.js", "t_8c13d28d20e87aeccb02"),
  __dialogueText("ui/warrant/warrantConfig.js", "t_b5d80697315d2738b4cd")
];

export const WARRANT_JOKES = [
  __dialogueText("ui/warrant/warrantConfig.js", "t_a7b0d53b930abb4e4390"),
  __dialogueText("ui/warrant/warrantConfig.js", "t_55928850ac8f61ebd48c"),
  __dialogueText("ui/warrant/warrantConfig.js", "t_a6b378d947c12d8ecfdb"),
  __dialogueText("ui/warrant/warrantConfig.js", "t_448f8eb521539c43ce78"),
  __dialogueText("ui/warrant/warrantConfig.js", "t_0e7796b56c3d7b443295")
];