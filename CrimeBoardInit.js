// CrimeBoardInit.js
import {CrimeBoard} from './CrimeBoard.js';
import {DEDUCTION_EVIDENCE_REGISTRY} from './scenes/CSI/DeductionEvidenceRegistry.js';
import {FIELD_BY_ALIAS} from './suspectsBoard/gridConstants.js';

const UNKNOWN_SUSPECT_IMAGE='assets/suspects/unknown.jpg';
const DEFAULT_ARTIFACT_IMAGE='assets/artifacts/artifact_unknown.png';
const DEFAULT_OBJECTS_URL='/assets/data/objects.json';
async function loadJson(url){
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
  return response.json();
}
function slugify(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function normalizeId(value){return String(value||'').trim().toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'');}
function normalizeSkill(value){const key=String(value||'').trim().toLowerCase().replace(/\s+/g,' ');return({pickpocketing:'pickpocket','pick pocketing':'pickpocket',pickpocket:'pickpocket'})[key]||key;}
function getRotation(index){return[-2.4,1.8,-1.2,2.1,-.8,1.1,-1.7,2.6][index%8];}
function cloneData(data){return typeof structuredClone==='function'?structuredClone(data):JSON.parse(JSON.stringify(data));}
function asArray(value){return Array.isArray(value)?value:[];}
function asObject(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
function asText(value,fallback=''){return typeof value==='string'&&value.trim()?value.trim():fallback;}
function hasValue(value){return value!==undefined&&value!==null&&String(value).trim()!=='';}
function readable(value){return String(value??'').replace(/_/g,' ').replace(/\s+/g,' ').trim();}
function fieldKey(value){const key=String(value||'').trim();return FIELD_BY_ALIAS.get(key)?.id||key;}
function currentCaseKey(state){
  const mission=asObject(state.currentMission),id=mission.id??mission.caseId??mission.caseIndex;
  if(id!==undefined&&id!==null&&id!=='')return String(id);
  return `${state.caseSuspectCityId??state.crimeCityId??state.crimeCity??mission.city??'unknown_city'}_${mission.artifact??'default_artifact'}`;
}
function resolveArtifactImage(mission={}){
  if(mission.image)return mission.image;if(mission.artifactImage)return mission.artifactImage;
  if(mission.artifactPhoto)return mission.artifactPhoto;if(mission.photo)return mission.photo;
  if(mission.artifactKey)return`assets/artifacts/${mission.artifactKey.replace(/^artifact_/,'')}.png`;
  return DEFAULT_ARTIFACT_IMAGE;
}
function buildMissionArtifactItem(mission={}){
  const artifactId=mission.artifactKey||slugify(mission.artifact||'case');
  return{id:`mission-${artifactId}`,type:'photo',x:380,y:24,z:2,rotation:-.6,pinned:true,
    label:mission.artifact||'Unknown Artifact',image:resolveArtifactImage(mission),
    caption:[mission.clue||'',mission.description||''].filter(Boolean).join(' — ')||'Stolen artifact',
    meta:[mission.city||'Unknown city',mission.country||'Unknown country'].filter(Boolean),
    tags:['mission','artifact'],clueId:mission.artifactKey||null,discovered:true,createdByPlayer:false,editableByPlayer:false};
}
function buildUnknownSuspectItem(thiefId=null){
  return{id:`suspect-${thiefId||'unknown'}`,type:'photo',x:80,y:140,z:3,rotation:-1.8,pinned:false,
    label:'Unknown suspect',image:UNKNOWN_SUSPECT_IMAGE,caption:'Identity not confirmed yet.',meta:['Suspect','Unknown'],
    suspectId:thiefId||null,tags:['suspect','unknown'],discovered:true,createdByPlayer:false,editableByPlayer:false};
}
function buildPlayerNotesItem(notes){
  if(typeof notes!=='string'||!notes.trim())return null;
  return{id:'player-note-main',type:'note',x:1020,y:675,z:4,rotation:1.4,pinned:false,label:'Detective notes',
    text:notes.trim(),metaText:'Notebook',color:'blue',tags:['player-note'],discovered:true,createdByPlayer:false,editableByPlayer:false};
}
function getHypothesisResult(state={}){
  return[state.hypothesisEvidenceResult,asObject(state.crimeBoardData).hypothesisEvidenceResult,state.hypothesisEvidence]
    .map(asObject).find(r=>Object.keys(r).length>0)||{};
}
function isHypothesisCompleted(result={}){
  return result.completed===true||result.success===true||['completed','success','solved','confirmed'].includes(result.status);
}
function hasFinalizedHypothesis(state={}){
  return['exact','partial','weak'].includes(asObject(state.reconstructedHeist).playerTheoryResult)||isHypothesisCompleted(getHypothesisResult(state));
}
function getHypothesisSkillEntries(state={}){
  if(!hasFinalizedHypothesis(state))return[];
  const reconstruction=asObject(state.reconstructedHeist),claims=asArray(reconstruction.claims);
  const cards=asArray(reconstruction.playerOrderedCards),feedback=asArray(reconstruction.playerSlotFeedback),entries=new Map();
  cards.slice(0,3).forEach((card,index)=>{
    if(!card||typeof card!=='object')return;
    const color=asText(feedback[index]).toLowerCase();if(!['green','yellow'].includes(color))return;
    const claim=claims.find(c=>c&&String(c.solutionItemId||'').trim()===String(card.id||'').trim());
    const skill=asText(claim?.thiefSkill);
    if(!claim||!skill){console.warn('[CrimeBoardInit] Cannot resolve skill for accepted card.',{cardId:card.id,playerSlotIndex:index,feedback:color});return;}
    const key=normalizeSkill(skill),existing=entries.get(key);
    if(!existing||(existing.feedback==='yellow'&&color==='green'))entries.set(key,{skill,feedback:color,claimIndex:claims.indexOf(claim)});
  });
  return[...entries.values()].sort((a,b)=>a.claimIndex-b.claimIndex);
}
function buildHypothesisSkillItems(state={}){
  return getHypothesisSkillEntries(state).map((entry,index)=>{
    const confirmed=entry.feedback==='green';
    return{id:`hypothesis-skill-${slugify(entry.skill)}`,type:'note',x:520+(index%2)*250,y:140+Math.floor(index/2)*190,z:4,
      rotation:getRotation(index+3),pinned:true,label:confirmed?entry.skill:`${entry.skill} ?`,
      text:confirmed?'Skill identified from a correctly placed clue.':'Possible skill: the clue was relevant, but its place in the sequence was wrong.',
      metaText:confirmed?'Reconstruction: correct answer':'Reconstruction: uncertain placement',color:confirmed?'blue':'yellow',
      clueId:`hypothesis-skill-${slugify(entry.skill)}`,tags:['hypothesis','hypothesis-skill',confirmed?'skill-confirmed':'skill-uncertain',`feedback-${entry.feedback}`],
      discovered:true,createdByPlayer:false,editableByPlayer:false};
  });
}
function getReconstructionClues(state={}){return asArray(state.cluesCollected).filter(c=>c&&c.type==='reconstruction');}
function buildReconstructionItems(state={}){
  return getReconstructionClues(state).map((clue,index)=>{
    const confirmed=clue.confirmed===true;
    return{id:`reconstruction-${normalizeId(clue.id)||index}`,type:'note',x:1040+(index%2)*40,y:110+index*40,z:5,
      rotation:getRotation(index+5),pinned:true,label:asText(clue.title,'Heist reconstruction'),
      text:asText(clue.text,asText(clue.finalText,'Reconstruction recorded.')),
      metaText:confirmed?'Reconstruction confirmed':'Reconstruction: unconfirmed theory',color:confirmed?'blue':'yellow',clueId:clue.id||null,
      tags:['reconstruction',confirmed?'reconstruction-confirmed':'reconstruction-uncertain'],discovered:true,createdByPlayer:false,editableByPlayer:false};
  });
}
function buildCrimeScenePhotoItems(state){
  return asArray(state?.crimeBoardData?.visitedCrimeScenes).map((scene,index)=>{
    const success=scene.success!==false;
    return{id:`scene-photo-${scene.sceneId||index}`,type:'photo',x:80+(index%4)*150,y:320+Math.floor(index/4)*130,z:1,
      rotation:getRotation(index),pinned:false,label:scene.displayName||scene.sceneId||'Crime scene',image:scene.imagePath,
      caption:success?'Scene processed.':'Investigation incomplete.',meta:[scene.cityId||'',success?'Processed':'Incomplete'].filter(Boolean),
      sceneId:scene.sceneId||null,missionId:scene.missionId||null,tags:['scene-photo',success?'scene-success':'scene-failed'],discovered:true,createdByPlayer:false,editableByPlayer:false};
  });
}
function normalizeCollectedClues(clues,objectMap){
  return asArray(clues).filter(c=>c&&typeof c==='object'&&c.category!=='skills'&&c.type!=='reconstruction'&&(objectMap.has(c.objectId)||objectMap.has(c.id)));
}
function buildEvidenceItemsFromFoundObjects(state){
  if(hasFinalizedHypothesis(state))return[];
  return asArray(state?.crimeBoardData?.sceneFoundObjects).filter(o=>o&&typeof o==='object').map((obj,index)=>{
    const fields=[];if(obj.sceneId)fields.push({key:'Scene',value:obj.sceneId});if(obj.cityId)fields.push({key:'City',value:obj.cityId});
    return{id:`found-object-${obj.id||index}`,type:'evidence',x:520+(index%2)*250,y:140+Math.floor(index/2)*210,z:2,
      rotation:getRotation(index+3),pinned:false,label:obj.item||`Object ${index+1}`,tag:'Found at scene',
      body:obj.description||obj.heistExplanation||'Recovered during the forensic sweep.',fields,clueId:obj.id||null,
      isRedHerring:Boolean(obj.isRedHerring),heistExplanation:obj.heistExplanation||'',trueExplanation:obj.trueExplanation||'',
      tags:['found-object','scene-evidence'],discovered:true,createdByPlayer:false,editableByPlayer:false};
  });
}
function buildEvidenceItemsFromClues(clues,objectsData=[]){
  const objects=new Map(asArray(objectsData).filter(o=>o&&o.id).map(o=>[o.id,o]));
  return clues.map((clue,index)=>{
    const obj=objects.get(clue.objectId)||objects.get(clue.id)||null,fields=[];
    if(clue.type)fields.push({key:'Type',value:clue.type});if(clue.cityId)fields.push({key:'City',value:clue.cityId});
    if(obj?.scene)fields.push({key:'Scene',value:obj.scene});if(obj?.isRedHerring)fields.push({key:'Status',value:'Red herring'});
    return{id:`evidence-${clue.id||obj?.id||index}`,type:'evidence',x:520+(index%2)*250,y:140+Math.floor(index/2)*210,z:2,
      rotation:getRotation(index+3),pinned:false,label:clue.label||clue.title||obj?.item||`Clue ${index+1}`,tag:clue.type||'Evidence',
      body:clue.text||clue.description||clue.content||obj?.heistExplanation||obj?.trueExplanation||'Collected during investigation.',fields,clueId:clue.id||null,
      isRedHerring:Boolean(obj?.isRedHerring),heistExplanation:obj?.heistExplanation||'',trueExplanation:obj?.trueExplanation||'',
      tags:['discovered-clue'],discovered:true,createdByPlayer:false,editableByPlayer:false};
  });
}

// Laboratory report collection: no generated hardEvidence and no suspect comparisons.
function getLabResults(state={}){
  const caseKey=currentCaseKey(state),board=asObject(state.crimeBoardData),lab=asObject(state.crimeLab);
  const scoped=state.caseForensics?.[caseKey],caseBoard=state.crimeBoards?.[caseKey];
  const completedCase=state.crimeCityProgress?.[caseKey]?.crimeLabCompleted===true||scoped?.completed===true||(!scoped&&state.csiLabCompleted===true);
  const entries=new Map();
  const valueOf=r=>r.value??r.result??r.selectedValue??r.correctValue??r.normalizedValue??r.answer??r.resultValue??r.conclusion??r.summary;
  const completed=(r,trusted)=>{
    if(r.aborted===true||r.completed===false||r.success===false)return false;
    return r.completed===true||r.success===true||r.unlocked===true||Boolean(r.completedAt)||
      ['completed','success','solved','confirmed'].includes(r.status)||trusted;
  };
  const add=(raw,priority,trusted=false,stationHint=null)=>{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return;
    if(raw.caseKey!=null&&String(raw.caseKey)!==caseKey)return;
    if(!trusted&&raw.caseKey==null&&!completedCase)return;
    if(!completed(raw,trusted))return;
    const value=valueOf(raw);if(!hasValue(value)||(typeof value==='object'&&!Array.isArray(value)))return;
    const field=fieldKey(raw.field||raw.forensicField||raw.attribute||raw.evidenceType||raw.evidenceConfig?.evidenceType||raw.type||'');
    const stationId=raw.stationId||stationHint||null;
    const known=Boolean(DEDUCTION_EVIDENCE_REGISTRY[field]||FIELD_BY_ALIAS.has(field));
    const key=stationId?`station:${stationId}`:known?`field:${field}`:`legacy:${raw.id||raw.key||raw.title||raw.label||field}`;
    const existing=entries.get(key)||[...entries.values()].find(e=>known&&e.field===field);
    const numericTime=Number(raw.completedAt);
    const time=raw.completedAt!=null&&Number.isFinite(numericTime)?numericTime:Date.parse(raw.completedAt)||0;
    const next={raw:{...raw,stationId,caseKey},field,value,priority,time,key};
    if(existing){
      const wins=priority>existing.priority||(priority===existing.priority&&time>existing.time);
      const winner=wins?next:existing,other=wins?existing:next;
      const normalize=DEDUCTION_EVIDENCE_REGISTRY[field]?.normalizeEvidence;
      const sameValue=String(normalize?normalize(winner.value):winner.value)===String(normalize?normalize(other.value):other.value);
      if(sameValue){
        const merged={...other.raw,...winner.raw};
        merged.clueText=winner.raw.clueText||winner.raw.description||winner.raw.text||other.raw.clueText||other.raw.description||other.raw.text||'';
        merged.sourceText=winner.raw.sourceText??winner.raw.evidenceConfig?.sourceText??other.raw.sourceText??other.raw.evidenceConfig?.sourceText??'';
        winner.raw=merged;
      }
      entries.delete(existing.key);entries.set(winner.key,winner);return;
    }
    entries.set(key,next);
  };
  const collections=[state.labResults,state.crimeLabResults,state.labEvidenceResults,
    board.labResults,board.crimeLabResults,board.labEvidenceResults,lab.results,lab.labResults,lab.evidenceResults,
    state.forensicResults];
  collections.forEach((collection,index)=>asArray(collection).forEach(r=>add(r,index===3?15:10)));
  add(state.identityEvidenceResult,10);
  if(caseBoard){
    asArray(caseBoard.forensicEvidence).forEach(r=>add(r,20,true));
    asArray(caseBoard.clues).filter(r=>r.category==='forensics'||r.evidenceType).forEach(r=>add(r,20,true));
  }
  if(scoped){
    add(scoped.identityEvidenceResult,30,true,'identity');
    asArray(scoped.traceEvidenceResults).forEach((r,i)=>add(r,30,true,`trace_${i}`));
    asArray(scoped.forensicResults).forEach(r=>add(r,25,true));
  }
  return[...entries.values()].sort((a,b)=>{
    const station=id=>id==='identity'?0:id==='trace_0'?1:id==='trace_1'?2:3;
    return station(a.raw.stationId)-station(b.raw.stationId)||a.field.localeCompare(b.field);
  }).map(e=>({...e.raw,field:e.field,value:e.value}));
}
function buildLabResultItems(state){
  return getLabResults(state).map((result,index)=>{
    const field=result.field,entry=DEDUCTION_EVIDENCE_REGISTRY[field];
    const rawValue=result.value;
    const display=entry?.formatEvidence?entry.formatEvidence(rawValue):
      asText(result.displayValue)||readable(entry?.normalizeEvidence?entry.normalizeEvidence(rawValue):rawValue)||'Analysis complete';
    // Preserve the common previous ID shape to keep player connections valid.
    const resultId=normalizeId(result.stationId?`lab-result-${result.stationId}`:
      result.id||result.key||result.type||result.title||result.label||`result-${index+1}`);
    const description=asText(result.clueText||result.description||result.details||result.text||result.body,display);
    const origin=asText(result.sourceText||result.evidenceConfig?.sourceText);
    const body=[description,origin&&!description.includes(origin)?`Sample origin: ${origin}`:''].filter(Boolean).join('\n\n');
    const assistant=result.assistantProvided===true||result.completedBy==='lab_assistant'||result.source==='lab_assistant';
    const source=assistant?'Lab assistant':!result.source||['player','crime_lab'].includes(result.source)?'Crime Lab':readable(result.source);
    return{id:`lab-result-${resultId}`,type:'evidence',x:1060+(index%2)*220,y:300+Math.floor(index/2)*185,z:4,
      rotation:getRotation(index+12),pinned:true,
      label:asText(result.title||result.label||entry?.label||FIELD_BY_ALIAS.get(field)?.label,'LAB REPORT'),tag:'Lab result',body,
      fields:[{key:'Result',value:display},{key:'Source',value:source},{key:'Status',value:'Analysis complete'}],
      clueId:resultId,caseKey:currentCaseKey(state),stationId:result.stationId||null,evidenceType:result.evidenceType||field,
      rawValue,sourceConfirmed:result.sourceConfirmed===true,sourceText:origin,
      tags:['lab-result','forensics',normalizeId(field)].filter(Boolean),discovered:true,createdByPlayer:false,editableByPlayer:false};
  });
}
function buildLinks(items){
  const mission=items.find(i=>i.id.startsWith('mission-')),suspect=items.find(i=>i.tags?.includes('unknown')),links=[];
  if(mission&&suspect)links.push({id:'link-mission-suspect',from:mission.id,to:suspect.id,fromAnchor:'left',toAnchor:'right',color:'#b3131b'});
  items.filter(i=>i.type==='evidence'||i.tags?.includes('hypothesis-skill')||i.tags?.includes('reconstruction')).forEach((item,index)=>{
    if(!suspect)return;links.push({id:`link-suspect-${item.id}`,from:suspect.id,to:item.id,fromAnchor:index%2===0?'right':'bottom',toAnchor:'left',
      color:item.tags?.includes('skill-uncertain')||item.tags?.includes('reconstruction-uncertain')?'#b78a28':'#b3131b'});
  });return links;
}
function buildBoardLayout(state,objectsData=[]){
  if(!state?.currentMission)throw new Error('Cannot build crime board without currentMission in gameState.');
  const mission=state.currentMission,finalized=hasFinalizedHypothesis(state);
  const items=[buildMissionArtifactItem(mission),buildUnknownSuspectItem(state.currentThief?.id||state.currentThiefId||null),
    ...buildCrimeScenePhotoItems(state),...buildEvidenceItemsFromFoundObjects(state),...buildHypothesisSkillItems(state),
    ...buildReconstructionItems(state),...buildLabResultItems(state)];
  if(!finalized){
    const map=new Map(asArray(objectsData).filter(o=>o&&o.id).map(o=>[o.id,o]));
    items.push(...buildEvidenceItemsFromClues(normalizeCollectedClues(state.cluesCollected,map),objectsData));
  }
  const playerNote=buildPlayerNotesItem(state.playerNotes);if(playerNote)items.push(playerNote);
  return{meta:{boardId:`board-${mission.artifactKey||slugify(mission.artifact||'case')}`,title:mission.artifact||'Crime Board',
    caseId:mission.artifactKey||'',caseKey:currentCaseKey(state),version:7,thiefId:state.currentThief?.id||state.currentThiefId||null,
    crimeCity:mission.city||state.crimeCity||''},items,links:buildLinks(items)};
}
async function getObjectsData(url=DEFAULT_OBJECTS_URL){
  try{const loaded=await loadJson(url);return Array.isArray(loaded)?loaded:[];}
  catch(error){console.warn('Crime board: objects.json unavailable, continuing without object metadata.',error);return[];}
}
function mergePlayerItems(base,saved){
  if(!saved||!Array.isArray(saved.items))return base;
  const baseIds=new Set(base.items.map(i=>i.id));
  const players=saved.items.filter(i=>i?.createdByPlayer&&!baseIds.has(i.id));
  const items=[...base.items,...cloneData(players)],valid=new Set(items.map(i=>i.id)),links=cloneData(base.links);
  const seenPairs=new Set(links.map(l=>[l.from,l.to].sort().join('\u0000'))),seenIds=new Set(links.map(l=>l.id));
  asArray(saved.links).forEach(link=>{
    if(!link||!(link.createdByPlayer||link.editableByPlayer)||!valid.has(link.from)||!valid.has(link.to)||link.from===link.to)return;
    const pair=[link.from,link.to].sort().join('\u0000');if(seenPairs.has(pair)||seenIds.has(link.id))return;
    seenPairs.add(pair);seenIds.add(link.id);links.push(cloneData(link));
  });return{meta:cloneData(base.meta),items,links};
}
function ensureBoardApi(boardInstance,localState,objectsData){
  return{board:boardInstance,getData(){return boardInstance.getBoardData();},
    refresh(nextState=localState){
      const current=boardInstance.getBoardData(),base=buildBoardLayout(nextState,objectsData),merged=mergePlayerItems(base,current);
      boardInstance.loadBoard(merged);localState=nextState;return merged;
    },destroy(){localState=null;}};
}
export async function initCrimeBoard({root,gameState,data=null,objectsUrl=DEFAULT_OBJECTS_URL}={}){
  if(!root)throw new Error('CrimeBoardInit: root is required.');
  const boardRoot=root.querySelector('#crime-board');if(!boardRoot)throw new Error('CrimeBoardInit: #crime-board not found inside provided root.');
  const state=gameState||{};if(!data&&!state.currentMission)throw new Error('CrimeBoardInit: currentMission is missing and no board data was provided.');
  const objects=await getObjectsData(objectsUrl),board=new CrimeBoard(boardRoot);
  board.loadBoard(state.currentMission?mergePlayerItems(buildBoardLayout(state,objects),data):cloneData(data));
  return ensureBoardApi(board,state,objects);
}
export {buildBoardLayout};
