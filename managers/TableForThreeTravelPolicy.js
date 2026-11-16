export function restaurantTravelAccess(state, currentTownId, destinationTownId, hasCamera) {
  if (!state?.venueIdentified || !state?.nextMeetingFound) return {ok:false, reason:'Find the restaurant and the next matching appointment in the office calendar first.'};
  if (!hasCamera) return {ok:false, reason:'Bring your camera from the Spy Shop.'};
  if (state.stage === 'closed') return {ok:false, reason:'This case is closed.'};
  return {ok:true, needsDrive:currentTownId !== destinationTownId};
}
export function matchesArrival(pending, quote) {
  return !!(pending && pending.status === 'driving' && quote && pending.fromTownId === quote.fromId && pending.toTownId === quote.toId);
}
