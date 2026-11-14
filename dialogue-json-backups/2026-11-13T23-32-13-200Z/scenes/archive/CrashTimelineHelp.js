export function getCrashTimelineHelp(data, slots, conclusion) {
  const instructions = 'Select an event card on the left to read its source. Click a timeline position to place it. Five events belong on the timeline. Three do not. Select the conclusion supported by the records, then CHECK TIMELINE.';
  const base = { instructions };
  // This is John's recovery operation, not the player's agency mission.
  if (slots[0] !== data.correctOrder[0]) return {
    ...base, id: 'recovery_before_departure', cardId: data.correctOrder[0], slotIndex: 0,
    text: 'This is John\'s last operation, not your current mission. John\'s team had ALREADY RECOVERED the artifact before the flight. The aircraft was transporting that recovered object. Start with ARTIFACT RECOVERED, then TRANSPORT DEPARTS.'
  };
  const unsupported = slots.find(id => id && !data.correctOrder.includes(id));
  if (unsupported) {
    const card = data.cards.find(item => item.id === unsupported);
    const source = data.evidence.find(item => item.id === card.evidence);
    return { ...base, id: `unsupported_${unsupported}`, cardId: unsupported,
      slotIndex: slots.indexOf(unsupported),
      text: `${card.title} does not belong on this timeline. ${source.text} Remove this card; do not treat an unsupported interpretation as an event.` };
  }
  const index = data.correctOrder.findIndex((id, position) => slots[position] !== id);
  if (index !== -1) {
    const card = data.cards.find(item => item.id === data.correctOrder[index]);
    const source = data.evidence.find(item => item.id === card.evidence);
    return { ...base, id: `position_${index}`, cardId: card.id, slotIndex: index,
      text: `Position ${index + 1} should be ${card.title}. ${source.text}` };
  }
  return { ...base, id: 'supported_conclusion', conclusionId: data.correctConclusion,
    text: 'Your event sequence is correct. Choose PRESUMED DEAD. Alex believes John could not survive, but no body was recovered or identified. That is not a confirmed death, and no evidence here proves that he survived.' };
}
