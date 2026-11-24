import { loadJson } from '../config/loadJson.js';
import { avatarManager } from '../managers/AvatarManager.js';
import { APPEARANCE_OPTIONS, normalizeAppearance, findOption } from '../config/AvatarParts.js';
import { forensicHairAvatarId } from '../config/ForensicHairColors.js';
export { avatarManager };
export const PERSONNEL_TEXT={};
const contexts=new WeakMap();
let textReady=false,loading=null;
export function personnelReady(){return textReady&&avatarManager.isOptionAvailable('faceShape','oval');}
export function rememberPersonnelContext(roster,state,suspects){contexts.set(roster,{state,suspects});return roster;}
export function personnelContext(roster){return contexts.get(roster);}
export function recoveryRoster(state,suspects,error=null){
  return rememberPersonnelContext({recovery:true,loading:!error,errorMessage:error?.message||'',people:[],statements:[],targetIds:[],excludedIds:[],completed:false},state,suspects);
}
export async function preparePersonnel(scene,{retry=false}={}){
  if(!loading)loading=Promise.all([
    loadJson('../assets/data/personnelWitnesses.json',import.meta.url),
    loadJson('../assets/data/suspectData.json',import.meta.url)
  ]).then(([text,data])=>{
    if(!text?.ui||!text?.jobs||!text?.help)throw Error('Personnel text data is incomplete.');
    for(const raw of data?.forensics?.hairColors||[]){const id=forensicHairAvatarId(raw);if(!id||!findOption('hairColor',id))throw Error(`Hair palette mapping is missing: ${raw}`);}
    Object.assign(PERSONNEL_TEXT,text);textReady=true;
  }).catch(error=>{loading=null;throw error;});
  await loading;
  if(!avatarManager.isSceneUsable(scene))return false;
  if(retry)avatarManager.failed.clear();
  const result=await avatarManager.ensureLoaded(scene);
  if(result.cancelled||!avatarManager.isSceneUsable(scene))return false;
  if(!personnelReady())throw Error('The base portrait is unavailable. Retry loading the portrait graphics.');
  return true;
}
export function availablePersonnelOptions(category){return(APPEARANCE_OPTIONS[category]?.options||[]).filter(o=>avatarManager.isOptionAvailable(category,o.id));}
const eyewear=o=>o.art.some(layer=>layer.slot==='eyewear');
export function hasPersonnelGlasses(a){const o=findOption('accessory',a.accessory);return Boolean(o&&eyewear(o));}
export function hasPersonnelTattoo(a){const o=findOption('tattoos',a.tattoos);return Boolean(o&&o.id!=='none'&&o.art.length);}
export function personnelVisualClues(){
  const result=['floor'];
  if(availablePersonnelOptions('accessory').some(o=>['glasses','red-glasses'].includes(o.id)&&eyewear(o)))result.push('glasses');
  if(availablePersonnelOptions('tattoos').some(o=>o.id!=='none'&&o.art.length))result.push('tattoo');
  return result;
}
export function normalizePersonnelAppearance(input){
  const a=normalizeAppearance(input);
  for(const category of Object.keys(APPEARANCE_OPTIONS)){
    if(avatarManager.isOptionAvailable(category,a[category]))continue;
    const options=availablePersonnelOptions(category),fallback=options.find(o=>o.id==='none')||options[0];
    if(!fallback)throw Error(`No portrait graphics are available for ${category}.`);a[category]=fallback.id;
  }
  return a;
}
function signature(appearance){
  const canvas=avatarManager.compose(appearance,{height:160,background:'#efe4c8'});
  if(!canvas)throw Error('The portrait could not be composed.');
  return canvas.toDataURL('image/png');
}
export function personnelPortraitSignature(appearance){return signature(normalizePersonnelAppearance(appearance));}
const pick=a=>a[Math.floor(Math.random()*a.length)];
export function personnelLooks(source,primary,active,used){
  const entry=source?.restrictedProfile?.forensicAttributes?.hair_color;
  const raw=entry?.value??entry??source?.hair??'';
  const hair=forensicHairAvatarId(raw);
  if(String(raw).trim()&&!hair)throw Error(`The forensic hair colour needs a palette mapping: ${raw}`);
  if(hair&&!avatarManager.isOptionAvailable('hairColor',hair))throw Error(`The required hair palette is unavailable: ${raw}`);
  for(let attempt=0;attempt<1000;attempt++){
    const a={};
    for(const category of Object.keys(APPEARANCE_OPTIONS)){
      let options=availablePersonnelOptions(category);
      if(category==='headwear'||category==='marks')options=options.filter(o=>o.id==='none');
      if(category==='hairStyle')options=options.filter(o=>o.art.some(layer=>layer.tint==='hair'));
      if(category==='accessory'&&active.includes('glasses'))options=primary==='glasses'?options.filter(o=>['glasses','red-glasses'].includes(o.id)&&eyewear(o)):options.filter(o=>!eyewear(o));
      if(category==='tattoos'&&active.includes('tattoo'))options=options.filter(o=>primary==='tattoo'?o.id!=='none'&&o.art.length:o.id==='none');
      if(!options.length)throw Error(`Not enough available portrait options for ${category}.`);
      a[category]=pick(options).id;
    }
    if(hair)a.hairColor=hair;
    const normalized=normalizePersonnelAppearance(a),key=signature(normalized);
    if(primary==='tattoo'&&key===signature({...normalized,tattoos:'none'}))continue;
    if(primary==='glasses'&&key===signature({...normalized,accessory:'none'}))continue;
    if(!used.has(key)){used.add(key);return normalized;}
  }
  throw Error('Not enough visibly distinct portraits are available. Check the portrait graphics.');
}
export function drawPersonnelPortrait(canvas,appearance,scene,height=320){
  if(!avatarManager.isSceneUsable(scene))return false;
  return avatarManager.drawToCanvas(canvas,appearance,{height,background:'#efe4c8',scene});
}
