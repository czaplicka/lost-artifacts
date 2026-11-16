import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { CASE_ID, createCaseState, transition, getObjectives, buildReport } from './TableForThreeModel.js';

// This adapter attaches progress to an already accepted quest. It does not accept
// contracts, charge money, modify inventory, award rewards or start scenes.
export function readTableForThree() {
  const quest=gameState.piQuests?.quests?.[CASE_ID];
  if(!quest) return null;
  return structuredClone(quest.metadata?.tableForThree || createCaseState());
}
export function dispatchTableForThree(action,validatedContext={}) {
  const quest=gameState.piQuests?.quests?.[CASE_ID];
  if(!quest || quest.status!=='active') return {ok:false,reason:'An active Table for Three contract is required.'};
  const result=transition(readTableForThree(),action,validatedContext);
  if(!result.ok) return result;
  const resolution=action.type==='SUBMIT_REPORT'
    ? {...(quest.resolution||{}),report:buildReport(result.state)}
    : quest.resolution;
  gameState.piQuests={...gameState.piQuests,quests:{...gameState.piQuests.quests,[CASE_ID]:{
    ...quest,metadata:{...(quest.metadata||{}),tableForThree:result.state},
    objectives:getObjectives(result.state),...(resolution?{resolution}:{})
  }}};
  requestAutosave();
  return result;
}
