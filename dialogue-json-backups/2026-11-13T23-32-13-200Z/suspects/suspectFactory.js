import {getSuspectData} from './suspectDataProvider.js';
import {capitalize,createId,normalizeString,randomItem,safeClone,shuffle} from './suspectGeneratorUtils.js';
import {getSuspectFileNotes} from './SuspectFileNotes.js';

function data(){return getSuspectData();}
const ALIASES={
  hair_color:['hair_color','hairColor','hair'],eye_color:['eye_color','eyeColor','eyes'],
  blood_type:['blood_type','bloodType'],biological_sex:['biological_sex','biologicalSex','sex','dna_gender','dna_profile'],
  shoe_size_category:['shoe_size_category','shoeSizeCategory'],handedness:['handedness','dominantHand','dominant_hand'],
  fingerprint_pattern:['fingerprint_pattern','fingerprintPattern']
};
function canonicalField(field){for(const[key,aliases]of Object.entries(ALIASES))if(aliases.includes(field))return key;return field;}
function scalarEntry(value){return value&&typeof value==='object'&&!Array.isArray(value)?value.value:value;}
function present(value){return value!==undefined&&value!==null&&value!=='';}
function normalizeDna(value){const v=normalizeString(value);if(['xx','f','female','woman'].includes(v))return'female';if(['xy','m','male','man'].includes(v))return'male';return v;}
function stringList(value){return [...new Set((Array.isArray(value)?value:typeof value==='string'?value.split(','):[]).filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))];}
export function getGenderCode(){const r=Math.random();return r<.46?'female':r<.92?'male':'nb';}
export function normalizeGenderCode(value){const v=normalizeString(value);return['female','f','woman'].includes(v)?'female':['male','m','man'].includes(v)?'male':'nb';}
export function getBiologicalSex(genderCode){return genderCode==='female'?'female':genderCode==='male'?'male':Math.random()<.5?'female':'male';}
export function createFullName(genderCode){const d=data();return`${randomItem(d.firstNames[genderCode]||d.firstNames.nb)} ${randomItem(d.lastNames)}`;}
function weightedFingerprintPattern(){const r=Math.random();return r<.65?'LOOP':r<.95?'WHORL':'ARCH';}
export function getForensicValue(source,field,fallback){
  const canonical=canonicalField(field),keys=ALIASES[canonical]||[field];
  for(const container of[source?.restrictedProfile?.forensicAttributes,source?.forensicAttributes,source]){
    for(const key of keys){const value=scalarEntry(container?.[key]);if(present(value))return value;}
  }return fallback;
}
export function normalizeForensicAttributes(source={},genderCode='nb',{preserveCaseProgress=false}={}){
  const f=data().forensics;
  const definitions={
    hair_color:{fallback:()=>randomItem(f.hairColors),normalize:v=>{const s=normalizeString(v);return s==='blond'?'blonde':s;}},
    eye_color:{fallback:()=>randomItem(f.eyeColors),normalize:normalizeString},
    blood_type:{fallback:()=>randomItem(f.bloodTypes),normalize:v=>String(v).trim().toUpperCase()},
    biological_sex:{fallback:()=>getBiologicalSex(genderCode),normalize:normalizeDna},
    shoe_size_category:{fallback:()=>randomItem(f.shoeSizeCategories),normalize:normalizeString},
    handedness:{fallback:()=>randomItem(f.handedness),normalize:v=>normalizeString(v).replace(/[-_ ]handed$/,'')},
    fingerprint_pattern:{fallback:weightedFingerprintPattern,normalize:v=>String(v).trim().toUpperCase()}
  };
  const result={};
  if(preserveCaseProgress)for(const[key,entry]of Object.entries(source.restrictedProfile?.forensicAttributes||{})){
    if(!Object.hasOwn(definitions,canonicalField(key)))result[key]=safeClone(entry);
  }
  for(const[field,definition]of Object.entries(definitions)){
    let value=getForensicValue(source,field,undefined);
    if(!present(value))value=preserveCaseProgress?null:definition.fallback();
    let previous=null;
    for(const key of ALIASES[field]){
      const entry=source.restrictedProfile?.forensicAttributes?.[key];
      if(entry&&typeof entry==='object'&&!Array.isArray(entry)){previous=entry;break;}
    }
    result[field]={...(preserveCaseProgress&&previous?safeClone(previous):{}),value:value==null?null:definition.normalize(value),unlocked:preserveCaseProgress&&previous?.unlocked===true};
  }return result;
}
export function createVisibleTraits(forensicAttributes,existingTraits=[]){
  const hair=forensicAttributes?.hair_color?.value||'brown';
  const candidates=shuffle([...(Array.isArray(existingTraits)?existingTraits:[]),`${capitalize(hair)} hair`,...(data().visualTraits||[])]);
  const used=new Set(),traits=[];
  for(const trait of candidates){
    if(typeof trait!=='string'||!trait.trim())continue;
    const key=trait.trim().toLowerCase();if(used.has(key))continue;used.add(key);traits.push(trait.trim());
  }return traits.slice(0,2);
}
export function createDeductionState(existingState={}, {preserveCaseProgress=false}={}){
  const fresh={eliminated:false,eliminationReasons:[],evidenceMismatches:[],notesUnlocked:[],labStatus:'pending',hypothesisStatus:'pending',interviewStatus:'pending',alibiStatus:'pending'};
  if(!preserveCaseProgress)return fresh;
  const result={...fresh,...safeClone(existingState||{}),eliminated:existingState?.eliminated===true};
  for(const key of['eliminationReasons','evidenceMismatches','notesUnlocked'])result[key]=Array.isArray(existingState?.[key])?safeClone(existingState[key]):[];
  return result;
}
export function resetDeductionState(suspect){if(suspect&&typeof suspect==='object')suspect.deductionState=createDeductionState();return suspect;}
export function resetAllSuspectDeductionStates(suspects=[]){if(!Array.isArray(suspects))return[];suspects.forEach(resetDeductionState);return suspects;}

// Copying an authored person preserves personal profiles by default.
// Procedural case generation must explicitly request preservePersonalProfiles:false.
// Progress preservation remains a separate option and does not reroll missing fields.
export function createDecoySuspect(index=0,source={}, {
  preserveCaseProgress=false,preservePersonalProfiles=true
}={}){
  const genderCode=normalizeGenderCode(source.gender_code||source.genderCode||source.gender||source.publicProfile?.genderCode||(preserveCaseProgress?'nb':getGenderCode()));
  const name=source.name||source.displayName||source.publicProfile?.displayName||(preserveCaseProgress?'Unknown Suspect':createFullName(genderCode));
  const occupation=source.occupation||source.role||source.publicProfile?.occupation||(preserveCaseProgress?'Unknown occupation':randomItem(data().occupations));
  const forensicAttributes=normalizeForensicAttributes(source,genderCode,{preserveCaseProgress});
  const notes=getSuspectFileNotes(source);
  const visibleTraits=preserveCaseProgress?[...notes.visible]:createVisibleTraits(forensicAttributes,notes.visible);
  if(preserveCaseProgress&&!source.id)throw new Error('A saved suspect must have a stable ID.');
  const suspect={
    id:source.id||createId(`suspect_${index+1}`),type:'suspect',isRealThief:Boolean(source.isRealThief),
    name,occupation,genderCode,
    publicProfile:{displayName:name,occupation,genderCode,visibleTraits,
      caseConnection:preserveCaseProgress?(source.caseConnection??source.publicProfile?.caseConnection??''):
        source.caseConnection||source.publicProfile?.caseConnection||randomItem(data().caseConnections)},
    restrictedProfile:{unlockedFields:preserveCaseProgress&&Array.isArray(source.restrictedProfile?.unlockedFields)
      ?[...new Set(source.restrictedProfile.unlockedFields.map(v=>typeof v==='string'?canonicalField(v):safeClone(v)))]:[],forensicAttributes},
    skills:stringList(source.skills??source.restrictedProfile?.forensicAttributes?.skills?.value),habitus:stringList(source.habitus),
    deductionState:createDeductionState(source.deductionState,{preserveCaseProgress}),
    hiddenIdentity:source.hiddenIdentity?safeClone(source.hiddenIdentity):null
  };
  if(preserveCaseProgress)for(const key of['hiddenCaseData','hiddenProfile','attributes','portraitKey','suspectImageKey','wantedKey']){
    if(source[key]!==undefined)suspect[key]=safeClone(source[key]);
  }
  if(preservePersonalProfiles){
    for(const key of['dustProfile','materialProfile'])if(source[key]!=null)suspect[key]=safeClone(source[key]);
    if(source.materialProfile==null&&notes.personal.length)suspect.publicProfile.personalNotes=[...notes.personal];
    if(source.dustProfile==null&&notes.hobbies.length)suspect.publicProfile.hobbies=[...notes.hobbies];
  }
  return suspect;
}
export function ensureUniqueNames(suspects=[]){
  const used=new Set();
  suspects.forEach((suspect,index)=>{
    let name=String(suspect.name||createFullName(suspect.genderCode)),attempts=0;
    while(used.has(name.toLowerCase())&&attempts++<30)name=createFullName(suspect.genderCode);
    const base=name;let suffix=2;while(used.has(name.toLowerCase()))name=`${base} ${suffix++}`;
    suspect.name=name;suspect.publicProfile??={};suspect.publicProfile.displayName=name;used.add(name.toLowerCase());
  });return suspects;
}
export function getForensicFieldConfig(){
  const f=data().forensics;
  return{
    hair_color:{values:f.hairColors,path:'restrictedProfile.forensicAttributes.hair_color.value'},
    eye_color:{values:f.eyeColors,path:'restrictedProfile.forensicAttributes.eye_color.value'},
    blood_type:{values:f.bloodTypes,path:'restrictedProfile.forensicAttributes.blood_type.value'},
    biological_sex:{values:['female','male'],path:'restrictedProfile.forensicAttributes.biological_sex.value'},
    shoe_size_category:{values:f.shoeSizeCategories,path:'restrictedProfile.forensicAttributes.shoe_size_category.value'},
    handedness:{values:f.handedness,path:'restrictedProfile.forensicAttributes.handedness.value'},
    fingerprint_pattern:{values:f.fingerprintPatterns||['LOOP','WHORL','ARCH'],path:'restrictedProfile.forensicAttributes.fingerprint_pattern.value'}
  };
}
export function ensureUniqueIds(suspects=[]){
  const used=new Set();
  suspects.forEach((suspect,index)=>{
    let id=suspect.id||createId(`suspect_${index+1}`),attempts=0;
    while(used.has(id)&&attempts++<30)id=createId(`suspect_${index+1}`);
    const base=id;let suffix=2;while(used.has(id))id=`${base}_${suffix++}`;
    suspect.id=id;used.add(id);
  });return suspects;
}
