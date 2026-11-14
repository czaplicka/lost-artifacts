import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { decorateBoardEvidence } from './BoardEvidenceModel.js';
import { captureApartmentInventory } from './BoardEvidenceRuntime.js';
import { addTrialEvidence } from '../systems/CaseTheorySubmission.js';
const installed=new WeakMap();
function installEvidenceDecorator(api,state){
 let record=installed.get(api.board);if(record){record.state=state;return;}
 record={state};installed.set(api.board,record);const load=api.board.loadBoard.bind(api.board);
 api.board.loadBoard=data=>{captureApartmentInventory(record.state);return load(decorateBoardEvidence(addTrialEvidence(data,record.state),record.state));};
}
function context(state){
 const m=state.currentMission||{},city=state.alibiInvestigation?.cityId||state.caseSuspectCityId||state.crimeCityId||state.crimeCity||m.city||'unknown_city';
 const key=String(m.id||m.caseId||`${city}_${m.artifact||'default'}`);
 return {key,grid:state.caseForensics?.[key]?.suspectGrid,exclusions:state.suspectExclusionState?.[key]};
}
export function getCrimeBoardSuspects(state){
 const {key,grid,exclusions}=context(state);if(grid?.ruledOutEveryone===true)return [];
 if(grid?.completed!==true&&exclusions?.finished!==true)return null;
 const candidates=Array.isArray(grid?.alibiCandidateSuspectIds)?new Set(grid.alibiCandidateSuspectIds):null;
 const excluded=new Set(exclusions?.manualExclusionIds||[]),alibis=state.caseData?.alibiCases?.[key]?.suspects||[];
 return getCaseSuspects(state).filter(suspect=>{
  if(!suspect?.id||excluded.has(suspect.id)||suspect.deductionState?.eliminated===true)return false;
  if(candidates&&!candidates.has(suspect.id))return false;
  const filed=alibis.find(e=>e.suspectId===suspect.id)?.playerConclusion;
  return (filed?.locked===true?filed.status:suspect.deductionState?.alibiStatus)!=='confirmed';
 }).map(suspect=>{
  const filed=alibis.find(e=>e.suspectId===suspect.id)?.playerConclusion;
  return {suspect,challenged:(filed?.locked===true?filed.status:suspect.deductionState?.alibiStatus)==='contradicted'};
 });
}
export function syncCrimeBoardSuspects(api,state){
 if(!state?.currentMission||!api?.getData||!api.board?.loadBoard)return;
 installEvidenceDecorator(api,state);const subjects=getCrimeBoardSuspects(state),data=api.getData();
 if(subjects===null){api.board.loadBoard(data);return;}
 const oldCards=data.items.filter(item=>!item.createdByPlayer&&!item.tags?.includes('warrant-identity')&&
  (item.tags?.includes('suspect')||item.tags?.includes('case-suspect')));
 const oldIds=new Set(oldCards.map(i=>i.id)),unknownIds=new Set(oldCards.filter(i=>i.tags?.includes('unknown')).map(i=>i.id));
 const cards=subjects.map(({suspect,challenged},index)=>({id:`case-suspect-${suspect.id}`,type:'evidence',
  x:65+(index%2)*270,y:130+Math.floor(index/2)*235,z:6,rotation:index%2?1.8:-1.8,pinned:false,
  label:suspect.publicProfile?.displayName||suspect.name||__dialogueText("crimeBoard/BoardSuspects.js", "t_5143070be2bdad09d9b1"),tag:challenged?__dialogueText("crimeBoard/BoardSuspects.js", "t_4950a6936b51e0bd2c5b"):__dialogueText("crimeBoard/BoardSuspects.js", "t_112d1515dceb2594ad19"),
  body:challenged?__dialogueText("crimeBoard/BoardSuspects.js", "t_5acb2c5272296d76f7e6"):__dialogueText("crimeBoard/BoardSuspects.js", "t_aadfee5a9e219afdad12"),
  fields:[{key:'Occupation',value:suspect.publicProfile?.occupation||suspect.occupation||__dialogueText("crimeBoard/BoardSuspects.js", "t_1db2d66a8edb2f1e4892")},
   {key:'Status',value:challenged?__dialogueText("crimeBoard/BoardSuspects.js", "t_4950a6936b51e0bd2c5b"):__dialogueText("crimeBoard/BoardSuspects.js", "t_f9bdb11906ee6022145d")}],suspectId:suspect.id,
  tags:['suspect','case-suspect',challenged?'alibi-challenged':'grid-candidate'],discovered:true,createdByPlayer:false,editableByPlayer:false}));
 data.items=data.items.filter(item=>!oldIds.has(item.id)).concat(cards);
 const validIds=new Set(data.items.map(i=>i.id)),replacementIds=cards.map(c=>c.id),links=[],pairs=new Set();
 const add=link=>{
  if(link.from===link.to||!validIds.has(link.from)||!validIds.has(link.to))return;
  const pair=[link.from,link.to].sort().join('\u0000');if(pairs.has(pair))return;pairs.add(pair);links.push(link);
 };
 for(const link of data.links||[]){
  const fromUnknown=unknownIds.has(link.from),toUnknown=unknownIds.has(link.to);
  if(fromUnknown||toUnknown)replacementIds.forEach((id,index)=>add({...link,id:`${link.id}-candidate-${index}`,from:fromUnknown?id:link.from,to:toUnknown?id:link.to}));
  else add(link);
 }
 const mission=data.items.find(i=>i.tags?.includes('artifact'));
 if(mission)cards.forEach(card=>add({id:`link-mission-${card.id}`,from:mission.id,to:card.id,fromAnchor:'left',toAnchor:'right',color:'#b3131b'}));
 data.links=links;api.board.loadBoard(data);
}
