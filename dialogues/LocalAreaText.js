// Display strings for the independent Local Area system.

export const LOCAL_AREA_TEXT = Object.freeze({
  icon: 'Local Area',
  title: 'Local Area',
  subtitle: 'Pick a town. Cases are optional. Fuel is not.',

  explore: 'Explore town',
  drive: 'Drive to {town}',
  here: 'You are here.',
  noTravel: 'No journey needed.',
  choose: 'Pick a town',
  unavailable: 'Unavailable',

  travelError:
    'The journey could not start. Your town has not been changed.',

  mapError:
    'The local map could not be opened. Please try again.',

  locationError:
    'This location could not be opened. Please try again.',

  missingSession:
    'This travel session is no longer available. Reload your save from the menu.',

  locationChanged:
    'Your location changed. Please choose the route again.',

  townHeading: 'CURRENT LOCATION',
  places: 'Places to visit',

  bored: 'You got there. You got bored.',

  empty:
    'No places to visit here yet. The tourist office is investigating itself.',

  localMap: 'OPEN LOCAL MAP',
  home: 'DRIVE HOME',
  office: 'RETURN TO OFFICE',

  previous: 'PREVIOUS',
  next: 'NEXT',
  locked: 'Unavailable',
  loading: 'Opening location...',

  garden: "Olga's garden",
  camera: 'Bring a camera to begin your observation.',
  activeCase: 'Accept the Grand Conspiracy case first.',
  closedCase: 'This investigation is already closed.',

  gardenReturn: 'You are still in {town}.',
  page: 'Page {page} / {pages}'
});

export function localAreaText(id, values = {}) {
  const source = LOCAL_AREA_TEXT[id];

  if (typeof source !== 'string') {
    throw new Error(`Unknown Local Area text: ${id}`);
  }

  return source.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : match
  );
}