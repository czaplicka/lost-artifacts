// Fictional puzzle conventions, not medical or legal conclusions.
const TRAITS = {
  vegan: 'Vegan.', lanolin_sensitive: 'Lanolin sensitivity.',
  vegetarian: 'Vegetarian.', pollen_sensitive: 'Seasonal pollen sensitivity.',
  caffeine_free: 'Avoids caffeine.', night_reader: 'Reads before bed. Usually until morning.',
  stamp_collector: 'Collects stamps. Has opinions about glue.', poor_sleeper: 'Light sleeper. Heavy complainer.'
};
const RULES = {
  natural_leather: { label: 'Natural leather', material: 'leather', labText: 'Natural animal leather. Synthetic substitutes ruled out.', conflicts: ['vegan'] },
  wool_lanolin: { label: 'Wool with lanolin residue', material: 'wool', labText: 'Wool fibre. Residual lanolin detected.', conflicts: ['vegan', 'lanolin_sensitive'] }
};
const NEUTRAL = ['vegetarian', 'pollen_sensitive', 'caffeine_free', 'night_reader', 'stamp_collector', 'poor_sleeper'];
function rule(id) {
  if (!Object.hasOwn(RULES, id)) throw new Error(`Unsupported material profile: ${id}`);
  return RULES[id];
}
function draw(items, rng) {
  const roll = rng();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('rng must return a number in [0, 1).');
  return items[Math.floor(roll * items.length)];
}
function sample(items, count, rng) {
  const pool = [...items], result = [];
  while (result.length < count && pool.length) {
    const item = draw(pool, rng); pool.splice(pool.indexOf(item), 1); result.push(item);
  }
  return result;
}
function traits(profile) {
  if (!profile || profile.schemaVersion !== 1 || profile.complete !== true || !Array.isArray(profile.traitIds)) return null;
  for (const id of profile.traitIds) if (!Object.hasOwn(TRAITS, id)) throw new Error(`Unknown dossier trait: ${id}`);
  return [...new Set(profile.traitIds)];
}
export function getMaterialProfiles() {
  return Object.entries(RULES).map(([id, {label, material, labText}]) => ({id, label, material, labText}));
}
export function createMaterialEvidence(profileId, {
  stationId = 'trace_1', sourceConfirmed = false, sourceText = '', id = `trace_${profileId}`
} = {}) {
  const r = rule(profileId);
  if (typeof sourceConfirmed !== 'boolean') throw new Error('sourceConfirmed must be boolean.');
  if (sourceConfirmed && !String(sourceText).trim()) throw new Error('Confirmed origin needs a description.');
  return {
    id, stationId, attribute: 'material_profile', evidenceType: 'material_profile',
    minigame: 'MaterialAnalysisScene', label: 'Material Analysis',
    correctValue: profileId, thief_value: profileId, clueType: 'trace',
    clueText: r.labText, isRedHerring: false,
    sourceConfirmed, sourceText: String(sourceText).trim()
  };
}
export function evaluateMaterialEvidence(suspect, evidence) {
  if (evidence?.evidenceType !== 'material_profile') throw new Error('Expected material_profile evidence.');
  const r = rule(evidence.correctValue ?? evidence.thief_value);
  if (evidence.sourceConfirmed !== true || !evidence.sourceText?.trim()) return {status: 'unknown', reasonCode: 'unconfirmed_origin'};
  const ids = traits(suspect?.materialProfile);
  if (!ids) return {status: 'unknown', reasonCode: 'missing_profile'};
  const conflict = ids.find(id => r.conflicts.includes(id));
  return conflict ? {status: 'incompatible', reasonCode: 'material_conflict', traitId: conflict}
    : {status: 'compatible', reasonCode: 'no_material_conflict'};
}
export function getMaterialDossierNotes(suspect) {
  return (traits(suspect?.materialProfile) || []).map(id => ({id: `personal_${id}`, text: TRAITS[id]}));
}
export function createMaterialProfile(profileId, {compatible = true, rng = Math.random} = {}) {
  const r = rule(profileId);
  if (typeof compatible !== 'boolean') throw new Error('compatible must be boolean.');
  return {schemaVersion: 1, complete: true, traitIds: compatible
    ? sample(Object.keys(TRAITS).filter(id => !r.conflicts.includes(id)), 3, rng)
    : [draw(r.conflicts, rng), ...sample(NEUTRAL, 2, rng)]};
}
export function prepareMaterialSuspects(suspects, evidence, {excludedIds, protectedIds, rng = Math.random} = {}) {
  if (!Array.isArray(suspects) || !suspects.length || !Array.isArray(excludedIds) || !Array.isArray(protectedIds)) throw new Error('Explicit suspects and plan required.');
  const ids = suspects.map(s => s.id), excluded = new Set(excludedIds), protectedSet = new Set(protectedIds);
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error('Unique IDs required.');
  if (!excluded.size || protectedSet.size !== 2) throw new Error('Exclude at least one; protect exactly two.');
  for (const id of [...excluded, ...protectedSet]) if (!ids.includes(id)) throw new Error(`Unknown ID: ${id}`);
  for (const id of excluded) if (protectedSet.has(id)) throw new Error('Protected candidate cannot be excluded.');
  for (const s of suspects) if ((s.isRealThief || s.hiddenCaseData?.isForensicTwin) && !protectedSet.has(s.id)) throw new Error('Thief and twin must be protected.');
  if (evidence?.evidenceType !== 'material_profile' || evidence.sourceConfirmed !== true || !evidence.sourceText?.trim()) throw new Error('Confirmed material origin required.');
  const result = structuredClone(suspects);
  for (const s of result) {
    const desired = excluded.has(s.id) ? 'incompatible' : 'compatible';
    if (s.materialProfile != null) {
      if (!traits(s.materialProfile) || evaluateMaterialEvidence(s, evidence).status !== desired) throw new Error(`Existing traits conflict: ${s.id}`);
    } else s.materialProfile = createMaterialProfile(evidence.correctValue ?? evidence.thief_value, {compatible: desired === 'compatible', rng});
  }
  return result;
}
export function validateMaterialStage(suspects, evidence, {previousSurvivorIds, expectedSurvivors = 2, protectedIds} = {}) {
  if (!Array.isArray(previousSurvivorIds) || !Array.isArray(protectedIds)) throw new Error('Explicit survivor plan required.');
  const known = new Set(suspects.map(s => s.id)), previous = new Set(previousSurvivorIds);
  for (const id of previous) if (!known.has(id)) throw new Error(`Unknown previous survivor: ${id}`);
  const survivors = suspects.filter(s => previous.has(s.id)).filter(s => {
    const result = evaluateMaterialEvidence(s, evidence);
    if (result.status === 'unknown') throw new Error(`Incomplete profile: ${s.id}`);
    return result.status === 'compatible';
  }).map(s => s.id);
  if (survivors.length !== expectedSurvivors || protectedIds.some(id => !survivors.includes(id))) throw new Error('Invalid material survivor plan.');
  return survivors;
}
