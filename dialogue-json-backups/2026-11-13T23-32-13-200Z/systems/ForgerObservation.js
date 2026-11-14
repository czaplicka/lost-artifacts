import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { getGameTimeManager } from '../managers/GameTimeManager.js';
import {
  normalizePursuitCityId,
  getPursuitCityContext
} from '../managers/PursuitCityContext.js';
import {
  getKnownApartmentIdentityClues
} from '../scenes/apartament/ApartmentIdentityEvidence.js';

export const FORGER_CONFIG = Object.freeze({
  observationMinutes: 30,
  normalInterviewMinutes: 60,
  discountedInterviewMinutes: 45,
  interviewMultiplier: 0.7
});

const IDENTITIES = [
  { name: 'Robin Hale', occupation: 'Travel photographer' },
  { name: 'Morgan Vale', occupation: 'Art consultant' },
  { name: 'Alex Finch', occupation: 'Insurance inspector' },
  { name: 'Jamie Bell', occupation: 'Antique dealer' },
  { name: 'Taylor Reed', occupation: 'Museum researcher' },
  { name: 'Casey Brooks', occupation: 'Exhibition designer' }
];

const FOLDERS = [
  { id: 'umbrella', label: 'RED UMBRELLA', color: 0xa94c43 },
  { id: 'fish', label: 'BLUE FISH', color: 0x477ba5 },
  { id: 'moon', label: 'GOLD MOON', color: 0xb89b43 }
];

function hash(value) {
  let result = 2166136261;

  for (const character of String(value)) {
    result = Math.imul(
      result ^ character.charCodeAt(0),
      16777619
    );
  }

  return result >>> 0;
}

function caseContext() {
  const mission = gameState.currentMission;
  const caseId = gameState.currentCaseId;
  const thiefId = gameState.currentThiefId;
  const route = gameState.escapeRoute;

  if (
    !mission ||
    caseId == null ||
    thiefId == null ||
    !Array.isArray(route) ||
    route.length < 2
  ) {
    return null;
  }

  const cityId = normalizePursuitCityId(route[0]);

  if (!cityId) return null;

  return {
    caseId: String(caseId),
    thiefId: String(thiefId),
    cityId
  };
}

function activeCase() {
  return Boolean(
    gameState.isGameActive &&
    !gameState.caseFailed &&
    !gameState.caseResolved
  );
}

function validRecord(record, context) {
  return Boolean(
    record &&
    record.version === 1 &&
    record.caseId === context.caseId &&
    record.thiefId === context.thiefId &&
    record.cityId === context.cityId &&
    Array.isArray(record.clients) &&
    record.clients.length === 3 &&
    record.clients.every(client =>
      typeof client?.id === 'string' &&
      typeof client?.name === 'string' &&
      typeof client?.occupation === 'string' &&
      typeof client?.label === 'string'
    ) &&
    record.clients.some(client => client.id === record.targetId) &&
    Array.isArray(record.notes) &&
    Number.isInteger(record.cursor) &&
    record.cursor >= 0 &&
    record.cursor <= 6 &&
    ['ready', 'watching', 'review', 'submitted'].includes(record.phase)
  );
}

export function getForgerRecord() {
  const context = caseContext();

  if (!context) return null;

  const record = gameState.caseData?.forgerObservation;

  return validRecord(record, context) ? record : null;
}

function store(record) {
  gameState.caseData = {
    ...(gameState.caseData || {}),
    forgerObservation: record
  };

  return saveGameState();
}

function createRecord(context) {
  const seed = hash(
    `${context.caseId}:${context.thiefId}:forger`
  );

  const existingNames = new Set([
    gameState.currentThief?.name,
    ...(gameState.caseSuspects || []).map(entry => entry?.name)
  ].filter(Boolean).map(name => name.toLowerCase()));

  const available = IDENTITIES.filter(identity =>
    !existingNames.has(identity.name.toLowerCase())
  );

  if (available.length < 3) {
    throw new Error('Not enough unused forged identities.');
  }

  const start = seed % available.length;

  const clients = FOLDERS.map((folder, index) => ({
    ...folder,
    ...available[(start + index) % available.length],
    order: 420 + ((seed >>> 4) % 50) + index
  }));

  const offset = (seed >>> 8) % clients.length;
  const orderedClients = [
    ...clients.slice(offset),
    ...clients.slice(0, offset)
  ];

  return {
    version: 1,
    ...context,
    clients: orderedClients,
    targetId: clients[(seed >>> 12) % clients.length].id,
    phase: 'ready',
    cursor: 0,
    roundsPaid: 0,
    notes: [],
    selectedId: null,
    submitted: false
  };
}

export function getForgerAccess(cityId) {
  const context = caseContext();
  const city = normalizePursuitCityId(cityId);

  if (!context || !activeCase() || city !== context.cityId) {
    return { available: false, reason: 'Not available here.' };
  }

  const pursuit = getPursuitCityContext(gameState, city);

  if (!pursuit.isCorrectCity || pursuit.isCrimeCity) {
    return {
      available: false,
      reason: 'Establish the verified route first.'
    };
  }

  const record = getForgerRecord();

  if (
    !record &&
    getKnownApartmentIdentityClues(gameState).length === 0
  ) {
    return {
      available: false,
      reason: 'Find the ID preparation envelope first.'
    };
  }

  return {
    available: true,
    completed: record?.submitted === true,
    record
  };
}

export function ensureForgerRecord(cityId) {
  const access = getForgerAccess(cityId);

  if (!access.available) {
    throw new Error(access.reason);
  }

  const existing = getForgerRecord();

  if (existing) return existing;

  const context = caseContext();
  const record = createRecord(context);

  store(record);

  return record;
}

export function getObservationEnergyCost() {
  return getEnergyManager().getInterviewCost('short');
}

export function startObservationRound(cityId) {
  const access = getForgerAccess(cityId);

  if (!access.available) {
    return { success: false, message: access.reason };
  }

  const record = ensureForgerRecord(cityId);

  if (record.submitted) {
    return {
      success: false,
      message: 'An alias has already been recorded for this case.'
    };
  }

  if (record.phase === 'watching') {
    return { success: true, resumed: true };
  }

  const energy = getEnergyManager();
  const cost = getObservationEnergyCost();

  if (!energy.canAfford(cost).ok) {
    return {
      success: false,
      message: energy.getInsufficientEnergyMessage(cost)
    };
  }

  const result = energy.consumeCustom(
    cost,
    `Forger observation: -${cost}`,
    {
      requireFullAmount: true,
      activityType: 'forger_observation'
    }
  );

  if (!result.success) {
    return {
      success: false,
      message: result.message || 'Rest before observing the workshop.'
    };
  }

  const next = {
    ...record,
    phase: 'watching',
    cursor: 0,
    roundsPaid: record.roundsPaid + 1
  };

  store(next);

  gameState.timeSpent =
    (Number(gameState.timeSpent) || 0) +
    FORGER_CONFIG.observationMinutes / 60;

  getGameTimeManager().handleAdvanceTime(
    0,
    FORGER_CONFIG.observationMinutes
  );

  saveGameState();

  return {
    success: true,
    interrupted: Boolean(
      !activeCase() ||
      energy.isForcedSleepActive() ||
      energy.isManualSleepActive()
    )
  };
}

export function getObservationBeat(record = getForgerRecord()) {
  if (!record || record.phase !== 'watching') return null;

  const client = record.clients[Math.floor(record.cursor / 2)];

  if (!client) return null;

  const isPhoto = record.cursor % 2 === 0;

  if (isPhoto) {
    const matches = client.id === record.targetId;

    return {
      id: `${client.id}:photo`,
      hotspot: 'desk',
      clientId: client.id,
      caption:
        `The forger opens the ${client.label} folder ` +
        'and checks a photograph on the desk.',
      detail: matches
        ? `Order ${client.order} — ${client.label}.\n` +
          'The photograph matches the person pictured in your ' +
          'ID preparation envelope.\n\n' +
          '"A new identity. Still the same terrible photograph."'
        : `Order ${client.order} — ${client.label}.\n` +
          'The photograph shows a different customer.\n\n' +
          '"No, a passport photograph cannot include your horse."'
    };
  }

  return {
    id: `${client.id}:phone`,
    hotspot: 'phone',
    clientId: client.id,
    caption:
      `The telephone rings. The ${client.label} folder ` +
      'is still open.',
    detail:
      `"Yes, ${client.name}. Your documents list your occupation ` +
      `as ${client.occupation.toLowerCase()}.\n\n` +
      'Yes, you need to remember both.\n' +
      'No, the passport does not come with actual qualifications."'
  };
}

export function inspectObservationBeat(cityId, hotspot) {
  if (!getForgerAccess(cityId).available) return null;

  const record = getForgerRecord();
  const beat = getObservationBeat(record);

  if (!record || !beat || beat.hotspot !== hotspot) return null;

  if (!record.notes.some(note => note.id === beat.id)) {
    store({
      ...record,
      notes: [
        ...record.notes,
        {
          id: beat.id,
          text: `${record.clients.find(
            client => client.id === beat.clientId
          ).label}\n${beat.detail}`
        }
      ]
    });
  }

  return beat.detail;
}

export function nextObservationBeat(cityId) {
  if (!getForgerAccess(cityId).available) return false;

  const record = getForgerRecord();

  if (!record || record.phase !== 'watching') return false;

  const cursor = Math.min(6, record.cursor + 1);

  store({
    ...record,
    cursor,
    phase: cursor >= 6 ? 'review' : 'watching'
  });

  return true;
}

export function submitForgerIdentity(cityId, selectedId) {
  if (!getForgerAccess(cityId).available) return false;

  const record = getForgerRecord();

  if (
    !record ||
    record.submitted ||
    record.phase !== 'review'
  ) {
    return false;
  }

  const selected = record.clients.find(
    client => client.id === selectedId
  );

  if (!selected) return false;

  store({
    ...record,
    selectedId,
    submitted: true,
    phase: 'submitted'
  });

  const noteId = `forger_alias_${record.caseId}`;

  if (!gameState.cluesCollected?.some(note => note.id === noteId)) {
    gameState.addClue({
      id: noteId,
      type: 'forger_observation',
      category: 'working_alias',
      key: 'working_alias',
      value: selected.name,
      text:
        `Working travel identity: ${selected.name}. ` +
        `Occupation: ${selected.occupation}. ` +
        'Linked by your observation of the document workshop.',
      caseId: gameState.currentCaseId,
      cityId: record.cityId,
      source: 'forger_observation'
    });
  }

  saveGameState();

  return true;
}

export function getForgerInterviewQuote({
  cityId,
  taxi,
  interview
}) {
  const record = getForgerRecord();
  const city = normalizePursuitCityId(cityId);

  const bonusActive = Boolean(
    activeCase() &&
    city &&
    city !== 'hq' &&
    city !== normalizePursuitCityId(gameState.crimeCityId) &&
    record?.submitted &&
    record.selectedId === record.targetId
  );

  const normalInterview = Math.max(0, Math.ceil(interview));
  const taxiCost = Math.max(0, Math.ceil(taxi));

  const finalInterview = bonusActive
    ? Math.ceil(
        normalInterview * FORGER_CONFIG.interviewMultiplier
      )
    : normalInterview;

  const selected = record?.clients.find(
    client => client.id === record.selectedId
  );

  return {
    taxi: taxiCost,
    normalInterview,
    interview: finalInterview,
    total: taxiCost + finalInterview,
    minutes: bonusActive
      ? FORGER_CONFIG.discountedInterviewMinutes
      : FORGER_CONFIG.normalInterviewMinutes,
    bonusActive,
    alias: bonusActive ? selected.name : null
  };
}