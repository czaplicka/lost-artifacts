export const CSI_RED_HERRING_POOL = [
  { id: 'blue_cotton_fiber', label: 'Fiber Analysis', minigame: 'FiberAnalysisScene', evidenceType: 'fiber_profile', correctValue: 'blue_cotton_fiber', clueType: 'red_herring', clueText: 'A blue cotton fiber was recovered from the crime scene.', isRedHerring: true },
  { id: 'partial_fingerprint', label: 'Partial Fingerprint', minigame: 'FingerprintScene', evidenceType: 'fingerprint_partial', correctValue: 'partial_loop_left_thumb', clueType: 'red_herring', clueText: 'A partial fingerprint was recovered, but too little remains for a reliable match.', isRedHerring: true },
  { id: 'lock_cylinder_marks', label: 'Unusable Tool Marks', minigame: 'ToolmarkAnalysisScene', evidenceType: 'toolmark_profile', correctValue: 'triple_rake_left_handed', clueType: 'red_herring', clueText: 'The lock contains several tool marks, but no usable manufacturer profile.', isRedHerring: true }
];
export const CSI_TRACE_GAME_POOL = CSI_RED_HERRING_POOL;
export const CSI_MAIN_GAME_POOL = [
  { id: 'hair_color', label: 'Hair Analysis', minigame: 'HairAnalysisScene', evidenceType: 'hair_color', clueType: 'main', isRedHerring: false },
  { id: 'blood_type', label: 'Blood Type Analysis', minigame: 'BloodAnalysisScene', evidenceType: 'blood_type', clueType: 'main', isRedHerring: false },
  { id: 'dna_gender', label: 'DNA Gender Profiling', minigame: 'DnaGenderScene', evidenceType: 'dna_gender', clueType: 'main', isRedHerring: false },
  { id: 'fingerprint_pattern', label: 'Fingerprint Pattern Analysis', minigame: 'FingerprintPatternScene', evidenceType: 'fingerprint_pattern', clueType: 'main', isRedHerring: false }
];
export function normalizeMiniGameKey(rawKey, evidenceType = '') {
  const key = String(rawKey || '').trim().toLowerCase();
  const type = String(evidenceType || '').trim().toLowerCase();
  const aliases = {
    hair: 'HairAnalysisScene', hair_color: 'HairAnalysisScene', hair_analysis: 'HairAnalysisScene', hairanalysisscene: 'HairAnalysisScene',
    blood: 'BloodAnalysisScene', blood_type: 'BloodAnalysisScene', bloodtype: 'BloodAnalysisScene', blood_analysis: 'BloodAnalysisScene', bloodanalysisscene: 'BloodAnalysisScene',
    dna: 'DnaGenderScene', dna_gender: 'DnaGenderScene', dna_profile: 'DnaGenderScene', dna_analysis: 'DnaGenderScene', dnagenderscene: 'DnaGenderScene', gender_profile: 'DnaGenderScene', biological_sex: 'DnaGenderScene',
    fingerprint: 'FingerprintPatternScene', fingerprints: 'FingerprintPatternScene', fingerprint_pattern: 'FingerprintPatternScene', fingerprint_scene: 'FingerprintPatternScene', fingerprintpatternscene: 'FingerprintPatternScene', ridge_pattern: 'FingerprintPatternScene',
    fingerprintscene: 'FingerprintScene', fingerprint_partial: 'FingerprintScene', partial_fingerprint: 'FingerprintScene',
    shoeprint: 'ShoeprintScene', shoe_print: 'ShoeprintScene', shoeprintscene: 'ShoeprintScene', shoeprint_profile: 'ShoeprintScene', shoe_size: 'ShoeprintScene', shoe_size_category: 'ShoeprintScene', shoesizecategory: 'ShoeprintScene',
    handedness: 'ToolmarkAnalysisScene', dominant_hand: 'ToolmarkAnalysisScene',
    toolmark: 'ToolmarkAnalysisScene', toolmarks: 'ToolmarkAnalysisScene', tool_mark: 'ToolmarkAnalysisScene', toolmark_analysis: 'ToolmarkAnalysisScene', toolmarkanalysisscene: 'ToolmarkAnalysisScene', toolmark_profile: 'ToolmarkAnalysisScene',
    skill: 'ToolmarkAnalysisScene', skills: 'ToolmarkAnalysisScene', primary_skill: 'ToolmarkAnalysisScene', primaryskill: 'ToolmarkAnalysisScene', skill_analysis: 'ToolmarkAnalysisScene',
    fiber: 'FiberAnalysisScene', fibre: 'FiberAnalysisScene', fiber_analysis: 'FiberAnalysisScene', fiberanalysisscene: 'FiberAnalysisScene', fiber_profile: 'FiberAnalysisScene', fabric_material: 'FiberAnalysisScene', fabricmaterial: 'FiberAnalysisScene'
  };
  return aliases[key] || aliases[type] || rawKey || null;
}