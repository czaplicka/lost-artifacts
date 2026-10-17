let suspectData = null;
let pendingLoad = null;
let dataRevision = 0;

function isUsableData(value) {
  return (
    value !== null &&
    typeof value === 'object'
  );
}

export function setSuspectData(data) {
  if (!isUsableData(data)) {
    throw new TypeError(
      'suspectDataProvider: expected an array or object.'
    );
  }

  suspectData = data;
  dataRevision += 1;

  return suspectData;
}

export function loadSuspectData(
  path = 'assets/data/suspectData.json'
) {
  if (suspectData !== null) {
    return Promise.resolve(suspectData);
  }

  if (pendingLoad) {
    return pendingLoad;
  }

  const revisionAtStart = dataRevision;

  const request = (async () => {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(
        `suspectDataProvider: failed to load "${path}" ` +
        `(status ${response.status}).`
      );
    }

    const data = await response.json();

    if (!isUsableData(data)) {
      throw new TypeError(
        'suspectDataProvider: downloaded data must be an array or object.'
      );
    }

    // Dane z cache mogły zostać przekazane podczas pobierania.
    if (dataRevision === revisionAtStart) {
      suspectData = data;
      dataRevision += 1;
    }

    return suspectData;
  })();

  pendingLoad = request;

  const clearPending = () => {
    if (pendingLoad === request) {
      pendingLoad = null;
    }
  };

  request.then(clearPending, clearPending);

  return request;
}

export function getSuspectData() {
  if (suspectData === null) {
    throw new Error(
      'suspectDataProvider: suspect data is not loaded yet. ' +
      'Call setSuspectData() or loadSuspectData() first.'
    );
  }

  return suspectData;
}