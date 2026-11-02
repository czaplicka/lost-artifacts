import { gameState } from '../../GameData.js';

function hash(value) {
  let result = 2166136261;
  for (const letter of String(value)) {
    result = Math.imul(result ^ letter.charCodeAt(0), 16777619);
  }
  return result >>> 0;
}

function shuffled(values, seed) {
  const result = [...values];
  let state = seed || 1;
  for (let index = result.length - 1; index > 0; index--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const target = (state >>> 0) % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function applyCityVisualLayout(scene) {
  if (!scene.city || scene.isFinalShowdown) return;

  const encounters = gameState.cityEncounterState?.[scene.cityId];
  if (!Array.isArray(encounters)) return;

  const active = encounters.filter(entry => entry && entry.enabled !== false);
  const width = scene.scale.width;
  const height = scene.scale.height;
  if (!(width > 0 && height > 0)) return;

  const seed = hash(scene.cityId);
  const columns = 4;
  const rows = Math.max(3, Math.ceil((active.length + 2) / columns));
  const left = width * 0.14;
  const right = width * 0.86;
  const top = height * 0.29;
  const bottom = height * 0.73;
  const points = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      points.push({
        x: Math.round(left + (right - left) * col / (columns - 1)),
        y: Math.round(top + (bottom - top) * row / (rows - 1))
      });
    }
  }

  const order = shuffled(points.map((_, index) => index), seed);
  const hotel = points[order[0]];
  const shop = points[order[1]];
  const sorted = [...active].sort((a, b) => {
    const first = String(a.slotId ?? a.id ?? '');
    const second = String(b.slotId ?? b.id ?? '');
    return first < second ? -1 : first > second ? 1 : 0;
  });
  const positions = new Map(sorted.map((entry, index) => [entry, points[order[index + 2]]]));

  // Keep cached location definitions unchanged.
  scene.city = {
    ...scene.city,
    hotel: { ...scene.city.hotel, ...hotel },
    shop: { ...scene.city.shop, ...shop }
  };

  gameState.cityEncounterState = {
    ...gameState.cityEncounterState,
    [scene.cityId]: encounters.map(entry => {
      const point = positions.get(entry);
      return point ? { ...entry, cityX: point.x, cityY: point.y } : entry;
    })
  };
}
