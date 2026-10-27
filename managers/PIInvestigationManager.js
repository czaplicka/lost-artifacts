import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { buildReedBoardEvidence } from './ReedBoardEvidence.js';
const clone=v=>JSON.parse(JSON.stringify(v)),REED='pi_two_glasses';
function getState(){if(!gameState.piInvestigations||typeof gameState.piInvestigations!=='object'||Array.isArray(gameState.piInvestigations))gameState.piInvestigations={version:1,selectedCaseId:null,cases:{}};const s=gameState.piInvestigations;s.cases??={};return s;}
export function syncReedBoardEvidence(){
 const s=getState(),c=s.cases[REED];if(!c?.board)return false;const generated=buildReedBoardEvidence(gameState),byId=new Map(generated.map(i=>[i.id,i])),fields=['type','label','text','metaText','color','image','caption','meta'];let changed=false;
 const items=(c.board.items||[]).map(item=>{const fresh=byId.get(item.id);if(!fresh||item.createdByPlayer!==false||item.editableByPlayer!==false)return item;const next={...item};for(const f of fields){if(f in fresh)next[f]=clone(fresh[f]);else delete next[f];}if(JSON.stringify(next)!==JSON.stringify(item))changed=true;return next;});
 const ids=new Set(items.map(i=>i.id));for(const item of generated)if(!ids.has(item.id)){const n=items.length;items.push({x:100+(n%4)*270,y:100+Math.floor(n/4)*230,...clone(item)});changed=true;}
 if(!changed)return false;gameState.piInvestigations={...s,cases:{...s.cases,[REED]:{...c,board:{...c.board,items}}}};requestAutosave();return true;
}
export function getPICase(id){if(id===REED)syncReedBoardEvidence();return getState().cases[id]||null;}
export function getPICases(){syncReedBoardEvidence();return Object.values(getState().cases);}
export function getSelectedPICaseId(){return getState().selectedCaseId;}
export function selectPICase(id){if(!getPICase(id))return false;getState().selectedCaseId=id;requestAutosave();return true;}
export function registerPICase(d){if(!d?.id||!['main','side'].includes(d.kind)||d.requiresBoard!==true)return null;const s=getState();if(s.cases[d.id])return getPICase(d.id);s.cases[d.id]={id:d.id,kind:d.kind,title:d.title||'Untitled investigation',status:'active',board:{meta:{boardId:`pi-${d.id}`,caseId:d.id,title:d.title||'PI Investigation',version:1},items:clone(d.initialItems||[]),links:clone(d.initialLinks||[])}};requestAutosave();return getPICase(d.id);}
export function savePIBoard(id,board){const c=getPICase(id);if(!c||!board)return false;const next=clone(board);if(id===REED){next.items=Array.isArray(next.items)?next.items:[];const ids=new Set(next.items.map(i=>i.id));for(const item of c.board.items||[])if(item.createdByPlayer===false&&item.editableByPlayer===false&&!ids.has(item.id)){next.items.push(clone(item));ids.add(item.id);}}c.board=next;requestAutosave();if(id===REED)syncReedBoardEvidence();return true;}
export function addPIEvidence(id,item){const c=getPICase(id);if(!c||!item?.id||c.board.items.some(i=>i.id===item.id))return false;const n=c.board.items.length;c.board.items.push({type:'note',x:100+(n%4)*270,y:100+Math.floor(n/4)*230,discovered:true,createdByPlayer:false,editableByPlayer:false,...clone(item)});requestAutosave();return true;}
