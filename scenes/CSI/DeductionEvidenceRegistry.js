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

    formatEvidence: raw => findProfile(raw)?.label || readableIdentifier(readEvidenceValue(raw)) || 'Unknown',
    formatSuspect: value => {
      const suspect = value && typeof value === 'object' &&
        Object.prototype.hasOwnProperty.call(value, path) ? value : {[path]: value};
      return notes(suspect).join('; ');
    },
    extract: raw => {
      const profile = findProfile(raw);
      return {
        value: profile?.label || readableIdentifier(readEvidenceValue(raw)) || 'Unknown',
        profileId: normalizeEvidence(raw),
        label: profile?.label || 'Unknown',
        description: profile?.report || profile?.labText || ''
      };
    },
    clueTemplates: ['Laboratory result: {value}.'],
    // Exclusion wording is not generated for the player by this registry.
    eliminateTemplates: []
  };
}

const DNA_PROFILE_EVIDENCE = {
  role: 'hard_filter',
  label: 'DNA PROFILE',
  suspectField: 'restrictedProfile.forensicAttributes.biological_sex.value',
  normalizeEvidence: normalizeDnaProfile,
  matches: (a, b) => compareScalar(normalizeDnaProfile, a, b, ['female', 'male']),
  clueTemplates: [
    'The biological trace indicates a {value} DNA profile.',
    'The lab isolated a {value} biological profile.',
    'The DNA profile points to a {value} suspect.'
  ],
  eliminateTemplates: [
    '{name} does not match the biological profile.',
    '{name} is excluded by the DNA result.',
    'The DNA says this is not {name}. DNA is rarely this blunt.'
  ]
};
const DUST_EVIDENCE = makeProfileEntry({
  field: 'dust_profile', path: 'dustProfile', label: 'MICROTRACE ANALYSIS',
  profiles: getDustProfiles, evaluator: evaluateDustEvidence,
  notes: getDustHobbyLabels
});
const MATERIAL_EVIDENCE = makeProfileEntry({
  field: 'material_profile', path: 'materialProfile', label: 'MATERIAL ANALYSIS',
  profiles: getMaterialProfiles, evaluator: evaluateMaterialEvidence,
  notes: suspect => getMaterialDossierNotes(suspect).map(note => note.text)
});
const PARTIAL_FINGERPRINT_EVIDENCE = {
  role: 'red_herring',
  label: 'PARTIAL FINGERPRINT',
  clueTemplates: [
    'A partial print was recovered, but it is too smudged for comparison.',
    'The print is incomplete. The thief apparently respects forensic drama.',
    'Fingerprint fragment: half a clue, zero conclusions.'
  ]
};

export const DEDUCTION_EVIDENCE_REGISTRY = {
  hair_color: {
    role: 'hard_filter',
    label: 'HAIR COLOR',
    suspectField: 'restrictedProfile.forensicAttributes.hair_color.value',
    normalizeEvidence: normalizeHairColor,
    matches: (a, b) => compareScalar(normalizeHairColor, a, b),
    clueTemplates: [
      'The recovered hair is {value}.',
      'Microscope result: {value} hair.',
      'The recovered strand is {value}. The microscope requests applause.'
    ],
    eliminateTemplates: [
      '{name} is ruled out: {suspectValue} does not match {value}.',
      '{name} has left the hair chat.',
      'No match for {name}. Their follicles have an alibi.'
    ]
  },
  blood_type: {
    role: 'hard_filter',
    label: 'BLOOD TYPE',
    suspectField: 'restrictedProfile.forensicAttributes.blood_type.value',
    normalizeEvidence: normalizeBloodType,
    matches: (a, b) => compareScalar(normalizeBloodType, a, b),
    clueTemplates: [
      'The blood sample is type {value}.',
      'Lab result: blood type {value}. The centrifuge is feeling dramatic.',
      'The trace sample confirms blood type {value}.'
    ],
    eliminateTemplates: [
      '{name} has blood type {suspectValue}, not {value}. Ruled out.',
      '{name} is cleared by the blood sample.',
      'The blood says no. Politely, but firmly.'
    ]
  },
  biological_sex: DNA_PROFILE_EVIDENCE,
  dna_gender: DNA_PROFILE_EVIDENCE,
  dna_profile: DNA_PROFILE_EVIDENCE,
  fingerprint_pattern: {
    role: 'hard_filter',
    label: 'FINGERPRINT',
    suspectField: 'restrictedProfile.forensicAttributes.fingerprint_pattern.value',
    normalizeEvidence: normalizeText,
    matches: (a, b) => compareScalar(normalizeText, a, b, ['loop', 'whorl', 'arch']),
    clueTemplates: [
      'The recovered fingerprint has a {value} pattern.',
      'Print classification: {value}. The ridges have spoken.',
      'Fingerprint profile identified: {value}.'
    ],
    eliminateTemplates: [
      '{name} has a {suspectValue} pattern, not {value}. Ruled out.',
      '{name} does not match the fingerprint classification.',
      'The print does not fit {name}. The ridges remain unconvinced.'
    ]
  },
  shoe_size_category: {
    role: 'hard_filter',
    label: 'SHOE SIZE',
    suspectField: 'restrictedProfile.forensicAttributes.shoe_size_category.value',
    normalizeEvidence: normalizeText,
    matches: (a, b) => compareScalar(normalizeText, a, b, ['small', 'medium', 'large']),
    clueTemplates: [
      'The footprint indicates {value}-category footwear.',
      'The sole print says {value}. The floor has spoken.',
      'Footwear profile: {value}. Not subtle, but effective.'
    ],
    eliminateTemplates: [
      '{name} wears {suspectValue} shoes, not {value}. Ruled out.',
      '{name} cannot fill the footprint. Literally.',
      'The shoe does not fit, and we are not trying it on anyone.'
    ]
  },
  handedness: {
    role: 'hard_filter',
    label: 'DOMINANT HAND',
    suspectField: 'restrictedProfile.forensicAttributes.handedness.value',
    normalizeEvidence: normalizeHandedness,
    matches: (a, b) => compareScalar(normalizeHandedness, a, b, ['left', 'right']),
    clueTemplates: [
      'The contact pattern indicates {value}-handed use.',
      'The trace suggests the intruder used their {value} hand.',
      'Recorded contact pattern: {value}-handed use.'
    ],
    eliminateTemplates: [
      '{name} is {suspectValue}-handed, not {value}-handed. Ruled out.',
      '{name} does not match the recorded dominant hand.',
      'The contact pattern rejects {name}. Handily.'
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
    label: 'FIBER ANALYSIS',
    normalizeEvidence: normalizeText,
    extract: raw => {
      const value = normalizeText(readEvidenceValue(raw));
      const parts = value.replace(/_fib(?:er|re)$/i, '').split('_').filter(Boolean);
      const paired = parts.length === 2;
      return {
        value: readableIdentifier(value) || 'Unknown',
        color: paired ? parts[0] : '',
        material: paired ? parts[1] : ''
      };
    },
    clueTemplates: ['Legacy fibre analysis: {value}.'],
    redHerringTemplates: []
  },
  fingerprint: PARTIAL_FINGERPRINT_EVIDENCE,
  fingerprint_partial: PARTIAL_FINGERPRINT_EVIDENCE,
  partial_fingerprint: PARTIAL_FINGERPRINT_EVIDENCE,
  toolmark: {
    role: 'future_filter',
    label: 'LEGACY TOOLMARK REPORT',
    clueTemplates: [
      'Archived toolmark description: {value}.',
      'The archived report records: {value}.'
    ]
  }
};
