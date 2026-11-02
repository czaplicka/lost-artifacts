const same = (a,b) => a != null && b != null && String(a) === String(b);
export function retryInventoryItem(item, { caseKey, caseId, missionId }) {
  const metadata = item?.metadata || {}, apartment = metadata.apartment;
  if (apartment) return apartment.caseKey != null ? apartment.caseKey === caseKey : same(apartment.missionId, missionId);
  const evidence = metadata.isClue === true || metadata.isEscapeClue === true || metadata.isEscapeFragment === true || metadata.isIdentityLead === true;
  return evidence && same(metadata.caseId, caseId);
}
export function differentPool(items, previousId, getId = item => item.id) {
  const alternatives = items.filter(item => !same(getId(item), previousId));
  return alternatives.length ? alternatives : items;
}
export function clearAttemptApartments(progress, missionIds) {
  const next = { ...(progress || {}) };
  for (const id of missionIds) if (id != null) delete next[String(id)];
  return next;
}

export function clearMissionVisitFlags(flags, missionIds) {
  const suffixes = missionIds.filter(id => id != null).map(id => `_${id}`);
  return Object.fromEntries(Object.entries(flags || {}).filter(([key]) => !suffixes.some(suffix => key.endsWith(suffix))));
}
