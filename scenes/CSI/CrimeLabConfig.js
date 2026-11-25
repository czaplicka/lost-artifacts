import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
// Routing only. CrimeLabManager owns assignments, random draws and save recovery.
const text=key=>__dialogueText('scenes/CSI/CrimeLabConfig.js',key);

export const CSI_RED_HERRING_POOL=[{
  id:'partial_fingerprint',
  get label(){return text('t_1df64eb7359dfe940978');},
  minigame:'FingerprintScene',evidenceType:'fingerprint_partial',correctValue:'partial_loop_left_thumb',
  clueType:'red_herring',
  get clueText(){return text('t_fc57e6dcb0a29fa12566');},
  isRedHerring:true
}];
export const CSI_TRACE_GAME_POOL=CSI_RED_HERRING_POOL;
export const CSI_MAIN_GAME_POOL=[
  {id:'hair_color',get label(){return text('t_c943f251b85d757b582c');},minigame:'HairAnalysisScene',evidenceType:'hair_color',clueType:'main',isRedHerring:false},
  {id:'blood_type',get label(){return text('t_ef10c0dcf9b965982d52');},minigame:'BloodAnalysisScene',evidenceType:'blood_type',clueType:'main',isRedHerring:false},
  {id:'dna_gender',get label(){return text('t_1bbdb2638974e4dcec07');},minigame:'DnaGenderScene',evidenceType:'dna_gender',clueType:'main',isRedHerring:false},
  {id:'fingerprint_pattern',get label(){return text('t_f42249b5be34c92f262b');},minigame:'FingerprintPatternScene',evidenceType:'fingerprint_pattern',clueType:'main',isRedHerring:false}
];
export const CSI_DUST_ANALYSIS_VARIANTS=[
  {minigame:'ToolmarkAnalysisScene',get label(){return text('t_8a1b0a09e53e7085462e');}},
  {minigame:'ChemicalResidueScene',get label(){return text('t_ce259d2d314b28f4a169');}}
];

const RETIRED_TYPES=new Set(['toolmark','toolmarks','tool_mark','toolmark_analysis','toolmark_profile',
  'skill','skills','primary_skill','primaryskill','skill_analysis']);
const DUST_TYPES=new Set(['dust','dust_profile','dustprofile','microtrace','microtrace_profile','microtrace_analysis']);
const DUST_SCENES=new Set(['ToolmarkAnalysisScene','ChemicalResidueScene']);
const token=value=>typeof value==='string'?value.trim().toLowerCase():'';
const REGISTRATIONS=[
  ['HairAnalysisScene',['hair','hair_color','hair_analysis','HairAnalysisScene']],
  ['BloodAnalysisScene',['blood','blood_type','bloodtype','blood_analysis','BloodAnalysisScene']],
  ['DnaGenderScene',['dna','dna_gender','dna_profile','dna_analysis','DnaGenderScene','gender_profile','biological_sex','biologicalSex']],
  ['FingerprintPatternScene',['fingerprint','fingerprints','fingerprint_pattern','fingerprint_scene','FingerprintPatternScene','ridge_pattern']],
  ['FingerprintScene',['FingerprintScene','fingerprint_partial','partial_fingerprint']],
  ['ShoeprintScene',['shoeprint','shoe_print','ShoeprintScene','shoeprint_profile','shoe_size','shoe_size_category','shoeSizeCategory']],
  ['ToolmarkAnalysisScene',['handedness','dominant_hand','dominantHand','ToolmarkAnalysisScene','dust','dust_profile','dustProfile','microtrace','microtrace_profile','microtrace_analysis']],
  ['ChemicalResidueScene',['ChemicalResidueScene','chemical_residue','chemical_residue_analysis','chemical_analysis']],
  ['MaterialAnalysisScene',['material','material_profile','materialProfile','material_analysis','MaterialAnalysisScene']],
  ['FiberAnalysisScene',['fiber','fibre','fiber_analysis','FiberAnalysisScene','fiber_profile','fiberProfile','fabric_material','fabricMaterial']]
];

// Exported so aliases can be validated in isolated tests without mutating the
// production router. Registering the same alias for the same scene is idempotent.
export function createCsiMiniGameRouter(registrations=REGISTRATIONS) {
  const aliases=new Map(),canonical=new Map(),blocked=new Set(),diagnostics=[];
  const diagnostic=(code,alias,scenes=[])=>diagnostics.push({code,alias,scenes:[...scenes]});
  if(!Array.isArray(registrations)){
    diagnostic('invalid_registrations','');registrations=[];
  }
  const valid=[];
  // Canonical scene keys are protected against aliases from other scenes.
  for(const registration of registrations){
    if(!Array.isArray(registration)||registration.length!==2){diagnostic('invalid_registration','');continue;}
    const [scene,sceneAliases]=registration;
    if(typeof scene!=='string'||!scene.trim()||!Array.isArray(sceneAliases)){
      diagnostic('invalid_registration',typeof scene==='string'?scene:'');continue;
    }
    const sceneKey=scene.trim(),key=token(sceneKey);
    const previous=canonical.get(key);
    if(previous&&previous!==sceneKey){
      canonical.delete(key);blocked.add(key);diagnostic('conflicting_scene_key',key,[previous,sceneKey]);continue;
    }
    if(blocked.has(key)){diagnostic('blocked_scene_key',key,[sceneKey]);continue;}
    canonical.set(key,sceneKey);valid.push([sceneKey,sceneAliases]);
  }
  for(const [sceneKey,sceneAliases]of valid){
    if(canonical.get(token(sceneKey))!==sceneKey)continue;
    for(const alias of sceneAliases){
      const key=token(alias);
      if(!key){diagnostic('invalid_alias','',[sceneKey]);continue;}
      const official=canonical.get(key);
      if(official){
        if(official!==sceneKey)diagnostic('canonical_key_collision',key,[official,sceneKey]);
        continue;
      }
      if(blocked.has(key)){diagnostic('blocked_alias',key,[sceneKey]);continue;}
      const previous=aliases.get(key);
      if(previous&&previous!==sceneKey){
        aliases.delete(key);blocked.add(key);diagnostic('conflicting_alias',key,[previous,sceneKey]);continue;
      }
      aliases.set(key,sceneKey);
    }
  }
  const lookup=key=>blocked.has(key)?null:canonical.get(key)||aliases.get(key)||null;
  const resolve=(rawKey,evidenceType='')=>{
    const key=token(rawKey),type=token(evidenceType);
    if(RETIRED_TYPES.has(type)||(!type&&RETIRED_TYPES.has(key)))return {ok:false,sceneKey:null,reason:'retired_evidence_type'};
    if((type&&blocked.has(type))||(!type&&blocked.has(key)))return {ok:false,sceneKey:null,reason:'conflicting_alias'};
    const explicit=lookup(key);
    if(type){
      const semantic=lookup(type);
      // A known scene is not enough when the evidence itself is unsupported.
      if(!semantic)return {ok:false,sceneKey:null,reason:'unsupported_evidence_type'};
      if(DUST_TYPES.has(type)&&explicit&&DUST_SCENES.has(explicit))return {ok:true,sceneKey:explicit,reason:null};
      return {ok:true,sceneKey:semantic,reason:null};
    }
    return explicit?{ok:true,sceneKey:explicit,reason:null}:{ok:false,sceneKey:null,reason:key?'unknown_minigame':'missing_minigame'};
  };
  return Object.freeze({
    resolve,
    normalize:(rawKey,evidenceType='')=>resolve(rawKey,evidenceType).sceneKey,
    getDiagnostics:()=>diagnostics.map(item=>({...item,scenes:[...item.scenes]}))
  });
}
const ROUTER=createCsiMiniGameRouter();
for(const diagnostic of ROUTER.getDiagnostics()){
  console.error('[CrimeLabConfig] Invalid CSI routing registration:',diagnostic);
}
export function getMiniGameRoutingDiagnostics(){return ROUTER.getDiagnostics();}
export function resolveMiniGameRoute(rawKey,evidenceType=''){return ROUTER.resolve(rawKey,evidenceType);}
export function normalizeMiniGameKey(rawKey,evidenceType=''){return ROUTER.normalize(rawKey,evidenceType);}
