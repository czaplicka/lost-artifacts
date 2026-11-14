import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// suspects/DustEvidence.js
//
// Authored rules for the game's deduction puzzles.
// These associations are gameplay conventions, not real-world proof.
//
// Public functions return:
// - laboratory findings,
// - plain hobby descriptions,
// - internal compatibility results.
//
// No automatic suspect exclusion happens in this module.

const HOBBIES = Object.freeze({
  // Sports chalk
  bouldering: __dialogueText("suspects/DustEvidence.js", "t_13e21bad6df8981b68b7"),
  gymnastics: __dialogueText("suspects/DustEvidence.js", "t_766407af68d2456457c4"),
  weightlifting: __dialogueText("suspects/DustEvidence.js", "t_3623004950e5e2b1033e"),

  // Artist acrylic paint
  painting: __dialogueText("suspects/DustEvidence.js", "t_c21abf5b2d5601254dd9"),
  miniature_painting: __dialogueText("suspects/DustEvidence.js", "t_1dc4932bd7acf3f8206e"),
  stage_scenery: __dialogueText("suspects/DustEvidence.js", "t_47ac216e53c9e73a8b93"),

  // Ceramic clay
  pottery: __dialogueText("suspects/DustEvidence.js", "t_4d3338ff7a67ea568392"),
  ceramic_sculpture: __dialogueText("suspects/DustEvidence.js", "t_a31a21ababde2e881aff"),
  ceramic_jewellery: __dialogueText("suspects/DustEvidence.js", "t_68af0542b940ce90c106"),

  // Wood dust
  model_shipbuilding: __dialogueText("suspects/DustEvidence.js", "t_4cb8c8490016c2b39c49"),
  woodcarving: __dialogueText("suspects/DustEvidence.js", "t_176c18cc0837bc68e38d"),
  furniture_restoration: __dialogueText("suspects/DustEvidence.js", "t_d816988e37631e3a016d"),

  // Graphite dust
  pencil_sketching: __dialogueText("suspects/DustEvidence.js", "t_aaad13b268e596236973"),
  graphite_portraits: __dialogueText("suspects/DustEvidence.js", "t_a75525586954cd35f2f3"),
  graphite_illustration: __dialogueText("suspects/DustEvidence.js", "t_e63b58a9e44046c1dd1a"),

  // Wax particles
  candle_making: __dialogueText("suspects/DustEvidence.js", "t_9dd37da0058c6d495f5d"),
  batik: __dialogueText("suspects/DustEvidence.js", "t_669f2e0610243bbad1ec"),
  wax_sculpture: __dialogueText("suspects/DustEvidence.js", "t_963dbfff76f1d12b4ecb"),

  // Unrelated interests
  running: __dialogueText("suspects/DustEvidence.js", "t_23faec2eb54629afc59f"),
  chess: __dialogueText("suspects/DustEvidence.js", "t_c1aade8253979ee2f395"),
  birdwatching: __dialogueText("suspects/DustEvidence.js", "t_5aab3f0e1e1e6969b45d"),
  photography: __dialogueText("suspects/DustEvidence.js", "t_7be8b75c22f417725401"),
  crosswords: __dialogueText("suspects/DustEvidence.js", "t_86cba9722e58df4b658d"),
  astronomy: __dialogueText("suspects/DustEvidence.js", "t_0dda27a77996f8307cd7"),
  origami: __dialogueText("suspects/DustEvidence.js", "t_501073e4a4a7203951b3"),
  stamp_collecting: __dialogueText("suspects/DustEvidence.js", "t_a38edc555108198d3f49")
});

const PROFILES = Object.freeze({
  sports_chalk: Object.freeze({
    label: __dialogueText("suspects/DustEvidence.js", "t_885fb3fc83878f275608"),
    composition: __dialogueText("suspects/DustEvidence.js", "t_c7ce4a8f72344c9420bc"),

    report:
      __dialogueText("suspects/DustEvidence.js", "t_502c13365811d83a5554"),

    hobbyIds: Object.freeze([
      'bouldering',
      'gymnastics',
      'weightlifting'
    ])
  }),

  acrylic_paint: Object.freeze({
    label: __dialogueText("suspects/DustEvidence.js", "t_365fc99f9289e65e2f4a"),
    composition: __dialogueText("suspects/DustEvidence.js", "t_2ee9880faece65cde391"),

    report:
      __dialogueText("suspects/DustEvidence.js", "t_2951de1adaacc6f6b482") +
      __dialogueText("suspects/DustEvidence.js", "t_124f4e4f4c18dbc97a20"),

    hobbyIds: Object.freeze([
      'painting',
      'miniature_painting',
      'stage_scenery'
    ])
  }),

  ceramic_clay: Object.freeze({
    label: __dialogueText("suspects/DustEvidence.js", "t_68ebff24663aea8bf0c4"),
    composition: __dialogueText("suspects/DustEvidence.js", "t_415b11904d2d0a58f777"),

    report:
      __dialogueText("suspects/DustEvidence.js", "t_015687b9414a46ef5bfd") +
      __dialogueText("suspects/DustEvidence.js", "t_433b5066bdbaeaf36292"),

    hobbyIds: Object.freeze([
      'pottery',
      'ceramic_sculpture',
      'ceramic_jewellery'
    ])
  }),

  wood_dust: Object.freeze({
    label: __dialogueText("suspects/DustEvidence.js", "t_b55dab10602e39b12d51"),
    composition: __dialogueText("suspects/DustEvidence.js", "t_bf6e25aa92ced2b8ed39"),

    report:
      __dialogueText("suspects/DustEvidence.js", "t_ad44157055ed434375f2") +
      __dialogueText("suspects/DustEvidence.js", "t_40ab696343814c59950b"),

    hobbyIds: Object.freeze([
      'model_shipbuilding',
      'woodcarving',
      'furniture_restoration'
    ])
  }),

  graphite_dust: Object.freeze({
    label: __dialogueText("suspects/DustEvidence.js", "t_65436effecac519b2de0"),
    composition: __dialogueText("suspects/DustEvidence.js", "t_a7493e752e8c171a15ab"),

    report:
      __dialogueText("suspects/DustEvidence.js", "t_6db1e8c97766608aea8f") +
      __dialogueText("suspects/DustEvidence.js", "t_d94129e4f2e0c8de9c98"),

    hobbyIds: Object.freeze([
      'pencil_sketching',
      'graphite_portraits',
      'graphite_illustration'
    ])
  }),

  wax_particles: Object.freeze({
    label: __dialogueText("suspects/DustEvidence.js", "t_f4fec99a5a7bfb1b8a0b"),
    composition: __dialogueText("suspects/DustEvidence.js", "t_87f96817c6c161919ec6"),

    report:
      __dialogueText("suspects/DustEvidence.js", "t_3bb57e80b1641445600c") +
      __dialogueText("suspects/DustEvidence.js", "t_af433f2d80e8038b64e6"),

    hobbyIds: Object.freeze([
      'candle_making',
      'batik',
      'wax_sculpture'
    ])
  })
});

function getDefinition(profileId) {
  if (!Object.hasOwn(PROFILES, profileId)) {
    throw new Error(
      `Unsupported microtrace profile: ${profileId}`
    );
  }

  return PROFILES[profileId];
}

function pick(items, rng) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      'Cannot pick from an empty collection.'
    );
  }

  const roll = rng();

  if (
    !Number.isFinite(roll) ||
    roll < 0 ||
    roll >= 1
  ) {
    throw new Error(
      'rng must return a number in [0, 1).'
    );
  }

  return items[
    Math.floor(roll * items.length)
  ];
}

function sample(items, count, rng) {
  const pool = [...items];
  const result = [];

  while (
    result.length < count &&
    pool.length > 0
  ) {
    const item = pick(pool, rng);

    pool.splice(
      pool.indexOf(item),
      1
    );

    result.push(item);
  }

  return result;
}

function getCheckedHobbies(profile) {
  if (
    !profile ||
    profile.schemaVersion !== 1 ||
    profile.complete !== true ||
    !Array.isArray(profile.hobbyIds)
  ) {
    return null;
  }

  for (const hobbyId of profile.hobbyIds) {
    if (!Object.hasOwn(HOBBIES, hobbyId)) {
      throw new Error(
        `Unknown hobby: ${hobbyId}`
      );
    }
  }

  return [...new Set(profile.hobbyIds)];
}

function publicProfile(profileId, definition) {
  return {
    id: profileId,
    label: definition.label,
    composition: definition.composition,
    report: definition.report
  };
}

export function getDustProfiles() {
  return Object.entries(PROFILES).map(
    ([profileId, definition]) =>
      publicProfile(profileId, definition)
  );
}

export function getDustProfile(profileId) {
  return publicProfile(
    profileId,
    getDefinition(profileId)
  );
}

export function createDustEvidence(
  profileId,
  {
    stationId = 'trace_0',
    sourceConfirmed = false,
    sourceText = ''
  } = {}
) {
  const definition = getDefinition(profileId);

  if (typeof sourceConfirmed !== 'boolean') {
    throw new Error(
      'sourceConfirmed must be a boolean.'
    );
  }

  const cleanSourceText = String(
    sourceText ?? ''
  ).trim();

  if (
    sourceConfirmed &&
    !cleanSourceText
  ) {
    throw new Error(
      'Confirmed origin requires a description.'
    );
  }

  return {
    id: `trace_dust_${profileId}`,

    attribute: 'dust_profile',
    evidenceType: 'dust_profile',

    stationId,

    // Existing registered focus minigame.
    minigame: 'ToolmarkAnalysisScene',

    label: __dialogueText("suspects/DustEvidence.js", "t_8a1b0a09e53e7085462e"),

    correctValue: profileId,
    thief_value: profileId,

    clueType: 'trace',
    isRedHerring: false,
    source: 'crime_lab',

    sourceConfirmed,
    sourceText: cleanSourceText,

    clueText: [
      definition.report,
      cleanSourceText
    ]
      .filter(Boolean)
      .join(' ')
  };
}

export function createDustProfile(
  profileId,
  {
    compatible = true,
    rng = Math.random
  } = {}
) {
  const definition = getDefinition(profileId);

  if (typeof compatible !== 'boolean') {
    throw new Error(
      'compatible must be a boolean.'
    );
  }

  const allHobbyIds = Object.keys(HOBBIES);

  let hobbyIds;

  if (compatible) {
    const matchingHobby = pick(
      definition.hobbyIds,
      rng
    );

    // Every compatible profile has at least one
    // relevant hobby and two other interests.
    const remainingHobbies = allHobbyIds.filter(
      hobbyId => hobbyId !== matchingHobby
    );

    hobbyIds = [
      matchingHobby,

      ...sample(
        remainingHobbies,
        2,
        rng
      )
    ];
  } else {
    // No hobby belonging to this sample's
    // association group may appear.
    const unrelatedHobbies = allHobbyIds.filter(
      hobbyId =>
        !definition.hobbyIds.includes(hobbyId)
    );

    hobbyIds = sample(
      unrelatedHobbies,
      3,
      rng
    );
  }

  // Do not always put the relevant hobby first.
  hobbyIds = sample(
    hobbyIds,
    hobbyIds.length,
    rng
  );

  return {
    schemaVersion: 1,
    complete: true,
    hobbyIds
  };
}

export function evaluateDustEvidence(
  suspect,
  evidence
) {
  if (
    evidence?.evidenceType !== 'dust_profile'
  ) {
    throw new Error(
      'Expected dust_profile evidence.'
    );
  }

  const profileId =
    evidence.correctValue ??
    evidence.thief_value;

  const definition = getDefinition(profileId);

  if (
    evidence.sourceConfirmed !== true ||
    !String(evidence.sourceText ?? '').trim()
  ) {
    return {
      status: 'unknown',
      reasonCode: 'unconfirmed_origin'
    };
  }

  const hobbyIds = getCheckedHobbies(
    suspect?.dustProfile
  );

  if (!hobbyIds) {
    return {
      status: 'unknown',
      reasonCode: 'missing_profile'
    };
  }

  const hasAssociatedHobby = hobbyIds.some(
    hobbyId =>
      definition.hobbyIds.includes(hobbyId)
  );

  if (hasAssociatedHobby) {
    return {
      status: 'compatible',
      reasonCode: 'hobby_association'
    };
  }

  return {
    status: 'incompatible',
    reasonCode: 'no_hobby_association'
  };
}

export function getDustHobbyLabels(suspect) {
  const hobbyIds = getCheckedHobbies(
    suspect?.dustProfile
  );

  return (hobbyIds || []).map(
    hobbyId => HOBBIES[hobbyId]
  );
}

export function getDustDossierNotes(suspect) {
  const labels = getDustHobbyLabels(suspect);

  if (labels.length === 0) {
    return [];
  }

  return [
    {
      id: 'personal_hobbies',
      text: `${__dialogueText("suspects/DustEvidence.js", "t_873d76d8a2e7a535bdf1")}${labels.join(__dialogueText("suspects/DustEvidence.js", "t_0a2d3f8f9b727cf73e6c"))}${__dialogueText("suspects/DustEvidence.js", "t_cdb4ee2aea69cc6a8333")}`
    }
  ];
}