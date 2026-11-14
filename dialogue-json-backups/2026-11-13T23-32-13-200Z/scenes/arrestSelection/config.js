export const FONT_PIXEL = 'PressStart2P';
export const FONT_TYPE = 'SpecialElite';

// Final, irreversible decision -> ask "are you sure?" before ending the game.
// Set to false to restore the old one-click arrest.
export const REQUIRE_ARREST_CONFIRMATION = true;

export const SLIDE_DISTANCE = 140;
export const SLIDE_DURATION = 240;
export const ARREST_COMMIT_DELAY = 750;

export const DESK_TEXTURE_KEY = 'arrest_desk_tex';
export const VIGNETTE_TEXTURE_KEY = 'arrest_vignette_tex';

export const PAL = {
  gold: 0xd4af37,
  goldCss: '#D4AF37',
  ink: '#2b1a0e',
  inkSoft: '#7a5a38',
  cream: '#f6e9c4',
  creamWarm: '#f1dfb0',
  red: 0x8f1d14,
  redBright: 0xb3281c,
  redCss: '#8f1d14',
  brown: 0x57391d,
  brownHover: 0x7a5229,
  brownDark: 0x3a2916
};

export const DEFAULT_DIALOGUE =
  'Compare each file with your evidence. One of them took the artifact. ' +
  'Choose wisely, detective.';

export const DEFAULT_NOTE =
  '<  >  browse files   |   ENTER  arrest   |   Cross-check means, motive and opportunity.';

// Fields shown on the "Subject Record" page. Add/remove rows freely:
// { label: 'short label', key: 'property in suspects.json' }
export const DOSSIER_FIELDS = [
  { label: 'SEX', key: 'gender' },
  { label: 'HAIR', key: 'hair' },
  { label: 'EYES', key: 'eyes' },
  { label: 'MARKS', key: 'features' },
  { label: 'ACCENT', key: 'accent' },
  { label: 'SKILLS', key: 'skills' },
  { label: 'HABITS', key: 'habitus' },
  { label: 'HANDED', key: 'handedness' },
  { label: 'BLOOD', key: 'bloodType' },
  { label: 'SHOES', key: 'shoeSizeCategory' }
];

// Sticky-note jokes. One is picked per suspect, no repeats inside a lineup.
export const FIELD_NOTE_QUIPS = [
  'Suspicious. Then again, so is anyone holding a sandwich that long.',
  'Gut feeling: guilty. Gut is also hungry, so double-check.',
  'Alibi: "I was at home." Nobody has ever been at home.',
  'Has the face of someone who says "not me" a bit too early.',
  'Keep this one away from the evidence room. And the biscuits.',
  'My horoscope says never trust that haircut. Scorpios know.',
  'Would look great on a Wanted poster. Not proof, but still.',
  'Warning: photo may be fashionably misleading.',
  'If we are wrong, we blame the intern. We have no intern. Yet.',
  'Probably innocent. Probably. Check the shoes.'
];

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
