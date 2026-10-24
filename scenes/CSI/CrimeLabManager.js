import {saveGameState} from '../../gameStatePersistence.js';
import {normalizeMiniGameKey,CSI_MAIN_GAME_POOL} from './CrimeLabConfig.js';
import {getForensicValue} from '../../suspects/suspectFactory.js';
import {createMaterialEvidence,getMaterialProfiles,evaluateMaterialEvidence} from '../../suspects/MaterialEvidence.js';
import {createDustEvidence,getDustProfiles,evaluateDustEvidence} from '../../suspects/DustEvidence.js';
function cloneEvidence(e={}){return structuredClone(e);}
function getEvidenceValue(e={}){return e.thief_value??e.value??e.correctValue??e.normalizedValue??null;}
function hashString(value){let hash=0;for(const c of String(value||'default'))hash=(hash*31+c.charCodeAt(0))>>>0;return hash;}
function mapGenderCodeToDnaProfile(value){const v=String(value||'').trim().toLowerCase();return['m','male','xy'].includes(v)?'XY':['f','female','xx'].includes(v)?'XX':null;}
function weightedFingerprintPattern(seed){const r=(seed%1000)/1000;return r<.65?'LOOP':r<.95?'WHORL':'ARCH';}
// These are authored case associations, not proof of a clicked hidden object.
// No entry method, glove, window, cut grille or particular museum is inferred.
const ORIGINS={
  dust:'Microscopic residue recovered during the crime-scene examination and isolated from background contamination.',
  material:'Material fragment recovered during the crime-scene examination. This trace does not establish the method of entry.'
};
export class CrimeLabManager {
  constructor(gameState,cityId){this.gameState=gameState;this.cityId=cityId;}
  getCaseKey(){const m=this.gameState.currentMission??{},id=m.id??m.caseId??m.caseIndex;return id!==undefined&&id!==null&&id!==''?String(id):`${this.cityId??'unknown_city'}_${m.artifact??'default_artifact'}`;}
  getSuspectData(){const s=this.gameState.selectedThiefProfile||this.gameState.selectedThief||this.gameState.currentThief||this.gameState.thief||{};return{...s,...(this.gameState.reconstructedHeist||{})};}
  ensureCaseForensics(){
    this.gameState.caseForensics??={};const s=this.gameState.caseForensics[this.getCaseKey()]??={};
    s.identityEvidenceResult??=null;s.traceEvidenceResults??=[];s.forensicResults??=[];
    s.suspectGrid??={generated:false,completed:false,eliminatedSuspectIds:[],marksBySuspectId:{},clueCards:[],score:0,mistakes:0,hintsUsed:0,completedAt:null};return s;
  }
  ensureCaseAssignment(){this.gameState.caseCsiAssignments??={};return this.gameState.caseCsiAssignments[this.getCaseKey()]??={identityEvidence:null,traceEvidence:[]};}
  isValidIdentityEvidence(e){return Boolean(e&&typeof e.id==='string'&&e.id&&typeof e.attribute==='string'&&e.attribute&&getEvidenceValue(e)!==null);}
  isValidTraceEvidence(e){return this.isValidIdentityEvidence(e)&&typeof e.label==='string'&&Boolean(e.label);}
  isStationCompleted(id){const s=this.ensureCaseForensics();if(id==='identity')return Boolean(s.identityEvidenceResult);const m=/^trace_([01])$/.exec(String(id||''));return m?Boolean(s.traceEvidenceResults[Number(m[1])]):false;}
  markCrimeLabCompleted(){
    const key=this.getCaseKey();this.gameState.crimeCityProgress??={};this.gameState.crimeCityProgress[key]??={};
    this.gameState.crimeCityProgress[key].crimeLabCompleted=true;this.gameState.crimeCityProgress[key].crimeLabCompletedAt=Date.now();this.gameState.csiLabCompleted=true;saveGameState();
  }
  normalizeEvidenceConfig(evidence={}, {stationId=null,fallbackLabel='Forensic Analysis',fallbackClueType='trace'}={}){
    const attribute=evidence.attribute||evidence.field||evidence.evidenceType,value=getEvidenceValue(evidence);
    if(!attribute||value==null||value==='')throw new Error('CrimeLabManager: invalid forensic evidence.');
    const result={...cloneEvidence(evidence),id:evidence.id||`${attribute}_evidence`,stationId:stationId??evidence.stationId??null,
      attribute,evidenceType:attribute,thief_value:value,correctValue:value,source:evidence.source||'crime_lab',
      label:evidence.label||fallbackLabel,clueType:evidence.clueType||fallbackClueType,
      clueText:evidence.clueText||`Laboratory analysis confirms: ${attribute} = ${value}.`,
      allowedValues:Array.isArray(evidence.allowedValues)?[...evidence.allowedValues]:[],
      minigame:attribute==='material_profile'?'MaterialAnalysisScene':attribute==='dust_profile'?'ToolmarkAnalysisScene':normalizeMiniGameKey(evidence.minigame,attribute)};
    return{...result,evidence:cloneEvidence(result)};
  }
  ensureIdentityEvidence(){
    const a=this.ensureCaseAssignment();
    if(!this.isValidIdentityEvidence(a.identityEvidence)){
      a.identityEvidence=this.buildIdentityEvidenceForCase(this.getCaseKey());
      if(!this.isValidIdentityEvidence(a.identityEvidence))throw new Error('CrimeLabManager: cannot generate identity evidence.');saveGameState();
    }
    const e=cloneEvidence(a.identityEvidence);e.resultUnlocked=Boolean(this.ensureCaseForensics().identityEvidenceResult);this.gameState.identityEvidence=cloneEvidence(e);return e;
  }
  getIdentityEvidenceConfig(){return this.normalizeEvidenceConfig(this.ensureIdentityEvidence(),{stationId:'identity',fallbackLabel:'Identity Evidence Analysis',fallbackClueType:'identity'});}
  buildIdentityEvidenceForCase(caseKey){
    const s=this.getSuspectData(),seed=hashString(s.id||s.name||caseKey);
    const templates=CSI_MAIN_GAME_POOL.map(entry=>{
      let value,allowedValues,clueText;
      switch(entry.evidenceType){
        case'hair_color':value=getForensicValue(s,'hair_color',null);allowedValues=['Black','Brown','Blond','Red','Grey','White','Auburn'];clueText=value?`Microscopic hair analysis indicates a ${String(value).toLowerCase()} hair strand.`:null;break;
        case'blood_type':value=getForensicValue(s,'blood_type',null);allowedValues=['A+','A-','B+','B-','AB+','AB-','O+','O-'];clueText=value?`Serological testing confirms a blood type of ${value}.`:null;break;
        case'dna_gender':value=mapGenderCodeToDnaProfile(getForensicValue(s,'biological_sex',null)||s.gender_code||s.genderCode||s.gender);allowedValues=['XX','XY'];clueText=value?`DNA amplification reveals a ${value} profile.`:null;break;
        case'fingerprint_pattern':value=String(getForensicValue(s,'fingerprint_pattern',weightedFingerprintPattern(seed))).toUpperCase();allowedValues=['LOOP','WHORL','ARCH'];clueText=`Latent print analysis shows a ${value.toLowerCase()} ridge pattern.`;break;
        default:return null;
      }
      if(value==null||value==='')return null;
      return{...entry,id:`identity_${entry.evidenceType}`,attribute:entry.evidenceType,thief_value:value,allowedValues,clueType:'identity',source:'crime_lab',clueText,stationId:'identity'};
    }).filter(Boolean);return templates.length?cloneEvidence(templates[seed%templates.length]):null;
  }
  ensureRandomTraceEvidence(){
    const a=this.ensureCaseAssignment(),old=a.traceEvidence;
    const valid=Array.isArray(old)&&old.length===2&&old.every(e=>this.isValidTraceEvidence(e))&&
      ['shoeSizeCategory','shoe_size_category','dust_profile'].includes(old[0].attribute)&&['handedness','material_profile'].includes(old[1].attribute);
    if(!valid){
      const s=this.ensureCaseForensics(),hard=this.gameState.currentMission?.forensicHardEvidence;
      if(s.traceEvidenceResults.some(Boolean)||(Array.isArray(hard)&&hard.length))throw new Error('CrimeLabManager: invalid saved trace assignment. Start a new case; no silent migration.');
      a.traceEvidence=this.buildTraceEvidenceForCase(this.getCaseKey());saveGameState();
    }
    // Never silently rewrite descriptions or values in an existing saved case.
    const evidence=a.traceEvidence.map(e=>cloneEvidence(e));this.gameState.traceEvidence=evidence.map(e=>cloneEvidence(e));return evidence;
  }
  buildTraceEvidenceForCase(){
    const s=this.getSuspectData(),shoeSize=String(getForensicValue(s,'shoe_size_category','medium')).trim().toLowerCase();
    const hand=String(getForensicValue(s,'handedness','right')).trim().toLowerCase().replace(/[-_ ]handed$/,'');
    if(!['small','medium','large'].includes(shoeSize)||!['left','right'].includes(hand))throw new Error('CrimeLabManager: unsupported shoe size or handedness.');
    const shoe={id:'trace_shoe_print',label:'Boot Print Analysis',attribute:'shoeSizeCategory',thief_value:shoeSize,
      allowedValues:['small','medium','large'],minigame:'ShoeprintScene',stationId:'trace_0',clueType:'trace',source:'crime_lab',isRedHerring:false,
      clueText:`The partial boot print indicates ${shoeSize} footwear.`};
    const handedness={id:'trace_hand_smudge',label:'Contact Pattern Analysis',attribute:'handedness',thief_value:hand,
      allowedValues:['left','right'],minigame:'ToolmarkAnalysisScene',stationId:'trace_1',clueType:'trace',source:'crime_lab',isRedHerring:false,
      clueText:`The recorded contact pattern indicates ${hand}-handed use.`};
    let dust=getDustProfiles().map(p=>({...createDustEvidence(p.id,{stationId:'trace_0',sourceConfirmed:true,sourceText:ORIGINS.dust}),originBasis:'generated_case_rule',collectionMode:'technical_sweep'}));
    if(s.dustProfile)dust=dust.filter(e=>evaluateDustEvidence(s,e).status==='compatible');
    let first=shoe;if(dust.length&&Math.random()<.5)first=dust[Math.floor(Math.random()*dust.length)];
    let material=getMaterialProfiles().map(p=>({...createMaterialEvidence(p.id,{stationId:'trace_1',sourceConfirmed:true,sourceText:ORIGINS.material}),originBasis:'generated_case_rule',collectionMode:'technical_sweep'}));
    if(s.materialProfile)material=material.filter(e=>evaluateMaterialEvidence(s,e).status==='compatible');
    let second=handedness;
    if(material.length&&Math.random()<.5){
      second=material[Math.floor(Math.random()*material.length)];second.source='crime_lab';
      if(!second.clueText.includes(second.sourceText))second.clueText+=` ${second.sourceText}`;
    }
    return[first,second];
  }
  getTraceEvidenceConfig(index){const e=this.ensureRandomTraceEvidence()[index];if(!e)throw new Error(`CrimeLabManager: trace ${index} does not exist.`);return this.normalizeEvidenceConfig(e,{stationId:`trace_${index}`,fallbackLabel:`Trace Evidence ${index+1}`,fallbackClueType:'trace'});}
}
