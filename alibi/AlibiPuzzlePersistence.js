export const ALIBI_FAILURE_MESSAGE='Three incorrect deductions exhausted your leads. The agency has closed this investigation.';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const copy=x=>structuredClone(x);
export function commitPuzzleProgress(state,puzzle,{caseKey,activeCaseKey,save,canWrite=()=>true,exportState}){
 if(typeof save!=='function'||typeof exportState!=='function')throw Error('Save and export adapters are required.');
 if(canWrite()!==true)throw Error('Saving is paused or busy.');
 if(String(caseKey)!==String(activeCaseKey)||!String(caseKey||'').trim())throw Error('The active case changed.');
 if(!Number.isFinite(state._createdAt)||state.currentCaseId==null)throw Error('Missing campaign or case identity.');
 if(puzzle.caseKey!==caseKey||puzzle.caseId!==state.currentCaseId||puzzle.campaignId!==state._createdAt)throw Error('Puzzle identity does not match this case.');
 if(puzzle.version!==1||!['playing','solved','failed'].includes(puzzle.status)||!Number.isInteger(puzzle.mistakes)||puzzle.mistakes<0||puzzle.mistakes>3)throw Error('Invalid puzzle state.');
 if((puzzle.mistakes===3)!==(puzzle.status==='failed'))throw Error('Failure status and mistake count disagree.');
 const previous=state.caseData?.alibiPuzzles?.[caseKey];
 if(previous&&(previous.caseId!==puzzle.caseId||previous.campaignId!==puzzle.campaignId))throw Error('An existing puzzle from another case was preserved.');
 if(previous&&((previous.mistakes>puzzle.mistakes)||(previous.status==='failed'&&puzzle.status!=='failed')||(previous.status==='solved'&&puzzle.status!=='solved')))throw Error('Puzzle progress cannot be reset.');
 const next=copy(puzzle);
 if(next.status==='failed')next.terminalScene='GameOverScene';
 const keys=['caseData','caseFailed','caseResolved','isGameActive','gameOverReason'];
 const backup=Object.fromEntries(keys.map(k=>[k,{exists:own(state,k),value:state[k]}]));
 try{
  state.caseData={...(state.caseData||{}),alibiPuzzles:{...(state.caseData?.alibiPuzzles||{}),[caseKey]:next}};
  if(next.status==='failed'){
   state.caseFailed=true;state.caseResolved=false;state.isGameActive=false;state.gameOverReason=ALIBI_FAILURE_MESSAGE;
  }
  const raw=exportState(),serialized=JSON.stringify(raw),restored=JSON.parse(serialized);
  const saved=restored.caseData?.alibiPuzzles?.[caseKey]??restored.state?.caseData?.alibiPuzzles?.[caseKey];
  if(JSON.stringify(saved)!==JSON.stringify(next))throw Error('Export omitted or altered puzzle progress.');
  if(next.status==='failed'){
   const root=restored.caseData?restored:restored.state;
   if(root.caseFailed!==true||root.caseResolved!==false||root.isGameActive!==false)throw Error('Export omitted the terminal case outcome.');
  }
  if(save()!==true)throw Error('Puzzle progress could not be saved.');
  return copy(next);
 }catch(error){
  for(const k of keys){if(backup[k].exists)state[k]=backup[k].value;else delete state[k];}
  throw error;
 }
}
