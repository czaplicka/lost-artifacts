import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// suspectsBoard/gridConstants.js

export const FIELD_DEFS = [
  {
    id: 'hair_color',
    aliases: ['hair', 'hairColor'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_9be86624f7f43b815b19")
  },
  {
    id: 'blood_type',
    aliases: ['bloodType'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_95d92096f95755553f37")
  },
  {
    id: 'biological_sex',
    aliases: [
      'gender', 'sex', 'biologicalSex', 'dna_gender', 'dna_profile'
    ],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_bf6e9d9b603476cab4da")
  },
  {
    id: 'fingerprint_pattern',
    aliases: ['fingerprintPattern'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_0de0d411a6eb00eb2a5a")
  },
  {
    id: 'shoe_size_category',
    aliases: ['shoeSizeCategory'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_3e123d9791e7963a31ef")
  },
  {
    id: 'dust_profile',
    aliases: ['dustProfile', 'microtrace', 'microtrace_profile'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_a2df7c0d39e11ec0a06b")
  },
  {
    id: 'handedness',
    aliases: ['dominantHand', 'dominant_hand'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_ff71f64490560b300afa")
  },
  {
    id: 'material_profile',
    aliases: ['materialProfile'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_87b82692cc6dcce39863")
  },
  {
    // Legacy only: no automatic conversion to the new material schema.
    id: 'fiber_profile',
    aliases: ['fiberProfile'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_c734a6f0b9822dccce03")
  },
  {
    id: 'eye_color',
    aliases: ['eyes', 'eyeColor'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_11ac62cf6f2fb7c695b7")
  },
  {
    id: 'race',
    aliases: ['ancestry'],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_b293d9ae7302a1380124")
  },
  {
    id: 'skills',
    aliases: [],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_378a46f1eb8ddc234d12")
  },
  {
    id: 'habitus',
    aliases: [],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_b6bdcfdb176d8ad35174")
  },
  {
    id: 'alibi',
    aliases: [],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_6bb9417d04fe2d77255e")
  },
  {
    id: 'motive',
    aliases: [],
    label: __dialogueText("suspectsBoard/gridConstants.js", "t_34b3505c413a9872098d")
  }
];

export const FIELD_BY_ALIAS = new Map();

FIELD_DEFS.forEach(definition => {
  [definition.id, ...definition.aliases].forEach(alias => {
    if (FIELD_BY_ALIAS.has(alias)) {
      throw new Error(`Duplicate evidence field alias: ${alias}`);
    }
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
  __dialogueText("suspectsBoard/gridConstants.js", "t_20286ea42aad28b7fa13");
