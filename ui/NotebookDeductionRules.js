import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
const CASE_ID = 'miramar_demo';
const STORE = 'notebookHypothesesV1';
const array = value => Array.isArray(value) ? value : [];
const safeKey = value => typeof value === 'string' && !['__proto__', 'prototype', 'constructor'].includes(value);

export const NOTEBOOK_RULES = [
  { id: 'jacket_owner', title: __dialogueText("ui/NotebookDeductionRules.js", "t_b404c3cbe2cd7c11a10c"), question: __dialogueText("ui/NotebookDeductionRules.js", "t_45c74fa9db6eb04e286c"), requires: ['checked_jacket', 'swallow_logo'],
    options: [{ id: 'nora', label: __dialogueText("ui/NotebookDeductionRules.js", "t_4cca0264ed42816c466a"), requires: ['nora'] }, { id: 'claire', label: __dialogueText("ui/NotebookDeductionRules.js", "t_dd853f1a991e5416eb3a"), requires: ['claire'] }, { id: 'daniel', label: __dialogueText("ui/NotebookDeductionRules.js", "t_6cb3c65fc4369ef0ffc9"), requires: [] }] },
  { id: 'second_guest', title: __dialogueText("ui/NotebookDeductionRules.js", "t_9344379c04a158aec260"), question: __dialogueText("ui/NotebookDeductionRules.js", "t_5a38bb2bdf2f626aa1b4"), requires: ['checked_jacket', 'swallow_logo', 'two_glasses'],
    options: [{ id: 'nora', label: __dialogueText("ui/NotebookDeductionRules.js", "t_4cca0264ed42816c466a"), requires: ['nora'] }, { id: 'claire', label: __dialogueText("ui/NotebookDeductionRules.js", "t_dd853f1a991e5416eb3a"), requires: ['claire'] }, { id: 'alone', label: __dialogueText("ui/NotebookDeductionRules.js", "t_1c5d2286ee8e1a6ee69f"), requires: [] }] },
  { id: 'photo_location', title: __dialogueText("ui/NotebookDeductionRules.js", "t_7ce6be7bdabe74eca9d3"), question: __dialogueText("ui/NotebookDeductionRules.js", "t_cdb6e6b93ddcad291c5d"), requires: ['seahorse_logo'],
    options: [{ id: 'miramar', label: __dialogueText("ui/NotebookDeductionRules.js", "t_bdb278f61cbb12df8159"), requires: ['miramar'] }, { id: 'mariner', label: __dialogueText("ui/NotebookDeductionRules.js", "t_fc231173be13141f8c54"), requires: ['mariner'] }, { id: 'coral', label: __dialogueText("ui/NotebookDeductionRules.js", "t_19c87b41ca92aa350949"), requires: ['coral'] }] },
  { id: 'trip_purpose', title: __dialogueText("ui/NotebookDeductionRules.js", "t_dfc352ed4cc63505c671"), question: __dialogueText("ui/NotebookDeductionRules.js", "t_bae8e830c10f64b4780b"), requires: ['swallow_logo', 'open_skies', 'conference'],
    options: [{ id: 'work', label: __dialogueText("ui/NotebookDeductionRules.js", "t_962a2ad3cab31e964597"), requires: [] }, { id: 'private', label: __dialogueText("ui/NotebookDeductionRules.js", "t_67b4a7fc7fef27bffeb4"), requires: [] }, { id: 'both', label: __dialogueText("ui/NotebookDeductionRules.js", "t_cf335190c3f02c822b46"), requires: [] }] }
];

export function extendNotebookKeywords(search) {
  const definition = array(search?.data?.cases).find(item => item.id === CASE_ID);
  if (!definition) return false;
  if (!definition.clouds.some(item => item.id === 'table')) definition.clouds.push({ id: 'table', title: __dialogueText("ui/NotebookDeductionRules.js", "t_56210e626676946b04ec") });
  if (!definition.keywords.some(item => item.id === 'two_glasses')) definition.keywords.push({ id: 'two_glasses', label: __dialogueText("ui/NotebookDeductionRules.js", "t_d542d355ef10904480ea"), cloudId: 'table' });
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
