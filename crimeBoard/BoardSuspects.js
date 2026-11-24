import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { decorateBoardEvidence } from './BoardEvidenceModel.js';
import { captureApartmentInventory } from './BoardEvidenceRuntime.js';
import { addTrialEvidence } from '../systems/CaseTheorySubmission.js';
import { theoryCaseKey } from './CaseTheoryModel.js';
import { readPuzzleConclusion,hasPuzzleRecord } from '../alibi/AlibiPuzzleCompletion.js';
import { addPuzzleEvidence } from '../alibi/AlibiPuzzleEvidenceProjection.js';
const installed=new WeakMap();
function conclusionFor(state){const key=theoryCaseKey(state);return readPuzzleConclusion(state,{caseKey:key,activeCaseKey:key});}
function installEvidenceDecorator(api,state){
 let record=installed.get(api.board);if(record){record.state=state;return;}
 record={state};installed.set(api.board,record);const load=api.board.loadBoard.bind(api.board);
 api.board.loadBoard=data=>{captureApartmentInventory(record.state);const withTrial=addTrialEvidence(data,record.state);const projected=addPuzzleEvidence(withTrial,record.state,conclusionFor(record.state));return load(decorateBoardEvidence(projected,record.state));};
}
function context(state){const key=theoryCaseKey(state);return {key,grid:state.caseForensics?.[key]?.suspectGrid,exclusions:state.suspectExclusionState?.[key]};}
export function getCrimeBoardSuspects(state){
 const {key,grid,exclusions}=context(state);if(grid?.ruledOutEveryone===true)return [];if(grid?.completed!==true&&exclusions?.finished!==true)return null;
 const candidates=Array.isArray(grid?.alibiCandidateSuspectIds)?new Set(grid.alibiCandidateSuspectIds):null;
 const excluded=new Set(exclusions?.manualExclusionIds||[]),alibis=state.caseData?.alibiCases?.[key]?.suspects||[],puzzle=conclusionFor(state),newRecord=hasPuzzleRecord(state,key);
 const finding=id=>puzzle?.subjects.find(r=>r.suspectId===id);
 return getCaseSuspects(state).filter(s=>{
  if(!s?.id||excluded.has(s.id))return false;
  const result=finding(s.id);if(result)return result.status!=='confirmed';
  if(s.deductionState?.eliminated===true||candidates&&!candidates.has(s.id))return false;
  if(newRecord)return true;
  const filed=alibis.find(e=>e.suspectId===s.id)?.playerConclusion;return (filed?.locked===true?filed.status:s.deductionState?.alibiStatus)!=='confirmed';
 }).map(s=>{
  const result=finding(s.id);if(result)return {suspect:s,challenged:false,uncorroborated:result.status==='uncorroborated'};
  const filed=alibis.find(e=>e.suspectId===s.id)?.playerConclusion;
  return {suspect:s,challenged:!newRecord&&(filed?.locked===true?filed.status:s.deductionState?.alibiStatus)==='contradicted',uncorroborated:false};
 });
}
export function syncCrimeBoardSuspects(api,state){
 if(!state?.currentMission||!api?.getData||!api.board?.loadBoard)return;
 installEvidenceDecorator(api,state);const subjects=getCrimeBoardSuspects(state),data=api.getData();
 if(subjects===null){api.board.loadBoard(data);return;}
 const oldCards=data.items.filter(item=>!item.createdByPlayer&&!item.tags?.includes('warrant-identity')&&(item.tags?.includes('suspect')||item.tags?.includes('case-suspect')));
 const oldIds=new Set(oldCards.map(i=>i.id)),oldById=new Map(oldCards.map(i=>[i.id,i])),unknownIds=new Set(oldCards.filter(i=>i.tags?.includes('unknown')).map(i=>i.id));
 const cards=subjects.map(({suspect,challenged,uncorroborated},index)=>{
  const id=`case-suspect-${suspect.id}`,old=oldById.get(id);
  const tag=uncorroborated?'NO CORROBORATION':challenged?__dialogueText('crimeBoard/BoardSuspects.js','t_4950a6936b51e0bd2c5b'):__dialogueText('crimeBoard/BoardSuspects.js','t_112d1515dceb2594ad19');
  const card={id,type:'evidence',x:65+(index%2)*270,y:130+Math.floor(index/2)*235,z:6,rotation:index%2?1.8:-1.8,pinned:false,label:suspect.publicProfile?.displayName||suspect.name||__dialogueText('crimeBoard/BoardSuspects.js','t_5143070be2bdad09d9b1'),tag,body:uncorroborated?'The other candidates have independently confirmed alibis. This person has no independent confirmation. Follow the lead; do not treat it as proof of guilt.':challenged?__dialogueText('crimeBoard/BoardSuspects.js','t_5acb2c5272296d76f7e6'):__dialogueText('crimeBoard/BoardSuspects.js','t_aadfee5a9e219afdad12'),fields:[{key:'Occupation',value:suspect.publicProfile?.occupation||suspect.occupation||__dialogueText('crimeBoard/BoardSuspects.js','t_1db2d66a8edb2f1e4892')},{key:'Status',value:uncorroborated?tag:challenged?__dialogueText('crimeBoard/BoardSuspects.js','t_4950a6936b51e0bd2c5b'):__dialogueText('crimeBoard/BoardSuspects.js','t_f9bdb11906ee6022145d')}],suspectId:suspect.id,tags:['suspect','case-suspect',uncorroborated?'alibi-uncorroborated':challenged?'alibi-challenged':'grid-candidate'],discovered:true,createdByPlayer:false,editableByPlayer:false};
  if(old)for(const k of ['x','y','z','rotation','pinned'])if(old[k]!==undefined)card[k]=old[k];return card;
 });
 data.items=data.items.filter(item=>!oldIds.has(item.id)).concat(cards);
 const validIds=new Set(data.items.map(i=>i.id)),replacementIds=cards.map(c=>c.id),links=[],pairs=new Set();
 const add=link=>{if(link.from===link.to||!validIds.has(link.from)||!validIds.has(link.to))return;const pair=[link.from,link.to].sort().join('\u0000');if(pairs.has(pair))return;pairs.add(pair);links.push(link);};
 for(const link of data.links||[]){const fromUnknown=unknownIds.has(link.from),toUnknown=unknownIds.has(link.to);if(fromUnknown||toUnknown)replacementIds.forEach((id,index)=>add({...link,id:`${link.id}-candidate-${index}`,from:fromUnknown?id:link.from,to:toUnknown?id:link.to}));else add(link);}
 const mission=data.items.find(i=>i.tags?.includes('artifact'));if(mission)cards.forEach(card=>add({id:`link-mission-${card.id}`,from:mission.id,to:card.id,fromAnchor:'left',toAnchor:'right',color:'#b3131b'}));
 data.links=links;api.board.loadBoard(data);
}
