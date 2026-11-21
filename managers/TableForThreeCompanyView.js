export function tableForThreeCompanyReturnView(state, venue, town) {
  if(!state)return {title:'Missing contract',body:'Accept the case on your office computer first.',canTravel:false};
  if(state.stage==='closed')return {title:'Case closed',body:'The investigation is complete. The client’s reply remains on your office computer.',canTravel:false};
  if(state.stage==='report'&&state.reportSubmitted)return {title:'Report sent',body:'Return to your detective office and read the client’s reply on the computer.',canTravel:false};
  if(state.stage==='report')return {title:'Report ready',body:'Your photographs are recorded. Return to '+venue+' in '+town+' to review and send the report.',canTravel:true};
  if(state.stage==='ring')return {title:'A presentation ring',body:'Visit Ziggy’s Pawn on the Home Town map, then drive back to '+venue+' in '+town+'.',canTravel:true};
  if(state.stage==='kitchen')return {title:'Kitchen arrangement',body:state.ringHandedOver?'The kitchen has the ring. Return to your observation position at '+venue+'.':'Bring the purchased ring to the kitchen at '+venue+' in '+town+'.',canTravel:true};
  if(state.stage==='reveal')return {title:'Observation arranged',body:'Return to '+venue+' in '+town+' to continue the observation.',canTravel:true};
  return {title:'Lead recorded',body:venue+' — '+town+'.\nThe next matching appointment is recorded in your case. Travel by car to investigate.',canTravel:['lead','observation'].includes(state.stage)};
}
