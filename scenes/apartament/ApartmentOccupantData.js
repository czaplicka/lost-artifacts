export const APARTMENT_OCCUPANT_VERSION = 2;
const clone = value => JSON.parse(JSON.stringify(value));
const ROLES = [
  { id: 'roommate', label: 'Roommate', intro: 'We share the rent, not a criminal enterprise. The rent is already criminal.' },
  { id: 'partner', label: 'Partner', intro: 'We agreed to communicate more. Apparently that did not include international art theft.' }
];
const SCENARIOS = {
  "pawnshop": {
    "participation": {
      "statement": "I have never handled a pawn transaction for the person living here.",
      "evidenceLabel": "Signed Pawn Receipt",
      "evidenceText": "A pawn receipt for a sealed package, signed by the person you are interviewing. It records a transaction made on behalf of the suspect. The contents were not inspected.",
      "explanation": "Their signature records their participation in the pawn transaction they denied.",
      "confession": "All right. I took a sealed package to a pawnbroker on their behalf. I was told it contained a family keepsake. Apparently every family has a priceless problem.",
      "leadText": "The occupant admits taking a sealed package to a pawnbroker for the suspect. The contents and the current location of the artefact still need verification."
    },
    "packaging": {
      "statement": "I handed the pawnbroker a soft paper envelope. There was no rigid case involved.",
      "evidenceLabel": "Pawnbroker Intake Photograph",
      "evidenceText": "An intake photograph shows the interviewee handing a rigid metal case to the pawnbroker. The attached receipt identifies this as the same transaction carried out for the suspect. The case is closed; its contents are not visible.",
      "explanation": "The photograph shows a rigid metal case, not the soft paper envelope described in the statement.",
      "confession": "Fine. It was a metal case. They asked me to call it an envelope. Apparently that is what an envelope looks like after a promotion.",
      "leadText": "The occupant admits delivering a rigid metal case to a pawnbroker for the suspect. The case contents and current whereabouts remain unverified.",
      "evidenceType": "photo"
    },
    "contact": {
      "statement": "I have never exchanged a message with that pawnbroker. The suspect handled all contact.",
      "evidenceLabel": "Printed Pawnbroker Conversation",
      "evidenceText": "A printed two-way message thread between the interviewee and the pawnbroker. It explicitly identifies both participants. The interviewee asks the pawnbroker to keep the suspect’s pledged package until further notice, and the pawnbroker replies.",
      "explanation": "The two-way conversation proves direct contact with the pawnbroker, contradicting the denial of any messages.",
      "confession": "Yes, I wrote to the pawnbroker. I wanted the package kept off the shop floor. Between the second-hand kettles seemed undignified.",
      "leadText": "The occupant admits contacting the pawnbroker about holding the suspect’s package. The conversation does not establish what was inside or whether it is still there."
    }
  },
  "parcel_abroad": {
    "participation": {
      "statement": "I have never arranged a shipment for the person living here.",
      "evidenceLabel": "Signed Dispatch Receipt",
      "evidenceText": "A dispatch receipt signed by the person you are interviewing, explicitly recording a sealed parcel sent on behalf of the suspect. Its contents and delivery address are not shown on this copy.",
      "explanation": "The signed dispatch receipt contradicts their denial of arranging a shipment.",
      "confession": "I sent a sealed parcel for them. They said it was a birthday present. I did think the insurance was rather ambitious for socks.",
      "leadText": "The occupant admits dispatching a sealed parcel for the suspect. The carrier record must be checked before treating it as the stolen artefact."
    },
    "packaging": {
      "statement": "I watched the carrier accept a plain cardboard box. It had no special handling marks.",
      "evidenceLabel": "Carrier Acceptance Photograph",
      "evidenceText": "A carrier acceptance photograph shows the interviewee beside the parcel sent for the suspect. It is a wooden crate with large FRAGILE and KEEP UPRIGHT marks. The attached dispatch record identifies this as the shipment under discussion. The crate is sealed.",
      "explanation": "The photograph documents a marked wooden crate, contradicting the claim of a plain, unmarked cardboard box.",
      "confession": "All right, a wooden crate. With warning labels. I was told to describe it as ordinary packaging. The crate had clearly not received that memo.",
      "leadText": "The occupant admits arranging shipment of a marked wooden crate for the suspect. The carrier and shipment must still be traced; the contents remain unverified.",
      "evidenceType": "photo"
    },
    "contact": {
      "statement": "I have never spoken to the carrier’s dispatcher about the suspect’s shipment.",
      "evidenceLabel": "Dispatch Call Transcript",
      "evidenceText": "A printed call transcript identifies the interviewee and the carrier’s dispatcher. The dispatcher verifies the interviewee’s identity, and the interviewee requests that tracking notifications for the suspect’s shipment be sent to them.",
      "explanation": "The identified call records direct communication about that shipment, contradicting the denial.",
      "confession": "Yes, I called the dispatcher. I wanted the tracking notices. Someone in this household had to know where something was going.",
      "leadText": "The occupant admits requesting tracking notices for the suspect’s shipment. Those notices may identify its route, but this transcript does not establish its contents or current location."
    }
  },
  "private_collector": {
    "participation": {
      "statement": "I have never arranged a meeting with a collector for the person living here.",
      "evidenceLabel": "Signed Meeting Acknowledgement",
      "evidenceText": "A meeting acknowledgement signed by the person you are interviewing. It explicitly confirms that they arranged a private collector meeting on behalf of the suspect. No sale or transfer of an object is recorded.",
      "explanation": "The signed acknowledgement confirms the collector meeting they denied arranging.",
      "confession": "Yes, I arranged a meeting with a collector. They told me it was a valuation. I assumed the suspicious part would be the consulting fee.",
      "leadText": "The occupant admits arranging a private collector meeting for the suspect. There is not yet proof of a sale or of the artefact being in the collector’s possession."
    },
    "packaging": {
      "statement": "At the collector’s meeting I handed over only a flat paper folder. No case or crate changed hands.",
      "evidenceLabel": "Collector Meeting Photograph",
      "evidenceText": "A labelled photograph from the collector’s meeting shows the interviewee passing a closed padded case to the collector. The attached meeting record identifies both people and connects the meeting to the suspect. No contents are visible.",
      "explanation": "The photograph shows the transfer of a padded case, contradicting the claim that only a paper folder changed hands.",
      "confession": "It was a padded case. I was told to say portfolio. It appears portfolios now come with reinforced corners and emotional baggage.",
      "leadText": "The occupant admits handing a closed case to a collector at the suspect’s meeting. The photograph does not prove which object was inside or whether ownership changed.",
      "evidenceType": "photo"
    },
    "contact": {
      "statement": "I had never communicated with that collector before the meeting.",
      "evidenceLabel": "Earlier Collector Correspondence",
      "evidenceText": "Printed correspondence explicitly identifies the interviewee and the collector. Both reply to each other while discussing the suspect’s proposed meeting. The thread states that the meeting has not yet taken place.",
      "explanation": "The correspondence explicitly predates the meeting and proves communication before it, contradicting the claimed first contact.",
      "confession": "Yes, we exchanged messages before the meeting. Several. The collector needed assurances. I needed the collector to stop using “discreet” in every sentence.",
      "leadText": "The occupant admits earlier correspondence with the collector about the suspect’s meeting. This establishes a contact to investigate, not a confirmed sale or the artefact’s current location."
    }
  }
};

export const OCCUPANT_SCENARIO_IDS = Object.freeze(['participation', 'packaging', 'contact']);
function hash(value) {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function nonempty(value) { return value != null && String(value).trim().length > 0; }
export function generateApartmentOccupant({ caseKey, missionId, suspectId, effect, legacy = false, scenarioId = null } = {}) {
  if (effect?.hasOccupant !== true) return null;
  if (![caseKey, missionId, suspectId].every(nonempty)) throw new Error('[ApartmentOccupant] Missing case identity.');
  if (!Object.prototype.hasOwnProperty.call(SCENARIOS, effect.artifactTrail)) throw new Error('[ApartmentOccupant] Unsupported artefact trail.');
  const seed = hash(`${caseKey}|${missionId}|${suspectId}|${effect.artifactTrail}`);
  const selected = legacy ? 'participation' : scenarioId ?? OCCUPANT_SCENARIO_IDS[hash(`${seed}|scenario_v2`) % OCCUPANT_SCENARIO_IDS.length];
  if (!OCCUPANT_SCENARIO_IDS.includes(selected)) throw new Error('[ApartmentOccupant] Unsupported contradiction scenario.');
  const scenario = SCENARIOS[effect.artifactTrail][selected];
  const role = ROLES[seed % ROLES.length];
  const id = legacy ? `occupant_${seed.toString(36)}` : `occupant_${seed.toString(36)}_v2_${selected}`;
  const evidenceId = legacy ? `${id}_signed_record` : `${id}_record`;
  const statements = [
    { id: `${id}_rent`, text: 'The household bills are kept here. Looking through them will not improve your opinion of the electricity company.' },
    { id: `${id}_denial`, text: scenario.statement },
    { id: `${id}_contents`, text: legacy ? 'I cannot personally identify what was inside any sealed package.' : 'I cannot tell you where the stolen artefact is now. You will have to verify that separately.' }
  ];
  let ordered;
  if (legacy) {
    const shift = seed % statements.length;
    ordered = statements.slice(shift).concat(statements.slice(0, shift));
  } else {
    ordered = [...statements];
    let n = hash(`${seed}|order_v2`);
    for (let i = ordered.length - 1; i > 0; i--) {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      const j = n % (i + 1); [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
  }
  const version = legacy ? 1 : APARTMENT_OCCUPANT_VERSION;
  const tag = { occupantId: id, caseKey: String(caseKey) };
  if (!legacy) tag.scenarioId = selected;
  return {
    version, ...(legacy ? {} : { scenarioId: selected }),
    id, caseKey: String(caseKey), missionId: String(missionId), suspectId: String(suspectId),
    roleId: role.id, role: role.label, introduction: role.intro, statements: ordered,
    confrontation: { statementId: `${id}_denial`, evidenceId,
      explanation: scenario.explanation, confession: scenario.confession },
    evidence: {
      id: evidenceId, label: scenario.evidenceLabel, type: scenario.evidenceType || 'document',
      description: scenario.evidenceText, quantity: 1, isClue: true, isArtifact: false,
      isEscapeClue: false, isRedHerring: false, apartmentRequired: true,
      apartmentRequiredRole: 'occupant_contradiction', metadata: { occupantEvidence: tag }
    },
    lead: { id: `${id}_artifact_lead`, kind: effect.artifactTrail, text: scenario.leadText,
      status: 'unverified', locationId: null }
  };
}
export function resolveApartmentOccupant(options, { progress = {}, items = [] } = {}) {
  const legacyOccupant = generateApartmentOccupant({ ...options, legacy: true });
  if (!legacyOccupant) return null;
  const saved = progress.occupantPlan;
  if (saved?.caseKey === legacyOccupant.caseKey) {
    if (![1, APARTMENT_OCCUPANT_VERSION].includes(saved.version)) throw new Error('[ApartmentOccupant] Unsupported saved interview version.');
    const expected = generateApartmentOccupant({ ...options, legacy: saved.version === 1, scenarioId: saved.scenarioId });
    if (JSON.stringify(saved) !== JSON.stringify(expected)) throw new Error('[ApartmentOccupant] Saved interview does not match its case. It was not replaced.');
    return clone(saved);
  }
  const old = progress.occupantInterview;
  const oldInterview = old?.caseKey === legacyOccupant.caseKey && old.occupantId === legacyOccupant.id && old.version === 1;
  const oldCollected = progress.collectedItems?.[legacyOccupant.evidence.id] === true;
  const oldItem = [...items, ...(Array.isArray(progress.items) ? progress.items : [])].some(item => {
    const original = item?.metadata?.apartment?.item || item;
    const tag = original?.metadata?.occupantEvidence;
    return tag?.caseKey === legacyOccupant.caseKey && tag?.occupantId === legacyOccupant.id &&
      (original.id === legacyOccupant.evidence.id || item?.originalId === legacyOccupant.evidence.id);
  });
  return oldInterview || oldCollected || oldItem ? legacyOccupant : generateApartmentOccupant(options);
}
export function createOccupantProgress(occupant) {
  return { version: occupant.version, caseKey: occupant.caseKey, occupantId: occupant.id,
    ...(occupant.scenarioId ? { scenarioId: occupant.scenarioId } : {}),
    attempts: 0, solved: false, lead: null };
}
export function confrontApartmentOccupant(occupant, progress, statementId, evidence) {
  if (!occupant || progress?.caseKey !== occupant.caseKey || progress?.occupantId !== occupant.id) {
    return { ok: false, reason: 'wrong_case', message: 'This interview belongs to a different case.' };
  }
  if (!Number.isInteger(progress.attempts) || progress.attempts < 0 || typeof progress.solved !== 'boolean' ||
      progress.version !== occupant.version ||
      (occupant.version === APARTMENT_OCCUPANT_VERSION && progress.scenarioId !== occupant.scenarioId)) {
    return { ok: false, reason: 'invalid_progress', message: 'The saved interview progress is inconsistent.' };
  }
  if (progress.solved) return { ok: true, repeated: true, progress: clone(progress), message: occupant.confrontation.confession };
  if (!occupant.statements.some(s => s.id === statementId)) return { ok: false, reason: 'statement_required', message: 'Select a statement first.' };
  const fail = (reason, message) => ({ ok: false, reason,
    progress: { ...clone(progress), attempts: progress.attempts + 1 }, message });
  const tag = evidence?.metadata?.occupantEvidence;
  if (!evidence || tag?.caseKey !== occupant.caseKey || tag?.occupantId !== occupant.id ||
      (occupant.version === APARTMENT_OCCUPANT_VERSION && tag.scenarioId !== occupant.scenarioId)) {
    return fail('unrelated_evidence', 'This item does not contradict that statement.');
  }
  if ((evidence.originalId || evidence.id) !== occupant.confrontation.evidenceId || statementId !== occupant.confrontation.statementId) {
    return fail('no_contradiction', 'The document does not contradict the statement you selected.');
  }
  return { ok: true, repeated: false,
    progress: { ...clone(progress), attempts: progress.attempts + 1, solved: true, lead: clone(occupant.lead) },
    message: `${occupant.confrontation.confession}\n\n${occupant.confrontation.explanation}` };
}
export default generateApartmentOccupant;
