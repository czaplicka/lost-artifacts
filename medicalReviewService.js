import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeMedical,medicalEligible } from './scenes/medical/MedicalReviewModel.js';
export const medicalReviewData=await loadJson('./assets/data/medicalReview.json',import.meta.url);
const KEY='agency_medical_review_progress';
export function getMedicalReviewStory(state=gameState){return{...normalizeMedical(medicalReviewData,MainStoryManager.getSideClue(KEY)),eligible:medicalEligible(medicalReviewData,getCompletedAgencyCaseCount(state),flag=>MainStoryManager.hasFlag(flag))};}
export function storeMedicalReview(raw,state=gameState){
  if(!getMedicalReviewStory(state).eligible)return{success:false,saved:false};
  const progress=normalizeMedical(medicalReviewData,raw),done=MainStoryManager.hasFlag('agency_medical_review_completed');
  MainStoryManager.setSideClue(KEY,progress);
  if(progress.completed){
    MainStoryManager.setFlag('agency_medical_review_completed',true);MainStoryManager.setFlag('john_preflight_poisoning_disclosed',true);MainStoryManager.setFlag('john_preflight_gunshot_disclosed',true);
    MainStoryManager.setFlag('financial_trace_after_mission_ten_unlocked',true);
    MainStoryManager.setSideClue('john_preflight_medical_summary',{source:'doctor_lecter',record:'preflight_clinical_summary',poisoningTreatmentRecorded:true,gunshotTreatmentRecorded:true,predatesTransport:true,perpetratorIdentified:false});
    const old=MainStoryManager.getSideClue('holly_chapter_progress');
    if(!done&&!(Number(old?.chapter)>3))MainStoryManager.setSideClue('holly_chapter_progress',{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:3,objective:'complete_mission_ten_then_trace_finances'});
  }
  return{success:true,saved:saveGameState(),progress};
}
