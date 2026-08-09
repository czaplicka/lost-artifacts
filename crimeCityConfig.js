// crimeCityConfig.js

// Identyfikatory miast – dopasuj do swoich ID w systemie mapy/tras
export const CRIME_CITY_IDS = [
  'paris',
  'new_york',
  'warsaw',
  'berlin',
  'london',
  'new_delhi',
];

// Możesz chcieć mieć też pełną definicję (np. pod UI, mapę, nazwy)
export const CRIME_CITIES = [
  { id: 'paris',     name: 'Paryż',    country: 'FR' },
  { id: 'new_york',  name: 'Nowy Jork', country: 'US' },
  { id: 'warsaw',    name: 'Warszawa', country: 'PL' },
  { id: 'berlin',    name: 'Berlin',  country: 'DE' },
  { id: 'london',    name: 'Londyn',  country: 'GB' },
  { id: 'new_delhi', name: 'New Delhi', country: 'IN' },
];

// Sprawdza, czy dane miasto może być crime city
export function canBeCrimeCity(cityId) {
  return CRIME_CITY_IDS.includes(cityId);
}

// Zwraca definicję crime city po ID (do UI, tooltipów itd.)
export function getCrimeCityById(cityId) {
  return CRIME_CITIES.find((city) => city.id === cityId) || null;
}

  return caseMapping[caseId] || 'paris';