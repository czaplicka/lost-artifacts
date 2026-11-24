import {getByPath,normalizeString,randomItem,setByPath} from './suspectGeneratorUtils.js';
import {getForensicFieldConfig,getForensicValue,normalizeForensicAttributes,normalizeGenderCode} from './suspectFactory.js';
import {createMaterialProfile,evaluateMaterialEvidence,getMaterialProfiles} from './MaterialEvidence.js';
import {createDustProfile,evaluateDustEvidence,getDustProfiles} from './DustEvidence.js';
const PROFILE_RULES={material_profile:{path:'materialProfile',create:createMaterialProfile,evaluate:evaluateMaterialEvidence,profiles:getMaterialProfiles},dust_profile:{path:'dustProfile',create:createDustProfile,evaluate:evaluateDustEvidence,profiles:getDustProfiles}};
export function normalizeForensicField(field=''){
  const key=String(field).trim(),aliases={hair:'hair_color',hairColor:'hair_color',bloodType:'blood_type',dna_gender:'biological_sex',dna_profile:'biological_sex',biologicalSex:'biological_sex',sex:'biological_sex',gender:'biological_sex',fingerprintPattern:'fingerprint_pattern',shoeSizeCategory:'shoe_size_category',dominantHand:'handedness',eyeColor:'eye_color',eyes:'eye_color'};return aliases[key]||key;
}
export function normalizeForensicValue(field,value){const v=normalizeString(value),f=normalizeForensicField(field);if(f==='biological_sex'){if(['xx','f','female','woman'].includes(v))return'female';if(['xy','m','male','man'].includes(v))return'male';}return f==='hair_color'&&v==='blond'?'blonde':v;}
export function normalizeHardEvidence(hardEvidence=[]){
  if(!Array.isArray(hardEvidence))return[];const config=getForensicFieldConfig();
  return hardEvidence.map(e=>{
    if(!e||typeof e!=='object')return null;
    const field=normalizeForensicField(e.forensicField||e.field||e.attribute||e.key||''),rule=PROFILE_RULES[field],path=rule?.path||config[field]?.path||e.suspectField,raw=e.normalizedValue??e.value??e.expectedValue??e.thief_value??e.correctValue;
    if(!path||raw==null||String(raw).trim()==='')return null;
    const value=normalizeForensicValue(field,raw),meta=rule?{sourceConfirmed:e.sourceConfirmed===true,sourceText:String(e.sourceText||'').trim()}:{};
    if(rule){if(!rule.profiles().some(p=>p.id===value))throw Error(`Unsupported ${field}: ${value}`);if(!meta.sourceConfirmed||!meta.sourceText)throw Error(`${field} needs confirmed offender origin.`);}
    return{id:e.id||field||path,field,forensicField:field,suspectField:path,value,normalizedValue:value,stationId:e.stationId||null,label:e.label||null,clueText:e.clueText||null,...meta,matches:rule?((profile,v)=>rule.evaluate({[rule.path]:profile},{evidenceType:field,correctValue:v,...meta}).status==='compatible'):typeof e.matches==='function'?e.matches:((a,b)=>normalizeForensicValue(field,a)===normalizeForensicValue(field,b))};
  }).filter(Boolean);
}
const absent=value=>value==null||(typeof value==='string'&&!value.trim());
export function evaluateHardEvidence(suspect,hardEvidence=[]){
  const evidence=normalizeHardEvidence(hardEvidence);
  if(!suspect||!evidence.length)return{status:'invalid',results:[],unknownFields:[]};
  const config=getForensicFieldConfig();
  const results=evidence.map(e=>{
    const actual=PROFILE_RULES[e.forensicField]?getByPath(suspect,e.suspectField):config[e.forensicField]?getForensicValue(suspect,e.forensicField,undefined):getByPath(suspect,e.suspectField);
    return{field:e.forensicField,status:absent(actual)?'unknown':e.matches(actual,e.normalizedValue)?'match':'mismatch'};
  });
  const unknownFields=[...new Set(results.filter(r=>r.status==='unknown').map(r=>r.field))];
  return{status:results.some(r=>r.status==='mismatch')?'mismatch':unknownFields.length?'incomplete':'match',results,unknownFields};
}
// A candidate survives unless KNOWN evidence rules them out. Incomplete is not a proven match.
export function matchesAllHardEvidence(suspect,hardEvidence=[]){const{status}=evaluateHardEvidence(suspect,hardEvidence);return status==='match'||status==='incomplete';}
function assertCompleteCandidates(suspects,hardEvidence){
  if(suspects.some(s=>evaluateHardEvidence(s,hardEvidence).unknownFields.length)){
    const error=Error('Forensic candidate validation requires complete attributes; a saved or generated candidate contains unknown values.');error.code='INCOMPLETE_FORENSIC_CANDIDATES';throw error;
  }
}
export function getAlternativeForensicValue(field,forbiddenValue){const f=normalizeForensicField(field),values=getForensicFieldConfig()[f]?.values;return Array.isArray(values)?randomItem(values.filter(v=>normalizeForensicValue(f,v)!==normalizeForensicValue(f,forbiddenValue))):null;}
export function applyHardEvidenceToSuspect(suspect,hardEvidence=[]){
  const config=getForensicFieldConfig();normalizeHardEvidence(hardEvidence).forEach(e=>{const rule=PROFILE_RULES[e.forensicField];if(rule){if(suspect[rule.path]&&!e.matches(suspect[rule.path],e.normalizedValue))throw Error(`Existing ${rule.path} conflicts with generation.`);suspect[rule.path]??=rule.create(e.normalizedValue,{compatible:true});return;}if(!config[e.forensicField])throw Error(`Unsupported forensic field: ${e.forensicField}`);setByPath(suspect,e.suspectField,e.normalizedValue);});return suspect;
}
export function forceSuspectToFailHardEvidence(suspect,hardEvidence=[],preferredFailureIndex=0){
  const evidence=normalizeHardEvidence(hardEvidence);if(!evidence.length)return suspect;
  const e=evidence[((preferredFailureIndex%evidence.length)+evidence.length)%evidence.length],rule=PROFILE_RULES[e.forensicField];if(rule){suspect[rule.path]=rule.create(e.normalizedValue,{compatible:false});return suspect;}
  const alt=getAlternativeForensicValue(e.forensicField,e.normalizedValue);if(alt==null)throw Error(`No alternative value for ${e.forensicField}`);setByPath(suspect,e.suspectField,normalizeForensicValue(e.forensicField,alt));return suspect;
}
export function getDefaultHardEvidenceFromThief(thief={}){const a=normalizeForensicAttributes(thief,normalizeGenderCode(thief.gender_code||thief.genderCode||thief.gender));return[{field:'hair_color',value:a.hair_color.value,stationId:'identity'},{field:'shoe_size_category',value:a.shoe_size_category.value,stationId:'trace_0'},{field:'handedness',value:a.handedness.value,stationId:'trace_1'}];}
export function validateExactlyTwoForensicCandidates(suspects,hardEvidence){
  assertCompleteCandidates(suspects,hardEvidence);const survivors=suspects.filter(s=>matchesAllHardEvidence(s,hardEvidence));if(survivors.length!==2)throw Error(`Expected two forensic candidates; received ${survivors.length}.`);
  const thieves=survivors.filter(s=>s.isRealThief===true),twins=survivors.filter(s=>s.isRealThief===false);if(thieves.length!==1||twins.length!==1)throw Error('Final candidates must contain one thief and one twin.');return{survivors,realThiefCaseSuspect:thieves[0],forensicTwin:twins[0]};
}
export function validateProgressiveForensicCandidates(suspects,hardEvidence,expectedCounts){
  const evidence=normalizeHardEvidence(hardEvidence);assertCompleteCandidates(suspects,evidence);
  return evidence.map((e,i)=>{const survivors=suspects.filter(s=>matchesAllHardEvidence(s,evidence.slice(0,i+1)));if(survivors.length!==expectedCounts[i])throw Error(`Stage ${i+1} (${e.forensicField}): expected ${expectedCounts[i]}, got ${survivors.length}.`);return{stage:i+1,field:e.forensicField,survivors:survivors.length};});
}
