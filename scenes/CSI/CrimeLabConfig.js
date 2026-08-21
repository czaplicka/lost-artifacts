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

    fingerprint: 'FingerprintScene',
    fingerprints: 'FingerprintScene',
    fingerprint_pattern: 'FingerprintScene',
    fingerprint_scene: 'FingerprintScene',
    fingerprintscene: 'FingerprintScene',
    fingerprint_partial: 'FingerprintScene',

    fiber: 'FiberAnalysisScene',
    fibre: 'FiberAnalysisScene',
    fiber_analysis: 'FiberAnalysisScene',
    fiberanalysisscene: 'FiberAnalysisScene',
    fiber_profile: 'FiberAnalysisScene'
  };

  return aliases[key] || aliases[type] || rawKey || null;
}