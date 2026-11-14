import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function getCrashTimelineHelp(data, slots, conclusion) {
  const instructions = __dialogueText("scenes/archive/CrashTimelineHelp.js", "t_8bd6539e5d0b652dc89e");
  const base = { instructions };
  // This is John's recovery operation, not the player's agency mission.
  if (slots[0] !== data.correctOrder[0]) return {
    ...base, id: 'recovery_before_departure', cardId: data.correctOrder[0], slotIndex: 0,
    text: __dialogueText("scenes/archive/CrashTimelineHelp.js", "t_e76d70f59ecab667ba91")
  };
  const unsupported = slots.find(id => id && !data.correctOrder.includes(id));
  if (unsupported) {
    const card = data.cards.find(item => item.id === unsupported);
    const source = data.evidence.find(item => item.id === card.evidence);
    return { ...base, id: `unsupported_${unsupported}`, cardId: unsupported,
      slotIndex: slots.indexOf(unsupported),
      text: `${card.title}${__dialogueText("scenes/archive/CrashTimelineHelp.js", "t_4a32bfd6e2ec185f6877")}${source.text}${__dialogueText("scenes/archive/CrashTimelineHelp.js", "t_4b66323c6b22d20a3393")}` };
  }
  const index = data.correctOrder.findIndex((id, position) => slots[position] !== id);
  if (index !== -1) {
    const card = data.cards.find(item => item.id === data.correctOrder[index]);
    const source = data.evidence.find(item => item.id === card.evidence);
    return { ...base, id: `position_${index}`, cardId: card.id, slotIndex: index,
      text: `${__dialogueText("scenes/archive/CrashTimelineHelp.js", "t_66cbfad8efbf9c7a675d")}${index + 1}${__dialogueText("scenes/archive/CrashTimelineHelp.js", "t_248c365428c4c78291e7")}${card.title}${__dialogueText("scenes/archive/CrashTimelineHelp.js", "t_8dccf256f6d5783e62bb")}${source.text}` };
  }
  return { ...base, id: 'supported_conclusion', conclusionId: data.correctConclusion,
    text: __dialogueText("scenes/archive/CrashTimelineHelp.js", "t_d95cc24c46646d683897") };
}
