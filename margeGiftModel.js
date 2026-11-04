export function evaluateMargeGift(state,itemId,allowedIds,ownedIds){
  if(!state.birthdayKnown)return{ok:false,reason:'birthday_unknown'};
  if(state.completedMissions<state.minimumCompletedMissions)return{ok:false,reason:'too_early'};
  if(state.giftGiven)return{ok:false,reason:'already_given'};
  if(!allowedIds.includes(itemId))return{ok:false,reason:'wrong_item'};
  if(!ownedIds.includes(itemId))return{ok:false,reason:'missing_item'};
  return{ok:true};
}
