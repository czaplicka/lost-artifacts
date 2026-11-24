export const SCENE_FILES = Object.freeze({
  OfficeScene: ['monologues.json'],
  ArchiveScene: ['archive-monologues.json'],
  AgencyStorageScene: ['storage-monologues.json'],
  DetectiveOfficeScene: ['pi-old-office-monologues.json', 'pi-new-office-monologues.json'],
  CrimeCityScene: ['crime-city-monologues.json'],
  CityScene: ['pursuit-city-monologues.json']
});
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function mergeMonologues(base, extra) {
  const result = {};
  for (const source of [base, extra]) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      if (forbidden.has(key)) continue;
      if (Array.isArray(value)) result[key] = value.filter(s => typeof s === 'string' && s.trim());
      else if (value && typeof value === 'object') result[key] = mergeMonologues(result[key], value);
    }
  }
  return result;
}
export function linesAt(data, key) {
  let value = data;
  for (const part of String(key || '').split('.')) {
    if (forbidden.has(part) || !value || !Object.hasOwn(value, part)) return [];
    value = value[part];
  }
  return Array.isArray(value) ? value.filter(s => typeof s === 'string' && s.trim()) : [];
}
export function profileFor(sceneKey, bigOffice = false) {
  return ({ OfficeScene:'office', ArchiveScene:'archive', AgencyStorageScene:'agencyStorage',
    DetectiveOfficeScene:bigOffice ? 'piOfficeNew' : 'piOfficeOld',
    CrimeCityScene:'crimeCity', CityScene:'pursuitCity' })[sceneKey] || null;
}
export function piInspectKey(profile, id) {
  const item = { computer:'computer', phone:'phone', 'city-door':'cityDoor',
    office_books:'books', office_painting:'painting', office_artifact:'artifact',
    office_chairs:'chairs', office_coffee:'coffee', office_tv:'tv',
    office_crime_board:'crimeBoard', office_case_files:'caseFiles',
    office_printer:'printer', office_notepad:'notepad' }[id];
  return item ? `inspect.${profile}.${item}` : null;
}
export function eventChanges(before, after, profile) {
  if (!before || before.context !== after.context) return [];
  const events = [];
  const rose = key => before[key] === false && after[key] === true;
  if (profile === 'crimeCity') {
    for (const [field, event] of Object.entries({ searched:'crimeSceneCompleted',
      analysed:'crimeLabCompleted', reconstructed:'reconstructionCompleted',
      excluded:'suspectEliminationCompleted', apartmentAvailable:'apartmentLeadAvailable' })) {
      if (rose(field)) events.push(event);
    }
    for (const [id, status] of Object.entries(after.alibis || {})) {
      if (before.alibis?.[id] === status) continue;
      if (status === 'confirmed') events.push('alibiSupported');
      if (status === 'contradicted') events.push('alibiContradicted');
    }
  }
  if (profile === 'archive') {
    for (const [field,event] of Object.entries({ submitted:'reportSubmitted',
      puzzleOffered:'indexPuzzleOffered', duplicate:'duplicateFound', discussed:'duplicateDiscussed' })) {
      if (rose(field)) events.push(event);
    }
  }
  if (profile === 'piOfficeOld' || profile === 'piOfficeNew') {
    for (const [id,status] of Object.entries(after.quests || {})) {
      if (before.quests?.[id] === status) continue;
      if (status === 'active') events.push('caseAccepted');
      if (status === 'completed') events.push('caseCompleted');
    }
    if (profile === 'piOfficeNew') {
      if (before.moving && !after.moving) events.push('moveInCompleted');
      for (const [id,owned] of Object.entries(after.owned || {})) {
        if (owned === true && before.owned?.[id] !== true) events.push('itemPurchased');
      }
      for (const [id,hired] of Object.entries(after.staff || {})) {
        if (hired === true && before.staff?.[id] !== true) events.push('expansionStaffHired');
      }
    }
  }
  return [...new Set(events)].map(event => `events.${profile}.${event}`);
}
