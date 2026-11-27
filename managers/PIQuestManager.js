import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { checkAdvertRequirements } from './PIAdvertRequirements.js';
import { registerPICase } from './PIInvestigationManager.js';
import { prepareOpenSkiesQuest } from '../systems/PIWorldWeather.js';
import { getOfficeCaseSlots, getOfficePayoutMultiplier } from './PIOfficeShopManager.js';

const clone = value => JSON.parse(JSON.stringify(value));

function getState() {
  const current = gameState.piQuests;
  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    gameState.piQuests = { version: 1, quests: {} };
  }
  const state = gameState.piQuests;
  if (!state.quests || typeof state.quests !== 'object' || Array.isArray(state.quests)) {
    state.quests = {};
  }
  return state;
}

function validId(value) {
  return typeof value === 'string' &&
    /^[a-zA-Z0-9_-]+$/.test(value) &&
    !['__proto__', 'prototype', 'constructor'].includes(value);
}

export function getPIQuest(id) {
  if (!validId(id)) return null;
  const quests = getState().quests;
  return Object.prototype.hasOwnProperty.call(quests, id) ? quests[id] : null;
}

export function getPIQuestStatus(id) {
  return getPIQuest(id)?.status || 'available';
}

export function getAcceptedPIQuests() {
  return Object.values(getState().quests);
}

export function getActivePIQuestCount() {
  return getAcceptedPIQuests().filter(quest => quest?.status === 'active').length;
}

export function acceptPIQuestFromAdvert(scene, advertId) {
  const fail = id => ({ ok: false, message: __dialogueText('managers/PIQuestManager.js', id) });

  if (!validId(advertId)) return fail('t_d7e324a026fe2825ab05');

  const classifiedData = scene.cache.json.get('piOfficeClassifieds');
  const adverts = Array.isArray(classifiedData?.advertisements) ? classifiedData.advertisements : [];
  const advert = adverts.find(a => a?.id === advertId);

  if (!advert || advert.kind !== 'pi' || !validId(advert.missionId)) return fail('t_7a8523cc3f3c54dd0934');

  const requirements = checkAdvertRequirements(advert);
  if (!requirements.ok) return { ok: false, message: requirements.message };

  const existing = getPIQuest(advert.missionId);
  if (existing) return fail(existing.status === 'completed' ? 't_4a207eadb4718fe05908' : 't_e81a898dcba96dbe2fc2');

  // Office bonuses (case slots + payout). Skipped if the shop catalog is not loaded.
  const officeCatalog = scene.cache.json.get('piOfficeShop');

  if (officeCatalog) {
    const slots = getOfficeCaseSlots(officeCatalog);
    const active = getActivePIQuestCount();

    if (active >= slots) {
      return {
        ok: false,
        message: `No free case slots (${active}/${slots}). Finish a case first.`
      };
    }
  }

  const data = scene.cache.json.get('piCases');
  const definitions = Array.isArray(data?.cases) ? data.cases : [];
  const definition = definitions.find(d => d?.id === advert.missionId);

  if (!definition || definition.kind !== 'side') {
    console.error('[PIQuestManager] Side quest definition missing:', advert.missionId);
    return fail('t_26ad42978c3c816c1461');
  }

  if (typeof definition.requiresBoard !== 'boolean' || !Array.isArray(definition.objectives) || !definition.objectives.length) {
    console.error('[PIQuestManager] Invalid quest definition:', definition.id);
    return fail('t_cb39bd071b843735ac9d');
  }

  const objectiveIds = new Set();
  for (const o of definition.objectives) {
    if (!validId(o?.id) || objectiveIds.has(o.id)) return fail('t_659af58d1929107dab6e');
    objectiveIds.add(o.id);
  }

  const baseReward = Number.isFinite(definition.reward)
    ? definition.reward
    : Number.isFinite(advert.reward) ? advert.reward : 0;

  if (!Number.isInteger(baseReward) || baseReward < 0) return fail('t_cb02c997c1c19a54af2f');

  const reward = officeCatalog
    ? Math.round(baseReward * getOfficePayoutMultiplier(officeCatalog))
    : baseReward;

  let quest = {
    id: definition.id,
    advertId: advert.id,
    title: definition.title || advert.title,
    description: definition.description || advert.description || '',
    contact: advert.contact || '',
    status: 'active',
    acceptedAt: new Date().toISOString(),
    reward,
    baseReward,
    requiresBoard: definition.requiresBoard,
    boardCaseId: definition.requiresBoard ? definition.id : null,
    objectives: definition.objectives.map(o => ({
      id: o.id,
      text: o.text || __dialogueText('managers/PIQuestManager.js', 't_1e18b18091fd76d30bc5'),
      completed: false
    })),
    metadata: clone(definition.metadata || {})
  };

  try {
    quest = prepareOpenSkiesQuest(quest);
  } catch (error) {
    console.error('[PIQuestManager] Could not prepare dated quest:', error);
    return { ok: false, message: 'Could not prepare the case timeline. The case was not accepted.' };
  }

  if (definition.requiresBoard && !registerPICase(definition)) return fail('t_7c210e174f682e3f434b');

  const state = getState();
  gameState.piQuests = { ...state, quests: { ...state.quests, [quest.id]: quest } };
  requestAutosave();

  return {
    ok: true,
    questId: quest.id,
    message: quest.requiresBoard
      ? 'Job accepted. Added to Investigations > Side Cases.'
      : __dialogueText('managers/PIQuestManager.js', 't_9007c074a4b90d41a266')
  };
}