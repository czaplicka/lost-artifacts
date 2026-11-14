import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// managers/PIQuestManager.js

import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { checkAdvertRequirements } from './PIAdvertRequirements.js';

import {
  registerPICase
} from './PIInvestigationManager.js';

const clone = value => JSON.parse(JSON.stringify(value));

function getState() {
  const current = gameState.piQuests;

  if (
    !current ||
    typeof current !== 'object' ||
    Array.isArray(current)
  ) {
    gameState.piQuests = {
      version: 1,
      quests: {}
    };
  }

  const state = gameState.piQuests;

  if (
    !state.quests ||
    typeof state.quests !== 'object' ||
    Array.isArray(state.quests)
  ) {
    state.quests = {};
  }

  return state;
}

function validId(value) {
  return (
    typeof value === 'string' &&
    /^[a-zA-Z0-9_-]+$/.test(value) &&
    !['__proto__', 'prototype', 'constructor'].includes(value)
  );
}

export function getPIQuest(questId) {
  if (!validId(questId)) return null;

  const quests = getState().quests;

  return Object.prototype.hasOwnProperty.call(
    quests,
    questId
  )
    ? quests[questId]
    : null;
}

export function getPIQuestStatus(questId) {
  return getPIQuest(questId)?.status || 'available';
}

export function getAcceptedPIQuests() {
  return Object.values(getState().quests);
}

export function acceptPIQuestFromAdvert(scene, advertId) {
  if (!validId(advertId)) {
    return {
      ok: false,
      message: __dialogueText("managers/PIQuestManager.js", "t_d7e324a026fe2825ab05")
    };
  }

  const classifiedData =
    scene.cache.json.get('piOfficeClassifieds');

  const adverts = Array.isArray(
    classifiedData?.advertisements
  )
    ? classifiedData.advertisements
    : [];

  const advert = adverts.find(
    entry => entry?.id === advertId
  );

  if (
    !advert ||
    advert.kind !== 'pi' ||
    !validId(advert.missionId)
  ) {
    return {
      ok: false,
      message: __dialogueText("managers/PIQuestManager.js", "t_7a8523cc3f3c54dd0934")
    };
  }

  const requirements = checkAdvertRequirements(advert);

  if (!requirements.ok) {
    return {
      ok: false,
      message: requirements.message
    };
  }

  const existing = getPIQuest(advert.missionId);

  if (existing) {
    return {
      ok: false,
      message:
        existing.status === __dialogueText("managers/PIQuestManager.js", "t_4ddb3e96801a1ee2b77d")
          ? __dialogueText("managers/PIQuestManager.js", "t_4a207eadb4718fe05908")
          : __dialogueText("managers/PIQuestManager.js", "t_e81a898dcba96dbe2fc2")
    };
  }

  const caseData = scene.cache.json.get('piCases');

  const definitions = Array.isArray(caseData?.cases)
    ? caseData.cases
    : [];

  const definition = definitions.find(
    entry => entry?.id === advert.missionId
  );

  if (!definition || definition.kind !== 'side') {
    console.error(
      '[PIQuestManager] Side quest definition missing:',
      advert.missionId
    );

    return {
      ok: false,
      message: __dialogueText("managers/PIQuestManager.js", "t_26ad42978c3c816c1461")
    };
  }

  if (
    typeof definition.requiresBoard !== 'boolean' ||
    !Array.isArray(definition.objectives) ||
    definition.objectives.length === 0
  ) {
    console.error(
      '[PIQuestManager] Invalid quest definition:',
      definition.id
    );

    return {
      ok: false,
      message: __dialogueText("managers/PIQuestManager.js", "t_cb39bd071b843735ac9d")
    };
  }

  const objectiveIds = new Set();

  for (const objective of definition.objectives) {
    if (
      !validId(objective?.id) ||
      objectiveIds.has(objective.id)
    ) {
      return {
        ok: false,
        message: __dialogueText("managers/PIQuestManager.js", "t_659af58d1929107dab6e")
      };
    }

    objectiveIds.add(objective.id);
  }

  const reward = Number.isFinite(definition.reward)
    ? definition.reward
    : Number.isFinite(advert.reward)
      ? advert.reward
      : 0;

  if (!Number.isInteger(reward) || reward < 0) {
    return {
      ok: false,
      message: __dialogueText("managers/PIQuestManager.js", "t_cb02c997c1c19a54af2f")
    };
  }

  const quest = {
    id: definition.id,
    advertId: advert.id,
    title: definition.title || advert.title,
    description:
      definition.description || advert.description || '',
    contact: advert.contact || '',
    status: 'active',
    acceptedAt: new Date().toISOString(),

    reward,
    requiresBoard: definition.requiresBoard,
    boardCaseId: definition.requiresBoard
      ? definition.id
      : null,

    objectives: definition.objectives.map(objective => ({
      id: objective.id,
      text: objective.text || __dialogueText("managers/PIQuestManager.js", "t_1e18b18091fd76d30bc5"),
      completed: false
    })),

    metadata: clone(definition.metadata || {})
  };

  if (definition.requiresBoard) {
    const investigation = registerPICase(definition);

    if (!investigation) {
      return {
        ok: false,
        message: __dialogueText("managers/PIQuestManager.js", "t_7c210e174f682e3f434b")
      };
    }
  }

  const state = getState();

  gameState.piQuests = {
    ...state,
    quests: {
      ...state.quests,
      [quest.id]: quest
    }
  };

  requestAutosave();

  return {
    ok: true,
    questId: quest.id,
    message: quest.requiresBoard
      ? __dialogueText("managers/PIQuestManager.js", "t_17ffe08dc2566e0f45c1")
      : __dialogueText("managers/PIQuestManager.js", "t_9007c074a4b90d41a266")
  };
}