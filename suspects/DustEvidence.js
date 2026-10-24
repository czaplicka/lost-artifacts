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
  bouldering: 'Bouldering',
  gymnastics: 'Gymnastics',
  weightlifting: 'Weightlifting',

  // Artist acrylic paint
  painting: 'Acrylic painting',
  miniature_painting: 'Painting miniatures',
  stage_scenery: 'Making stage scenery',

  // Ceramic clay
  pottery: 'Pottery',
  ceramic_sculpture: 'Ceramic sculpture',
  ceramic_jewellery: 'Making ceramic jewellery',

  // Wood dust
  model_shipbuilding: 'Building wooden model ships',
  woodcarving: 'Woodcarving',
  furniture_restoration: 'Restoring old furniture',

  // Graphite dust
  pencil_sketching: 'Pencil sketching',
  graphite_portraits: 'Drawing graphite portraits',
  graphite_illustration: 'Making graphite illustrations',

  // Wax particles
  candle_making: 'Making candles',
  batik: 'Batik textile art',
  wax_sculpture: 'Wax sculpture',

  // Unrelated interests
  running: 'Distance running',
  chess: 'Chess',
  birdwatching: 'Birdwatching',
  photography: 'Photography',
  crosswords: 'Crosswords',
  astronomy: 'Amateur astronomy',
  origami: 'Origami',
  stamp_collecting: 'Stamp collecting'
});

const PROFILES = Object.freeze({
  sports_chalk: Object.freeze({
    label: 'Sports chalk',
    composition: 'MAGNESIUM CARBONATE',

    report:
      'Magnesium carbonate. Consistent with sports chalk.',

    hobbyIds: Object.freeze([
      'bouldering',
      'gymnastics',
      'weightlifting'
    ])
  }),

  acrylic_paint: Object.freeze({
    label: 'Artist acrylic paint',
    composition: 'ACRYLIC BINDER / ARTIST PIGMENT',

    report:
      'Dried acrylic binder and pigment particles. ' +
      'Consistent with artist acrylic paint.',

    hobbyIds: Object.freeze([
      'painting',
      'miniature_painting',
      'stage_scenery'
    ])
  }),

  ceramic_clay: Object.freeze({
    label: 'Ceramic clay',
    composition: 'CERAMIC CLAY MINERALS',

    report:
      'Fine ceramic clay residue. ' +
      'Not ordinary museum dust.',

    hobbyIds: Object.freeze([
      'pottery',
      'ceramic_sculpture',
      'ceramic_jewellery'
    ])
  }),

  wood_dust: Object.freeze({
    label: 'Wood dust',
    composition: 'FINE WOOD PARTICLES',

    report:
      'Fine wood particles with freshly abraded surfaces. ' +
      'The sample differs from the surrounding museum dust.',

    hobbyIds: Object.freeze([
      'model_shipbuilding',
      'woodcarving',
      'furniture_restoration'
    ])
  }),

  graphite_dust: Object.freeze({
    label: 'Graphite dust',
    composition: 'GRAPHITE / PENCIL RESIDUE',

    report:
      'Fine graphite particles with pencil residue. ' +
      'Not soot. The machine checked twice.',

    hobbyIds: Object.freeze([
      'pencil_sketching',
      'graphite_portraits',
      'graphite_illustration'
    ])
  }),

  wax_particles: Object.freeze({
    label: 'Wax particles',
    composition: 'WAX FLAKES / PIGMENT TRACES',

    report:
      'Small wax flakes containing pigment traces. ' +
      'The sample differs from the museum floor polish.',

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

    label: 'Microtrace Analysis',

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
      text: `Hobbies: ${labels.join('; ')}.`
    }
  ];
}