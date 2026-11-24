import {gameState} from '../GameData.js';
import {getMissionCaseKey} from '../crimeCaseKey.js';
import {saveGameState,getPersistenceStatus} from '../gameStatePersistence.js';
import {isStateRestoreInProgress} from '../gameState/saveRestore.js';
import {progressionManager} from '../managers/ProgressionManager.js';
import {filePuzzleConclusion} from './AlibiPuzzleCompletion.js';
let busy=false;
export function completeAlibiPuzzle(caseKey){
 if(busy)return {accepted:false,reason:'busy'};
 busy=true;
 try{return filePuzzleConclusion(gameState,{
  caseKey,activeCaseKey:getMissionCaseKey(gameState),
  canWrite:()=>{const s=getPersistenceStatus();return !s.busy&&!s.rollbackUnsafe&&!s.automaticSaveBlocked&&!isStateRestoreInProgress();},
  save:()=>saveGameState(),
  grantReward:(...args)=>progressionManager.grantReward(...args)
 });}finally{busy=false;}
}
