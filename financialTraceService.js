import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeFinancial,financialEligible } from './scenes/financial/FinancialTraceModel.js';
export const financialTraceData=await loadJson('./assets/data/financialTrace.json',import.meta.url);
const KEY='holly_financial_trace';
export function getFinancialTraceStory(state=gameState){return{...normalizeFinancial(financialTraceData,MainStoryManager.getSideClue(KEY)),eligible:financialEligible(financialTraceData,getCompletedAgencyCaseCount(state),flag=>MainStoryManager.hasFlag(flag))};}
export function storeFinancialTrace(raw,state=gameState){
 if(!getFinancialTraceStory(state).eligible)return{success:false,saved:false};const progress=normalizeFinancial(financialTraceData,raw),wasDone=MainStoryManager.hasFlag('holly_prior_search_confirmed');
 MainStoryManager.setSideClue(KEY,progress);
 if(progress.alteredId)MainStoryManager.setFlag('holly_financial_company_contact_unlocked',true);
 if(progress.companyCompleted){
  MainStoryManager.setFlag('holly_prior_search_confirmed',true);MainStoryManager.setFlag('holly_prior_survival_knowledge_confirmed',true);MainStoryManager.setFlag('mission_radio_review_after_eleven_unlocked',true);
  MainStoryManager.setSideClue('holly_prior_search_evidence',{source:'supplied_financial_copies_and_company_confirmation',reference:'SOT-17',paymentOffsetFromRetainer:-12,alteredCopyOffset:2,survivalResultDeliveredBeforeRetainer:true,clientAcknowledgementConfirmed:true,currentAddressKnown:false,forgerIdentified:false,attemptedKillingProved:false});
  const old=MainStoryManager.getSideClue('holly_chapter_progress');if(!wasDone&&!(Number(old?.chapter)>3))MainStoryManager.setSideClue('holly_chapter_progress',{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:3,objective:'complete_mission_eleven_then_review_radio'});
 }
 return{success:true,saved:saveGameState(),progress};
}
