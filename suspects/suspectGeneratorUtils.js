export function capitalize(value = '') {
  const text = String(value || '').trim();

  if (!text) return '';

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function randomItem(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)];
}

export function shuffle(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

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

/**
 * Tworzy bezpieczną kopię danych JSON-like.
 *
 * W grze używaj dla:
 * - danych podejrzanych,
 * - caseData,
 * - hard evidence,
 * - encounterów NPC,
 * - danych odczytanych z JSON-a lub localStorage.
 *
 * W przypadku wartości niemożliwej do sklonowania funkcja zwróci
 * oryginalną wartość zamiast wywalać całą generację sprawy.
 */
export function safeClone(value) {
  if (value === undefined || value === null) {
    return value;
  }

  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.warn(
        '[suspectGeneratorUtils] safeClone failed; using original value.',
        error
      );

      return value;
    }
  }
}

/**
 * Normalizuje identyfikator miasta do formatu:
 *
 * "New Delhi"  -> "new_delhi"
 * "new-delhi"  -> "new_delhi"
 * " NEW__DELHI " -> "new_delhi"
 */
export function normalizeCityId(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeString(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Odczytuje wartość z obiektu po ścieżce z kropkami.
 *
 * getByPath(suspect, 'restrictedProfile.forensicAttributes.hair_color.value')
 */
export function getByPath(source, path) {
  if (!source || !path) {
    return undefined;
  }

  return String(path)
    .split('.')
    .filter(Boolean)
    .reduce(
      (currentValue, key) => currentValue?.[key],
      source
    );
}

/**
 * Ustawia wartość w obiekcie po ścieżce z kropkami.
 *
 * setByPath(
 *   suspect,
 *   'restrictedProfile.forensicAttributes.hair_color.value',
 *   'brown'
 * );
 */
export function setByPath(target, path, value) {
  if (!target || !path) {
    return target;
  }

  const parts = String(path)
    .split('.')
    .filter(Boolean);

  if (!parts.length) {
    return target;
  }

  const lastKey = parts.pop();

  const destination = parts.reduce((currentValue, key) => {
    if (
      !currentValue[key] ||
      typeof currentValue[key] !== 'object' ||
      Array.isArray(currentValue[key])
    ) {
      currentValue[key] = {};
    }

    return currentValue[key];
  }, target);

  destination[lastKey] = value;

  return target;
}