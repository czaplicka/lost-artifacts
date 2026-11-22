import { getArtifactCasePart, scalarCasePart } from './crimeCaseKey.js';

// Runtime scene IDs are deliberately excluded: both consumers use mission.scene.
export function getCrimeSceneVisitKey(state) {
  const mission = state?.currentMission || {};
  const sceneId = scalarCasePart(mission.scene) ?? 'unknown_scene';
  const missionId = scalarCasePart(mission.id);
  if (missionId !== null) return `${sceneId}_${missionId}`;
  const city = scalarCasePart(mission.city) ?? scalarCasePart(state?.crimeCityId) ??
    scalarCasePart(state?.currentCityId) ?? 'unknown';
  const artifact = getArtifactCasePart(mission.artifact ?? state?.currentArtifact, 'artifact');
  return `${sceneId}_${city}_${artifact}`;
}
