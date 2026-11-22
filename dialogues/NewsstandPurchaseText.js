export const NEWSSTAND_PURCHASE_TEXT = Object.freeze({
  bought:'Purchased: {item}',
  paid:'Cash deducted: {amount}',
  balance:'Cash remaining: {amount}',
  free:'No charge.',
  owned:'Already purchased: {item}',
  noExtra:'No additional charge.',
  missingBackground:'NEWSSTAND BACKGROUND MISSING'
});

export function newsstandPurchaseText(id, values = {}) {
  const source = NEWSSTAND_PURCHASE_TEXT[id];
  if (typeof source !== 'string') throw new Error(`Unknown newsstand text: ${id}`);
  return source.replace(/\{(\w+)\}/g, (match,key) =>
    Object.prototype.hasOwnProperty.call(values,key) ? String(values[key]) : match
  );
}
