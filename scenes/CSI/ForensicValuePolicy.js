import { getForensicHairColorDefinitions, normalizeForensicHairColor } from '../../config/ForensicHairColors.js';
import { getDustProfiles } from '../../suspects/DustEvidence.js';
import { getMaterialProfiles } from '../../suspects/MaterialEvidence.js';
import { FORENSIC_VALIDATION_TEXT as TEXT } from './ForensicValidationText.js';

const OWN = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const GUARDED = new Set(['HairAnalysisScene','BloodAnalysisScene','DnaGenderScene',
  'FingerprintPatternScene','ShoeprintScene','ToolmarkAnalysisScene',
  'ChemicalResidueScene','MaterialAnalysisScene']);
const KEYS = ['correctValue','thief_value','value','normalizedValue'];
const FIELDS = ['evidenceType','attribute','field','forensicField'];
const lower = v => typeof v === 'string' ? v.trim().toLowerCase() : null;
const upper = v => typeof v === 'string' ? v.trim().toUpperCase() : null;
const exact = v => typeof v === 'string' ? v.trim() : null;
const canonicalField = v => ({dna_gender:'biological_sex',biologicalSex:'biological_sex'})[v] ?? v;
export class ForensicValidationError extends Error {
  constructor(code) { super(code); this.name='ForensicValidationError'; this.code=code; }
}
const fail = code => { throw new ForensicValidationError(code); };
function sources(data) {
  if (!object(data)) return fail('CSI_INVALID_INPUT');
  const result=[data];
  for (const key of ['evidence','evidenceConfig']) {
    if (!OWN(data,key)) continue;
    if (!object(data[key])) return fail('CSI_INVALID_EVIDENCE_CONFIG');
    result.push(data[key]);
  }
  return result;
}
export function normalizeEvidenceValue(data, allowed, normalize=exact, fallback=null) {
  if (fallback !== null) return fail('CSI_DEFAULT_VALUE_FORBIDDEN');
  if (!Array.isArray(allowed) || !allowed.length || allowed.some(v=>typeof v!=='string'||!v.trim()) ||
      new Set(allowed).size!==allowed.length) return fail('CSI_INVALID_DICTIONARY');
  const input=sources(data), values=[];
  for (const item of input) for (const key of KEYS) {
    if (!OWN(item,key)) continue;
    const v=typeof item[key]==='string' ? normalize(item[key]) : null;
    if (!allowed.includes(v)) return fail('CSI_UNSUPPORTED_VALUE');
    values.push(v);
  }
  if (!values.length) return fail('CSI_MISSING_VALUE');
  if (new Set(values).size!==1) return fail('CSI_CONFLICTING_VALUES');
  const value=values[0];
  for (const item of input) {
    if (!OWN(item,'allowedValues')) continue;
    const options=item.allowedValues;
    if (!Array.isArray(options)||!options.length) return fail('CSI_INVALID_ALLOWED_VALUES');
    const canonical=options.map(v=>typeof v==='string'?normalize(v):null);
    if(canonical.some(v=>!allowed.includes(v))||new Set(canonical).size!==canonical.length||!canonical.includes(value)) {
      return fail('CSI_INVALID_ALLOWED_VALUES');
    }
  }
  return value;
}

// Shared by BaseForensicMinigame and the legacy BaseScene-only adapters.
export function normalizeCorrectValue(allowed, fallback=null) {
  const input=this._forensicValueInput ?? {correctValue:this.correctValue};
  const normalize=this._forensicValueNormalizer ?? exact;
  const value=normalizeEvidenceValue(input,allowed,normalize,fallback);
  this.correctValue=value;
  return value;
}
function specification(key,data) {
  if(key==='HairAnalysisScene') return {field:'hair_color',allowed:getForensicHairColorDefinitions().map(p=>p.id),normalize:normalizeForensicHairColor};
  if(key==='BloodAnalysisScene') return {field:'blood_type',allowed:['A+','A-','B+','B-','AB+','AB-','O+','O-'],normalize:upper};
  if(key==='DnaGenderScene') return {field:'biological_sex',allowed:['XX','XY'],normalize:upper};
  if(key==='FingerprintPatternScene') return {field:'fingerprint_pattern',allowed:['LOOP','WHORL','ARCH'],normalize:upper};
  if(key==='ShoeprintScene') return {field:'shoe_size_category',allowed:['small','medium','large'],normalize:lower};
  if(key==='MaterialAnalysisScene') return {field:'material_profile',allowed:getMaterialProfiles().map(p=>p.id),normalize:exact};
  const input=sources(data);
  const fields=input.flatMap(o=>FIELDS.filter(k=>OWN(o,k)).map(k=>canonicalField(o[k])));
  if(key==='ToolmarkAnalysisScene' && (!fields.length||fields.every(v=>v==='handedness'))) {
    return {field:'handedness',allowed:['left','right'],normalize:v=>lower(v)?.replace(/[-_ ]handed$/,'')};
  }
  if(key==='ChemicalResidueScene'||key==='ToolmarkAnalysisScene') {
    return {field:'dust_profile',allowed:getDustProfiles().map(p=>p.id),normalize:exact};
  }
  return fail('CSI_UNSUPPORTED_ANALYSIS');
}
function canonicalInput(key,data,spec,value) {
  const input=sources(data);
  for(const item of input) for(const field of FIELDS) {
    if(OWN(item,field)&&canonicalField(item[field])!==spec.field) return fail('CSI_CONFLICTING_FIELDS');
  }
  for(const key of ['stationId','caseKey','cityId']) {
    const declared=input.filter(o=>OWN(o,key)&&o[key]!=null).map(o=>String(o[key]));
    if(new Set(declared).size>1) return fail('CSI_CONFLICTING_CONTEXT');
  }
  const evidenceType=key==='DnaGenderScene'?'dna_gender':spec.field;
  const config={...(data.evidenceConfig||{}),...(data.evidence||{})};
  const evidence={...config,evidenceType,attribute:evidenceType,field:spec.field,forensicField:spec.field,
    correctValue:value,thief_value:value,value,normalizedValue:value};
  return {...data,evidenceType,correctValue:value,
    stationId:data.stationId??config.stationId,caseKey:data.caseKey??config.caseKey,cityId:data.cityId??config.cityId,
    ...(OWN(data,'evidence')?{evidence:{...evidence}}:{}),evidenceConfig:evidence};
}
function safe(action) { try{return action();}catch(error){console.error('[CSI validation] Notification failed.',error);} }
function editable(event) { return Boolean(event?.target?.closest?.('input,textarea,select,[contenteditable="true"]')); }
function failedInit(scene,state,error) {
  state.error=error instanceof ForensicValidationError?error:new ForensicValidationError('CSI_ANALYSIS_UNAVAILABLE');
  scene.correctValue=null;scene.resolved=false;scene.finished=false;scene.selectedValue=null;
  console.error('[CSI validation] Analysis blocked.',error);
}
function assertCurrent(scene,state) {
  if(!state) return fail('CSI_UNVALIDATED_ANALYSIS');
  if(state.error) throw state.error;
  if(!state.valid) return fail('CSI_UNVALIDATED_ANALYSIS');
  if(state.preview) return;
  if(scene.correctValue!==state.value) return fail('CSI_VALUE_CHANGED_AFTER_VALIDATION');
  if(scene._validationError||scene._materialError) return fail('CSI_ANALYSIS_CONFIGURATION_REJECTED');
}
function showFailure(scene,state,initializeBase) {
  if(state.screen||state.closed) return;
  state.screen=true;
  if(!state.createdBase) {
    // Derived init may have failed before resetting its own lifecycle fields.
    scene._forensicCleanupDone=false;
    initializeBase();state.createdBase=true;
  }
  const {width,height}=scene.scale,objects=[];
  const track=o=>{objects.push(o);return o;};
  const backdrop=track(scene.add.rectangle(0,0,width,height,0x07110d,.98).setOrigin(0).setDepth(100000).setInteractive());
  backdrop.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());
  track(scene.add.text(width/2,height*.28,TEXT.title,{fontFamily:'PressStart2P',fontSize:'14px',color:'#ffcc66',align:'center',wordWrap:{width:width-40}}).setOrigin(.5).setDepth(100001));
  track(scene.add.text(width/2,height*.47,TEXT.body,{fontFamily:'SpecialElite',fontSize:'22px',color:'#fff4c7',align:'center',wordWrap:{width:Math.max(100,Math.min(700,width-40))}}).setOrigin(.5).setDepth(100001));
  const back=track(scene.add.text(width/2,height*.72,TEXT.back,{fontFamily:'PressStart2P',fontSize:'11px',color:'#39ff14',backgroundColor:'#111111',padding:{x:14,y:14}}).setOrigin(.5).setDepth(100001).setInteractive({useHandCursor:true}));
  const close=()=>{
    if(state.closed) return;
    state.closed=true;
    const data=state.data||{},config=data.evidenceConfig||data.evidence||{};
    const payload={aborted:true,completed:false,errorCode:state.error.code,
      stationId:data.stationId??config.stationId??null,cityId:data.cityId??config.cityId??null,
      caseKey:data.caseKey??config.caseKey??null};
    try {
      if(typeof data.onAbort==='function') safe(()=>data.onAbort(payload));
      safe(()=>scene.events.emit('minigame-closed',{schemaVersion:1,aborted:true,completed:false,payload}));
    } finally {
      scene.scene.stop();
      const lab=scene.scene.manager?.keys?.CrimeLabScene;
      if(lab&&!lab.labCleanupDone&&!lab._cleanupDone) {
        const sameCase=payload.caseKey==null||String(lab.labManager?.getCaseKey?.())===String(payload.caseKey);
        if(sameCase) safe(()=>lab.showToast?.(TEXT.toast,6500));
      }
    }
  };
  const esc=event=>{if(!editable(event)&&!event?.repeat) {event?.preventDefault?.();close();}};
  back.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();close();});
  scene.input.keyboard?.on('keydown-ESC',esc);
  const dispose=()=>{
    scene.input?.keyboard?.off('keydown-ESC',esc);
    for(const o of objects) if(o.scene) o.destroy();
    scene.events.off('shutdown',dispose);scene.events.off('destroy',dispose);
  };
  scene.events.once('shutdown',dispose);scene.events.once('destroy',dispose);
}

// Installed once, only on the concrete CSI keys above. No other scenes change.
// This bridge also covers scenes that do not inherit BaseForensicMinigame.
export function installForensicValidation(scene,config,initializeBase) {
  const key=typeof config==='string'?config:config?.key;
  if(!GUARDED.has(key)||scene._forensicValidationInstalled) return;
  scene._forensicValidationInstalled=true;
  let state=null;
  const originalInit=scene.init,originalCreate=scene.create;
  scene.init=function(data={}) {
    state={data:object(data)?data:{},valid:false,error:null,screen:false,closed:false,createdBase:false,preview:false};
    this._forensicValueInput=data;
    try {
      // Explicit training is not case evidence and never receives a fallback.
      if(key==='ChemicalResidueScene'&&object(data)&&data.preview===true) {
        state.preview=true;state.valid=true;originalInit.call(this,data);return;
      }
      const spec=specification(key,data);
      this._forensicValueNormalizer=spec.normalize;
      const method=typeof this.normalizeCorrectValue==='function'?this.normalizeCorrectValue:normalizeCorrectValue;
      const value=method.call(this,spec.allowed,null);
      state.value=value;state.spec=spec;
      const canonical=canonicalInput(key,data,spec,value);
      originalInit?.call(this,canonical);
      state.valid=true;assertCurrent(this,state);
    } catch(error) { failedInit(this,state,error); }
  };
  scene.create=function(...args) {
    if(!state) {state={data:{},valid:false,closed:false};failedInit(this,state,new ForensicValidationError('CSI_MISSING_VALUE'));}
    if(state.error) {showFailure(this,state,initializeBase);return;}
    try {
      assertCurrent(this,state);
      const result=originalCreate?.apply(this,args);
      state.createdBase=true;
      return result;
    } catch(error) {failedInit(this,state,error);showFailure(this,state,initializeBase);}
  };
  for(const name of ['finishMinigame','returnResultToCrimeLab']) {
    const original=scene[name];
    if(typeof original!=='function') continue;
    scene[name]=function(...args) {
      if(state?.closed) return;
      try {assertCurrent(this,state);} catch(error) {
        failedInit(this,state,error);showFailure(this,state,initializeBase);return;
      }
      return original.apply(this,args);
    };
  }
}
