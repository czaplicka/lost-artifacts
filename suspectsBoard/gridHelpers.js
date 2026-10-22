import { FIELD_DEFS, FIELD_BY_ALIAS } from './gridConstants.js';

export function prettify(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeFieldKey(field = '') {
  const raw = String(field || '').trim();
  return FIELD_BY_ALIAS.get(raw)?.id || raw;
}

export function getFieldLabel(field = '') {
  return (
    FIELD_BY_ALIAS.get(field)?.label || prettify(field).toUpperCase()
  );
}

export function getFieldOrder(field = '') {
  const index = FIELD_DEFS.findIndex((definition) => definition.id === field);
  return index === -1 ? 999 : index;
}

export function normalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).join(', ');
  }
  if (value === undefined || value === null || value === '') {
    return '?';
  }
  return String(value);
}

export function formatCellValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => formatCellValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (value === undefined || value === null || value === '') {
    return '';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^blond$/, 'blonde')
    .toUpperCase();
}

export function pickRandom(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return '';
  }
  return items[Math.floor(Math.random() * items.length)];
}

export function fillTemplate(template = '', params = {}) {
  return String(template).replace(
    /{(\w+)}/g,
    (_, key) => params[key] ?? '???'
  );
}

export function getGridMarkState(rawState = {}) {
  const currentState =
    rawState.markedUnlikelyBySuspectId ||
    rawState.ruledOutBySuspectId ||
    {};

  if (!currentState || typeof currentState !== 'object') {
    return {};
  }
  return { ...currentState };
}