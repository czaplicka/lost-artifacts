import { ALIBI_SEARCH_CASE } from './AlibiCaseData.js';

export const ALIBI_DINNER_TIME_KEYWORD = {
  id: 'dinner_time',
  label: '19:00–21:00',
  cloudId: 'dinner'
};

const MARKER = Symbol.for('lostArtifacts.alibiDinnerTimeKeywordV1');

export function ensureAlibiDinnerTimeKeyword(definition = ALIBI_SEARCH_CASE) {
  if (definition?.id !== 'borrowed_alibi') return;
  definition.keywords ??= [];
  if (!definition.keywords.some(keyword => keyword.id === ALIBI_DINNER_TIME_KEYWORD.id)) {
    definition.keywords.push({ ...ALIBI_DINNER_TIME_KEYWORD });
  }
}

// Register before phone/search data are validated and before mail is rendered.
ensureAlibiDinnerTimeKeyword();

export function dinnerTimeFragments(parts) {
  const result = [];
  for (const part of parts) {
    if (typeof part !== 'string') {
      result.push(part);
      continue;
    }
    const pattern = /\b(?:7:00\s*(?:to|and|[-–—])\s*9:00\s*p\.?\s*m\.?|19:00\s*(?:to|and|[-–—])\s*21:00)(?![\w:])/gi;
    let start = 0;
    for (const match of part.matchAll(pattern)) {
      if (match.index > start) result.push(part.slice(start, match.index));
      result.push({ keywordId: ALIBI_DINNER_TIME_KEYWORD.id, text: match[0] });
      start = match.index + match[0].length;
    }
    if (start < part.length) result.push(part.slice(start));
    if (!part.length) result.push(part);
  }
  return result;
}

export function installAlibiDinnerTimeKeyword(ui, documents) {
  if (ui[MARKER]) return ui[MARKER];
  ensureAlibiDinnerTimeKeyword();
  const mail = documents.alibiMail;
  if (!mail || typeof mail.fragments !== 'function') {
    throw new TypeError('[AlibiDinnerTime] BorrowedAlibiMail.fragments is unavailable.');
  }

  const original = mail.fragments;
  const wrapped = function (...args) {
    ensureAlibiDinnerTimeKeyword();
    const loadedDefinition = ui.search?.data?.cases?.find(item => item.id === 'borrowed_alibi');
    if (loadedDefinition) ensureAlibiDinnerTimeKeyword(loadedDefinition);
    return original.apply(this, args).map(dinnerTimeFragments);
  };
  mail.fragments = wrapped;

  let dead = false;
  const destroy = () => {
    if (dead) return;
    dead = true;
    if (mail.fragments === wrapped) mail.fragments = original;
    ui.scene.events.off('shutdown', destroy);
    if (ui[MARKER] === api) delete ui[MARKER];
  };
  const api = { destroy };
  ui[MARKER] = api;
  ui.scene.events.once('shutdown', destroy);
  return api;
}
