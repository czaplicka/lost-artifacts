import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeHollySurvival,hollySurvivalEligible } from './hollySurvivalUpdateModel.js';
export const hollyFinancialData=await loadJson('./assets/data/hollyFinancialLead.json',import.meta.url);
const KEY='holly_financial_lead_call';
export function getHollyFinancialState(state=gameState){
  const progress=normalizeHollySurvival(hollyFinancialData,MainStoryManager.getSideClue(KEY));
  const eligible=hollySurvivalEligible(hollyFinancialData,getCompletedAgencyCaseCount(state),flag=>MainStoryManager.hasFlag(flag),MainStoryManager.hasReachedStage('confirmed_faked_death'));
  const completed=progress.completed||MainStoryManager.hasFlag('holly_financial_lead_received');return{...progress,eligible,completed,canContact:eligible&&!completed};
}
export function storeHollyFinancial(raw,state=gameState){
  const status=getHollyFinancialState(state);if(!status.eligible)return{success:false,saved:false};
  if(status.completed)return{success:true,alreadyCompleted:true,saved:saveGameState()};
  const progress=normalizeHollySurvival(hollyFinancialData,raw);MainStoryManager.setSideClue(KEY,progress);
  if(progress.completed){
    MainStoryManager.setFlag('holly_financial_lead_received',true);
    MainStoryManager.setFlag('holly_financial_records_permission_recorded',true);
    MainStoryManager.setFlag('agency_medical_review_lead_unlocked',true);
    MainStoryManager.setSideClue('holly_financial_records_scope',{source:'records_supplied_by_holly',access:'copies_only',liveBankAccess:false,credentialsStored:false,
      guiltEstablished:false,earlierSearchEstablished:false,nextObjective:'complete_mission_nine_then_medical_review'});
    const old=MainStoryManager.getSideClue('holly_chapter_progress');
    if(!(Number(old?.chapter)>3))MainStoryManager.setSideClue('holly_chapter_progress',{
      ...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:3,objective:'complete_mission_nine_then_medical_review'});
  }
  return{success:true,saved:saveGameState(),progress};
}
