const CASE_ID = 'miramar_demo';
const STORE = 'notebookHypothesesV1';
const array = value => Array.isArray(value) ? value : [];
const safeKey = value => typeof value === 'string' && !['__proto__', 'prototype', 'constructor'].includes(value);

export const NOTEBOOK_RULES = [
  { id: 'jacket_owner', title: 'THE JACKET', question: 'Who owns the jacket?', requires: ['checked_jacket', 'swallow_logo'],
    options: [{ id: 'nora', label: 'Nora Bell', requires: ['nora'] }, { id: 'claire', label: 'Claire Sutton', requires: ['claire'] }, { id: 'daniel', label: 'Daniel Reed', requires: [] }] },
  { id: 'second_guest', title: 'THE SECOND GUEST', question: 'Who joined Daniel?', requires: ['checked_jacket', 'swallow_logo', 'two_glasses'],
    options: [{ id: 'nora', label: 'Nora Bell', requires: ['nora'] }, { id: 'claire', label: 'Claire Sutton', requires: ['claire'] }, { id: 'alone', label: 'Nobody - Daniel was alone', requires: [] }] },
  { id: 'photo_location', title: 'THE LOCATION', question: 'Where was the photograph taken?', requires: ['seahorse_logo'],
    options: [{ id: 'miramar', label: 'Hotel Miramar', requires: ['miramar'] }, { id: 'mariner', label: 'The Mariner', requires: ['mariner'] }, { id: 'coral', label: 'Coral Crown Hotel', requires: ['coral'] }] },
  { id: 'trip_purpose', title: 'THE TRIP', question: 'What kind of trip was it?', requires: ['swallow_logo', 'open_skies', 'conference'],
    options: [{ id: 'work', label: 'A work event', requires: [] }, { id: 'private', label: 'A private holiday', requires: [] }, { id: 'both', label: 'Work and private plans', requires: [] }] }
];

export function extendNotebookKeywords(search) {
  const definition = array(search?.data?.cases).find(item => item.id === CASE_ID);
  if (!definition) return false;
  if (!definition.clouds.some(item => item.id === 'table')) definition.clouds.push({ id: 'table', title: 'THE TABLE' });
  if (!definition.keywords.some(item => item.id === 'two_glasses')) definition.keywords.push({ id: 'two_glasses', label: 'Two glasses', cloudId: 'table' });
  return true;
}

export function getNotebookDeductions(state, scope, caseId) {
  if (scope !== 'pi' || caseId !== CASE_ID) return [];
  const known = new Set(array(state.piKeywordSearch?.cases?.[caseId]?.known));
  return NOTEBOOK_RULES.filter(rule => rule.requires.every(id => known.has(id))).map(rule => {
    const options = rule.options.filter(option => option.requires.every(id => known.has(id)));
    const chosen = state[STORE]?.pi?.[caseId]?.[rule.id];
    return { ...rule, options, selectable: options.length >= 2, selected: options.some(option => option.id === chosen) ? chosen : null };
  });
}

export function chooseNotebookHypothesis(state, scope, caseId, ruleId, optionId) {
  if (!safeKey(caseId) || !safeKey(ruleId)) return false;
  const rule = getNotebookDeductions(state, scope, caseId).find(item => item.id === ruleId);
  if (!rule || (optionId !== null && (!rule.selectable || !rule.options.some(option => option.id === optionId)))) return false;
  state[STORE] ||= { pi: {} };
  state[STORE].pi ||= {};
  state[STORE].pi[caseId] ||= {};
  if (optionId === null) delete state[STORE].pi[caseId][ruleId];
  else state[STORE].pi[caseId][ruleId] = optionId;
  return true;
}
