import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { saveGameState, requestAutosave } from '../gameStatePersistence.js';
import { generateAlibiWitnesses, ALIBI_DATA_VERSION } from './AlibiWitnessData.js';
import { cloneAlibiData as clone, getAlibiKnowledge, publicAlibiCard, publicAlibiStatement } from './AlibiKnowledge.js';

const GENERIC_NPC_KEYS = ['npc','npc1','npc2','npc3','npc4','npc5','npc6'];
const WITNESSES_PER_SUSPECT = 3, PORTRAIT_REVISION = 1;
export const NO_ALIBI_LIAR = '__no_liar__';
const findSuspect = id => getCaseSuspects(gameState).find(s => s?.id === id) || null;
const validId = id => typeof id === 'string' && id.trim().length > 0;
const getStoredCase = key => gameState.caseData?.alibiCases?.[key] || null;
const getStoredWitnessData = (key,id) => getStoredCase(key)?.suspects?.find(s => s.suspectId === id) || null;

function getAlibiSubjects(caseKey) {
  const state = gameState.suspectExclusionState?.[caseKey];
  if (state?.finished !== true) return null;
  const suspects = getCaseSuspects(gameState), investigation = gameState.alibiInvestigation;
  if (investigation?.unlocked === true && String(investigation.caseKey) === String(caseKey) &&
      Array.isArray(investigation.suspectIds) && investigation.suspectIds.length) {
    const ids = new Set(investigation.suspectIds);
    if (ids.size !== investigation.suspectIds.length) throw new Error('Duplicate submitted alibi candidates.');
    const selected = suspects.filter(s => s?.id && ids.has(s.id));
    if (selected.length !== ids.size) throw new Error('Missing submitted alibi candidate.');
    return selected;
  }
  const manual = new Set(Array.isArray(state.manualExclusionIds) ? state.manualExclusionIds : []);
  return suspects.filter(s => s?.id && !manual.has(s.id) &&
    (s.deductionState?.eliminated !== true || s.deductionState?.alibiStatus === 'confirmed'));
}
function toAlibiSubject(s) {
  const thief = s.hiddenCaseData?.isTrueThief === true;
  return { ...s, hiddenCaseData: { ...(s.hiddenCaseData || {}), isTrueThief: thief, isForensicTwin: !thief } };
}
function getCrimeWindow() {
  const w = gameState.caseData?.crimeWindow;
  if (!w || !Number.isInteger(w.day) || !Number.isInteger(w.startMinute) || !Number.isInteger(w.endMinute) ||
      w.startMinute < 30 || w.endMinute <= w.startMinute || w.endMinute > 1409) {
    throw new Error('Missing or invalid caseData.crimeWindow.');
  }
  return w;
}
function getSourceKey(caseKey, subjects, w) {
  return JSON.stringify({ version: ALIBI_DATA_VERSION, caseKey,
    window: { day: w.day, startMinute: w.startMinute, endMinute: w.endMinute },
    suspects: subjects.map(s => ({ id: s.id, name: s.name || '',
      occupation: s.occupation || s.publicProfile?.occupation || '', isThief: s.hiddenCaseData?.isTrueThief === true })) });
}
function ensureStores() {
  if (!gameState.caseData || typeof gameState.caseData !== 'object') throw new Error('Missing caseData.');
  gameState.caseData.alibiCases ??= {};
  gameState.crimeCityEncounterState ??= {};
  gameState.alibiAccusations ??= {};
}
function getWitnessEncounterId(suspectId, w, index = 0) {
  const role = String(w?.role || w?.npcId || `witness_${index+1}`).trim().toLowerCase()
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  return `alibi_${suspectId}_${role || `witness_${index+1}`}`;
}
function validateSnapshot(entry, subjects) {
  if (!Array.isArray(entry?.suspects) || entry.suspects.length !== subjects.length ||
      new Set(entry.suspects.map(d => d?.suspectId)).size !== subjects.length) {
    throw new Error('Incompatible saved alibi subjects; saved progress retained.');
  }
  const wanted = new Set(subjects.map(s => s.id)), npcIds = new Set();
  for (const d of entry.suspects) {
    if (!wanted.has(d?.suspectId) || !Array.isArray(d.witnesses) || d.witnesses.length !== 3 ||
        !Array.isArray(d.boardCards) || d.boardCards.length !== 3 ||
        !Array.isArray(d.trueTimeline) || d.trueTimeline.length !== 3) {
      throw new Error('Incompatible saved alibi structure; saved progress retained.');
    }
    const cardIds = new Set(d.boardCards.map(c => c?.id));
    if (cardIds.size !== 3 || !d.boardCards.every(c => validId(c?.id)) ||
        new Set(d.trueTimeline.map(card => typeof card === 'string' ? card : card?.id)).size !== 3 ||
        !d.trueTimeline.every(card => cardIds.has(typeof card === 'string' ? card : card?.id))) {
      throw new Error('Invalid saved alibi timeline; saved progress retained.');
    }
    for (const w of d.witnesses) {
      if (!validId(w?.npcId) || npcIds.has(w.npcId) || w.suspectId !== d.suspectId ||
          !cardIds.has(w.timelineCard?.id)) throw new Error('Invalid saved witness identities; saved progress retained.');
      npcIds.add(w.npcId);
    }
  }
}
function sameWindow(a,b) {
  return a?.day === b?.day && a?.startMinute === b?.startMinute && a?.endMinute === b?.endMinute;
}
function migrateSnapshot(entry, caseKey, subjects, crimeWindow) {
  validateSnapshot(entry, subjects);
  if (Number.isInteger(entry.version) && entry.version > ALIBI_DATA_VERSION) {
    throw new Error('Saved alibis require newer game data; saved progress retained.');
  }
  // Old source keys contain the case identity and hidden roles. Ignore cosmetic
  // changes and generator revision, but never silently migrate another case.
  let source;
  try { source = JSON.parse(entry.sourceKey); }
  catch { throw new Error('Cannot verify saved alibi identity; saved progress retained.'); }
  if (String(source?.caseKey) !== String(caseKey) || !sameWindow(source.window,crimeWindow) ||
      !sameWindow(entry.crimeWindow,crimeWindow) || !Array.isArray(source.suspects) ||
      source.suspects.length !== subjects.length ||
      new Set(source.suspects.map(s => s.id)).size !== subjects.length ||
      !subjects.every(s => source.suspects.some(old => old.id === s.id &&
        old.isThief === (s.hiddenCaseData?.isTrueThief === true)))) {
    throw new Error('Saved alibis do not match this case; saved progress retained.');
  }
  // Compatibility migration: retain the complete generated snapshot, including
  // its original data version/sourceKey, cooperation, cards and filed evidence.
  // New generator versions apply only to cases without an existing snapshot.
  return clone(entry);
}
function buildStoredCase(caseKey,subjects,crimeWindow,sourceKey) {
  const entry = { version: ALIBI_DATA_VERSION, sourceKey, crimeWindow: clone(crimeWindow),
    suspects: subjects.map(s => generateAlibiWitnesses(toAlibiSubject(s),caseKey,crimeWindow)) };
  validateSnapshot(entry, subjects);
  return entry;
}
function seededRandom(value) {
  let seed=2166136261;
  for(const c of String(value)){seed^=c.charCodeAt(0);seed=Math.imul(seed,16777619);}
  return ()=>{seed=(seed+0x6D2B79F5)|0;let n=Math.imul(seed^(seed>>>15),seed|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
}
function shuffle(items,rng) {
  const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
function assignCasePortraits(entry,caseKey) {
  const witnesses=entry.suspects.flatMap(s=>s.witnesses).sort((a,b)=>String(a.npcId).localeCompare(String(b.npcId)));
  const keys=witnesses.map(w=>w.portraitKey);
  if(entry.portraitRevision===PORTRAIT_REVISION&&keys.every(k=>GENERIC_NPC_KEYS.includes(k))&&
      witnesses.every(w=>w.textureKey===w.portraitKey)&&
      (keys.length>GENERIC_NPC_KEYS.length||new Set(keys).size===keys.length))return false;
  const rng=seededRandom(`${caseKey}:${entry.sourceKey}:witness-portraits`);
  const counts=new Map(GENERIC_NPC_KEYS.map(k=>[k,0])),subjectsUsed=new Map(),existing=new Set(),pending=[];
  for(const w of witnesses){const k=w.portraitKey;if(GENERIC_NPC_KEYS.includes(k)&&!existing.has(k)){
    existing.add(k);counts.set(k,counts.get(k)+1);const used=subjectsUsed.get(w.suspectId)||new Set();used.add(k);subjectsUsed.set(w.suspectId,used);w.textureKey=k;
  }else pending.push(w);}
  const available=shuffle(GENERIC_NPC_KEYS.filter(k=>!existing.has(k)),rng);
  for(const w of pending){const used=subjectsUsed.get(w.suspectId)||new Set();let k=available.shift();
    if(!k){const candidates=GENERIC_NPC_KEYS.filter(c=>!used.has(c)),pool=candidates.length?candidates:GENERIC_NPC_KEYS;
      const least=Math.min(...pool.map(c=>counts.get(c)));k=shuffle(pool.filter(c=>counts.get(c)===least),rng)[0];}
    w.portraitKey=k;w.textureKey=k;counts.set(k,counts.get(k)+1);used.add(k);subjectsUsed.set(w.suspectId,used);
  }
  if(witnesses.length>GENERIC_NPC_KEYS.length)console.warn('[AlibiEncounterSetup] Witness portraits must repeat.');
  entry.portraitRevision=PORTRAIT_REVISION;return true;
}
function pickPortrait(previous,w) {
  return [w.portraitKey,w.textureKey,previous?.portraitKey,previous?.textureKey,GENERIC_NPC_KEYS[0]].find(k=>GENERIC_NPC_KEYS.includes(k));
}
function buildEncounters(entry,previous=[]) {
  const encounters=entry.suspects.flatMap(data=>data.witnesses.map((w,index)=>{
    const matches=previous.filter(e=>e?.npcId===w.npcId&&e.suspectId===data.suspectId);
    if(matches.length>1)throw new Error('Duplicate saved witness encounters; saved progress retained.');
    const old=matches[0];
    // Keep the old encounter ID: cooperation and drafts may refer to it.
    const id=validId(old?.id)?old.id:getWitnessEncounterId(data.suspectId,w,index),portrait=pickPortrait(old,w);
    return {...old,id,npcId:w.npcId,suspectId:data.suspectId,locationId:'alibi_contact',
      label:`${w.role||__dialogueText('alibi/AlibiEncounterSetup.js','t_5464a8914419f3a1a237')}${__dialogueText('alibi/AlibiEncounterSetup.js','t_a4282e4b2298b90b56f7')}${data.suspectName||__dialogueText('alibi/AlibiEncounterSetup.js','t_982776aa0b872d5a1b4d')}`,
      witnessRole:w.role||__dialogueText('alibi/AlibiEncounterSetup.js','t_5464a8914419f3a1a237'),suspectName:data.suspectName||'suspect',
      enabled:old?.enabled??true,excluded:old?.excluded??false,
      interviewed:old?.interviewed===true,dialogueCompleted:old?.dialogueCompleted===true,visited:old?.visited===true,
      alibiWitness:true,portraitKey:portrait,textureKey:portrait};
  }));
  const expected=entry.suspects.length*WITNESSES_PER_SUSPECT;
  if(encounters.length!==expected||new Set(encounters.map(e=>e.id)).size!==expected)throw new Error('Invalid alibi encounter IDs.');
  const represented=new Set(encounters.map(e=>e.npcId));
  if(previous.some(e=>e?.alibiWitness===true&&!represented.has(e.npcId))) {
    throw new Error('Saved witness would be removed; saved progress retained.');
  }
  return encounters;
}
export function ensureAlibiEncounters(caseKey) {
  const stored=gameState.crimeCityEncounterState?.[caseKey];
  const existing=Array.isArray(stored)?stored:[];
  if(!caseKey){console.warn('[AlibiEncounterSetup] Missing case key.');return existing;}
  try {
    const subjects=getAlibiSubjects(caseKey);
    if(subjects===null||!subjects.length)return existing;
    const crimeWindow=getCrimeWindow(),sourceKey=getSourceKey(caseKey,subjects,crimeWindow),existingEntry=getStoredCase(caseKey);
    if(!existingEntry&&existing.length)throw new Error('Witness progress exists without its alibi snapshot; progress retained.');
    const entry=existingEntry?migrateSnapshot(existingEntry,caseKey,subjects,crimeWindow):buildStoredCase(caseKey,subjects,crimeWindow,sourceKey);
    assignCasePortraits(entry,caseKey);
    const encounters=buildEncounters(entry,existing);
    if(existingEntry&&JSON.stringify(entry)===JSON.stringify(existingEntry)&&JSON.stringify(encounters)===JSON.stringify(existing))return existing;
    // Everything above is staged on copies. Do not delete accusations/drafts,
    // cooperation, partial interviews, conclusions or suspect deduction state.
    ensureStores();
    gameState.caseData.alibiCases[caseKey]=entry;
    gameState.crimeCityEncounterState[caseKey]=encounters;
    try { saveGameState(); }
    catch(error){console.error('[AlibiEncounterSetup] Prepared alibis retained in memory; saving failed.',error);}
    return encounters;
  } catch(error) {
    console.error('[AlibiEncounterSetup] Failed to prepare alibis; saved progress retained.',error);
    return existing;
  }
}
function getWitnessEncounters(key,id) {
  const a=gameState.crimeCityEncounterState?.[key];return Array.isArray(a)?a.filter(e=>e?.suspectId===id&&e.alibiWitness===true):[];
}
export function markAlibiWitnessInterviewed(key,id) {
  const e=gameState.crimeCityEncounterState?.[key]?.find(e=>e?.id===id&&e.alibiWitness===true);if(!e)return false;
  const data=getStoredWitnessData(key,e.suspectId);
  if(!data?.witnesses.some(w=>w.npcId===e.npcId)||!getAlibiKnowledge(key,e.npcId).basic)return false;
  e.interviewed=true;e.dialogueCompleted=true;e.visited=true;requestAutosave();return true;
}
function publicBoardCards(key,data) {
  return (data.boardCards||[]).map(card=>{const w=data.witnesses.find(w=>w.timelineCard?.id===card.id);
    return w?publicAlibiCard(key,w,card):{id:card.id,role:'Witness',label:'Details not obtained',minute:null,detailsLocked:true};});
}
export function getWitnessTestimony(key,id,npcId) {
  const data=getStoredWitnessData(key,id),w=data?.witnesses.find(w=>w.npcId===npcId),e=getWitnessEncounters(key,id).find(e=>e.npcId===npcId);if(!w||!e)return null;
  const known=getAlibiKnowledge(key,npcId);
  return {encounterId:e.id,suspectId:id,suspectName:data.suspectName||'this person',npcId,role:w.role,roleId:w.roleId,tone:w.tone,
    portraitKey:e.portraitKey,textureKey:e.textureKey,statement:publicAlibiStatement(key,w),contradictionHint:null,
    timelineCard:publicAlibiCard(key,w),motiveFragment:null,crimeWindow:clone(data.crimeWindow),boardCards:publicBoardCards(key,data),trueTimeline:[],
    detailsKnown:known.details,interviewed:e.interviewed===true,dialogueCompleted:e.dialogueCompleted===true,allWitnessesVisited:allWitnessesVisited(key,id)};
}
export function allWitnessesVisited(key,id) {
  const a=getWitnessEncounters(key,id);return a.length===3&&a.every(e=>e.interviewed===true&&e.dialogueCompleted===true);
}
export function recordAlibiAccusation(key,id,npcId) {
  const data=getStoredWitnessData(key,id),suspect=findSuspect(id);
  if(!data||!suspect||!allWitnessesVisited(key,id))return {correct:null,accepted:false,message:'Record all three visits before preparing a conclusion.'};
  if(npcId!==NO_ALIBI_LIAR&&!data.witnesses.some(w=>w.npcId===npcId))return {correct:null,accepted:false,message:'Unknown witness.'};
  if(data.playerConclusion?.locked)return {correct:null,accepted:false,message:'This conclusion has already been filed.'};
  gameState.alibiAccusationDrafts??={};gameState.alibiAccusationDrafts[key]??={};gameState.alibiAccusationDrafts[key][id]=npcId;requestAutosave();
  return {correct:null,accepted:true,pending:true,message:'Draft saved. File the timeline board to submit the conclusion.'};
}
export function recordAlibiConfirmation(key,id){return recordAlibiAccusation(key,id,NO_ALIBI_LIAR);}
export function getAlibiAccusation(key,id){return gameState.alibiAccusations?.[key]?.[id]||gameState.alibiAccusationDrafts?.[key]?.[id]||null;}
export function resolveAlibiTimelineSuccess(key,id) {
  const data=getStoredWitnessData(key,id),suspect=findSuspect(id),filed=data?.playerConclusion;
  if(!suspect||!filed?.locked||!['confirmed','contradicted'].includes(filed.status))return 'pending';
  suspect.deductionState??={};suspect.deductionState.alibiStatus=filed.status;
  suspect.deductionState.alibiEvidenceStatus=filed.evidenceStatus||'legacy_unverified';saveGameState();return filed.status;
}
export function getTimelineBoardData(key,id) {
  const data=getStoredWitnessData(key,id);if(!data||!allWitnessesVisited(key,id))return {boardCards:[],trueTimeline:[]};
  return {boardCards:publicBoardCards(key,data),trueTimeline:[],crimeWindow:clone(data.crimeWindow)};
}
export function getAlibiEncounterDebugData(key) {
  const a=gameState.crimeCityEncounterState?.[key];return Array.isArray(a)?a.map(e=>({id:e.id,suspectId:e.suspectId,npcId:e.npcId,label:e.label,
    enabled:e.enabled,excluded:e.excluded,interviewed:e.interviewed,dialogueCompleted:e.dialogueCompleted,portraitKey:e.portraitKey,textureKey:e.textureKey})):[];
}
