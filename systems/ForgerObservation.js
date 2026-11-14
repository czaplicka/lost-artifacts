import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
  { name: __dialogueText("systems/ForgerObservation.js", "t_aa6b460725247c6c3b01"), occupation: __dialogueText("systems/ForgerObservation.js", "t_21effa367432d6ba497e") },
  { name: __dialogueText("systems/ForgerObservation.js", "t_4ce92ce0b8b57ca2feeb"), occupation: __dialogueText("systems/ForgerObservation.js", "t_d2d65046960a509926fa") },
  { name: __dialogueText("systems/ForgerObservation.js", "t_1eb590c1770d4d4ef22c"), occupation: __dialogueText("systems/ForgerObservation.js", "t_89a605f28f9fbe510b25") },
  { name: __dialogueText("systems/ForgerObservation.js", "t_272d9d5a869fabbd53fe"), occupation: __dialogueText("systems/ForgerObservation.js", "t_2c535670e9fc9d6bddaa") },
  { name: __dialogueText("systems/ForgerObservation.js", "t_66c16c0a015e20284d06"), occupation: __dialogueText("systems/ForgerObservation.js", "t_cc48a4735a10711c7768") },
  { name: __dialogueText("systems/ForgerObservation.js", "t_199bd15290454f11a719"), occupation: __dialogueText("systems/ForgerObservation.js", "t_4ac7ac83c5fef5f4bbfe") }
];

const FOLDERS = [
  { id: 'umbrella', label: __dialogueText("systems/ForgerObservation.js", "t_16db7eb5bb8412708db1"), color: 0xa94c43 },
  { id: 'fish', label: __dialogueText("systems/ForgerObservation.js", "t_76bf7e0b22a6952a042f"), color: 0x477ba5 },
  { id: 'moon', label: __dialogueText("systems/ForgerObservation.js", "t_556328d89c2ea9bf58ac"), color: 0xb89b43 }
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
    return { available: false, reason: __dialogueText("systems/ForgerObservation.js", "t_87b8ac7f7610e6dd69f5") };
  }

  const pursuit = getPursuitCityContext(gameState, city);

  if (!pursuit.isCorrectCity || pursuit.isCrimeCity) {
    return {
      available: false,
      reason: __dialogueText("systems/ForgerObservation.js", "t_14d005a8f8aeb0f8d082")
    };
  }

  const record = getForgerRecord();

  if (
    !record &&
    getKnownApartmentIdentityClues(gameState).length === 0
  ) {
    return {
      available: false,
      reason: __dialogueText("systems/ForgerObservation.js", "t_203599e5ee17f3290473")
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
      message: __dialogueText("systems/ForgerObservation.js", "t_bd0d90c2931912856cd7")
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
    `${__dialogueText("systems/ForgerObservation.js", "t_648122d28f46b349997b")}${cost}`,
    {
      requireFullAmount: true,
      activityType: 'forger_observation'
    }
  );

  if (!result.success) {
    return {
      success: false,
      message: result.message || __dialogueText("systems/ForgerObservation.js", "t_31e93a5d690460510219")
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
        `${__dialogueText("systems/ForgerObservation.js", "t_8bd33a06256344c7555f")}${client.label}${__dialogueText("systems/ForgerObservation.js", "t_97c1a9e359fb6a2c2dd7")}` +
        __dialogueText("systems/ForgerObservation.js", "t_b8f1de7c76937348f1f8"),
      detail: matches
        ? `${__dialogueText("systems/ForgerObservation.js", "t_d337d826db7e34d63bd9")}${client.order}${__dialogueText("systems/ForgerObservation.js", "t_3b2e8119b6fcc97df985")}${client.label}${__dialogueText("systems/ForgerObservation.js", "t_eb4bd64f7014f7d42e9d")}` +
          __dialogueText("systems/ForgerObservation.js", "t_ec56b78e996161ba0c55") +
          __dialogueText("systems/ForgerObservation.js", "t_9aae0c6b7fc7e7f7e6e3") +
          __dialogueText("systems/ForgerObservation.js", "t_ee90203946a8ce558d48")
        : `${__dialogueText("systems/ForgerObservation.js", "t_d337d826db7e34d63bd9")}${client.order}${__dialogueText("systems/ForgerObservation.js", "t_3b2e8119b6fcc97df985")}${client.label}${__dialogueText("systems/ForgerObservation.js", "t_eb4bd64f7014f7d42e9d")}` +
          __dialogueText("systems/ForgerObservation.js", "t_2047f24958a9d92605ae") +
          __dialogueText("systems/ForgerObservation.js", "t_5e8be4d3630ce2a75554")
    };
  }

  return {
    id: `${client.id}:phone`,
    hotspot: 'phone',
    clientId: client.id,
    caption:
      `${__dialogueText("systems/ForgerObservation.js", "t_c6fc9faf31847dfc17ce")}${client.label}${__dialogueText("systems/ForgerObservation.js", "t_97c1a9e359fb6a2c2dd7")}` +
      __dialogueText("systems/ForgerObservation.js", "t_5b1325648dbb11fe4c0c"),
    detail:
      `${__dialogueText("systems/ForgerObservation.js", "t_328b3a2f23cc77762efc")}${client.name}${__dialogueText("systems/ForgerObservation.js", "t_895dc6d07ddab1fd420d")}` +
      `${__dialogueText("systems/ForgerObservation.js", "t_12876f7c0660420d3257")}${client.occupation.toLowerCase()}${__dialogueText("systems/ForgerObservation.js", "t_0673d69ff78439adfb40")}` +
      __dialogueText("systems/ForgerObservation.js", "t_36c3f70f485e641a824d") +
      __dialogueText("systems/ForgerObservation.js", "t_e02fcca19bc07d972ffa")
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
          ).label}${__dialogueText("systems/ForgerObservation.js", "t_01ba4719c80b6fe911b0")}${beat.detail}`
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
        `${__dialogueText("systems/ForgerObservation.js", "t_2e2616e2e2d16e1aeddc")}${selected.name}${__dialogueText("systems/ForgerObservation.js", "t_8dccf256f6d5783e62bb")}` +
        `${__dialogueText("systems/ForgerObservation.js", "t_e9cc97d8283ed7929e9f")}${selected.occupation}${__dialogueText("systems/ForgerObservation.js", "t_8dccf256f6d5783e62bb")}` +
        __dialogueText("systems/ForgerObservation.js", "t_5836e1f5d79a55971ec5"),
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