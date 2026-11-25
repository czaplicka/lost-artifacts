import { getSuspectData } from '../suspects/suspectDataProvider.js';
import { APPEARANCE_OPTIONS } from './AvatarParts.js';
// Portrait-only aliases. Never use this bridge to rewrite forensic evidence.
export const FORENSIC_HAIR_TO_AVATAR=Object.freeze({
  black:'black',brown:'brown','dark brown':'brown','light brown':'brown',brunette:'brown',
  blonde:'blonde',blond:'blonde','dark blonde':'blonde','light blonde':'blonde',
  red:'red',ginger:'red',auburn:'auburn',grey:'grey',gray:'grey','dark grey':'grey','dark gray':'grey',
  white:'white',silver:'white','silver grey':'white','silver gray':'white',teal:'teal',pink:'pink'
});
export function forensicHairAvatarId(value){
  const key=String(value??'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
  return key?FORENSIC_HAIR_TO_AVATAR[key]??null:null;
}
// Texture metadata, not a second list of allowed forensic values.
const STRAND_TEXTURES=Object.freeze({black:'hair_strand_black',brown:'hair_strand_brown',blonde:'hair_strand_blond',
  red:'hair_strand_red',grey:'hair_strand_grey',white:'hair_strand_white',auburn:'hair_strand_auburn'});
export function normalizeForensicHairColor(value){const v=String(value??'').trim().toLowerCase();return v==='blond'?'blonde':v;}
export function rejectHairColor(message,value,code='UNSUPPORTED_FORENSIC_HAIR_COLOR'){
  const error=Error(message);error.code=code;error.invalidValue=value;
  console.error('[HairAnalysisScene]',message,{value},error);throw error;
}
export function getHairColorDefinitions(){
  let data;
  try{data=getSuspectData();}catch(error){return rejectHairColor('The forensic dictionary is not loaded.',null,'INVALID_HAIR_COLOR_DICTIONARY');}
  const raw=data?.forensics?.hairColors;
  if(!Array.isArray(raw)||!raw.length)return rejectHairColor('The forensic hair colour dictionary is empty or invalid.',raw,'INVALID_HAIR_COLOR_DICTIONARY');
  const allowed=raw.map(value=>typeof value==='string'?normalizeForensicHairColor(value):'');
  if(allowed.some(value=>!value)||new Set(allowed).size!==allowed.length)return rejectHairColor('The forensic hair colour dictionary contains empty or duplicate IDs.',raw,'INVALID_HAIR_COLOR_DICTIONARY');
  const palette=APPEARANCE_OPTIONS.hairColor.options;
  for(const id of allowed)if(!palette.some(entry=>entry.id===id)||!STRAND_TEXTURES[id])return rejectHairColor('A dictionary colour has no explicit avatar/sample mapping.',id,'MISSING_HAIR_COLOR_ASSET_MAPPING');
  // Build one shared view without copying the forensic vocabulary into code.
  return palette.map(option=>Object.freeze({id:option.id,label:option.label,tint:option.color,
    forensic:allowed.includes(option.id),strandKey:STRAND_TEXTURES[option.id]||null,
    forensicOrder:allowed.indexOf(option.id)}));
}
export function getForensicHairColorDefinitions(){return getHairColorDefinitions().filter(entry=>entry.forensic).sort((a,b)=>a.forensicOrder-b.forensicOrder);}
export function getForensicHairColors(){return getForensicHairColorDefinitions().map(entry=>entry.id);}
export function assertForensicHairColor(value,definitions=getForensicHairColorDefinitions()){
  const id=normalizeForensicHairColor(value);
  if(!definitions.some(entry=>entry.id===id&&entry.forensic&&entry.strandKey))return rejectHairColor('Unsupported or missing forensic hair colour.',value);
  return id;
}
export function getHairStrandTexture(value,definitions=getForensicHairColorDefinitions()){
  const id=assertForensicHairColor(value,definitions);return definitions.find(entry=>entry.id===id).strandKey;
}
