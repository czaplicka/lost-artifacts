// motiveService.js

import { loadJson } from './config/loadJson.js';

const [
  motivesData,
  npcMotiveClues
] = await Promise.all([
  loadJson(
    './assets/data/motives.json',
    import.meta.url
  ),
  loadJson(
    './assets/data/npcMotiveClues.json',
    import.meta.url
  )
]);

export function drawMotive(rng = Math.random) {
  const pool = motivesData.motives;

  const total = pool.reduce(
    (sum, motive) => sum + (motive.weight || 1),
    0
  );

  let roll = rng() * total;

  for (const motive of pool) {
    roll -= motive.weight || 1;

    if (roll <= 0) {
      return motive;
    }
  }

  return pool[pool.length - 1];
}

export function getMotiveById(motiveId) {
  return motivesData.motives.find(
    motive => motive.id === motiveId
  ) || null;
}

export function getCurrentStage(
  motiveId,
  motiveStagesDone = []
) {
  const motive = getMotiveById(motiveId);

  if (!motive) {
    return null;
  }

  return motive.escapeInvestigation.clueStages.find(
    stage => !motiveStagesDone.includes(stage.evidenceId)
  ) || null;
}

export function getWitnessClue(
  motiveId,
  npcId,
  motiveStagesDone = []
) {
  const stage = getCurrentStage(
    motiveId,
    motiveStagesDone
  );

  if (!stage) {
    return null;
  }

  const witness = stage.npcWitnesses.find(
    item => item.npcId === npcId
  );

  if (!witness) {
    return null;
  }

  return {
    stage,
    clueKey: witness.clueKey
  };
}

export function getClueText(
  motiveId,
  npcId,
  clueKey
) {
  return (
    npcMotiveClues
      .clipsByNpc?.[npcId]?.[motiveId]?.[clueKey]
      ?? null
  );
}

export function isCorrectMotiveAnswer(
  motiveId,
  playerAnswerId
) {
  const motive = getMotiveById(motiveId);

  return motive?.crimeBoard.answerId === playerAnswerId;
}