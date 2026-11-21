import { supabase } from './supabase-client.js';
import { EventBus } from './EventBus.js';
import { GAME_VERSION } from './config/gameVersion.js';
import { createSaveManager } from './managers/SaveManager.js';
import { exportCurrentGameState, restoreSavedGameState } from './gameState/saveRestore.js';

function replaceGameState(savedState) {
  let restored;
  try { restored = restoreSavedGameState(savedState); }
  catch (error) {
    try { EventBus.emit('gameState:restoreFailed', { source: 'slot', error }); }
    catch (notificationError) { console.error('[saveGameService] Failure notification failed:', notificationError); }
    throw error;
  }
  // Notification errors must not undo an already committed restoration.
  try { EventBus.emit('gameState:restored', { source: 'slot' }); }
  catch (error) { console.error('[saveGameService] Restore notification failed:', error); }
  return restored;
}
export const saveManager = createSaveManager({
  supabase, gameVersion: GAME_VERSION,
  getState: exportCurrentGameState, applyState: replaceGameState
});
