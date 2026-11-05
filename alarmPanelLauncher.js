import { AlarmPanelScene } from './scenes/AlarmPanelScene.js';
import { gameState } from './GameData.js';

export function openAlarmPanel(game=window.game,options={}){
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const parent=options.returnSceneKey||game.registry.get('currentSceneKey');
  if(!parent||!game.scene.isActive(parent))throw new Error('Pass the active returnSceneKey.');
  const key='AlarmPanelScene';
  if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,AlarmPanelScene,false);
  game.scene.start(key,{...options,contextId:options.contextId??gameState.currentCaseId??null,returnSceneKey:parent});
  game.scene.bringToTop(key);return true;
}
