import {
  APARTMENT_OBJECTS_POOL, APARTMENT_CONTENT_ROLES,
  ESCAPE_CLUES, ESCAPE_COMBINATION_ITEMS, RED_HERRING_CONTENTS
} from './ApartmentObjectsPool.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

const VERSION=4;
const DEFAULT_EFFECT={state:'empty',clueCount:4,artifactState:'left_behind',
  artifactRequired:true,artifactRecoveryBonus:30,escapeMethod:'combined'};
const clone=value=>JSON.parse(JSON.stringify(value));
const LABELS={
  bank_statement:'Bank Statement',casino_receipt:'Casino Receipt',
  threatening_letter:'Threatening Letter',debt_notebook:'Debt Notebook',
  handwritten_notes:'Handwritten Notes',old_letters:'Old Letters',
  medical_bill:'Medical Invoice',medical_reports:'Medical Reports',family_photo:'Family Photograph',
  insurance_papers:'Insurance Documents',blackmail_photo:'Compromising Photograph',
  diary:'Personal Diary',artifact_research:'Artefact Research Notes',map_location:'Marked Map',
  family_heirloom_photo:'Photograph of the Family Heirloom',
  recycling_bin_receipt:'Document Destruction Receipt',audit_report:'Audit Report',will_document:'Will / Testament'
};
// Explicit compatibility rules supplement incomplete possibleContents entries.
const MOTIVE_HOSTS={
  bank_statement:['desk','bookshelf'],casino_receipt:['desk','bookshelf'],
  threatening_letter:['desk','bookshelf','framed_photo'],debt_notebook:['bookshelf','desk'],
  handwritten_notes:['desk','bookshelf'],old_letters:['bookshelf','desk','instrument_case'],
  medical_bill:['desk','bookshelf'],medical_reports:['bookshelf','desk'],
  family_photo:['framed_photo','bookshelf'],insurance_papers:['desk','bookshelf'],
  blackmail_photo:['bookshelf','framed_photo'],diary:['bookshelf','desk'],
  artifact_research:['bookshelf','desk','instrument_case'],map_location:['desk','bookshelf'],
  family_heirloom_photo:['framed_photo','bookshelf'],
  recycling_bin_receipt:['desk','bookshelf'],audit_report:['desk','bookshelf'],will_document:['desk','bookshelf']
};
const MOTIVES={
  gambling_debt:[
    ['bank_statement','Large transfers to gambling establishments.'],
    ['casino_receipt','Proof of heavy losses in a single night.'],
    ['threatening_letter','A debt collector demanding immediate repayment.'],
    ['debt_notebook','A handwritten record of growing gambling debts.'],
    ['handwritten_notes','Repayment dates and another plan to win everything back.'],
    ['old_letters','Letters asking for loans to cover previous gambling losses.']
  ],
  medical_treatment:[
    ['medical_bill','An invoice for expensive treatment.'],
    ['medical_reports','Records describing the need for urgent surgery.'],
    ['old_letters','Letters discussing a relative’s worsening health.'],
    ['family_photo','A family photograph annotated with hospital visit dates.'],
    ['bank_statement','Repeated payments to the hospital and a dwindling balance.'],
    ['insurance_papers','A refusal to cover the proposed treatment.']
  ],
  blackmail_secret:[
    ['threatening_letter','A demand for payment in exchange for silence.'],
    ['blackmail_photo','A compromising photograph with a payment demand.'],
    ['old_letters','Letters referring to an arrangement that must stay secret.'],
    ['handwritten_notes','Instructions for keeping the payment secret.'],
    ['bank_statement','Repeated transfers matching the blackmailer’s demands.'],
    ['diary','Entries describing threats to expose a personal secret.']
  ],
  repatriation_cause:[
    ['artifact_research','Research into the artefact’s origins and disputed provenance.'],
    ['map_location','A route marked toward the artefact’s homeland.'],
    ['diary','Entries arguing that the artefact must be returned.'],
    ['family_heirloom_photo','An old photograph connecting the artefact to its place of origin.'],
    ['old_letters','Correspondence about unsuccessful attempts to obtain its return.'],
    ['handwritten_notes','A plan to return the artefact outside official channels.']
  ],
  career_coverup:[
    ['handwritten_notes','Audit schedules and discrepancies that must be concealed.'],
    ['bank_statement','Unusual transactions near the audit dates.'],
    ['insurance_papers','Documents describing potentially career-ending liability.'],
    ['recycling_bin_receipt','A receipt for destroying documents shortly before an audit.'],
    ['audit_report','A report identifying irregularities and the person responsible.'],
    ['threatening_letter','A warning that the discrepancies will be reported.']
  ],
  family_heirloom:[
    ['family_heirloom_photo','A photograph showing the artefact in family possession.'],
    ['family_photo','A family portrait with the artefact visible in the background.'],
    ['old_letters','Letters describing how the family lost the artefact.'],
    ['will_document','A will describing the artefact as a family inheritance.'],
    ['artifact_research','Provenance notes tracing the artefact to the family.'],
    ['diary','Entries about recovering the family’s lost inheritance.']
  ]
};

export class ApartmentGenerationError extends Error {
  constructor(message) {super(`[ApartmentGenerator] ${message}`);this.name='ApartmentGenerationError';}
}

export class ApartmentGenerator {
  constructor(suspectId,motive,options={}) {
    this.suspectId=suspectId || 'suspect_001';
    this.motive=motive || 'gambling_debt';
    this.mission=options.mission || {};
    this.caseIndex=Number.isFinite(Number(options.caseIndex ?? this.mission.caseIndex))
      ? Number(options.caseIndex ?? this.mission.caseIndex) : 0;
    this.apartmentModifier=options.apartmentModifier || this.mission.caseModifiers?.apartment || {id:'empty_clues',effect:DEFAULT_EFFECT};
    this.apartmentEffect={...DEFAULT_EFFECT,...(this.apartmentModifier.effect || {})};
    this.missionId=String(this.mission.id || this.mission.missionId || `case_${this.caseIndex}_${this.suspectId}`);
    this.initialSeed=this.generateSeed(this.suspectId,this.motive,this.missionId);
    this.seed=this.initialSeed;
  }

  generateSeed(suspectId,motiveId,missionId='') {
    let hash=0;
    for(const char of `${suspectId}_${motiveId}_${missionId}`) hash=((hash<<5)-hash+char.charCodeAt(0))|0;
    return Math.abs(hash)||1;
  }
  seededRandom(max=1) {this.seed=(this.seed*9301+49297)%233280;return this.seed/233280*max;}
  shuffle(items=[]) {
    const result=[...items];
    for(let i=result.length-1;i>0;i--) {const j=Math.floor(this.seededRandom(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  selectByWeight(items=[]) {
    if(!items.length) return null;
    let remaining=this.seededRandom(items.reduce((s,i)=>s+(Number(i.weight)>0?Number(i.weight):1),0));
    for(const item of items) {remaining-=Number(item.weight)>0?Number(item.weight):1;if(remaining<0)return item;}
    return items[items.length-1];
  }

  getRequiredClueCount() {
    const n=Number(this.apartmentEffect.clueCount);
    return Number.isFinite(n)?Math.max(1,Math.min(6,Math.floor(n))):4;
  }
  getContentsForMotive(motiveId) {
    return (MOTIVES[motiveId] || MOTIVES.gambling_debt).map(([id,description])=>({
      id,type:id.includes('photo')?'photo':'document',label:LABELS[id],description,isClue:true,weight:1
    }));
  }
  getClueDescription(id,motive=this.motive) {
    return this.getContentsForMotive(motive).find(item=>item.id===id)?.description || 'Evidence recovered from the apartment.';
  }
  getRequiredMotiveClues(count) {
    const clues=this.getContentsForMotive(this.motive);
    if(count>clues.length) throw new ApartmentGenerationError(`Need ${count} unique motive clues; only ${clues.length} are defined.`);
    return this.shuffle(clues).slice(0,count);
  }
  shouldPlaceMissionArtifact() {
    return this.apartmentEffect.artifactState!=='carried_away' &&
      (this.apartmentEffect.artifactRequired===true || this.apartmentEffect.artifactState==='left_behind');
  }
  getMissionArtifact() {
    const raw=this.mission.artifact;
    const item=raw && typeof raw==='object' && !Array.isArray(raw)?raw:{};
    const label=typeof raw==='string'?raw.trim():String(item.label || item.name || this.mission.artifactName || '').trim();
    const key=this.mission.artifactKey || item.artifactKey || item.id;
    if(!label || !key || (this.mission.artifactKey && item.artifactKey && this.mission.artifactKey!==item.artifactKey)) {
      throw new ApartmentGenerationError('The mission requires a recoverable artefact but has no consistent name/key. No substitute artefact was created.');
    }
    return {...clone(item),id:String(item.id || key),artifactKey:String(key),label,name:label,
      type:'artifact',condition:item.condition || 'intact',isArtifact:true,isClue:false,
      isEscapeClue:false,isEscapeFragment:false,isRedHerring:false,quantity:1};
  }
  getEscapePlan() {
    if(this.escapePlan) return clone(this.escapePlan);
    const method=this.apartmentEffect.escapeMethod || (this.caseIndex===0?'combined':'direct');
    if(!['combined','direct'].includes(method)) throw new ApartmentGenerationError(`Unknown escape method: ${method}`);
    if(method==='combined') {
      const a=ESCAPE_COMBINATION_ITEMS?.torn_ticket,b=ESCAPE_COMBINATION_ITEMS?.hotel_key_card;
      if(!a?.id || !b?.id || a.id===b.id) throw new ApartmentGenerationError('The two escape-fragment definitions are missing or have duplicate IDs.');
      this.escapePlan={method,fragments:[clone(a),clone(b)]};
    } else {
      const item=this.selectByWeight(Object.values(ESCAPE_CLUES || {}).filter(item=>item?.id));
      if(!item) throw new ApartmentGenerationError('No direct escape clue is defined.');
      this.escapePlan={method,item:clone(item)};
    }
    return clone(this.escapePlan);
  }
  createConfiguredObject(template) {
    return {...clone(template),position:{...(template.position || {})},size:{...(template.size || {})},
      state:'open',unlocks:[],consumeRequiredItem:false};
  }
  normalizeItem(item) {
    if(!item?.id) throw new ApartmentGenerationError('An apartment item has no ID.');
    return {...clone(item),type:item.type || 'object',label:item.label || item.name || LABELS[item.id] || String(item.id),
      description:item.description || item.hint || '',quantity:1,
      isClue:item.isClue===true,isArtifact:item.isArtifact===true,isEscapeClue:item.isEscapeClue===true,
      isEscapeFragment:item.isEscapeFragment===true,isRedHerring:item.isRedHerring===true};
  }

  requiredTasks() {
    const tasks=[];
    const add=(item,role,contentId)=>tasks.push({item:this.normalizeItem({...item,apartmentRequired:true,apartmentRequiredRole:role}),role,contentId});
    if(this.shouldPlaceMissionArtifact()) add(this.getMissionArtifact(),'artifact',APARTMENT_CONTENT_ROLES.MISSION_ARTIFACT);
    const escape=this.getEscapePlan();
    if(escape.method==='combined') {
      add({...escape.fragments[0],isEscapeFragment:true,isArtifact:false,isRedHerring:false},'fragment_a',APARTMENT_CONTENT_ROLES.ESCAPE_FRAGMENT_A);
      add({...escape.fragments[1],isEscapeFragment:true,isArtifact:false,isRedHerring:false},'fragment_b',APARTMENT_CONTENT_ROLES.ESCAPE_FRAGMENT_B);
    } else add({...escape.item,isEscapeClue:true,isArtifact:false,isRedHerring:false},'escape',APARTMENT_CONTENT_ROLES.ESCAPE_CLUE);
    for(const clue of this.getRequiredMotiveClues(this.getRequiredClueCount())) add(clue,'motive',clue.id);
    const ids=tasks.map(task=>task.item.id);
    if(new Set(ids).size!==ids.length) throw new ApartmentGenerationError('Required evidence has duplicate item IDs.');
    return tasks;
  }

  candidatesFor(task,objects) {
    return objects.filter(object=>object.canHoldRequiredContent!==false &&
      ((object.possibleContents || []).some(content=>content.id===task.contentId) ||
       (task.role==='motive' && (MOTIVE_HOSTS[task.item.id] || []).includes(object.id))));
  }

  buildRequiredAssignments(objects) {
    const tasks=this.requiredTasks().map(task=>({...task,candidates:this.shuffle(this.candidatesFor(task,objects))}));
    for(const task of tasks) {
      if(!task.candidates.length) throw new ApartmentGenerationError(`No compatible hiding place for ${task.item.id}.`);
      if(task.role==='artifact') task.candidates.sort((a,b)=>Number(b.preferredForMissionArtifact===true)-Number(a.preferredForMissionArtifact===true));
    }
    tasks.sort((a,b)=>a.candidates.length-b.candidates.length);
    const assignments=[],loads=new Map(),exclusive=new Set();
    const search=index=>{
      if(index===tasks.length) return true;
      const task=tasks[index];
      const choices=[...task.candidates];
      if(task.role!=='artifact') choices.sort((a,b)=>(loads.get(a.id)||0)-(loads.get(b.id)||0));
      for(const host of choices) {
        const count=loads.get(host.id)||0;
        if(exclusive.has(host.id) || count>=3 || (task.role==='artifact' && count)) continue;
        if(['fragment_a','fragment_b'].includes(task.role) && assignments.some(a=>
          ['fragment_a','fragment_b'].includes(a.role) && a.objectId===host.id)) continue;
        assignments.push({objectId:host.id,item:task.item,role:task.role});
        loads.set(host.id,count+1);
        if(task.role==='artifact') exclusive.add(host.id);
        if(search(index+1)) return true;
        assignments.pop();loads.set(host.id,count);exclusive.delete(host.id);
      }
      return false;
    };
    if(!search(0)) throw new ApartmentGenerationError('Required evidence cannot fit the compatible hiding places. No evidence was silently omitted.');
    return assignments;
  }

  selectObjects() {
    const all=Object.values(APARTMENT_OBJECTS_POOL).map(template=>this.createConfiguredObject(template));
    if(!all.length || new Set(all.map(o=>o.id)).size!==all.length) throw new ApartmentGenerationError('The object pool is empty or has duplicate object IDs.');
    this.assignments=this.buildRequiredAssignments(all);
    const requiredIds=new Set(this.assignments.map(a=>a.objectId));
    const count=Math.min(all.length,Math.max(requiredIds.size,5+Math.floor(this.seededRandom(4))));
    const extras=this.shuffle(all.filter(o=>!requiredIds.has(o.id))).slice(0,count-requiredIds.size);
    return [...all.filter(o=>requiredIds.has(o.id)),...extras];
  }

  configureObjects(templates) {
    const objects=templates.map(template=>this.createConfiguredObject(template));
    const assignments=this.assignments || this.buildRequiredAssignments(objects);
    for(const assignment of assignments) {
      const object=objects.find(o=>o.id===assignment.objectId);
      if(!object) throw new ApartmentGenerationError(`Required host ${assignment.objectId} disappeared.`);
      object.unlocks.push(this.normalizeItem(assignment.item));
    }
    const used=new Set(objects.flatMap(o=>o.unlocks.map(i=>i.id)));
    for(const object of objects) {
      if(object.unlocks.length || this.seededRandom()<0.4) continue;
      const choices=(RED_HERRING_CONTENTS || []).filter(item=>item?.id && !used.has(item.id));
      const extra=this.selectByWeight(choices);
      if(extra) {
        object.unlocks.push(this.normalizeItem({...extra,isClue:false,isArtifact:false,isEscapeClue:false,
          isEscapeFragment:false,isRedHerring:true,apartmentRequired:false}));
        used.add(extra.id);
      }
    }
    this.configureLocks(objects);
    return objects;
  }

  configureLocks(objects) {
    const protectedHosts=new Set();
    const all=Object.values(APARTMENT_OBJECTS_POOL);
    const targets=[...objects];
    for(const target of targets) {
      if(!target.canBeLocked || !target.requiresItem || protectedHosts.has(target.id) ||
        target.unlocks.some(item=>item.apartmentRequired) || this.seededRandom()<0.5) continue;
      const keyId=target.requiresItem;
      const keyHosts=all.filter(host=>host.id!==target.id &&
        (host.possibleContents || []).some(item=>item.id===keyId && item.type==='key'));
      const preferred=keyHosts.filter(host=>!objects.find(o=>o.id===host.id)?.unlocks.some(i=>i.isArtifact));
      const chosen=this.selectByWeight(preferred);
      if(!chosen) continue; // No reachable key definition: leave this object open.
      let host=objects.find(o=>o.id===chosen.id);
      if(!host) {host=this.createConfiguredObject(chosen);objects.push(host);}
      host.state='open';protectedHosts.add(host.id);
      const existing=objects.flatMap(o=>o.unlocks.map(item=>({host:o,item}))).find(entry=>entry.item.id===keyId);
      if(existing) {
        existing.host.state='open';protectedHosts.add(existing.host.id);
        existing.item.apartmentRequired=true;existing.item.isApartmentKey=true;
      } else {
        const definition=chosen.possibleContents.find(item=>item.id===keyId);
        host.unlocks.push(this.normalizeItem({...definition,apartmentRequired:true,isApartmentKey:true,
          apartmentRequiredRole:'lock_key',isClue:false,isRedHerring:false}));
      }
      target.state='locked';target.consumeRequiredItem=false;
    }
  }

  validate(objects) {
    const ids=objects.flatMap(o=>o.unlocks.map(i=>i.id));
    if(new Set(ids).size!==ids.length) throw new ApartmentGenerationError('Duplicate item IDs after generation.');
    for(const assignment of this.assignments || []) {
      if(objects.filter(o=>o.id===assignment.objectId).flatMap(o=>o.unlocks).filter(i=>i.id===assignment.item.id).length!==1)
        throw new ApartmentGenerationError(`Missing or duplicated required evidence: ${assignment.item.id}`);
    }
    const motiveCount=objects.flatMap(o=>o.unlocks).filter(i=>i.apartmentRequiredRole==='motive').length;
    if(motiveCount!==this.getRequiredClueCount()) throw new ApartmentGenerationError('The motive clue count is incorrect.');
    const reachable=new Set(),available=new Set();
    let changed=true;
    while(changed) {
      changed=false;
      for(const object of objects) {
        if(reachable.has(object.id)) continue;
        if(object.state==='locked' && !available.has(object.requiresItem)) continue;
        reachable.add(object.id);changed=true;
        for(const item of object.unlocks) available.add(item.id);
      }
    }
    if(reachable.size!==objects.length) throw new ApartmentGenerationError('An inaccessible lock or circular key dependency was generated.');
    const escape=this.getEscapePlan();
    if(escape.method==='combined') {
      const hosts=escape.fragments.map(item=>objects.find(o=>o.unlocks.some(i=>i.id===item.id))?.id);
      if(!hosts[0] || !hosts[1] || hosts[0]===hosts[1]) throw new ApartmentGenerationError('Escape fragments must occupy different hiding places.');
    }
    const artifactCount=objects.flatMap(o=>o.unlocks).filter(i=>i.isArtifact).length;
    if(artifactCount!==(this.shouldPlaceMissionArtifact()?1:0)) throw new ApartmentGenerationError('The artefact count is incorrect.');
    return true;
  }

  generate() {
    this.seed=this.initialSeed;this.escapePlan=null;this.assignments=null;
    const objects=this.configureObjects(this.selectObjects());
    this.validate(objects);
    return {id:`apartment_${this.missionId}`,generatorVersion:VERSION,suspectId:this.suspectId,
      motive:this.motive,missionId:this.missionId,caseIndex:this.caseIndex,
      modifier:{id:this.apartmentModifier.id,effect:clone(this.apartmentEffect)},
      title:`${this.suspectId}'s Apartment`,subtitle:'Every room has a story. Some are better hidden.',
      background:{color:0x2c2c2c,pattern:'living_room'},objects};
  }
}

function snapshotKey(generator) {
  return JSON.stringify([VERSION,gameState.currentCaseId ?? null,gameState.investigationStartTime ?? null,
    generator.missionId,generator.suspectId,generator.motive,
    generator.mission.artifactKey || generator.mission.artifact?.artifactKey || generator.mission.artifact?.id || null,
    generator.apartmentEffect]);
}

export function repairApartmentObjectProgress(progress,config) {
  const collected={...(progress.collectedItems || {})};
  for(const item of progress.items || []) if(item?.id) collected[item.id]=true;
  const states=clone(progress.objects || {});
  for(const object of config.objects) {
    const old=states[object.id];if(!old) continue;
    if(old.state==='locked' && object.state!=='locked') old.state='open';
    const missing=object.unlocks.filter(item=>item.apartmentRequired && !collected[item.id]);
    if(missing.length) {
      old.contentsCollected=false;
      const pending=new Set(missing.map(item=>item.id));
      old.collectedIds=(old.collectedIds || []).filter(id=>!pending.has(id));
    }
  }
  return {...progress,collectedItems:collected,objects:states};
}

export function generateApartment(suspectId,motive,options={}) {
  const generator=new ApartmentGenerator(suspectId,motive,options);
  const key=snapshotKey(generator);
  const progress=gameState.apartmentProgress?.[generator.missionId] || {};
  const cached=progress.generationSnapshotsV4?.[key];
  if(cached?.generatorVersion===VERSION) return clone(cached);
  const config=generator.generate();
  const repaired=repairApartmentObjectProgress(progress,config);
  gameState.updateState({apartmentProgress:{...(gameState.apartmentProgress || {}),
    [generator.missionId]:{...repaired,generationSnapshotsV4:{...(progress.generationSnapshotsV4 || {}),[key]:clone(config)}}}});
  requestAutosave();
  return clone(config);
}
export default ApartmentGenerator;
