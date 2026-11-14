import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// Fictional puzzle conventions, not medical or legal conclusions.

const TRAITS = {
  vegan: [
    __dialogueText("suspects/MaterialEvidence.js", "t_687f8fb36fc59599525b"),
    __dialogueText("suspects/MaterialEvidence.js", "t_4c1b31441e044ba62235"),
    __dialogueText("suspects/MaterialEvidence.js", "t_85872eff221bdb4b0ef9"),
    __dialogueText("suspects/MaterialEvidence.js", "t_c8083cf911c83a3af2b1"),
    __dialogueText("suspects/MaterialEvidence.js", "t_b5b91af7716052ddef85"),
    __dialogueText("suspects/MaterialEvidence.js", "t_87f535ed5e5f0d5ef97a")
  ],

  lanolin_sensitive: [
    __dialogueText("suspects/MaterialEvidence.js", "t_557ed56b3b702c474e93"),
    __dialogueText("suspects/MaterialEvidence.js", "t_ede0ae2d109759fd2307"),
    __dialogueText("suspects/MaterialEvidence.js", "t_b3643a1ed0a2a188183e"),
    __dialogueText("suspects/MaterialEvidence.js", "t_2a3b2954b37153388843"),
    __dialogueText("suspects/MaterialEvidence.js", "t_8f5f40df35fe19cdfdae"),
    __dialogueText("suspects/MaterialEvidence.js", "t_314cf7fb207f74827d98")
  ],

  vegetarian: [
    __dialogueText("suspects/MaterialEvidence.js", "t_f66fef563aed681f035d"),
    __dialogueText("suspects/MaterialEvidence.js", "t_2fc014236ec39fa8da57"),
    __dialogueText("suspects/MaterialEvidence.js", "t_30d9e144d61c62a54fee"),
    __dialogueText("suspects/MaterialEvidence.js", "t_6d8b87366c24baa42147")
  ],

  pollen_sensitive: [
    __dialogueText("suspects/MaterialEvidence.js", "t_f5d31e035f291dc61f02"),
    __dialogueText("suspects/MaterialEvidence.js", "t_b82d00cbf27d82030ee9"),
    __dialogueText("suspects/MaterialEvidence.js", "t_e7036ae9c9a355751fcb"),
    __dialogueText("suspects/MaterialEvidence.js", "t_a234f04f9f24de5bcc3a"),
    __dialogueText("suspects/MaterialEvidence.js", "t_c033a58f8f1db1adca90"),
    __dialogueText("suspects/MaterialEvidence.js", "t_d27b1795f850b32de7e9"),
    __dialogueText("suspects/MaterialEvidence.js", "t_1afba8809c25865d9ba7"),
    __dialogueText("suspects/MaterialEvidence.js", "t_f97e22c369fd6893598c"),
    __dialogueText("suspects/MaterialEvidence.js", "t_aeef5cef9f11d8f82168"),
    __dialogueText("suspects/MaterialEvidence.js", "t_ae9326b6ab0c6ebde518")
  ],

  caffeine_free: [
    __dialogueText("suspects/MaterialEvidence.js", "t_3fbb0ffed357e3d9fc4f"),
    __dialogueText("suspects/MaterialEvidence.js", "t_45d6480b46af604d20ec"),
    __dialogueText("suspects/MaterialEvidence.js", "t_8b396dc7c700e93ccd09"),
    __dialogueText("suspects/MaterialEvidence.js", "t_ad6a64e28ac23b7ff920")
  ],

  night_reader: [
    __dialogueText("suspects/MaterialEvidence.js", "t_24cd120103f4b138e7dd"),
    __dialogueText("suspects/MaterialEvidence.js", "t_e0414f1cf77471bb19d6"),
    __dialogueText("suspects/MaterialEvidence.js", "t_f85d3e3db626db784c15"),
    __dialogueText("suspects/MaterialEvidence.js", "t_aad499694d59543dfb4c")
  ],

  stamp_collector: [
    __dialogueText("suspects/MaterialEvidence.js", "t_30477e9cb90a6fa93b98"),
    __dialogueText("suspects/MaterialEvidence.js", "t_bf2cd185c865c5754802"),
    __dialogueText("suspects/MaterialEvidence.js", "t_24fd0c4f7bbe01d835e3"),
    __dialogueText("suspects/MaterialEvidence.js", "t_b7e0a16cdcbcdad2f65f"),
    __dialogueText("suspects/MaterialEvidence.js", "t_4d711e9f2016e50dfbcb"),
    __dialogueText("suspects/MaterialEvidence.js", "t_fe8849a8bcfa5f02e1e6")
  ],

  poor_sleeper: [
    __dialogueText("suspects/MaterialEvidence.js", "t_9241f4ef42013624b1c6"),
    __dialogueText("suspects/MaterialEvidence.js", "t_b2fa33ef54a3a024d043"),
    __dialogueText("suspects/MaterialEvidence.js", "t_0b301023cd783f600cd7"),
    __dialogueText("suspects/MaterialEvidence.js", "t_823f1aa82eb249a4ab17")
  ],

  birdwatcher: [
    __dialogueText("suspects/MaterialEvidence.js", "t_ae82c8832dbf908ab21b"),
    __dialogueText("suspects/MaterialEvidence.js", "t_cadc0e967c453a927f23"),
    __dialogueText("suspects/MaterialEvidence.js", "t_ad1c838bc650730863dd"),
    __dialogueText("suspects/MaterialEvidence.js", "t_986b278b690e3fbb5a52")
  ],

  amateur_baker: [
    __dialogueText("suspects/MaterialEvidence.js", "t_7337fe5d6931f8107618"),
    __dialogueText("suspects/MaterialEvidence.js", "t_0866a636eb08bfecf2c6"),
    __dialogueText("suspects/MaterialEvidence.js", "t_5f7e02790cc61dc554fb"),
    __dialogueText("suspects/MaterialEvidence.js", "t_39ae81bf8109e67ddf4f")
  ],

  crossword_fan: [
    __dialogueText("suspects/MaterialEvidence.js", "t_d926bf49535fa42ab990"),
    __dialogueText("suspects/MaterialEvidence.js", "t_bb2234f849e04a1623f2"),
    __dialogueText("suspects/MaterialEvidence.js", "t_09c23d6775718fed3774"),
    __dialogueText("suspects/MaterialEvidence.js", "t_47c0439a08d8a1027a15")
  ],

  model_builder: [
    __dialogueText("suspects/MaterialEvidence.js", "t_8c1b263c3d8aa87f8723"),
    __dialogueText("suspects/MaterialEvidence.js", "t_7548ca3c4c31e37471f4"),
    __dialogueText("suspects/MaterialEvidence.js", "t_85944be2f02f58b0efcc"),
    __dialogueText("suspects/MaterialEvidence.js", "t_f9eb83002d1ffc327d78")
  ],

  chess_player: [
    __dialogueText("suspects/MaterialEvidence.js", "t_1fd9fd526032a1ea3b2f"),
    __dialogueText("suspects/MaterialEvidence.js", "t_b653c5b05fe39dc419f9"),
    __dialogueText("suspects/MaterialEvidence.js", "t_4e3b1a5cfa72995b800a"),
    __dialogueText("suspects/MaterialEvidence.js", "t_2f744fc98e185451aece")
  ],

  amateur_magician: [
    __dialogueText("suspects/MaterialEvidence.js", "t_0d04857a64c253e2f8e0"),
    __dialogueText("suspects/MaterialEvidence.js", "t_a9d39a45cf61adb685c1"),
    __dialogueText("suspects/MaterialEvidence.js", "t_a33c98fc1de1fb6dcad7"),
    __dialogueText("suspects/MaterialEvidence.js", "t_684c0781d8506ca3a448")
  ],

  train_enthusiast: [
    __dialogueText("suspects/MaterialEvidence.js", "t_a188953d5a8937159565"),
    __dialogueText("suspects/MaterialEvidence.js", "t_19014c0e7a87ce6aa365"),
    __dialogueText("suspects/MaterialEvidence.js", "t_96435607e83f2fa1eb55"),
    __dialogueText("suspects/MaterialEvidence.js", "t_8d01bb7852bc14c9d08e")
  ],

  puzzle_collector: [
    __dialogueText("suspects/MaterialEvidence.js", "t_0c0fe00e3b0dd8a51767"),
    __dialogueText("suspects/MaterialEvidence.js", "t_10fd848eb8836e5f5a86"),
    __dialogueText("suspects/MaterialEvidence.js", "t_f60b0660f6318c901466"),
    __dialogueText("suspects/MaterialEvidence.js", "t_8bd705cccc37b457e234")
  ],

  amateur_actor: [
    __dialogueText("suspects/MaterialEvidence.js", "t_55533c0606d3f6706c5a"),
    __dialogueText("suspects/MaterialEvidence.js", "t_1d841cb8a29a3dff59bc"),
    __dialogueText("suspects/MaterialEvidence.js", "t_bc4b1b3d1e7a2b565b06"),
    __dialogueText("suspects/MaterialEvidence.js", "t_ccc00e77affe2e23b106")
  ],

  coin_collector: [
    __dialogueText("suspects/MaterialEvidence.js", "t_528300eb4a6dc2fd2fec"),
    __dialogueText("suspects/MaterialEvidence.js", "t_f6c847a67481209922bb"),
    __dialogueText("suspects/MaterialEvidence.js", "t_bcbdf5ff610700c2c6c9"),
    __dialogueText("suspects/MaterialEvidence.js", "t_a84093c318cf7a25b219")
  ],

  houseplant_keeper: [
    __dialogueText("suspects/MaterialEvidence.js", "t_84aec738a001d10bff2e"),
    __dialogueText("suspects/MaterialEvidence.js", "t_967f5a059d2233cb9e1b"),
    __dialogueText("suspects/MaterialEvidence.js", "t_bb98627944c35a9d17bf"),
    __dialogueText("suspects/MaterialEvidence.js", "t_4a931c3e60ec0aa77649")
  ],

  board_game_fan: [
    __dialogueText("suspects/MaterialEvidence.js", "t_6478266cda6bd966f358"),
    __dialogueText("suspects/MaterialEvidence.js", "t_eadb03a1d84c4feef200"),
    __dialogueText("suspects/MaterialEvidence.js", "t_1e58916fec29469206f9"),
    __dialogueText("suspects/MaterialEvidence.js", "t_6592ad1cddec0fd3ab3a")
  ],

  amateur_astronomer: [
    __dialogueText("suspects/MaterialEvidence.js", "t_f926e2c8455cbdc0cebb"),
    __dialogueText("suspects/MaterialEvidence.js", "t_750cb268845348e335dd"),
    __dialogueText("suspects/MaterialEvidence.js", "t_62aafc9da0084db83124"),
    __dialogueText("suspects/MaterialEvidence.js", "t_51d5771af37b575a7f00")
  ],

  postcard_collector: [
    __dialogueText("suspects/MaterialEvidence.js", "t_1e93cc5d3a7344854385"),
    __dialogueText("suspects/MaterialEvidence.js", "t_dfa255a0aef986392253"),
    __dialogueText("suspects/MaterialEvidence.js", "t_fcafafa2f678e8a8a0c6"),
    __dialogueText("suspects/MaterialEvidence.js", "t_dce1cc5a74d76355b910")
  ],

  terrible_guitarist: [
    __dialogueText("suspects/MaterialEvidence.js", "t_89efb919ebd3c01f2dda"),
    __dialogueText("suspects/MaterialEvidence.js", "t_f86103ed23ff68c9ada5"),
    __dialogueText("suspects/MaterialEvidence.js", "t_09660037feb7d5ac1b45"),
    __dialogueText("suspects/MaterialEvidence.js", "t_600f7f577dafbf7762c8")
  ],

  museum_regular: [
    __dialogueText("suspects/MaterialEvidence.js", "t_6a3cf47b9ecfc41d9b97"),
    __dialogueText("suspects/MaterialEvidence.js", "t_329616f84024ad8d57f5"),
    __dialogueText("suspects/MaterialEvidence.js", "t_4bf7279ce4d2d0d20437"),
    __dialogueText("suspects/MaterialEvidence.js", "t_0da3ab161cb53dfe4f07")
  ]
};

const RULES = {
  natural_leather: {
    label: __dialogueText("suspects/MaterialEvidence.js", "t_323378972550d36e7ce5"),
    material: 'leather',
    labText: __dialogueText("suspects/MaterialEvidence.js", "t_2b908915ff796eb35737"),
    conflicts: ['vegan']
  },

  wool_lanolin: {
    label: __dialogueText("suspects/MaterialEvidence.js", "t_0badebd14509ea295dff"),
    material: 'wool',
    labText: __dialogueText("suspects/MaterialEvidence.js", "t_99b0cb1baa11c391dc8e"),
    conflicts: ['vegan', 'lanolin_sensitive']
  }
};

const NEUTRAL = Object.keys(TRAITS).filter(
  id => id !== 'vegan' && id !== 'lanolin_sensitive'
);

function rule(id) {
  if (!Object.hasOwn(RULES, id)) {
    throw new Error(`Unsupported material profile: ${id}`);
  }

  return RULES[id];
}

function draw(items, rng) {
  if (!items.length) {
    throw new Error('Cannot draw from an empty collection.');
  }

  const roll = rng();

  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error('rng must return a number in [0, 1).');
  }

  return items[Math.floor(roll * items.length)];
}

function sample(items, count, rng) {
  const pool = [...items];
  const result = [];

  while (result.length < count && pool.length) {
    const item = draw(pool, rng);

    pool.splice(pool.indexOf(item), 1);
    result.push(item);
  }

  return result;
}

function traits(profile) {
  if (
    !profile ||
    profile.schemaVersion !== 1 ||
    profile.complete !== true ||
    !Array.isArray(profile.traitIds)
  ) {
    return null;
  }

  for (const id of profile.traitIds) {
    if (!Object.hasOwn(TRAITS, id)) {
      throw new Error(`Unknown dossier trait: ${id}`);
    }
  }

  return [...new Set(profile.traitIds)];
}

function hash(value) {
  const text = String(value);
  let result = 2166136261;

  for (let index = 0; index < text.length; index++) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

function fallbackText(suspect, traitId) {
  const options = TRAITS[traitId];
  const identity = suspect?.id ?? suspect?.name ?? 'unknown';

  return options[hash(`${identity}:${traitId}`) % options.length];
}

function getSavedText(suspect, traitId) {
  const saved = suspect?.materialProfile?.noteTexts?.[traitId];

  return typeof saved === 'string' && saved.trim()
    ? saved
    : fallbackText(suspect, traitId);
}

function assignDossierTexts(suspects, rng) {
  const usedByTrait = new Map();

  // Reserve existing texts before assigning new ones.
  for (const suspect of suspects) {
    const ids = traits(suspect.materialProfile) || [];

    for (const traitId of ids) {
      const saved = suspect.materialProfile?.noteTexts?.[traitId];

      if (typeof saved !== 'string' || !saved.trim()) continue;

      if (!usedByTrait.has(traitId)) {
        usedByTrait.set(traitId, new Set());
      }

      usedByTrait.get(traitId).add(saved);
    }
  }

  for (const suspect of suspects) {
    const ids = traits(suspect.materialProfile) || [];

    suspect.materialProfile.noteTexts ??= {};

    for (const traitId of ids) {
      const saved = suspect.materialProfile.noteTexts[traitId];

      if (typeof saved === 'string' && saved.trim()) continue;

      if (!usedByTrait.has(traitId)) {
        usedByTrait.set(traitId, new Set());
      }

      const used = usedByTrait.get(traitId);
      const available = TRAITS[traitId].filter(text => !used.has(text));

      const text = draw(
        available.length ? available : TRAITS[traitId],
        rng
      );

      suspect.materialProfile.noteTexts[traitId] = text;
      used.add(text);
    }
  }
}

export function getMaterialProfiles() {
  return Object.entries(RULES).map(
    ([id, { label, material, labText }]) => ({
      id,
      label,
      material,
      labText
    })
  );
}

export function createMaterialEvidence(
  profileId,
  {
    stationId = 'trace_1',
    sourceConfirmed = false,
    sourceText = '',
    id = `trace_${profileId}`
  } = {}
) {
  const r = rule(profileId);

  if (typeof sourceConfirmed !== 'boolean') {
    throw new Error('sourceConfirmed must be boolean.');
  }

  if (sourceConfirmed && !String(sourceText).trim()) {
    throw new Error('Confirmed origin needs a description.');
  }

  return {
    id,
    stationId,
    attribute: 'material_profile',
    evidenceType: 'material_profile',
    minigame: 'MaterialAnalysisScene',
    label: __dialogueText("suspects/MaterialEvidence.js", "t_c7514017c0fce9a099d3"),
    correctValue: profileId,
    thief_value: profileId,
    clueType: 'trace',
    clueText: r.labText,
    isRedHerring: false,
    sourceConfirmed,
    sourceText: String(sourceText).trim()
  };
}

export function evaluateMaterialEvidence(suspect, evidence) {
  if (evidence?.evidenceType !== 'material_profile') {
    throw new Error('Expected material_profile evidence.');
  }

  const r = rule(evidence.correctValue ?? evidence.thief_value);

  if (
    evidence.sourceConfirmed !== true ||
    !evidence.sourceText?.trim()
  ) {
    return {
      status: 'unknown',
      reasonCode: 'unconfirmed_origin'
    };
  }

  const ids = traits(suspect?.materialProfile);

  if (!ids) {
    return {
      status: 'unknown',
      reasonCode: 'missing_profile'
    };
  }

  const conflict = ids.find(id => r.conflicts.includes(id));

  return conflict
    ? {
        status: 'incompatible',
        reasonCode: 'material_conflict',
        traitId: conflict
      }
    : {
        status: 'compatible',
        reasonCode: 'no_material_conflict'
      };
}

export function getMaterialDossierNotes(suspect) {
  return (traits(suspect?.materialProfile) || []).map(id => ({
    id: `personal_${id}`,
    text: getSavedText(suspect, id)
  }));
}

export function createMaterialProfile(
  profileId,
  {
    compatible = true,
    rng = Math.random
  } = {}
) {
  const r = rule(profileId);

  if (typeof compatible !== 'boolean') {
    throw new Error('compatible must be boolean.');
  }

  return {
    schemaVersion: 1,
    complete: true,
    traitIds: compatible
      ? sample(
          Object.keys(TRAITS).filter(
            id => !r.conflicts.includes(id)
          ),
          3,
          rng
        )
      : [
          draw(r.conflicts, rng),
          ...sample(NEUTRAL, 2, rng)
        ]
  };
}

export function prepareMaterialSuspects(
  suspects,
  evidence,
  {
    excludedIds,
    protectedIds,
    rng = Math.random
  } = {}
) {
  if (
    !Array.isArray(suspects) ||
    !suspects.length ||
    !Array.isArray(excludedIds) ||
    !Array.isArray(protectedIds)
  ) {
    throw new Error('Explicit suspects and plan required.');
  }

  const ids = suspects.map(suspect => suspect.id);
  const excluded = new Set(excludedIds);
  const protectedSet = new Set(protectedIds);

  if (
    ids.some(id => typeof id !== 'string' || !id) ||
    new Set(ids).size !== ids.length
  ) {
    throw new Error('Unique IDs required.');
  }

  if (!excluded.size || protectedSet.size !== 2) {
    throw new Error('Exclude at least one; protect exactly two.');
  }

  for (const id of [...excluded, ...protectedSet]) {
    if (!ids.includes(id)) {
      throw new Error(`Unknown ID: ${id}`);
    }
  }

  for (const id of excluded) {
    if (protectedSet.has(id)) {
      throw new Error('Protected candidate cannot be excluded.');
    }
  }

  for (const suspect of suspects) {
    if (
      (
        suspect.isRealThief ||
        suspect.hiddenCaseData?.isForensicTwin
      ) &&
      !protectedSet.has(suspect.id)
    ) {
      throw new Error('Thief and twin must be protected.');
    }
  }

  if (
    evidence?.evidenceType !== 'material_profile' ||
    evidence.sourceConfirmed !== true ||
    !evidence.sourceText?.trim()
  ) {
    throw new Error('Confirmed material origin required.');
  }

  const result = structuredClone(suspects);

  for (const suspect of result) {
    const desired = excluded.has(suspect.id)
      ? 'incompatible'
      : 'compatible';

    if (suspect.materialProfile != null) {
      if (
        !traits(suspect.materialProfile) ||
        evaluateMaterialEvidence(suspect, evidence).status !== desired
      ) {
        throw new Error(`Existing traits conflict: ${suspect.id}`);
      }
    } else {
      suspect.materialProfile = createMaterialProfile(
        evidence.correctValue ?? evidence.thief_value,
        {
          compatible: desired === 'compatible',
          rng
        }
      );
    }
  }

  assignDossierTexts(result, rng);

  return result;
}

export function validateMaterialStage(
  suspects,
  evidence,
  {
    previousSurvivorIds,
    expectedSurvivors = 2,
    protectedIds
  } = {}
) {
  if (
    !Array.isArray(previousSurvivorIds) ||
    !Array.isArray(protectedIds)
  ) {
    throw new Error('Explicit survivor plan required.');
  }

  const known = new Set(suspects.map(suspect => suspect.id));
  const previous = new Set(previousSurvivorIds);

  for (const id of previous) {
    if (!known.has(id)) {
      throw new Error(`Unknown previous survivor: ${id}`);
    }
  }

  const survivors = suspects
    .filter(suspect => previous.has(suspect.id))
    .filter(suspect => {
      const result = evaluateMaterialEvidence(suspect, evidence);

      if (result.status === 'unknown') {
        throw new Error(`Incomplete profile: ${suspect.id}`);
      }

      return result.status === 'compatible';
    })
    .map(suspect => suspect.id);

  if (
    survivors.length !== expectedSurvivors ||
    protectedIds.some(id => !survivors.includes(id))
  ) {
    throw new Error('Invalid material survivor plan.');
  }

  return survivors;
}