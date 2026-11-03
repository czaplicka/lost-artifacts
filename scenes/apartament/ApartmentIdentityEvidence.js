import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { inventoryManager } from '../../managers/InventoryManager.js';

const FIELD = 'eyes';
const LABELS = { eyes: 'Eye colour' };
const HOST_IDS = ['desk', 'bookshelf', 'framed_photo', 'nightstand_drawer', 'jewelry_box'];
const valid = value => typeof value === 'string' && Boolean(value.trim()) &&
  !['NONE', 'UNKNOWN', 'N/A', 'NOT KNOWN'].includes(value.trim().toUpperCase());
const values = value => (Array.isArray(value) ? value : [value]).filter(valid).map(text => text.trim());
const same = (a, b) => String(a).trim().toUpperCase() === String(b).trim().toUpperCase();

function hash(value) {
  let number = 2166136261;
  for (const character of String(value)) {
    number ^= character.charCodeAt(0);
    number = Math.imul(number, 16777619);
  }
  return (number >>> 0).toString(36);
}

export function getApartmentIdentityContext(state, scene = null) {
  const ids = [state.actualCriminalId, state.currentThiefId, state.currentThief?.id]
    .filter(id => typeof id === 'string' && id);
  if (!ids.length || new Set(ids).size !== 1) return null;
  const actualId = ids[0];
  const caseIds = [
    state.trueThiefCaseSuspectId, state.realThiefSuspectId,
    state.caseData?.trueThiefCaseSuspectId, state.caseData?.realThiefSuspectId,
    state.currentThiefCaseSuspectId, state.currentThief?.caseSuspectId
  ].filter(Boolean);
  if (new Set(caseIds).size > 1) return null;
  const caseId = caseIds[0] || actualId;
  const mission = scene?.mission || state.currentMission || {};
  const missionId = String(scene?.missionId || mission.id || mission.missionId || '');
  if (!missionId) return null;
  const ownerId = scene?.suspectId || caseId;
  if (![actualId, caseId].includes(ownerId)) return null;
  const key = hash(JSON.stringify([
    state.currentCaseId ?? null, missionId, state.investigationStartTime ?? null, actualId, caseId
  ]));
  return { actualId, caseId, ownerId, missionId, key };
}

function canonicalRecord(scene, context) {
  const database = scene.cache?.json?.get('suspects');
  if (Array.isArray(database)) return database.find(entry => entry?.id === context.actualId) || null;
  return gameState.currentThief?.id === context.actualId ? gameState.currentThief : null;
}

const clueId = key => `apartment_identity_${key}`;

function matchesIdentityItem(item, context) {
  const lead = item?.identityLead;
  return Boolean(
    item?.isIdentityLead === true && item.id === clueId(context.key) && lead &&
    lead.caseKey === context.key && String(lead.missionId) === context.missionId &&
    lead.field === FIELD && valid(lead.value)
  );
}

function findCarriedIdentityItem(context) {
  for (const carried of inventoryManager.getAllItems()) {
    if (Number(carried?.quantity ?? 1) <= 0) continue;
    const apartment = carried?.metadata?.apartment;
    const original = apartment?.item;
    if (!apartment || String(apartment.missionId) !== context.missionId ||
        String(apartment.originalId) !== clueId(context.key)) continue;
    if (matchesIdentityItem(original, context)) return { carried, original };
  }
  return null;
}

function makeIdentityClue(item, context, cityId = null) {
  const lead = item.identityLead;
  return {
    id: item.id,
    type: 'apartment_identity',
    category: FIELD,
    key: FIELD,
    value: lead.value,
    text: 'False identity evidence: an order for forged identification ' +
      "matches the suspect's recorded name and occupation. " +
      'Their real name is still unknown. ' +
      `${LABELS[FIELD]}: ${lead.value}. ` +
      `Source: ${lead.sourceLabel || 'Apartment hiding place'}.`,
    missionId: context.missionId,
    caseKey: context.key,
    cityId,
    source: 'suspect_apartment_identity'
  };
}

function recordIdentityClue(item, context, cityId) {
  const clue = makeIdentityClue(item, context, cityId);
  const existing = Array.isArray(gameState.cluesCollected) ? gameState.cluesCollected : [];
  const matches = existing.filter(entry => entry?.id === clue.id);
  if (matches.length === 1 && JSON.stringify(matches[0]) === JSON.stringify(clue)) return true;
  const next = [];
  let inserted = false;
  for (const entry of existing) {
    if (entry?.id === clue.id) {
      if (!inserted) { next.push(clue); inserted = true; }
    } else next.push(entry);
  }
  if (!inserted) next.push(clue);
  // addClue rejects an existing ID. Replace atomically through the indexed state API instead.
  if (gameState.replaceIndexedCollection('cluesCollected', next) !== true) return false;
  requestAutosave();
  return true;
}

function chooseHost(scene, context) {
  const configs = scene.apartmentConfig?.objects || [];
  const hosts = HOST_IDS.filter(id =>
    configs.some(config => config.id === id && config.state !== 'locked') &&
    scene.getObjectProgress?.(id)?.state !== 'locked'
  );
  if (!hosts.length) return null;
  const index = parseInt(hash(`${context.key}:identity-host`), 36) % hosts.length;
  return hosts[index];
}

export function ensureApartmentIdentityItem(scene, config) {
  if (!HOST_IDS.includes(config.id)) return null;
  const context = getApartmentIdentityContext(gameState, scene);
  if (!context) return null;
  const record = canonicalRecord(scene, context);
  if (!record) return null;
  const eyeValues = values(record[FIELD]);
  if (!eyeValues.length) {
    console.warn('[ApartmentIdentityEvidence] The canonical thief record has no eye colour.', context.actualId);
    return null;
  }
  const plans = scene.getProgress().identityLeadPlans || {};
  let plan = plans[context.key];
  if (plan && plan.field !== FIELD) {
    const previousHost = HOST_IDS.includes(plan.hostId) ? plan.hostId : null;
    const hostId = previousHost || chooseHost(scene, context);
    if (!hostId) return null;
    plan = { field: FIELD, value: eyeValues[0], hostId };
    scene.updateProgress({ identityLeadPlans: { ...plans, [context.key]: plan } });
  }
  if (plan && !eyeValues.some(value => same(value, plan.value))) {
    console.warn('[ApartmentIdentityEvidence] Saved eye colour conflicts with the canonical record.');
    return null;
  }
  if (!plan) {
    const hostId = chooseHost(scene, context);
    if (!hostId) return null;
    plan = { field: FIELD, value: eyeValues[0], hostId };
    scene.updateProgress({ identityLeadPlans: { ...plans, [context.key]: plan } });
  } else if (!plan.hostId) {
    plan = { ...plan, hostId: 'framed_photo' };
    scene.updateProgress({ identityLeadPlans: { ...plans, [context.key]: plan } });
  }
  if (plan.hostId !== config.id) return null;
  const description = "An envelope containing the suspect's photograph, " +
    'a forged ID proof matching the name and occupation ' +
    'in the suspect file, and a note:\n\n' +
    '"Your new ID is ready. The name and occupation are ' +
    'exactly as requested. Memorise both before using it. ' +
    'And stop signing your real name on the collection receipt."\n\n' +
    `The ID proof records the eye colour as ${plan.value}.\n\n` +
    'The receipt is missing. Nothing here reveals the real name. ' +
    'The identity in the suspect file is an alias.';
  const item = {
    id: clueId(context.key), type: 'document', label: 'ID Preparation Envelope',
    description, quantity: 1,
    isClue: true, isIdentityLead: true, isRedHerring: false,
    isArtifact: false, isEscapeClue: false, isEscapeFragment: false,
    identityLead: {
      version: 3, caseKey: context.key, missionId: context.missionId,
      field: FIELD, value: plan.value, hostId: plan.hostId,
      sourceLabel: config.label || 'Apartment hiding place'
    },
    metadata: {
      useMessage: 'The suspect used a false identity. ' +
        'Their real name is still unknown. ' +
        'Use the recovered eye colour to narrow the wanted records.'
    }
  };
  config.unlocks = [...(config.unlocks || []).filter(entry => entry?.id !== item.id), item];
  if (config.id === 'framed_photo') {
    config.discoveryAction = 'move';
    config.actionHint = 'A thin envelope is caught beneath the frame backing. Turn the frame over.';
  } else {
    config.actionHint = (config.actionHint ? config.actionHint + ' ' : '') +
      'There may be private papers tucked out of sight.';
  }
  // Repair existing saves only from an actually carried, matching current-case document.
  const carried = findCarriedIdentityItem(context);
  if (carried && same(carried.original.identityLead.value, plan.value)) {
    if (!recordIdentityClue(carried.original, context, scene.cityId || null)) {
      console.warn('[ApartmentIdentityEvidence] Could not repair the notebook entry.');
    }
  }
  return item;
}

export function getKnownApartmentIdentityClues(state = gameState) {
  const context = getApartmentIdentityContext(state);
  if (!context) return [];
  const clues = Array.isArray(state.cluesCollected) ? state.cluesCollected : [];
  const recorded = clues.filter(clue =>
    clue?.id === clueId(context.key) && clue.source === 'suspect_apartment_identity' &&
    clue.caseKey === context.key && String(clue.missionId) === context.missionId &&
    clue.category === FIELD && valid(clue.value)
  );
  if (recorded.length) return recorded;
  // Inventory uses namespaced apt_* IDs; the original document is stored in its metadata.
  // A missing/stale notebook entry must not make a carried envelope available to TAKE again.
  const carried = findCarriedIdentityItem(context);
  if (!carried) return [];
  return [makeIdentityClue(carried.original, context, state.crimeCityId || state.currentCityId || null)];
}

export function collectApartmentIdentityItem(scene, item) {
  const context = getApartmentIdentityContext(gameState, scene);
  const lead = item?.identityLead;
  if (!context || !matchesIdentityItem(item, context)) return false;
  const plan = scene.getProgress().identityLeadPlans?.[context.key];
  if (!plan || plan.field !== FIELD || !same(plan.value, lead.value) ||
      (lead.hostId && lead.hostId !== (plan.hostId || 'framed_photo'))) return false;
  const record = canonicalRecord(scene, context);
  if (!record || !values(record[FIELD]).some(value => same(value, lead.value))) return false;
  if (!scene.playerInventory.hasItem(item.id) && !scene.hasItemAlready(item.id)) {
    if (!scene.playerInventory.addItem(item)) {
      scene.showMessage('Your inventory is full. The envelope is still in its hiding place.', 3000, '#795548');
      return false;
    }
  }
  const recorded = recordIdentityClue(item, context, scene.cityId || null);
  scene.markItemCollected(item);
  scene.persistApartmentState();
  requestAutosave();
  if (!recorded) {
    console.warn('[ApartmentIdentityEvidence] Envelope collected; notebook update failed.');
    scene.showMessage('Envelope added to your inventory. The notebook could not be updated. ' +
      'Keep the envelope; its recorded detail remains available.', 6500, '#795548');
    return true;
  }
  scene.showMessage(
    'The suspect used a false identity. Their real name is still unknown.\n\n' +
    `Recorded: ${LABELS[FIELD]} — ${lead.value}\n` +
    "Use this detail in the warrant's suspect filters.",
    6500, '#3e683d'
  );
  return true;
}

export function applyApartmentIdentityClues(ui) {
  let applied = 0;
  for (const clue of getKnownApartmentIdentityClues()) {
    const index = ui.traitsData[FIELD]?.findIndex(value => same(value, clue.value)) ?? -1;
    if (index > 0) { ui.currentFilters[FIELD] = index; applied++; }
  }
  return applied;
}

export function apartmentIdentitySummary(state = gameState) {
  return getKnownApartmentIdentityClues(state).map(clue => `${LABELS[FIELD]}: ${clue.value}`).join('; ');
}