// Fictional puzzle conventions, not medical or legal conclusions.

const TRAITS = {
  vegan: [
    'Vegan. Checks clothing labels as carefully as food labels.',
    'Avoids animal products, including leather and wool.',
    'Strict vegan. Even the office biscuits undergo interrogation.',
    'Uses plant-based fabrics and synthetic leather alternatives.',
    'Vegan. Has strong opinions about suspiciously creamy soup.',
    'Refuses animal-derived clothing. Calls leather "someone else’s coat".'
  ],

  lanolin_sensitive: [
    'Lanolin sensitivity. Checks wool products before wearing them.',
    'Avoids lanolin after an unpleasant encounter with a winter jumper.',
    'Reports sensitivity to lanolin. Reads moisturiser labels religiously.',
    'Keeps lanolin-containing clothing out of the wardrobe.',
    'Lanolin sensitivity noted. The offending scarf remains unforgiven.',
    'Avoids wool products containing lanolin. Prefers less dramatic fabrics.'
  ],

  vegetarian: [
    'Vegetarian. Has negotiated a separate shelf in the office fridge.',
    'Does not eat meat. Still considers chips a complete meal.',
    'Vegetarian. Carries emergency snacks for disappointing menus.',
    'Orders the vegetarian option, then investigates everyone else’s dessert.'
  ],

  pollen_sensitive: [
    'Seasonal pollen sensitivity. Treats spring as a personal attack.',
    'Checks the pollen forecast before the weather forecast.',
    'Carries tissues. Refers to flowering trees as repeat offenders.',
    'Avoids open windows during pollen season. The view can wait.',
    'Spring walks frequently become tactical retreats from pollen.',
    'Keeps tissues in every coat. Distrusts suspiciously cheerful meadows.',
    'Seasonal pollen sensitivity. Has a complicated relationship with bouquets.',
    'Describes hay fever season as "being mugged by landscaping".',
    'Pollen sensitivity noted. Prefers flowers in paintings.',
    'Checks pollen levels before agreeing to outdoor plans.'
  ],

  caffeine_free: [
    'Avoids caffeine. Faces mornings without chemical assistance.',
    'Orders decaf and waits for the inevitable follow-up questions.',
    'Drinks herbal tea. Claims to enjoy it without supporting evidence.',
    'Caffeine-free. Still owns an unnecessarily expensive mug.'
  ],

  night_reader: [
    'Reads before bed. Bedtime is apparently a flexible concept.',
    'Keeps a book beside the bed and several beneath it.',
    'Says "one more chapter" with no intention of telling the truth.',
    'Reads late into the night. Bookmarks are mostly decorative.'
  ],

  stamp_collector: [
    'Collects stamps. Has opinions about glue.',
    'Keeps a stamp album more organised than most government archives.',
    'Collects misprinted stamps. Calls mistakes "investment opportunities".',
    'Attends stamp fairs. Describes them as surprisingly tense.',
    'Collects stamps and refuses to explain the tiny protective tongs.',
    'Can discuss postal history long after everyone has stopped asking.'
  ],

  poor_sleeper: [
    'Light sleeper. Heavy complainer.',
    'Sleeps poorly. Knows exactly when the neighbour moves a chair.',
    'Keeps a sleep diary. Most entries are complaints.',
    'Wakes at small noises. Has filed a verbal complaint against dawn.'
  ],

  birdwatcher: [
    'Watches birds. Keeps a list of sightings and unresolved grudges.',
    'Owns binoculars exclusively for birds, according to the paperwork.',
    'Goes birdwatching at dawn. The birds have not requested this.',
    'Identifies birds by their calls. Judges several of them.'
  ],

  amateur_baker: [
    'Bakes at weekends. Measures vanilla with the heart and flour with fear.',
    'Maintains a sourdough starter with its own feeding schedule.',
    'Brings homemade biscuits. Accepts praise, not recipe suggestions.',
    'Collects cake tins. Occasionally remembers to bake something.'
  ],

  crossword_fan: [
    'Does crosswords in pen. Confidence exceeds the available evidence.',
    'Keeps unfinished crosswords for "later". Later is becoming a drawer.',
    'Enjoys cryptic crosswords. Claims the clues are perfectly reasonable.',
    'Solves crosswords at breakfast. Toast frequently becomes collateral damage.'
  ],

  model_builder: [
    'Builds miniature ships. Owns more rigging than sailing experience.',
    'Makes scale models. The kitchen table is currently an airfield.',
    'Builds miniature buildings. Planning permission is self-issued.',
    'Collects model kits faster than they can be assembled.'
  ],

  chess_player: [
    'Plays chess. Calls ordinary mistakes "positional sacrifices".',
    'Attends a chess club. The biscuits are less competitive.',
    'Studies chess openings. Still occasionally loses to a phone.',
    'Carries a travel chess set in case a journey needs more tension.'
  ],

  amateur_magician: [
    'Practises card tricks. Friends now count their cards afterwards.',
    'Amateur magician. Requests that nobody inspect the sleeves.',
    'Collects magic tricks. The disappearing free time works especially well.',
    'Practises coin tricks over a tray after several expensive disappearances.'
  ],

  train_enthusiast: [
    'Photographs trains. Usually knows which platform before the staff do.',
    'Collects old railway timetables. Calls them historical thrillers.',
    'Enjoys scenic rail journeys and deeply specific locomotive facts.',
    'Visits railway museums. Reads every information panel.'
  ],

  puzzle_collector: [
    'Collects mechanical puzzles. Guests are advised not to touch the cubes.',
    'Enjoys jigsaws. Considers missing pieces a serious character test.',
    'Buys puzzle boxes. Sometimes stores the solution inside by mistake.',
    'Keeps a half-finished jigsaw on a board marked "DO NOT HELP".'
  ],

  amateur_actor: [
    'Performs in amateur theatre. Projects even when ordering lunch.',
    'Attends drama rehearsals. Has described a bus delay as "Act Two".',
    'Memorises lines for local productions. Frequently forgets shopping lists.',
    'Collects theatre programmes and stories about difficult curtains.'
  ],

  coin_collector: [
    'Collects coins. Small change receives a surprisingly thorough inspection.',
    'Keeps old coins in labelled sleeves and new coins in the sofa.',
    'Visits coin fairs. Returns with less spending money and more money.',
    'Collects commemorative coins. Insists the difference is important.'
  ],

  houseplant_keeper: [
    'Names the houseplants. Several are currently on a recovery plan.',
    'Keeps a watering calendar more reliable than the social calendar.',
    'Collects houseplants. Available windowsills are now a limiting resource.',
    'Talks to houseplants. Claims they are excellent listeners.'
  ],

  board_game_fan: [
    'Hosts board-game nights. Explaining the rules is the opening event.',
    'Collects board games. Shelf space has become a resource-management puzzle.',
    'Sleeves game cards. Trusts friends, but not their snacks.',
    'Enjoys board games. Has never accepted that "quick game" is a warning.'
  ],

  amateur_astronomer: [
    'Stargazes when the clouds permit. The clouds rarely cooperate.',
    'Owns a telescope and several complaints about street lighting.',
    'Follows meteor showers. Maintains a deeply adversarial relationship with fog.',
    'Knows the constellations. Still gets lost in unfamiliar car parks.'
  ],

  postcard_collector: [
    'Collects postcards. Prefers messages containing accidental local gossip.',
    'Sends postcards from holidays. Usually arrives home before they do.',
    'Keeps postcards sorted by place, date and quality of handwriting.',
    'Buys vintage postcards. Reads the messages before checking the pictures.'
  ],

  terrible_guitarist: [
    'Practises guitar. The neighbours know three chords against their will.',
    'Owns a guitar and an optimistic practice schedule.',
    'Learning guitar. Progress is measured in fewer complaints.',
    'Plays guitar at home. The audience consists mostly of closed doors.'
  ],

  museum_regular: [
    'Visits museums on days off. Reads the labels before looking at the objects.',
    'Collects museum tickets. The gift shops also recognise the face.',
    'Enjoys audio guides. Occasionally argues with them under the breath.',
    'Visits small museums. Considers an empty gallery a luxury experience.'
  ]
};

const RULES = {
  natural_leather: {
    label: 'Natural leather',
    material: 'leather',
    labText: 'Natural animal leather. Synthetic substitutes ruled out.',
    conflicts: ['vegan']
  },

  wool_lanolin: {
    label: 'Wool with lanolin residue',
    material: 'wool',
    labText: 'Wool fibre. Residual lanolin detected.',
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
    label: 'Material Analysis',
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