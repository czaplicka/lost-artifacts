// config/AvatarParts.js
// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for the layered player avatar (pencil-sketch style,
// same look as the Warrant identikit).
//
// HOW TO ADD ART (no code changes needed except flipping `ready`):
//   1. Export a webp on the SAME canvas size as assets/ui/sketch_base.webp
//      (every layer is centred on the canvas, exactly like WarrantSketch).
//   2. Save it as   assets/avatar/<slot>/<id>.webp
//        e.g.       assets/avatar/hairFront/messy.webp
//                   assets/avatar/hairBack/longWaves.webp
//   3. Set  ready: true  on that option below. It appears in the picker.
//
// Grey / white art gets multiplied by the tint (skin, hair, eyes) at runtime.
// Art with tint: null is drawn as-is.
//
// FACE SHAPES: keep skull, ear line and eye line identical in every face so
// that hair / glasses / beards drawn for the oval face still fit.
// ---------------------------------------------------------------------------

const UI = 'assets/ui/';
const AV = 'assets/avatar/';

export const AVATAR_CONFIG = {
  VERSION: 1,
  CROP_KEY: 'sketch_base',          // portrait crop is derived from this layer
  CROP_PAD: { left: 0.18, right: 0.18, top: 0.16, bottom: 0.03 },
  OUTPUT_HEIGHT: 512,
  TEXTURE_KEY: 'player_avatar',
  PAPER: '#efe4c8'
};

// Bottom -> top draw order.
export const LAYER_ORDER = [
  'hairBack',
  'base',
  'clothing',
  'marks',
  'blush',
  'eyes',
  'makeup',
  'facialHair',
  'hairFront',
  'headwear',
  'eyewear',
  'jewelry'
];

// ---- tiny builders --------------------------------------------------------

const layer = (key, file, slot, tint = null) => ({ key, file, slot, tint });
const art = (slot, id, tint = null) =>
  layer(`av_${slot}_${id}`, `${AV}${slot}/${id}.webp`, slot, tint);

// A part with art. `ready:false` = planned (hidden until the file exists).
const P = (id, label, layers = [], { ready = false, quip = '', suppress = [] } = {}) =>
  ({ id, label, art: layers, ready, quip, suppress });

const NONE = (label = 'None', quip = '') =>
  ({ id: 'none', label, art: [], ready: true, quip, suppress: [] });

// A colour (tint) option.
const C = (id, label, color, quip = '') =>
  ({ id, label, color, art: [], ready: true, quip, suppress: [] });

// ---- manifest -------------------------------------------------------------
// Key order = order of groups in the UI.

export const APPEARANCE_OPTIONS = {
  faceShape: {
    label: 'Face Shape',
    options: [
      P('oval', 'Classic Oval', [
        layer('sketch_base', `${UI}sketch_base.webp`, 'base', 'skin'),
        layer('sketch_eyes', `${UI}sketch_eyes.webp`, 'eyes', 'eyes')
      ], { ready: true, quip: 'A face you forget instantly. Ideal for the profession.' }),
      P('square', 'Square Jaw', [art('base', 'square', 'skin'), art('eyes', 'square', 'eyes')],
        { quip: 'Jaw so square it has its own zoning laws.' }),
      P('round', 'Round', [art('base', 'round', 'skin'), art('eyes', 'round', 'eyes')],
        { quip: 'Trustworthy. Suspiciously so.' }),
      P('long', 'Long', [art('base', 'long', 'skin'), art('eyes', 'long', 'eyes')],
        { quip: 'Looks permanently disappointed. Useful in interrogations.' }),
      P('heart', 'Heart-Shaped', [art('base', 'heart', 'skin'), art('eyes', 'heart', 'eyes')],
        { quip: 'Cheekbones sold separately. Yours came with the file.' })
    ]
  },

  skinTone: {
    label: 'Skin Tone',
    options: [
      C('light', 'Fair', 0xffe0bd, 'Burns on every stakeout. Every single one.'),
      C('golden', 'Golden', 0xf2d6a2),
      C('olive', 'Olive', 0xd8b07c),
      C('warm', 'Warm', 0xd19d70),
      C('deep', 'Deep', 0xa9703f),
      C('rich', 'Rich', 0x69422a)
    ]
  },

  hairStyle: {
    label: 'Hair Style',
    options: [
      P('shaved', 'Shaved', [], { ready: true, quip: 'It was a choice. A bold one. Nobody asked.' }),
      P('neat', 'Neat', [layer('sketch_hair', `${UI}sketch_hair.webp`, 'hairFront', 'hair')],
        { ready: true, quip: 'Combed in forty seconds. Looks it.' }),
      P('swept', 'Generous Forehead', [layer('big_forhead', `${UI}big_forhead.webp`, 'hairFront', 'hair')],
        { ready: true, quip: 'More forehead than strictly necessary.' }),
      P('long', 'Long', [
        layer('long_hair', `${UI}long_hair.webp`, 'hairBack', 'hair'),
        layer('sketch_hair', `${UI}sketch_hair.webp`, 'hairFront', 'hair')
      ], { ready: true, quip: 'Gets caught in every door. Case-relevant, once.' }),
      P('messy', 'Messy', [art('hairFront', 'messy', 'hair')], { quip: 'Slept in the office. Again.' }),
      P('bob', 'Bob', [art('hairFront', 'bob', 'hair')], { quip: 'Sharp. Like the questions.' }),
      P('bobBangs', 'Bob With Bangs', [art('hairFront', 'bobBangs', 'hair')], { quip: 'Hides the eyebrow that does all the judging.' }),
      P('pixie', 'Pixie', [art('hairFront', 'pixie', 'hair')], { quip: 'Fast to dry. Faster to disappear.' }),
      P('curly', 'Curly', [art('hairFront', 'curly', 'hair')], { quip: 'Wins every fight with humidity. Loses to hats.' }),
      P('braids', 'Braids', [art('hairBack', 'braids', 'hair'), art('hairFront', 'braids', 'hair')], { quip: 'Ready for anything. Including a long stakeout.' }),
      P('sideBraid', 'Side Braid', [art('hairBack', 'sideBraid', 'hair'), art('hairFront', 'sideBraid', 'hair')], { quip: 'Neat enough to lie convincingly.' }),
      P('highPonytail', 'High Ponytail', [art('hairBack', 'highPonytail', 'hair'), art('hairFront', 'highPonytail', 'hair')], { quip: 'Aerodynamic. Chases suspects better.' }),
      P('lowBun', 'Low Bun', [art('hairBack', 'lowBun', 'hair'), art('hairFront', 'lowBun', 'hair')], { quip: 'Holds a pencil. Possibly two. Possibly evidence.' }),
      P('longWaves', 'Long Waves', [art('hairBack', 'longWaves', 'hair'), art('hairFront', 'longWaves', 'hair')], { quip: 'Noir-approved. Shampoo-commercial-approved too.' }),
      P('hat', 'Fedora', [art('headwear', 'hat')], { suppress: ['hairFront'], quip: 'Not an archaeologist. Legally.' })
    ]
  },

  hairColor: {
    label: 'Hair Colour',
    options: [
      C('black', 'Black', 0x1a1a1a),
      C('brown', 'Brown', 0x4a2e2b),
      C('auburn', 'Auburn', 0x7a3b22),
      C('red', 'Ginger', 0xb83b28, 'Has never once been described as "forgettable".'),
      C('blonde', 'Blonde', 0xe6c687),
      C('grey', 'Grey', 0x9b9b9b, 'Distinguished. Or the last case.'),
      C('white', 'Silver', 0xf2f2f2),
      C('teal', 'Teal', 0x2aa198, 'A midlife experiment. Committed to it.'),
      C('pink', 'Pink', 0xe05a9d, 'Undercover? Absolutely not.')
    ]
  },

  eyeColor: {
    label: 'Eye Colour',
    options: [
      C('brown', 'Brown', 0x8b572a),
      C('hazel', 'Hazel', 0xc69c6d),
      C('green', 'Green', 0x3fae6a),
      C('blue', 'Blue', 0x4a90e2, 'Sees through lies. Occasionally.'),
      C('grey', 'Steel', 0x9aa5ad),
      C('amber', 'Amber', 0xd9962b)
    ]
  },

  facialHair: {
    label: 'Facial Hair',
    options: [
      NONE('Clean-Shaven', 'Nothing to hide. Suspicious in itself.'),
      P('moustache', 'Moustache', [layer('moustache', `${UI}moustache.webp`, 'facialHair', 'hair')],
        { ready: true, quip: 'Every great detective has one. So does every great villain.' }),
      P('goatee', 'Goatee', [layer('gotee', `${UI}gotee.webp`, 'facialHair', 'hair')],
        { ready: true, quip: 'Looks evil. Is actually just a poet.' }),
      P('fullBeard', 'Full Beard', [layer('beard', `${UI}beard.webp`, 'facialHair', 'hair')],
        { ready: true, quip: 'Contains at least one sandwich.' }),
      P('shortBeard', 'Short Beard', [art('facialHair', 'shortBeard', 'hair')], { quip: 'Stubble with a business plan.' })
    ]
  },

  accessory: {
    label: 'Accessory',
    options: [
      NONE('None'),
      P('glasses', 'Glasses', [layer('glasses', `${UI}glasses.webp`, 'eyewear')],
        { ready: true, quip: 'Worn to look smarter. Results vary.' }),
      P('sunglasses', 'Sunglasses', [art('eyewear', 'sunglasses')], { quip: 'Indoors. At night. Because.' }),
      P('monocle', 'Monocle', [art('eyewear', 'monocle')], { quip: 'Nobody has the heart to tell you.' }),
      P('scarf', 'Scarf', [art('clothing', 'scarf')], { quip: 'Mysterious. Also, the office has no heating.' }),
      P('notebook', 'Notebook', [art('clothing', 'notebook')], { quip: 'Contains notes. Mostly lunch orders.' })
    ]
  },

  jewelry: {
    label: 'Jewellery',
    options: [
      NONE('None'),
      P('earring', 'Earring', [layer('earings', `${UI}earings.webp`, 'jewelry')],
        { ready: true, quip: 'One earring. A story nobody asked for.' }),
      P('necklace', 'Necklace', [layer('neckles', `${UI}neckles.webp`, 'jewelry')],
        { ready: true, quip: 'A gift from someone. We do not talk about who.' }),
      P('studs', 'Studs', [art('jewelry', 'studs')]),
      P('hoops', 'Hoops', [art('jewelry', 'hoops')]),
      P('dropEarrings', 'Drop Earrings', [art('jewelry', 'dropEarrings')]),
      P('pearlNecklace', 'Pearls', [art('jewelry', 'pearlNecklace')], { quip: 'Clutched, on request.' }),
      P('pendant', 'Pendant', [art('jewelry', 'pendant')])
    ]
  },

  marks: {
    label: 'Battle Damage',
    options: [
      NONE('Unmarked', 'Hasn\'t seen real action yet.'),
      P('scar', 'Scar', [layer('scar', `${UI}scar.webp`, 'marks')],
        { ready: true, quip: 'Bar fight, allegedly. Paper cut, actually.' }),
      P('bandage', 'Plaster', [art('marks', 'bandage')], { quip: 'Paper cut. Case closed.' }),
      P('eyepatch', 'Eyepatch', [art('marks', 'eyepatch')], { quip: 'Lost it on a case. Will not say which one.' })
    ]
  },

  tattoos: {
    label: 'Tattoos',
    options: [
      NONE('None'),
      P('ink', 'Mystery Ink', [layer('tatoo', `${UI}tatoo.webp`, 'marks')],
        { ready: true, quip: 'Seemed profound at 2 a.m.' }),
      P('dragon', 'Dragon', [art('marks', 'dragon')]),
      P('skull', 'Skull', [art('marks', 'skull')]),
      P('rose', 'Rose', [art('marks', 'rose')])
    ]
  },

  makeup: {
    label: 'Make-up',
    options: [
      NONE('None'),
      P('natural', 'Natural', [art('makeup', 'natural')]),
      P('red', 'Red Lips', [art('makeup', 'red')], { quip: 'Femme fatale starter pack.' }),
      P('dark', 'Smoky', [art('makeup', 'dark')]),
      P('glitter', 'Glitter', [art('makeup', 'glitter')], { quip: 'Found at every crime scene. Never explained.' })
    ]
  },

  blush: {
    label: 'Blush',
    options: [
      NONE('None'),
      P('softRose', 'Soft Rose', [art('blush', 'softRose')]),
      P('peach', 'Peach', [art('blush', 'peach')]),
      P('berry', 'Berry', [art('blush', 'berry')])
    ]
  },

  coat: {
    label: 'Outfit',
    options: [
      NONE('Shirt Only'),
      P('trench', 'Trench Coat', [art('clothing', 'trench')], { quip: 'Standard issue. Smells of rain and regret.' }),
      P('leather', 'Leather Jacket', [art('clothing', 'leather')], { quip: 'Squeaks during stakeouts.' }),
      P('blazer', 'Blazer', [art('clothing', 'blazer')]),
      P('sweater', 'Sweater', [art('clothing', 'sweater')], { quip: 'Knitted by someone who loved you. Or hated you.' }),
      P('bowBlouse', 'Bow Blouse', [art('clothing', 'bowBlouse')]),
      P('vNeckBlouse', 'V-Neck Blouse', [art('clothing', 'vNeckBlouse')]),
      P('cardigan', 'Cardigan', [art('clothing', 'cardigan')]),
      P('fittedBlazer', 'Fitted Blazer', [art('clothing', 'fittedBlazer')]),
      P('dress', 'Dress', [art('clothing', 'dress')])
    ]
  }
};

export const DEFAULT_APPEARANCE = {
  faceShape: 'oval',
  skinTone: 'light',
  hairStyle: 'neat',
  hairColor: 'brown',
  eyeColor: 'brown',
  facialHair: 'none',
  accessory: 'none',
  jewelry: 'none',
  marks: 'none',
  tattoos: 'none',
  makeup: 'none',
  blush: 'none',
  coat: 'trench'
};

// ---- helpers --------------------------------------------------------------

export function findOption(category, id) {
  return APPEARANCE_OPTIONS[category]?.options.find(o => o.id === id) ?? null;
}

// Old saves kept earrings / necklaces in `accessory`.
const LEGACY_JEWELRY = new Set([
  'studs', 'hoops', 'earring', 'dropEarrings', 'pearlNecklace', 'pendant'
]);

export function migrateLegacyAppearance(appearance = {}) {
  const source = appearance && typeof appearance === 'object' ? { ...appearance } : {};

  if (LEGACY_JEWELRY.has(source.accessory)) {
    if (!source.jewelry || source.jewelry === 'none') {
      source.jewelry = source.accessory;
    }
    source.accessory = 'none';
  }

  return source;
}

export function normalizeAppearance(appearance = {}) {
  const source = migrateLegacyAppearance(appearance);
  const normalized = { ...DEFAULT_APPEARANCE };

  for (const category of Object.keys(APPEARANCE_OPTIONS)) {
    if (findOption(category, source[category])) {
      normalized[category] = source[category];
    }
  }

  return normalized;
}

export function getAppearanceSummary(appearance = {}) {
  const a = normalizeAppearance(appearance);
  const label = (category) => findOption(category, a[category])?.label ?? '';
  const visible = (category) => {
    const o = findOption(category, a[category]);
    return o && o.id !== 'none' && o.ready ? o.label : null;
  };

  const hair = a.hairStyle === 'shaved'
    ? 'Shaved head'
    : `${label('hairColor')} hair, ${label('hairStyle').toLowerCase()}`;

  return [
    `${label('skinTone')} skin`,
    hair,
    `${label('eyeColor')} eyes`,
    visible('facialHair'),
    visible('accessory'),
    visible('jewelry'),
    visible('marks'),
    visible('tattoos'),
    visible('makeup'),
    visible('coat')
  ].filter(Boolean).join(' · ');
}

// Witness-style one-liner: "how a nervous bystander would describe you".
const WITNESS_PRIORITY = [
  'marks', 'tattoos', 'accessory', 'facialHair', 'jewelry',
  'hairStyle', 'faceShape', 'hairColor', 'eyeColor', 'skinTone'
];

export function getWitnessLine(appearance = {}) {
  const a = normalizeAppearance(appearance);
  const quips = [];

  for (const category of WITNESS_PRIORITY) {
    const o = findOption(category, a[category]);
    if (o && o.ready && o.id !== 'none' && o.quip) quips.push(o.quip);
    if (quips.length === 2) break;
  }

  return quips.length
    ? quips.join(' ')
    : 'Appears to be a person. Further details pending.';
}

// Art to-do list for the artist (used by AvatarManager.getArtTodo()).
export function collectPlannedArt() {
  const todo = [];

  for (const [category, group] of Object.entries(APPEARANCE_OPTIONS)) {
    for (const opt of group.options) {
      if (opt.ready) continue;
      for (const l of opt.art) {
        todo.push({ category, option: opt.id, slot: l.slot, file: l.file });
      }
    }
  }

  return todo;
}