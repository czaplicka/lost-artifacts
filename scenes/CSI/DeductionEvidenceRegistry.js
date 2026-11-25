import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { normalizeForensicValue } from '../../suspects/forensicEvidence.js';
import { evaluateMaterialEvidence, getMaterialProfiles, getMaterialDossierNotes } from '../../suspects/MaterialEvidence.js';
import { evaluateDustEvidence, getDustProfiles, getDustHobbyLabels } from '../../suspects/DustEvidence.js';

const text=key=>__dialogueText('scenes/CSI/DeductionEvidenceRegistry.js',key);
const normalizeText=value=>String(value??'').trim().toLowerCase().replace(/\s+/g,' ');
const hasValue=value=>value!==undefined&&value!==null&&String(value).trim()!=='';
const readableIdentifier=value=>String(value??'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();

function readEvidenceValue(raw) {
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
    return raw.correctValue??raw.thief_value??raw.normalizedValue??raw.value??raw.result??raw.selectedValue??
      raw.evidenceConfig?.correctValue??raw.evidence?.correctValue??null;
  }
  return raw;
}
function explicitFlag(objects,key) {
  // An explicit false or empty source on the outer record remains authoritative.
  for(const object of objects)if(object&&Object.prototype.hasOwnProperty.call(object,key))return object[key];
  return undefined;
}
function scalarEntry({field,path,labelKey,clueKeys=[],eliminateKeys=[]}) {
  const normalize=value=>normalizeForensicValue(field,value);
  return {
    role:'hard_filter',
    suspectField:path,
    get label(){return text(labelKey);},
    normalizeEvidence:normalize,
    matches:(suspectValue,evidenceValue)=>{
      if(!hasValue(suspectValue)||!hasValue(evidenceValue))return false;
      // Identical scalar semantics to normalizeHardEvidence's default matcher.
      // Generation dictionaries do not define a second UI exclusion rule.
      return normalize(suspectValue)===normalize(evidenceValue);
    },
    get clueTemplates(){return clueKeys.map(text);},
    get eliminateTemplates(){return eliminateKeys.map(text);}
  };
}
function makeProfileEntry({field,path,labelKey,profiles,evaluator,notes}) {
  const normalizeEvidence=raw=>normalizeText(readEvidenceValue(raw));
  const findProfile=raw=>profiles().find(profile=>profile.id===normalizeEvidence(raw))||null;
  const evaluate=(suspectValue,evidenceValue,context={})=>{
    const raw=evidenceValue&&typeof evidenceValue==='object'?evidenceValue:{};
    const metadata=context&&typeof context==='object'?context:{};
    const id=normalizeEvidence(evidenceValue);
    if(!findProfile(id))return {status:'unknown',reasonCode:'unknown_evidence_profile'};
    const objects=[raw,metadata,raw.evidenceConfig,raw.evidence,metadata.evidenceConfig,metadata.evidence];
    const sourceConfirmed=explicitFlag(objects,'sourceConfirmed')===true;
    const sourceText=String(explicitFlag(objects,'sourceText')??'').trim();
    const suspect=suspectValue&&typeof suspectValue==='object'&&Object.prototype.hasOwnProperty.call(suspectValue,path)?suspectValue:{[path]:suspectValue};
    return evaluator(suspect,{evidenceType:field,correctValue:id,sourceConfirmed,sourceText});
  };
  return {
    role:'hard_filter',suspectField:path,comparisonType:'profile_rule',requiresConfirmedOrigin:true,
    get label(){return text(labelKey);},
    normalizeEvidence,evaluate,
    // Preserve the existing three-state profile contract.
    matches:(suspectValue,evidenceValue,context={})=>{
      const result=evaluate(suspectValue,evidenceValue,context);
      if(result.status==='compatible')return true;
      if(result.status==='incompatible')return false;
      return null;
    },
    formatEvidence:raw=>findProfile(raw)?.label||readableIdentifier(readEvidenceValue(raw))||text('t_b764cdc0eab713746721'),
    formatSuspect:value=>{
      const suspect=value&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,path)?value:{[path]:value};
      return notes(suspect).join('; ');
    },
    extract:raw=>{
      const profile=findProfile(raw);
      return {value:profile?.label||readableIdentifier(readEvidenceValue(raw))||text('t_b764cdc0eab713746721'),
        profileId:normalizeEvidence(raw),label:profile?.label||text('t_b764cdc0eab713746721'),description:profile?.report||profile?.labText||''};
    },
    get clueTemplates(){return [text('t_1769d50566a63f648b71')];},
    eliminateTemplates:[]
  };
}
const DNA_PROFILE_EVIDENCE=scalarEntry({
  field:'biological_sex',path:'restrictedProfile.forensicAttributes.biological_sex.value',labelKey:'t_bf6e9d9b603476cab4da',
  clueKeys:['t_e50068fd90a587613724','t_52a411a166ff3542a988','t_cedabca795054720507c'],
  eliminateKeys:['t_c25536441e7cb1d04a68','t_613e5c2b2ea390a3400d','t_9cc65314121c3cc17211']
});
const DUST_EVIDENCE=makeProfileEntry({
  field:'dust_profile',path:'dustProfile',labelKey:'t_18213d067a58bdb27f29',
  profiles:getDustProfiles,evaluator:evaluateDustEvidence,notes:getDustHobbyLabels
});
const MATERIAL_EVIDENCE=makeProfileEntry({
  field:'material_profile',path:'materialProfile',labelKey:'t_417cac3597812e93560c',
  profiles:getMaterialProfiles,evaluator:evaluateMaterialEvidence,
  notes:suspect=>getMaterialDossierNotes(suspect).map(note=>note.text)
});
const PARTIAL_FINGERPRINT_EVIDENCE={
  role:'red_herring',
  get label(){return text('t_07613e0a54679cc6d02d');},
  get clueTemplates(){return ['t_cf6b2e25c8b98a7ca123','t_e0fcdc43b2c6676284b1','t_c804e985af2ce06e73fe'].map(text);}
};

export const DEDUCTION_EVIDENCE_REGISTRY={
  hair_color:scalarEntry({
    field:'hair_color',path:'restrictedProfile.forensicAttributes.hair_color.value',labelKey:'t_9be86624f7f43b815b19',
    clueKeys:['t_78ec0c8c1218d39ef9ed','t_11e6d95623901af7dc7c','t_330cf8df6426fbdd640c'],
    eliminateKeys:['t_2af7028904e113e7e46e','t_0e626f6a4bdb5d1653b1','t_db64a65670f8bf3d9bac']
  }),
  blood_type:scalarEntry({
    field:'blood_type',path:'restrictedProfile.forensicAttributes.blood_type.value',labelKey:'t_95d92096f95755553f37',
    clueKeys:['t_5b816ac554cc586cc982','t_3c18c9065627f7709e57','t_c9c4aed10c9a0e6cb422'],
    eliminateKeys:['t_abb11b5eea97428c661a','t_6b5595807cb723e11dc4','t_f0e22b68aade1de3f8d9']
  }),
  biological_sex:DNA_PROFILE_EVIDENCE,
  dna_gender:DNA_PROFILE_EVIDENCE,
  dna_profile:DNA_PROFILE_EVIDENCE,
  fingerprint_pattern:scalarEntry({
    field:'fingerprint_pattern',path:'restrictedProfile.forensicAttributes.fingerprint_pattern.value',labelKey:'t_0de0d411a6eb00eb2a5a',
    clueKeys:['t_b079b5f2631ba0e8bb3f','t_889d3daf186243268f04','t_07d55f41a6fedca5c32e'],
    eliminateKeys:['t_fe2048ab1ef780fd0e55','t_81192af7a948800018a4','t_62464e124c88a7b4e468']
  }),
  shoe_size_category:scalarEntry({
    field:'shoe_size_category',path:'restrictedProfile.forensicAttributes.shoe_size_category.value',labelKey:'t_3e123d9791e7963a31ef',
    clueKeys:['t_bb283c6e9b877173c09c','t_b40d9cfcfd46b7a9ec12','t_cac2ffdabcf2ed84beac'],
    eliminateKeys:['t_acbbfda3d11c93a8dffa','t_56a26e59a31c44899ab0','t_06114432a8a72bdbf7fa']
  }),
  handedness:scalarEntry({
    field:'handedness',path:'restrictedProfile.forensicAttributes.handedness.value',labelKey:'t_ff71f64490560b300afa',
    clueKeys:['t_c7907bb7c7fde5f11824','t_52829fc1c3f787d61af0','t_9983ae133ac748a8be38'],
    eliminateKeys:['t_3c96a56a9322e53a67b9','t_dcca25bca8899315370f','t_8c8de00c639807c94492']
  }),
  dust_profile:DUST_EVIDENCE,
  dustProfile:DUST_EVIDENCE,
  microtrace:DUST_EVIDENCE,
  microtrace_profile:DUST_EVIDENCE,
  material_profile:MATERIAL_EVIDENCE,
  materialProfile:MATERIAL_EVIDENCE,
  // Legacy fibers remain descriptive, not a hard exclusion rule.
  fiber_profile:{
    role:'soft_clue',
    get label(){return text('t_c734a6f0b9822dccce03');},
    normalizeEvidence:normalizeText,
    extract:raw=>{
      const value=normalizeText(readEvidenceValue(raw));
      const parts=value.replace(/_fib(?:er|re)$/i,'').split('_').filter(Boolean),paired=parts.length===2;
      return {value:readableIdentifier(value)||text('t_b764cdc0eab713746721'),color:paired?parts[0]:'',material:paired?parts[1]:''};
    },
    get clueTemplates(){return [text('t_c721d2b3e77f6b512de9')];},
    redHerringTemplates:[]
  },
  fingerprint:PARTIAL_FINGERPRINT_EVIDENCE,
  fingerprint_partial:PARTIAL_FINGERPRINT_EVIDENCE,
  partial_fingerprint:PARTIAL_FINGERPRINT_EVIDENCE,
  toolmark:{
    role:'future_filter',
    get label(){return text('t_b46e5080f8d11be5adcc');},
    get clueTemplates(){return ['t_1d88d5187698b05fc105','t_7469825a052f0b3f0045'].map(text);}
  }
};
