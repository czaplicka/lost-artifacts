import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

export const POSTAL_NOTEBOOK_CASE = 'pi_return_to_sender';
const words = [
  ['assignment', 'Returning sealed letter'],
  ['seal', 'Inspect the envelope, not its contents'],
  ['envelope', 'A. Reed / Clock Repairs'],
  ['trail', 'Three old addresses / PI office forwarding'],
  ['card', 'Signed forwarding authorisation'],
  ['clock', 'Small clock drawing'],
  ['notice', 'Public clock-repair notice'],
  ['ellis', 'Ellis Bell / formerly A. Reed'],
  ['alias', 'CLOCKWORK / poste restante'],
  ['identity', 'Recipient identified from authorised sources'],
  ['message', 'Message deposited for CLOCKWORK'],
  ['waiting', 'Leave the post office and return for a reply'],
  ['reply', 'Ellis confirms his former trading name'],
  ['privacy', 'Keep the new name private'],
  ['delivery', 'Leave the sealed letter for CLOCKWORK'],
  ['closed', 'Letter delivered / case closed'],
  ['private', 'New name kept private'],
  ['disclosed', 'New name disclosed to the sender']
].map(([id,label]) => ({id, label, cloudId:'postal', aliases:[label]}));

export function syncPostalNotebook() {
  const record = gameState.postOffice?.returnCase;
  if (!record || record.stage === 'new') return false;
  const known = new Set(['assignment','seal']);
  for (const clue of record.clues || []) {
    if (clue === 'envelope') { known.add('envelope'); known.add('trail'); }
    if (clue === 'card') { known.add('card'); known.add('clock'); }
    if (clue === 'notice') { known.add('notice'); known.add('ellis'); known.add('alias'); }
  }
  if (['identified','waiting','reply','completed'].includes(record.stage)) known.add('identity');
  if (['waiting','reply','completed'].includes(record.stage)) known.add('message');
  if (record.stage === 'waiting') known.add('waiting');
  if (['reply','completed'].includes(record.stage)) {
    for (const id of ['reply','privacy','delivery']) known.add(id);
  }
  if (record.stage === 'completed') {
    known.add('closed');
    if (record.ending === 'private') known.add('private');
    if (record.ending === 'disclose') known.add('disclosed');
  }
  const previous = gameState.piKeywordSearch;
  const base = previous?.version === 1 && previous.cases && !Array.isArray(previous.cases)
    ? previous : {version:1, selectedCaseId:null, cases:{}};
  const progress = base.cases[POSTAL_NOTEBOOK_CASE] || {known:[],history:[]};
  const merged = [...new Set([...(progress.known || []), ...known])];
  if (Array.isArray(progress.known) && merged.length === progress.known.length) return false;
  gameState.piKeywordSearch = {
    ...base,
    cases:{...base.cases, [POSTAL_NOTEBOOK_CASE]:{...progress, known:merged}}
  };
  requestAutosave();
  return true;
}

export function ensurePostalNotebookDefinition(data) {
  if (!Array.isArray(data?.cases)) return data;
  if (!data.cases.some(entry => entry.id === POSTAL_NOTEBOOK_CASE)) {
    data.cases.push({
      id:POSTAL_NOTEBOOK_CASE,
      title:'Return to Sender',
      clouds:[{id:'postal',title:'POST OFFICE'}],
      keywords:words.map(word => ({...word,aliases:[...word.aliases]})),
      initialKeywords:[], pages:[], recipes:[]
    });
  }
  syncPostalNotebook();
  return data;
}
