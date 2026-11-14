import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { APARTMENT_OBJECTS_POOL, APARTMENT_CONTENT_ROLES, RED_HERRING_CONTENTS } from './ApartmentObjectsPool.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { createApartmentEscapeLead } from '../../config/ApartmentEscapeLeads.js';

const VERSION=5;
const ARTIFACT_HOST_IDS=new Set(['instrument_case','desk','bookshelf','sofa']);
const clone=value=>JSON.parse(JSON.stringify(value));
const DEFAULT_EFFECT={state:'empty',clueCount:4,artifactState:'left_behind',artifactRequired:true,artifactRecoveryBonus:30,escapeMethod:'direct'};
const LABELS={bank_statement:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_705f16c7ff68241db305"),casino_receipt:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_c1f2c042812d160c0385"),threatening_letter:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_f3446a330c0944b2fbc6"),
  debt_notebook:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_ed6b72576bada38a41d9"),handwritten_notes:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_0d56d708c41f3d6b0e02"),old_letters:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_fafc591a450190290c6e"),medical_bill:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_c1350fd86dafecb46230"),
  medical_reports:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_252c957ab8ccc772e2e9"),family_photo:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_933e1c9240820e04169a"),insurance_papers:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_812500f04877857b9bc1"),
  blackmail_photo:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_12d1400fd60d96be9019"),diary:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_9d40bf21e9ff49a0a7bc"),artifact_research:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_15893c539b202e708ff0"),
  map_location:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_cfa58d4adf9754bd2e25"),family_heirloom_photo:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_6a4a10fd96e7eb9f9725"),
  recycling_bin_receipt:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_38319a18c7b07799d0db"),audit_report:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_ae41de725eba26be1264"),will_document:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_206bfff76a5a70ebaf68")};
const HOSTS={bank_statement:['desk','bookshelf'],casino_receipt:['desk','bookshelf'],threatening_letter:['desk','bookshelf','framed_photo'],
  debt_notebook:['bookshelf','desk'],handwritten_notes:['desk','bookshelf'],old_letters:['bookshelf','desk','instrument_case'],
  medical_bill:['desk','bookshelf'],medical_reports:['bookshelf','desk'],family_photo:['framed_photo','bookshelf'],
  insurance_papers:['desk','bookshelf'],blackmail_photo:['bookshelf','framed_photo'],diary:['bookshelf','desk'],
  artifact_research:['bookshelf','desk','instrument_case'],map_location:['desk','bookshelf'],
  family_heirloom_photo:['framed_photo','bookshelf'],recycling_bin_receipt:['desk','bookshelf'],
  audit_report:['desk','bookshelf'],will_document:['desk','bookshelf']};
const MOTIVES={
 gambling_debt:[['bank_statement',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_836ff3d5e26f2d3d595a")],['casino_receipt',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_91f797c5eac6e659f390")],['threatening_letter',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_a0cb73b991433e0a591c")],['debt_notebook',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_2844a2f70488eb7ca479")],['handwritten_notes',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_db4f4a9c8df7a914c385")],['old_letters',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_9c51d75b31a12893fd49")]],
 medical_treatment:[['medical_bill',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_680c63e1e59d23d05932")],['medical_reports',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_277caf8741116b557d13")],['old_letters',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_0fcbd6a1bb3cd2460036")],['family_photo',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_1b4c1bd966cc21b54b6f")],['bank_statement',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_154e8a8ac5acdad46f16")],['insurance_papers',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_813db4b8fc9e2035233b")]],
 blackmail_secret:[['threatening_letter',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_dca0a84474ed445117c5")],['blackmail_photo',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_085ee3980f89f9f34015")],['old_letters',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_5ac2a2ff39a7daa231e2")],['handwritten_notes',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_b7224bd4a060cc3d5247")],['bank_statement',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_4024087c20238f4b28e8")],['diary',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_544d2e0a5b272fddcaec")]],
 repatriation_cause:[['artifact_research',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_c1a4e535ca3b6977d970")],['map_location',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_f6c3e1261a8f1d46dd9a")],['diary',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_9ce1b642e1941a44f1db")],['family_heirloom_photo',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_5fc7e629427f1cc217eb")],['old_letters',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_c1574cb9e6342f5bc089")],['handwritten_notes',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_41d096c4d9f02e0cdaaa")]],
 career_coverup:[['handwritten_notes',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_aeeb2bbc1451b13dd13b")],['bank_statement',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_635a6d6ff92cee113e12")],['insurance_papers',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_4de1cfa5ebe78b9b735d")],['recycling_bin_receipt',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_60cf8929aaa01cb691ab")],['audit_report',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_067a7295806dac96ee9e")],['threatening_letter',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_9685517ccc3a6ccb1b38")]],
 family_heirloom:[['family_heirloom_photo',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_204dde9b1d13176438ec")],['family_photo',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_eb2c3e3cf58baabd9e03")],['old_letters',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_3c0809fe87b54e639881")],['will_document',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_64f5aaa1d0d65d7e2433")],['artifact_research',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_0dd28ca70b2534ad91a5")],['diary',__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_225d6697518b06ebf7be")]]
};
export class ApartmentGenerationError extends Error {
 constructor(message){super(`${__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_dd525bf2e127fac97b8b")}${message}`);this.name='ApartmentGenerationError';}
}
export class ApartmentGenerator {
 constructor(suspectId,motive,options={}) {
  this.suspectId=suspectId||'suspect_001';this.motive=motive||'gambling_debt';this.options=options;
  this.mission=options.mission||{};this.caseIndex=Number(options.caseIndex??this.mission.caseIndex)||0;
  this.apartmentModifier=options.apartmentModifier||this.mission.caseModifiers?.apartment||{id:'empty_clues',effect:DEFAULT_EFFECT};
  this.apartmentEffect={...DEFAULT_EFFECT,...(this.apartmentModifier.effect||{}),escapeMethod:'direct'};
  this.missionId=String(this.mission.id||this.mission.missionId||`case_${this.caseIndex}_${this.suspectId}`);
  let seed=0;for(const c of `${this.suspectId}_${this.motive}_${this.missionId}`)seed=((seed<<5)-seed+c.charCodeAt(0))|0;
  this.initialSeed=Math.abs(seed)||1;this.seed=this.initialSeed;
 }
 seededRandom(max=1){this.seed=(this.seed*9301+49297)%233280;return this.seed/233280*max;}
 shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(this.seededRandom(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
 selectByWeight(items){if(!items.length)return null;let n=this.seededRandom(items.reduce((s,i)=>s+(Number(i.weight)>0?Number(i.weight):1),0));for(const i of items){n-=Number(i.weight)>0?Number(i.weight):1;if(n<0)return i;}return items[items.length-1];}
 getRequiredClueCount(){const n=Number(this.apartmentEffect.clueCount);return Number.isFinite(n)?Math.max(1,Math.min(6,Math.floor(n))):4;}
 getContentsForMotive(motive=this.motive){return (MOTIVES[motive]||MOTIVES.gambling_debt).map(([id,description])=>({id,label:LABELS[id],type:id.includes('photo')?'photo':'document',description,isClue:true}));}
 shouldPlaceMissionArtifact(){return this.apartmentEffect.artifactState!=='carried_away'&&(this.apartmentEffect.artifactRequired===true||this.apartmentEffect.artifactState==='left_behind');}
 getMissionArtifact(){
  const raw=this.mission.artifact,o=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const label=typeof raw==='string'?raw.trim():String(o.label||o.name||this.mission.artifactName||'').trim();
  const key=this.mission.artifactKey||o.artifactKey||o.id;
  if(!label||!key||(this.mission.artifactKey&&o.artifactKey&&this.mission.artifactKey!==o.artifactKey))throw new ApartmentGenerationError('Missing or inconsistent mission artefact name/key. No substitute was generated.');
  return {...clone(o),id:String(o.id||key),artifactKey:String(key),name:label,label,type:'artifact',quantity:1,isArtifact:true,isClue:false,isEscapeClue:false,isEscapeFragment:false,isRedHerring:false};
 }
 getRouteTarget(){
  const list=Array.isArray(this.options.locations)?this.options.locations:this.options.locations?.locations;
  const stored=gameState.routeManager?.route,exported=gameState.escapeRoute;
  if(!this.options.route&&Array.isArray(stored)&&stored.length&&Array.isArray(exported)&&exported.length&&JSON.stringify(stored)!==JSON.stringify(exported))throw new ApartmentGenerationError('The saved route representations disagree. No route was replaced.');
  const route=this.options.route||(Array.isArray(stored)&&stored.length?stored:exported);
  if(!Array.isArray(list)||!Array.isArray(route)||!route.length||!route.every(id=>typeof id==='string'&&id!=='hq'&&id!==gameState.crimeCityId&&list.some(l=>l?.id===id)))throw new ApartmentGenerationError('A valid existing escape route is required. No destination was invented.');
  const target=list.find(l=>l.id===route[0]);
  if(!target?.city||!target?.country)throw new ApartmentGenerationError('The first route destination has no city/country definition.');
  return target;
 }
 normalizeItem(item){if(!item?.id)throw new ApartmentGenerationError('Missing item ID.');return {...clone(item),label:item.label||item.name||LABELS[item.id]||String(item.id),type:item.type||'object',description:item.description||item.hint||'',quantity:1};}
 createConfiguredObject(template){return {...clone(template),position:{...(template.position||{})},size:{...(template.size||{})},state:'open',unlocks:[],consumeRequiredItem:false};}
 getEscapePlan(){if(!this.escapePlan)this.escapePlan={method:'direct',item:createApartmentEscapeLead(this.getRouteTarget(),()=>this.seededRandom())};return clone(this.escapePlan);}
 requiredTasks(){
  const tasks=[],add=(item,role,contentId)=>tasks.push({role,contentId,item:this.normalizeItem({...item,apartmentRequired:true,apartmentRequiredRole:role})});
  if(this.shouldPlaceMissionArtifact())add(this.getMissionArtifact(),'artifact',APARTMENT_CONTENT_ROLES.MISSION_ARTIFACT);
  add(this.getEscapePlan().item,'escape',APARTMENT_CONTENT_ROLES.ESCAPE_CLUE);
  for(const item of this.shuffle(this.getContentsForMotive()).slice(0,this.getRequiredClueCount()))add(item,'motive',item.id);
  return tasks;
 }
 buildRequiredAssignments(objects){
  const tasks=this.requiredTasks().map(task=>({...task,candidates:this.shuffle(objects.filter(o=>
   o.canHoldRequiredContent!==false&&(
    (o.possibleContents||[]).some(i=>i.id===task.contentId)||
    (task.role==='artifact'&&ARTIFACT_HOST_IDS.has(o.id))||
    (task.role==='motive'&&(HOSTS[task.item.id]||[]).includes(o.id))
   )
  ))}));
  for(const task of tasks)if(!task.candidates.length)throw new ApartmentGenerationError(`No hiding place for ${task.item.id}.`);
  // Choose the artefact host first, from its shuffled pool, without a preferred case.
  tasks.sort((a,b)=>Number(b.role==='artifact')-Number(a.role==='artifact')||a.candidates.length-b.candidates.length);
  const placed=[],loads=new Map(),exclusive=new Set();
  const visit=index=>{
   if(index===tasks.length)return true;const task=tasks[index],choices=[...task.candidates];
   if(task.role!=='artifact')choices.sort((a,b)=>(loads.get(a.id)||0)-(loads.get(b.id)||0));
   for(const host of choices){const n=loads.get(host.id)||0;if(exclusive.has(host.id)||n>=3||(task.role==='artifact'&&n))continue;
    placed.push({objectId:host.id,item:task.item,role:task.role});loads.set(host.id,n+1);if(task.role==='artifact')exclusive.add(host.id);
    if(visit(index+1))return true;placed.pop();loads.set(host.id,n);exclusive.delete(host.id);
   }return false;
  };
  if(!visit(0))throw new ApartmentGenerationError('Required evidence cannot fit the available hiding places.');return placed;
 }
 selectObjects(){
  const all=Object.values(APARTMENT_OBJECTS_POOL).map(o=>this.createConfiguredObject(o));
  if(!all.length||new Set(all.map(o=>o.id)).size!==all.length)throw new ApartmentGenerationError('Invalid or duplicate hiding places.');
  this.assignments=this.buildRequiredAssignments(all);const ids=new Set(this.assignments.map(a=>a.objectId));
  const count=Math.min(all.length,Math.max(ids.size,5+Math.floor(this.seededRandom(4))));
  return [...all.filter(o=>ids.has(o.id)),...this.shuffle(all.filter(o=>!ids.has(o.id))).slice(0,count-ids.size)];
 }
 configureObjects(templates){
  const objects=templates.map(o=>this.createConfiguredObject(o));
  for(const a of this.assignments){const host=objects.find(o=>o.id===a.objectId);if(!host)throw new ApartmentGenerationError('A required hiding place disappeared.');host.unlocks.push(this.normalizeItem(a.item));}
  const used=new Set(objects.flatMap(o=>o.unlocks.map(i=>i.id)));
  for(const o of objects){if(o.unlocks.length||this.seededRandom()<0.4)continue;const item=this.selectByWeight((RED_HERRING_CONTENTS||[]).filter(i=>i?.id&&!used.has(i.id)));if(item){o.unlocks.push(this.normalizeItem({...item,isClue:false,isArtifact:false,isEscapeClue:false,isEscapeFragment:false,isRedHerring:true,apartmentRequired:false}));used.add(item.id);}}
  this.configureLocks(objects);return objects;
 }
 configureLocks(objects){
  const protectedHosts=new Set(),all=Object.values(APARTMENT_OBJECTS_POOL);
  for(const target of [...objects]){
   if(!target.canBeLocked||!target.requiresItem||protectedHosts.has(target.id)||target.unlocks.some(i=>i.apartmentRequired)||this.seededRandom()<0.5)continue;
   const keyId=target.requiresItem,existing=objects.flatMap(host=>host.unlocks.map(item=>({host,item}))).find(e=>e.item.id===keyId);
   if(existing?.host.id===target.id)continue;
   const chosen=this.selectByWeight(all.filter(host=>host.id!==target.id&&(host.possibleContents||[]).some(i=>i.id===keyId&&i.type==='key')&&!objects.find(o=>o.id===host.id)?.unlocks.some(i=>i.isArtifact)));
   if(!chosen)continue;
   let host=existing?.host||objects.find(o=>o.id===chosen.id);if(!host){host=this.createConfiguredObject(chosen);objects.push(host);}
   host.state='open';protectedHosts.add(host.id);
   if(existing){existing.item.apartmentRequired=true;existing.item.isApartmentKey=true;}
   else host.unlocks.push(this.normalizeItem({...chosen.possibleContents.find(i=>i.id===keyId),apartmentRequired:true,isApartmentKey:true,apartmentRequiredRole:'lock_key',isClue:false,isRedHerring:false}));
   target.state='locked';target.consumeRequiredItem=false;
  }
 }
 validate(objects){
  const items=objects.flatMap(o=>o.unlocks);if(new Set(items.map(i=>i.id)).size!==items.length)throw new ApartmentGenerationError('Duplicate item IDs.');
  for(const a of this.assignments)if(objects.find(o=>o.id===a.objectId)?.unlocks.filter(i=>i.id===a.item.id).length!==1)throw new ApartmentGenerationError(`Missing required evidence: ${a.item.id}`);
  if(items.filter(i=>i.apartmentRequiredRole==='motive').length!==this.getRequiredClueCount())throw new ApartmentGenerationError('Incorrect motive clue count.');
  if(items.filter(i=>i.apartmentRequiredRole==='escape').length!==1)throw new ApartmentGenerationError('Exactly one direct escape lead is required.');
  if(items.filter(i=>i.isArtifact).length!==(this.shouldPlaceMissionArtifact()?1:0))throw new ApartmentGenerationError('Incorrect artefact count.');
  const reachable=new Set(),keys=new Set();let changed=true;
  while(changed){changed=false;for(const o of objects){if(reachable.has(o.id)||(o.state==='locked'&&!keys.has(o.requiresItem)))continue;reachable.add(o.id);changed=true;o.unlocks.forEach(i=>keys.add(i.id));}}
  if(reachable.size!==objects.length)throw new ApartmentGenerationError('An inaccessible lock was generated.');return true;
 }
 generate(){
  this.seed=this.initialSeed;this.escapePlan=null;this.assignments=null;
  const objects=this.configureObjects(this.selectObjects());this.validate(objects);
  return {id:`apartment_${this.missionId}`,generatorVersion:VERSION,suspectId:this.suspectId,motive:this.motive,missionId:this.missionId,caseIndex:this.caseIndex,
   modifier:{id:this.apartmentModifier.id,effect:clone(this.apartmentEffect)},title:`${this.suspectId}${__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_981902f0835222ba7669")}`,
   subtitle:__dialogueText("scenes/apartament/ApartmentGenerator.js", "t_9754d0c2a578a1e236bd"),background:{color:0x2c2c2c,pattern:'living_room'},objects};
 }
}
function artifactKey(g){return g.mission.artifactKey||g.mission.artifact?.artifactKey||g.mission.artifact?.id||null;}
function snapshotKey(g){return JSON.stringify([VERSION,gameState.currentCaseId??null,gameState.investigationStartTime??null,g.missionId,g.suspectId,g.motive,artifactKey(g),g.apartmentEffect]);}
export function repairApartmentObjectProgress(progress,config){
 const collected={...(progress.collectedItems||{})};for(const item of progress.items||[])if(item?.id)collected[item.id]=true;
 const objects=clone(progress.objects||{});
 for(const object of config.objects){const old=objects[object.id];if(!old)continue;if(old.state==='locked'&&object.state!=='locked')old.state='open';
  const missing=object.unlocks.filter(i=>i.apartmentRequired&&!collected[i.id]);if(missing.length){old.contentsCollected=false;const ids=new Set(missing.map(i=>i.id));old.collectedIds=(old.collectedIds||[]).filter(id=>!ids.has(id));}}
 return {...progress,collectedItems:collected,objects};
}
function existingV4(progress,g){
 const matches=Object.entries(progress.generationSnapshotsV4||{}).filter(([key,value])=>{
  try{const p=JSON.parse(key);return p[0]===4&&p[1]===(gameState.currentCaseId??null)&&p[2]===(gameState.investigationStartTime??null)&&p[3]===g.missionId&&p[4]===g.suspectId&&p[5]===g.motive&&p[6]===artifactKey(g)&&value?.generatorVersion===4;}catch{return false;}
 });
 if(matches.length>1)throw new ApartmentGenerationError('Multiple saved apartment plans match this case. They were not replaced.');
 return matches[0]?.[1]||null;
}
export function generateApartment(suspectId,motive,options={}){
 const g=new ApartmentGenerator(suspectId,motive,options),key=snapshotKey(g),progress=gameState.apartmentProgress?.[g.missionId]||{};
 const cached=progress.generationSnapshotsV5?.[key]||existingV4(progress,g);if(cached)return clone(cached);
 const config=g.generate(),repaired=repairApartmentObjectProgress(progress,config);
 gameState.updateState({apartmentProgress:{...(gameState.apartmentProgress||{}),[g.missionId]:{...repaired,generationSnapshotsV5:{...(progress.generationSnapshotsV5||{}),[key]:clone(config)}}}});
 requestAutosave();return clone(config);
}
export default ApartmentGenerator;