import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeGordonInterview,planGordonQuestion,acknowledgeGordonReply } from './gordonInterviewModel.js';
export const gordonInterviewData=await loadJson('./assets/data/gordonFirstInterview.json',import.meta.url);
const KEY='gordon_first_interview';
function read(){
  const raw=MainStoryManager.getSideClue(KEY)||{};
  return normalizeGordonInterview(gordonInterviewData,{...raw,completed:MainStoryManager.hasFlag(gordonInterviewData.completedFlag)});
}
export function getGordonInterviewState(){
  const state=read();
  const unlocked=MainStoryManager.hasFlag(gordonInterviewData.requiredFlag)&&getCompletedAgencyCaseCount()>=gordonInterviewData.minimumCompletedMissions;
  const pending=gordonInterviewData.topics.find(topic=>topic.id===state.pendingTopic);
  return{...state,unlocked,availableTopics:gordonInterviewData.topics.filter(topic=>!state.asked.includes(topic.id)).map(topic=>({id:topic.id,label:topic.label})),pendingQuestion:pending?.question??null,pendingReply:pending?[...pending.reply]:null};
}
export function beginGordonQuestion(topicId){
  const state=getGordonInterviewState();if(!state.unlocked)return{success:false,reason:'locked'};
  const result=planGordonQuestion(gordonInterviewData,state,topicId);if(!result.ok)return{...result,success:false};
  MainStoryManager.setSideClue(KEY,result.state);return{...result,success:true,saved:saveGameState()};
}
export function completeGordonReply(){
  const state=getGordonInterviewState();if(!state.unlocked)return{success:false,reason:'locked'};
  const result=acknowledgeGordonReply(gordonInterviewData,state);if(!result.ok)return{...result,success:false};
  MainStoryManager.setSideClue(KEY,result.state);return{...result,success:true,saved:saveGameState()};
}
export function completeGordonDismissal(){
  const state=getGordonInterviewState();if(!state.unlocked)return{success:false,reason:'locked'};
  if(state.completed)return{success:true,alreadyCompleted:true};
  if(!state.dismissalPending||state.pendingTopic)return{success:false,reason:'meeting_not_finished'};
  MainStoryManager.setSideClue(KEY,{version:1,asked:[...state.asked],pendingTopic:null,dismissalPending:false,completed:true});
  MainStoryManager.setFlag(gordonInterviewData.completedFlag,true);MainStoryManager.setFlag('gordon_dismissal_heard',true);
  const previous=MainStoryManager.getSideClue('holly_chapter_progress');
  if(!(Number(previous?.chapter)>2))MainStoryManager.setSideClue('holly_chapter_progress',{
    ...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{}),version:1,chapter:2,chapterOneCompleted:true,objective:gordonInterviewData.nextObjective
  });
  return{success:true,saved:saveGameState(),message:gordonInterviewData.successText};
}
