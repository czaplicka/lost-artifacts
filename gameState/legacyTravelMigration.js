// gameState/legacyTravelMigration.js
// Migracja historycznych danych UnifiedTravelManager.
// Archiwum nie nalicza kosztów i nie jest aktywnym ledgerem.

const own = (value, key) =>
  Object.prototype.hasOwnProperty.call(value, key);

function isPlainObject(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function copy(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function archiveSnapshot(source, origin) {
  if (!isPlainObject(source)) {
    return null;
  }

  const snapshot = { origin };
  let populated = false;

  if (
    own(source, 'costLedger') &&
    Array.isArray(source.costLedger) &&
    source.costLedger.length > 0
  ) {
    snapshot.costLedger = copy(source.costLedger);
    populated = true;
  }

  if (
    own(source, 'lastTravelData') &&
    isPlainObject(source.lastTravelData)
  ) {
    snapshot.lastTravelData = copy(source.lastTravelData);
    populated = true;
  }

  return populated ? snapshot : null;
}

export function migrateLegacyTravelState(state) {
  if (!isPlainObject(state)) {
    throw new TypeError(
      '[LegacyTravel] Expected a plain game state.'
    );
  }

  let archive = null;

  if (state.legacyTravelArchive != null) {
    const savedArchive = state.legacyTravelArchive;

    if (
      !isPlainObject(savedArchive) ||
      savedArchive.version !== 1 ||
      !Array.isArray(savedArchive.snapshots) ||
      savedArchive.snapshots.some(
        snapshot => !isPlainObject(snapshot)
      )
    ) {
      throw new Error(
        '[LegacyTravel] Unsupported travel archive. ' +
        'Save not migrated.'
      );
    }

    archive = copy(savedArchive);
  }

  const nestedSnapshot = archiveSnapshot(
    state.unifiedTravelManagerState,
    'unifiedTravelManagerState'
  );

  const rootSnapshot = archiveSnapshot(
    state,
    'legacyRootFields'
  );

  const incoming = [
    nestedSnapshot,
    rootSnapshot
  ].filter(Boolean);

  if (incoming.length > 0) {
    archive ??= {
      version: 1,
      snapshots: []
    };

    const seen = new Set(
      archive.snapshots.map(snapshot =>
        JSON.stringify(snapshot)
      )
    );

    for (const snapshot of incoming) {
      const key = JSON.stringify(snapshot);

      if (seen.has(key)) {
        continue;
      }

      archive.snapshots.push(snapshot);
      seen.add(key);
    }
  }

  // Nie zmieniamy moneyLog, travelHistory, lastTravel,
  // pieniędzy ani energii. Zachowujemy tylko historię.
  state.legacyTravelArchive = archive;

  delete state.unifiedTravelManagerState;
  delete state.costLedger;
  delete state.lastTravelData;

  return state;
}