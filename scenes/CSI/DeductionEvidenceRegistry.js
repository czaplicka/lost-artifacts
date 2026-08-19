export const DEDUCTION_EVIDENCE_REGISTRY = {
  hair_color: {
    role: 'hard_filter',
    suspectField: 'restrictedProfile.forensicAttributes.hair_color.value',
    normalizeEvidence: (value) => value === 'blond' ? 'blonde' : value,
    matches: (suspectValue, evidenceValue) =>
      suspectValue === evidenceValue,

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

  shoe_size_category: {
    role: 'hard_filter',
    suspectField: 'restrictedProfile.forensicAttributes.shoe_size_category.value',
    normalizeEvidence: (value) => value,
    matches: (suspectValue, evidenceValue) =>
      suspectValue === evidenceValue,

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

  fiber_profile: {
    role: 'soft_clue',
    extract: (value) => {
      const [color, material] = String(value)
        .replace(/_fiber$/i, '')
        .split('_');

      return { color, material };
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