import {categories,proofOptions} from './AlibiPuzzleModel.js';
import {selectAlibiCandidates} from './AlibiPuzzleRouting.js';
const KEYS=categories.map(([k])=>k),clone=x=>structuredClone(x),record=x=>x&&typeof x==='object'&&!Array.isArray(x);
const equalId=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
function scope(state,caseKey,activeCaseKey){
 if(!equalId(caseKey,activeCaseKey)||!String(caseKey).trim())throw Error('Puzzle does not belong to the active mission.');
 if(state.currentCaseId==null||state._createdAt==null)throw Error('Missing case or campaign identity.');
 return {caseKey:String(caseKey),caseId:state.currentCaseId,campaignId:state._createdAt};
}
function validatePuzzle(state,caseKey,activeCaseKey){
 const identity=scope(state,caseKey,activeCaseKey),p=state.caseData?.alibiPuzzles?.[caseKey];
 if(!record(p)||p.version!==1||!equalId(p.caseKey,caseKey)||p.status!=='solved'||!Number.isInteger(p.mistakes)||p.mistakes<0||p.mistakes>=3)throw Error('A completed, successful puzzle is required.');
 if(p.caseId!=null&&!equalId(p.caseId,state.currentCaseId)||p.campaignId!=null&&p.campaignId!==state._createdAt)throw Error('Saved puzzle scope conflicts with this case.');
 const n=p.people?.length;if(![3,5].includes(n)||new Set(p.people.map(x=>x.id)).size!==n)throw Error('Invalid puzzle candidates.');
 if(!record(p.answers)||!record(p.solution)||Object.keys(p.answers).length!==n*KEYS.length)throw Error('Incomplete puzzle facts.');
 const expected=selectAlibiCandidates(state,caseKey);if(expected.length!==n||!p.people.every(x=>expected.some(s=>s.id===x.id)))throw Error('Puzzle does not match the submitted shortlist.');
 for(const key of KEYS){const values=p.people.map(x=>p.answers[x.id+'|'+key]);if(new Set(values).size!==n||values.some(v=>typeof v!=='string'||!v))throw Error('Duplicate or missing facts.');for(const person of p.people)if(!p.options?.[key]?.includes(p.answers[person.id+'|'+key])||p.answers[person.id+'|'+key]!==p.solution[person.id]?.[key])throw Error('Puzzle solution is inconsistent.');}
 const proof=p.people.map(x=>p.answers[x.id+'|proof']);if(!proofOptions(n).every(v=>proof.includes(v)))throw Error('Unexpected corroboration model.');
 const thieves=expected.filter(x=>x.hiddenCaseData?.isTrueThief===true);if(thieves.length!==1)throw Error('Expected one canonical culprit.');
 const thief=thieves[0],profile=thief.hiddenCaseData.realThiefProfile;
 if(!profile||p.answers[thief.id+'|accent']!==profile.accent||p.answers[thief.id+'|features']!==profile.features||p.answers[thief.id+'|proof']!=='No corroboration')throw Error('Canonical culprit facts conflict with the puzzle.');
 return {identity,p};
}
export function preparePuzzleConclusion(state,{caseKey,activeCaseKey}){
 const {identity,p}=validatePuzzle(state,caseKey,activeCaseKey);
 return {...identity,version:1,source:'gridPuzzle',locked:true,mistakes:p.mistakes,subjects:p.people.map(x=>({suspectId:x.id,status:p.answers[x.id+'|proof']==='No corroboration'?'uncorroborated':'confirmed',facts:Object.fromEntries(KEYS.map(k=>[k,p.answers[x.id+'|'+k]]))}))};
}
export function readPuzzleConclusion(state,{caseKey,activeCaseKey}){
 const saved=state.caseData?.alibiPuzzleConclusions?.[caseKey];if(!saved)return null;
 try{const fresh=preparePuzzleConclusion(state,{caseKey,activeCaseKey});if(!equalId(saved.caseId,fresh.caseId)||saved.campaignId!==fresh.campaignId||JSON.stringify(saved)!==JSON.stringify(fresh))return null;return clone(fresh);}catch{return null;}
}
export function hasPuzzleRecord(state,caseKey){return Object.hasOwn(state.caseData?.alibiPuzzleConclusions||{},caseKey);}
export function filePuzzleConclusion(state,{caseKey,activeCaseKey,save,grantReward,canWrite=()=>true}){
 if(typeof save!=='function'||typeof grantReward!=='function')throw Error('Explicit save and reward adapters are required.');
 if(canWrite()!==true)return {accepted:false,reason:'saving_blocked'};
 const prepared=preparePuzzleConclusion(state,{caseKey,activeCaseKey}),previous=state.caseData?.alibiPuzzleConclusions?.[caseKey];
 if(previous&&JSON.stringify(previous)!==JSON.stringify(prepared))return {accepted:false,reason:'conflicting_conclusion'};
 const backup={caseData:clone(state.caseData),progressionState:clone(state.progressionState)};
 try{state.caseData.alibiPuzzleConclusions??={};state.caseData.alibiPuzzleConclusions[caseKey]=clone(prepared);const reward=grantReward('alibi_completed',String(caseKey),'Alibi investigation completed');if(reward?.success!==true&&reward?.reason!=='already_granted')throw Error('Reward could not be recorded.');if(save()!==true)throw Error('Conclusion was not saved.');return {accepted:true,alreadyFiled:!!previous,conclusion:clone(prepared),reward};}
 catch(error){state.caseData=backup.caseData;state.progressionState=backup.progressionState;return {accepted:false,reason:'save_or_reward_failed',message:error.message};}
}
