export const CSI_RED_HERRING_POOL = [
  {
    id: 'blue_cotton_fiber',
    label: 'Fiber Analysis',
    minigame: 'FiberAnalysisScene',
    evidenceType: 'fiber_profile',
    correctValue: 'blue_cotton_fiber',
    clueType: 'red_herring',
    clueText: 'A blue cotton fiber was recovered from the crime scene.',
    isRedHerring: true
  },

  {
    id: 'partial_fingerprint',
    label: 'Partial Fingerprint',
    minigame: 'FingerprintScene',
    evidenceType: 'fingerprint_partial',
    correctValue: 'partial_loop_left_thumb',
    clueType: 'red_herring',
    clueText: 'A partial fingerprint was recovered, but too little remains for a reliable match.',
    isRedHerring: true
  },

  {
    id: 'lock_cylinder_marks',
    label: 'Unusable Tool Marks',
    minigame: 'ToolmarkAnalysisScene',
    evidenceType: 'toolmark_profile',
    correctValue: 'triple_rake_left_handed',
    clueType: 'red_herring',
    clueText: 'The lock contains several tool marks, but no usable manufacturer profile.',
    isRedHerring: true
  }
];


/*
 * Temporary compatibility export.
 *
 * Do not use this pool to randomly assign real lab evidence anymore.
 * Real evidence must come from gameState.identityEvidence
 * and gameState.traceEvidence.
 */
export const CSI_TRACE_GAME_POOL = CSI_RED_HERRING_POOL;


/*
 * The four MAIN clue mini-games (identity evidence).
 * These are the games that narrow the suspect pool via
 * hard biological/physical traits recorded on suspect.json.
 * Weighted/random correctValue selection happens in the
 * suspect generator, not here.
 */
export const CSI_MAIN_GAME_POOL = [
  {
    id: 'hair_color',
    label: 'Hair Analysis',
    minigame: 'HairAnalysisScene',
    evidenceType: 'hair_color',
    clueType: 'main',
    isRedHerring: false
  },
  {
    id: 'blood_type',
    label: 'Blood Type Analysis',
    minigame: 'BloodAnalysisScene',
    evidenceType: 'blood_type',
    clueType: 'main',
    isRedHerring: false
  },
  {
    id: 'dna_gender',
    label: 'DNA Gender Profiling',
    minigame: 'DnaGenderScene',
    evidenceType: 'dna_gender',
    clueType: 'main',
    isRedHerring: false
  },
  {
    id: 'fingerprint_pattern',
    label: 'Fingerprint Pattern Analysis',
    minigame: 'FingerprintPatternScene',
    evidenceType: 'fingerprint_pattern',
    clueType: 'main',
    isRedHerring: false
  }
];


export function normalizeMiniGameKey(
  rawKey,
  evidenceType = ''
) {
  const key = String(rawKey || '')
    .trim()
    .toLowerCase();

  const type = String(evidenceType || '')
    .trim()
    .toLowerCase();

  const aliases = {
    hair: 'HairAnalysisScene',
    hair_color: 'HairAnalysisScene',
    hair_analysis: 'HairAnalysisScene',
    hairanalysisscene: 'HairAnalysisScene',

    shoeprint: 'ShoeprintScene',
    shoe_print: 'ShoeprintScene',
    shoeprintscene: 'ShoeprintScene',
    shoeprint_profile: 'ShoeprintScene',
    shoe_size: 'ShoeprintScene',
    shoe_size_category: 'ShoeprintScene',

    handedness: 'ToolmarkAnalysisScene',
    dominant_hand: 'ToolmarkAnalysisScene',
    toolmark: 'ToolmarkAnalysisScene',
    toolmarks: 'ToolmarkAnalysisScene',
    tool_mark: 'ToolmarkAnalysisScene',
    toolmark_analysis: 'ToolmarkAnalysisScene',
    toolmarkanalysisscene: 'ToolmarkAnalysisScene',
    toolmark_profile: 'ToolmarkAnalysisScene',

    // Partial fingerprint stays on the OLD scene — this is the
    // red herring clue (too little ridge detail for a real match).
    fingerprint_partial: 'FingerprintScene',
    partial_fingerprint: 'FingerprintScene',

    // Everything else fingerprint-related is the MAIN pattern game
    // (Loop / Whorl / Arch classification).
    fingerprint: 'FingerprintPatternScene',
    fingerprints: 'FingerprintPatternScene',
    fingerprint_pattern: 'FingerprintPatternScene',
    fingerprint_scene: 'FingerprintPatternScene',
    fingerprintscene: 'FingerprintPatternScene',
    fingerprintpatternscene: 'FingerprintPatternScene',
    ridge_pattern: 'FingerprintPatternScene',

    fiber: 'FiberAnalysisScene',
    fibre: 'FiberAnalysisScene',
    fiber_analysis: 'FiberAnalysisScene',
    fiberanalysisscene: 'FiberAnalysisScene',
    fiber_profile: 'FiberAnalysisScene',

    blood: 'BloodAnalysisScene',
    blood_type: 'BloodAnalysisScene',
    bloodtype: 'BloodAnalysisScene',
    blood_analysis: 'BloodAnalysisScene',
    bloodanalysisscene: 'BloodAnalysisScene',

    dna: 'DnaGenderScene',
    dna_gender: 'DnaGenderScene',
    dna_profile: 'DnaGenderScene',
    dna_analysis: 'DnaGenderScene',
    dnagenderscene: 'DnaGenderScene',
    gender_profile: 'DnaGenderScene'
  };

  return aliases[key] || aliases[type] || rawKey || null;
}