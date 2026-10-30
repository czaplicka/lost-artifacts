export const ARTIFACT_FINALE_VERSION = 1;
export const FINALE_SOURCES = Object.freeze({
  pawnshop: { label: 'Pawnbroker', place: 'Pawnbroker evidence counter',
    explanation: 'The detained suspect identifies the pawnbroker holding the pledged package.',
    search: 'The pawnbroker produces the pledged package and its transaction record. You open it under the recovery team’s supervision.' },
  private_collector: { label: 'Private collector', place: 'Private collection recovery room',
    explanation: 'The detained suspect identifies the collector who received the object after the meeting.',
    search: 'The recovery team obtains the object from the collector. The handover is documented before you compare it with the case file.' },
  parcel_abroad: { label: 'Parcel carrier', place: 'Carrier secure parcel counter',
    explanation: 'The detained suspect identifies the carrier handling the shipment.',
    search: 'The carrier traces and intercepts the parcel using the suspect’s dispatch details. The recovery team documents the opening.' }
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
  if (!validArtifactFinaleRecord(record, plan)) return { ok: false, message: 'The recovery record does not match this case.' };
  const next = copy(record);
  if (action === 'brief' && next.phase === 'briefing') {
    next.phase = 'source'; return { ok: true, record: next };
  }
  if (action === 'select' && next.phase === 'source') {
    next.attempts++;
    if (value !== plan.kind) return { ok: false, record: next, message: 'That destination does not match the established recovery lead.' };
    next.phase = 'inspect'; return { ok: true, record: next };
  }
  // Only the scene may mark secured, after recoverArtifact succeeds.
  return { ok: false, message: 'That action is not available at this stage.' };
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
