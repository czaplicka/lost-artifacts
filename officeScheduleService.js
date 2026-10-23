import { loadJson } from './config/loadJson.js';

const officeSchedule = await loadJson(
  './assets/data/officeSchedule.json',
  import.meta.url
);

function isRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function validateSchedule(data) {
  if (!isRecord(data)) {
    throw new Error(
      '[officeScheduleService] officeSchedule.json must contain an object.'
    );
  }

  if (!Array.isArray(data.npcs)) {
    throw new Error(
      '[officeScheduleService] Missing "npcs" array.'
    );
  }

  if (!Array.isArray(data.schedule)) {
    throw new Error(
      '[officeScheduleService] Missing "schedule" array.'
    );
  }

  const npcIds = new Set();

  data.npcs.forEach((npc, index) => {
    if (
      !isRecord(npc) ||
      typeof npc.npcId !== 'string' ||
      !npc.npcId.trim()
    ) {
      throw new Error(
        `[officeScheduleService] Invalid npcId at npcs[${index}].`
      );
    }

    if (npcIds.has(npc.npcId)) {
      throw new Error(
        `[officeScheduleService] Duplicate npcId: "${npc.npcId}".`
      );
    }

    if (typeof npc.defaultVisible !== 'boolean') {
      throw new Error(
        `[officeScheduleService] "${npc.npcId}" requires boolean defaultVisible.`
      );
    }

    npcIds.add(npc.npcId);
  });

  const usedCaseCounts = new Set();

  data.schedule.forEach((entry, index) => {
    if (
      !isRecord(entry) ||
      !Number.isInteger(entry.casesSolved) ||
      entry.casesSolved < 0
    ) {
      throw new Error(
        `[officeScheduleService] Invalid casesSolved at schedule[${index}].`
      );
    }

    if (usedCaseCounts.has(entry.casesSolved)) {
      throw new Error(
        `[officeScheduleService] Duplicate schedule entry for ${entry.casesSolved} solved cases.`
      );
    }

    usedCaseCounts.add(entry.casesSolved);

    if (!Array.isArray(entry.changes)) {
      throw new Error(
        `[officeScheduleService] Schedule entry ${entry.casesSolved} requires a changes array.`
      );
    }

    const changedNpcIds = new Set();

    entry.changes.forEach(change => {
      if (
        !isRecord(change) ||
        !npcIds.has(change.npcId)
      ) {
        throw new Error(
          `[officeScheduleService] Unknown NPC in schedule entry ${entry.casesSolved}: "${change?.npcId}".`
        );
      }

      if (typeof change.visible !== 'boolean') {
        throw new Error(
          `[officeScheduleService] "${change.npcId}" requires boolean visible.`
        );
      }

      if (changedNpcIds.has(change.npcId)) {
        throw new Error(
          `[officeScheduleService] Duplicate change for "${change.npcId}" at ${entry.casesSolved} solved cases.`
        );
      }

      changedNpcIds.add(change.npcId);
    });
  });
}

validateSchedule(officeSchedule);

const npcDefinitions = officeSchedule.npcs.map(npc => ({
  npcId: npc.npcId,
  name: npc.name || npc.npcId,
  role: npc.role || '',
  defaultVisible: npc.defaultVisible
}));

const scheduleEntries = officeSchedule.schedule
  .map(entry => ({
    casesSolved: entry.casesSolved,
    changes: entry.changes.map(change => ({
      npcId: change.npcId,
      visible: change.visible
    }))
  }))
  .sort(
    (a, b) => a.casesSolved - b.casesSolved
  );

function normalizeCasesSolved(casesSolved) {
  if (
    typeof casesSolved !== 'number' ||
    !Number.isFinite(casesSolved) ||
    casesSolved < 0
  ) {
    throw new Error(
      '[officeScheduleService] casesSolved must be a non-negative number.'
    );
  }

  return Math.floor(casesSolved);
}

export function getOfficeNpcStates(casesSolved = 0) {
  const solved = normalizeCasesSolved(casesSolved);

  const states = new Map(
    npcDefinitions.map(npc => [
      npc.npcId,
      {
        npcId: npc.npcId,
        name: npc.name,
        role: npc.role,
        visible: npc.defaultVisible
      }
    ])
  );

  for (const entry of scheduleEntries) {
    if (entry.casesSolved > solved) {
      break;
    }

    for (const change of entry.changes) {
      states.get(change.npcId).visible =
        change.visible;
    }
  }

  return Array.from(states.values());
}

export function getVisibleOfficeNpcs(
  casesSolved = 0
) {
  return getOfficeNpcStates(casesSolved).filter(
    npc => npc.visible
  );
}

export function getOfficeNpcState(
  npcId,
  casesSolved = 0
) {
  return getOfficeNpcStates(casesSolved).find(
    npc => npc.npcId === npcId
  ) || null;
}

export function isOfficeNpcVisible(
  npcId,
  casesSolved = 0
) {
  return (
    getOfficeNpcState(npcId, casesSolved)?.visible === true
  );
}