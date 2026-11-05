export function classifyManualIssue({owned,issuedFlag,storageVisited=false,casesSolved=0}){
  if(owned)return'owned';
  return issuedFlag||storageVisited||Number(casesSolved)>0?'replacement':'first';
}
export function createManualIssuer({inventory,story,getGameState,save,template}){
  if(!template?.id||!template?.name)throw new Error('The field manual template is invalid.');
  let busy=false;
  const issuedFlag='agency_field_manual_issued';
  const mode=()=>{
    const state=getGameState();
    return classifyManualIssue({owned:inventory.hasItem(template.id),issuedFlag:story.hasFlag(issuedFlag),
      storageVisited:state.onboarding?.firstCase?.storageVisited===true,casesSolved:state.casesSolved||0});
  };
  return{
    mode,
    issue(){
      if(busy)return{ok:false,reason:'busy'};
      busy=true;
      try{
        const kind=mode();
        if(kind==='owned'){
          if(!story.hasFlag(issuedFlag)){story.setFlag(issuedFlag,true);return{ok:true,alreadyOwned:true,saved:save()};}
          return{ok:true,alreadyOwned:true};
        }
        if(!inventory.addItem({...structuredClone(template),quantity:1,stackable:false}))return{ok:false,reason:'inventory_unavailable'};
        story.setFlag(issuedFlag,true);
        story.setSideClue('agency_manual_last_issue',{replacement:kind==='replacement',issuedAt:new Date().toISOString()});
        return{ok:true,replacement:kind==='replacement',saved:save()};
      }finally{busy=false;}
    }
  };
}
