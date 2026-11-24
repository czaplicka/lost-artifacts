import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { getEvidenceCaseKey, readApartmentEvidence, evidenceMatchesCase } from '../managers/ApartmentEvidenceModel.js';
import { getKnownApartmentIdentityClues, getApartmentIdentityContext } from '../scenes/apartament/ApartmentIdentityEvidence.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { getBoardEvidenceRecord } from './BoardEvidenceModel.js';
import { getSuspectPhotoKey, normalizeWarrantIdentity } from './BoardSuspectPhotos.js';

function write(record, state = gameState) {
  const key = getEvidenceCaseKey(state);
  const normalized = record.warrant
    ? { ...record, warrant: normalizeWarrantIdentity(record.warrant) } : record;
  const caseData = {
    ...(state.caseData || {}),
    boardEvidenceCases: {
      ...(state.caseData?.boardEvidenceCases || {}), [key]: normalized
    }
  };
  if (typeof state.updateState === 'function') state.updateState({ caseData });
  else state.caseData = caseData;
  requestAutosave();
}

function isRelevant(raw, state) {
  return Boolean(state?.currentMission && raw?.metadata?.apartment &&
    Number(raw.quantity ?? 1) > 0 && evidenceMatchesCase(raw, state));
}

function captureItems(items, state) {
  if (!state?.currentMission) return false;
  const previous = getBoardEvidenceRecord(state);
  let next = previous;
  let materials = previous.materials || {};
  let recoveredArtifacts = previous.recoveredArtifacts || [];
  const change = () => { if (next === previous) next = { ...previous }; };
  if (previous.warrant) {
    const warrant = normalizeWarrantIdentity(previous.warrant);
    if (Object.hasOwn(previous.warrant, 'image') || previous.warrant.imageKey !== warrant.imageKey) {
      change(); next.warrant = warrant;
    }
  }
  for (const raw of items) {
    if (!isRelevant(raw, state)) continue;
    const item = readApartmentEvidence(raw);
    const name = raw.name || item.label || __dialogueText('crimeBoard/BoardEvidenceRuntime.js', 't_985f13ce263cb00b201b');
    const old = materials[raw.id];
    if (!old || old.name !== name || old.originalId !== item.originalId) {
      change();
      materials = { ...materials, [raw.id]: { ...old, name, originalId: item.originalId } };
      next.materials = materials;
    }
    const key = item.artifactKey;
    if (item.isArtifact === true && key && key === state.currentMission.artifactKey &&
        !recoveredArtifacts.some(entry => entry.artifactKey === key)) {
      change();
      recoveredArtifacts = [...recoveredArtifacts, {
        artifactKey: key, name: raw.name || item.label,
        sourceItemId: raw.id, recoveredAt: new Date().toISOString()
      }];
      next.recoveredArtifacts = recoveredArtifacts;
    }
  }
  if (next === previous) return false;
  write(next, state);
  return true;
}

export function captureApartmentInventory(state = gameState) {
  if (!state?.currentMission) return false;
  return captureItems(inventoryManager.getAllItems(), state);
}

export function recordEnvelopeViewed(raw, state = gameState) {
  if (!raw?.id || !raw.metadata?.apartment || !evidenceMatchesCase(raw, state) ||
      !inventoryManager.hasItem(raw.id)) return false;
  const context = getApartmentIdentityContext(state);
  if (!context) return false;
  const originalId = raw.metadata.apartment.originalId;
  const clue = getKnownApartmentIdentityClues(state).find(entry => entry.id === originalId);
  if (!clue || clue.category !== 'eyes') return false;
  const previous = getBoardEvidenceRecord(state);
  if (previous.envelopeViewed?.clue?.id === clue.id) return true;
  write({
    ...previous,
    envelopeViewed: {
      inventoryItemId: raw.id, actualId: context.actualId,
      viewedAt: new Date().toISOString(), clue: JSON.parse(JSON.stringify(clue))
    }
  }, state);
  return true;
}

export function recordWarrantIdentity(scene, suspect, state = gameState) {
  if (!state.arrestWarrantIssued || !suspect?.id ||
      String(state.warrantSuspectId) !== String(suspect.id)) return false;
  const previous = getBoardEvidenceRecord(state);
  const warrant = {
    id: String(suspect.id), name: suspect.name || state.warrantSuspectName,
    imageKey: getSuspectPhotoKey(suspect)
  };
  const old = previous.warrant;
  if (old && !Object.hasOwn(old, 'image') && old.id === warrant.id &&
      old.name === warrant.name && old.imageKey === warrant.imageKey) return true;
  write({ ...previous, warrant }, state);
  return true;
}

// Application-lifetime service, not a scene listener. Explicit owner and detachable callback.
const OWNER = 'crimeBoard:BoardEvidenceRuntime';
function onItemAdded(raw) {
  // Ordinary purchases and evidence from another case do no record work at all.
  if (!isRelevant(raw, gameState) || !inventoryManager.hasItem(raw.id)) return;
  captureItems([raw], gameState);
}
export function startBoardEvidenceRuntime() {
  EventBus.clearScope(OWNER);
  EventBus.on('itemAdded', onItemAdded, null, OWNER);
}
export function stopBoardEvidenceRuntime() {
  EventBus.clearScope(OWNER);
}
startBoardEvidenceRuntime();
