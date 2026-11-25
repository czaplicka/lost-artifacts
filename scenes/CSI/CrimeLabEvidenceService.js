import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { saveGameStateResult, getPersistenceStatus } from '../../gameStatePersistence.js';
import { EventBus } from '../../EventBus.js';
import { progressionManager, XP_REWARDS, MAX_TOTAL_XP } from '../../managers/ProgressionManager.js';
import { normalizeForensicField, normalizeForensicValue } from '../../suspects/forensicEvidence.js';
import { DEDUCTION_EVIDENCE_REGISTRY } from './DeductionEvidenceRegistry.js';
import { isCompletedLabResult } from './LabResultState.js';

const STATION_IDS=['identity','trace_0','trace_1'];
const IDENTITY_FIELDS=new Set(['hair_color','blood_type','biological_sex','fingerprint_pattern']);
const VALUE_KEYS=['value','result','selectedValue','correctValue','answer'];
const TX_FIELDS=['caseForensics','caseCsiAssignments','identityEvidence','traceEvidence',
  'crimeBoards','caseClues','crimeLabClues','crimeBoardData','caseSuspects','suspects','suspectList',
  'crimeCityProgress','csiLabCompleted','progressionState'];
const activeTransactions=new WeakSet();
const unsafeStates=new WeakSet();
const text=key=>__dialogueText('scenes/CSI/CrimeLabEvidenceService.js',key);
const hasValue=v=>v!==undefined&&v!==null&&String(v).trim()!=='';
const configuredValue=e=>e.correctValue??e.thief_value??e.value??e.normalizedValue;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const entryFor=type=>DEDUCTION_EVIDENCE_REGISTRY[type]||DEDUCTION_EVIDENCE_REGISTRY[normalizeForensicField(type)]||null;
const displayValue=(type,value)=>entryFor(type)?.formatEvidence?entryFor(type).formatEvidence(value):String(value).replace(/_/g,' ').replace(/\s+/g,' ').trim();
const valuesMatch=(field,a,b)=>normalizeForensicValue(field,a)===normalizeForensicValue(field,b);

// Preserve aliases and original objects, including references held by open UI.
function captureFields(state) {
  const seen=new WeakMap(), originals=new WeakMap();
  function copy(value) {
    if(value===null||typeof value!=='object'){
      if(['function','symbol'].includes(typeof value))throw Error('Unsupported value in CSI snapshot.');
      return value;
    }
    if(seen.has(value))return seen.get(value);
    const proto=Object.getPrototypeOf(value);
    if(!Array.isArray(value)&&proto!==Object.prototype&&proto!==null)throw Error('Unsupported object in CSI snapshot.');
    const result=Array.isArray(value)?new Array(value.length):Object.create(proto);
    seen.set(value,result);originals.set(result,value);
    for(const key of Object.keys(value))Object.defineProperty(result,key,{value:copy(value[key]),enumerable:true,writable:true,configurable:true});
    return result;
  }
  const snapshot=Object.fromEntries(TX_FIELDS.map(key=>[key,copy(state[key])]));
  return ()=>{
    const restored=new WeakSet();
    function restore(saved){
      if(saved===null||typeof saved!=='object')return saved;
      const target=originals.get(saved);
      if(restored.has(saved))return target;
      restored.add(saved);
      for(const key of Object.keys(target))if(!Object.prototype.hasOwnProperty.call(saved,key))delete target[key];
      if(Array.isArray(target))target.length=saved.length;
      for(const key of Object.keys(saved))target[key]=restore(saved[key]);
      return target;
    }
    const errors=[];
    for(const key of TX_FIELDS){try{state[key]=restore(snapshot[key]);}catch(error){errors.push({key,error});}}
    if(errors.length){const error=Error('CSI rollback was incomplete. Reload a known-good save before continuing.');error.rollbackErrors=errors;throw error;}
  };
}

export class CrimeLabEvidenceService {
  constructor(gameState,labManager,cityId){this.gameState=gameState;this.labManager=labManager;this.cityId=cityId;this._pendingEvents=null;}
  getCaseKey(){
    const value=this.labManager?.getCaseKey?.();
    if(!['string','number'].includes(typeof value)||(typeof value==='number'&&!Number.isFinite(value))||!String(value).trim())throw Error('A stable case key is required.');
    return String(value);
  }
  getCaseForensics(){if(!this.labManager?.ensureCaseForensics)throw Error('CrimeLabManager is unavailable.');return this.labManager.ensureCaseForensics();}
  readCaseForensics(){return this.gameState.caseForensics?.[this.getCaseKey()]||{};}
  getCrimeBoardCase(){
    const key=this.getCaseKey();this.gameState.crimeBoards??={};
    const board=this.gameState.crimeBoards[key]??={caseKey:key,cityId:this.cityId,forensicEvidence:[],clues:[],updatedAt:null};
    board.forensicEvidence??=[];board.clues??=[];return board;
  }
  getCrimeBoardData(){this.gameState.crimeBoardData??={};this.gameState.crimeBoardData.labResults??=[];return this.gameState.crimeBoardData;}
  getStationEvidenceConfig(id){
    if(!STATION_IDS.includes(id))return null;
    return id==='identity'?this.labManager.getIdentityEvidenceConfig():this.labManager.getTraceEvidenceConfig(Number(id.slice(-1)));
  }
  normalizeResult(payload={},config=null){
    const id=payload.stationId,key=this.getCaseKey();
    if(!STATION_IDS.includes(id))throw Error('Unknown or missing laboratory station.');
    if(payload.caseKey!=null&&String(payload.caseKey)!==key)throw Error('Result belongs to a different case.');
    const evidence=config||this.getStationEvidenceConfig(id);
    if(!plain(evidence))throw Error(`Missing evidence configuration: ${id}`);
    if(evidence.caseKey!=null&&String(evidence.caseKey)!==key)throw Error('Assigned evidence belongs to a different case.');
    if(evidence.stationId&&evidence.stationId!==id)throw Error('Evidence belongs to a different station.');
    const type=evidence.evidenceType||evidence.attribute||evidence.field;
    if(!type)throw Error('Evidence type is missing.');
    const field=normalizeForensicField(type),value=configuredValue(evidence);
    if(payload.evidenceType&&normalizeForensicField(payload.evidenceType)!==field)throw Error('Wrong evidence type.');
    if(!hasValue(value))throw Error('Assigned evidence value is missing.');
    for(const key of VALUE_KEYS)if(hasValue(payload[key])&&!valuesMatch(field,payload[key],value))throw Error(`Result ${key} differs from the assigned evidence.`);
    const incoming=payload.evidenceConfig;
    if(plain(incoming)){
      if(incoming.caseKey!=null&&String(incoming.caseKey)!==key)throw Error('Incoming config belongs to a different case.');
      const type=incoming.evidenceType||incoming.attribute||incoming.field;
      if(type&&normalizeForensicField(type)!==field)throw Error('Incoming config has a different type.');
      const incomingValue=configuredValue(incoming);
      if(hasValue(incomingValue)&&!valuesMatch(field,incomingValue,value))throw Error('Incoming config has a different value.');
      if(incoming.id&&evidence.id&&incoming.id!==evidence.id)throw Error('Incoming config has a different ID.');
    }
    const label=evidence.label||entryFor(type)?.label||text('t_d2f42de4fcfd1fbdaa64');
    const clueType=evidence.clueType||(id==='identity'?'identity':'trace');
    let clueText=evidence.clueText||payload.clueText||payload.clue?.text||`${text('t_c3a8aab15c7d72b57838')}${displayValue(type,value)}${text('t_cdb4ee2aea69cc6a8333')}`;
    const sourceConfirmed=evidence.sourceConfirmed===true,sourceText=String(evidence.sourceText??'').trim();
    if(sourceText&&!clueText.includes(sourceText))clueText+=' '+sourceText;
    const source=payload.source||(payload.assistantProvided?'lab_assistant':'player');
    const assistant=payload.assistantProvided===true||source==='lab_assistant';
    // Whitelist persisted fields: never spread an arbitrary minigame payload.
    const evidenceConfig={...clone(evidence),caseKey:key,stationId:id,evidenceType:type,field,correctValue:value,thief_value:value,label,clueType,clueText,sourceConfirmed,sourceText};
    delete evidenceConfig.evidence;
    return {resultSchemaVersion:2,completed:true,aborted:false,stationId:id,caseKey:key,cityId:this.cityId,
      evidenceIndex:id==='identity'?null:Number(id.slice(-1)),evidenceId:evidence.id||null,evidenceType:type,field,evidenceConfig,
      value,result:value,selectedValue:value,correctValue:value,displayValue:displayValue(type,value),clueType,clueText,label,
      sourceConfirmed,sourceText,source,completedBy:assistant?'lab_assistant':'player',assistantProvided:assistant,
      isValuable:Boolean(evidence.isValuable??(id==='identity')),isRedHerring:evidence.isRedHerring===true};
  }
  getStationPayload(id,source='player'){
    try{return this.normalizeResult({stationId:id,source,completed:true,aborted:false});}
    catch(error){console.warn('[CrimeLabEvidenceService] Station payload unavailable:',error);return null;}
  }
  getStoredStationResult(id,state=this.readCaseForensics()){
    if(!STATION_IDS.includes(id))return null;
    const result=id==='identity'?state.identityEvidenceResult:state.traceEvidenceResults?.[Number(id.slice(-1))];
    return isCompletedLabResult(result,{caseKey:this.getCaseKey()})?result:null;
  }
  isStationCompleted(id,state=this.readCaseForensics()){return this.getStoredStationResult(id,state)!==null;}
  getCompletedStationCount(){return STATION_IDS.filter(id=>this.isStationCompleted(id)).length;}
  emit(name,payload){
    if(this._pendingEvents){this._pendingEvents.push([name,payload]);return;}
    try{EventBus.emit(name,payload);}catch(error){console.error('[CrimeLabEvidenceService] Listener failed after commit:',name,error);}
  }
  rejectedResult(reason=null){let completedCount=0;try{completedCount=this.getCompletedStationCount();}catch{}return {saved:false,saveSucceeded:false,wasAlreadyCompleted:false,completedCount,reason};}
  grantCompletionXP(){
    if(!this._pendingEvents)throw Error('CSI rewards must be staged inside a transaction.');
    if(this.getCompletedStationCount()!==3)return {success:false,reason:'lab_not_completed'};
    const key=this.getCaseKey();
    if(!key.trim()||key==='default_case'||key.length>500)throw Error('A stable reward scope is required.');
    const state=progressionManager.readState(),before=progressionManager.buildSummary(state);
    const eventId=JSON.stringify(['reward','csi_completed',key]);
    if(state.appliedEventIds.includes(eventId))return {success:false,reason:'already_granted',...before};
    const grantedXP=Math.min(XP_REWARDS.csi_completed,MAX_TOTAL_XP-state.totalXP);
    state.totalXP+=grantedXP;state.appliedEventIds.push(eventId);
    state.history.push({type:'xp',eventId,amount:grantedXP,label:text('t_747d106caa6c836b095f'),source:'csi_completed',scopeId:key,createdAt:new Date().toISOString()});
    this.gameState.progressionState=clone(state);
    const after=progressionManager.buildSummary(state),gainedLevels=after.level-before.level;
    const result={success:true,eventId,grantedXP,gainedLevels,gainedPoints:gainedLevels,before,after};
    this.emit('progression:changed',after);this.emit('progression:xpGranted',result);
    if(gainedLevels>0)this.emit('progression:levelUp',{...result,
      title:__dialogueText('managers/ProgressionManager.js','t_ec89a5737cd9d82fe273'),
      message:__dialogueText('managers/ProgressionManager.js','t_403a5c2f1f2be4cef9ba')});
    return result;
  }
  _syncCompletion(){
    if(!STATION_IDS.every(id=>this.isStationCompleted(id)))return false;
    this.gameState.crimeCityProgress??={};
    const progress=this.gameState.crimeCityProgress[this.getCaseKey()]??={};
    progress.crimeLabCompleted=true;
    if(!Number.isFinite(progress.crimeLabCompletedAt)||progress.crimeLabCompletedAt<=0)progress.crimeLabCompletedAt=Date.now();
    return true;
  }
  syncLabCompletion({save=true}={}){
    if(this._pendingEvents)return this._syncCompletion();
    if(!STATION_IDS.every(id=>this.isStationCompleted(id)))return false;
    // No unpersisted mutation through the legacy save:false path.
    return this._commitBatch([],{}).saved===true;
  }
  _commitBatch(payloads,{assistantStations=null}={}){
    const state=this.gameState;
    const policy=getPersistenceStatus();
    if(unsafeStates.has(state)||policy.rollbackUnsafe)return this.rejectedResult('CSI recovery was incomplete. Reload a known-good save before continuing.');
    if(activeTransactions.has(state)||policy.busy)return this.rejectedResult('Saving or loading is in progress. Try again.');
    let rollback;
    try{rollback=captureFields(state);}catch(error){return this.rejectedResult(error.message);}
    activeTransactions.add(state);this._pendingEvents=[];
    const ownPersist=Object.prototype.hasOwnProperty.call(this.labManager,'persist');
    const managerPersist=this.labManager.persist;
    if(typeof managerPersist==='function')this.labManager.persist=()=>({status:'staged',saved:false});
    let response,events=[];
    try{
      const key=this.getCaseKey(),added=[],records=[],duplicates=[];
      // Resolve all configurations before changing any station result. This also
      // prevents legacy managers from saving a half-applied assistant batch.
      const normalizedPayloads=payloads.map(payload=>{
        if(!plain(payload)||payload.completed!==true||payload.aborted)throw Error(text('t_de5f20b77689a295e478'));
        return this.normalizeResult(payload);
      });
      for(const normalized of normalizedPayloads){
        const previous=this.getStoredStationResult(normalized.stationId);
        if(previous){duplicates.push(previous);continue;}
        const result={...normalized,completedAt:Date.now()};
        this.storeStationResult(result.stationId,result,this.getCaseForensics());
        this.unlockIdentityEvidenceForSuspects(result);
        added.push(result.stationId);records.push(result);
      }
      this._syncCompletion();
      const xpResult=this.grantCompletionXP();
      this.rebuildProjections({notifyStationIds:added});
      const count=this.getCompletedStationCount();
      for(const result of records)this.emit('crimeLabResultSaved',{caseKey:key,stationId:result.stationId,forensicResult:result,wasAlreadyCompleted:false,completedCount:count,xpResult});
      if(assistantStations)this.emit('crimeLabAssistantResultsReady',{caseKey:key,cityId:this.cityId,stationIds:assistantStations,addedStationIds:added,completedCount:count});
      const persistence=saveGameStateResult();
      if(persistence.status!=='saved'&&!(persistence.status==='paused'&&persistence.reason==='autosave_protected'))throw Error(persistence.error||'The laboratory result could not be saved. Please try again.');
      const result=records[0]||duplicates[0]||null;
      response={saved:true,saveSucceeded:persistence.status==='saved',persistenceStatus:persistence.status,
        inMemoryOnly:persistence.status==='paused',wasAlreadyCompleted:records.length===0&&duplicates.length>0,
        stationId:result?.stationId,forensicResult:result,completedCount:count,xpResult,added};
      events=this._pendingEvents;
    }catch(error){
      console.error('[CrimeLabEvidenceService] Transaction rolled back:',error);
      try{rollback();}catch(rollbackError){unsafeStates.add(state);console.error('[CrimeLabEvidenceService] Rollback failed:',rollbackError);return this.rejectedResult(rollbackError.message);}
      return this.rejectedResult(error.message);
    }finally{
      if(typeof managerPersist==='function'){if(ownPersist)this.labManager.persist=managerPersist;else delete this.labManager.persist;}
      this._pendingEvents=null;activeTransactions.delete(state);
    }
    // Observers cannot see staged results/XP. Observer failures cannot undo a saved transaction.
    for(const[name,payload]of events)this.emit(name,payload);
    return response;
  }
  saveMiniGameResult(payload={}){return this._commitBatch([payload]);}
  ensureAssistantResults(ids=[]){
    const stations=Array.isArray(ids)?[...new Set(ids.filter(id=>STATION_IDS.includes(id)))]:[];
    const payloads=stations.filter(id=>!this.isStationCompleted(id)).map(id=>({stationId:id,source:'lab_assistant',assistantProvided:true,completed:true,aborted:false}));
    const result=this._commitBatch(payloads,{assistantStations:stations});
    return {...result,added:result.saved?result.added:[],completedCount:result.completedCount};
  }
  storeStationResult(id,result,state){
    if(!STATION_IDS.includes(id))throw Error('Unknown laboratory station.');
    if(id==='identity')state.identityEvidenceResult=result;
    else{state.traceEvidenceResults??=[];state.traceEvidenceResults[Number(id.slice(-1))]=result;}
  }
  // Canonical station slots are authoritative. Compatibility projections are compact.
  boardFields(r){return {caseKey:r.caseKey,cityId:r.cityId,stationId:r.stationId,evidenceId:r.evidenceId,evidenceType:r.evidenceType,field:r.field,
    clueType:r.clueType,label:r.label,value:r.value,displayValue:r.displayValue,clueText:r.clueText,sourceConfirmed:r.sourceConfirmed,
    sourceText:r.sourceText,source:r.source,completedBy:r.completedBy,assistantProvided:r.assistantProvided,isValuable:r.isValuable,
    isRedHerring:r.isRedHerring,completed:true,completedAt:r.completedAt};}
  rebuildProjections({notifyStationIds=[]}={}){
    const key=this.getCaseKey(),forensics=this.getCaseForensics();
    const records=STATION_IDS.map(id=>this.getStoredStationResult(id,forensics)).filter(Boolean);
    const compact=records.map(r=>this.boardFields(r));
    // Remove duplicate CSI records; leave unrelated forensic evidence intact.
    forensics.forensicResults=(forensics.forensicResults||[]).filter(r=>!STATION_IDS.includes(r?.stationId));
    const board=this.getCrimeBoardCase();
    const owned=r=>STATION_IDS.includes(r?.stationId)&&(r.caseKey==null||String(r.caseKey)===key);
    const previousByStation=new Map((board.forensicEvidence||[]).filter(owned).map(r=>[r.stationId,r]));
    board.forensicEvidence=(board.forensicEvidence||[]).filter(r=>!owned(r));
    board.clues=(board.clues||[]).filter(r=>!owned(r));
    for(const r of compact){
      const projection={...r,id:`forensic_${r.stationId}`,category:'forensics',discovered:true,read:previousByStation.get(r.stationId)?.read===true};
      board.forensicEvidence.push(projection);board.clues.push(projection);
    }
    board.updatedAt=Date.now();
    const globalBoard=this.getCrimeBoardData();
    // Global compatibility view holds only this case's recorded analyses, max 3.
    globalBoard.labResults=compact.map(r=>({...r,id:`lab-result-${r.stationId}`,type:r.evidenceType,success:true}));
    globalBoard.updatedAt=Date.now();
    // No readers of these legacy CSI copies remain in the repository.
    // Remove only recognized CSI entries; never delete unrelated case clues.
    for(const field of ['caseClues','crimeLabClues']){
      const map=this.gameState[field];if(!plain(map))continue;
      for(const [caseId,list]of Object.entries(map)){
        if(!Array.isArray(list))continue;
        map[caseId]=list.filter(r=>!(STATION_IDS.includes(r?.stationId)&&r?.id===`crime_lab_${caseId}_${r.stationId}`));
        if(!map[caseId].length)delete map[caseId];
      }
    }
    for(const r of compact.filter(item=>notifyStationIds.includes(item.stationId))){
      const projection=board.forensicEvidence.find(e=>e.stationId===r.stationId&&String(e.caseKey)===key);
      this.emit('crimeBoardClueAdded',{caseKey:key,clue:projection});
      this.emit('crimeBoardLabResultAdded',{caseKey:key,cityId:this.cityId,result:globalBoard.labResults.find(e=>e.stationId===r.stationId)});
    }
  }
  upsertForensicResult(){if(!this._pendingEvents)throw Error('Use saveMiniGameResult() to change CSI results.');}
  recordForBoard(payload={},record={}){return this.normalizeResult({...payload,...record});}
  addForensicResultToCrimeBoard(payload={},record={}){if(!this._pendingEvents)throw Error('Use saveMiniGameResult() to change CSI results.');return this.boardFields(this.recordForBoard(payload,record));}
  addCrimeLabClueToBoard(payload={},record={}){return this.addForensicResultToCrimeBoard(payload,record);}
  addLabResultToCrimeBoardData(payload={},record={}){return this.addForensicResultToCrimeBoard(payload,record);}
  unlockIdentityEvidenceForSuspects(payload={}){
    if(!this._pendingEvents)throw Error('Evidence unlocks require a CSI transaction.');
    if(!payload.completed||payload.aborted)return false;
    const type=payload.evidenceType||payload.evidenceConfig?.evidenceType;
    const field=normalizeForensicField(type||'');if(!IDENTITY_FIELDS.has(field))return false;
    const suspects=Array.isArray(this.gameState.caseSuspects)&&this.gameState.caseSuspects.length?this.gameState.caseSuspects:Array.isArray(this.gameState.suspects)?this.gameState.suspects:[];
    for(const suspect of suspects){
      suspect.restrictedProfile??={};const profile=suspect.restrictedProfile;
      profile.unlockedFields??=[];profile.forensicAttributes??={};
      const attribute=profile.forensicAttributes[field];
      if(attribute&&typeof attribute==='object')attribute.unlocked=true;
      if(!profile.unlockedFields.includes(field))profile.unlockedFields.push(field);
    }
    this.emit('suspectEvidenceUnlocked',{caseKey:this.getCaseKey(),evidenceType:type,field});return true;
  }
  upsertById(collection,entry){if(!Array.isArray(collection)||!entry?.id)return false;const i=collection.findIndex(e=>e?.id===entry.id);if(i<0)collection.push(entry);else collection[i]={...collection[i],...entry};return true;}
}
