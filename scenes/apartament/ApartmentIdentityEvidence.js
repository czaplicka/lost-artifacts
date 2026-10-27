import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

const FIELDS = ['features', 'race', 'eyes', 'hair', 'gender'];

const LABELS = {
  features: 'Features',
  race: 'Race / Skin',
  eyes: 'Eyes',
  hair: 'Hair',
  gender: 'Gender'
};

const HOST_IDS = [
  'desk',
  'bookshelf',
  'framed_photo',
  'nightstand_drawer',
  'jewelry_box'
];

const valid = value =>
  typeof value === 'string' &&
  value.trim() &&
  !['NONE', 'UNKNOWN', 'N/A', 'NOT KNOWN'].includes(
    value.trim().toUpperCase()
  );

const values = value =>
  (Array.isArray(value) ? value : [value])
    .filter(valid)
    .map(text => text.trim());

const same = (a, b) =>
  String(a).trim().toUpperCase() ===
  String(b).trim().toUpperCase();

function hash(value) {
  let number = 2166136261;

  for (const character of String(value)) {
    number ^= character.charCodeAt(0);
    number = Math.imul(number, 16777619);
  }

  return (number >>> 0).toString(36);
}

export function getApartmentIdentityContext(state, scene = null) {
  const ids = [
    state.actualCriminalId,
    state.currentThiefId,
    state.currentThief?.id
  ].filter(id => typeof id === 'string' && id);

  if (!ids.length || new Set(ids).size !== 1) return null;

  const actualId = ids[0];

  const caseIds = [
    state.trueThiefCaseSuspectId,
    state.realThiefSuspectId,
    state.caseData?.trueThiefCaseSuspectId,
    state.caseData?.realThiefSuspectId,
    state.currentThiefCaseSuspectId,
    state.currentThief?.caseSuspectId
  ].filter(Boolean);

  if (new Set(caseIds).size > 1) return null;

  const caseId = caseIds[0] || actualId;
  const mission = scene?.mission || state.currentMission || {};

  const missionId = String(
    scene?.missionId ||
    mission.id ||
    mission.missionId ||
    ''
  );

  if (!missionId) return null;

  const ownerId = scene?.suspectId || caseId;

  if (![actualId, caseId].includes(ownerId)) return null;

  const key = hash(
    JSON.stringify([
      state.currentCaseId ?? null,
      missionId,
      state.investigationStartTime ?? null,
      actualId,
      caseId
    ])
  );

  return {
    actualId,
    caseId,
    ownerId,
    missionId,
    key
  };
}

function canonicalRecord(scene, context) {
  const database = scene.cache?.json?.get('suspects');

  if (Array.isArray(database)) {
    return (
      database.find(entry => entry?.id === context.actualId) ||
      null
    );
  }

  return gameState.currentThief?.id === context.actualId
    ? gameState.currentThief
    : null;
}

const clueId = key => `apartment_identity_${key}`;

function chooseHost(scene, context) {
  const configs = scene.apartmentConfig?.objects || [];

  const hosts = HOST_IDS.filter(
    id =>
      configs.some(
        config =>
          config.id === id &&
          config.state !== 'locked'
      ) &&
      scene.getObjectProgress?.(id)?.state !== 'locked'
  );

  if (!hosts.length) return null;

  const index =
    parseInt(hash(`${context.key}:identity-host`), 36) %
    hosts.length;

  return hosts[index];
}

export function ensureApartmentIdentityItem(scene, config) {
  if (!HOST_IDS.includes(config.id)) return null;

  const context = getApartmentIdentityContext(gameState, scene);

  if (!context) return null;

  const record = canonicalRecord(scene, context);

  if (!record) return null;

  const plans = scene.getProgress().identityLeadPlans || {};
  let plan = plans[context.key];

  if (
    plan &&
    (
      !FIELDS.includes(plan.field) ||
      !values(record[plan.field]).some(value =>
        same(value, plan.value)
      )
    )
  ) {
    console.warn(
      '[ApartmentIdentityEvidence] Saved clue conflicts with the canonical record.'
    );

    return null;
  }

  if (!plan) {
    const clues = Array.isArray(gameState.cluesCollected)
      ? gameState.cluesCollected
      : [];

    const known = (field, value) =>
      clues.some(
        clue =>
          clue?.category === field &&
          same(clue.value ?? '', value) &&
          (
            !clue.missionId ||
            String(clue.missionId) === context.missionId
          )
      );

    const candidates = FIELDS.flatMap(field =>
      values(record[field]).map(value => ({
        field,
        value
      }))
    );

    const trait =
      candidates.find(
        candidate => !known(candidate.field, candidate.value)
      ) ||
      candidates[0];

    const hostId = chooseHost(scene, context);

    if (!trait || !hostId) return null;

    plan = {
      ...trait,
      hostId
    };

    scene.updateProgress({
      identityLeadPlans: {
        ...plans,
        [context.key]: plan
      }
    });
  } else if (!plan.hostId) {
    // Preserve the hiding place used by older saves.
    plan = {
      ...plan,
      hostId: 'framed_photo'
    };

    scene.updateProgress({
      identityLeadPlans: {
        ...plans,
        [context.key]: plan
      }
    });
  }

  if (plan.hostId !== config.id) return null;

  const description =
    "An envelope containing the suspect's photograph, " +
    'a forged ID proof matching the name and occupation ' +
    'in the suspect file, and a note:\n\n' +
    '"Your new ID is ready. The name and occupation are ' +
    'exactly as requested. Memorise both before using it. ' +
    'And stop signing your real name on the collection receipt."\n\n' +
    `Photo reference: ${LABELS[plan.field]} — ${plan.value}.\n\n` +
    'The receipt is missing. Nothing here reveals the real name. ' +
    'The identity in the suspect file is an alias.';

  const item = {
    id: clueId(context.key),
    type: 'document',
    label: 'ID Preparation Envelope',
    description,
    quantity: 1,

    isClue: true,
    isIdentityLead: true,
    isRedHerring: false,
    isArtifact: false,
    isEscapeClue: false,
    isEscapeFragment: false,

    identityLead: {
      version: 3,
      caseKey: context.key,
      missionId: context.missionId,
      field: plan.field,
      value: plan.value,
      hostId: plan.hostId,
      sourceLabel: config.label || 'Apartment hiding place'
    },

    metadata: {
      useMessage:
        'The suspect used a false identity. ' +
        'Their real name is still unknown. ' +
        'Use the recovered appearance detail to narrow the wanted records.'
    }
  };

  config.unlocks = [
    ...(config.unlocks || []).filter(
      entry => entry?.id !== item.id
    ),
    item
  ];

  if (config.id === 'framed_photo') {
    config.discoveryAction = 'move';
    config.actionHint =
      'A thin envelope is caught beneath the frame backing. ' +
      'Turn the frame over.';
  } else {
    config.actionHint =
      (config.actionHint ? config.actionHint + ' ' : '') +
      'There may be private papers tucked out of sight.';
  }

  return item;
}

export function getKnownApartmentIdentityClues(state = gameState) {
  const context = getApartmentIdentityContext(state);

  if (!context) return [];

  const clues = Array.isArray(state.cluesCollected)
    ? state.cluesCollected
    : [];

  return clues.filter(
    clue =>
      clue?.id === clueId(context.key) &&
      clue.source === 'suspect_apartment_identity' &&
      clue.caseKey === context.key &&
      String(clue.missionId) === context.missionId &&
      FIELDS.includes(clue.category) &&
      valid(clue.value)
  );
}

export function collectApartmentIdentityItem(scene, item) {
  const context = getApartmentIdentityContext(gameState, scene);
  const lead = item?.identityLead;

  if (
    !context ||
    !lead ||
    item.id !== clueId(context.key) ||
    lead.caseKey !== context.key ||
    String(lead.missionId) !== context.missionId ||
    !FIELDS.includes(lead.field)
  ) {
    return false;
  }

  const plan =
    scene.getProgress().identityLeadPlans?.[context.key];

  if (
    !plan ||
    plan.field !== lead.field ||
    !same(plan.value, lead.value) ||
    (
      lead.hostId &&
      lead.hostId !== (plan.hostId || 'framed_photo')
    )
  ) {
    return false;
  }

  const record = canonicalRecord(scene, context);

  if (
    !record ||
    !values(record[lead.field]).some(value =>
      same(value, lead.value)
    )
  ) {
    return false;
  }

  if (
    !scene.playerInventory.hasItem(item.id) &&
    !scene.hasItemAlready(item.id)
  ) {
    if (!scene.playerInventory.addItem(item)) {
      scene.showMessage(
        'Your inventory is full. The envelope is still in its hiding place.',
        3000,
        '#795548'
      );

      return false;
    }
  }

  const label = LABELS[lead.field];

  gameState.addClue({
    id: item.id,
    type: 'apartment_identity',
    category: lead.field,
    key: lead.field,
    value: lead.value,

    text:
      'False identity evidence: an order for forged identification ' +
      "matches the suspect's recorded name and occupation. " +
      'Their real name is still unknown. ' +
      `Photo reference — ${label}: ${lead.value}. ` +
      `Source: ${lead.sourceLabel || 'Photograph frame'}.`,

    missionId: context.missionId,
    caseKey: context.key,
    cityId: scene.cityId || null,
    source: 'suspect_apartment_identity'
  });

  scene.markItemCollected(item);
  scene.persistApartmentState();
  requestAutosave();

  scene.showMessage(
    'The suspect used a false identity. ' +
    'Their real name is still unknown.\n\n' +
    `Recorded: ${label} — ${lead.value}\n` +
    "Use this detail in the warrant's suspect filters.",
    6500,
    '#3e683d'
  );

  return true;
}

export function applyApartmentIdentityClues(ui) {
  let applied = 0;

  for (const clue of getKnownApartmentIdentityClues()) {
    const index =
      ui.traitsData[clue.category]?.findIndex(value =>
        same(value, clue.value)
      ) ?? -1;

    if (index > 0) {
      ui.currentFilters[clue.category] = index;
      applied++;
    }
  }

  return applied;
}

export function apartmentIdentitySummary(state = gameState) {
  return getKnownApartmentIdentityClues(state)
    .map(clue => `${LABELS[clue.category]}: ${clue.value}`)
    .join('; ');
}