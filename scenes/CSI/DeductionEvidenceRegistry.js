function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeHairColor(value) {
  const normalized = normalizeText(value);

  if (normalized === 'blond') {
    return 'blonde';
  }

  return normalized;
}

function normalizeBloodType(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

export const DEDUCTION_EVIDENCE_REGISTRY = {
  hair_color: {
    role: 'hard_filter',

    suspectField:
      'restrictedProfile.forensicAttributes.hair_color.value',

    normalizeEvidence: normalizeHairColor,

    matches: (suspectValue, evidenceValue) =>
      normalizeHairColor(suspectValue) ===
      normalizeHairColor(evidenceValue),

    clueTemplates: [
      'The recovered hair is {value}. {name} has {suspectValue} hair.',
      'Microscope result: {value} hair. {name}: {suspectValue}.',
      'Hair does not lie. It does, however, clog the drain.'
    ],

    eliminateTemplates: [
      '{name} is ruled out: {suspectValue} does not match {value}.',
      '{name} has left the hair chat.',
      'No match for {name}. Their follicles have an alibi.'
    ]
  },

  blood_type: {
    role: 'hard_filter',

    suspectField:
      'restrictedProfile.forensicAttributes.blood_type.value',

    normalizeEvidence: normalizeBloodType,

    matches: (suspectValue, evidenceValue) =>
      normalizeBloodType(suspectValue) ===
      normalizeBloodType(evidenceValue),

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

  biological_sex: {
    role: 'hard_filter',

    suspectField:
      'restrictedProfile.forensicAttributes.biological_sex.value',

    normalizeEvidence: normalizeText,

    matches: (suspectValue, evidenceValue) =>
      normalizeText(suspectValue) ===
      normalizeText(evidenceValue),

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
  },

  fingerprint_pattern: {
    role: 'hard_filter',

    suspectField:
      'restrictedProfile.forensicAttributes.fingerprint_pattern.value',

    normalizeEvidence: normalizeText,

    matches: (suspectValue, evidenceValue) =>
      normalizeText(suspectValue) ===
      normalizeText(evidenceValue),

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

    suspectField:
      'restrictedProfile.forensicAttributes.shoe_size_category.value',

    normalizeEvidence: normalizeText,

    matches: (suspectValue, evidenceValue) =>
      normalizeText(suspectValue) ===
      normalizeText(evidenceValue),

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

    suspectField:
      'restrictedProfile.forensicAttributes.handedness.value',

    normalizeEvidence: normalizeText,

    matches: (suspectValue, evidenceValue) =>
      normalizeText(suspectValue) ===
      normalizeText(evidenceValue),

    clueTemplates: [
      'Tool marks indicate {value}-handed use.',
      'The marks suggest the thief worked with their {value} hand.',
      'The lock was attacked from a {value}-handed angle. The lock is filing a complaint.'
    ],

    eliminateTemplates: [
      '{name} is {suspectValue}-handed, not {value}-handed. Ruled out.',
      '{name} used the wrong dominant hand for these marks.',
      'The tool marks reject {name}. Handily.'
    ]
  },

  fiber_profile: {
    role: 'soft_clue',

    extract: (value) => {
      const [color, material] = String(value)
        .replace(/_fiber$/i, '')
        .split('_');

      return {
        color,
        material
      };
    },

    clueTemplates: [
      'A {color} {material} fibre was recovered near the display case.',
      'Trace lab found {color} {material}. The spectrograph wants applause.',
      'A {color} {material} thread: scientifically valid, dramatically tiny.'
    ],

    redHerringTemplates: [
      'The fibre is common enough to be unhelpful. The lab still printed a certificate.',
      'Useful for identifying fabric. Less useful for identifying a human.',
      'The fibre narrows the field from “everyone” to “a disappointing number of people.”'
    ]
  },

  fingerprint: {
    role: 'red_herring',

    clueTemplates: [
      'A partial print was recovered, but it is too smudged for comparison.',
      'The print is incomplete. The thief apparently respects forensic drama.',
      'Fingerprint fragment: half a clue, zero conclusions.'
    ]
  },

  toolmark: {
    role: 'future_filter',

    clueTemplates: [
      'Toolmarks indicate {value}. Someone came prepared.',
      'The display case bears marks consistent with {value}.',
      'The lock has opinions. Specifically, about {value}.'
    ]
  }
};