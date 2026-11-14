export const STARTS = [
  { id: 'office', label: 'Biuro agencji', scene: 'OfficeScene', place: 'hq' },
  { id: 'archive', label: 'Archiwum', scene: 'ArchiveScene', place: 'hq' },
  { id: 'storage', label: 'Magazyn / Alex', scene: 'AgencyStorageScene', place: 'hq' },
  { id: 'crime-city', label: 'Miasto przestępstwa', scene: 'CrimeCityScene', place: 'crime' },
  { id: 'hidden', label: 'Miejsce zbrodni — hidden objects', scene: 'HiddenObjectsScene', place: 'crime' },
  { id: 'lab', label: 'Laboratorium CSI', scene: 'CrimeLabScene', place: 'crime' },
  { id: 'suspects', label: 'Lista podejrzanych', scene: 'SuspectsScene', place: 'crime' },
  { id: 'apartment', label: 'Mieszkanie złodzieja', scene: 'ApartmentScene', place: 'crime' },
  { id: 'city', label: 'Wybrane miasto — swobodny podgląd', scene: 'CityScene', place: 'selected' },
  { id: 'alex-preview', label: 'Rozmowa: Alex — odzyskanie / spadochron (podgląd)', scene: 'AlexRecoveryInquiryScene', module: 'scenes/AlexRecoveryInquiryScene.js', place: 'hq', preview: true },
  { id: 'holly-preview', label: 'Rozmowa: Holly — finał rozdziału I (podgląd)', scene: 'HollyChapterOneFinaleScene', module: 'scenes/HollyChapterOneFinaleScene.js', place: 'hq', preview: true },
  { id: 'gordon-preview', label: 'Gordon — przeszukanie / konfrontacja (podgląd)', scene: 'GordonSearchScene', module: 'scenes/GordonSearchScene.js', place: 'hq', preview: true },
  { id: 'marge-preview', label: 'Marge — HR (podgląd)', scene: 'MargeHRScene', module: 'scenes/MargeHRScene.js', place: 'hq', preview: true },
  { id: 'dust-preview', label: 'Biuro — ślady w kurzu (podgląd)', scene: 'OfficeDustScene', module: 'scenes/OfficeDustScene.js', place: 'hq', preview: true },
  { id: 'radio-preview', label: 'Nagranie radiowe (podgląd)', scene: 'RadioSpliceScene', module: 'scenes/RadioSpliceScene.js', place: 'hq', preview: true }
];
export function getStart(id) {
  const result = STARTS.find(item => item.id === id);
  if (!result) throw new Error('Nieznany punkt startowy: ' + id);
  return result;
}
export function validateOptions(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Brak konfiguracji testu.');
  const caseNumber = Number(input.caseNumber);
  if (!Number.isSafeInteger(caseNumber) || caseNumber < 1 || caseNumber > 1000) throw new Error('Numer misji musi mieścić się w zakresie 1–1000.');
  const start = getStart(input.start);
  const flags = input.flags ?? {};
  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) throw new Error('Flagi muszą być obiektem JSON.');
  for (const [key, value] of Object.entries(flags)) {
    if (!key || ['__proto__', 'constructor', 'prototype'].includes(key) || typeof value !== 'boolean') throw new Error('Każda flaga musi mieć nazwę oraz wartość true/false.');
  }
  return {
    caseNumber, start: start.id,
    missionIndex: input.missionIndex === '' || input.missionIndex == null ? null : Number(input.missionIndex),
    thiefId: String(input.thiefId || ''), crimeCityId: String(input.crimeCityId || ''),
    startCityId: String(input.startCityId || ''), storyStage: String(input.storyStage || 'joined_agency'),
    flags: { ...flags }
  };
}
