import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { inventoryManager } from '../../managers/InventoryManager.js';
import { prepareApartmentEvidenceAudio, playApartmentEvidenceAudio } from './ApartmentEvidenceAudio.js';

const FIELD = 'eyes';
const LABELS = { eyes: __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_f24248e0b8d7f74c4f41") };
const HOST_IDS = ['desk', 'bookshelf', 'framed_photo', 'nightstand_drawer', 'jewelry_box'];
const valid = value => typeof value === 'string' && Boolean(value.trim()) &&
  !['NONE', 'UNKNOWN', 'N/A', __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_0b30531b53399a61493f")].includes(value.trim().toUpperCase());
const values = value => (Array.isArray(value) ? value : [value]).filter(valid).map(text => text.trim());
const same = (a, b) => String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
function hash(value) {
  let number = 2166136261;
  for (const character of String(value)) { number ^= character.charCodeAt(0); number = Math.imul(number, 16777619); }
  return (number >>> 0).toString(36);
}
export function getApartmentIdentityContext(state, scene = null) {
  const ids = [state.actualCriminalId, state.currentThiefId, state.currentThief?.id].filter(id => typeof id === 'string' && id);
  if (!ids.length || new Set(ids).size !== 1) return null;
  const actualId = ids[0];
  const caseIds = [state.trueThiefCaseSuspectId, state.realThiefSuspectId,
    state.caseData?.trueThiefCaseSuspectId, state.caseData?.realThiefSuspectId,
    state.currentThiefCaseSuspectId, state.currentThief?.caseSuspectId].filter(Boolean);
  if (new Set(caseIds).size > 1) return null;
  const caseId = caseIds[0] || actualId, mission = scene?.mission || state.currentMission || {};
  const missionId = String(scene?.missionId || mission.id || mission.missionId || '');
  if (!missionId) return null;
  const ownerId = scene?.suspectId || caseId;
  if (![actualId, caseId].includes(ownerId)) return null;
  const key = hash(JSON.stringify([state.currentCaseId ?? null, missionId, state.investigationStartTime ?? null, actualId, caseId]));
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
  return Boolean(item?.isIdentityLead === true && item.id === clueId(context.key) && lead &&
    lead.caseKey === context.key && String(lead.missionId) === context.missionId && lead.field === FIELD && valid(lead.value));
}
function findCarriedIdentityItem(context) {
  for (const carried of inventoryManager.getAllItems()) {
    if (Number(carried?.quantity ?? 1) <= 0) continue;
    const apartment = carried?.metadata?.apartment, original = apartment?.item;
    if (!apartment || String(apartment.missionId) !== context.missionId || String(apartment.originalId) !== clueId(context.key)) continue;
    if (matchesIdentityItem(original, context)) return { carried, original };
  }
  return null;
}
function makeIdentityClue(item, context, cityId = null) {
  const lead = item.identityLead;
  return {
    id: item.id, type: 'apartment_identity', category: FIELD, key: FIELD, value: lead.value,
    text: __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_b40a2e84ef852e23273a") +
      __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_ea8c395eefa093da333c") + __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_c139078899613b123dad") +
      `${LABELS[FIELD]}${__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_45822f54a0d0e030f756")}${lead.value}${__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_8dccf256f6d5783e62bb")}` + `${__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_1a5ac0bd0b6b5765b313")}${lead.sourceLabel || __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_e8813d8b2a9cb72563cc")}${__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_cdb4ee2aea69cc6a8333")}`,
    missionId: context.missionId, caseKey: context.key, cityId, source: 'suspect_apartment_identity'
  };
}
function recordIdentityClue(item, context, cityId) {
  const clue = makeIdentityClue(item, context, cityId);
  const existing = Array.isArray(gameState.cluesCollected) ? gameState.cluesCollected : [];
  const matches = existing.filter(entry => entry?.id === clue.id);
  if (matches.length === 1 && JSON.stringify(matches[0]) === JSON.stringify(clue)) return true;
  const next = []; let inserted = false;
  for (const entry of existing) {
    if (entry?.id === clue.id) { if (!inserted) { next.push(clue); inserted = true; } }
    else next.push(entry);
  }
  if (!inserted) next.push(clue);
  // Replace through the indexed API: addClue rejects existing IDs.
  if (gameState.replaceIndexedCollection('cluesCollected', next) !== true) return false;
  requestAutosave(); return true;
}
function chooseHost(scene, context) {
  const configs = scene.apartmentConfig?.objects || [];
  const hosts = HOST_IDS.filter(id => configs.some(config => config.id === id && config.state !== 'locked') &&
    scene.getObjectProgress?.(id)?.state !== 'locked');
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
  if (!eyeValues.length) { console.warn('[ApartmentIdentityEvidence] The canonical thief record has no eye colour.', context.actualId); return null; }
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
    console.warn('[ApartmentIdentityEvidence] Saved eye colour conflicts with the canonical record.'); return null;
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
  prepareApartmentEvidenceAudio(scene);
  const description = __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_1cdf0ec4a009c5a12c94") +
    __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_7f9f2341544fc0f69f0e") + __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_09c0a7d77315ad6eaff7") +
    __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_10bee1771c811131205d") + __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_1d957d2566fbe30e4604") +
    __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_8658291cef5b3744461b") +
    `${__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_771686f285496038109c")}${plan.value}${__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_0673d69ff78439adfb40")}` +
    __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_22a2cafd661f3b374b10") + __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_22c8c1d9d465e513d32b");
  const item = {
    id: clueId(context.key), type: 'document', label: __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_3b236d2dc31ca33b2d59"), description, quantity: 1,
    isClue: true, isIdentityLead: true, isRedHerring: false, isArtifact: false, isEscapeClue: false, isEscapeFragment: false,
    identityLead: { version: 3, caseKey: context.key, missionId: context.missionId, field: FIELD, value: plan.value,
      hostId: plan.hostId, sourceLabel: config.label || __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_e8813d8b2a9cb72563cc") },
    metadata: { useMessage: __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_153635b0d4210636d49c") + __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_c139078899613b123dad") +
      __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_213b5334315c1aa15b8c") }
  };
  config.unlocks = [...(config.unlocks || []).filter(entry => entry?.id !== item.id), item];
  if (config.id === 'framed_photo') {
    config.discoveryAction = 'move';
    config.actionHint = __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_f552d5c716ee170b6671");
  } else {
    config.actionHint = (config.actionHint ? config.actionHint + ' ' : '') + __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_0385226a640c40bf9628");
  }
  // Repair only from a carried document that matches this case.
  const carried = findCarriedIdentityItem(context);
  if (carried && same(carried.original.identityLead.value, plan.value)) {
    if (!recordIdentityClue(carried.original, context, scene.cityId || null)) console.warn('[ApartmentIdentityEvidence] Could not repair the notebook entry.');
  }
  return item;
}
export function getKnownApartmentIdentityClues(state = gameState) {
  const context = getApartmentIdentityContext(state);
  if (!context) return [];
  const clues = Array.isArray(state.cluesCollected) ? state.cluesCollected : [];
  const recorded = clues.filter(clue => clue?.id === clueId(context.key) && clue.source === 'suspect_apartment_identity' &&
    clue.caseKey === context.key && String(clue.missionId) === context.missionId && clue.category === FIELD && valid(clue.value));
  if (recorded.length) return recorded;
  const carried = findCarriedIdentityItem(context);
  if (!carried) return [];
  return [makeIdentityClue(carried.original, context, state.crimeCityId || state.currentCityId || null)];
}
export function collectApartmentIdentityItem(scene, item) {
  const context = getApartmentIdentityContext(gameState, scene), lead = item?.identityLead;
  if (!context || !matchesIdentityItem(item, context)) return false;
  const plan = scene.getProgress().identityLeadPlans?.[context.key];
  if (!plan || plan.field !== FIELD || !same(plan.value, lead.value) || (lead.hostId && lead.hostId !== (plan.hostId || 'framed_photo'))) return false;
  const record = canonicalRecord(scene, context);
  if (!record || !values(record[FIELD]).some(value => same(value, lead.value))) return false;
  if (!scene.playerInventory.hasItem(item.id) && !scene.hasItemAlready(item.id)) {
    if (!scene.playerInventory.addItem(item)) {
      scene.showMessage(__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_028a067ccef8666c0094"), 3000, __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_0fa2e0046576e38dd099")); return false;
    }
    playApartmentEvidenceAudio(scene);
  }
  const recorded = recordIdentityClue(item, context, scene.cityId || null);
  scene.markItemCollected(item); scene.persistApartmentState(); requestAutosave();
  if (!recorded) {
    console.warn('[ApartmentIdentityEvidence] Envelope collected; notebook update failed.');
    scene.showMessage(__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_f552f0bccb92653046f1") +
      __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_9a49d1b9edbd7b02e63a"), 6500, __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_0fa2e0046576e38dd099")); return true;
  }
  scene.showMessage(__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_7d84df840e2f68bc3514") +
    `${__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_b5a01795ed70c0b26195")}${LABELS[FIELD]}${__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_3b2e8119b6fcc97df985")}${lead.value}${__dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_01ba4719c80b6fe911b0")}` + __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_28abc6227b4e9b7435d0"), 6500, __dialogueText("scenes/apartament/ApartmentIdentityEvidence.js", "t_8050ca049b2e4bda19f0"));
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
