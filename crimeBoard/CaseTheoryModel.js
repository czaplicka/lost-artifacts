import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { getOpportunityFacts, evaluateOpportunity } from '../systems/OpportunityRules.js';
export const THEORY_FIELDS=[
 ['identity',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_999f23fcd7bec7075e54"),__dialogueText("crimeBoard/CaseTheoryModel.js", "t_8271ae31a8e1a8fcdaea")],['motive',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_3c304325a9d42f41663b"),__dialogueText("crimeBoard/CaseTheoryModel.js", "t_a50a3df2af2b7df540a1")],
 ['means',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_f40aa59edb5c4a6061ff"),__dialogueText("crimeBoard/CaseTheoryModel.js", "t_4900623ddf3ecd6ef538")],['opportunity',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_e969f85c47caa12786cb"),__dialogueText("crimeBoard/CaseTheoryModel.js", "t_86131d43ba4710c7bcf4")]
];
export const THEORY_OPTIONS={opportunity:[
 ['work_access',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_62b4781e97a956ec7756")],
 ['unobserved_interval',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_811ecf7c46df32149dbb")],
 ['false_alibi',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_433a30e034f77933d59d")],
 ['borrowed_access',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_caed54151d13150c1a4a")],
 ['security_gap',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_14d0d83e7f52e74fdeca")],
 ['public_access',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_87416750a6e8cf8a60ae")]
]};
export function normalizeSkillId(value){
 const id=String(value??'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
 return ['pickpocket','pickpocketing',__dialogueText("crimeBoard/CaseTheoryModel.js", "t_fdb3d1ed938473e1e4ae")].includes(id)?'pickpocket':id;
}
const strings=values=>[...new Set((Array.isArray(values)?values:[])
 .filter(value=>typeof value==='string'&&value.trim()).map(value=>value.trim()))];
export function theoryCaseKey(state){
 const m=state.currentMission||{};
 return String(m.id??m.caseId??m.caseIndex??`${state.caseSuspectCityId??state.crimeCityId??state.crimeCity??m.city??'unknown'}_${m.artifactKey??m.artifact??'default'}`);
}
export function normalizeTheory(raw={}){
 const source=raw&&typeof raw==='object'?raw:{};
 const result={version:3,status:'draft',sections:{},caseId:source.caseId??null,campaignId:source.campaignId??null,
  updatedAt:source.updatedAt||null,hintReceipts:source.hintReceipts&&typeof source.hintReceipts==='object'&&!Array.isArray(source.hintReceipts)?JSON.parse(JSON.stringify(source.hintReceipts)):{}};
 for(const [field]of THEORY_FIELDS){
  const value=source.sections?.[field]||{};
  result.sections[field]={answerId:field==='means'?'':typeof value.answerId==='string'?value.answerId.trim():'',evidenceIds:strings(value.evidenceIds),note:typeof value.note==='string'?value.note:''};
  if(field==='means'){
   result.sections.means.skillIds=[...new Set(strings(value.skillIds).map(normalizeSkillId).filter(Boolean))];
   result.sections.means.legacyAnswerId=value.legacyAnswerId||value.answerId||'';
  }
 }
 return result;
}
export function readTheory(state){
 const raw=state.caseTheories?.[theoryCaseKey(state)];
 if(raw?.caseId!=null&&String(raw.caseId)!==String(state.currentCaseId))return normalizeTheory();
 if(raw?.campaignId!=null&&raw.campaignId!==state._createdAt)return normalizeTheory();
 return normalizeTheory(raw);
}
export function buildSkillOptions(database){
 if(!Array.isArray(database))throw new Error('Case Theory: suspects.json must contain an array.');
 const skills=new Map();
 for(const person of database){
  const raw=person?.skills,list=Array.isArray(raw)?raw:typeof raw==='string'?raw.split(','):[];
  for(const value of list){
   if(typeof value!=='string'||!value.trim())continue;
   const id=normalizeSkillId(value),label=id==='pickpocket'?__dialogueText("crimeBoard/CaseTheoryModel.js", "t_f3ac5fe953d58a49296d"):value.trim().charAt(0).toUpperCase()+value.trim().slice(1);
   if(id&&!skills.has(id))skills.set(id,label);
  }
 }
 if(!skills.size)throw new Error('Case Theory: no skills found.');
 return [...skills].sort((a,b)=>a[1].localeCompare(b[1]));
}
export function getTheoryCards(state){
 const key=theoryCaseKey(state),workspace=state.crimeBoardWorkspaces?.[key];
 if(Array.isArray(workspace?.items))return workspace.items;
 const legacy=state.crimeBoardData;
 return legacy?.meta?.workspaceKey===key&&Array.isArray(legacy.items)?legacy.items:[];
}
export function getTheoryReadiness(state,raw=readTheory(state),cards=getTheoryCards(state)){
 const theory=normalizeTheory(raw),available=new Set((Array.isArray(cards)?cards:[])
  .filter(card=>card?.discovered!==false&&typeof card?.id==='string').map(card=>card.id));
 const missing=[];
 if(!state.currentMission||state.currentCaseId==null)missing.push(__dialogueText("crimeBoard/CaseTheoryModel.js", "t_179d34b15d3d6eead19a"));
 for(const [field,label]of THEORY_FIELDS){
  const section=theory.sections[field],answered=field==='means'?section.skillIds.length>0:Boolean(section.answerId);
  if(!answered)missing.push(`${label}${__dialogueText("crimeBoard/CaseTheoryModel.js", "t_bde2ccce12e2c5d60baa")}`);
  if(!section.evidenceIds.some(id=>available.has(id)))missing.push(`${label}${__dialogueText("crimeBoard/CaseTheoryModel.js", "t_d1116ed4b7d8949dde08")}`);
 }
 return {complete:missing.length===0,missing,theory};
}
export function getActualIdentityIds(state){
 const actual=[state.actualCriminalId,state.currentThiefId,state.currentThief?.id].filter(value=>value!=null).map(String);
 if(new Set(actual).size>1)return [];
 return [...new Set([...actual,state.trueThiefCaseSuspectId,state.realThiefSuspectId,
  state.caseData?.trueThiefCaseSuspectId,state.caseData?.realThiefSuspectId,
  state.currentThiefCaseSuspectId,state.currentThief?.caseSuspectId].filter(value=>value!=null).map(String))];
}
export function getUsedSkillIds(state){
 const claims=state.reconstructedHeist?.claims;
 if(!Array.isArray(claims)||claims.length!==3||claims.some(c=>!c?.thiefSkill))return null;
 return [...new Set(claims.map(c=>normalizeSkillId(c.thiefSkill)))].sort();
}
export function evaluateTheorySelection(state,field,selection,motiveEvaluator){
 let supported=null;
 if(field==='identity'){
  const ids=getActualIdentityIds(state);if(ids.length)supported=ids.includes(String(selection.answerId));
 }else if(field==='motive'){
  const id=state.caseData?.motiveId;
  if(id&&typeof motiveEvaluator==='function'){const result=motiveEvaluator(id,selection.answerId);if(typeof result==='boolean')supported=result;}
 }else if(field==='means'){
  const actual=getUsedSkillIds(state);
  if(actual)supported=selection.skillId?actual.includes(normalizeSkillId(selection.skillId)):
   JSON.stringify(actual)===JSON.stringify([...new Set((selection.skillIds||[]).map(normalizeSkillId))].sort());
 }else if(field==='opportunity'){
  const verdict=evaluateOpportunity(getOpportunityFacts(state),selection.answerId);
  if(verdict!=='inconclusive')supported=verdict==='supported';
 }
 const label=THEORY_FIELDS.find(([id])=>id===field)?.[1]||__dialogueText("crimeBoard/CaseTheoryModel.js", "t_ca4067071fcf61854380");
 return supported===null?{status:'inconclusive',message:__dialogueText("crimeBoard/CaseTheoryModel.js", "t_3e28a6f16705bce51e39")}:
  {status:supported?'supported':'contradicted',message:`${label}${__dialogueText("crimeBoard/CaseTheoryModel.js", "t_30924bd667503aca0121")}${supported?__dialogueText("crimeBoard/CaseTheoryModel.js", "t_37b322c559d476e555e4"):__dialogueText("crimeBoard/CaseTheoryModel.js", "t_1af293e87a0170d4ff1c")}${__dialogueText("crimeBoard/CaseTheoryModel.js", "t_3a73c5bd38a9879993e0")}`};
}
