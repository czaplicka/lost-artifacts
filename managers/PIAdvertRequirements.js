import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { piInventoryManager } from './PIInventoryManager.js';

const ITEM_LABELS = {
  camera: __dialogueText("managers/PIAdvertRequirements.js", "t_03494b0d1f803522a349"),
  videoCamera: __dialogueText("managers/PIAdvertRequirements.js", "t_e4cd434bc58704db7e46"),
  mobilePhone: __dialogueText("managers/PIAdvertRequirements.js", "t_0e2906eb576b1fd83b54")
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
      `${__dialogueText("managers/PIAdvertRequirements.js", "t_f24ad44cd067b677cdf8")}${names}${__dialogueText("managers/PIAdvertRequirements.js", "t_8dccf256f6d5783e62bb")}` +
      __dialogueText("managers/PIAdvertRequirements.js", "t_af74dab92835ec4990e6")
  };
}