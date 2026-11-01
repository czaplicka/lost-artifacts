const clone = x => JSON.parse(JSON.stringify(x));
const CONTACTS = {
  pawnshop: ['Second Chances Pawn','The Gilded Paperclip','Cash Before Culture'],
  private_collector: ['Ada Quill — private collections','Morgan Vale — collection office','Ellis Finch — acquisitions'],
  parcel_abroad: ['Parcel & Circumstance','Handle With Panic Logistics','Probably Arriving Express']
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
      relay: `Agency relay ${200 + seed % 700}` } };
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
  if (!validTrailRecord(record, record?.plan) || record.status === 'hidden') return { ok: false, message: 'Establish a lead before calling.' };
  if (record.status === 'verified') return { ok: true, repeated: true, record: clone(record), message: trailConfirmation(record.plan) };
  const next = { ...clone(record), attempts: record.attempts + 1 };
  if (contactId !== record.plan.contact.id || reference !== record.plan.reference) {
    return { ok: false, record: next, message: 'No matching record. Check the contact and reference in your evidence.' };
  }
  next.status = 'verified'; next.confirmation = { contactId, reference };
  return { ok: true, repeated: false, record: next, message: trailConfirmation(record.plan) };
}
export function trailSummary(plan) {
  return `Contact: ${plan.contact.name}\n${plan.contact.relay}\nReference: ${plan.reference}`;
}
export function trailConfirmation(plan) {
  const result = {
    pawnshop: 'The pawnbroker confirms a sealed deposit under this receipt. Collection instructions will be released to the authorised recovery team.',
    private_collector: 'The collection office confirms the meeting file and receipt of a closed case. Ownership and contents are not established by this call.',
    parcel_abroad: 'The carrier confirms a matching consignment. The shipment is traceable; a recovery team can request interception and opening.'
  };
  return `${result[plan.kind]}\n\nThis confirms the record, not the contents or the thief’s location.`;
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
  return { id: `${plan.id}_routing_slip`, type: 'document', label: 'Contact and Reference Slip',
    description: `${trailSummary(plan)}\n\nA contact reference attached to the household records. It identifies a transaction, not the contents of a package.`,
    quantity: 1, isClue: true, isArtifact: false, isEscapeClue: false, isRedHerring: false,
    apartmentRequired: true, apartmentRequiredRole: 'artifact_trail',
    metadata: { artifactTrail: { caseKey: plan.caseKey, trailId: plan.id, reference: plan.reference } } };
}
