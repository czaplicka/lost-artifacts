export const APARTMENT_OCCUPANT_VERSION = 1;
const clone = value => JSON.parse(JSON.stringify(value));
const ROLES = [
  { id: 'roommate', label: 'Roommate', intro: 'We share the rent, not a criminal enterprise. The rent is already criminal.' },
  { id: 'partner', label: 'Partner', intro: 'We agreed to communicate more. Apparently that did not include international art theft.' }
];
const SCENARIOS = {
  pawnshop: {
    statement: 'I have never handled a pawn transaction for the person living here.',
    evidenceLabel: 'Signed Pawn Receipt',
    evidenceText: 'A pawn receipt for a sealed package, signed by the person you are interviewing. It records a transaction made on behalf of the suspect. The contents were not inspected.',
    explanation: 'Their signature records their participation in the pawn transaction they denied.',
    confession: 'All right. I took a sealed package to a pawnbroker on their behalf. I was told it contained a family keepsake. Apparently every family has a priceless problem.',
    leadText: 'The occupant admits taking a sealed package to a pawnbroker for the suspect. The contents and the current location of the artefact still need verification.'
  },
  parcel_abroad: {
    statement: 'I have never arranged a shipment for the person living here.',
    evidenceLabel: 'Signed Dispatch Receipt',
    evidenceText: 'A dispatch receipt signed by the person you are interviewing, explicitly recording a sealed parcel sent on behalf of the suspect. Its contents and delivery address are not shown on this copy.',
    explanation: 'The signed dispatch receipt contradicts their denial of arranging a shipment.',
    confession: 'I sent a sealed parcel for them. They said it was a birthday present. I did think the insurance was rather ambitious for socks.',
    leadText: 'The occupant admits dispatching a sealed parcel for the suspect. The carrier record must be checked before treating it as the stolen artefact.'
  },
  private_collector: {
    statement: 'I have never arranged a meeting with a collector for the person living here.',
    evidenceLabel: 'Signed Meeting Acknowledgement',
    evidenceText: 'A meeting acknowledgement signed by the person you are interviewing. It explicitly confirms that they arranged a private collector meeting on behalf of the suspect. No sale or transfer of an object is recorded.',
    explanation: 'The signed acknowledgement confirms the collector meeting they denied arranging.',
    confession: 'Yes, I arranged a meeting with a collector. They told me it was a valuation. I assumed the suspicious part would be the consulting fee.',
    leadText: 'The occupant admits arranging a private collector meeting for the suspect. There is not yet proof of a sale or of the artefact being in the collector’s possession.'
  }
};
function hash(value) {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function generateApartmentOccupant({ caseKey, missionId, suspectId, effect } = {}) {
  if (effect?.hasOccupant !== true) return null;
  if (!caseKey || !missionId || !suspectId) throw new Error('[ApartmentOccupant] Missing case identity.');
  const scenario = SCENARIOS[effect.artifactTrail];
  if (!scenario) throw new Error('[ApartmentOccupant] Unsupported artefact trail.');
  const seed = hash(`${caseKey}|${missionId}|${suspectId}|${effect.artifactTrail}`);
  const role = ROLES[seed % ROLES.length];
  const id = `occupant_${seed.toString(36)}`;
  const evidenceId = `${id}_signed_record`;
  const statements = [
    { id: `${id}_rent`, text: 'The household bills are kept here. Looking through them will not improve your opinion of the electricity company.' },
    { id: `${id}_denial`, text: scenario.statement },
    { id: `${id}_contents`, text: 'I cannot personally identify what was inside any sealed package.' }
  ];
  const shift = seed % statements.length;
  const ordered = statements.slice(shift).concat(statements.slice(0, shift));
  return {
    version: APARTMENT_OCCUPANT_VERSION, id, caseKey: String(caseKey),
    missionId: String(missionId), suspectId: String(suspectId),
    roleId: role.id, role: role.label, introduction: role.intro,
    statements: ordered,
    confrontation: {
      statementId: `${id}_denial`, evidenceId,
      explanation: scenario.explanation, confession: scenario.confession
    },
    evidence: {
      id: evidenceId, label: scenario.evidenceLabel, type: 'document',
      description: scenario.evidenceText, quantity: 1, isClue: true,
      isArtifact: false, isEscapeClue: false, isRedHerring: false,
      apartmentRequired: true, apartmentRequiredRole: 'occupant_contradiction',
      metadata: { occupantEvidence: { occupantId: id, caseKey: String(caseKey) } }
    },
    lead: {
      id: `${id}_artifact_lead`, kind: effect.artifactTrail,
      text: scenario.leadText, status: 'unverified', locationId: null
    }
  };
}
export function createOccupantProgress(occupant) {
  return { version: APARTMENT_OCCUPANT_VERSION, caseKey: occupant.caseKey,
    occupantId: occupant.id, attempts: 0, solved: false, lead: null };
}
export function confrontApartmentOccupant(occupant, progress, statementId, evidence) {
  if (!occupant || progress?.caseKey !== occupant.caseKey || progress?.occupantId !== occupant.id) {
    return { ok: false, reason: 'wrong_case', message: 'This interview belongs to a different case.' };
  }
  if (progress.solved) return { ok: true, repeated: true, progress: clone(progress), message: occupant.confrontation.confession };
  if (!occupant.statements.some(s => s.id === statementId)) {
    return { ok: false, reason: 'statement_required', message: 'Select a statement first.' };
  }
  const tag = evidence?.metadata?.occupantEvidence;
  if (!evidence || tag?.caseKey !== occupant.caseKey || tag?.occupantId !== occupant.id) {
    return { ok: false, reason: 'unrelated_evidence', progress: { ...clone(progress), attempts: progress.attempts + 1 },
      message: 'This item does not contradict that statement.' };
  }
  if ((evidence.originalId || evidence.id) !== occupant.confrontation.evidenceId || statementId !== occupant.confrontation.statementId) {
    return { ok: false, reason: 'no_contradiction', progress: { ...clone(progress), attempts: progress.attempts + 1 },
      message: 'The document does not contradict the statement you selected.' };
  }
  return { ok: true, repeated: false,
    progress: { ...clone(progress), attempts: progress.attempts + 1, solved: true, lead: clone(occupant.lead) },
    message: `${occupant.confrontation.confession}\n\n${occupant.confrontation.explanation}` };
}
export default generateApartmentOccupant;
