import { FinancialTraceScene } from './scenes/FinancialTraceScene.js';
import { getFinancialTraceStory } from './financialTraceService.js';
export function openFinancialTrace(game=window.game,{preview=true,returnSceneKey=null,onFinished=null}={}){
 if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getFinancialTraceStory().eligible)return false;
 const parent=returnSceneKey||['DetectiveOfficeScene','AgencyStorageScene','MediumOfficeScene','OfficeScene'].find(k=>game.scene.isActive(k));if(!parent||!game.scene.isActive(parent))throw new Error('Open your PI office or agency office first.');
 if(!preview&&parent!=='DetectiveOfficeScene')throw new Error('Review the financial copies in your PI office.');
 const key='FinancialTraceScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;if(!game.scene.keys[key])game.scene.add(key,FinancialTraceScene,false);game.scene.start(key,{preview,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
