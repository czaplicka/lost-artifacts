// CrimeLabConfig.js
export const CSI_TRACE_GAME_POOL = [
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
    label: 'Fingerprint Comparison',
    minigame: 'FingerprintScene',
    evidenceType: 'fingerprint_partial',
    correctValue: 'partial_loop_left_thumb',
    clueType: 'red_herring',
    clueText: 'A partial fingerprint was recovered, but too little remains for a reliable match.',
    isRedHerring: true
  },
  {
    id: 'lock_cylinder_marks',
    label: 'Toolmark Analysis',
    minigame: 'ToolmarkAnalysisScene',
    evidenceType: 'toolmark_profile',
    correctValue: 'triple_rake_left_handed',
    clueType: 'red_herring',
    clueText: 'The lock contains several tool marks, but no usable manufacturer profile.',
    isRedHerring: true
  }
];

export function normalizeMiniGameKey(rawKey, evidenceType = '') {
  const key = String(rawKey || '').trim().toLowerCase();
  const type = String(evidenceType || '').trim().toLowerCase();

  const aliases = {
      dna: 'HairAnalysisScene',
      dna_analysis: 'HairAnalysisScene',
      dnaanalysisscene: 'HairAnalysisScene',

      hair: 'HairAnalysisScene',
      hair_analysis: 'HairAnalysisScene',
      hairanalysisscene: 'HairAnalysisScene',

      fiber: 'FiberAnalysisScene',
      fibre: 'FiberAnalysisScene',
      fiber_analysis: 'FiberAnalysisScene',
      fiberanalysisscene: 'FiberAnalysisScene',
      fiber_profile: 'FiberAnalysisScene',

      fingerprint: 'FingerprintScene',
      fingerprints: 'FingerprintScene',
      fingerprint_scene: 'FingerprintScene',
      fingerprintscene: 'FingerprintScene',
      fingerprint_partial: 'FingerprintScene',

      shoeprint: 'ShoeprintScene',
      shoe_print: 'ShoeprintScene',
      shoeprintscene: 'ShoeprintScene',
      shoeprint_profile: 'ShoeprintScene',

      toolmark: 'ToolmarkAnalysisScene',
      toolmarks: 'ToolmarkAnalysisScene',
      toolmark_analysis: 'ToolmarkAnalysisScene',
      toolmarkanalysisscene: 'ToolmarkAnalysisScene',
      toolmark_profile: 'ToolmarkAnalysisScene'
  };

  return aliases[key] || aliases[type] || rawKey || null;
}