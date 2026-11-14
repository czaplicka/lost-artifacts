import { piInventoryManager } from './PIInventoryManager.js';

const ITEM_LABELS = {
  camera: 'Camera',
  videoCamera: 'Video camera',
  mobilePhone: 'Mobile phone'
};

export function getAdvertRequiredItems(advert) {
  const raw = advert?.requiresItem;

  const list = Array.isArray(advert?.requiresItems)
    ? advert.requiresItems
    : typeof raw === 'string' && raw
      ? [raw]
      : [];

  return [...new Set(list)].filter(
    id => typeof id === 'string' && id
  );
}

export function getRequiredItemLabel(id) {
  return ITEM_LABELS[id] || id;
}

export function checkAdvertRequirements(advert) {
  const required = getAdvertRequiredItems(advert);

  const missing = required.filter(
    id => !piInventoryManager.hasItem(id)
  );

  if (missing.length === 0) {
    return { ok: true, required, missing: [], message: '' };
  }

  const names = missing
    .map(getRequiredItemLabel)
    .join(', ');

  return {
    ok: false,
    required,
    missing,
    message:
      `This job requires equipment you do not carry: ${names}. ` +
      'The Spy Shop stocks field gear.'
  };
}