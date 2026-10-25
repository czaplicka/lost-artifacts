import { APARTMENT_OBJECTS_POOL, APARTMENT_CONTENT_ROLES, RED_HERRING_CONTENTS } from './ApartmentObjectsPool.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { createApartmentEscapeLead } from '../../config/ApartmentEscapeLeads.js';

const VERSION=5;
const clone=value=>JSON.parse(JSON.stringify(value));
const DEFAULT_EFFECT={state:'empty',clueCount:4,artifactState:'left_behind',artifactRequired:true,artifactRecoveryBonus:30,escapeMethod:'direct'};
const LABELS={bank_statement:'Bank Statement',casino_receipt:'Casino Receipt',threatening_letter:'Threatening Letter',
  debt_notebook:'Debt Notebook',handwritten_notes:'Handwritten Notes',old_letters:'Old Letters',medical_bill:'Medical Invoice',
  medical_reports:'Medical Reports',family_photo:'Family Photograph',insurance_papers:'Insurance Documents',
  blackmail_photo:'Compromising Photograph',diary:'Personal Diary',artifact_research:'Artefact Research Notes',
  map_location:'Marked Map',family_heirloom_photo:'Photograph of the Family Heirloom',
  recycling_bin_receipt:'Document Destruction Receipt',audit_report:'Audit Report',will_document:'Will / Testament'};
const HOSTS={bank_statement:['desk','bookshelf'],casino_receipt:['desk','bookshelf'],threatening_letter:['desk','bookshelf','framed_photo'],
  debt_notebook:['bookshelf','desk'],handwritten_notes:['desk','bookshelf'],old_letters:['bookshelf','desk','instrument_case'],
  medical_bill:['desk','bookshelf'],medical_reports:['bookshelf','desk'],family_photo:['framed_photo','bookshelf'],
  insurance_papers:['desk','bookshelf'],blackmail_photo:['bookshelf','framed_photo'],diary:['bookshelf','desk'],
  artifact_research:['bookshelf','desk','instrument_case'],map_location:['desk','bookshelf'],
  family_heirloom_photo:['framed_photo','bookshelf'],recycling_bin_receipt:['desk','bookshelf'],
  audit_report:['desk','bookshelf'],will_document:['desk','bookshelf']};
const MOTIVES={
 gambling_debt:[['bank_statement','Large transfers to gambling establishments.'],['casino_receipt','Proof of heavy losses in a single night.'],['threatening_letter','A debt collector demanding immediate repayment.'],['debt_notebook','A handwritten record of growing gambling debts.'],['handwritten_notes','Repayment dates and another plan to win everything back.'],['old_letters','Letters asking for loans to cover previous gambling losses.']],
 medical_treatment:[['medical_bill','An invoice for expensive treatment.'],['medical_reports','Records describing the need for urgent surgery.'],['old_letters','Letters discussing a relative’s worsening health.'],['family_photo','A family photograph annotated with hospital visit dates.'],['bank_statement','Repeated payments to the hospital and a dwindling balance.'],['insurance_papers','A refusal to cover the proposed treatment.']],
 blackmail_secret:[['threatening_letter','A demand for payment in exchange for silence.'],['blackmail_photo','A compromising photograph with a payment demand.'],['old_letters','Letters referring to an arrangement that must stay secret.'],['handwritten_notes','Instructions for keeping the payment secret.'],['bank_statement','Repeated transfers matching the blackmailer’s demands.'],['diary','Entries describing threats to expose a personal secret.']],
 repatriation_cause:[['artifact_research','Research into the artefact’s origins and disputed provenance.'],['map_location','A route marked toward the artefact’s homeland.'],['diary','Entries arguing that the artefact must be returned.'],['family_heirloom_photo','An old photograph connecting the artefact to its place of origin.'],['old_letters','Correspondence about unsuccessful attempts to obtain its return.'],['handwritten_notes','A plan to return the artefact outside official channels.']],
 career_coverup:[['handwritten_notes','Audit schedules and discrepancies that must be concealed.'],['bank_statement','Unusual transactions near the audit dates.'],['insurance_papers','Documents describing potentially career-ending liability.'],['recycling_bin_receipt','A receipt for destroying documents shortly before an audit.'],['audit_report','A report identifying irregularities and the person responsible.'],['threatening_letter','A warning that the discrepancies will be reported.']],
 family_heirloom:[['family_heirloom_photo','A photograph showing the artefact in family possession.'],['family_photo','A family portrait with the artefact visible in the background.'],['old_letters','Letters describing how the family lost the artefact.'],['will_document','A will describing the artefact as a family inheritance.'],['artifact_research','Provenance notes tracing the artefact to the family.'],['diary','Entries about recovering the family’s lost inheritance.']]
};
export class ApartmentGenerationError extends Error {
 constructor(message){super(`[ApartmentGenerator] ${message}`);this.name='ApartmentGenerationError';}
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
  const tasks=this.requiredTasks().map(task=>({...task,candidates:this.shuffle(objects.filter(o=>o.canHoldRequiredContent!==false&&((o.possibleContents||[]).some(i=>i.id===task.contentId)||(task.role==='motive'&&(HOSTS[task.item.id]||[]).includes(o.id)))))}));
  for(const task of tasks){if(!task.candidates.length)throw new ApartmentGenerationError(`No hiding place for ${task.item.id}.`);if(task.role==='artifact')task.candidates.sort((a,b)=>Number(!!b.preferredForMissionArtifact)-Number(!!a.preferredForMissionArtifact));}
  tasks.sort((a,b)=>a.candidates.length-b.candidates.length);
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
   modifier:{id:this.apartmentModifier.id,effect:clone(this.apartmentEffect)},title:`${this.suspectId}'s Apartment`,
   subtitle:'Every room has a story. Some are better hidden.',background:{color:0x2c2c2c,pattern:'living_room'},objects};
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
