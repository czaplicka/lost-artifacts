// managers/PIQuestManager.js

import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

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
      message: 'This advertisement is invalid.'
    };
  }

  // Resolve the actual advertisement from loaded JSON.
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
      message: 'This advertisement does not offer a PI job.'
    };
  }

  const existing = getPIQuest(advert.missionId);

  if (existing) {
    return {
      ok: false,
      message:
        existing.status === 'completed'
          ? 'You have already completed this job.'
          : 'This job has already been accepted.'
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
      message: 'This job is not available yet.'
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
      message: 'This job has incomplete case data.'
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
        message: 'This job has invalid objectives.'
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
      message: 'This job has an invalid reward.'
    };
  }

  // Prepare serializable quest data before changing game state.
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
      text: objective.text || 'Investigate this lead.',
      completed: false
    })),

    metadata: clone(definition.metadata || {})
  };

  // Only quests requiring a board appear in Side Cases.
  if (definition.requiresBoard) {
    const investigation = registerPICase(definition);

    if (!investigation) {
      return {
        ok: false,
        message: 'The investigation board could not be created.'
      };
    }
  }

  // Assign through the game state proxy to mark the state dirty.
  const state = getState();

  gameState.piQuests = {
    ...state,
    quests: {
      ...state.quests,
      [quest.id]: quest
    }
  };

  requestAutosave();

  console.log('[PIQuestManager] Job accepted:', quest.id);

  return {
    ok: true,
    questId: quest.id,
    message: quest.requiresBoard
      ? 'Job accepted. Added to Investigations > Side Cases.'
      : 'Job accepted.'
  };
}