import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { TRANSPORT_CONFIG } from '../TransportConfig.js';

// Fictional game network. Coordinates and corridors are not live passenger services.
export const TRAVEL_NODES = {
  "london": {
    "name": __dialogueText("config/TravelNetwork.js", "t_ecc0e7dc084f141b2947"),
    "x": 895,
    "y": 340
  },
  "paris": {
    "name": __dialogueText("config/TravelNetwork.js", "t_5dd272b4f316b776a7b8"),
    "x": 910,
    "y": 410
  },
  "berlin": {
    "name": __dialogueText("config/TravelNetwork.js", "t_dad114b6ed7342bac65c"),
    "x": 985,
    "y": 340
  },
  "warsaw": {
    "name": __dialogueText("config/TravelNetwork.js", "t_2d59f8dd13aafd7bc427"),
    "x": 1030,
    "y": 360
  },
  "new_delhi": {
    "name": __dialogueText("config/TravelNetwork.js", "t_9ed6d0e61816a424d0e0"),
    "x": 1290,
    "y": 490
  },
  "islamabad": {
    "name": __dialogueText("config/TravelNetwork.js", "t_56247fb8d8b053bdfce3"),
    "x": 1250,
    "y": 420
  },
  "kotte": {
    "name": __dialogueText("config/TravelNetwork.js", "t_f1ddbe4637bad445991c"),
    "x": 1325,
    "y": 570
  },
  "nairobi": {
    "name": __dialogueText("config/TravelNetwork.js", "t_5bfc2e5513a487037e6a"),
    "x": 1080,
    "y": 500
  },
  "tokyo": {
    "name": __dialogueText("config/TravelNetwork.js", "t_ec2d191680171ca96031"),
    "x": 1530,
    "y": 380
  },
  "new_york_city": {
    "name": __dialogueText("config/TravelNetwork.js", "t_5a59ef2e40c5f89adb8c"),
    "x": 600,
    "y": 400
  },
  "toronto": {
    "name": __dialogueText("config/TravelNetwork.js", "t_121730bd619d2df5d68a"),
    "x": 480,
    "y": 360
  },
  "dover": {
    "name": __dialogueText("config/TravelNetwork.js", "t_88fa0e9c8ec31bd6ea6b"),
    "x": 902,
    "y": 365
  },
  "calais": {
    "name": __dialogueText("config/TravelNetwork.js", "t_19214c2fea71ede95f66"),
    "x": 908,
    "y": 380
  },
  "istanbul": {
    "name": __dialogueText("config/TravelNetwork.js", "t_70af65c90d5642c0a1eb"),
    "x": 1100,
    "y": 410
  },
  "tehran": {
    "name": __dialogueText("config/TravelNetwork.js", "t_cc06146070ec57abdbc0"),
    "x": 1190,
    "y": 420
  },
  "lahore": {
    "name": __dialogueText("config/TravelNetwork.js", "t_3048eb5bfe958b497825"),
    "x": 1265,
    "y": 460
  },
  "cairo": {
    "name": __dialogueText("config/TravelNetwork.js", "t_62af713f580cae7ec275"),
    "x": 1090,
    "y": 450
  },
  "khartoum": {
    "name": __dialogueText("config/TravelNetwork.js", "t_1e8ee08d840fbed1fd2f"),
    "x": 1080,
    "y": 475
  },
  "addis_ababa": {
    "name": __dialogueText("config/TravelNetwork.js", "t_a2274316a50b701a6deb"),
    "x": 1100,
    "y": 490
  },
  "mombasa": {
    "name": __dialogueText("config/TravelNetwork.js", "t_12bb63d9a04311b33fbb"),
    "x": 1100,
    "y": 520
  },
  "mumbai": {
    "name": __dialogueText("config/TravelNetwork.js", "t_9f2ba6981e36ea0fca6c"),
    "x": 1260,
    "y": 525
  },
  "karachi": {
    "name": __dialogueText("config/TravelNetwork.js", "t_59edcc61af65e1ccac06"),
    "x": 1225,
    "y": 480
  },
  "colombo": {
    "name": __dialogueText("config/TravelNetwork.js", "t_467f29d648705d956b83"),
    "x": 1320,
    "y": 565
  },
  "nagapattinam": {
    "name": __dialogueText("config/TravelNetwork.js", "t_0a0eb81ae9b8024a635d"),
    "x": 1305,
    "y": 550
  },
  "kankesanthurai": {
    "name": __dialogueText("config/TravelNetwork.js", "t_f9420ccd5154d6d96dd0"),
    "x": 1315,
    "y": 555
  },
  "singapore": {
    "name": __dialogueText("config/TravelNetwork.js", "t_c96dd81db196cca5f57b"),
    "x": 1410,
    "y": 590
  },
  "yokohama": {
    "name": __dialogueText("config/TravelNetwork.js", "t_1142e7a035d073ba4ce2"),
    "x": 1535,
    "y": 390
  },
  "southampton": {
    "name": __dialogueText("config/TravelNetwork.js", "t_3c1def48af45cb974830"),
    "x": 885,
    "y": 365
  },
  "le_havre": {
    "name": __dialogueText("config/TravelNetwork.js", "t_34d0b51bcb36e9aa7551"),
    "x": 900,
    "y": 395
  },
  "hamburg": {
    "name": __dialogueText("config/TravelNetwork.js", "t_47afcff3dcb9e9891e7b"),
    "x": 975,
    "y": 330
  },
  "gdansk": {
    "name": __dialogueText("config/TravelNetwork.js", "t_f9a0d0bb257274a68361"),
    "x": 1030,
    "y": 335
  }
};

export const TRAVEL_CONNECTIONS = [
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_6089854c94ca5454b76b"),
    "to": "paris",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_6089854c94ca5454b76b"),
    "to": "dover",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_4bcfb67d53702a50e327"),
    "to": "calais",
    "mode": "ship",
    "ferry": true,
    "hours": 2
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_7c513fab4c8c8889451e"),
    "to": "paris",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_1670f2e42fefa5044d59"),
    "to": "berlin",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_1670f2e42fefa5044d59"),
    "to": "berlin",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_fb38a93fd89e1a5fc785"),
    "to": "warsaw",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_fb38a93fd89e1a5fc785"),
    "to": "warsaw",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_d488c170e99aa6a388b9"),
    "to": "istanbul",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_d488c170e99aa6a388b9"),
    "to": "istanbul",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_751c59fe1fa734e61bec"),
    "to": "tehran",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_751c59fe1fa734e61bec"),
    "to": "tehran",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_6ab4a31413e4329fe1ba"),
    "to": "lahore",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_6ab4a31413e4329fe1ba"),
    "to": "lahore",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_feb81ca45117d135c1f6"),
    "to": "islamabad",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_feb81ca45117d135c1f6"),
    "to": "islamabad",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_feb81ca45117d135c1f6"),
    "to": "new_delhi",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_feb81ca45117d135c1f6"),
    "to": "new_delhi",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_a5c49775b0a68d9f4dbd"),
    "to": "mombasa",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_a5c49775b0a68d9f4dbd"),
    "to": "mombasa",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_53980f9ea4143ab6fd7a"),
    "to": "mumbai",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_53980f9ea4143ab6fd7a"),
    "to": "mumbai",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_53980f9ea4143ab6fd7a"),
    "to": "nagapattinam",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_53980f9ea4143ab6fd7a"),
    "to": "nagapattinam",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_2a495a6770e82baef293"),
    "to": "karachi",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_2a495a6770e82baef293"),
    "to": "karachi",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_ae8533fd2cfc568142c3"),
    "to": "colombo",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_ae8533fd2cfc568142c3"),
    "to": "colombo",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_468f3a27ec26ff3914b7"),
    "to": "kotte",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_468f3a27ec26ff3914b7"),
    "to": "kotte",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_472d2ae8627a05b807a0"),
    "to": "toronto",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_472d2ae8627a05b807a0"),
    "to": "toronto",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_afe04579004049ccce18"),
    "to": "yokohama",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_afe04579004049ccce18"),
    "to": "yokohama",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_6089854c94ca5454b76b"),
    "to": "southampton",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_6089854c94ca5454b76b"),
    "to": "southampton",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_1670f2e42fefa5044d59"),
    "to": "le_havre",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_1670f2e42fefa5044d59"),
    "to": "le_havre",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_fb38a93fd89e1a5fc785"),
    "to": "hamburg",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_fb38a93fd89e1a5fc785"),
    "to": "hamburg",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_d488c170e99aa6a388b9"),
    "to": "gdansk",
    "mode": "train"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_d488c170e99aa6a388b9"),
    "to": "gdansk",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_751c59fe1fa734e61bec"),
    "to": "cairo",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_6d2805b8ba496887d08f"),
    "to": "khartoum",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_edb075da89732c35dd6d"),
    "to": "addis_ababa",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_e6ffb5c596f382b00b08"),
    "to": "nairobi",
    "mode": "bus"
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_5e32660c0dc887e8dff2"),
    "to": "kankesanthurai",
    "mode": "ship",
    "ferry": true,
    "hours": 4
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_d2263b3772d959f633ee"),
    "to": "new_york_city",
    "mode": "ship",
    "hours": 120
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_472d2ae8627a05b807a0"),
    "to": "toronto",
    "mode": "ship",
    "hours": 48
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_d2263b3772d959f633ee"),
    "to": "le_havre",
    "mode": "ship",
    "hours": 8
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_5a0e2e33d69991c0da26"),
    "to": "hamburg",
    "mode": "ship",
    "hours": 18
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_d1d470d61a1e5e55f995"),
    "to": "gdansk",
    "mode": "ship",
    "hours": 18
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_d2263b3772d959f633ee"),
    "to": "mombasa",
    "mode": "ship",
    "hours": 144
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_8e56f734fff3c9d92c67"),
    "to": "karachi",
    "mode": "ship",
    "hours": 72
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_eca1dbf552edfe3038ad"),
    "to": "mumbai",
    "mode": "ship",
    "hours": 24
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_d209bcc17778fd19fd2b"),
    "to": "colombo",
    "mode": "ship",
    "hours": 36
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_468f3a27ec26ff3914b7"),
    "to": "singapore",
    "mode": "ship",
    "hours": 60
  },
  {
    "from": __dialogueText("config/TravelNetwork.js", "t_51e2a46721d104d9148d"),
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
    ? __dialogueText("config/TravelNetwork.js", "t_be3152d00da37fd330a5") : TRANSPORT_CONFIG[mode].label).join(' + ');
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
