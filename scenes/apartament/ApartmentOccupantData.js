import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export const APARTMENT_OCCUPANT_VERSION = 2;
const clone = value => JSON.parse(JSON.stringify(value));
const ROLES = [
  { id: 'roommate', label: __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_b0bcae2bd0872cbb357b"), intro: __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_38569d877efc289b41fe") },
  { id: 'partner', label: __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_29035e784f9305c0eb62"), intro: __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_84595c299dc0be55cf17") }
];
const SCENARIOS = {
  "pawnshop": {
    "participation": {
      "statement": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_275c2868c00cf030cd27"),
      "evidenceLabel": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_5201048a5c80f802862c"),
      "evidenceText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_0950043b15d06e137772"),
      "explanation": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_5e5b2358eae6dc34fd30"),
      "confession": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_e663b75cba10b2c8d15d"),
      "leadText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_3564f82c74c58fae536d")
    },
    "packaging": {
      "statement": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_df6b1976805864a8de3f"),
      "evidenceLabel": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_446427a62e9e4e72439a"),
      "evidenceText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_441a58802d4cb6b42fc4"),
      "explanation": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_930ca00efc62a66a3ec7"),
      "confession": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_c51b62bced3d1146b8c7"),
      "leadText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_4df6093b3438433d5bce"),
      "evidenceType": "photo"
    },
    "contact": {
      "statement": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_494d465c710f7f051edd"),
      "evidenceLabel": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_caebdd81c497b408eb5d"),
      "evidenceText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_34ffa7d5def2dbf282bb"),
      "explanation": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_4470d2b40e89c842eecb"),
      "confession": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_7d17cd203494267a7362"),
      "leadText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_9ceb9d550aa9a466dda4")
    }
  },
  "parcel_abroad": {
    "participation": {
      "statement": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_d2001b4905542ab431a3"),
      "evidenceLabel": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_704a7d1901ed6403022c"),
      "evidenceText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_d79057abf39467c92b49"),
      "explanation": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_b093927b733347acb4cd"),
      "confession": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_8e64403bb5b81a786b8f"),
      "leadText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_ed71f11096eb2be1bb0a")
    },
    "packaging": {
      "statement": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_1e2c6fa6521ee3bd4265"),
      "evidenceLabel": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_0e7b5d9e68526c601dab"),
      "evidenceText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_7c50f66ff9b803cdc6e0"),
      "explanation": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_698a4a2016e880b61c30"),
      "confession": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_afd32161f8074ee89478"),
      "leadText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_abcac0c7967104b06e57"),
      "evidenceType": "photo"
    },
    "contact": {
      "statement": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_3eccb685aa0524f5ee64"),
      "evidenceLabel": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_2660c310ed95c91ac58b"),
      "evidenceText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_c87cffc852e63578b31c"),
      "explanation": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_c90cc91306ec40f7692e"),
      "confession": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_aab0568a4f7c2642c8c6"),
      "leadText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_30a5920ccbf6f00bc177")
    }
  },
  "private_collector": {
    "participation": {
      "statement": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_c0881cb1c239795e5a84"),
      "evidenceLabel": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_ca8f1d7e9d165be9daf5"),
      "evidenceText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_861751c97c16e220a469"),
      "explanation": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_c8bec2049adb1090c8a6"),
      "confession": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_7b7dead1439de85f2718"),
      "leadText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_40dfe2ae773556b08554")
    },
    "packaging": {
      "statement": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_18799ff67b5910ff2ab1"),
      "evidenceLabel": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_dd76f85bba3ca0908111"),
      "evidenceText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_8f370a8531eaace9b0ca"),
      "explanation": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_40fec1ed23a4f02ccf1b"),
      "confession": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_d9e6228ea157cb0c1dbc"),
      "leadText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_16709bd915ec130897c7"),
      "evidenceType": "photo"
    },
    "contact": {
      "statement": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_3af6a43ef5de99bcdb06"),
      "evidenceLabel": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_5f437e7a9b09fc641afd"),
      "evidenceText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_d932953c22d2013a2229"),
      "explanation": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_65b95493ffefd6129dce"),
      "confession": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_9e4095835858eaffdb21"),
      "leadText": __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_3e7c7f82e72594454614")
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
    { id: `${id}_rent`, text: __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_722f18ac220898754e2e") },
    { id: `${id}_denial`, text: scenario.statement },
    { id: `${id}_contents`, text: legacy ? __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_848777f174561bd3d82c") : __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_771c014ad0e6ec09fb8a") }
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
    return { ok: false, reason: 'wrong_case', message: __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_6ba318f972a3a97636b5") };
  }
  if (!Number.isInteger(progress.attempts) || progress.attempts < 0 || typeof progress.solved !== 'boolean' ||
      progress.version !== occupant.version ||
      (occupant.version === APARTMENT_OCCUPANT_VERSION && progress.scenarioId !== occupant.scenarioId)) {
    return { ok: false, reason: 'invalid_progress', message: __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_2b38c364cf5daea29be7") };
  }
  if (progress.solved) return { ok: true, repeated: true, progress: clone(progress), message: occupant.confrontation.confession };
  if (!occupant.statements.some(s => s.id === statementId)) return { ok: false, reason: 'statement_required', message: __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_5214db2e30df64360c18") };
  const fail = (reason, message) => ({ ok: false, reason,
    progress: { ...clone(progress), attempts: progress.attempts + 1 }, message });
  const tag = evidence?.metadata?.occupantEvidence;
  if (!evidence || tag?.caseKey !== occupant.caseKey || tag?.occupantId !== occupant.id ||
      (occupant.version === APARTMENT_OCCUPANT_VERSION && tag.scenarioId !== occupant.scenarioId)) {
    return fail('unrelated_evidence', __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_dfcb4e648fc598df76ad"));
  }
  if ((evidence.originalId || evidence.id) !== occupant.confrontation.evidenceId || statementId !== occupant.confrontation.statementId) {
    return fail('no_contradiction', __dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_4cb9e3e11cd9f894a766"));
  }
  return { ok: true, repeated: false,
    progress: { ...clone(progress), attempts: progress.attempts + 1, solved: true, lead: clone(occupant.lead) },
    message: `${occupant.confrontation.confession}${__dialogueText("scenes/apartament/ApartmentOccupantData.js", "t_75a11da44c802486bc6f")}${occupant.confrontation.explanation}` };
}
export default generateApartmentOccupant;
