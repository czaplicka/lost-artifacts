import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getEvidenceCaseKey } from '../managers/ApartmentEvidenceModel.js';
import { createTrailPlan, resolveTrailRecord, validTrailRecord, discoverTrail, verifyTrail, trailSummary } from './artifactTrailModel.js';

function context(state = gameState) {
  const mission = state.currentMission || {}, effect = mission.caseModifiers?.apartment?.effect;
  if (effect?.artifactState !== 'carried_away') return null;
  const missionId = mission.id || mission.missionId, route = state.escapeRoute;
  if (!missionId || !Array.isArray(route) || !route.length || !route.every(id => typeof id === 'string' && id)) {
    throw new Error('[ArtifactTrail] A mission and existing escape route are required.');
  }
  return createTrailPlan({ caseKey: getEvidenceCaseKey(state), missionId: String(missionId),
    kind: effect.artifactTrail, finaleCityId: route[route.length - 1] });
}
export function ensureArtifactTrail() {
  const plan = context(); if (!plan) return null;
  const saved = gameState.apartmentProgress?.[plan.missionId]?.artifactTrail;
  const record = resolveTrailRecord(plan, saved);
  if (!saved || saved.plan?.caseKey !== plan.caseKey) storeArtifactTrail(record);
  return record;
}
export function storeArtifactTrail(record) {
  const plan = context();
  if (!plan || !validTrailRecord(record, plan)) throw new Error('[ArtifactTrail] Cannot save a trail from another case.');
  gameState.updateState({ apartmentProgress: { ...(gameState.apartmentProgress || {}),
    [plan.missionId]: { ...(gameState.apartmentProgress?.[plan.missionId] || {}), artifactTrail: structuredClone(record) } } });
  requestAutosave(); return record;
}
export function revealArtifactTrail(source = 'occupant') {
  const record = ensureArtifactTrail(); if (!record) return null;
  const next = discoverTrail(record, source); if (record.status === 'hidden') storeArtifactTrail(next);
  const id = `${next.plan.id}_contact`;
  if (!gameState.hasClue(id)) gameState.addClue({ id, type: 'apartment', category: 'apartment',
    key: id, value: __dialogueText("systems/ArtifactTrailService.js", "t_a590a53e5c54cc203881"), text: trailSummary(next.plan),
    source: source === 'occupant' ? 'apartment_occupant' : 'detained_suspect',
    missionId: next.plan.missionId, status: 'unverified', isEscapeClue: false });
  requestAutosave(); return next;
}
export function checkArtifactTrail(contactId, reference) {
  const record = ensureArtifactTrail();
  if (!record) return { ok: false, message: __dialogueText("systems/ArtifactTrailService.js", "t_91cc15e458cdc1a0f692") };
  const result = verifyTrail(record, contactId, reference);
  if (result.record) storeArtifactTrail(result.record);
  if (result.ok) {
    const id = `${record.plan.id}_confirmed`;
    if (!gameState.hasClue(id)) gameState.addClue({ id, type: 'apartment', category: 'apartment',
      key: id, value: __dialogueText("systems/ArtifactTrailService.js", "t_f09884493264913b2334"), text: `${trailSummary(record.plan)}${__dialogueText("systems/ArtifactTrailService.js", "t_75a11da44c802486bc6f")}${result.message}`,
      source: 'artifact_contact_call', missionId: record.plan.missionId,
      status: 'record_confirmed', isEscapeClue: false });
    requestAutosave();
  }
  return result;
}
