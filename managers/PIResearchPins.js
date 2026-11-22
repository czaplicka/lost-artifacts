import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { registerPICase, addPIEvidence } from './PIInvestigationManager.js';
import { PI_SEARCH_BOARD_ALIASES, automaticResearchKeyword } from './PIResearchPolicy.js';
import { piResearchPinText as t } from '../dialogues/PIResearchPinText.js';

const list=value=>Array.isArray(value)?value:[];
const safe=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]+$/.test(id)&&
  !['__proto__','prototype','constructor'].includes(id);
const metadataIds=entry=>[
  entry?.searchCaseId,entry?.metadata?.searchCaseId,entry?.metadata?.notebookCaseId
].filter(safe);

export function resolveResearchBoardCase(state,definition,definitions=[]){
  if(!safe(definition?.id))return {ok:false,reason:'noCase'};
  const searchId=definition.id;
  const boards=state.piInvestigations?.cases||{};
  const quests=state.piQuests?.quests||{};
  const cached=list(definitions);
  const exists=id=>Boolean(boards[id]||quests[id]||cached.some(item=>item.id===id));
  const explicit=[definition.boardCaseId,definition.questId,definition.metadata?.boardCaseId,
    definition.metadata?.questId,PI_SEARCH_BOARD_ALIASES[searchId]].filter(safe);
  const explicitIds=[...new Set(explicit)];
  if(explicitIds.length>1)return {ok:false,reason:'ambiguous'};
  if(explicitIds.length===1)return {ok:true,caseId:explicitIds[0]};
  if(exists(searchId))return {ok:true,caseId:searchId};
  const matches=new Set();
  for(const [id,entry] of Object.entries({...quests,...boards})){
    if(safe(id)&&metadataIds(entry).includes(searchId))matches.add(id);
  }
  for(const entry of cached){
    if(safe(entry?.id)&&metadataIds(entry).includes(searchId))matches.add(entry.id);
  }
  const prefixed='pi_'+searchId;
  if(exists(prefixed))matches.add(prefixed);
  if(matches.size===1)return {ok:true,caseId:[...matches][0]};
  if(matches.size>1)return {ok:false,reason:'ambiguous'};
  // PI-specific notebook definitions can own a board even without a separate JSON entry.
  if(searchId.startsWith('pi_'))return {ok:true,caseId:searchId};
  return {ok:false,reason:'noCase'};
}

export function researchCardId(searchId,keywordId){
  return `pi-research-${searchId.length}-${searchId}-${keywordId}`;
}

export function getResearchPinStatus(state,definition,keywordId,definitions=[]){
  const word=list(definition?.keywords).find(item=>item.id===keywordId);
  const known=list(state.piKeywordSearch?.cases?.[definition?.id]?.known);
  if(!word||!safe(keywordId)||!known.includes(keywordId))return {ok:false,reason:'unknown'};
  const target=resolveResearchBoardCase(state,definition,definitions);
  if(!target.ok)return target;
  const id=researchCardId(definition.id,keywordId);
  const items=list(state.piInvestigations?.cases?.[target.caseId]?.board?.items);
  const linked=new Set(list(state.piInvestigations?.cases?.[target.caseId]?.board?.links).flatMap(link=>[link.from,link.to]));
  const existing=items.find(item=>item.id===id||
    (automaticResearchKeyword(target.caseId,item.id)===keywordId&&linked.has(item.id)));
  return {ok:true,caseId:target.caseId,word,id,pinned:Boolean(existing)};
}

export function pinResearchKeyword(definition,keywordId,definitions=[]){
  const status=getResearchPinStatus(gameState,definition,keywordId,definitions);
  if(!status.ok)return {...status,message:t(status.reason)};
  if(status.pinned)return {...status,added:false,message:t('existing')};
  const caseId=status.caseId;
  if(!gameState.piInvestigations?.cases?.[caseId]){
    const cached=list(definitions).find(item=>item.id===caseId);
    const quest=gameState.piQuests?.quests?.[caseId];
    registerPICase({
      id:caseId,kind:cached?.kind||'side',requiresBoard:true,
      title:cached?.title||quest?.title||quest?.metadata?.title||definition.title||caseId,
      initialItems:[],initialLinks:[]
    });
  }
  const added=addPIEvidence(caseId,{
    id:status.id,type:'note',label:status.word.label,text:status.word.label,
    metaText:t('source',{title:definition.title||caseId})+'\n'+t('warning'),
    color:'yellow',pinned:false,discovered:true,
    createdByPlayer:true,editableByPlayer:true,caseId,
    sourceObjectId:definition.id,sourceObjectName:definition.title||caseId,
    sourceItemId:keywordId
  });
  if(!added){
    const latest=getResearchPinStatus(gameState,definition,keywordId,definitions);
    return latest.pinned?{...latest,added:false,message:t('existing')}:
      {ok:false,reason:'unavailable',message:t('unavailable')};
  }
  requestAutosave();
  return {ok:true,added:true,pinned:true,caseId,id:status.id,message:t('done',{label:status.word.label})};
}
