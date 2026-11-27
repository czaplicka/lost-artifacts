import {
  sceneRegistry as previousRegistry,
  SCENE_TIERS as previousTiers
} from './sceneRegistryBeforeCaseRoom.js';

export * from './sceneRegistryBeforeCaseRoom.js';

export const SCENE_TIERS = Object.fromEntries(
  Object.entries(previousTiers).map(([tier, keys]) => [
    tier,
    tier === 'TIER_1'
      ? [...new Set([...keys, 'CaseRoomScene'])]
      : [...keys]
  ])
);

export const sceneRegistry = {
  ...previousRegistry,

  CrimeCityScene: () =>
    import('./scenes/CrimeCityWithCaseRoom.js')
      .then(m => m.CrimeCityScene),

  CrimeLabScene: () =>
    import('./scenes/CSI/CrimeLabSceneWithCaseRoom.js')
      .then(m => m.CrimeLabScene),

  CaseRoomScene: () =>
    import('./scenes/CaseRoomScene.js')
      .then(m => m.CaseRoomScene),

  HypothesisScene: () =>
    import('./scenes/HypothesisInCaseRoomScene.js')
      .then(m => m.HypothesisScene),

  PhoneCallScene: () =>
    import('./scenes/LegacyLabCallScene.js')
      .then(m => m.PhoneCallScene)
};

export function tierOf(key) {
  return Object.entries(SCENE_TIERS)
    .find(([, keys]) => keys.includes(key))?.[0] || null;
}