export const FIELD_DEFS = [
  { id: 'hair_color', aliases: ['hair', 'hairColor'], label: 'HAIR COLOR' },
  { id: 'blood_type', aliases: ['bloodType'], label: 'BLOOD TYPE' },
  {
    id: 'biological_sex',
    aliases: ['gender', 'sex', 'biologicalSex'],
    label: 'DNA PROFILE'
  },
  {
    id: 'fingerprint_pattern',
    aliases: ['fingerprintPattern'],
    label: 'FINGERPRINT'
  },
  {
    id: 'shoe_size_category',
    aliases: ['shoeSizeCategory'],
    label: 'SHOE SIZE'
  },
  { id: 'handedness', aliases: ['dominantHand'], label: 'DOMINANT HAND' },
  { id: 'eye_color', aliases: ['eyes', 'eyeColor'], label: 'EYE COLOR' },
  { id: 'race', aliases: ['ancestry'], label: 'ANCESTRY' },
  { id: 'skills', aliases: [], label: 'CRIMINAL SKILLS' },
  { id: 'habitus', aliases: [], label: 'HABITS' },
  { id: 'alibi', aliases: [], label: 'ALIBI' },
  { id: 'motive', aliases: [], label: 'MOTIVE' }
];

export const FIELD_BY_ALIAS = new Map();

FIELD_DEFS.forEach((definition) => {
  [definition.id, ...definition.aliases].forEach((alias) => {
    FIELD_BY_ALIAS.set(alias, definition);
  });
});

export const COLORS = {
  bg: 0x110d0e,
  band: 0x271d1f,
  gold: 0xd4af37,
  panel: 0x1c1514,
  panelStroke: 0x5d4932,
  cellA: 0x241a17,
  cellB: 0x1d1514,
  cellHover: 0x3b2b1c,
  cellFilled: 0x3a2e1a,
  cellAuto: 0x2b2a1b,
  cellWaiting: 0x5a4518,
  line: 0x604b34,
  headerScene: 0x503719,
  headerSuspect: 0x32251b,
  okFill: 0x24422a,
  okStroke: 0x65a566,
  noFill: 0x632923,
  noStroke: 0xdf6559
};

export const RULED_OUT_EVERYONE_REASON =
  'You ruled out every single suspect. With nobody left to investigate, the case went cold and the thief walked free.';