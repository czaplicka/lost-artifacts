export const LOCKPICK_ID = 'evidence_lockpick';
// Keep the historical ID; category and type determine the item's new role.
export function convertLockpickCatalog(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid item catalog.');
  const catalog = structuredClone(input);
  const source = catalog.evidence?.lockpick;
  const existing = catalog.equipment?.lockpick;
  if (source && existing) throw Error('Both evidence.lockpick and equipment.lockpick exist. Resolve the collision before converting. Nothing was changed.');
  if (!source && !existing) throw Error('Lockpick Set was not found. Nothing was changed.');
  const item = source || existing;
  if (item.id !== LOCKPICK_ID) throw Error('Unexpected lockpick ID. Nothing was changed.');
  if (catalog.equipment != null && (typeof catalog.equipment !== 'object' || Array.isArray(catalog.equipment))) throw Error('Invalid equipment category.');
  const changed = !!source || item.type !== 'tool';
  catalog.equipment = { ...(catalog.equipment || {}), lockpick: { ...item, type: 'tool' } };
  if (source) delete catalog.evidence.lockpick;
  return { catalog, changed };
}
export function connectLockpickConfig(text) {
  const fields = [...text.matchAll(/\blockpicksItemId\s*:\s*(null|'[^']*'|"[^"]*")/g)];
  if (fields.length !== 1) throw Error('Expected exactly one lockpicksItemId setting. Nothing was changed.');
  const value = fields[0][1];
  if (!["null", "'evidence_lockpick'", '"evidence_lockpick"'].includes(value)) throw Error('The lockpick route has a custom item ID. Nothing was changed.');
  const output = text.replace(/(\blockpicksItemId\s*:\s*)(null|'[^']*'|"[^"]*")/, "$1'evidence_lockpick'");
  return { text: output, changed: output !== text };
}
