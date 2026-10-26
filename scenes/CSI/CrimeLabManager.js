import { saveGameState } from '../../gameStatePersistence.js';
import { normalizeMiniGameKey, CSI_MAIN_GAME_POOL } from './CrimeLabConfig.js';
import { getForensicValue } from '../../suspects/suspectFactory.js';
import { createMaterialEvidence, getMaterialProfiles, evaluateMaterialEvidence } from '../../suspects/MaterialEvidence.js';
import { createDustEvidence, getDustProfiles, evaluateDustEvidence } from '../../suspects/DustEvidence.js';
import { isCompletedLabResult } from './LabResultState.js';
function cloneEvidence(evidence={}){return structuredClone(evidence);}
function getEvidenceValue(evidence={}){return evidence.thief_value??evidence.value??evidence.correctValue??evidence.normalizedValue??null;}
function hashString(value){let hash=0;for(const c of String(value||'default'))hash=(hash*31+c.charCodeAt(0))>>>0;return hash;}
function mapGenderCodeToDnaProfile(value){const n=String(value||'').trim().toLowerCase();if(['m','male','xy'].includes(n))return'XY';if(['f','female','xx'].includes(n))return'XX';return null;}
function weightedFingerprintPattern(seed){const r=(seed%1000)/1000;return r<.65?'LOOP':r<.95?'WHORL':'ARCH';}
function randomItem(items){return items[Math.floor(Math.random()*items.length)];}
const ORIGINS={
  dust:'Microscopic residue recovered during the crime-scene examination and isolated from background contamination.',
  material:'Material fragment recovered during the crime-scene examination. This trace does not establish the method of entry.'
};
export class CrimeLabManager {
  constructor(gameState,cityId){this.gameState=gameState;this.cityId=cityId;}
  getCaseKey(){
    const mission=this.gameState.currentMission??{},id=mission.id??mission.caseId??mission.caseIndex;
    if(id!==undefined&&id!==null&&id!=='')return String(id);
    return `${this.cityId??'unknown_city'}_${mission.artifact??'default_artifact'}`;
  }
  getSuspectData(){
    const suspect=this.gameState.selectedThiefProfile||this.gameState.selectedThief||this.gameState.currentThief||this.gameState.thief||{};
    return {...suspect,...(this.gameState.reconstructedHeist||{})};
  }
  ensureCaseForensics(){
    this.gameState.caseForensics??={};const state=this.gameState.caseForensics[this.getCaseKey()]??={};
    state.identityEvidenceResult??=null;state.traceEvidenceResults??=[];state.forensicResults??=[];
    state.suspectGrid??={generated:false,completed:false,eliminatedSuspectIds:[],marksBySuspectId:{},clueCards:[],score:0,mistakes:0,hintsUsed:0,completedAt:null};
    return state;
  }
  ensureCaseAssignment(){
    this.gameState.caseCsiAssignments??={};
    return this.gameState.caseCsiAssignments[this.getCaseKey()]??={identityEvidence:null,traceEvidence:[]};
  }
  isValidIdentityEvidence(e){return Boolean(e&&typeof e.id==='string'&&e.id&&typeof e.attribute==='string'&&e.attribute&&getEvidenceValue(e)!==null);}
  isValidTraceEvidence(e){return this.isValidIdentityEvidence(e)&&typeof e.label==='string'&&Boolean(e.label);}
  isStationCompleted(id){
    const state=this.ensureCaseForensics();let result=null;
    if(id==='identity')result=state.identityEvidenceResult;
    else if(/^trace_[01]$/.test(String(id)))result=state.traceEvidenceResults[Number(id.slice(-1))];
    return isCompletedLabResult(result,{caseKey:this.getCaseKey()});
  }
  markCrimeLabCompleted(){
    const key=this.getCaseKey();this.gameState.crimeCityProgress??={};this.gameState.crimeCityProgress[key]??={};
    this.gameState.crimeCityProgress[key].crimeLabCompleted=true;
    this.gameState.crimeCityProgress[key].crimeLabCompletedAt=Date.now();this.gameState.csiLabCompleted=true;saveGameState();
  }
  normalizeEvidenceConfig(evidence={}, {stationId=null,fallbackLabel='Forensic Analysis',fallbackClueType='trace'}={}){
    const attribute=evidence.attribute||evidence.field||evidence.evidenceType,value=getEvidenceValue(evidence);
    if(!attribute||value==null||value==='')throw new Error('CrimeLabManager: invalid forensic evidence.');
    const result={
      ...cloneEvidence(evidence),id:evidence.id||`${attribute}_evidence`,stationId:stationId??evidence.stationId??null,
      attribute,evidenceType:attribute,thief_value:value,correctValue:value,
      source:evidence.source||'crime_lab',label:evidence.label||fallbackLabel,clueType:evidence.clueType||fallbackClueType,
      clueText:evidence.clueText||`Laboratory analysis confirms: ${attribute} = ${value}.`,
      allowedValues:Array.isArray(evidence.allowedValues)?[...evidence.allowedValues]:[],
      minigame:normalizeMiniGameKey(evidence.minigame,attribute)
    };
    return {...result,evidence:cloneEvidence(result)};
  }
  ensureIdentityEvidence(){
    const assignment=this.ensureCaseAssignment();
    if(!this.isValidIdentityEvidence(assignment.identityEvidence)){
      assignment.identityEvidence=this.buildIdentityEvidenceForCase(this.getCaseKey());
      if(!this.isValidIdentityEvidence(assignment.identityEvidence))throw new Error('CrimeLabManager: cannot generate identity evidence.');
      saveGameState();
    }
    const evidence=cloneEvidence(assignment.identityEvidence);evidence.resultUnlocked=this.isStationCompleted('identity');
    this.gameState.identityEvidence=cloneEvidence(evidence);return evidence;
  }
  getIdentityEvidenceConfig(){return this.normalizeEvidenceConfig(this.ensureIdentityEvidence(),{
    stationId:'identity',fallbackLabel:'Identity Evidence Analysis',fallbackClueType:'identity'});}
  buildIdentityEvidenceForCase(caseKey){
    const suspect=this.getSuspectData(),seed=hashString(suspect.id||suspect.name||caseKey);
    const templates=CSI_MAIN_GAME_POOL.map(entry=>{
      let value,allowedValues,clueText;
      switch(entry.evidenceType){
        case'hair_color':
          value=getForensicValue(suspect,'hair_color',null);allowedValues=['Black','Brown','Blond','Red','Grey','White','Auburn'];
          clueText=value?`Microscopic hair analysis indicates a ${String(value).toLowerCase()} hair strand.`:null;break;
        case'blood_type':
          value=getForensicValue(suspect,'blood_type',null);allowedValues=['A+','A-','B+','B-','AB+','AB-','O+','O-'];
          clueText=value?`Serological testing confirms a blood type of ${value}.`:null;break;
        case'dna_gender':
          value=mapGenderCodeToDnaProfile(getForensicValue(suspect,'biological_sex',null)||suspect.gender_code||suspect.genderCode||suspect.gender);
          allowedValues=['XX','XY'];clueText=value?`DNA amplification reveals a ${value} profile.`:null;break;
        case'fingerprint_pattern':
          value=String(getForensicValue(suspect,'fingerprint_pattern',weightedFingerprintPattern(seed))).toUpperCase();
          allowedValues=['LOOP','WHORL','ARCH'];clueText=`Latent print analysis shows a ${value.toLowerCase()} ridge pattern.`;break;
        default:return null;
      }
      if(value==null||value==='')return null;
      return {...entry,id:`identity_${entry.evidenceType}`,attribute:entry.evidenceType,thief_value:value,allowedValues,
        clueType:'identity',source:'crime_lab',clueText,stationId:'identity'};
    }).filter(Boolean);
    return templates.length?cloneEvidence(templates[seed%templates.length]):null;
  }
  ensureRandomTraceEvidence(){
    const assignment=this.ensureCaseAssignment(),old=assignment.traceEvidence;
    const valid=Array.isArray(old)&&old.length===2&&old.every(e=>this.isValidTraceEvidence(e))&&
      ['shoeSizeCategory','shoe_size_category','dust_profile'].includes(old[0].attribute)&&
      ['handedness','material_profile'].includes(old[1].attribute);
    if(!valid){
      const state=this.ensureCaseForensics(),hard=this.gameState.currentMission?.forensicHardEvidence;
      if(state.traceEvidenceResults.some(Boolean)||(Array.isArray(hard)&&hard.length)){
        throw new Error('CrimeLabManager: invalid saved trace assignment. Start a new case; no silent migration.');
      }
      assignment.traceEvidence=this.buildTraceEvidenceForCase(this.getCaseKey());saveGameState();
    }
    const evidence=assignment.traceEvidence.map(e=>cloneEvidence(e));
    this.gameState.traceEvidence=evidence.map(e=>cloneEvidence(e));return evidence;
  }
  buildTraceEvidenceForCase(){
    const suspect=this.getSuspectData();
    const shoeSize=String(getForensicValue(suspect,'shoe_size_category','medium')).trim().toLowerCase();
    const hand=String(getForensicValue(suspect,'handedness','right')).trim().toLowerCase().replace(/[-_ ]handed$/,'');
    if(!['small','medium','large'].includes(shoeSize))throw new Error(`CrimeLabManager: unsupported shoe size "${shoeSize}" for suspect "${suspect.id||suspect.name||'unknown'}".`);
    if(!['left','right','ambidextrous'].includes(hand))throw new Error(`CrimeLabManager: unsupported handedness "${hand}" for suspect "${suspect.id||suspect.name||'unknown'}".`);
    const shoe={id:'trace_shoe_print',label:'Boot Print Analysis',attribute:'shoeSizeCategory',thief_value:shoeSize,
      allowedValues:['small','medium','large'],minigame:'ShoeprintScene',stationId:'trace_0',clueType:'trace',source:'crime_lab',
      isRedHerring:false,clueText:`The partial boot print indicates ${shoeSize} footwear.`};
    let dust=getDustProfiles().map(profile=>({...createDustEvidence(profile.id,{
      stationId:'trace_0',sourceConfirmed:true,sourceText:ORIGINS.dust}),originBasis:'generated_case_rule',collectionMode:'technical_sweep'}));
    if(suspect.dustProfile)dust=dust.filter(e=>evaluateDustEvidence(suspect,e).status==='compatible');
    let first=shoe;if(dust.length&&Math.random()<.5)first=randomItem(dust);
    let material=getMaterialProfiles().map(profile=>({...createMaterialEvidence(profile.id,{
      stationId:'trace_1',sourceConfirmed:true,sourceText:ORIGINS.material}),originBasis:'generated_case_rule',collectionMode:'technical_sweep'}));
    if(suspect.materialProfile)material=material.filter(e=>evaluateMaterialEvidence(suspect,e).status==='compatible');
    const requiresMaterial=hand==='ambidextrous';
    if(requiresMaterial&&material.length===0)throw new Error(`CrimeLabManager: no compatible material evidence for ambidextrous suspect "${suspect.id||suspect.name||'unknown'}".`);
    let second;
    if(requiresMaterial||(material.length>0&&Math.random()<.5)){
      second=randomItem(material);second.source='crime_lab';
      if(second.sourceText&&!String(second.clueText||'').includes(second.sourceText))second.clueText=[second.clueText,second.sourceText].filter(Boolean).join(' ');
    }else{
      second={id:'trace_hand_smudge',label:'Contact Pattern Analysis',attribute:'handedness',thief_value:hand,
        allowedValues:['left','right'],minigame:'ToolmarkAnalysisScene',stationId:'trace_1',clueType:'trace',source:'crime_lab',
        isRedHerring:false,clueText:`The recorded contact pattern indicates ${hand}-handed use.`};
    }return[first,second];
  }
  getTraceEvidenceConfig(index){
    const evidence=this.ensureRandomTraceEvidence()[index];
    if(!evidence)throw new Error(`CrimeLabManager: trace ${index} does not exist.`);
    return this.normalizeEvidenceConfig(evidence,{stationId:`trace_${index}`,fallbackLabel:`Trace Evidence ${index+1}`,fallbackClueType:'trace'});
  }
}
