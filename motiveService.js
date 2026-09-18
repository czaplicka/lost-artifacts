// motiveService.js
import motivesData from './assets/data/motives.json' with { type: 'json' };
import npcMotiveClues from './assets/data/npcMotiveClues.json' with { type: 'json' };

// Jedyna funkcja losująca tutaj, żeby gameSetup nie znał struktury pliku.
export function drawMotive(rng = Math.random) {
  const pool = motivesData.motives;
  const total = pool.reduce((sum, m) => sum + (m.weight || 1), 0);
  let roll = rng() * total;
  for (const m of pool) {
    roll -= (m.weight || 1);
    if (roll <= 0) return m;
  }
  return pool[pool.length - 1];
}

export function getMotiveById(motiveId) {
  return motivesData.motives.find((m) => m.id === motiveId) || null;
}

// Bieżący etap = pierwszy, którego evidenceId NIE ma w motiveStagesDone.
export function getCurrentStage(motiveId, motiveStagesDone = []) {
  const motive = getMotiveById(motiveId);
  if (!motive) return null;
  return (
    motive.escapeInvestigation.clueStages.find(
      (stage) => !motiveStagesDone.includes(stage.evidenceId)
    ) || null
  );
}

// Czy wylosowany encounter (npcId z encounterPool) jest świadkiem bieżącego etapu.
export function getWitnessClue(motiveId, npcId, motiveStagesDone = []) {
  const stage = getCurrentStage(motiveId, motiveStagesDone);
  if (!stage) return null;
  const witness = stage.npcWitnesses.find((w) => w.npcId === npcId);
  if (!witness) return null;
  return { stage, clueKey: witness.clueKey };
}

// Tekst kwestii NPC dla danego tropu.
export function getClueText(motiveId, npcId, clueKey) {
  return (
    npcMotiveClues.clipsByNpc?.[npcId]?.[motiveId]?.[clueKey] ?? null
  );
}

// Finałowa weryfikacja Crime Board.
export function isCorrectMotiveAnswer(motiveId, playerAnswerId) {
  const motive = getMotiveById(motiveId);
  return motive?.crimeBoard.answerId === playerAnswerId;
}