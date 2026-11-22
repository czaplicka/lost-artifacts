const LOCATION_AMBIENT_REFS = Object.freeze({
  alley: 'audio:alleysound',
  bank: 'audio:banksound',
  hotel: 'audio:hotelsound',
  parking: 'audio:parkingsound',
  policehq: 'audio:policesound',
  restaurant: 'audio:restaurantsound'
});

const LOCATION_AMBIENTS = new Set(Object.values(LOCATION_AMBIENT_REFS));

export function selectLocationAudioRefs(bundleId, refs, context = null) {
  if (
    bundleId !== 'scene:LocationScene' ||
    context?.sceneKey !== 'LocationScene'
  ) {
    return refs;
  }

  const locationId = context.locationId;
  const selected = Object.hasOwn(LOCATION_AMBIENT_REFS, locationId)
    ? LOCATION_AMBIENT_REFS[locationId]
    : null;

  if (selected && !refs.includes(selected)) {
    throw new Error(
      `[AssetManager] Location audio missing from scene:LocationScene: ${selected}`
    );
  }

  return refs.filter(ref => !LOCATION_AMBIENTS.has(ref) || ref === selected);
}
