import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
const clone = x => JSON.parse(JSON.stringify(x));
const CONTACTS = {
  pawnshop: [__dialogueText("systems/artifactTrailModel.js", "t_725543c20f6a71a84838"),__dialogueText("systems/artifactTrailModel.js", "t_8d2593e9793517045951"),__dialogueText("systems/artifactTrailModel.js", "t_bb52b224736d7f0c6bb3")],
  private_collector: [__dialogueText("systems/artifactTrailModel.js", "t_153d1f0f69cb914225b7"),__dialogueText("systems/artifactTrailModel.js", "t_0fac86c9a44edb3d2815"),__dialogueText("systems/artifactTrailModel.js", "t_3ab9f4b1044d67c812cf")],
  parcel_abroad: [__dialogueText("systems/artifactTrailModel.js", "t_3081da3dd0d92a32f4c3"),__dialogueText("systems/artifactTrailModel.js", "t_0261b86e1393bd948c30"),__dialogueText("systems/artifactTrailModel.js", "t_9f8135e73d6a3ce41900")]
};
const PREFIX = { pawnshop: 'PAWN', private_collector: 'COL', parcel_abroad: 'SHIP' };
export function trailHash(value) {
  let n = 2166136261;
  for (const c of String(value)) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); }
  return n >>> 0;
}
export function createTrailPlan({ caseKey, missionId, kind, finaleCityId } = {}) {
  if (!caseKey || !missionId || !finaleCityId || !Object.prototype.hasOwnProperty.call(CONTACTS, kind)) {
    throw new Error('[ArtifactTrail] Missing case, route or supported trail.');
  }
  const seed = trailHash(`${caseKey}|${missionId}|${kind}|${finaleCityId}`);
  const contactIndex = trailHash(`${seed}|contact`) % CONTACTS[kind].length;
  const reference = `${PREFIX[kind]}-${String(seed % 1000000).padStart(6, '0')}`;
  return { version: 1, id: `trail_${seed.toString(36)}`, caseKey: String(caseKey), missionId: String(missionId),
    kind, finaleCityId: String(finaleCityId), reference,
    contact: { id: `${kind}_${contactIndex}`, name: CONTACTS[kind][contactIndex],
      relay: `${__dialogueText("systems/artifactTrailModel.js", "t_3fcb79313e4253e63946")}${200 + seed % 700}` } };
}
export function validTrailRecord(record, plan) {
  return Boolean(plan?.version === 1 && typeof plan.caseKey === 'string' && typeof plan.reference === 'string' && record && JSON.stringify(record.plan) === JSON.stringify(plan) &&
    ['hidden','discovered','verified'].includes(record.status) &&
    Number.isInteger(record.attempts) && record.attempts >= 0 &&
    (record.status === 'hidden' ? record.discoveredBy === null : ['occupant','detainee'].includes(record.discoveredBy)) &&
    (record.status !== 'verified' || (record.confirmation?.contactId === plan.contact.id && record.confirmation.reference === plan.reference)));
}
export function resolveTrailRecord(plan, saved) {
  if (saved?.plan?.caseKey === plan.caseKey) {
    if (!validTrailRecord(saved, plan)) throw new Error('[ArtifactTrail] Saved trail is inconsistent. It was not replaced.');
    return clone(saved);
  }
  return { plan: clone(plan), status: 'hidden', discoveredBy: null, attempts: 0, confirmation: null };
}
export function discoverTrail(record, source) {
  if (!validTrailRecord(record, record?.plan) || !['occupant','detainee'].includes(source)) throw new Error('[ArtifactTrail] Invalid discovery.');
  if (record.status !== 'hidden') return clone(record);
  return { ...clone(record), status: 'discovered', discoveredBy: source };
}
export function verifyTrail(record, contactId, reference) {
  if (!validTrailRecord(record, record?.plan) || record.status === 'hidden') return { ok: false, message: __dialogueText("systems/artifactTrailModel.js", "t_0ffadf76b19e19507b6a") };
  if (record.status === 'verified') return { ok: true, repeated: true, record: clone(record), message: trailConfirmation(record.plan) };
  const next = { ...clone(record), attempts: record.attempts + 1 };
  if (contactId !== record.plan.contact.id || reference !== record.plan.reference) {
    return { ok: false, record: next, message: __dialogueText("systems/artifactTrailModel.js", "t_4f5ac9f58156be9b8796") };
  }
  next.status = 'verified'; next.confirmation = { contactId, reference };
  return { ok: true, repeated: false, record: next, message: trailConfirmation(record.plan) };
}
export function trailSummary(plan) {
  return `${__dialogueText("systems/artifactTrailModel.js", "t_8fe6d397489cb24d3e49")}${plan.contact.name}${__dialogueText("systems/artifactTrailModel.js", "t_01ba4719c80b6fe911b0")}${plan.contact.relay}${__dialogueText("systems/artifactTrailModel.js", "t_c73d8710c8f2307e9ebc")}${plan.reference}`;
}
export function trailConfirmation(plan) {
  const result = {
    pawnshop: __dialogueText("systems/artifactTrailModel.js", "t_9a8fc814de1e962c560b"),
    private_collector: __dialogueText("systems/artifactTrailModel.js", "t_c1c9df86d70a7686900d"),
    parcel_abroad: __dialogueText("systems/artifactTrailModel.js", "t_b0116129063b1b5a6929")
  };
  return `${result[plan.kind]}${__dialogueText("systems/artifactTrailModel.js", "t_51c8db8d1e9948d5a8e6")}`;
}
export function trailChoices(plan) {
  const contacts = CONTACTS[plan.kind].map((name, i) => ({ id: `${plan.kind}_${i}`, name }));
  const prefix = PREFIX[plan.kind];
  const n = Number(plan.reference.split('-')[1]);
  const refs = [plan.reference, `${prefix}-${String((n + 137) % 1000000).padStart(6,'0')}`, `${prefix}-${String((n + 491) % 1000000).padStart(6,'0')}`];
  const shift = trailHash(`${plan.id}|choices`) % 3;
  return { contacts, references: refs.slice(shift).concat(refs.slice(0,shift)) };
}
export function trailEvidence(plan) {
  return { id: `${plan.id}_routing_slip`, type: 'document', label: __dialogueText("systems/artifactTrailModel.js", "t_5da74b0f1b212b51ec49"),
    description: `${trailSummary(plan)}${__dialogueText("systems/artifactTrailModel.js", "t_fc459bd7759406bddbf9")}`,
    quantity: 1, isClue: true, isArtifact: false, isEscapeClue: false, isRedHerring: false,
    apartmentRequired: true, apartmentRequiredRole: 'artifact_trail',
    metadata: { artifactTrail: { caseKey: plan.caseKey, trailId: plan.id, reference: plan.reference } } };
}
