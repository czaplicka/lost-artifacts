import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { MainStoryManager } from './managers/MainStoryManager.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { evaluateMargeBirthday } from './margeBirthdayModel.js';
export const margeBirthdayData=await loadJson('./assets/data/margeBirthday.json',import.meta.url);
const KEY='marge_birthday_investigation',F=margeBirthdayData.flags;
function read(){
  const saved=MainStoryManager.getSideClue(KEY),valid=new Set(margeBirthdayData.clues.map(clue=>clue.id));
  // Preserve the old discarded-note clue when migrating from the earlier data file.
  const clues=[...new Set((Array.isArray(saved?.clues)?saved.clues:[]).map(id=>id==='bin'?'note':id).filter(id=>valid.has(id)))];
  return{version:2,clues,answers:saved?.answers&&typeof saved.answers===__dialogueText("margeBirthdayService.js", "t_2958d416d08aa5a472d7")&&!Array.isArray(saved.answers)?{...saved.answers}:{},completed:MainStoryManager.hasFlag(F.deduced)};
}
export function getMargeBirthdayState(){
  const state=read(),unlocked=MainStoryManager.hasFlag(margeBirthdayData.requiredFlag),refused=MainStoryManager.hasFlag(F.refusal);
  return{...state,unlocked,refused,canExamine:unlocked&&refused,needsRefusal:unlocked&&!refused};
}
export function completeMargeRefusal(){
  if(!getMargeBirthdayState().unlocked)return{success:false,reason:'locked'};
  MainStoryManager.setFlag(F.refusal,true);return{success:true,saved:saveGameState()};
}
export function collectMargeBirthdayClue(clueId){
  const state=getMargeBirthdayState();if(!state.canExamine)return{success:false,reason:'locked'};
  const clue=margeBirthdayData.clues.find(item=>item.id===clueId);if(!clue)return{success:false,reason:'unknown_clue'};
  if(state.clues.includes(clueId))return{success:true,alreadyCollected:true,clue};
  const next=read();next.clues.push(clueId);MainStoryManager.setSideClue(KEY,next);return{success:true,clue,saved:saveGameState()};
}
export function saveMargeBirthdayAnswers(answers){
  const state=getMargeBirthdayState();if(!state.canExamine||state.completed)return{success:false,reason:'unavailable'};
  const clean={};for(const question of margeBirthdayData.questions)if(question.options.some(option=>option.id===answers?.[question.id]))clean[question.id]=answers[question.id];
  const next=read();next.answers=clean;MainStoryManager.setSideClue(KEY,next);return{success:true,saved:saveGameState()};
}
export function submitMargeBirthdayDeduction(answers){
  const state=getMargeBirthdayState();if(!state.canExamine)return{success:false,reason:'locked',message:__dialogueText("margeBirthdayService.js", "t_ca17cbd69b54e951ff0b")};
  if(state.completed)return{success:true,alreadyCompleted:true,message:margeBirthdayData.success};
  const result=evaluateMargeBirthday(margeBirthdayData,state.clues,answers),next=read();next.answers={};
  for(const question of margeBirthdayData.questions)if(question.options.some(option=>option.id===answers?.[question.id]))next.answers[question.id]=answers[question.id];
  next.completed=result.ok;MainStoryManager.setSideClue(KEY,next);
  if(result.ok){
    MainStoryManager.setFlag(F.deduced,true);const previous=MainStoryManager.getSideClue('holly_chapter_progress');
    if(!(Number(previous?.chapter)>2))MainStoryManager.setSideClue('holly_chapter_progress',{
      ...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{}),
      version:1,chapter:2,chapterOneCompleted:true,objective:'consider_marge_birthday_gesture'
    });
  }
  return{...result,success:result.ok,saved:saveGameState()};
}
