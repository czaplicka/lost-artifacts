export function capitalize(value = '') {
  const text = String(value || '').trim();

  if (!text) return '';

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function randomItem(items = []) {
  if (!Array.isArray(items) || !items.length) return null;

  return items[Math.floor(Math.random() * items.length)];
}

export function shuffle(items = []) {
  if (!Array.isArray(items)) return [];

  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [copy[index], copy[randomIndex]] = [
      copy[randomIndex],
      copy[index]
    ];
  }

  return copy;
}

export function createId(prefix = 'suspect') {
  const randomPart = Math.random().toString(36).slice(2, 9);
  const timePart = Date.now().toString(36);

  return `${prefix}_${timePart}_${randomPart}`;
}

export function safeClone(value) {
  if (value === undefined) return undefined;

  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

export function normalizeCityId(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function normalizeString(value = '') {
  return String(value ?? '').trim().toLowerCase();
}

export function getByPath(source, path) {
  if (!source || !path) return undefined;

  return String(path)
    .split('.')
    .reduce((currentValue, key) => currentValue?.[key], source);
}

export function setByPath(target, path, value) {
  if (!target || !path) return target;

  const parts = String(path).split('.');
  const lastKey = parts.pop();

  const destination = parts.reduce((currentValue, key) => {
    if (
      !currentValue[key] ||
      typeof currentValue[key] !== 'object'
    ) {
      currentValue[key] = {};
    }

    return currentValue[key];
  }, target);

  destination[lastKey] = value;

  return target;
}