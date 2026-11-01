import { TRANSPORT_CONFIG } from '../TransportConfig.js';

// Fictional game services, not a current passenger timetable.
// Intermediate nodes never count as investigation destinations.
export const TRAVEL_NODES = {
  london: { name: 'London', x: 895, y: 340 },
  paris: { name: 'Paris', x: 910, y: 410 },
  berlin: { name: 'Berlin', x: 985, y: 340 },
  warsaw: { name: 'Warsaw', x: 1030, y: 360 },
  new_delhi: { name: 'New Delhi', x: 1290, y: 490 },
  islamabad: { name: 'Islamabad', x: 1250, y: 420 },
  kotte: { name: 'Kotte', x: 1325, y: 570 },
  nairobi: { name: 'Nairobi', x: 1080, y: 500 },
  tokyo: { name: 'Tokyo', x: 1530, y: 380 },
  new_york_city: { name: 'New York City', x: 600, y: 400 },
  toronto: { name: 'Toronto', x: 480, y: 360 },
  dover: { name: 'Dover', x: 902, y: 365 },
  calais: { name: 'Calais', x: 908, y: 380 },
  istanbul: { name: 'Istanbul', x: 1100, y: 410 },
  tehran: { name: 'Tehran', x: 1190, y: 420 },
  lahore: { name: 'Lahore', x: 1265, y: 460 },
  cairo: { name: 'Cairo', x: 1090, y: 450 },
  khartoum: { name: 'Khartoum', x: 1080, y: 475 },
  addis_ababa: { name: 'Addis Ababa', x: 1100, y: 490 },
  mombasa: { name: 'Mombasa', x: 1100, y: 520 },
  mumbai: { name: 'Mumbai', x: 1260, y: 525 },
  karachi: { name: 'Karachi', x: 1225, y: 480 },
  colombo: { name: 'Colombo', x: 1320, y: 565 },
  nagapattinam: { name: 'Nagapattinam', x: 1305, y: 550 },
  kankesanthurai: { name: 'Kankesanthurai', x: 1315, y: 555 },
  singapore: { name: 'Singapore', x: 1410, y: 590 },
  yokohama: { name: 'Yokohama', x: 1535, y: 390 },
  southampton: { name: 'Southampton', x: 885, y: 365 },
  le_havre: { name: 'Le Havre', x: 900, y: 395 },
  hamburg: { name: 'Hamburg', x: 975, y: 330 },
  gdansk: { name: 'Gdansk', x: 1030, y: 335 }
};

export const TRAVEL_CONNECTIONS = [];
function connect(a, b, modes, extra = {}) {
  for (const mode of modes) {
    TRAVEL_CONNECTIONS.push({ from: a, to: b, mode, ...extra });
  }
}
connect('london', 'paris', ['train']);
connect('london', 'dover', ['bus']);
connect('dover', 'calais', ['ship'], { ferry: true, hours: 2 });
connect('calais', 'paris', ['bus']);
connect('paris', 'berlin', ['train', 'bus']);
connect('berlin', 'warsaw', ['train', 'bus']);
connect('warsaw', 'istanbul', ['train', 'bus']);
connect('istanbul', 'tehran', ['train', 'bus']);
connect('tehran', 'lahore', ['train', 'bus']);
connect('lahore', 'islamabad', ['train', 'bus']);
connect('lahore', 'new_delhi', ['train', 'bus']);
connect('istanbul', 'cairo', ['bus']);
connect('cairo', 'khartoum', ['bus']);
connect('khartoum', 'addis_ababa', ['bus']);
connect('addis_ababa', 'nairobi', ['bus']);
connect('nairobi', 'mombasa', ['train', 'bus']);
connect('new_delhi', 'mumbai', ['train', 'bus']);
connect('new_delhi', 'nagapattinam', ['train', 'bus']);
connect('islamabad', 'karachi', ['train', 'bus']);
connect('nagapattinam', 'kankesanthurai', ['ship'], { ferry: true, hours: 4 });
connect('kankesanthurai', 'colombo', ['train', 'bus']);
connect('colombo', 'kotte', ['train', 'bus']);
connect('new_york_city', 'toronto', ['train', 'bus']);
connect('tokyo', 'yokohama', ['train', 'bus']);
connect('london', 'southampton', ['train', 'bus']);
connect('paris', 'le_havre', ['train', 'bus']);
connect('berlin', 'hamburg', ['train', 'bus']);
connect('warsaw', 'gdansk', ['train', 'bus']);
connect('southampton', 'new_york_city', ['ship'], { hours: 120 });
connect('new_york_city', 'toronto', ['ship'], { hours: 48 });
connect('southampton', 'le_havre', ['ship'], { hours: 8 });
connect('le_havre', 'hamburg', ['ship'], { hours: 18 });
connect('hamburg', 'gdansk', ['ship'], { hours: 18 });
connect('southampton', 'mombasa', ['ship'], { hours: 144 });
connect('mombasa', 'karachi', ['ship'], { hours: 72 });
connect('karachi', 'mumbai', ['ship'], { hours: 24 });
connect('mumbai', 'colombo', ['ship'], { hours: 36 });
connect('colombo', 'singapore', ['ship'], { hours: 60 });
connect('singapore', 'yokohama', ['ship'], { hours: 96 });

export function travelNodeId(location) {
  const raw = location?.travelNodeId || location?.id || location?.city || '';
  const id = String(raw).trim().toLowerCase().replace(/\s+/g, '_');
  return ({ otte: 'kotte', newdelhi: 'new_delhi', new_dehli: 'new_delhi' })[id] || id;
}
function point(id, location) {
  const node = TRAVEL_NODES[id];
  const map = location?.map;
  return map ? { x: map.x, y: map.y } : node ? { x: node.x, y: node.y } : null;
}
function makeLeg(edge, from, to, locations) {
  const a = locations.find(l => travelNodeId(l) === from);
  const b = locations.find(l => travelNodeId(l) === to);
  const fromPoint = point(from, a), toPoint = point(to, b);
  const distance = fromPoint && toPoint
    ? Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y) : 250;
  const config = TRANSPORT_CONFIG[edge.mode];
  const hours = edge.hours ?? Math.max(config.minHours,
    Math.round(config.minHours + distance * config.hoursPerMapPixel));
  return {
    fromId: from, toId: to,
    fromCity: a?.city || TRAVEL_NODES[from]?.name || from,
    toCity: b?.city || TRAVEL_NODES[to]?.name || to,
    fromPoint, toPoint, transportType: edge.mode, ferry: !!edge.ferry,
    hours, cost: edge.cost ?? Math.round(config.baseCost + hours * config.costPerHour)
  };
}
function finish(legs, type) {
  const completed = legs.map((leg, i) => ({
    ...leg, transferHours: i === 0 ? 0
      : leg.transportType === 'ship' || legs[i - 1].transportType === 'ship' ? 2 : 1
  }));
  const modes = [...new Set(completed.map(l => l.transportType))];
  const label = modes.map(mode => mode === 'ship' && type !== 'ship'
    ? 'Ferry' : TRANSPORT_CONFIG[mode].label).join(' + ');
  return {
    version: 1, transportType: type, label, legs: completed,
    transferCount: Math.max(0, completed.length - 1),
    baseTravelHours: completed.reduce((n, l) => n + l.hours + l.transferHours, 0),
    moneySpent: completed.reduce((n, l) => n + l.cost, 0)
  };
}

export function planTravel(from, to, type, locations = [from, to]) {
  if (!from || !to || !TRANSPORT_CONFIG[type]) return null;
  const start = travelNodeId(from), goal = travelNodeId(to);
  if (!start || !goal || start === goal) return null;
  if (type === 'plane') {
    return from.airport && to.airport
      ? finish([makeLeg({ mode: 'plane' }, start, goal, locations)], type) : null;
  }
  if (type === 'bus' && !(from.busStation && to.busStation)) return null;
  if (type === 'train' && !(from.trainStation && to.trainStation)) return null;
  const graph = new Map();
  for (const edge of TRAVEL_CONNECTIONS) {
    const allowed = type === 'ship'
      ? ['ship', 'bus'].includes(edge.mode)
      : edge.mode === type || (edge.mode === 'ship' && edge.ferry);
    if (!allowed) continue;
    for (const [a, b] of [[edge.from, edge.to], [edge.to, edge.from]]) {
      if (!graph.has(a)) graph.set(a, []);
      graph.get(a).push(makeLeg(edge, a, b, locations));
    }
  }
  // A ship offer must contain a real sea leg, not just a cheaper bus journey.
  const queue = [{ node: start, usedPrimary: false, score: 0, legs: [] }];
  const best = new Map([[`${start}|false`, 0]]);
  while (queue.length) {
    queue.sort((a, b) => a.score - b.score);
    const current = queue.shift();
    if (current.score !== best.get(`${current.node}|${current.usedPrimary}`)) continue;
    if (current.node === goal && current.usedPrimary) return finish(current.legs, type);
    for (const leg of graph.get(current.node) || []) {
      // Never revisit a place just to acquire the requested transport mode.
      if (leg.toId === start || current.legs.some(l => l.fromId === leg.toId)) continue;
      const usedPrimary = current.usedPrimary || leg.transportType === type;
      const wait = current.legs.length
        ? (leg.transportType === 'ship' || current.legs.at(-1).transportType === 'ship' ? 2 : 1) : 0;
      const score = current.score + leg.hours + wait;
      const key = `${leg.toId}|${usedPrimary}`;
      if (score >= (best.get(key) ?? Infinity)) continue;
      best.set(key, score);
      queue.push({ node: leg.toId, usedPrimary, score, legs: [...current.legs, leg] });
    }
  }
  return null;
}
