export function artifactDisplayName(artifact, fallback = '') {
  if (typeof artifact === 'string' && artifact.trim()) return artifact.trim();
  if (artifact && typeof artifact === 'object' && !Array.isArray(artifact)) {
    for (const value of [artifact.label, artifact.name]) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return typeof fallback === 'string' ? fallback : '';
}

export function missionArtifactName(mission, fallback = '') {
  const name = artifactDisplayName(mission?.artifactName, fallback);
  return artifactDisplayName(mission?.artifact, name);
}
