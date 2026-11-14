import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
// scenes/CSI/DeductionEvidenceRegistry.js
import {
  evaluateMaterialEvidence,
  getMaterialProfiles,
  getMaterialDossierNotes
} from '../../suspects/MaterialEvidence.js';
import {
  evaluateDustEvidence,
  getDustProfiles,
  getDustHobbyLabels
} from '../../suspects/DustEvidence.js';

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function normalizeHairColor(value) {
  const result = normalizeText(value);
  return result === 'blond' ? 'blonde' : result;
}
function normalizeBloodType(value) {
  return String(value ?? '').trim().toUpperCase();
}
function normalizeDnaProfile(value) {
  const result = normalizeText(value);
  if (['xx', 'f', 'female', 'woman'].includes(result)) return 'female';
  if (['xy', 'm', 'male', 'man'].includes(result)) return 'male';
  return result;
}
function normalizeHandedness(value) {
  return normalizeText(value).replace(/[-_ ]handed$/, '');
}
function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}
function compareScalar(normalize, suspectValue, evidenceValue, allowed = null) {
  if (!hasValue(suspectValue) || !hasValue(evidenceValue)) return false;
  const a = normalize(suspectValue), b = normalize(evidenceValue);
  if (allowed && (!allowed.includes(a) || !allowed.includes(b))) return false;
  return a === b;
}
function readEvidenceValue(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw.correctValue ?? raw.thief_value ?? raw.normalizedValue ??
      raw.value ?? raw.result ?? raw.selectedValue ??
      raw.evidenceConfig?.correctValue ?? raw.evidence?.correctValue ?? null;
  }
  return raw;
}
function readableIdentifier(value) {
  return String(value ?? '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function explicitFlag(objects, key) {
  // An explicit false on the outer record must not be replaced by a nested true.
  for (const object of objects) {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) return object[key];
  }
  return undefined;
}
function makeProfileEntry({field, path, label, profiles, evaluator, notes}) {
  const normalizeEvidence = raw => normalizeText(readEvidenceValue(raw));
  const findProfile = raw => profiles().find(profile => profile.id === normalizeEvidence(raw)) || null;

  const evaluate = (suspectValue, evidenceValue, context = {}) => {
    const raw = evidenceValue && typeof evidenceValue === 'object' ? evidenceValue : {};
    const metadata = context && typeof context === 'object' ? context : {};
    const id = normalizeEvidence(evidenceValue);
    if (!findProfile(id)) return {status: 'unknown', reasonCode: 'unknown_evidence_profile'};
    const objects = [raw, metadata, raw.evidenceConfig, raw.evidence,
      metadata.evidenceConfig, metadata.evidence];
    const sourceConfirmed = explicitFlag(objects, 'sourceConfirmed') === true;
    const sourceText = String(explicitFlag(objects, 'sourceText') ?? '').trim();
    const suspect = suspectValue && typeof suspectValue === 'object' &&
      Object.prototype.hasOwnProperty.call(suspectValue, path)
      ? suspectValue : {[path]: suspectValue};
    return evaluator(suspect, {
      evidenceType: field, correctValue: id, sourceConfirmed, sourceText
    });
  };

  return {
    role: 'hard_filter',
    label,
    suspectField: path,
    comparisonType: 'profile_rule',
    requiresConfirmedOrigin: true,
    normalizeEvidence,
    evaluate,

    // New profile comparisons are tri-state:
    // true = compatible, false = incompatible, null = insufficient information.
    // Callers must not use !matches(...) to interpret null as an exclusion.
    matches: (suspectValue, evidenceValue, context = {}) => {
      const result = evaluate(suspectValue, evidenceValue, context);
      if (result.status === 'compatible') return true;
      if (result.status === 'incompatible') return false;
      return null;
    },

    formatEvidence: raw => findProfile(raw)?.label || readableIdentifier(readEvidenceValue(raw)) || __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_b764cdc0eab713746721"),
    formatSuspect: value => {
      const suspect = value && typeof value === 'object' &&
        Object.prototype.hasOwnProperty.call(value, path) ? value : {[path]: value};
      return notes(suspect).join('; ');
    },
    extract: raw => {
      const profile = findProfile(raw);
      return {
        value: profile?.label || readableIdentifier(readEvidenceValue(raw)) || __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_b764cdc0eab713746721"),
        profileId: normalizeEvidence(raw),
        label: profile?.label || __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_b764cdc0eab713746721"),
        description: profile?.report || profile?.labText || ''
      };
    },
    clueTemplates: [__dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_1769d50566a63f648b71")],
    // Exclusion wording is not generated for the player by this registry.
    eliminateTemplates: []
  };
}

const DNA_PROFILE_EVIDENCE = {
  role: 'hard_filter',
  label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_bf6e9d9b603476cab4da"),
  suspectField: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_03ea82d8a55e2ff3820a"),
  normalizeEvidence: normalizeDnaProfile,
  matches: (a, b) => compareScalar(normalizeDnaProfile, a, b, ['female', 'male']),
  clueTemplates: [
    __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_e50068fd90a587613724"),
    __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_52a411a166ff3542a988"),
    __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_cedabca795054720507c")
  ],
  eliminateTemplates: [
    __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_c25536441e7cb1d04a68"),
    __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_613e5c2b2ea390a3400d"),
    __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_9cc65314121c3cc17211")
  ]
};
const DUST_EVIDENCE = makeProfileEntry({
  field: 'dust_profile', path: 'dustProfile', label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_18213d067a58bdb27f29"),
  profiles: getDustProfiles, evaluator: evaluateDustEvidence,
  notes: getDustHobbyLabels
});
const MATERIAL_EVIDENCE = makeProfileEntry({
  field: 'material_profile', path: 'materialProfile', label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_417cac3597812e93560c"),
  profiles: getMaterialProfiles, evaluator: evaluateMaterialEvidence,
  notes: suspect => getMaterialDossierNotes(suspect).map(note => note.text)
});
const PARTIAL_FINGERPRINT_EVIDENCE = {
  role: 'red_herring',
  label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_07613e0a54679cc6d02d"),
  clueTemplates: [
    __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_cf6b2e25c8b98a7ca123"),
    __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_e0fcdc43b2c6676284b1"),
    __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_c804e985af2ce06e73fe")
  ]
};

export const DEDUCTION_EVIDENCE_REGISTRY = {
  hair_color: {
    role: 'hard_filter',
    label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_9be86624f7f43b815b19"),
    suspectField: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_98797ce198c159da8eb2"),
    normalizeEvidence: normalizeHairColor,
    matches: (a, b) => compareScalar(normalizeHairColor, a, b),
    clueTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_78ec0c8c1218d39ef9ed"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_11e6d95623901af7dc7c"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_330cf8df6426fbdd640c")
    ],
    eliminateTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_2af7028904e113e7e46e"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_0e626f6a4bdb5d1653b1"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_db64a65670f8bf3d9bac")
    ]
  },
  blood_type: {
    role: 'hard_filter',
    label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_95d92096f95755553f37"),
    suspectField: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_48bfd6566d2457b173a6"),
    normalizeEvidence: normalizeBloodType,
    matches: (a, b) => compareScalar(normalizeBloodType, a, b),
    clueTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_5b816ac554cc586cc982"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_3c18c9065627f7709e57"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_c9c4aed10c9a0e6cb422")
    ],
    eliminateTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_abb11b5eea97428c661a"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_6b5595807cb723e11dc4"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_f0e22b68aade1de3f8d9")
    ]
  },
  biological_sex: DNA_PROFILE_EVIDENCE,
  dna_gender: DNA_PROFILE_EVIDENCE,
  dna_profile: DNA_PROFILE_EVIDENCE,
  fingerprint_pattern: {
    role: 'hard_filter',
    label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_0de0d411a6eb00eb2a5a"),
    suspectField: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_4cfb3f3e669854b41244"),
    normalizeEvidence: normalizeText,
    matches: (a, b) => compareScalar(normalizeText, a, b, ['loop', 'whorl', 'arch']),
    clueTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_b079b5f2631ba0e8bb3f"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_889d3daf186243268f04"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_07d55f41a6fedca5c32e")
    ],
    eliminateTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_fe2048ab1ef780fd0e55"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_81192af7a948800018a4"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_62464e124c88a7b4e468")
    ]
  },
  shoe_size_category: {
    role: 'hard_filter',
    label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_3e123d9791e7963a31ef"),
    suspectField: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_ea7f93949caac0bcf7f2"),
    normalizeEvidence: normalizeText,
    matches: (a, b) => compareScalar(normalizeText, a, b, ['small', 'medium', 'large']),
    clueTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_bb283c6e9b877173c09c"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_b40d9cfcfd46b7a9ec12"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_cac2ffdabcf2ed84beac")
    ],
    eliminateTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_acbbfda3d11c93a8dffa"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_56a26e59a31c44899ab0"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_06114432a8a72bdbf7fa")
    ]
  },
  handedness: {
    role: 'hard_filter',
    label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_ff71f64490560b300afa"),
    suspectField: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_40f2649cd4d50920c630"),
    normalizeEvidence: normalizeHandedness,
    matches: (a, b) => compareScalar(normalizeHandedness, a, b, ['left', 'right']),
    clueTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_c7907bb7c7fde5f11824"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_52829fc1c3f787d61af0"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_9983ae133ac748a8be38")
    ],
    eliminateTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_3c96a56a9322e53a67b9"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_dcca25bca8899315370f"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_8c8de00c639807c94492")
    ]
  },
  dust_profile: DUST_EVIDENCE,
  dustProfile: DUST_EVIDENCE,
  microtrace: DUST_EVIDENCE,
  microtrace_profile: DUST_EVIDENCE,
  material_profile: MATERIAL_EVIDENCE,
  materialProfile: MATERIAL_EVIDENCE,

  // Legacy fiber values remain descriptive. No migration or rule guessing.
  fiber_profile: {
    role: 'soft_clue',
    label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_c734a6f0b9822dccce03"),
    normalizeEvidence: normalizeText,
    extract: raw => {
      const value = normalizeText(readEvidenceValue(raw));
      const parts = value.replace(/_fib(?:er|re)$/i, '').split('_').filter(Boolean);
      const paired = parts.length === 2;
      return {
        value: readableIdentifier(value) || __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_b764cdc0eab713746721"),
        color: paired ? parts[0] : '',
        material: paired ? parts[1] : ''
      };
    },
    clueTemplates: [__dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_c721d2b3e77f6b512de9")],
    redHerringTemplates: []
  },
  fingerprint: PARTIAL_FINGERPRINT_EVIDENCE,
  fingerprint_partial: PARTIAL_FINGERPRINT_EVIDENCE,
  partial_fingerprint: PARTIAL_FINGERPRINT_EVIDENCE,
  toolmark: {
    role: 'future_filter',
    label: __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_b46e5080f8d11be5adcc"),
    clueTemplates: [
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_1d88d5187698b05fc105"),
      __dialogueText("scenes/CSI/DeductionEvidenceRegistry.js", "t_7469825a052f0b3f0045")
    ]
  }
};
