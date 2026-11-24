const equalIds=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((id,i)=>id===b[i]);
export function normalizePersonnelFlowState(roster){
  let changed=false;
  const set=(key,value)=>{if(roster[key]!==value){roster[key]=value;changed=true;}};
  const remove=key=>{if(Object.hasOwn(roster,key)){delete roster[key];changed=true;}};
  set('completed',roster.completed===true);
  set('gridReviewed',roster.gridReviewed===true);
  set('correctionNoticeShown',roster.correctionNoticeShown===true);
  const available=new Set((roster.people||[]).map(person=>person.id));
  const submitted=roster.submittedIds;
  const invalid=(!Array.isArray(submitted)&&roster.completed)||
    (submitted!==undefined&&(!Array.isArray(submitted)||new Set(submitted).size!==submitted.length||submitted.some(id=>!available.has(id))));
  if(invalid){
    if(!equalIds(roster.submittedIds,[])){roster.submittedIds=[];changed=true;}
    set('completed',false);set('submissionRepairNotice',true);
  }
  if(!roster.completed){
    set('gridReviewed',false);set('correctionNoticeShown',false);
    for(const key of ['submittedAt','gridReviewedAt','correctedIds'])remove(key);
  }
  return changed;
}
export function personnelFlowSnapshot(roster){
  return {
    people:roster.people,statements:roster.statements,attendance:roster.attendance,
    attendanceVersion:roster.attendance?.version,
    attendanceStart:roster.attendance?.crimeWindow?.startMinute,
    attendanceEnd:roster.attendance?.crimeWindow?.endMinute,
    completed:roster.completed,gridReviewed:roster.gridReviewed,
    correctionNoticeShown:roster.correctionNoticeShown,
    submittedAt:roster.submittedAt,gridReviewedAt:roster.gridReviewedAt,
    submissionRepairNotice:roster.submissionRepairNotice,
    submittedIds:Array.isArray(roster.submittedIds)?[...roster.submittedIds]:roster.submittedIds,
    correctedIds:Array.isArray(roster.correctedIds)?[...roster.correctedIds]:roster.correctedIds
  };
}
export function personnelFlowChanged(before,roster){
  const after=personnelFlowSnapshot(roster);
  return Object.keys(before).some(key=>['submittedIds','correctedIds'].includes(key)
    ? Array.isArray(before[key])||Array.isArray(after[key])
      ? !equalIds(before[key],after[key]) : before[key]!==after[key]
    : before[key]!==after[key]);
}
export function reviewPersonnelShortlist(roster,now=Date.now){
  if(!roster||roster.recovery||!roster.completed)return false;
  const ids=[...roster.targetIds];let changed=false;
  if(!equalIds(roster.correctedIds,ids)){roster.correctedIds=ids;changed=true;}
  if(roster.gridReviewed!==true){roster.gridReviewed=true;changed=true;}
  if(!Number.isFinite(roster.gridReviewedAt)){roster.gridReviewedAt=now();changed=true;}
  if(roster.correctionNoticeShown!==true){roster.correctionNoticeShown=true;changed=true;}
  return changed;
}
