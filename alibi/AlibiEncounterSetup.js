import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// AlibiEncounterSetup.js
import { gameState } from '../GameData.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { saveGameState, requestAutosave } from '../gameStatePersistence.js';
import { generateAlibiWitnesses, ALIBI_DATA_VERSION } from './AlibiWitnessData.js';

const GENERIC_NPC_KEYS = ['npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'];
const WITNESSES_PER_SUSPECT = 3;
const PORTRAIT_REVISION = 1;
export const NO_ALIBI_LIAR = '__no_liar__';

function clone(value) { return structuredClone(value); }
function findSuspect(suspectId) {
  return getCaseSuspects(gameState).find(suspect => suspect?.id === suspectId) || null;
}
function getAlibiSubjects(caseKey) {
  const state = gameState.suspectExclusionState?.[caseKey];
  if (state?.finished !== true) return null;
  const manualIds = new Set(Array.isArray(state.manualExclusionIds) ? state.manualExclusionIds : []);
  return getCaseSuspects(gameState).filter(suspect => suspect?.id &&
    suspect.deductionState?.eliminated !== true && !manualIds.has(suspect.id));
}
function toAlibiSubject(suspect) {
  const isThief = suspect.hiddenCaseData?.isTrueThief === true;
  return { ...suspect, hiddenCaseData: {
    ...(suspect.hiddenCaseData || {}), isTrueThief: isThief, isForensicTwin: !isThief
  } };
}
function getCrimeWindow() {
  const crimeWindow = gameState.caseData?.crimeWindow;
  if (!crimeWindow || !Number.isInteger(crimeWindow.day) ||
    !Number.isInteger(crimeWindow.startMinute) || !Number.isInteger(crimeWindow.endMinute) ||
    crimeWindow.startMinute < 30 || crimeWindow.endMinute <= crimeWindow.startMinute || crimeWindow.endMinute > 1409) {
    throw new Error('Missing or invalid caseData.crimeWindow. Start a new case using the updated GameSetup.');
  }
  return crimeWindow;
}
function getSourceKey(caseKey, subjects, crimeWindow) {
  return JSON.stringify({ version: ALIBI_DATA_VERSION, caseKey,
    window: { day: crimeWindow.day, startMinute: crimeWindow.startMinute, endMinute: crimeWindow.endMinute },
    suspects: subjects.map(suspect => ({ id: suspect.id, name: suspect.name || '',
      occupation: suspect.occupation || suspect.publicProfile?.occupation || '',
      isThief: suspect.hiddenCaseData?.isTrueThief === true }))
  });
}
function ensureStores() {
  if (!gameState.caseData || typeof gameState.caseData !== 'object') throw new Error('Missing caseData.');
  gameState.caseData.alibiCases ??= {};
  gameState.crimeCityEncounterState ??= {};
  gameState.alibiAccusations ??= {};
}
function getStoredCase(caseKey) { return gameState.caseData?.alibiCases?.[caseKey] || null; }
function getStoredWitnessData(caseKey, suspectId) {
  return getStoredCase(caseKey)?.suspects?.find(item => item.suspectId === suspectId) || null;
}
function getWitnessEncounterId(suspectId, witness, index = 0) {
  const roleKey = String(witness?.role || witness?.npcId || `witness_${index + 1}`)
    .trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `alibi_${suspectId}_${roleKey || `witness_${index + 1}`}`;
}
function isValidStoredCase(entry, sourceKey, expectedSuspects) {
  if (entry?.version !== ALIBI_DATA_VERSION || entry.sourceKey !== sourceKey ||
    !Array.isArray(entry.suspects) || entry.suspects.length !== expectedSuspects) return false;
  return entry.suspects.every(data =>
    Array.isArray(data.witnesses) && data.witnesses.length === WITNESSES_PER_SUSPECT &&
    Array.isArray(data.boardCards) && data.boardCards.length === WITNESSES_PER_SUSPECT &&
    Array.isArray(data.trueTimeline) && data.trueTimeline.length === WITNESSES_PER_SUSPECT);
}
function buildStoredCase(caseKey, subjects, crimeWindow, sourceKey) {
  const suspects = subjects.map(suspect =>
    generateAlibiWitnesses(toAlibiSubject(suspect), caseKey, crimeWindow));
  return { version: ALIBI_DATA_VERSION, sourceKey, crimeWindow: clone(crimeWindow), suspects };
}
function seededRandom(value) {
  let seed = 2166136261;
  for (const character of String(value)) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), seed | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(items, rng) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function assignCasePortraits(entry, caseKey) {
  const witnesses = entry.suspects.flatMap(data => data.witnesses)
    .sort((a, b) => String(a.npcId).localeCompare(String(b.npcId)));
  const keys = witnesses.map(w => w.portraitKey);
  const valid = entry.portraitRevision === PORTRAIT_REVISION &&
    keys.every(key => GENERIC_NPC_KEYS.includes(key)) &&
    witnesses.every(w => w.textureKey === w.portraitKey) &&
    (keys.length > GENERIC_NPC_KEYS.length || new Set(keys).size === keys.length);
  if (valid) return false;

  const rng = seededRandom(`${caseKey}:${entry.sourceKey}:witness-portraits`);
  const counts = new Map(GENERIC_NPC_KEYS.map(key => [key, 0]));
  const subjectsUsed = new Map();
  const existing = new Set();
  const pending = [];

  // Keep existing unique faces; only repair duplicates or invalid assignments.
  for (const witness of witnesses) {
    const key = witness.portraitKey;
    if (GENERIC_NPC_KEYS.includes(key) && !existing.has(key)) {
      existing.add(key);
      counts.set(key, counts.get(key) + 1);
      const used = subjectsUsed.get(witness.suspectId) || new Set();
      used.add(key); subjectsUsed.set(witness.suspectId, used);
      witness.textureKey = key;
    } else pending.push(witness);
  }

  const available = shuffle(GENERIC_NPC_KEYS.filter(key => !existing.has(key)), rng);
  for (const witness of pending) {
    const used = subjectsUsed.get(witness.suspectId) || new Set();
    let key = available.shift();
    if (!key) {
      const candidates = GENERIC_NPC_KEYS.filter(candidate => !used.has(candidate));
      const pool = candidates.length ? candidates : GENERIC_NPC_KEYS;
      const least = Math.min(...pool.map(candidate => counts.get(candidate)));
      key = shuffle(pool.filter(candidate => counts.get(candidate) === least), rng)[0];
    }
    witness.portraitKey = key;
    witness.textureKey = key;
    counts.set(key, counts.get(key) + 1);
    used.add(key); subjectsUsed.set(witness.suspectId, used);
  }

  if (witnesses.length > GENERIC_NPC_KEYS.length) {
    console.warn(`[AlibiEncounterSetup] ${witnesses.length} witnesses but only ${GENERIC_NPC_KEYS.length} portraits. Repeats are unavoidable; distributed evenly.`);
  }
  entry.portraitRevision = PORTRAIT_REVISION;
  return true;
}
function pickPortrait(previous, witness) {
  return [witness.portraitKey, witness.textureKey, previous?.portraitKey,
    previous?.textureKey, GENERIC_NPC_KEYS[0]].find(key => GENERIC_NPC_KEYS.includes(key));
}
function buildEncounters(entry, previousEncounters = []) {
  const previousById = new Map(previousEncounters.filter(Boolean).map(encounter => [encounter.id, encounter]));
  const encounters = entry.suspects.flatMap(data => data.witnesses.map((witness, index) => {
    const id = getWitnessEncounterId(data.suspectId, witness, index);
    const previous = previousById.get(id);
    const completed = previous?.interviewed === true && previous?.dialogueCompleted === true;
    const portrait = pickPortrait(previous, witness);
    return { ...previous, id, npcId: witness.npcId, suspectId: data.suspectId,
      locationId: 'alibi_contact', label: `${witness.role || __dialogueText("alibi/AlibiEncounterSetup.js", "t_5464a8914419f3a1a237")}${__dialogueText("alibi/AlibiEncounterSetup.js", "t_a4282e4b2298b90b56f7")}${data.suspectName || __dialogueText("alibi/AlibiEncounterSetup.js", "t_982776aa0b872d5a1b4d")}`,
      witnessRole: witness.role || __dialogueText("alibi/AlibiEncounterSetup.js", "t_5464a8914419f3a1a237"), suspectName: data.suspectName || 'suspect',
      enabled: true, excluded: false, interviewed: completed, dialogueCompleted: completed,
      visited: completed, alibiWitness: true, portraitKey: portrait, textureKey: portrait };
  }));
  const expected = entry.suspects.length * WITNESSES_PER_SUSPECT;
  if (encounters.length !== expected) throw new Error(`Expected exactly ${expected} alibi encounters.`);
  if (new Set(encounters.map(item => item.id)).size !== expected) throw new Error('Alibi encounter IDs must be unique.');
  return encounters;
}
export function ensureAlibiEncounters(caseKey) {
  if (!caseKey) {
    console.warn('[AlibiEncounterSetup] Cannot prepare alibis without a caseKey.');
    return [];
  }
  try {
    ensureStores();
    const subjects = getAlibiSubjects(caseKey);
    if (subjects === null) return [];
    if (!subjects.length) { gameState.crimeCityEncounterState[caseKey] = []; return []; }
    const crimeWindow = getCrimeWindow();
    const sourceKey = getSourceKey(caseKey, subjects, crimeWindow);
    const expectedEncounters = subjects.length * WITNESSES_PER_SUSPECT;
    const existingEntry = getStoredCase(caseKey);
    const existingEncounters = Array.isArray(gameState.crimeCityEncounterState[caseKey])
      ? gameState.crimeCityEncounterState[caseKey] : [];
    const reusable = isValidStoredCase(existingEntry, sourceKey, subjects.length);
    const entry = reusable ? existingEntry : buildStoredCase(caseKey, subjects, crimeWindow, sourceKey);
    const portraitsChanged = assignCasePortraits(entry, caseKey);
    const witnessById = new Map(entry.suspects.flatMap(data => data.witnesses).map(w => [w.npcId, w]));
    const encountersMatch = existingEncounters.length === expectedEncounters &&
      new Set(existingEncounters.map(e => e.npcId)).size === expectedEncounters &&
      existingEncounters.every(encounter => {
        const witness = witnessById.get(encounter?.npcId);
        return encounter?.alibiWitness === true && witness &&
          encounter.suspectId === witness.suspectId &&
          encounter.portraitKey === witness.portraitKey && encounter.textureKey === witness.textureKey;
      });
    if (reusable && !portraitsChanged && encountersMatch) return existingEncounters;
    const encounters = buildEncounters(entry, reusable ? existingEncounters : []);
    if (!reusable) {
      if (existingEntry || existingEncounters.length) {
        console.warn('[AlibiEncounterSetup] Rebuilding legacy or changed alibis. Interview progress and accusations for this case are reset.');
      }
      delete gameState.alibiAccusations[caseKey];
      subjects.forEach(suspect => { suspect.deductionState ??= {}; suspect.deductionState.alibiStatus = 'pending'; });
    }
    gameState.caseData.alibiCases[caseKey] = entry;
    gameState.crimeCityEncounterState[caseKey] = encounters;
    saveGameState();
    return encounters;
  } catch (error) {
    console.error('[AlibiEncounterSetup] Failed to prepare alibi encounters.', error);
    if (gameState.crimeCityEncounterState && caseKey) gameState.crimeCityEncounterState[caseKey] = [];
    return [];
  }
}
function getWitnessEncounters(caseKey, suspectId) {
  const encounters = gameState.crimeCityEncounterState?.[caseKey];
  if (!Array.isArray(encounters)) return [];
  return encounters.filter(encounter => encounter?.suspectId === suspectId && encounter.alibiWitness === true);
}
export function markAlibiWitnessInterviewed(caseKey, encounterId) {
  const encounters = gameState.crimeCityEncounterState?.[caseKey];
  if (!Array.isArray(encounters)) return false;
  const encounter = encounters.find(item => item?.id === encounterId && item.alibiWitness === true);
  if (!encounter) return false;
  const data = getStoredWitnessData(caseKey, encounter.suspectId);
  if (!data?.witnesses.some(witness => witness.npcId === encounter.npcId)) return false;
  encounter.interviewed = true; encounter.dialogueCompleted = true; encounter.visited = true;
  requestAutosave(); return true;
}
export function getWitnessTestimony(caseKey, suspectId, npcId) {
  const data = getStoredWitnessData(caseKey, suspectId);
  if (!data) return null;
  const witness = data.witnesses.find(item => item.npcId === npcId);
  const encounter = getWitnessEncounters(caseKey, suspectId).find(item => item.npcId === npcId);
  if (!witness || !encounter) return null;
  return { encounterId: encounter.id, suspectId, suspectName: data.suspectName || __dialogueText("alibi/AlibiEncounterSetup.js", "t_94864ebff58640bcf9bd"),
    npcId, role: witness.role, roleId: witness.roleId, tone: witness.tone,
    portraitKey: encounter.portraitKey, textureKey: encounter.textureKey,
    statement: witness.statement, contradictionHint: witness.contradictionHint,
    timelineCard: clone(witness.timelineCard), motiveFragment: witness.motiveFragment,
    crimeWindow: clone(data.crimeWindow), boardCards: clone(data.boardCards), trueTimeline: clone(data.trueTimeline),
    interviewed: encounter.interviewed === true, dialogueCompleted: encounter.dialogueCompleted === true,
    allWitnessesVisited: allWitnessesVisited(caseKey, suspectId) };
}
export function allWitnessesVisited(caseKey, suspectId) {
  const encounters = getWitnessEncounters(caseKey, suspectId);
  return encounters.length === WITNESSES_PER_SUSPECT &&
    encounters.every(encounter => encounter.interviewed === true && encounter.dialogueCompleted === true);
}
export function recordAlibiAccusation(caseKey, suspectId, npcId) {
  const data = getStoredWitnessData(caseKey, suspectId);
  if (!data || !findSuspect(suspectId)) return { correct: false, message: __dialogueText("alibi/AlibiEncounterSetup.js", "t_cec89673eb1aca996997") };
  if (!allWitnessesVisited(caseKey, suspectId)) return {
    correct: false, message: __dialogueText("alibi/AlibiEncounterSetup.js", "t_05db60b5c05a09f52784") };
  const noLiar = npcId === NO_ALIBI_LIAR;
  const witness = noLiar ? null : data.witnesses.find(item => item.npcId === npcId);
  if (!noLiar && !witness) return { correct: false, message: __dialogueText("alibi/AlibiEncounterSetup.js", "t_276382299c3d06eebb27") };
  const correct = noLiar ? data.alibiType === 'confirmed' : witness.isLiar === true;
  gameState.alibiAccusations ??= {}; gameState.alibiAccusations[caseKey] ??= {};
  gameState.alibiAccusations[caseKey][suspectId] = npcId;
  const suspect = findSuspect(suspectId);
  suspect.deductionState ??= {}; suspect.deductionState.alibiStatus = 'pending';
  requestAutosave();
  return { correct, message: correct
    ? noLiar ? __dialogueText("alibi/AlibiEncounterSetup.js", "t_7d5e7a73e77ee2904223") : __dialogueText("alibi/AlibiEncounterSetup.js", "t_7ac3cc51c3c29ff81a41")
    : noLiar ? __dialogueText("alibi/AlibiEncounterSetup.js", "t_56e678d462b748ed00a3") : __dialogueText("alibi/AlibiEncounterSetup.js", "t_75832cececa0cb3a24f2") };
}
export function recordAlibiConfirmation(caseKey, suspectId) { return recordAlibiAccusation(caseKey, suspectId, NO_ALIBI_LIAR); }
export function getAlibiAccusation(caseKey, suspectId) { return gameState.alibiAccusations?.[caseKey]?.[suspectId] || null; }
export function resolveAlibiTimelineSuccess(caseKey, suspectId) {
  const suspect = findSuspect(suspectId), data = getStoredWitnessData(caseKey, suspectId);
  if (!suspect || !data || !allWitnessesVisited(caseKey, suspectId)) return 'pending';
  const answer = getAlibiAccusation(caseKey, suspectId);
  let status = 'pending';
  if (answer === NO_ALIBI_LIAR && data.alibiType === 'confirmed') status = 'confirmed';
  else if (data.alibiType === 'contradicted' && data.witnesses.some(w => w.npcId === answer && w.isLiar === true)) status = 'contradicted';
  suspect.deductionState ??= {}; suspect.deductionState.alibiStatus = status;
  saveGameState(); return status;
}
export function getTimelineBoardData(caseKey, suspectId) {
  const data = getStoredWitnessData(caseKey, suspectId);
  if (!data || !allWitnessesVisited(caseKey, suspectId)) return { boardCards: [], trueTimeline: [] };
  return { boardCards: clone(data.boardCards), trueTimeline: clone(data.trueTimeline), crimeWindow: clone(data.crimeWindow) };
}
export function getAlibiEncounterDebugData(caseKey) {
  const encounters = gameState.crimeCityEncounterState?.[caseKey];
  if (!Array.isArray(encounters)) return [];
  return encounters.map(encounter => ({ id: encounter.id, suspectId: encounter.suspectId, npcId: encounter.npcId,
    label: encounter.label, enabled: encounter.enabled, excluded: encounter.excluded,
    interviewed: encounter.interviewed, dialogueCompleted: encounter.dialogueCompleted,
    portraitKey: encounter.portraitKey, textureKey: encounter.textureKey }));
}