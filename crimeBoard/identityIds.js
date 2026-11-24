function scalar(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return '';
}
export const caseIdentityId = value => {
  const id = scalar(value); return id ? `case:${encodeURIComponent(id)}` : '';
};
export const thiefIdentityId = value => {
  const id = scalar(value); return id ? `thief:${encodeURIComponent(id)}` : '';
};
export function isIdentityId(value) {
  if (typeof value !== 'string' || !/^(case|thief):.+$/.test(value)) return false;
  try {
    const at = value.indexOf(':'), raw = decodeURIComponent(value.slice(at + 1));
    return (value.startsWith('case:') ? caseIdentityId(raw) : thiefIdentityId(raw)) === value;
  } catch { return false; }
}
export function getCardIdentityId(card) {
  if (!card || card.suspectId == null) return '';
  return Array.isArray(card.tags) && card.tags.includes('warrant-identity')
    ? thiefIdentityId(card.suspectId) : caseIdentityId(card.suspectId);
}
const distinct = values => [...new Set(values.map(scalar).filter(Boolean))];
export function getActualIdentityIds(state = {}) {
  const canonical = distinct([state.actualCriminalId, state.currentThiefId, state.currentThief?.id]);
  if (canonical.length > 1) return [];
  const local = distinct([state.trueThiefCaseSuspectId, state.realThiefSuspectId,
    state.caseData?.trueThiefCaseSuspectId, state.caseData?.realThiefSuspectId,
    state.currentThiefCaseSuspectId, state.currentThief?.caseSuspectId]);
  if (local.length > 1) return [];
  const lists = [state.caseSuspects, state.suspects, state.suspectList];
  const people = lists.find(list => Array.isArray(list) && list.length) || [];
  const flagged = people.filter(person => person?.isRealThief === true || person?.hiddenCaseData?.isTrueThief === true);
  if (flagged.length > 1) return [];
  const mapped = canonical.length ? people.filter(person =>
    scalar(person?.hiddenCaseData?.realThiefId) === canonical[0]) : [];
  if (mapped.length > 1) return [];
  const choices = distinct([local[0], flagged[0]?.id, mapped[0]?.id]);
  if (choices.length !== 1) return [];
  const matches = people.filter(person => scalar(person?.id) === choices[0]);
  if (matches.length !== 1) return [];
  const person = matches[0];
  if (person.isRealThief === false || person.hiddenCaseData?.isTrueThief === false ||
      person.hiddenCaseData?.isForensicTwin === true) return [];
  const linked = scalar(person.hiddenCaseData?.realThiefId);
  if (canonical.length && linked && canonical[0] !== linked) return [];
  const actual = canonical[0] || linked;
  return [caseIdentityId(person.id), ...(actual ? [thiefIdentityId(actual)] : [])];
}
export function evaluateIdentityAnswer(state, answerId) {
  if (!isIdentityId(answerId)) return null;
  const actual = getActualIdentityIds(state);
  return actual.length ? actual.includes(answerId) : null;
}
