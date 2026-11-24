const validId=id=>typeof id==='string'&&id.trim().length>0;
export function getExistingCaseSuspects(state={}){
  const lists=[state?.caseSuspects,state?.suspects,state?.suspectList];
  return lists.find(list=>Array.isArray(list)&&list.length)||lists.find(Array.isArray)||[];
}
export function resolveCaseThiefIdentity(state={},pool=getExistingCaseSuspects(state)){
  if(!Array.isArray(pool))return{status:'missing_pool',id:null};
  const people=pool.filter(person=>person&&typeof person==='object'&&validId(person.id));
  if(!people.length)return{status:'missing_pool',id:null};
  const ids=new Set(people.map(person=>person.id));
  if(ids.size!==people.length)return{status:'duplicate_case_ids',id:null};
  const pointers=[state?.trueThiefCaseSuspectId,state?.realThiefSuspectId,state?.caseData?.trueThiefCaseSuspectId,state?.caseData?.realThiefSuspectId,state?.currentThiefCaseSuspectId,state?.currentThief?.caseSuspectId].filter(id=>validId(id)&&ids.has(id));
  const flagged=people.filter(person=>person.isRealThief===true||person.hiddenCaseData?.isTrueThief===true);
  if(flagged.some(person=>person.hiddenCaseData?.isForensicTwin===true))return{status:'conflicting_identity',id:null};
  // Database IDs are used ONLY as lookup keys. They are never returned directly.
  const databaseIds=new Set([state?.currentThief?.id,state?.currentThiefId,state?.actualCriminalId].filter(id=>id!==null&&id!==undefined&&id!==''));
  const linked=people.filter(person=>person.hiddenCaseData?.isForensicTwin!==true&&[
    person.hiddenCaseData?.realThiefId,person.hiddenCaseData?.realThiefProfile?.id
  ].some(id=>id!==null&&id!==undefined&&databaseIds.has(id)));
  const signals=[new Set(pointers),new Set(flagged.map(p=>p.id)),new Set(linked.map(p=>p.id))].filter(set=>set.size);
  if(!signals.length)return{status:'missing_identity',id:null};
  if(signals.some(set=>set.size!==1))return{status:'ambiguous_identity',id:null};
  const candidates=new Set(signals.map(set=>[...set][0]));
  if(candidates.size!==1)return{status:'conflicting_identity',id:null};
  const id=[...candidates][0],person=people.find(p=>p.id===id);
  if(person.hiddenCaseData?.isForensicTwin===true)return{status:'conflicting_identity',id:null};
  return{status:'resolved',id};
}
