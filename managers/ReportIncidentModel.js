const clone = value => structuredClone(value);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export function validateIncidentCatalog(data) {
  if (data?.version !== 1 || !Array.isArray(data.incidents) || data.incidents.length < 20) throw Error('Invalid report incident catalog.');
  const ids = new Set();
  for (const item of data.incidents) {
    if (!/^[a-z0-9_]+$/.test(item.id) || ids.has(item.id)) throw Error('Duplicate or invalid incident id.');
    ids.add(item.id);
    for (const key of ['category','sender','channel','subject','body']) if (typeof item[key] !== 'string' || !item[key].trim()) throw Error(`Missing ${key}: ${item.id}`);
    if (!Array.isArray(item.choices) || item.choices.length !== 3) throw Error('Three choices required.');
    const choices = new Set();
    for (const option of item.choices) {
      if (!/^[a-z0-9_]+$/.test(option.id) || choices.has(option.id)) throw Error('Invalid choice id.');
      choices.add(option.id);
      for (const key of ['label','reportText','outcome']) if (typeof option[key] !== 'string' || !option[key].trim()) throw Error('Invalid choice text.');
      if (!Number.isInteger(option.relationshipDelta) || Math.abs(option.relationshipDelta) > 5) throw Error('Invalid relationship effect.');
    }
  }
  return clone(data);
}
export function freshIncidentState() { return {version:1, entries:{}, order:[], relationships:{}}; }
export function readIncidentState(raw) {
  if (raw == null) return freshIncidentState();
  if (raw.version !== 1 || !raw.entries || typeof raw.entries !== 'object' || Array.isArray(raw.entries) || !Array.isArray(raw.order) || !raw.relationships || typeof raw.relationships !== 'object' || Array.isArray(raw.relationships)) throw Error('Invalid report incident save.');
  const state = clone(raw);
  for (const key of state.order) if (typeof key !== 'string' || !own(state.entries,key)) throw Error('Invalid incident order.');
  if (new Set(state.order).size !== state.order.length) throw Error('Duplicate incident order.');
  const used=new Set();
  for (const key of Object.keys(state.entries)) {
    const entry=state.entries[key];
    if (!state.order.includes(key) || !entry || typeof entry.definition?.id !== 'string' || used.has(entry.definition.id) || !Array.isArray(entry.definition.choices) || !['draft','printed','resolved'].includes(entry.phase)) throw Error('Invalid incident entry.');
    used.add(entry.definition.id);
    if (entry.choiceId != null && !entry.definition.choices.some(c=>c.id===entry.choiceId)) throw Error('Unknown saved choice.');
    if (entry.phase !== 'draft' && entry.choiceId == null) throw Error('Missing locked choice.');
  }
  for (const value of Object.values(state.relationships)) if (!Number.isFinite(value)) throw Error('Invalid relationship score.');
  return state;
}
export function allocateIncident(raw, caseId, catalog, random=Math.random) {
  const state=readIncidentState(raw), key=`report:${caseId}`;
  if (typeof caseId !== 'string' || !caseId.trim()) throw Error('A case id is required.');
  if (own(state.entries,key)) return {state, entry:clone(state.entries[key]), changed:false};
  const used=new Set(Object.values(state.entries).map(entry=>entry.definition.id));
  const remaining=catalog.incidents.filter(item=>!used.has(item.id));
  if (!remaining.length) return {state,entry:null,changed:false};
  const last=state.entries[state.order.at(-1)]?.definition;
  const varied=remaining.filter(item=>item.category!==last?.category && item.sender!==last?.sender);
  const pool=varied.length?varied:remaining;
  const roll=random();
  if (!Number.isFinite(roll) || roll<0 || roll>=1) throw Error('Invalid random sample.');
  const entry={caseId,definition:clone(pool[Math.floor(roll*pool.length)]),choiceId:null,phase:'draft'};
  state.entries[key]=entry; state.order.push(key);
  return {state,entry:clone(entry),changed:true};
}
export function chooseIncident(raw, caseId, choiceId) {
  const state=readIncidentState(raw), entry=state.entries[`report:${caseId}`];
  if (!entry || entry.phase!=='draft' || !entry.definition.choices.some(c=>c.id===choiceId)) return {ok:false,state};
  entry.choiceId=choiceId; return {ok:true,state};
}
export function lockIncident(raw, caseId) {
  const state=readIncidentState(raw),entry=state.entries[`report:${caseId}`];
  if (!entry) return {ok:true,state};
  if (!entry.choiceId) return {ok:false,state};
  if (entry.phase==='draft') entry.phase='printed';
  return {ok:true,state};
}
export function settleIncident(raw,caseId) {
  const state=readIncidentState(raw),entry=state.entries[`report:${caseId}`];
  if (!entry) return {ok:true,state,changed:false};
  if (entry.phase==='resolved') return {ok:true,state,changed:false};
  if (entry.phase!=='printed') return {ok:false,state,changed:false};
  const choice=entry.definition.choices.find(c=>c.id===entry.choiceId);
  entry.phase='resolved'; entry.outcome=choice.outcome;
  const key=entry.definition.sender;
  state.relationships[key]=Math.max(-100,Math.min(100,(state.relationships[key]||0)+choice.relationshipDelta));
  return {ok:true,state,changed:true};
}
