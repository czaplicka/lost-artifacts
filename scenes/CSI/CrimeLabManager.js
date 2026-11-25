import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { saveGameStateResult } from '../../gameStatePersistence.js';
import { getMissionCaseKey } from '../../crimeCaseKey.js';
import { normalizeMiniGameKey, CSI_MAIN_GAME_POOL, CSI_DUST_ANALYSIS_VARIANTS } from './CrimeLabConfig.js';
import { getForensicValue } from '../../suspects/suspectFactory.js';
import { createCaseThiefProfile } from '../../suspects/CaseThiefProfile.js';
import { normalizeHardEvidence, normalizeForensicField, normalizeForensicValue, evaluateHardEvidence } from '../../suspects/forensicEvidence.js';
import { createMaterialEvidence, getMaterialProfiles, evaluateMaterialEvidence } from '../../suspects/MaterialEvidence.js';
import { createDustEvidence, getDustProfiles, evaluateDustEvidence } from '../../suspects/DustEvidence.js';
import { isCompletedLabResult } from './LabResultState.js';
import { showLabRecovery } from './LabRecoveryUI.js';

const text = key => __dialogueText('scenes/CSI/CrimeLabManager.js', key);
const STATIONS = ['identity', 'trace_0', 'trace_1'];
const GROUPS = [
  ['hair_color', 'blood_type', 'biological_sex', 'fingerprint_pattern'],
  ['shoe_size_category', 'dust_profile'],
  ['handedness', 'material_profile']
];
const ORIGINS = { dust: text('t_9d0f0235dd89cc5008fc'), material: text('t_29d6f1d6fde5186d16f5') };
const present = value => value != null && String(value).trim() !== '';
const fieldOf = e => normalizeForensicField(e?.forensicField || e?.field || e?.attribute || e?.evidenceType || e?.evidenceConfig?.attribute || e?.evidenceConfig?.evidenceType || '');
const valueOf = e => e?.normalizedValue ?? e?.value ?? e?.thief_value ?? e?.correctValue ?? e?.result ?? e?.selectedValue ?? e?.evidenceConfig?.correctValue ?? null;
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
function hash(value) { let h=2166136261; for (const c of String(value)) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; }
function randomItem(items) { if (!items.length) throw Error('No compatible laboratory evidence is available.'); return items[Math.floor(Math.random()*items.length)]; }
function dna(value) { const v=String(value).toLowerCase(); return ['male','m','xy'].includes(v)?'XY':['female','f','xx'].includes(v)?'XX':null; }
function sameEvidence(a,b) {
  const field=fieldOf(a);
  return Boolean(field && field===fieldOf(b) && present(valueOf(a)) && present(valueOf(b)) &&
    normalizeForensicValue(field,valueOf(a))===normalizeForensicValue(field,valueOf(b)));
}
function allowedValues(field) {
  return ({
    hair_color:['blonde','brown','black','red','gray','white','bald'],
    blood_type:['A+','A-','B+','B-','AB+','AB-','O+','O-'],
    biological_sex:['XX','XY'], fingerprint_pattern:['LOOP','WHORL','ARCH'],
    shoe_size_category:['small','medium','large'], handedness:['left','right']
  })[field] || [];
}

export class CrimeLabManager {
  constructor(gameState,cityId) { this.gameState=gameState; this.cityId=cityId; }
  getCaseKey() { return getMissionCaseKey(this.gameState,this.cityId); }
  fail(message) {
    const error=new Error(message); error.code='CSI_RECOVERY_REQUIRED';
    showLabRecovery(this.gameState,this.cityId,error);
    throw error;
  }
  persist() {
    const result=saveGameStateResult();
    if (!['saved','paused'].includes(result.status)) console.error('[CrimeLabManager] Changes remain in memory; save failed.',result);
    return result;
  }
  getRealCaseSuspect() {
    const suspects=this.gameState.caseSuspects;
    if (!Array.isArray(suspects)||!suspects.length) return null;
    const id=this.gameState.trueThiefCaseSuspectId ?? this.gameState.realThiefSuspectId;
    const matches=id!=null?suspects.filter(s=>s?.id===id):suspects.filter(s=>s?.isRealThief===true||s?.hiddenCaseData?.isTrueThief===true);
    return matches.length===1?matches[0]:null;
  }
  getSuspectData() {
    const real=this.getRealCaseSuspect();
    if (real) return real;
    if (Array.isArray(this.gameState.caseSuspects)&&this.gameState.caseSuspects.length) return this.fail('The saved case has no unambiguous offender profile. No suspect data was changed.');
    const thief=this.gameState.currentThief, id=this.gameState.currentThiefId;
    if (!thief || id==null || String(thief.id)!==String(id)) return this.fail('The current offender profile is missing or belongs to another offender.');
    if (Array.isArray(this.gameState.currentMission?.forensicHardEvidence)&&this.gameState.currentMission.forensicHardEvidence.length) return thief;
    // New-case initialization only. Never draw missing traits for an existing roster.
    const canonical=createCaseThiefProfile(thief);
    this.gameState.currentThief=copy(canonical);
    return canonical;
  }
  ensureCaseForensics() {
    this.gameState.caseForensics ??= {};
    const state=this.gameState.caseForensics[this.getCaseKey()] ??= {};
    state.identityEvidenceResult ??= null;
    state.traceEvidenceResults ??= [];
    state.forensicResults ??= [];
    state.suspectGrid ??= {generated:false,completed:false,eliminatedSuspectIds:[],marksBySuspectId:{},clueCards:[],score:0,mistakes:0,hintsUsed:0,completedAt:null};
    return state;
  }
  ensureCaseAssignment() {
    this.gameState.caseCsiAssignments ??= {};
    return this.gameState.caseCsiAssignments[this.getCaseKey()] ??= {identityEvidence:null,traceEvidence:[]};
  }
  isValidIdentityEvidence(e) {
    return Boolean(e && typeof e.id==='string' && e.id && fieldOf(e) && present(valueOf(e)) &&
      (e.caseKey==null||String(e.caseKey)===String(this.getCaseKey())) && normalizeMiniGameKey(e.minigame,e.attribute||e.evidenceType||fieldOf(e)));
  }
  isValidTraceEvidence(e) { return this.isValidIdentityEvidence(e)&&typeof e.label==='string'&&Boolean(e.label); }
  savedResult(index) {
    const state=this.ensureCaseForensics();
    return index===0?state.identityEvidenceResult:state.traceEvidenceResults[index-1];
  }
  getCanonicalHardEvidence() {
    const raw=this.gameState.currentMission?.forensicHardEvidence;
    if (raw==null || (Array.isArray(raw)&&raw.length===0)) return null;
    if (!Array.isArray(raw)) return this.fail('The saved forensic evidence collection is invalid.');
    let normalized;
    try { normalized=normalizeHardEvidence(raw); }
    catch(error) { return this.fail('The saved forensic evidence cannot be read: '+error.message); }
    if (normalized.length!==3) return this.fail('The saved case does not contain exactly three usable forensic clues.');
    const ordered=GROUPS.map((fields,index)=>{
      const matches=normalized.filter(e=>fields.includes(fieldOf(e)));
      if (matches.length!==1) return this.fail('The saved case has a missing or ambiguous '+STATIONS[index]+' clue.');
      const item=matches[0];
      // Normalizers may discard caseKey, so inspect the original entries as well.
      const originals=raw.filter(e=>fieldOf(e)===fieldOf(item));
      if (originals.some(e=>e.caseKey!=null&&String(e.caseKey)!==String(this.getCaseKey()))) return this.fail('A forensic clue belongs to another case.');
      if (item.stationId && item.stationId!==STATIONS[index]) return this.fail('A forensic clue belongs to the wrong laboratory station.');
      return item;
    });
    const real=this.getRealCaseSuspect();
    if (Array.isArray(this.gameState.caseSuspects)&&this.gameState.caseSuspects.length&&!real) return this.fail('The saved case has no unambiguous offender.');
    if (real) {
      let validation;
      try { validation=evaluateHardEvidence(real,ordered); }
      catch(error) { return this.fail('The offender evidence profile cannot be verified: '+error.message); }
      if (validation.status!=='match') return this.fail('Saved forensic clues conflict with, or cannot be verified against, the offender. No clues or suspects were overwritten.');
    }
    return ordered;
  }
  makeEvidence(raw,index,preferred=null) {
    const field=fieldOf(raw), stationId=STATIONS[index];
    let value=valueOf(raw), base;
    if (field==='biological_sex') value=dna(value);
    if (['blood_type','fingerprint_pattern'].includes(field)) value=String(value).toUpperCase();
    if (!present(value)) return this.fail('A saved forensic clue has no usable value.');
    if (field==='dust_profile'||field==='material_profile') {
      if (raw.sourceConfirmed!==true||!String(raw.sourceText||'').trim()) return this.fail('A saved microtrace has no confirmed offender origin.');
      const options={stationId,sourceConfirmed:true,sourceText:raw.sourceText,id:raw.id||`${stationId}_${field}`};
      try { base=field==='dust_profile'?createDustEvidence(value,options):createMaterialEvidence(value,options); }
      catch(error) { return this.fail('The saved microtrace cannot be restored: '+error.message); }
      if (field==='dust_profile') {
        const variant=CSI_DUST_ANALYSIS_VARIANTS[hash(`${this.getCaseKey()}:${raw.id||field}`)%CSI_DUST_ANALYSIS_VARIANTS.length];
        if (variant) base={...base,...variant};
      }
    } else {
      const entry=CSI_MAIN_GAME_POOL.find(e=>normalizeForensicField(e.evidenceType)===field);
      base={...(entry||{}),attribute:field==='biological_sex'?'dna_gender':field,
        minigame:entry?.minigame||normalizeMiniGameKey('',field),allowedValues:allowedValues(field)};
    }
    const compatible=preferred&&sameEvidence(preferred,raw)&&
      (preferred.caseKey==null||String(preferred.caseKey)===String(this.getCaseKey()))&&
      (!preferred.stationId||preferred.stationId===stationId);
    const previous=compatible?copy(preferred):{};
    const attribute=base.attribute||field;
    const id=previous.id||raw.id||`${stationId}_${attribute}`;
    const origin=raw.sourceText||'';
    let clueText=raw.clueText||previous.clueText||base.clueText||`Laboratory finding: ${attribute.replace(/_/g,' ')} = ${value}.`;
    if (origin&&!clueText.includes(origin)) clueText+=' '+origin;
    return {...base,...previous,id,caseKey:this.getCaseKey(),stationId,
      attribute,evidenceType:attribute,field,forensicField:field,
      value,normalizedValue:normalizeForensicValue(field,value),thief_value:value,correctValue:value,
      source:'crime_lab',clueType:index===0?'identity':'trace',isRedHerring:false,
      label:previous.label||raw.label||base.label||attribute.replace(/_/g,' '),clueText,
      ...(field==='dust_profile'||field==='material_profile'?{sourceConfirmed:true,sourceText:origin}:{}),
      minigame:normalizeMiniGameKey(previous.minigame||base.minigame,attribute)};
  }
  assertResultMatches(index,evidence) {
    const result=this.savedResult(index);
    if (!result || result.aborted===true||result.completed===false||result.success===false) return;
    if (result.caseKey!=null&&String(result.caseKey)!==String(this.getCaseKey())) return this.fail('A recorded laboratory result belongs to another case.');
    const values=['value','result','selectedValue','correctValue'].filter(key=>present(result[key]));
    if (!values.length) return;
    const field=fieldOf(result);
    if (!field||field!==fieldOf(evidence)||values.some(key=>!sameEvidence({...result,value:result[key],normalizedValue:result[key]},evidence))) return this.fail('A recorded laboratory result contradicts the saved case evidence. The original results were preserved.');
    if (result.evidenceConfig&&present(valueOf(result.evidenceConfig))&&!sameEvidence(result.evidenceConfig,evidence)) return this.fail('A recorded laboratory configuration contradicts the case evidence.');
  }
  resolveAssignment() {
    const assignment=this.ensureCaseAssignment();
    const hard=this.getCanonicalHardEvidence();
    const old=[assignment.identityEvidence,...(Array.isArray(assignment.traceEvidence)?assignment.traceEvidence:[])];
    let canonical=hard;
    if (!canonical) {
      const hasRoster=Array.isArray(this.gameState.caseSuspects)&&this.gameState.caseSuspects.length>0;
      const hasResults=STATIONS.some((_,i)=>present(valueOf(this.savedResult(i)))) ;
      if (!hasRoster&&!hasResults) return null;
      // Legacy case: recover only already-recorded assignments/configurations.
      canonical=STATIONS.map((station,index)=>{
        const result=this.savedResult(index);
        const candidates=[old[index],result?.evidenceConfig,result];
        const selected=candidates.find(e=>this.isValidIdentityEvidence(e)&&GROUPS[index].includes(fieldOf(e)));
        if (!selected) return this.fail('This old save is missing the original '+station+' evidence. Random replacement has been blocked.');
        return selected;
      });
      const real=this.getRealCaseSuspect();
      if (!real) return this.fail('The original offender cannot be verified in this save.');
      let check;
      try { check=evaluateHardEvidence(real,canonical); }
      catch(error) { return this.fail('The old evidence cannot be verified: '+error.message); }
      if (check.status!=='match') return this.fail('The original evidence does not match the saved offender profile.');
    }
    const restored=canonical.map((raw,index)=>{
      const result=this.savedResult(index);
      const missionTrace=this.gameState.currentMission?.traceEvidence?.[index-1];
      const preferred=[old[index],result?.evidenceConfig,index>0?missionTrace:null].find(e=>e&&sameEvidence(e,raw)&&this.isValidIdentityEvidence(e));
      const evidence=this.makeEvidence(raw,index,preferred);
      this.assertResultMatches(index,evidence);
      return evidence;
    });
    // Commit only after all three stations and recorded results validate.
    const next={...assignment,identityEvidence:restored[0],traceEvidence:restored.slice(1)};
    if (JSON.stringify(next)!==JSON.stringify(assignment)) {
      this.gameState.caseCsiAssignments[this.getCaseKey()]=next;
      this.persist();
    }
    return next;
  }
  ensureIdentityEvidence() {
    let assignment=this.resolveAssignment()||this.ensureCaseAssignment();
    if (!this.isValidIdentityEvidence(assignment.identityEvidence)) {
      assignment.identityEvidence=this.buildIdentityEvidenceForCase(this.getCaseKey());
      this.persist();
    }
    const evidence=copy(assignment.identityEvidence);
    evidence.resultUnlocked=this.isStationCompleted('identity');
    this.gameState.identityEvidence=copy(evidence);
    return evidence;
  }
  ensureRandomTraceEvidence() {
    const assignment=this.resolveAssignment()||this.ensureCaseAssignment();
    const old=assignment.traceEvidence;
    const valid=Array.isArray(old)&&old.length===2&&old.every((e,i)=>this.isValidTraceEvidence(e)&&GROUPS[i+1].includes(fieldOf(e)));
    if (!valid) { assignment.traceEvidence=this.buildTraceEvidenceForCase(); this.persist(); }
    const evidence=copy(assignment.traceEvidence);
    this.gameState.traceEvidence=copy(evidence);
    return evidence;
  }
  isStationCompleted(stationId) {
    const index=STATIONS.indexOf(stationId);
    return index>=0&&isCompletedLabResult(this.savedResult(index),{caseKey:this.getCaseKey()});
  }
  markCrimeLabCompleted({save=true}={}) {
    this.resolveAssignment();
    if (!STATIONS.every(id=>this.isStationCompleted(id))) return false;
    this.gameState.crimeCityProgress ??= {};
    const progress=this.gameState.crimeCityProgress[this.getCaseKey()] ??= {};
    const changed=progress.crimeLabCompleted!==true||!Number.isFinite(progress.crimeLabCompletedAt)||progress.crimeLabCompletedAt<=0;
    progress.crimeLabCompleted=true;
    if (!Number.isFinite(progress.crimeLabCompletedAt)||progress.crimeLabCompletedAt<=0) progress.crimeLabCompletedAt=Date.now();
    // Legacy global flag is not an authority for completion.
    if (save&&changed) this.persist();
    return true;
  }
  normalizeEvidenceConfig(evidence={}, {stationId=null,fallbackLabel=text('t_d2f42de4fcfd1fbdaa64'),fallbackClueType='trace'}={}) {
    const attribute=evidence.attribute||evidence.field||evidence.evidenceType;
    const value=evidence.thief_value??evidence.correctValue??valueOf(evidence);
    if (!attribute||!present(value)) return this.fail('The laboratory evidence configuration is incomplete.');
    const result={...copy(evidence),caseKey:this.getCaseKey(),id:evidence.id||`${attribute}_evidence`,
      stationId:stationId??evidence.stationId??null,attribute,evidenceType:attribute,thief_value:value,correctValue:value,
      source:evidence.source||'crime_lab',label:evidence.label||fallbackLabel,clueType:evidence.clueType||fallbackClueType,
      clueText:evidence.clueText||`Laboratory finding: ${attribute} = ${value}.`,
      allowedValues:Array.isArray(evidence.allowedValues)?[...evidence.allowedValues]:allowedValues(fieldOf(evidence)),
      minigame:normalizeMiniGameKey(evidence.minigame,attribute)};
    if (!result.minigame) return this.fail('The saved evidence type has no supported laboratory minigame.');
    return {...result,evidence:copy(result)};
  }
  getIdentityEvidenceConfig() { return this.normalizeEvidenceConfig(this.ensureIdentityEvidence(),{stationId:'identity',fallbackLabel:text('t_9b0f1ff98f35c658af82'),fallbackClueType:'identity'}); }
  getTraceEvidenceConfig(index) {
    if (![0,1].includes(index)) throw Error('Unknown trace evidence index.');
    return this.normalizeEvidenceConfig(this.ensureRandomTraceEvidence()[index],{stationId:`trace_${index}`,fallbackLabel:`Trace ${index+1}`,fallbackClueType:'trace'});
  }
  buildIdentityEvidenceForCase(caseKey=this.getCaseKey()) {
    const hard=this.getCanonicalHardEvidence();
    if (hard) return this.makeEvidence(hard[0],0);
    const suspect=this.getSuspectData();
    const candidates=CSI_MAIN_GAME_POOL.map(entry=>{
      const field=normalizeForensicField(entry.evidenceType);
      const value=getForensicValue(suspect,field,null);
      return present(value)?{...entry,id:`identity_${entry.evidenceType}`,field,attribute:entry.evidenceType,value}:null;
    }).filter(Boolean);
    if (!candidates.length) return this.fail('The offender has no usable identity evidence.');
    return this.makeEvidence(candidates[hash(suspect.id||caseKey)%candidates.length],0);
  }
  assignDustAnalysisVariant(evidence) { return {...copy(evidence),...randomItem(CSI_DUST_ANALYSIS_VARIANTS)}; }
  buildTraceEvidenceForCase() {
    const hard=this.getCanonicalHardEvidence();
    if (hard) return hard.slice(1).map((e,i)=>this.makeEvidence(e,i+1));
    const suspect=this.getSuspectData();
    const shoe=String(getForensicValue(suspect,'shoe_size_category','')).toLowerCase();
    const hand=String(getForensicValue(suspect,'handedness','')).toLowerCase().replace(/[-_ ]handed$/,'');
    if (!['small','medium','large'].includes(shoe)||!['left','right','ambidextrous'].includes(hand)) return this.fail('The offender has missing or invalid footwear/handedness data.');
    let dust=getDustProfiles().map(p=>createDustEvidence(p.id,{stationId:'trace_0',sourceConfirmed:true,sourceText:ORIGINS.dust}));
    if (suspect.dustProfile) dust=dust.filter(e=>evaluateDustEvidence(suspect,e).status==='compatible');
    let material=getMaterialProfiles().map(p=>createMaterialEvidence(p.id,{stationId:'trace_1',sourceConfirmed:true,sourceText:ORIGINS.material}));
    if (suspect.materialProfile) material=material.filter(e=>evaluateMaterialEvidence(suspect,e).status==='compatible');
    const first=dust.length&&Math.random()<0.5?this.assignDustAnalysisVariant(randomItem(dust)):
      {id:'trace_shoe_print',attribute:'shoe_size_category',value:shoe,label:text('t_c22cb3b58cdf9c10664b'),minigame:'ShoeprintScene'};
    if (hand==='ambidextrous'&&!material.length) return this.fail('No compatible material evidence exists for this ambidextrous offender.');
    const second=hand==='ambidextrous'||(material.length&&Math.random()<0.5)?randomItem(material):
      {id:'trace_hand_smudge',attribute:'handedness',value:hand,label:text('t_d41caa779801fabac35a'),minigame:'ToolmarkAnalysisScene'};
    return [this.makeEvidence(first,1,first),this.makeEvidence(second,2,second)];
  }
}
