import { TRANSPORT_CONFIG } from '../TransportConfig.js';

// Fictional game network. Coordinates and corridors are not live passenger services.
export const TRAVEL_NODES = {
  "london": {
    "name": "London",
    "x": 895,
    "y": 340
  },
  "paris": {
    "name": "Paris",
    "x": 910,
    "y": 410
  },
  "berlin": {
    "name": "Berlin",
    "x": 985,
    "y": 340
  },
  "warsaw": {
    "name": "Warsaw",
    "x": 1030,
    "y": 360
  },
  "new_delhi": {
    "name": "New Delhi",
    "x": 1290,
    "y": 490
  },
  "islamabad": {
    "name": "Islamabad",
    "x": 1250,
    "y": 420
  },
  "kotte": {
    "name": "Kotte",
    "x": 1325,
    "y": 570
  },
  "nairobi": {
    "name": "Nairobi",
    "x": 1080,
    "y": 500
  },
  "tokyo": {
    "name": "Tokyo",
    "x": 1530,
    "y": 380
  },
  "new_york_city": {
    "name": "New York City",
    "x": 600,
    "y": 400
  },
  "toronto": {
    "name": "Toronto",
    "x": 480,
    "y": 360
  },
  "dover": {
    "name": "Dover",
    "x": 902,
    "y": 365
  },
  "calais": {
    "name": "Calais",
    "x": 908,
    "y": 380
  },
  "istanbul": {
    "name": "Istanbul",
    "x": 1100,
    "y": 410
  },
  "tehran": {
    "name": "Tehran",
    "x": 1190,
    "y": 420
  },
  "lahore": {
    "name": "Lahore",
    "x": 1265,
    "y": 460
  },
  "cairo": {
    "name": "Cairo",
    "x": 1090,
    "y": 450
  },
  "khartoum": {
    "name": "Khartoum",
    "x": 1080,
    "y": 475
  },
  "addis_ababa": {
    "name": "Addis Ababa",
    "x": 1100,
    "y": 490
  },
  "mombasa": {
    "name": "Mombasa",
    "x": 1100,
    "y": 520
  },
  "mumbai": {
    "name": "Mumbai",
    "x": 1260,
    "y": 525
  },
  "karachi": {
    "name": "Karachi",
    "x": 1225,
    "y": 480
  },
  "colombo": {
    "name": "Colombo",
    "x": 1320,
    "y": 565
  },
  "nagapattinam": {
    "name": "Nagapattinam",
    "x": 1305,
    "y": 550
  },
  "kankesanthurai": {
    "name": "Kankesanthurai",
    "x": 1315,
    "y": 555
  },
  "singapore": {
    "name": "Singapore",
    "x": 1410,
    "y": 590
  },
  "yokohama": {
    "name": "Yokohama",
    "x": 1535,
    "y": 390
  },
  "southampton": {
    "name": "Southampton",
    "x": 885,
    "y": 365
  },
  "le_havre": {
    "name": "Le Havre",
    "x": 900,
    "y": 395
  },
  "hamburg": {
    "name": "Hamburg",
    "x": 975,
    "y": 330
  },
  "gdansk": {
    "name": "Gdansk",
    "x": 1030,
    "y": 335
  }
};

export const TRAVEL_CONNECTIONS = [
  {
    "from": "london",
    "to": "paris",
    "mode": "train"
  },
  {
    "from": "london",
    "to": "dover",
    "mode": "bus"
  },
  {
    "from": "dover",
    "to": "calais",
    "mode": "ship",
    "ferry": true,
    "hours": 2
  },
  {
    "from": "calais",
    "to": "paris",
    "mode": "bus"
  },
  {
    "from": "paris",
    "to": "berlin",
    "mode": "train"
  },
  {
    "from": "paris",
    "to": "berlin",
    "mode": "bus"
  },
  {
    "from": "berlin",
    "to": "warsaw",
    "mode": "train"
  },
  {
    "from": "berlin",
    "to": "warsaw",
    "mode": "bus"
  },
  {
    "from": "warsaw",
    "to": "istanbul",
    "mode": "train"
  },
  {
    "from": "warsaw",
    "to": "istanbul",
    "mode": "bus"
  },
  {
    "from": "istanbul",
    "to": "tehran",
    "mode": "train"
  },
  {
    "from": "istanbul",
    "to": "tehran",
    "mode": "bus"
  },
  {
    "from": "tehran",
    "to": "lahore",
    "mode": "train"
  },
  {
    "from": "tehran",
    "to": "lahore",
    "mode": "bus"
  },
  {
    "from": "lahore",
    "to": "islamabad",
    "mode": "train"
  },
  {
    "from": "lahore",
    "to": "islamabad",
    "mode": "bus"
  },
  {
    "from": "lahore",
    "to": "new_delhi",
    "mode": "train"
  },
  {
    "from": "lahore",
    "to": "new_delhi",
    "mode": "bus"
  },
  {
    "from": "nairobi",
    "to": "mombasa",
    "mode": "train"
  },
  {
    "from": "nairobi",
    "to": "mombasa",
    "mode": "bus"
  },
  {
    "from": "new_delhi",
    "to": "mumbai",
    "mode": "train"
  },
  {
    "from": "new_delhi",
    "to": "mumbai",
    "mode": "bus"
  },
  {
    "from": "new_delhi",
    "to": "nagapattinam",
    "mode": "train"
  },
  {
    "from": "new_delhi",
    "to": "nagapattinam",
    "mode": "bus"
  },
  {
    "from": "islamabad",
    "to": "karachi",
    "mode": "train"
  },
  {
    "from": "islamabad",
    "to": "karachi",
    "mode": "bus"
  },
  {
    "from": "kankesanthurai",
    "to": "colombo",
    "mode": "train"
  },
  {
    "from": "kankesanthurai",
    "to": "colombo",
    "mode": "bus"
  },
  {
    "from": "colombo",
    "to": "kotte",
    "mode": "train"
  },
  {
    "from": "colombo",
    "to": "kotte",
    "mode": "bus"
  },
  {
    "from": "new_york_city",
    "to": "toronto",
    "mode": "train"
  },
  {
    "from": "new_york_city",
    "to": "toronto",
    "mode": "bus"
  },
  {
    "from": "tokyo",
    "to": "yokohama",
    "mode": "train"
  },
  {
    "from": "tokyo",
    "to": "yokohama",
    "mode": "bus"
  },
  {
    "from": "london",
    "to": "southampton",
    "mode": "train"
  },
  {
    "from": "london",
    "to": "southampton",
    "mode": "bus"
  },
  {
    "from": "paris",
    "to": "le_havre",
    "mode": "train"
  },
  {
    "from": "paris",
    "to": "le_havre",
    "mode": "bus"
  },
  {
    "from": "berlin",
    "to": "hamburg",
    "mode": "train"
  },
  {
    "from": "berlin",
    "to": "hamburg",
    "mode": "bus"
  },
  {
    "from": "warsaw",
    "to": "gdansk",
    "mode": "train"
  },
  {
    "from": "warsaw",
    "to": "gdansk",
    "mode": "bus"
  },
  {
    "from": "istanbul",
    "to": "cairo",
    "mode": "bus"
  },
  {
    "from": "cairo",
    "to": "khartoum",
    "mode": "bus"
  },
  {
    "from": "khartoum",
    "to": "addis_ababa",
    "mode": "bus"
  },
  {
    "from": "addis_ababa",
    "to": "nairobi",
    "mode": "bus"
  },
  {
    "from": "nagapattinam",
    "to": "kankesanthurai",
    "mode": "ship",
    "ferry": true,
    "hours": 4
  },
  {
    "from": "southampton",
    "to": "new_york_city",
    "mode": "ship",
    "hours": 120
  },
  {
    "from": "new_york_city",
    "to": "toronto",
    "mode": "ship",
    "hours": 48
  },
  {
    "from": "southampton",
    "to": "le_havre",
    "mode": "ship",
    "hours": 8
  },
  {
    "from": "le_havre",
    "to": "hamburg",
    "mode": "ship",
    "hours": 18
  },
  {
    "from": "hamburg",
    "to": "gdansk",
    "mode": "ship",
    "hours": 18
  },
  {
    "from": "southampton",
    "to": "mombasa",
    "mode": "ship",
    "hours": 144
  },
  {
    "from": "mombasa",
    "to": "karachi",
    "mode": "ship",
    "hours": 72
  },
  {
    "from": "karachi",
    "to": "mumbai",
    "mode": "ship",
    "hours": 24
  },
  {
    "from": "mumbai",
    "to": "colombo",
    "mode": "ship",
    "hours": 36
  },
  {
    "from": "colombo",
    "to": "singapore",
    "mode": "ship",
    "hours": 60
  },
  {
    "from": "singapore",
    "to": "yokohama",
    "mode": "ship",
    "hours": 96
  }
];

// Prices are through-tickets. Technical stops never create new full fares.
export const TRAVEL_BALANCE = Object.freeze({
  train: { fare: 0.55, maxFare: 0.65, time: 1.65, extraHours: 2, minGap: 4 },
  bus:   { fare: 0.25, maxFare: 0.35, time: 2.10, extraHours: 3, minGap: 6 },
  ship:  { fare: 0.38, maxFare: 0.48, time: 2.70, extraHours: 4, minGap: 8 }
});
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
export function travelNodeId(location) {
  const raw = location?.travelNodeId || location?.id || location?.city || '';
  const id = String(raw).trim().toLowerCase().replace(/\s+/g, '_');
  return ({ otte: 'kotte', newdelhi: 'new_delhi', new_dehli: 'new_delhi' })[id] || id;
}
function point(id, location) {
  // Stable graph coordinates: the preview may only receive two locations.
  const node = TRAVEL_NODES[id];
  if (node) return { x: node.x, y: node.y };
  const p = location?.map;
  return Number.isFinite(p?.x) && Number.isFinite(p?.y) ? { x: p.x, y: p.y } : null;
}
function distance(a, b) { return a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 250; }
function flightReference(fromPoint, toPoint) {
  const c = TRANSPORT_CONFIG.plane;
  const hours = Math.max(c.minHours, Math.round(c.minHours + distance(fromPoint, toPoint) * c.hoursPerMapPixel));
  return { hours, fare: Math.round(c.baseCost + hours * c.costPerHour) };
}
function makeLeg(edge, from, to, locations) {
  const a = locations.find(l => travelNodeId(l) === from);
  const b = locations.find(l => travelNodeId(l) === to);
  const fromPoint = point(from, a), toPoint = point(to, b);
  const d = distance(fromPoint, toPoint), c = TRANSPORT_CONFIG[edge.mode];
  const rawHours = edge.hours ?? Math.max(c.minHours, Math.round(c.minHours + d * c.hoursPerMapPixel));
  return {
    fromId: from, toId: to,
    fromCity: a?.city || TRAVEL_NODES[from]?.name || from,
    toCity: b?.city || TRAVEL_NODES[to]?.name || to,
    fromPoint, toPoint, transportType: edge.mode, ferry: !!edge.ferry,
    distance: d, rawHours
  };
}
function allocate(totalUnits, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const exact = weights.map(w => totalUnits * w / sum);
  const units = exact.map(Math.floor);
  let remaining = totalUnits - units.reduce((a, b) => a + b, 0);
  const order = exact.map((value, index) => ({ index, fraction: value - units[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < remaining; i++) units[order[i % order.length].index]++;
  return units;
}
function finish(legs, type) {
  const count = legs.length, transfers = Math.max(0, count - 1);
  const reference = flightReference(legs[0].fromPoint, legs[count - 1].toPoint);
  let totalHours = reference.hours, fare = reference.fare;
  const routeDistance = legs.reduce((sum, leg) => sum + leg.distance, 0);
  const directDistance = Math.max(1, distance(legs[0].fromPoint, legs[count - 1].toPoint));
  const detour = clamp(routeDistance / directDistance - 1, 0, 2);
  if (type !== 'plane') {
    const balance = TRAVEL_BALANCE[type];
    const surcharge = Math.min(0.10, detour * 0.025 + transfers * 0.008);
    fare = Math.max(1, Math.round(reference.fare * Math.min(balance.maxFare, balance.fare + surcharge)));
    totalHours = Math.max(reference.hours + balance.minGap,
      Math.ceil(reference.hours * balance.time + balance.extraHours + Math.min(3, transfers * 0.35 + detour)));
  }
  const weights = legs.map(leg => Math.max(0.1, Math.sqrt(leg.rawHours) * Math.sqrt(Math.max(1, leg.distance))));
  const rawWait = legs.map((leg, i) => i === 0 ? 0
    : leg.transportType === 'ship' || legs[i - 1].transportType === 'ship' ? 1 : 0.5);
  const waitSum = rawWait.reduce((a, b) => a + b, 0);
  const waitBudget = Math.min(Math.round(waitSum * 100), Math.floor(totalHours * 100 * 0.25));
  const waits = waitSum ? allocate(waitBudget, rawWait) : rawWait;
  const travel = allocate(totalHours * 100 - waitBudget, weights);
  const costs = allocate(fare, weights);
  const completed = legs.map((leg, i) => ({ ...leg,
    hours: travel[i] / 100, transferHours: waits[i] / 100, cost: costs[i] }));
  const modes = [...new Set(completed.map(l => l.transportType))];
  const label = modes.map(mode => mode === 'ship' && type !== 'ship'
    ? 'Ferry' : TRANSPORT_CONFIG[mode].label).join(' + ');
  return {
    version: 2, transportType: type, label, legs: completed, transferCount: transfers,
    baseTravelHours: totalHours, moneySpent: fare,
    pricingModel: 'through_ticket', referenceFlightHours: reference.hours,
    referenceFlightFare: reference.fare
  };
}
function edgeScore(leg, type, previous) {
  // Bus: short, cheap corridors. Rail: efficient distance and fewer changes.
  // Ship: prefer sea corridors instead of a long bus trip with a token ferry.
  const hop = type === 'bus' ? 12 : type === 'train' ? 22 : 18;
  const access = type === 'ship' && leg.transportType === 'bus' ? 2 : 1;
  const sea = type === 'ship' && leg.transportType === 'ship' ? 0.75 : 1;
  const modeChange = previous && previous !== leg.transportType ? 12 : 0;
  return Math.max(1, leg.distance) * access * sea + hop + modeChange;
}
export function planTravel(from, to, type, locations = [from, to]) {
  if (!from || !to || !TRANSPORT_CONFIG[type]) return null;
  const start = travelNodeId(from), goal = travelNodeId(to);
  if (!start || !goal || start === goal) return null;
  if (type === 'plane') return from.airport && to.airport
    ? finish([makeLeg({ mode: 'plane' }, start, goal, locations)], type) : null;
  if (type === 'bus' && !(from.busStation && to.busStation)) return null;
  if (type === 'train' && !(from.trainStation && to.trainStation)) return null;
  const graph = new Map();
  for (const edge of TRAVEL_CONNECTIONS) {
    const allowed = type === 'ship' ? ['ship', 'bus'].includes(edge.mode)
      : edge.mode === type || (edge.mode === 'ship' && edge.ferry);
    if (!allowed) continue;
    for (const [a, b] of [[edge.from, edge.to], [edge.to, edge.from]]) {
      if (!graph.has(a)) graph.set(a, []);
      graph.get(a).push(makeLeg(edge, a, b, locations));
    }
  }
  // Full visited-state labels preserve optimality while prohibiting circular offers.
  const queue = [{ node: start, usedPrimary: false, score: 0, legs: [], visited: [start] }];
  const best = new Map();
  while (queue.length) {
    queue.sort((a, b) => a.score - b.score);
    const current = queue.shift();
    if (current.node === goal) {
      if (current.usedPrimary) return finish(current.legs, type);
      continue;
    }
    for (const leg of graph.get(current.node) || []) {
      if (current.visited.includes(leg.toId)) continue;
      const usedPrimary = current.usedPrimary || leg.transportType === type;
      const visited = [...current.visited, leg.toId];
      const score = current.score + edgeScore(leg, type, current.legs.at(-1)?.transportType);
      const key = `${leg.toId}|${usedPrimary}|${leg.transportType}|${[...visited].sort().join(',')}`;
      if (score >= (best.get(key) ?? Infinity)) continue;
      best.set(key, score);
      queue.push({ node: leg.toId, usedPrimary, score, visited, legs: [...current.legs, leg] });
    }
  }
  return null;
}
