let suspectData = null;

export async function loadSuspectData(path = 'assets/data/suspectData.json') {
  if (suspectData) return suspectData;

  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(
      `suspectDataProvider: failed to load "${path}" (status ${response.status}).`
    );
  }

  suspectData = await response.json();

  return suspectData;
}

export function getSuspectData() {
  if (!suspectData) {
    throw new Error(
      'suspectDataProvider: suspect data is not loaded yet. Call loadSuspectData() first, e.g. in your Boot/Preload scene.'
    );
  }

  return suspectData;
}