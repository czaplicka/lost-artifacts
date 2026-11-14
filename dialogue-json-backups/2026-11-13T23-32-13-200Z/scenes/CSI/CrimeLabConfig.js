// Scene routing only.
// CrimeLabManager owns case assignment and random draws.

export const CSI_RED_HERRING_POOL = [
  {
    id: 'partial_fingerprint',
    label: 'Partial Fingerprint',
    minigame: 'FingerprintScene',
    evidenceType: 'fingerprint_partial',
    correctValue: 'partial_loop_left_thumb',
    clueType: 'red_herring',
    clueText:
      'A partial fingerprint was recovered, but too little remains for a reliable match.',
    isRedHerring: true
  }
];

// Compatibility export, not the pool for useful trace analyses.
export const CSI_TRACE_GAME_POOL = CSI_RED_HERRING_POOL;

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

// Different minigames can examine the same evidence type.
// The chosen variant is stored with the case assignment.
export const CSI_DUST_ANALYSIS_VARIANTS = [
  {
    minigame: 'ToolmarkAnalysisScene',
    label: 'Microtrace Analysis'
  },
  {
    minigame: 'ChemicalResidueScene',
    label: 'Chemical Residue Analysis'
  }
];

const ALIASES = new Map();

function register(sceneKey, aliases) {
  for (const alias of aliases) {
    const key = alias.trim().toLowerCase();

    if (ALIASES.has(key)) {
      throw new Error(`Duplicate CSI scene alias: ${alias}`);
    }

    ALIASES.set(key, sceneKey);
  }
}

register('HairAnalysisScene', [
  'hair', 'hair_color', 'hair_analysis', 'HairAnalysisScene'
]);

register('BloodAnalysisScene', [
  'blood', 'blood_type', 'bloodtype',
  'blood_analysis', 'BloodAnalysisScene'
]);

register('DnaGenderScene', [
  'dna', 'dna_gender', 'dna_profile', 'dna_analysis',
  'DnaGenderScene', 'gender_profile',
  'biological_sex', 'biologicalSex'
]);

register('FingerprintPatternScene', [
  'fingerprint', 'fingerprints', 'fingerprint_pattern',
  'fingerprint_scene', 'FingerprintPatternScene', 'ridge_pattern'
]);

register('FingerprintScene', [
  'FingerprintScene', 'fingerprint_partial', 'partial_fingerprint'
]);

register('ShoeprintScene', [
  'shoeprint', 'shoe_print', 'ShoeprintScene', 'shoeprint_profile',
  'shoe_size', 'shoe_size_category', 'shoeSizeCategory'
]);

register('ToolmarkAnalysisScene', [
  'handedness', 'dominant_hand', 'dominantHand',
  'ToolmarkAnalysisScene',
  'dust', 'dust_profile', 'dustProfile', 'microtrace',
  'microtrace_profile', 'microtrace_analysis'
]);

register('ChemicalResidueScene', [
  'ChemicalResidueScene',
  'chemical_residue',
  'chemical_residue_analysis',
  'chemical_analysis'
]);

register('MaterialAnalysisScene', [
  'material', 'material_profile', 'materialProfile',
  'material_analysis', 'MaterialAnalysisScene'
]);

register('FiberAnalysisScene', [
  'fiber', 'fibre', 'fiber_analysis', 'FiberAnalysisScene',
  'fiber_profile', 'fiberProfile', 'fabric_material', 'fabricMaterial'
]);

const RETIRED_TYPES = new Set([
  'toolmark', 'toolmarks', 'tool_mark',
  'toolmark_analysis', 'toolmark_profile',
  'skill', 'skills', 'primary_skill', 'primaryskill', 'skill_analysis'
]);

const DUST_TYPES = new Set([
  'dust',
  'dust_profile',
  'dustprofile',
  'microtrace',
  'microtrace_profile',
  'microtrace_analysis'
]);

const DUST_SCENES = new Set(
  CSI_DUST_ANALYSIS_VARIANTS.map(entry => entry.minigame)
);

export function normalizeMiniGameKey(rawKey, evidenceType = '') {
  const originalKey = String(rawKey ?? '').trim();
  const key = originalKey.toLowerCase();
  const type = String(evidenceType ?? '').trim().toLowerCase();

  if (RETIRED_TYPES.has(type) || (!type && RETIRED_TYPES.has(key))) {
    return null;
  }

  const explicitScene = ALIASES.get(key);

  // Preserve a supported, explicitly assigned dust-analysis variant.
  // Without this exception, dust_profile would always route to Toolmark.
  if (
    DUST_TYPES.has(type) &&
    explicitScene &&
    DUST_SCENES.has(explicitScene)
  ) {
    return explicitScene;
  }

  // Other evidence types retain semantic routing.
  if (type && ALIASES.has(type)) {
    return ALIASES.get(type);
  }

  return explicitScene || originalKey || null;
}