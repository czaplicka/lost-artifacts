// One selected serving airport per game location; this does not modify locations.json.
export const TICKET_AIRPORT_CODES = Object.freeze({
  london: 'LHR', paris: 'CDG', berlin: 'BER', warsaw: 'WAW',
  new_delhi: 'DEL', new_york_city: 'JFK', toronto: 'YYZ',
  islamabad: 'ISB', nairobi: 'NBO', tokyo: 'HND',
  // Game-design mapping: existing location ID "kotto" uses Colombo's serving airport.
  kotto: 'CMB'
});
export function getTicketAirportCode(location) {
  const configured = typeof location?.airportCode === 'string' ? location.airportCode.trim().toUpperCase() : '';
  const code = configured || TICKET_AIRPORT_CODES[location?.id] || '';
  return /^[A-Z]{3}$/.test(code) ? code : null;
}
