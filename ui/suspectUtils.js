import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import {gameState} from '../GameData.js';
import {requestAutosave} from '../gameStatePersistence.js';
import {safeClone} from '../suspects/suspectGeneratorUtils.js';
import {normalizeForensicField,normalizeForensicValue} from '../suspects/forensicEvidence.js';
import {getMaterialDossierNotes} from '../suspects/MaterialEvidence.js';
import {getDustHobbyLabels} from '../suspects/DustEvidence.js';
import {getSuspectFileNotes} from '../suspects/SuspectFileNotes.js';
import {CrimeLabManager} from '../scenes/CSI/CrimeLabManager.js';
import {CrimeLabEvidenceService} from '../scenes/CSI/CrimeLabEvidenceService.js';
import {isCaseCrimeLabCompleted} from '../scenes/CSI/LabCompletionState.js';
import {disclosureContext,publicRestrictedProfile,addDisclosedNote,publicDisclosedNotes,interviewEventId,upsertInterviewResult} from './SuspectDisclosure.js';
const STATUS={PENDING:'pending',MATCH:'match',MISMATCH:'mismatch',ELIMINATED:'eliminated',LOCKED:'locked',UNLOCKED:'unlocked',SUSPICIOUS:'suspicious',CONFIRMED:'confirmed',CONTRADICTED:'contradicted',NOT_APPLICABLE:'not_applicable',MANUALLY_CLEARED:'manually_cleared'};
const text=key=>__dialogueText('ui/suspectUtils.js',key);
function normalizeValue(v){return String(v??'').trim().toLowerCase().replace(/\s+/g,' ');}
function uniqueStrings(values){return[...new Set((Array.isArray(values)?values:typeof values==='string'?values.split(','):[]).filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))];}
function getTimestamp(){return new Date().toISOString();}
function getCityId(){return gameState.crimeCityId||gameState.caseSuspectCityId||gameState.crimeCity;}
function getCaseId(){return new CrimeLabManager(gameState,getCityId()).getCaseKey();}
function context(){return disclosureContext(gameState,getCaseId());}
function getSuspects(){
  const suspects=Array.isArray(gameState.caseSuspects)&&gameState.caseSuspects.length?gameState.caseSuspects:Array.isArray(gameState.suspects)&&gameState.suspects.length?gameState.suspects:Array.isArray(gameState.suspectList)?gameState.suspectList:[];
  gameState.caseSuspects=suspects;gameState.suspects=suspects;gameState.suspectList=suspects;return suspects;
}
function getSuspectById(id){if(typeof id!=='string'||!id.trim())throw Error('SuspectUtils: suspectId must be a valid string.');const s=getSuspects().find(s=>s?.id===id);if(!s)throw Error(`SuspectUtils: suspect "${id}" was not found in caseSuspects.`);return s;}
function ensureSuspectShape(s){
  if(!s||typeof s!=='object')return null;s.publicProfile??={};s.restrictedProfile??={};s.hiddenProfile??={};s.hiddenCaseData??={};s.deductionState??={};
  if(!Array.isArray(s.restrictedProfile.unlockedFields))s.restrictedProfile.unlockedFields=[];s.restrictedProfile.forensicAttributes??={};
  s.deductionState.labStatus??=STATUS.PENDING;s.deductionState.hypothesisStatus??=STATUS.PENDING;s.deductionState.interviewStatus??=STATUS.LOCKED;s.deductionState.alibiStatus??=STATUS.LOCKED;s.deductionState.eliminated=s.deductionState.eliminated===true;
  for(const key of['eliminationReasons','evidenceMismatches','notesUnlocked'])if(!Array.isArray(s.deductionState[key]))s.deductionState[key]=[];
  s.attributes??={};s.skills=uniqueStrings(s.skills);return s;
}
function ensureAllSuspectShapes(){getSuspects().forEach(ensureSuspectShape);}
function firstText(...values){return values.find(v=>typeof v==='string'&&v.trim())||'';}
function getDisplayName(s){return firstText(s?.publicProfile?.displayName,s?.name)||text('t_0f8a2ae03744676a1421');}
function publicStatus(value,fallback){return typeof value==='string'?value:fallback;}
function addUniqueEvidenceMismatch(s,e={}){
  ensureSuspectShape(s);const id=String(e.id||`${e.type||'evidence'}_${e.source||'unknown'}_${e.field||'unknown'}`);if(s.deductionState.evidenceMismatches.some(item=>item?.id===id))return;
  s.deductionState.evidenceMismatches.push({id,type:e.type||'evidence',source:e.source||'unknown',field:e.field||null,label:e.label||text('t_1ffe42a1c267e79a98ae'),note:e.note||text('t_ba5393d81266323c8979'),timestamp:e.timestamp||getTimestamp()});
}
function addEliminationReason(s,reason={}){
  ensureSuspectShape(s);const id=String(reason.id||`${reason.type||'manual'}_${reason.source||'suspect_file'}`);if(s.deductionState.eliminationReasons.some(r=>r?.id===id))return;
  s.deductionState.eliminationReasons.push({id,type:reason.type||'manual',source:reason.source||'suspect_file',label:reason.label||text('t_ec1805af8b39c7f4dc8c'),note:reason.note||text('t_7a2d59be7778c000ce69'),timestamp:reason.timestamp||getTimestamp()});
}
function syncExcludedSuspects(){ensureAllSuspectShapes();gameState.excludedSuspects=getSuspects().filter(s=>s.deductionState.eliminated).map(s=>({id:s.id,name:getDisplayName(s),reasons:safeClone(s.deductionState.eliminationReasons)}));return gameState.excludedSuspects;}
function markEvidenceMismatch(s,{statusKey='labStatus',status=STATUS.MISMATCH,reason={}}={}){ensureSuspectShape(s);s.deductionState[statusKey]=status;addUniqueEvidenceMismatch(s,reason);return s;}
function registerProgressUpdate(key,value=true){const caseId=getCaseId();if(!caseId)return;gameState.crimeCityProgress??={};gameState.crimeCityProgress[caseId]??={};gameState.crimeCityProgress[caseId][key]=value;}
function unlockRestrictedField(s,field,value,source='police_record'){
  ensureSuspectShape(s);if(typeof field!=='string'||!field.trim())throw Error('unlockRestrictedField requires a field name.');const canonical=normalizeForensicField(field.trim());
  if(typeof canonical!=='string'||['__proto__','constructor','prototype'].includes(canonical))throw Error('Reserved forensic field.');
  if(canonical==='dust_profile'||canonical==='material_profile'){
    const profile=safeClone(value);if(!profile||profile.schemaVersion!==1||profile.complete!==true||!Array.isArray(canonical==='dust_profile'?profile.hobbyIds:profile.traitIds))throw Error('A complete personal profile is required; a lab result is not a suspect profile.');
    if(canonical==='dust_profile'){getDustHobbyLabels({dustProfile:profile});s.dustProfile=profile;}else{getMaterialDossierNotes({materialProfile:profile});s.materialProfile=profile;}
    if(!s.restrictedProfile.unlockedFields.includes(canonical))s.restrictedProfile.unlockedFields.push(canonical);return profile;
  }
  const previous=s.restrictedProfile.forensicAttributes[canonical],old=previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{};
  s.restrictedProfile.forensicAttributes[canonical]={...old,value:normalizeForensicValue(canonical,value),unlocked:true,source,unlockedAt:getTimestamp()};
  if(!s.restrictedProfile.unlockedFields.includes(canonical))s.restrictedProfile.unlockedFields.push(canonical);return s.restrictedProfile.forensicAttributes[canonical];
}
function skillsMatch(available,required){const set=new Set(uniqueStrings(available).map(normalizeValue));return uniqueStrings(required).every(v=>set.has(normalizeValue(v)));}
function skillListsMatch(a,b){const x=uniqueStrings(a).map(normalizeValue).sort(),y=uniqueStrings(b).map(normalizeValue).sort();return x.length===y.length&&x.every((v,i)=>v===y[i]);}
function publicReasons(reasons){return(Array.isArray(reasons)?reasons:[]).filter(r=>r&&typeof r==='object'&&r.visibility!=='private').map(r=>Object.fromEntries(['id','type','source','label','note','timestamp'].filter(key=>typeof r[key]==='string').map(key=>[key,r[key]])));}
export function getActiveSuspects(){ensureAllSuspectShapes();return getSuspects().filter(s=>!s.deductionState.eliminated);}
export function manuallyClearSuspect(suspectId,{source='suspect_file',label=text('t_ec1805af8b39c7f4dc8c'),note=text('t_0b98a906e8d6729b8574'),type='manual'}={}){
  const s=ensureSuspectShape(getSuspectById(suspectId));s.deductionState.eliminated=true;if(s.deductionState.labStatus===STATUS.PENDING)s.deductionState.labStatus=STATUS.MANUALLY_CLEARED;addEliminationReason(s,{id:`manual_${source}_${s.id}`,type,source,label,note});syncExcludedSuspects();return{success:true,suspect:getPublicSuspectView(s.id)};
}
export function restoreManuallyClearedSuspect(suspectId){const s=ensureSuspectShape(getSuspectById(suspectId));s.deductionState.eliminated=false;s.deductionState.eliminationReasons=[];if(s.deductionState.labStatus===STATUS.MANUALLY_CLEARED)s.deductionState.labStatus=s.deductionState.evidenceMismatches.length?STATUS.MISMATCH:STATUS.PENDING;syncExcludedSuspects();return{success:true,suspect:getPublicSuspectView(s.id)};}
export function getPublicSuspectView(suspectId){
  const s=getSuspectById(suspectId),p=s.publicProfile||{},d=s.deductionState||{};
  const notes=getSuspectFileNotes(s),visibleTraits=[...notes.visible],personalNotes=[...notes.personal],hobbies=[...notes.hobbies],name=getDisplayName(s),occupation=firstText(p.occupation,s.occupation)||text('t_2e6176101206609a4907'),genderCode=firstText(p.genderCode,s.genderCode,s.gender_code)||'nb',caseConnection=firstText(p.caseConnection,s.caseConnection);
  const publicNotes=Array.isArray(d.publicNotes)&&d.publicNotes.length?publicDisclosedNotes(s,context()):[];
  return{id:s.id,name,occupation,genderCode,visibleTraits,caseConnection,personalNotes,hobbies,publicProfile:{displayName:name,occupation,genderCode,visibleTraits:[...visibleTraits],caseConnection,personalNotes:[...personalNotes],hobbies:[...hobbies]},restrictedProfile:publicRestrictedProfile(s.restrictedProfile||{},normalizeForensicField),deductionState:{labStatus:publicStatus(d.labStatus,STATUS.PENDING),hypothesisStatus:publicStatus(d.hypothesisStatus,STATUS.PENDING),interviewStatus:publicStatus(d.interviewStatus,STATUS.LOCKED),alibiStatus:publicStatus(d.alibiStatus,STATUS.LOCKED),eliminated:d.eliminated===true,eliminationReasons:publicReasons(d.eliminationReasons),evidenceMismatches:[],notesUnlocked:publicNotes}};
}
export function getPublicSuspectList(){return getSuspects().map(s=>getPublicSuspectView(s.id));}
export function applyIdentityEvidence(options={}){
  const manager=new CrimeLabManager(gameState,getCityId()),caseKey=manager.getCaseKey(),assigned=gameState.caseCsiAssignments?.[caseKey]?.identityEvidence||gameState.identityEvidence;if(!assigned)throw Error('SuspectUtils: identity evidence is missing.');
  const type=assigned.evidenceType||assigned.attribute||assigned.field,field=normalizeForensicField(type),value=assigned.correctValue??assigned.thief_value??assigned.value;
  if(!type||value==null||value==='')throw Error('SuspectUtils: identity evidence needs type and value.');if(options.attribute&&normalizeForensicField(options.attribute)!==field)throw Error('Wrong identity evidence field.');if(options.value!=null&&normalizeForensicValue(field,options.value)!==normalizeForensicValue(field,value))throw Error('Identity answer differs from the assigned case.');
  const adapter={getCaseKey:()=>caseKey,ensureCaseForensics:()=>manager.ensureCaseForensics(),getIdentityEvidenceConfig:()=>({...assigned,evidenceType:type,correctValue:value,stationId:'identity'})},service=new CrimeLabEvidenceService(gameState,adapter,getCityId());
  const result=service.saveMiniGameResult({completed:true,aborted:false,stationId:'identity',caseKey,value,source:options.source||'player'});
  if(!result.saved)return{success:false,message:result.reason||text('t_ae47784f3ce52fda3e0b'),excludedSuspectIds:[],remainingSuspects:getActiveSuspects().map(s=>s.id)};
  const record=result.forensicResult;gameState.identityEvidenceResult=safeClone(record);gameState.forensicResults??=[];const index=gameState.forensicResults.findIndex(r=>r.caseKey===caseKey&&r.stationId==='identity');if(index<0)gameState.forensicResults.push(safeClone(record));else gameState.forensicResults[index]=safeClone(record);
  gameState.identityEvidence={...assigned,resultUnlocked:true};const complete=service.getCompletedStationCount()===3;gameState.csiLabCompleted=complete;registerProgressUpdate('crimeLabCompleted',complete);syncExcludedSuspects();requestAutosave();
  return{success:true,attribute:field,value,excludedSuspectIds:[],matchedSuspectIds:[],mismatchedSuspectIds:[],remainingSuspects:getActiveSuspects().map(s=>s.id)};
}
export function registerHypothesisAttempt(selectedSkills=[]){const required=uniqueStrings(gameState.hypothesisEvidence?.requiredSkills);if(!required.length)throw Error('SuspectUtils: required hypothesis skills are missing.');gameState.hypothesisAttempts??=[];const attempt={attemptNumber:gameState.hypothesisAttempts.length+1,selectedSkills:uniqueStrings(selectedSkills),isCorrect:skillListsMatch(selectedSkills,required),attemptedAt:getTimestamp()};gameState.hypothesisAttempts.push(attempt);return attempt;}
export function applyHypothesisSkills(selectedSkills=[]){
  ensureAllSuspectShapes();const required=uniqueStrings(gameState.hypothesisEvidence?.requiredSkills);if(!required.length)throw Error('SuspectUtils: required hypothesis skills are missing.');const attempt=registerHypothesisAttempt(selectedSkills);
  if(!attempt.isCorrect)return{success:false,isCorrect:false,attemptNumber:attempt.attemptNumber,message:text('t_527b01410b9792aca06e'),remainingSuspects:getActiveSuspects().map(s=>s.id)};
  const matched=[],mismatched=[];getActiveSuspects().forEach(s=>{if(skillsMatch(s.skills,required)){s.deductionState.hypothesisStatus=STATUS.MATCH;matched.push(s.id);}else{markEvidenceMismatch(s,{statusKey:'hypothesisStatus',reason:{id:`hypothesis_skills_${s.id}`,type:'method',source:'hypothesis_reconstruction',field:'skills',label:text('t_b8c82c19201f7c540fba')}});mismatched.push(s.id);}});
  getSuspects().filter(s=>s.deductionState.labStatus===STATUS.MISMATCH).forEach(s=>{if(s.deductionState.hypothesisStatus===STATUS.PENDING)s.deductionState.hypothesisStatus=STATUS.NOT_APPLICABLE;});
  gameState.hypothesisEvidenceResult={id:gameState.hypothesisEvidence.id||'hypothesis_skills',requiredSkills:required,completedAt:getTimestamp(),matchedSuspectIds:matched,mismatchedSuspectIds:mismatched};gameState.hypothesisEvidence.resultUnlocked=true;registerProgressUpdate('hypothesisCompleted',true);syncExcludedSuspects();
  return{success:true,isCorrect:true,attemptNumber:attempt.attemptNumber,requiredSkills:required,excludedSuspectIds:[],matchedSuspectIds:matched,mismatchedSuspectIds:mismatched,remainingSuspects:getActiveSuspects().map(s=>s.id)};
}
export function unlockSuspectData(suspectId,field,value,source='police_database'){unlockRestrictedField(getSuspectById(suspectId),field,value,source);return getPublicSuspectView(suspectId);}
function recordInterview(s,{npcId,evidenceId,thread,label,outcome,reason,note}){
  const event={...context(),suspectId:s.id,npcId,evidenceId,thread,label,outcome,completedAt:getTimestamp()};if(reason!==undefined)event.reason=reason;if(note!==undefined)event.note=note;
  const id=interviewEventId(event);upsertInterviewResult(gameState,event);addDisclosedNote(s,reason??note,{id,kind:thread==='alibi'?'alibi':'interview',context:event});return id;
}
export function applyInterviewElimination({suspectId,npcId='unknown_npc',evidenceId='npc_statement',reason=text('t_503bb2406090f386dc3d'),thread='alibi',label=text('t_c7d014a23cf01a5f331a')}={}){
  const s=ensureSuspectShape(getSuspectById(suspectId));s.deductionState.interviewStatus=STATUS.CONFIRMED;if(thread==='alibi')s.deductionState.alibiStatus='corroborated';
  const id=recordInterview(s,{npcId,evidenceId,thread,label,reason,outcome:'corroborated_not_auto_cleared'});addUniqueEvidenceMismatch(s,{id,type:thread,source:npcId,field:'alibi',label,note:reason});registerProgressUpdate('suspectInterviewsCompleted',true);syncExcludedSuspects();
  return{success:true,manuallyClearRequired:true,suspect:getPublicSuspectView(s.id),remainingSuspects:getActiveSuspects().map(s=>s.id)};
}
export function flagSuspectFromInterview({suspectId,npcId='unknown_npc',evidenceId='npc_statement',note=text('t_ef2c6b035ae1d57063cd'),thread='alibi',label=text('t_c7d014a23cf01a5f331a')}={}){
  const s=ensureSuspectShape(getSuspectById(suspectId));s.deductionState.interviewStatus=STATUS.SUSPICIOUS;if(thread==='alibi')s.deductionState.alibiStatus=STATUS.SUSPICIOUS;recordInterview(s,{npcId,evidenceId,thread,label,note,outcome:'suspicious'});return{success:true,suspect:getPublicSuspectView(s.id)};
}
export function setAlibiStatus(suspectId,status,note=''){
  if(![STATUS.LOCKED,'unverified','corroborated',STATUS.CONTRADICTED,STATUS.SUSPICIOUS].includes(status))throw Error(`Unsupported alibi status: ${status}`);
  const s=ensureSuspectShape(getSuspectById(suspectId));s.deductionState.alibiStatus=status;if(note){const ctx=context();addDisclosedNote(s,note,{id:JSON.stringify(['alibi_status',s.id,status]),kind:'alibi',context:ctx});}if(status!==STATUS.LOCKED)registerProgressUpdate('alibiPhaseUnlocked',true);return getPublicSuspectView(s.id);
}
export function unlockAlibiPhase(){getActiveSuspects().forEach(s=>{if(s.deductionState.alibiStatus===STATUS.LOCKED)s.deductionState.alibiStatus='unverified';if(s.deductionState.interviewStatus===STATUS.LOCKED)s.deductionState.interviewStatus=STATUS.UNLOCKED;});registerProgressUpdate('alibiPhaseUnlocked',true);return getPublicSuspectList();}
export function getSuspectCaseSummary(){
  ensureAllSuspectShapes();const suspects=getSuspects(),active=getActiveSuspects(),excluded=suspects.filter(s=>s.deductionState.eliminated),lab=suspects.filter(s=>s.deductionState.labStatus===STATUS.MISMATCH),method=suspects.filter(s=>s.deductionState.hypothesisStatus===STATUS.MISMATCH);
  return{caseId:getCaseId(),total:suspects.length,active:active.length,eliminated:excluded.length,labMismatchCount:lab.length,hypothesisMismatchCount:method.length,crimeLabCompleted:isCaseCrimeLabCompleted(gameState,getCaseId(),getCityId()),hypothesisCompleted:Boolean(gameState.hypothesisEvidence?.resultUnlocked),alibiPhaseUnlocked:Boolean(gameState.crimeCityProgress?.[getCaseId()]?.alibiPhaseUnlocked),activeSuspectIds:active.map(s=>s.id),eliminatedSuspectIds:excluded.map(s=>s.id),labMismatchSuspectIds:lab.map(s=>s.id),hypothesisMismatchSuspectIds:method.map(s=>s.id)};
}
export function rebuildExcludedSuspects(){return syncExcludedSuspects();}
export default{getActiveSuspects,getPublicSuspectView,getPublicSuspectList,manuallyClearSuspect,restoreManuallyClearedSuspect,applyIdentityEvidence,registerHypothesisAttempt,applyHypothesisSkills,unlockSuspectData,applyInterviewElimination,flagSuspectFromInterview,setAlibiStatus,unlockAlibiPhase,getSuspectCaseSummary,rebuildExcludedSuspects};
