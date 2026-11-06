import { HollyFinancialLeadScene } from './scenes/HollyFinancialLeadScene.js';
import { getHollyFinancialState } from './hollyFinancialLeadService.js';
export function openHollyFinancialLead(game=window.game,{preview=true,returnSceneKey=null,onFinished=null}={}){
  if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getHollyFinancialState().canContact)return false;
  const parent=returnSceneKey||['DetectiveOfficeScene','AgencyStorageScene','ArchiveScene','MediumOfficeScene','OfficeScene'].find(key=>game.scene.isActive(key));
  if(!parent||!game.scene.isActive(parent))throw new Error('Open an agency location or your PI office first.');
  const key='HollyFinancialLeadScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,HollyFinancialLeadScene,false);game.scene.start(key,{preview,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
