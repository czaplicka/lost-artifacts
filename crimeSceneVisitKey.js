// Shared identity for the crime-scene visit, used by the minigame and city map.
// Runtime scene IDs are deliberately excluded: they may be overridden.
export function getCrimeSceneVisitKey(state) {
  const mission = state?.currentMission || {};
  const sceneId = mission.scene || 'unknown_scene';
  const missionId = mission.id;
  const missionCity = mission.city || state?.crimeCityId || state?.currentCityId || 'unknown';
  const artifact = mission.artifact || state?.currentArtifact || 'artifact';
  if (missionId) return `${sceneId}_${missionId}`;
  return `${sceneId}_${missionCity}_${artifact}`;
}