import { planTravel } from '../config/TravelNetwork.js';
import { HQ_ID, HQ_CITY } from '../TransportConfig.js';

const MODES = ['plane', 'train', 'bus', 'ship'];
const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
function findLocation(locations, id) {
  return locations.find(l => [l.id, l.city, l.travelNodeId].some(v => normalize(v) === normalize(id)));
}
function chooseSchedule(offers, maxHours) {
  let states = [{ hours: 0, cost: 0, legs: [] }];
  for (const choices of offers) {
    const next = states.flatMap(s => choices.map(o => ({
      hours: s.hours + o.hours, cost: s.cost + o.cost, legs: [...s.legs, o]
    }))).filter(s => s.hours <= maxHours);
    next.sort((a, b) => a.cost - b.cost || a.hours - b.hours);
    states = [];
    let bestHours = Infinity;
    for (const candidate of next) {
      if (candidate.hours < bestHours) {
        states.push(candidate); bestHours = candidate.hours;
      }
    }
    if (!states.length) return null;
  }
  return states.sort((a, b) => a.cost - b.cost || a.hours - b.hours)[0];
}
export function quoteCaseBudget(state, locations) {
  const hq = locations.find(l => l.id === HQ_ID || l.city === HQ_CITY);
  const crime = findLocation(locations, state.crimeCityId);
  if (!hq || !crime) throw new Error('[CaseEconomy] Missing HQ or crime city.');
  const route = (state.escapeRoute || []).map(id => {
    const location = findLocation(locations, id);
    if (!location) throw new Error(`[CaseEconomy] Unknown route city: ${id}`);
    return location;
  });
  const nodes = [hq, crime, ...route];
  const offers = nodes.slice(1).map((to, index) => {
    const from = nodes[index];
    const choices = MODES.map(mode => {
      const itinerary = planTravel(from, to, mode, locations);
      return itinerary && { from: from.id || from.city, to: to.id || to.city,
        mode, cost: itinerary.moneySpent, hours: itinerary.baseTravelHours };
    }).filter(Boolean);
    if (!choices.length) throw new Error(`[CaseEconomy] No route: ${from.city} -> ${to.city}`);
    return choices;
  });
  // Keep up to 36 of the 72 pursuit hours for travel; leave room for clues and rest.
  const arrival = chooseSchedule(offers.slice(0, 1), 24);
  const pursuit = chooseSchedule(offers.slice(1), 36);
  if (!arrival || !pursuit) throw new Error('[CaseEconomy] Generated route has no time-feasible transport schedule.');
  const travelCost = arrival.cost + pursuit.cost;
  const reserveRate = { rookie: 0.20, field: 0.10, master: 0.05 }[state.difficulty] ?? 0.10;
  const hotelAllowance = 50;
  const agencyBudget = Math.ceil((travelCost * (1 + reserveRate) + hotelAllowance) / 25) * 25;
  return { version: 1, agencyBudget, travelCost, hotelAllowance, reserveRate,
    arrivalHours: arrival.hours, pursuitHours: pursuit.hours,
    legs: [...arrival.legs, ...pursuit.legs] };
}
export function fundCase(state, locations) {
  const quote = quoteCaseBudget(state, locations);
  state.agencyBudget = quote.agencyBudget;
  // Stored on the existing mission object so normal saves retain the quote.
  state.currentMission = { ...state.currentMission, economyQuote: quote };
  return quote;
}
