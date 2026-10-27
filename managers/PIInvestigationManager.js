import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { buildReedBoardEvidence } from './ReedBoardEvidence.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const REED='pi_two_glasses';
function getState(){
 if(!gameState.piInvestigations||typeof gameState.piInvestigations!=='object'||Array.isArray(gameState.piInvestigations))gameState.piInvestigations={version:1,selectedCaseId:null,cases:{}};
 const state=gameState.piInvestigations;state.cases??={};return state;
}
export function syncReedBoardEvidence(){
 const state=getState(),investigation=state.cases[REED];
 if(!investigation?.board)return false;
 const additions=buildReedBoardEvidence(gameState),items=investigation.board.items||[],ids=new Set(items.map(i=>i.id));
 const missing=additions.filter(i=>!ids.has(i.id));if(!missing.length)return false;
 const next=[...items];
 for(const item of missing){const n=next.length;next.push({x:100+(n%4)*270,y:100+Math.floor(n/4)*230,...clone(item)});}
 gameState.piInvestigations={...state,cases:{...state.cases,[REED]:{...investigation,board:{...investigation.board,items:next}}}};
 requestAutosave();return true;
}
export function getPICase(caseId){if(caseId===REED)syncReedBoardEvidence();return getState().cases[caseId]||null;}
export function getPICases(){syncReedBoardEvidence();return Object.values(getState().cases);}
export function getSelectedPICaseId(){return getState().selectedCaseId;}
export function selectPICase(caseId){if(!getPICase(caseId))return false;getState().selectedCaseId=caseId;requestAutosave();return true;}
export function registerPICase(definition){
 if(!definition?.id||!['main','side'].includes(definition.kind)||definition.requiresBoard!==true)return null;
 const state=getState();if(state.cases[definition.id])return getPICase(definition.id);
 const investigation={id:definition.id,kind:definition.kind,title:definition.title||'Untitled investigation',status:'active',board:{meta:{boardId:`pi-${definition.id}`,caseId:definition.id,title:definition.title||'PI Investigation',version:1},items:clone(definition.initialItems||[]),links:clone(definition.initialLinks||[])}};
 state.cases[definition.id]=investigation;requestAutosave();return getPICase(definition.id);
}
export function savePIBoard(caseId,board){
 const investigation=getPICase(caseId);if(!investigation||!board)return false;
 const next=clone(board);
 if(caseId===REED){
  next.items=Array.isArray(next.items)?next.items:[];
  const ids=new Set(next.items.map(i=>i.id));
  for(const item of investigation.board.items||[]){
   if(item.createdByPlayer===false&&item.editableByPlayer===false&&!ids.has(item.id)){next.items.push(clone(item));ids.add(item.id);}
  }
 }
 investigation.board=next;requestAutosave();if(caseId===REED)syncReedBoardEvidence();return true;
}
export function addPIEvidence(caseId,item){
 const investigation=getPICase(caseId);if(!investigation||!item?.id)return false;
 if(investigation.board.items.some(i=>i.id===item.id))return false;
 const count=investigation.board.items.length;
 investigation.board.items.push({type:'note',x:100+(count%4)*270,y:100+Math.floor(count/4)*230,discovered:true,createdByPlayer:false,editableByPlayer:false,...clone(item)});
 requestAutosave();return true;
}
