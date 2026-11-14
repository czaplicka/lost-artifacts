import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const ARTIFACT_FINALE_VERSION = 1;
export const FINALE_SOURCES = Object.freeze({
  pawnshop: { label: __dialogueText("systems/artifactFinaleLogic.js", "t_f3f567ad8e4c2987cb03"), place: __dialogueText("systems/artifactFinaleLogic.js", "t_8a0e585f8559294e4e55"),
    explanation: __dialogueText("systems/artifactFinaleLogic.js", "t_68a686171b0a411243d5"),
    search: __dialogueText("systems/artifactFinaleLogic.js", "t_b571da1078ee9cd44c8a") },
  private_collector: { label: __dialogueText("systems/artifactFinaleLogic.js", "t_1a4f62b1f10369684860"), place: __dialogueText("systems/artifactFinaleLogic.js", "t_e7df37161edff2dbf077"),
    explanation: __dialogueText("systems/artifactFinaleLogic.js", "t_74dd8c4b24daa8009973"),
    search: __dialogueText("systems/artifactFinaleLogic.js", "t_2e520dd5dcb274f1f0f0") },
  parcel_abroad: { label: __dialogueText("systems/artifactFinaleLogic.js", "t_d8420dea1e1c1f07b4a0"), place: __dialogueText("systems/artifactFinaleLogic.js", "t_faefffcf0d0fd6b8c602"),
    explanation: __dialogueText("systems/artifactFinaleLogic.js", "t_1744acaf9e2914d5c63a"),
    search: __dialogueText("systems/artifactFinaleLogic.js", "t_2c424d4865b8948d87cf") }
});
const copy = x => JSON.parse(JSON.stringify(x));
const same = (a, b) => a != null && b != null && String(a) === String(b);
export function buildArtifactFinalePlan(state, facts, caseKey) {
  const mission = state.currentMission || {};
  const effect = mission.caseModifiers?.apartment?.effect;
  if (effect?.artifactState !== 'carried_away') return null;
  if (facts?.correctDefendant !== true || facts?.warrantMatches !== true) return null;
  if (!same(facts.caseId, state.currentCaseId) || facts.campaignId !== state._createdAt ||
      !same(facts.suspectId, state.finalArrestSuspectId)) {
    throw new Error('Artefact recovery requires the current detained suspect and case.');
  }
  const source = FINALE_SOURCES[effect.artifactTrail];
  if (!source) throw new Error('No supported recovery source is configured for this mission.');
  const missionId = mission.id || mission.missionId;
  const raw = mission.artifact;
  const item = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const label = typeof raw === 'string' ? raw.trim() : String(item.label || item.name || mission.artifactName || '').trim();
  const key = mission.artifactKey || item.artifactKey || item.id;
  if (!missionId || !caseKey || !label || !key ||
      (mission.artifactKey && item.artifactKey && mission.artifactKey !== item.artifactKey)) {
    throw new Error('Missing or inconsistent stolen artefact identity. No replacement was generated.');
  }
  const route = state.escapeRoute;
  if (!Array.isArray(route) || !route.length || !same(state.currentCityId, route[route.length - 1])) {
    throw new Error('Artefact recovery must take place in the existing finale city.');
  }
  const interview = state.apartmentProgress?.[String(missionId)]?.occupantInterview;
  const witnessLead = interview?.caseKey === caseKey && interview.solved === true &&
    interview.lead?.kind === effect.artifactTrail && interview.lead?.status === 'unverified';
  return {
    version: ARTIFACT_FINALE_VERSION, caseKey: String(caseKey),
    caseId: state.currentCaseId, campaignId: state._createdAt,
    missionId: String(missionId), suspectId: facts.suspectId,
    cityId: state.currentCityId, kind: effect.artifactTrail,
    source: copy(source), witnessLead: Boolean(witnessLead),
    artifact: { ...copy(item), id: String(item.id || key), artifactKey: String(key),
      name: label, label, type: 'artifact', isArtifact: true, isClue: false,
      isEscapeClue: false, isRedHerring: false, quantity: 1, condition: item.condition || 'intact' }
  };
}
export function createArtifactFinaleRecord(plan) {
  return { version: ARTIFACT_FINALE_VERSION, caseKey: plan.caseKey, caseId: plan.caseId,
    campaignId: plan.campaignId, missionId: plan.missionId, suspectId: plan.suspectId,
    artifactId: plan.artifact.id, cityId: plan.cityId, kind: plan.kind,
    phase: 'briefing', attempts: 0, recoveredAt: null };
}
export function validArtifactFinaleRecord(record, plan) {
  return Boolean(record && record.version === ARTIFACT_FINALE_VERSION &&
    record.caseKey === plan.caseKey && same(record.caseId, plan.caseId) &&
    record.campaignId === plan.campaignId && record.missionId === plan.missionId &&
    same(record.suspectId, plan.suspectId) && record.artifactId === plan.artifact.id &&
    record.cityId === plan.cityId && record.kind === plan.kind &&
    ['briefing','source','inspect','secured'].includes(record.phase) &&
    Number.isInteger(record.attempts) && record.attempts >= 0 &&
    (record.phase !== 'secured' || (typeof record.recoveredAt === 'string' && Number.isFinite(Date.parse(record.recoveredAt)))));
}
export function advanceArtifactFinale(record, plan, action, value = null) {
  if (!validArtifactFinaleRecord(record, plan)) return { ok: false, message: __dialogueText("systems/artifactFinaleLogic.js", "t_95778ae517136ad694e5") };
  const next = copy(record);
  if (action === 'brief' && next.phase === 'briefing') {
    next.phase = 'source'; return { ok: true, record: next };
  }
  if (action === 'select' && next.phase === 'source') {
    next.attempts++;
    if (value !== plan.kind) return { ok: false, record: next, message: __dialogueText("systems/artifactFinaleLogic.js", "t_51e5f2e7ee0cce90dd9f") };
    next.phase = 'inspect'; return { ok: true, record: next };
  }
  // Only the scene may mark secured, after recoverArtifact succeeds.
  return { ok: false, message: __dialogueText("systems/artifactFinaleLogic.js", "t_ad9a8017966c56741a9f") };
}
export function makeFinaleRecoveryData(plan, recoveredAt) {
  if (!plan?.artifact?.id || typeof recoveredAt !== 'string' || !Number.isFinite(Date.parse(recoveredAt))) {
    throw new Error('Invalid artefact recovery data.');
  }
  return { missionId: plan.missionId, artifact: { ...copy(plan.artifact), recovered: true,
      recoveredAt, recoveredFrom: `finale_${plan.kind}`, recoveredLocation: `${plan.source.place} (${plan.cityId})` },
    recoveredAt, recoveredFrom: `finale_${plan.kind}`,
    recoveredLocation: `${plan.source.place} (${plan.cityId})`, condition: plan.artifact.condition };
}
export function recoveryEntryMatches(entry, plan) {
  return Boolean(entry && same(entry.missionId, plan.missionId) && same(entry.artifactId, plan.artifact.id));
}
