// Pure validation for a result already stored in a case/station slot.
// Stored legacy results may omit completed=true; explicit failure always wins.
export function getLabResultValue(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  for (const key of ['value', 'result', 'correctValue', 'selectedValue']) {
    const value = result[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}
export function isCompletedLabResult(result, {caseKey = null} = {}) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
  if (result.aborted === true || result.completed === false || result.success === false) return false;
  if (caseKey !== null && result.caseKey != null && String(result.caseKey) !== String(caseKey)) return false;
  return getLabResultValue(result) !== null;
}
