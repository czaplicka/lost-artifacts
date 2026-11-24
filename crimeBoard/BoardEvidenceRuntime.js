import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { getEvidenceCaseKey, readApartmentEvidence, evidenceMatchesCase } from '../managers/ApartmentEvidenceModel.js';
import { getKnownApartmentIdentityClues, getApartmentIdentityContext } from '../scenes/apartament/ApartmentIdentityEvidence.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { getBoardEvidenceRecord } from './BoardEvidenceModel.js';
import { loadJson } from '../config/loadJson.js';

const suspectImages = new Map();
const gameRoot = new URL('../', import.meta.url);
let manifestReady = false;
let manifestRequest = null;

function ensureSuspectImages() {
  if (manifestReady) return Promise.resolve(true);
  if (manifestRequest) return manifestRequest;
  manifestRequest = Promise.resolve()
    .then(() => loadJson('../assets/manifests/catalog/suspects.json', import.meta.url))
    .then(manifest => {
      if (!Array.isArray(manifest?.assets)) throw new Error('Invalid suspects manifest: assets must be an array.');
      const images = manifest.assets.filter(asset => asset?.type === 'image' &&
        typeof asset.key === 'string' && typeof asset.url === 'string' &&
        /^assets\/suspects\//.test(asset.url));
      for (const asset of images) suspectImages.set(asset.key, asset.url);
      manifestReady = true;
      return true;
    })
    .catch(error => {
      console.warn('[BoardEvidenceRuntime] Suspect photos unavailable; the board remains usable.', error);
      return false;
    })
    .finally(() => { manifestRequest = null; });
  return manifestRequest;
}

function resolveSuspectPhoto(suspect) {
  // Never store texture source.src: it can be a temporary blob URL.
  const candidates = [suspect.portraitKey, suspect.suspectImageKey,
    suspect.imageKey, suspect.photoKey, suspect.spriteKey, suspect.id];
  for (const key of candidates) {
    if (typeof key !== 'string') continue;
    const path = suspectImages.get(key);
    if (path) return { imageKey: key, image: new URL(path, gameRoot).href };
  }
  return { imageKey: null, image: '' };
}

function write(record, state = gameState) {
  const key = getEvidenceCaseKey(state);
  const caseData = {
    ...(state.caseData || {}),
    boardEvidenceCases: {
      ...(state.caseData?.boardEvidenceCases || {}),
      [key]: record
    }
  };
  if (typeof state.updateState === 'function') state.updateState({ caseData });
  else state.caseData = caseData;
  requestAutosave();
}

export function captureApartmentInventory(state = gameState) {
  if (!state.currentMission) return false;
  const previous = getBoardEvidenceRecord(state);
  const next = JSON.parse(JSON.stringify(previous));
  next.materials ||= {};
  next.recoveredArtifacts ||= [];
  for (const raw of inventoryManager.getAllItems()) {
    if (!raw?.metadata?.apartment || Number(raw.quantity ?? 1) <= 0 || !evidenceMatchesCase(raw, state)) continue;
    const item = readApartmentEvidence(raw);
    next.materials[raw.id] = {
      name: raw.name || item.label || __dialogueText('crimeBoard/BoardEvidenceRuntime.js', 't_985f13ce263cb00b201b'),
      originalId: item.originalId
    };
    const key = item.artifactKey;
    if (item.isArtifact === true && key && key === state.currentMission.artifactKey &&
        !next.recoveredArtifacts.some(entry => entry.artifactKey === key)) {
      next.recoveredArtifacts.push({
        artifactKey: key,
        name: raw.name || item.label,
        sourceItemId: raw.id,
        recoveredAt: new Date().toISOString()
      });
    }
  }
  if (JSON.stringify(previous) === JSON.stringify(next)) return false;
  write(next, state);
  return true;
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
      inventoryItemId: raw.id,
      actualId: context.actualId,
      viewedAt: new Date().toISOString(),
      clue: JSON.parse(JSON.stringify(clue))
    }
  }, state);
  return true;
}

export function recordWarrantIdentity(scene, suspect, state = gameState) {
  if (!state.arrestWarrantIssued || !suspect?.id ||
      String(state.warrantSuspectId) !== String(suspect.id)) return false;
  const photo = resolveSuspectPhoto(suspect);
  const previous = getBoardEvidenceRecord(state);
  const sameSuspect = String(previous.warrant?.id) === String(suspect.id);
  const warrant = {
    id: String(suspect.id),
    name: suspect.name || state.warrantSuspectName,
    image: photo.image || (sameSuspect ? previous.warrant.image : '') || '',
    imageKey: photo.imageKey || (sameSuspect ? previous.warrant.imageKey : null) || null
  };
  if (JSON.stringify(previous.warrant) !== JSON.stringify(warrant)) {
    write({ ...previous, warrant }, state);
  }
  if (!manifestReady) {
    const caseKey = getEvidenceCaseKey(state);
    const caseId = state.currentCaseId;
    const campaignId = state._createdAt;
    const startedAt = state.investigationStartTime;
    const snapshot = { ...suspect };
    // Preserve the synchronous API; only enrich the same active warrant later.
    void ensureSuspectImages().then(loaded => {
      if (!loaded || !state.currentMission ||
          getEvidenceCaseKey(state) !== caseKey || state.currentCaseId !== caseId ||
          state._createdAt !== campaignId || state.investigationStartTime !== startedAt ||
          !state.arrestWarrantIssued || String(state.warrantSuspectId) !== String(snapshot.id)) return;
      const current = getBoardEvidenceRecord(state);
      if (String(current.warrant?.id) !== String(snapshot.id)) return;
      const resolved = resolveSuspectPhoto(snapshot);
      if (!resolved.image) return;
      const next = { ...current.warrant, image: resolved.image, imageKey: resolved.imageKey };
      if (JSON.stringify(current.warrant) !== JSON.stringify(next)) write({ ...current, warrant: next }, state);
    }).catch(error => console.warn('[BoardEvidenceRuntime] Could not update warrant photo.', error));
  }
  return true;
}

// No top-level await and no request during import. First warrant loads photos on demand.
EventBus.on('itemAdded', () => captureApartmentInventory());
