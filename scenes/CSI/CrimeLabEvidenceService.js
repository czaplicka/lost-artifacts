import {saveGameState} from '../../gameStatePersistence.js';
import {EventBus} from '../../EventBus.js';
import {normalizeForensicField,normalizeForensicValue} from '../../suspects/forensicEvidence.js';
import {DEDUCTION_EVIDENCE_REGISTRY} from './DeductionEvidenceRegistry.js';
import {isCompletedLabResult} from './LabResultState.js';
const STATION_IDS=['identity','trace_0','trace_1'];
const IDENTITY_FIELDS=new Set(['hair_color','blood_type','biological_sex','fingerprint_pattern']);
const VALUE_KEYS=['value','result','selectedValue','correctValue','answer'];
function hasValue(v){return v!==undefined&&v!==null&&String(v).trim()!=='';}
function configuredValue(c){return c.correctValue??c.thief_value??c.value??c.normalizedValue;}
function entryFor(t){return DEDUCTION_EVIDENCE_REGISTRY[t]||DEDUCTION_EVIDENCE_REGISTRY[normalizeForensicField(t)]||null;}
function displayValue(t,v){const e=entryFor(t);return e?.formatEvidence?e.formatEvidence(v):String(v).replace(/_/g,' ').replace(/\s+/g,' ').trim();}
function valuesMatch(f,a,b){return normalizeForensicValue(f,a)===normalizeForensicValue(f,b);}
export class CrimeLabEvidenceService {
  constructor(gameState,labManager,cityId){this.gameState=gameState;this.labManager=labManager;this.cityId=cityId;}
  getCaseKey(){return String(this.labManager?.getCaseKey?.()||'default_case');}
  getCaseForensics(){if(!this.labManager?.ensureCaseForensics)throw new Error('CrimeLabManager is unavailable.');return this.labManager.ensureCaseForensics();}
  getCrimeBoardCase(){
    const key=this.getCaseKey();this.gameState.crimeBoards??={};
    const b=this.gameState.crimeBoards[key]??={caseKey:key,cityId:this.cityId,forensicEvidence:[],clues:[],updatedAt:null};
    b.caseKey??=key;b.cityId??=this.cityId;b.forensicEvidence??=[];b.clues??=[];return b;
  }
  getCrimeBoardData(){this.gameState.crimeBoardData??={};this.gameState.crimeBoardData.labResults??=[];return this.gameState.crimeBoardData;}
  getStationEvidenceConfig(id){if(!STATION_IDS.includes(id))return null;return id==='identity'?this.labManager?.getIdentityEvidenceConfig?.()||null:this.labManager?.getTraceEvidenceConfig?.(Number(id.slice(-1)))||null;}
  normalizeResult(payload={},config=null){
    const id=payload.stationId,key=this.getCaseKey();
    if(!STATION_IDS.includes(id))throw new Error('Unknown or missing laboratory station.');
    if(payload.caseKey!=null&&String(payload.caseKey)!==key)throw new Error('Result belongs to a different case.');
    const e=config||this.getStationEvidenceConfig(id);if(!e||typeof e!=='object')throw new Error(`Missing evidence configuration: ${id}`);
    if(e.stationId&&e.stationId!==id)throw new Error('Evidence belongs to a different station.');
    const type=e.evidenceType||e.attribute||e.field;if(!type)throw new Error('Evidence type is missing.');
    const field=normalizeForensicField(type),value=configuredValue(e);
    if(payload.evidenceType&&normalizeForensicField(payload.evidenceType)!==field)throw new Error('Wrong evidence type.');
    if(!hasValue(value))throw new Error('Assigned evidence value is missing.');
    for(const k of VALUE_KEYS)if(hasValue(payload[k])&&!valuesMatch(field,payload[k],value))throw new Error(`Result ${k} differs from the assigned evidence.`);
    const incoming=payload.evidenceConfig;
    if(incoming&&typeof incoming==='object'){
      const incomingType=incoming.evidenceType||incoming.attribute||incoming.field;
      if(incomingType&&normalizeForensicField(incomingType)!==field)throw new Error('Incoming config has a different type.');
      const incomingValue=configuredValue(incoming);
      if(hasValue(incomingValue)&&!valuesMatch(field,incomingValue,value))throw new Error('Incoming config has a different value.');
      if(incoming.id&&e.id&&incoming.id!==e.id)throw new Error('Incoming config has a different ID.');
    }
    const label=e.label||entryFor(type)?.label||'Forensic Analysis',clueType=e.clueType||(id==='identity'?'identity':'trace');
    let text=e.clueText||payload.clueText||payload.clue?.text||`Laboratory analysis confirms: ${displayValue(type,value)}.`;
    const sourceConfirmed=e.sourceConfirmed===true,sourceText=String(e.sourceText??'').trim();
    if(sourceText&&!text.includes(sourceText))text+=` ${sourceText}`;
    const source=payload.source||(payload.assistantProvided?'lab_assistant':'player'),assistant=payload.assistantProvided===true||source==='lab_assistant';
    const evidenceConfig={...e,stationId:id,evidenceType:type,field,correctValue:value,thief_value:value,label,clueType,clueText:text,sourceConfirmed,sourceText};
    return{...payload,resultSchemaVersion:1,completed:true,aborted:false,stationId:id,caseKey:key,cityId:this.cityId,
      evidenceIndex:id==='identity'?null:Number(id.slice(-1)),evidenceId:e.id||null,evidenceType:type,field,evidenceConfig,
      value,result:value,selectedValue:value,correctValue:value,displayValue:displayValue(type,value),clueType,clueText:text,label,
      clue:{...(payload.clue&&typeof payload.clue==='object'?payload.clue:{}),id:e.id||payload.clue?.id||`${id}_${field}`,type:clueType,text,correctValue:value,sourceConfirmed,sourceText},
      sourceConfirmed,sourceText,source,completedBy:assistant?'lab_assistant':'player',assistantProvided:assistant,
      isValuable:Boolean(e.isValuable??(id==='identity')),isRedHerring:e.isRedHerring===true};
  }
  getStationPayload(id,source='player'){
    try{return this.normalizeResult({stationId:id,source,completed:true,aborted:false});}
    catch(error){console.warn('[CrimeLabEvidenceService] Station payload unavailable:',error.message);return null;}
  }
  getStoredStationResult(id,state=this.getCaseForensics()){
    if(!STATION_IDS.includes(id))return null;
    const result=id==='identity'?state.identityEvidenceResult:state.traceEvidenceResults?.[Number(id.slice(-1))];
    return isCompletedLabResult(result,{caseKey:this.getCaseKey()})?result:null;
  }
  isStationCompleted(id,state=this.getCaseForensics()){return this.getStoredStationResult(id,state)!==null;}
  getCompletedStationCount(){const s=this.getCaseForensics();return STATION_IDS.filter(id=>this.isStationCompleted(id,s)).length;}
  rejectedResult(reason=null){return{saved:false,wasAlreadyCompleted:false,completedCount:this.getCompletedStationCount(),reason};}
  saveMiniGameResult(payload={}){
    if(!payload||typeof payload!=='object'||payload.completed!==true||payload.aborted)return this.rejectedResult('Analysis not completed.');
    let normalized;
    try{normalized=this.normalizeResult(payload);}catch(error){console.warn('[CrimeLabEvidenceService] Result rejected:',error.message);return this.rejectedResult(error.message);}
    const state=this.getCaseForensics(),previous=this.getStoredStationResult(normalized.stationId,state);
    if(previous)return{saved:true,wasAlreadyCompleted:true,stationId:normalized.stationId,forensicResult:previous,completedCount:this.getCompletedStationCount()};
    // An invalid/incomplete old slot is replaceable, not a completed duplicate.
    const result={...normalized,completedAt:Date.now()};
    this.storeStationResult(result.stationId,result,state);this.upsertForensicResult(result,state);
    this.addForensicResultToCrimeBoard(result,result);this.addCrimeLabClueToBoard(result,result);this.addLabResultToCrimeBoardData(result,result);
    this.unlockIdentityEvidenceForSuspects(result);const saveSucceeded=saveGameState(),count=this.getCompletedStationCount();
    EventBus.emit('crimeLabResultSaved',{caseKey:this.getCaseKey(),stationId:result.stationId,forensicResult:result,wasAlreadyCompleted:false,completedCount:count});
    return{saved:true,saveSucceeded,wasAlreadyCompleted:false,stationId:result.stationId,forensicResult:result,completedCount:count};
  }
  ensureAssistantResults(ids=[]){
    const stations=Array.isArray(ids)?[...new Set(ids.filter(id=>STATION_IDS.includes(id)))]:[],added=[];
    for(const id of stations){
      if(this.isStationCompleted(id))continue;const payload=this.getStationPayload(id,'lab_assistant');if(!payload)continue;
      const result=this.saveMiniGameResult(payload);if(result.saved&&!result.wasAlreadyCompleted)added.push(id);
    }
    const count=this.getCompletedStationCount();EventBus.emit('crimeLabAssistantResultsReady',{caseKey:this.getCaseKey(),cityId:this.cityId,stationIds:stations,addedStationIds:added,completedCount:count});return{added,completedCount:count};
  }
  storeStationResult(id,result,state){
    if(!STATION_IDS.includes(id))throw new Error(`Unknown station: ${id}`);
    if(id==='identity')state.identityEvidenceResult=result;else{state.traceEvidenceResults??=[];state.traceEvidenceResults[Number(id.slice(-1))]=result;}
  }
  upsertForensicResult(result,state){
    state.forensicResults??=[];const i=state.forensicResults.findIndex(r=>r?.stationId===result.stationId);
    if(i<0)state.forensicResults.push(result);else state.forensicResults[i]=result;
  }
  recordForBoard(payload={},result={}){return this.normalizeResult({...payload,...result});}
  boardFields(r){return{caseKey:r.caseKey,stationId:r.stationId,cityId:r.cityId,evidenceId:r.evidenceId,evidenceType:r.evidenceType,field:r.field,
    clueType:r.clueType,label:r.label,title:r.label,value:r.value,result:r.result,selectedValue:r.selectedValue,correctValue:r.correctValue,displayValue:r.displayValue,
    text:r.clueText,clueText:r.clueText,description:r.clueText,sourceConfirmed:r.sourceConfirmed,sourceText:r.sourceText,source:r.source,
    completedBy:r.completedBy,assistantProvided:r.assistantProvided,isValuable:r.isValuable,isRedHerring:r.isRedHerring,completed:true,status:'completed',completedAt:r.completedAt||Date.now()};}
  addLabResultToCrimeBoardData(payload={},record={}){
    const r=this.recordForBoard(payload,record),b=this.getCrimeBoardData();
    const result={...this.boardFields(r),id:`lab-result-${r.stationId}`,type:r.evidenceType,success:true};
    this.upsertById(b.labResults,result);b.updatedAt=Date.now();EventBus.emit('crimeBoardLabResultAdded',{caseKey:r.caseKey,cityId:this.cityId,result});return result;
  }
  addForensicResultToCrimeBoard(payload={},record={}){
    const r=this.recordForBoard(payload,record),b=this.getCrimeBoardCase();
    const clue={...this.boardFields(r),id:`forensic_${r.stationId}`,category:'forensics',discovered:true,read:false};
    this.upsertById(b.forensicEvidence,clue);this.upsertById(b.clues,clue);b.updatedAt=Date.now();EventBus.emit('crimeBoardClueAdded',{caseKey:r.caseKey,clue});return clue;
  }
  addCrimeLabClueToBoard(payload={},record={}){
    const r=this.recordForBoard(payload,record),clue={...this.boardFields(r),id:`crime_lab_${r.caseKey}_${r.stationId}`,category:'forensics',discovered:true,read:false};
    this.gameState.caseClues??={};this.gameState.caseClues[r.caseKey]??=[];this.gameState.crimeLabClues??={};this.gameState.crimeLabClues[r.caseKey]??=[];
    this.upsertById(this.gameState.caseClues[r.caseKey],clue);this.upsertById(this.gameState.crimeLabClues[r.caseKey],clue);
    EventBus.emit('crimeBoardClueAdded',{caseKey:r.caseKey,clue});return clue;
  }
  unlockIdentityEvidenceForSuspects(payload={}){
    if(!payload.completed||payload.aborted)return false;const type=payload.evidenceType||payload.evidenceConfig?.evidenceType,field=normalizeForensicField(type||'');
    if(!IDENTITY_FIELDS.has(field))return false;
    const suspects=Array.isArray(this.gameState.caseSuspects)&&this.gameState.caseSuspects.length?this.gameState.caseSuspects:Array.isArray(this.gameState.suspects)?this.gameState.suspects:[];
    for(const s of suspects){s.restrictedProfile??={};s.restrictedProfile.unlockedFields??=[];s.restrictedProfile.forensicAttributes??={};
      const data=s.restrictedProfile.forensicAttributes[field];if(data&&typeof data==='object')data.unlocked=true;
      if(!s.restrictedProfile.unlockedFields.includes(field))s.restrictedProfile.unlockedFields.push(field);}
    EventBus.emit('suspectEvidenceUnlocked',{caseKey:this.getCaseKey(),evidenceType:type,field});return true;
  }
  upsertById(collection,entry){if(!Array.isArray(collection)||!entry?.id)return false;const i=collection.findIndex(r=>r?.id===entry.id);if(i<0)collection.push(entry);else collection[i]={...collection[i],...entry};return true;}
}
