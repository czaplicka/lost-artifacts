import { dialogueText as __dialogueText } from './dialogues/DialogueText.js';
import { CrimeBoard } from './CrimeBoard.js';
import { DEDUCTION_EVIDENCE_REGISTRY } from './scenes/CSI/DeductionEvidenceRegistry.js';
import { FIELD_BY_ALIAS } from './suspectsBoard/gridConstants.js';
import { getKnownApartmentIdentityClues, getApartmentIdentityContext } from './scenes/apartament/ApartmentIdentityEvidence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeSkillId as normalizeSkill } from './crimeBoard/skillNormalization.js';
import { sceneCaseKey, getCurrentSceneRecords, sceneRecordCardId } from './crimeBoard/SceneBoardRecords.js';

const UNKNOWN_SUSPECT_IMAGE='assets/suspects/unknown.webp';
const DEFAULT_ARTIFACT_IMAGE='assets/artifacts/artifact_unknown.webp';
const DEFAULT_OBJECTS_URL='./assets/data/objects.json';
const t=key=>__dialogueText('CrimeBoardInitCore.js',key);
function slugify(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function normalizeId(value){return String(value||'').trim().toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'');}
function getRotation(index){return[-2.4,1.8,-1.2,2.1,-.8,1.1,-1.7,2.6][index%8];}
function cloneData(data){return typeof structuredClone==='function'?structuredClone(data):JSON.parse(JSON.stringify(data));}
function asArray(value){return Array.isArray(value)?value:[];}
function asObject(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
function asText(value,fallback=''){return typeof value==='string'&&value.trim()?value.trim():fallback;}
function hasValue(value){return value!==undefined&&value!==null&&String(value).trim()!=='';}
function readable(value){return String(value??'').replace(/_/g,' ').replace(/\s+/g,' ').trim();}
function fieldKey(value){const key=String(value||'').trim();return FIELD_BY_ALIAS.get(key)?.id||key;}
function currentCaseKey(state){return sceneCaseKey(state);}
function resolveCrimeSceneImage(path){return typeof path==='string'?path.trim().replace(/\.jpe?g(?=[?#]|$)/i,'.webp'):path;}
function resolveArtifactImage(mission={}){
  if(mission.image)return mission.image;if(mission.artifactImage)return mission.artifactImage;
  if(mission.artifactPhoto)return mission.artifactPhoto;if(mission.photo)return mission.photo;
  if(typeof mission.artifactKey==='string')return`assets/artifacts/${mission.artifactKey.replace(/^artifact_/,'')}.webp`;
  return DEFAULT_ARTIFACT_IMAGE;
}
function buildMissionArtifactItem(mission={}){
  const artifactId=mission.artifactKey||slugify(mission.artifact||'case');
  return{id:`mission-${artifactId}`,type:'photo',x:380,y:24,z:2,rotation:-.6,pinned:true,
    label:mission.artifact||t('t_172ff09667bbca32dc87'),image:resolveArtifactImage(mission),
    caption:[mission.clue||'',mission.description||''].filter(Boolean).join('\n\n')||t('t_2bdcb70b6868cb9b0a55'),
    meta:[mission.city||t('t_2491fe94a7ba027ffff4'),mission.country||t('t_e2eb4ebb77b6e7aa2f07')].filter(Boolean),
    tags:['mission','artifact'],clueId:mission.artifactKey||null,discovered:true,createdByPlayer:false,editableByPlayer:false};
}
function buildUnknownSuspectItem(thiefId=null){
  return{id:`suspect-${thiefId??'unknown'}`,type:'photo',x:80,y:140,z:3,rotation:-1.8,pinned:false,
    label:t('t_a7c73daa1bc6f58f7897'),image:UNKNOWN_SUSPECT_IMAGE,caption:t('t_0ccda28fd2a4c1d24441'),meta:[t('t_f5ebb28614ebb0ee63cb'),t('t_b764cdc0eab713746721')],
    suspectId:thiefId??null,tags:['suspect','unknown'],discovered:true,createdByPlayer:false,editableByPlayer:false};
}
function buildFalseIdentityItems(state={}){
  const clues=getKnownApartmentIdentityClues(state),context=getApartmentIdentityContext(state);if(!context||!clues.length)return[];
  const people=[...asArray(state.caseSuspects),...asArray(state.suspects),...asArray(state.suspectList)];
  const subject=people.find(s=>s?.id===context.caseId);
  const alias=asText(subject?.publicProfile?.displayName)||asText(subject?.name);
  const text=[t('t_5374af364880aa9b8d58'),alias?`${t('t_9c0f5096e4a38f0c9759')}${alias}${t('t_cdb4ee2aea69cc6a8333')}`:'',t('t_5e931c18b8545d5adbf0'),t('t_bf87a2f06de395a96d1e'),t('t_a23888d575217f55fc03')].filter(Boolean).join('\n\n');
  return[{id:`false-identity-${context.key}`,type:'note',x:790,y:560,z:9,rotation:-1.2,pinned:true,
    label:t('t_3c14a103a1f6bfa61903'),text,metaText:t('t_eb474d56959004438c38'),color:'pink',clueId:clues[0].id,
    identityBaseLabel:alias||null,identityStatus:'false-identity',caseKey:currentCaseKey(state),missionId:context.missionId,
    tags:['false-identity','apartment-evidence','identity-confirmed'],discovered:true,createdByPlayer:false,editableByPlayer:false}];
}
function buildPlayerNotesItem(notes){
  if(typeof notes!=='string'||!notes.trim())return null;
  return{id:'player-note-main',type:'note',x:1020,y:675,z:4,rotation:1.4,pinned:false,label:t('t_802542ca071184d94f39'),text:notes.trim(),metaText:t('t_0dec07abf92dbe7289d6'),color:'blue',tags:['player-note'],discovered:true,createdByPlayer:false,editableByPlayer:false};
}
function getHypothesisResult(state={}){return[state.hypothesisEvidenceResult,asObject(state.crimeBoardData).hypothesisEvidenceResult,state.hypothesisEvidence].map(asObject).find(r=>Object.keys(r).length>0)||{};}
function isHypothesisCompleted(result={}){return result.completed===true||result.success===true||['completed','success','solved','confirmed'].includes(result.status);}
function hasFinalizedHypothesis(state={}){return['exact','partial','weak'].includes(asObject(state.reconstructedHeist).playerTheoryResult)||isHypothesisCompleted(getHypothesisResult(state));}
function getHypothesisSkillEntries(state={}){
  if(!hasFinalizedHypothesis(state))return[];
  const reconstruction=asObject(state.reconstructedHeist),claims=asArray(reconstruction.claims),cards=asArray(reconstruction.playerOrderedCards),feedback=asArray(reconstruction.playerSlotFeedback),entries=new Map();
  cards.slice(0,3).forEach((card,index)=>{
    if(!card||typeof card!=='object')return;const color=asText(feedback[index]).toLowerCase();if(!['green','yellow'].includes(color))return;
    const claim=claims.find(c=>c&&String(c.solutionItemId??'').trim()===String(card.id??'').trim()),skill=asText(claim?.thiefSkill);
    if(!claim||!skill){console.warn('[CrimeBoardInit] Cannot resolve skill for accepted card.',{cardId:card.id,playerSlotIndex:index,feedback:color});return;}
    const key=normalizeSkill(skill),existing=entries.get(key);if(!existing||(existing.feedback==='yellow'&&color==='green'))entries.set(key,{skill,feedback:color,claimIndex:claims.indexOf(claim)});
  });return[...entries.values()].sort((a,b)=>a.claimIndex-b.claimIndex);
}
function buildHypothesisSkillItems(state={}){
  return getHypothesisSkillEntries(state).map((entry,index)=>{
    const confirmed=entry.feedback==='green';
    return{id:`hypothesis-skill-${slugify(entry.skill)}`,type:'note',x:520+(index%2)*250,y:140+Math.floor(index/2)*190,z:4,
      rotation:getRotation(index+3),pinned:true,label:confirmed?entry.skill:`${entry.skill}?`,
      text:confirmed?t('t_cf29321015202bbf911b'):t('t_8143283d4746a5e1cf8f'),metaText:confirmed?t('t_d210579b7b41616836eb'):t('t_3aecc3ce9f134d2320d3'),color:confirmed?'blue':'yellow',
      clueId:`hypothesis-skill-${slugify(entry.skill)}`,tags:['hypothesis','hypothesis-skill',confirmed?'skill-confirmed':'skill-uncertain',`feedback-${entry.feedback}`],discovered:true,createdByPlayer:false,editableByPlayer:false};
  });
}
function getReconstructionClues(state={}){return asArray(state.cluesCollected).filter(c=>c&&c.type==='reconstruction');}
function reconstructionText(clue){
  const narrative=asArray(clue.narrative).filter(line=>typeof line==='string'&&line.trim());
  if(narrative.length)return narrative.map((line,index)=>`${index+1}. ${line.trim()}`).join('\n');
  const text=asText(clue.text,asText(clue.finalText));
  return text.replace(/(?:^|\r?\n)[ \t]*Likely skills:[^\r\n]*/gi,'').replace(/\n{3,}/g,'\n\n').trim()||asText(clue.finalText,t('t_a83e9fbfd4e2b8b60932'));
}
function buildReconstructionItems(state={}){
  return getReconstructionClues(state).map((clue,index)=>{const confirmed=clue.confirmed===true;
    return{id:`reconstruction-${normalizeId(clue.id)||index}`,type:'note',x:1040+(index%2)*40,y:110+index*40,z:5,
      rotation:getRotation(index+5),pinned:true,label:asText(clue.title,t('t_b6c38ee5a8729db5fb6c')),text:reconstructionText(clue),
      metaText:confirmed?t('t_af99b96e0246fcc9fdfa'):t('t_940bf16c627cf77cd19b'),color:confirmed?'blue':'yellow',clueId:clue.id??null,
      tags:['reconstruction',confirmed?'reconstruction-confirmed':'reconstruction-uncertain'],discovered:true,createdByPlayer:false,editableByPlayer:false};});
}
function buildCrimeScenePhotoItems(state){
  return getCurrentSceneRecords(state,'photo').map((scene,index)=>{const success=scene.success!==false;
    return{id:sceneRecordCardId(scene,state,'photo',index),legacyId:`scene-photo-${scene.sceneId??index}`,type:'photo',x:80+(index%4)*150,y:320+Math.floor(index/4)*130,z:1,
      rotation:getRotation(index),pinned:false,label:scene.displayName||scene.sceneId||t('t_7624a8b8c9d8d5d1ee22'),image:resolveCrimeSceneImage(scene.imagePath),
      caption:success?t('t_0114253dfa3cc43f3924'):t('t_ab6c09167078ba5ddf36'),meta:[scene.cityId||'',success?t('t_6071b9b565c939cdfdd2'):t('t_75f33cdfc8e52098ea07')].filter(Boolean),
      sceneId:scene.sceneId??null,cityId:scene.cityId??null,missionId:scene.missionId??null,visitKey:scene.visitKey??null,
      caseId:scene.caseId,campaignId:scene.campaignId,caseKey:scene.caseKey,tags:['scene-photo',success?'scene-success':'scene-failed'],discovered:true,createdByPlayer:false,editableByPlayer:false};});
}
function normalizeCollectedClues(clues,objects){return asArray(clues).filter(c=>c&&typeof c==='object'&&c.category!=='skills'&&c.type!=='reconstruction'&&(objects.has(c.objectId)||objects.has(c.id)));}
function buildEvidenceItemsFromFoundObjects(state){
  if(hasFinalizedHypothesis(state))return[];
  return getCurrentSceneRecords(state,'object').map((obj,index)=>{
    const fields=[];if(obj.sceneId)fields.push({key:'Scene',value:obj.sceneId});if(obj.cityId)fields.push({key:'City',value:obj.cityId});
    return{id:sceneRecordCardId(obj,state,'object',index),legacyId:`found-object-${obj.id??index}`,type:'evidence',x:520+(index%2)*250,y:140+Math.floor(index/2)*210,z:2,
      rotation:getRotation(index+3),pinned:false,label:obj.item||`${t('t_f78600013762faeca31b')}${index+1}`,tag:t('t_ff7aab0df8dd5a2a347c'),body:obj.description||obj.heistExplanation||t('t_0e139c673b0c731d55d8'),fields,clueId:obj.id??null,sourceObjectId:obj.id??null,
      sceneId:obj.sceneId??null,cityId:obj.cityId??null,missionId:obj.missionId??null,visitKey:obj.visitKey??null,uniqueKey:obj.uniqueKey??null,caseId:obj.caseId,campaignId:obj.campaignId,caseKey:obj.caseKey,
      isRedHerring:Boolean(obj.isRedHerring),heistExplanation:obj.heistExplanation||'',trueExplanation:obj.trueExplanation||'',tags:['found-object','scene-evidence'],discovered:true,createdByPlayer:false,editableByPlayer:false};});
}
function buildEvidenceItemsFromClues(clues,objectsData=[]){
  const objects=new Map(asArray(objectsData).filter(o=>o&&o.id).map(o=>[o.id,o]));
  return clues.map((clue,index)=>{
    const obj=objects.get(clue.objectId)||objects.get(clue.id)||null,fields=[];
    if(clue.type)fields.push({key:'Type',value:clue.type});if(clue.cityId)fields.push({key:'City',value:clue.cityId});if(obj?.scene)fields.push({key:'Scene',value:obj.scene});if(obj?.isRedHerring)fields.push({key:'Status',value:t('t_fbc4f60350426ce29d43')});
    return{id:`evidence-${clue.id??obj?.id??index}`,type:'evidence',x:520+(index%2)*250,y:140+Math.floor(index/2)*210,z:2,
      rotation:getRotation(index+3),pinned:false,label:clue.label||clue.title||obj?.item||`${t('t_d60af32fbb35a3ff5c2d')}${index+1}`,tag:clue.type||t('t_03867aea70acaf4c5dce'),body:clue.text||clue.description||clue.content||obj?.heistExplanation||obj?.trueExplanation||t('t_e641757102bce3b650cf'),fields,clueId:clue.id??null,
      isRedHerring:Boolean(obj?.isRedHerring),heistExplanation:obj?.heistExplanation||'',trueExplanation:obj?.trueExplanation||'',tags:['discovered-clue'],discovered:true,createdByPlayer:false,editableByPlayer:false};});
}
function getLabResults(state={}){
  const caseKey=currentCaseKey(state),board=asObject(state.crimeBoardData),lab=asObject(state.crimeLab),scoped=state.caseForensics?.[caseKey],caseBoard=state.crimeBoards?.[caseKey];
  const completedCase=state.crimeCityProgress?.[caseKey]?.crimeLabCompleted===true||scoped?.completed===true||(!scoped&&state.csiLabCompleted===true),entries=new Map();
  const valueOf=r=>r.value??r.result??r.selectedValue??r.correctValue??r.normalizedValue??r.answer??r.resultValue??r.conclusion??r.summary;
  const completed=(r,trusted)=>!(r.aborted===true||r.completed===false||r.success===false)&&(r.completed===true||r.success===true||r.unlocked===true||Boolean(r.completedAt)||['completed','success','solved','confirmed'].includes(r.status)||trusted);
  const add=(raw,priority,trusted=false,stationHint=null)=>{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return;if(raw.caseKey!=null&&String(raw.caseKey)!==caseKey)return;if(!trusted&&raw.caseKey==null&&!completedCase)return;if(!completed(raw,trusted))return;
    const value=valueOf(raw);if(!hasValue(value)||(typeof value==='object'&&!Array.isArray(value)))return;
    const field=fieldKey(raw.field||raw.forensicField||raw.attribute||raw.evidenceType||raw.evidenceConfig?.evidenceType||raw.type||''),stationId=raw.stationId||stationHint||null;
    const known=Boolean(DEDUCTION_EVIDENCE_REGISTRY[field]||FIELD_BY_ALIAS.has(field)),key=stationId?`station:${stationId}`:known?`field:${field}`:`legacy:${raw.id||raw.key||raw.title||raw.label||field}`;
    const existing=entries.get(key)||[...entries.values()].find(e=>known&&e.field===field),numeric=Number(raw.completedAt),time=raw.completedAt!=null&&Number.isFinite(numeric)?numeric:Date.parse(raw.completedAt)||0;
    const next={raw:{...raw,stationId,caseKey},field,value,priority,time,key};
    if(existing){const wins=priority>existing.priority||(priority===existing.priority&&time>existing.time),winner=wins?next:existing,other=wins?existing:next;
      const normalize=DEDUCTION_EVIDENCE_REGISTRY[field]?.normalizeEvidence,same=String(normalize?normalize(winner.value):winner.value)===String(normalize?normalize(other.value):other.value);
      if(same){const merged={...other.raw,...winner.raw};merged.clueText=winner.raw.clueText||winner.raw.description||winner.raw.text||other.raw.clueText||other.raw.description||other.raw.text||'';merged.sourceText=winner.raw.sourceText??winner.raw.evidenceConfig?.sourceText??other.raw.sourceText??other.raw.evidenceConfig?.sourceText??'';winner.raw=merged;}
      entries.delete(existing.key);entries.set(winner.key,winner);return;}
    entries.set(key,next);
  };
  const collections=[state.labResults,state.crimeLabResults,state.labEvidenceResults,board.labResults,board.crimeLabResults,board.labEvidenceResults,lab.results,lab.labResults,lab.evidenceResults,state.forensicResults];
  collections.forEach((collection,index)=>asArray(collection).forEach(r=>add(r,index===3?15:10)));add(state.identityEvidenceResult,10);
  if(caseBoard){asArray(caseBoard.forensicEvidence).forEach(r=>add(r,20,true));asArray(caseBoard.clues).filter(r=>r&&(r.category==='forensics'||r.evidenceType)).forEach(r=>add(r,20,true));}
  if(scoped){add(scoped.identityEvidenceResult,30,true,'identity');asArray(scoped.traceEvidenceResults).forEach((r,i)=>add(r,30,true,`trace_${i}`));asArray(scoped.forensicResults).forEach(r=>add(r,25,true));}
  return[...entries.values()].sort((a,b)=>{const station=id=>id==='identity'?0:id==='trace_0'?1:id==='trace_1'?2:3;return station(a.raw.stationId)-station(b.raw.stationId)||a.field.localeCompare(b.field);}).map(e=>({...e.raw,field:e.field,value:e.value}));
}
function buildLabResultItems(state){
  return getLabResults(state).map((result,index)=>{
    const field=result.field,entry=DEDUCTION_EVIDENCE_REGISTRY[field],rawValue=result.value;
    const display=entry?.formatEvidence?entry.formatEvidence(rawValue):asText(result.displayValue)||readable(entry?.normalizeEvidence?entry.normalizeEvidence(rawValue):rawValue)||t('t_60ffb9b9006a07dfc1f4');
    const resultId=normalizeId(result.stationId?`lab-result-${result.stationId}`:result.id||result.key||result.type||result.title||result.label||`result-${index+1}`);
    const description=asText(result.clueText||result.description||result.details||result.text||result.body,display),origin=asText(result.sourceText||result.evidenceConfig?.sourceText);
    const body=[description,origin&&!description.includes(origin)?`${t('t_997d8ad6a73e20233513')}${origin}`:''].filter(Boolean).join('\n\n');
    const assistant=result.assistantProvided===true||result.completedBy==='lab_assistant'||result.source==='lab_assistant';
    const source=assistant?t('t_02e75724638497488106'):!result.source||['player','crime_lab'].includes(result.source)?t('t_742e27a5828691c412bc'):readable(result.source);
    return{id:`lab-result-${resultId}`,type:'evidence',x:1060+(index%2)*220,y:300+Math.floor(index/2)*185,z:4,rotation:getRotation(index+12),pinned:true,
      label:asText(result.title||result.label||entry?.label||FIELD_BY_ALIAS.get(field)?.label,t('t_bf70a856af6cba26e104')),tag:t('t_9884db60954865d7357b'),body,
      fields:[{key:'Result',value:display},{key:'Source',value:source},{key:'Status',value:t('t_60ffb9b9006a07dfc1f4')}],clueId:resultId,caseKey:currentCaseKey(state),stationId:result.stationId||null,evidenceType:result.evidenceType||field,
      rawValue,sourceConfirmed:result.sourceConfirmed===true,sourceText:origin,tags:['lab-result','forensics',normalizeId(field)].filter(Boolean),discovered:true,createdByPlayer:false,editableByPlayer:false};});
}
function buildLinks(items){
  const mission=items.find(i=>i.id.startsWith('mission-')),suspect=items.find(i=>i.tags?.includes('unknown')),links=[];
  if(mission&&suspect)links.push({id:'link-mission-suspect',from:mission.id,to:suspect.id,fromAnchor:'left',toAnchor:'right',color:'#b3131b'});
  items.filter(i=>i.type==='evidence'||i.tags?.includes('hypothesis-skill')||i.tags?.includes('reconstruction')||i.tags?.includes('false-identity')).forEach((item,index)=>{
    if(suspect)links.push({id:`link-suspect-${item.id}`,from:suspect.id,to:item.id,fromAnchor:index%2===0?'right':'bottom',toAnchor:'left',color:item.tags?.includes('skill-uncertain')||item.tags?.includes('reconstruction-uncertain')?'#b78a28':'#b3131b'});
  });return links;
}
function buildBoardLayout(state,objectsData=[]){
  if(!state?.currentMission)throw Error('Cannot build crime board without currentMission in gameState.');
  const mission=state.currentMission,finalized=hasFinalizedHypothesis(state);
  const items=[buildMissionArtifactItem(mission),buildUnknownSuspectItem(state.currentThief?.id??state.currentThiefId??null),...buildCrimeScenePhotoItems(state),...buildEvidenceItemsFromFoundObjects(state),...buildHypothesisSkillItems(state),...buildReconstructionItems(state),...buildLabResultItems(state),...buildFalseIdentityItems(state)];
  if(!finalized){const map=new Map(asArray(objectsData).filter(o=>o&&o.id).map(o=>[o.id,o]));items.push(...buildEvidenceItemsFromClues(normalizeCollectedClues(state.cluesCollected,map),objectsData));}
  const note=buildPlayerNotesItem(state.playerNotes);if(note)items.push(note);
  return{meta:{boardId:`board-${mission.artifactKey||slugify(mission.artifact||'case')}`,title:mission.artifact||t('t_f4c2190c4738d459c48d'),caseId:mission.artifactKey||'',caseInstanceId:state.currentCaseId??null,campaignId:state._createdAt??null,caseKey:currentCaseKey(state),version:9,thiefId:state.currentThief?.id??state.currentThiefId??null,crimeCity:mission.city||state.crimeCity||''},items,links:buildLinks(items)};
}
async function getObjectsData(url=DEFAULT_OBJECTS_URL){
  try{const loaded=await loadJson(url,import.meta.url);return Array.isArray(loaded)?loaded:[];}
  catch(error){console.warn('Crime board: objects.json unavailable, continuing without object metadata.',error);return[];}
}
function mergePlayerItems(base,saved){
  if(!saved||!Array.isArray(saved.items))return base;
  const baseIds=new Set(base.items.map(i=>i.id)),aliases=new Map();
  for(const item of base.items)if(item.legacyId){const previous=aliases.get(item.legacyId);aliases.set(item.legacyId,previous===undefined?item.id:null);}
  const remap=id=>baseIds.has(id)?id:aliases.get(id)||id;
  const players=saved.items.filter(i=>i?.createdByPlayer&&!baseIds.has(i.id)),items=[...base.items,...cloneData(players)],valid=new Set(items.map(i=>i.id)),links=cloneData(base.links);
  const pairs=new Set(links.map(l=>[l.from,l.to].sort().join('\u0000'))),ids=new Set(links.map(l=>l.id));
  for(const raw of asArray(saved.links)){
    if(!raw||!(raw.createdByPlayer||raw.editableByPlayer))continue;
    const link={...raw,from:remap(raw.from),to:remap(raw.to)};if(!valid.has(link.from)||!valid.has(link.to)||link.from===link.to)continue;
    const pair=[link.from,link.to].sort().join('\u0000');if(pairs.has(pair)||ids.has(link.id))continue;pairs.add(pair);ids.add(link.id);links.push(cloneData(link));
  }
  return{meta:cloneData(base.meta),items,links};
}
function ensureBoardApi(boardInstance,localState,objectsData){
  return{board:boardInstance,getData(){return boardInstance.getBoardData();},
    refresh(nextState=localState){const current=boardInstance.getBoardData(),base=buildBoardLayout(nextState,objectsData),merged=mergePlayerItems(base,current);boardInstance.loadBoard(merged);localState=nextState;return merged;},
    destroy(){localState=null;}};
}
export async function initCrimeBoard({root,gameState,data=null,objectsUrl=DEFAULT_OBJECTS_URL}={}){
  if(!root)throw Error('CrimeBoardInit: root is required.');const boardRoot=root.querySelector('#crime-board');if(!boardRoot)throw Error('CrimeBoardInit: #crime-board not found inside provided root.');
  const state=gameState||{};if(!data&&!state.currentMission)throw Error('CrimeBoardInit: currentMission is missing and no board data was provided.');
  const objects=await getObjectsData(objectsUrl),board=new CrimeBoard(boardRoot);
  board.loadBoard(state.currentMission?mergePlayerItems(buildBoardLayout(state,objects),data):cloneData(data));return ensureBoardApi(board,state,objects);
}
export {buildBoardLayout};
