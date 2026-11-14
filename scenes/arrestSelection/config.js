import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
  __dialogueText("scenes/arrestSelection/config.js", "t_d260f34b2b7dd90219f5") +
  __dialogueText("scenes/arrestSelection/config.js", "t_2d9a2cfd4997d8842756");

export const DEFAULT_NOTE =
  __dialogueText("scenes/arrestSelection/config.js", "t_479b758c2a02005674a5");

// Fields shown on the "Subject Record" page. Add/remove rows freely:
// { label: 'short label', key: 'property in suspects.json' }
export const DOSSIER_FIELDS = [
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_b4bed028f83ea70bef67"), key: 'gender' },
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_3ba4bceecdd038ee3335"), key: 'hair' },
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_0dfe76e6578feacef7f6"), key: 'eyes' },
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_b3e196142052ffb2630b"), key: 'features' },
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_b930f4a003530edb2b83"), key: 'accent' },
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_463051f456ad180aff19"), key: 'skills' },
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_b6bdcfdb176d8ad35174"), key: 'habitus' },
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_9652ddfb67a9247aa327"), key: 'handedness' },
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_c9f5b99404f021accad3"), key: 'bloodType' },
  { label: __dialogueText("scenes/arrestSelection/config.js", "t_9319d315c89a5df3c981"), key: 'shoeSizeCategory' }
];

// Sticky-note jokes. One is picked per suspect, no repeats inside a lineup.
export const FIELD_NOTE_QUIPS = [
  __dialogueText("scenes/arrestSelection/config.js", "t_fd96f5022dd2ad76dcd1"),
  __dialogueText("scenes/arrestSelection/config.js", "t_66d962db5ab23dc81594"),
  __dialogueText("scenes/arrestSelection/config.js", "t_ab5a236799913b5a4c68"),
  __dialogueText("scenes/arrestSelection/config.js", "t_783ac211e09709586ef5"),
  __dialogueText("scenes/arrestSelection/config.js", "t_fa9b6849227114898bfa"),
  __dialogueText("scenes/arrestSelection/config.js", "t_dd2131fe52ee5e6293d7"),
  __dialogueText("scenes/arrestSelection/config.js", "t_512cbbd4ba02f577df56"),
  __dialogueText("scenes/arrestSelection/config.js", "t_9cb356ea6b682abb3f62"),
  __dialogueText("scenes/arrestSelection/config.js", "t_4d2e7633355c65bfcae2"),
  __dialogueText("scenes/arrestSelection/config.js", "t_1af2e68b62e6c4cc9e6e")
];

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
