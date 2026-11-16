import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { saveGameState, requestAutosave } from '../gameStatePersistence.js';
import { generateAlibiWitnesses, ALIBI_DATA_VERSION } from './AlibiWitnessData.js';
import { getAlibiKnowledge, publicAlibiCard, publicAlibiStatement } from './AlibiKnowledge.js';

const GENERIC_NPC_KEYS=['npc','npc1','npc2','npc3','npc4','npc5','npc6'];
const WITNESSES_PER_SUSPECT=3;
const PORTRAIT_REVISION=1;
export const NO_ALIBI_LIAR='__no_liar__';
function clone(value){return structuredClone(value);}
function findSuspect(id){return getCaseSuspects(gameState).find(s=>s?.id===id)||null;}
function getAlibiSubjects(caseKey){
  const state=gameState.suspectExclusionState?.[caseKey];
  if(state?.finished!==true)return null;
  const suspects=getCaseSuspects(gameState);
  const investigation=gameState.alibiInvestigation;

  // Lista zatwierdzona w gridzie nie zmienia się po potwierdzeniu alibi.
  if(investigation?.unlocked===true&&String(investigation.caseKey)===String(caseKey)&&
    Array.isArray(investigation.suspectIds)&&investigation.suspectIds.length){
    const ids=new Set(investigation.suspectIds);
    if(ids.size!==investigation.suspectIds.length)throw new Error('Duplicate submitted alibi candidates.');
    // Zachowujemy kolejność puli, żeby nie zmieniać klucza istniejących zeznań.
    const selected=suspects.filter(s=>s?.id&&ids.has(s.id));
    if(selected.length!==ids.size)throw new Error('Missing submitted alibi candidate.');
    return selected;
  }

  // Starszy zapis może nie mieć alibiInvestigation.
  const manual=new Set(Array.isArray(state.manualExclusionIds)?state.manualExclusionIds:[]);
  return suspects.filter(s=>s?.id&&!manual.has(s.id)&&
    (s.deductionState?.eliminated!==true||s.deductionState?.alibiStatus==='confirmed'));
}
function toAlibiSubject(suspect){
  const isThief=suspect.hiddenCaseData?.isTrueThief===true;
  return {...suspect,hiddenCaseData:{...(suspect.hiddenCaseData||{}),isTrueThief:isThief,isForensicTwin:!isThief}};
}
function getCrimeWindow(){
  const w=gameState.caseData?.crimeWindow;
  if(!w||!Number.isInteger(w.day)||!Number.isInteger(w.startMinute)||!Number.isInteger(w.endMinute)||
    w.startMinute<30||w.endMinute<=w.startMinute||w.endMinute>1409)throw new Error('Missing or invalid caseData.crimeWindow.');
  return w;
}
function getSourceKey(caseKey,subjects,w){
  return JSON.stringify({version:ALIBI_DATA_VERSION,caseKey,window:{day:w.day,startMinute:w.startMinute,endMinute:w.endMinute},
    suspects:subjects.map(s=>({id:s.id,name:s.name||'',occupation:s.occupation||s.publicProfile?.occupation||'',isThief:s.hiddenCaseData?.isTrueThief===true}))});
}
function ensureStores(){
  if(!gameState.caseData||typeof gameState.caseData!=='object')throw new Error('Missing caseData.');
  gameState.caseData.alibiCases??={};gameState.crimeCityEncounterState??={};gameState.alibiAccusations??={};
}
function getStoredCase(key){return gameState.caseData?.alibiCases?.[key]||null;}
function getStoredWitnessData(key,id){return getStoredCase(key)?.suspects?.find(s=>s.suspectId===id)||null;}
function getWitnessEncounterId(suspectId,witness,index=0){
  const role=String(witness?.role||witness?.npcId||`witness_${index+1}`).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  return `alibi_${suspectId}_${role||`witness_${index+1}`}`;
}
function isValidStoredCase(entry,sourceKey,count){
  if(entry?.version!==ALIBI_DATA_VERSION||entry.sourceKey!==sourceKey||!Array.isArray(entry.suspects)||entry.suspects.length!==count)return false;
  return entry.suspects.every(d=>Array.isArray(d.witnesses)&&d.witnesses.length===3&&Array.isArray(d.boardCards)&&d.boardCards.length===3&&Array.isArray(d.trueTimeline)&&d.trueTimeline.length===3);
}
function buildStoredCase(caseKey,subjects,crimeWindow,sourceKey){
  return {version:ALIBI_DATA_VERSION,sourceKey,crimeWindow:clone(crimeWindow),
    suspects:subjects.map(s=>generateAlibiWitnesses(toAlibiSubject(s),caseKey,crimeWindow))};
}
function seededRandom(value){
  let seed=2166136261;
  for(const c of String(value)){seed^=c.charCodeAt(0);seed=Math.imul(seed,16777619);}
  return ()=>{seed=(seed+0x6D2B79F5)|0;let n=Math.imul(seed^(seed>>>15),seed|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
}
function shuffle(items,rng){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function assignCasePortraits(entry,caseKey){
  const witnesses=entry.suspects.flatMap(s=>s.witnesses).sort((a,b)=>String(a.npcId).localeCompare(String(b.npcId)));
  const keys=witnesses.map(w=>w.portraitKey);
  if(entry.portraitRevision===PORTRAIT_REVISION&&keys.every(k=>GENERIC_NPC_KEYS.includes(k))&&
    witnesses.every(w=>w.textureKey===w.portraitKey)&&(keys.length>GENERIC_NPC_KEYS.length||new Set(keys).size===keys.length))return false;
  const rng=seededRandom(`${caseKey}:${entry.sourceKey}:witness-portraits`);
  const counts=new Map(GENERIC_NPC_KEYS.map(k=>[k,0])),subjectsUsed=new Map(),existing=new Set(),pending=[];
  for(const w of witnesses){
    const k=w.portraitKey;
    if(GENERIC_NPC_KEYS.includes(k)&&!existing.has(k)){
      existing.add(k);counts.set(k,counts.get(k)+1);const used=subjectsUsed.get(w.suspectId)||new Set();
      used.add(k);subjectsUsed.set(w.suspectId,used);w.textureKey=k;
    }else pending.push(w);
  }
  const available=shuffle(GENERIC_NPC_KEYS.filter(k=>!existing.has(k)),rng);
  for(const w of pending){
    const used=subjectsUsed.get(w.suspectId)||new Set();let k=available.shift();
    if(!k){const candidates=GENERIC_NPC_KEYS.filter(c=>!used.has(c)),pool=candidates.length?candidates:GENERIC_NPC_KEYS;
      const least=Math.min(...pool.map(c=>counts.get(c)));k=shuffle(pool.filter(c=>counts.get(c)===least),rng)[0];}
    w.portraitKey=k;w.textureKey=k;counts.set(k,counts.get(k)+1);used.add(k);subjectsUsed.set(w.suspectId,used);
  }
  if(witnesses.length>GENERIC_NPC_KEYS.length)console.warn('[AlibiEncounterSetup] Witness portraits must repeat.');
  entry.portraitRevision=PORTRAIT_REVISION;return true;
}
function pickPortrait(previous,w){return [w.portraitKey,w.textureKey,previous?.portraitKey,previous?.textureKey,GENERIC_NPC_KEYS[0]].find(k=>GENERIC_NPC_KEYS.includes(k));}
function buildEncounters(entry,previousEncounters=[]){
  const previousById=new Map(previousEncounters.filter(Boolean).map(e=>[e.id,e]));
  const encounters=entry.suspects.flatMap(data=>data.witnesses.map((w,index)=>{
    const id=getWitnessEncounterId(data.suspectId,w,index),previous=previousById.get(id);
    const completed=previous?.interviewed===true&&previous?.dialogueCompleted===true,portrait=pickPortrait(previous,w);
    return {...previous,id,npcId:w.npcId,suspectId:data.suspectId,locationId:'alibi_contact',
      label:`${w.role||__dialogueText('alibi/AlibiEncounterSetup.js','t_5464a8914419f3a1a237')}${__dialogueText('alibi/AlibiEncounterSetup.js','t_a4282e4b2298b90b56f7')}${data.suspectName||__dialogueText('alibi/AlibiEncounterSetup.js','t_982776aa0b872d5a1b4d')}`,
      witnessRole:w.role||__dialogueText('alibi/AlibiEncounterSetup.js','t_5464a8914419f3a1a237'),suspectName:data.suspectName||'suspect',
      enabled:true,excluded:false,interviewed:completed,dialogueCompleted:completed,visited:completed,alibiWitness:true,portraitKey:portrait,textureKey:portrait};
  }));
  const expected=entry.suspects.length*WITNESSES_PER_SUSPECT;
  if(encounters.length!==expected||new Set(encounters.map(e=>e.id)).size!==expected)throw new Error('Invalid alibi encounter IDs.');
  return encounters;
}
export function ensureAlibiEncounters(caseKey){
  if(!caseKey){console.warn('[AlibiEncounterSetup] Missing case key.');return [];}
  try{
    ensureStores();const subjects=getAlibiSubjects(caseKey);
    if(subjects===null)return [];
    if(!subjects.length){gameState.crimeCityEncounterState[caseKey]=[];return [];}
    const crimeWindow=getCrimeWindow(),sourceKey=getSourceKey(caseKey,subjects,crimeWindow),expected=subjects.length*3;
    const existingEntry=getStoredCase(caseKey);
    const existing=Array.isArray(gameState.crimeCityEncounterState[caseKey])?gameState.crimeCityEncounterState[caseKey]:[];
    const reusable=isValidStoredCase(existingEntry,sourceKey,subjects.length);
    const entry=reusable?existingEntry:buildStoredCase(caseKey,subjects,crimeWindow,sourceKey);
    const portraitsChanged=assignCasePortraits(entry,caseKey);
    const byId=new Map(entry.suspects.flatMap(d=>d.witnesses).map(w=>[w.npcId,w]));
    const matching=existing.length===expected&&new Set(existing.map(e=>e.npcId)).size===expected&&existing.every(e=>{
      const w=byId.get(e?.npcId);return e?.alibiWitness===true&&w&&e.suspectId===w.suspectId&&e.portraitKey===w.portraitKey&&e.textureKey===w.textureKey;
    });
    if(reusable&&!portraitsChanged&&matching)return existing;
    const encounters=buildEncounters(entry,reusable?existing:[]);
    if(!reusable){
      if(existingEntry||existing.length)console.warn('[AlibiEncounterSetup] Changed generator data: rebuilding this case\'s alibis.');
      delete gameState.alibiAccusations[caseKey];
      subjects.forEach(s=>{s.deductionState??={};s.deductionState.alibiStatus='pending';});
    }
    gameState.caseData.alibiCases[caseKey]=entry;gameState.crimeCityEncounterState[caseKey]=encounters;saveGameState();return encounters;
  }catch(error){
    console.error('[AlibiEncounterSetup] Failed to prepare alibis.',error);
    if(gameState.crimeCityEncounterState&&caseKey)gameState.crimeCityEncounterState[caseKey]=[];return [];
  }
}
function getWitnessEncounters(caseKey,suspectId){
  const all=gameState.crimeCityEncounterState?.[caseKey];
  return Array.isArray(all)?all.filter(e=>e?.suspectId===suspectId&&e.alibiWitness===true):[];
}
export function markAlibiWitnessInterviewed(caseKey,encounterId){
  const encounter=gameState.crimeCityEncounterState?.[caseKey]?.find(e=>e?.id===encounterId&&e.alibiWitness===true);
  if(!encounter)return false;
  const data=getStoredWitnessData(caseKey,encounter.suspectId);
  if(!data?.witnesses.some(w=>w.npcId===encounter.npcId)||!getAlibiKnowledge(caseKey,encounter.npcId).basic)return false;
  encounter.interviewed=true;encounter.dialogueCompleted=true;encounter.visited=true;requestAutosave();return true;
}
export function getWitnessTestimony(caseKey,suspectId,npcId){
  const data=getStoredWitnessData(caseKey,suspectId);
  const w=data?.witnesses.find(item=>item.npcId===npcId);
  const encounter=getWitnessEncounters(caseKey,suspectId).find(e=>e.npcId===npcId);
  if(!w||!encounter)return null;
  const known=getAlibiKnowledge(caseKey,npcId);
  return {encounterId:encounter.id,suspectId,suspectName:data.suspectName||'this person',npcId,role:w.role,roleId:w.roleId,tone:w.tone,
    portraitKey:encounter.portraitKey,textureKey:encounter.textureKey,
    statement:publicAlibiStatement(caseKey,w),contradictionHint:null,
    timelineCard:publicAlibiCard(caseKey,w),motiveFragment:null,
    crimeWindow:clone(data.crimeWindow),boardCards:publicBoardCards(caseKey,data),trueTimeline:[],
    detailsKnown:known.details,interviewed:encounter.interviewed===true,dialogueCompleted:encounter.dialogueCompleted===true,
    allWitnessesVisited:allWitnessesVisited(caseKey,suspectId)};
}
function publicBoardCards(caseKey,data){
  return (data.boardCards||[]).map(card=>{
    const w=data.witnesses.find(w=>w.timelineCard?.id===card.id);
    return w?publicAlibiCard(caseKey,w,card):{id:card.id,role:'Witness',label:'Details not obtained',minute:null,detailsLocked:true};
  });
}
export function allWitnessesVisited(caseKey,suspectId){
  const all=getWitnessEncounters(caseKey,suspectId);
  return all.length===3&&all.every(e=>e.interviewed===true&&e.dialogueCompleted===true);
}
export function recordAlibiAccusation(caseKey,suspectId,npcId){
  const data=getStoredWitnessData(caseKey,suspectId);
  if(!data||!findSuspect(suspectId))return {correct:false,message:__dialogueText('alibi/AlibiEncounterSetup.js','t_cec89673eb1aca996997')};
  if(!allWitnessesVisited(caseKey,suspectId))return {correct:false,message:__dialogueText('alibi/AlibiEncounterSetup.js','t_05db60b5c05a09f52784')};
  const noLiar=npcId===NO_ALIBI_LIAR,witness=noLiar?null:data.witnesses.find(w=>w.npcId===npcId);
  if(!noLiar&&!witness)return {correct:false,message:__dialogueText('alibi/AlibiEncounterSetup.js','t_276382299c3d06eebb27')};
  const correct=noLiar?data.alibiType==='confirmed':witness.isLiar===true;
  gameState.alibiAccusations??={};gameState.alibiAccusations[caseKey]??={};gameState.alibiAccusations[caseKey][suspectId]=npcId;
  const suspect=findSuspect(suspectId);suspect.deductionState??={};suspect.deductionState.alibiStatus='pending';requestAutosave();
  return {correct,message:correct?noLiar?__dialogueText('alibi/AlibiEncounterSetup.js','t_7d5e7a73e77ee2904223'):__dialogueText('alibi/AlibiEncounterSetup.js','t_7ac3cc51c3c29ff81a41'):
    noLiar?__dialogueText('alibi/AlibiEncounterSetup.js','t_56e678d462b748ed00a3'):__dialogueText('alibi/AlibiEncounterSetup.js','t_75832cececa0cb3a24f2')};
}
export function recordAlibiConfirmation(caseKey,suspectId){return recordAlibiAccusation(caseKey,suspectId,NO_ALIBI_LIAR);}
export function getAlibiAccusation(caseKey,suspectId){return gameState.alibiAccusations?.[caseKey]?.[suspectId]||null;}
export function resolveAlibiTimelineSuccess(caseKey,suspectId){
  const suspect=findSuspect(suspectId),data=getStoredWitnessData(caseKey,suspectId);
  if(!suspect||!data||!allWitnessesVisited(caseKey,suspectId))return 'pending';
  const answer=getAlibiAccusation(caseKey,suspectId);let status='pending';
  if(answer===NO_ALIBI_LIAR&&data.alibiType==='confirmed')status='confirmed';
  else if(data.alibiType==='contradicted'&&data.witnesses.some(w=>w.npcId===answer&&w.isLiar===true))status='contradicted';
  suspect.deductionState??={};suspect.deductionState.alibiStatus=status;saveGameState();return status;
}
export function getTimelineBoardData(caseKey,suspectId){
  const data=getStoredWitnessData(caseKey,suspectId);
  if(!data||!allWitnessesVisited(caseKey,suspectId))return {boardCards:[],trueTimeline:[]};
  return {boardCards:publicBoardCards(caseKey,data),trueTimeline:[],crimeWindow:clone(data.crimeWindow)};
}
export function getAlibiEncounterDebugData(caseKey){
  const all=gameState.crimeCityEncounterState?.[caseKey];if(!Array.isArray(all))return [];
  return all.map(e=>({id:e.id,suspectId:e.suspectId,npcId:e.npcId,label:e.label,enabled:e.enabled,excluded:e.excluded,
    interviewed:e.interviewed,dialogueCompleted:e.dialogueCompleted,portraitKey:e.portraitKey,textureKey:e.textureKey}));
}