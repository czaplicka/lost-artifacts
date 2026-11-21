import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { CASE_ID } from './TableForThreeModel.js';
import { readTableForThree } from './TableForThreeService.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../config/TableForThreeLocations.js';
import { getTown } from '../config/RoadTripTowns.js';
import { NOTE_LIMIT, buildTableForThreeNotebook } from './TableForThreeNotebookModel.js';

export function readTableForThreeNotebook() {
  const quest = gameState.piQuests?.quests?.[CASE_ID];
  if (!quest) return null;
  const view = buildTableForThreeNotebook(readTableForThree(), quest.metadata?.tableForThreeEvidence, {
    company: L.company.name, restaurant: L.restaurant.name,
    restaurantTown: getTown(L.restaurant.townId).name
  });
  if (!view) return null;
  const stored = quest.metadata?.tableForThreeNotes;
  return { ...view, note: typeof stored?.text === 'string' ? stored.text : '',
    noteEditable: !stored || stored.version === 1, noteLimit: NOTE_LIMIT };
}
export function saveTableForThreeNotes(text) {
  const quest = gameState.piQuests?.quests?.[CASE_ID];
  if (!quest) return { ok: false, message: 'The accepted case is missing.' };
  const stored = quest.metadata?.tableForThreeNotes;
  if (stored && stored.version !== 1) return { ok: false, message: 'These notes use an unsupported version. They were not overwritten.' };
  if (typeof text !== 'string' || text.length > NOTE_LIMIT) return { ok: false, message: 'Notes must contain no more than ' + NOTE_LIMIT + ' characters.' };
  if ((stored?.text || '') === text) return { ok: true, message: 'No changes to save.' };
  gameState.piQuests = { ...gameState.piQuests, quests: {
    ...gameState.piQuests.quests, [CASE_ID]: { ...quest, metadata: {
      ...(quest.metadata || {}), tableForThreeNotes: { version: 1, text }
    }}
  }};
  try { requestAutosave(); }
  catch (error) {
    console.error('[TableForThree] Notes autosave request failed:', error);
    return { ok: true, warning: true, message: 'Notes updated in memory, but autosave could not be requested. Save the game manually.' };
  }
  return { ok: true, message: 'Notes updated. Autosave requested.' };
}
