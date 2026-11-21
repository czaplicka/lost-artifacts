export const NOTE_LIMIT = 2000;
export function buildTableForThreeNotebook(state, evidence = {}, labels = {}) {
  if (!state) return null;
  const company = labels.company || 'the company';
  const venue = labels.restaurant || 'the restaurant';
  const town = labels.restaurantTown || 'the destination town';
  const leads = [];
  if (state.briefingRead) leads.push(company + ' — Business Center, Home Town.');
  if (state.calendarRead) leads.push('Calendar entry: “M. — Table 6. No calls.”');
  if (state.venueIdentified) leads.push(venue + ' — ' + town + '.');
  if (state.nextMeetingFound) leads.push('A later appointment matches the restaurant entry.');
  if (state.romancePhoto) leads.push('A romantic interaction was documented before your intervention.');
  if (state.ringHandedOver) leads.push('You supplied the ring. Do not describe the dessert as a genuine proposal.');
  if (state.facePhoto && !state.clientReplyRead) leads.push('A clear photograph of the companion is recorded. His identity still requires the client’s confirmation.');
  if (state.clientReplyRead) leads.push('The client identified the companion as the detective he previously hired.');
  let objective;
  switch (state.stage) {
    case 'briefing': objective = 'Read the client’s account on your office computer.'; break;
    case 'company': objective = 'Find a way into the employee’s office at ' + company + '.'; break;
    case 'office': objective = !state.calendarRead ? 'Inspect the employee’s calendar.' : !state.venueIdentified ? 'Find out which venue the calendar entry refers to.' : 'Find the next matching appointment.'; break;
    case 'lead': objective = 'Follow the restaurant lead to ' + town + '. Use local car travel.'; break;
    case 'observation': objective = !state.romancePhoto ? 'Document the original meeting before intervening.' : !state.dessertOfferRead ? 'Inspect the restaurant’s publicly available information.' : 'Find a way to identify the companion without confusing your intervention with the original meeting.'; break;
    case 'ring': objective = 'Obtain a presentation ring from Ziggy’s Pawn in Home Town, then return to ' + venue + '.'; break;
    case 'kitchen': objective = state.ringHandedOver ? 'Return to your observation position before the dessert is served.' : 'Bring the purchased ring to the restaurant’s kitchen entrance.'; break;
    case 'reveal': objective = state.revealPhase === 'waiting' ? 'Keep watching from your observation position.' : state.revealPhase === 'face_visible' ? 'Take a clear photograph of the companion’s face.' : !state.ringPhoto ? 'Document the arranged dessert before continuing the scene.' : 'Continue observing the couple’s reaction.'; break;
    case 'report': objective = state.reportSubmitted ? 'Return to your office computer and read the client’s reply.' : 'Review the report and disclose your intervention before sending it.'; break;
    case 'closed': objective = 'Case closed. The client’s reply remains in your office mailbox.'; break;
    default: objective = 'Return to the case scene to check the next available action.';
  }
  const photographs = [];
  for (const [field, kind, label] of [['romancePhoto','romance','Original meeting'], ['ringPhoto','ring','Investigator-arranged dessert'], ['facePhoto','face','Companion identification']]) {
    const reference = state[field];
    if (!reference) continue;
    const record = Object.prototype.hasOwnProperty.call(evidence || {}, reference.evidenceId) ? evidence[reference.evidenceId] : null;
    photographs.push({ label, available: !!(record && record.id === reference.evidenceId && record.kind === kind) });
  }
  return { objective, leads, photographs, stage: state.stage };
}
