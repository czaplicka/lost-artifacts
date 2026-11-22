// Locations register themselves.
// The travel system knows no quest IDs.

const locations = new Map();

export function registerLocalAreaLocation(location) {
  if (
    !location?.id ||
    !location.townId ||
    typeof location.getAccess !== 'function' ||
    typeof location.load !== 'function'
  ) {
    throw new TypeError('Invalid Local Area location.');
  }

  if (locations.has(location.id)) {
    throw new Error(
      `Duplicate local location: ${location.id}`
    );
  }

  locations.set(location.id, location);

  return () => {
    if (locations.get(location.id) === location) {
      locations.delete(location.id);
    }
  };
}

export function getLocalAreaLocations(townId) {
  return [...locations.values()].filter(
    location => location.townId === townId
  );
}