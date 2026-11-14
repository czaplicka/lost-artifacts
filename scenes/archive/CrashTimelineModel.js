import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function evaluateCrashTimeline(data, slots, conclusion) {
  if (!Array.isArray(slots) || slots.length !== data.slotCount || slots.some(id => !id)) {
    return { ok: false, reason: 'incomplete', message: __dialogueText("scenes/archive/CrashTimelineModel.js", "t_d5a8bb037221f58a6169") };
  }
  if (new Set(slots).size !== slots.length) {
    return { ok: false, reason: 'duplicate', message: __dialogueText("scenes/archive/CrashTimelineModel.js", "t_0f3726634466ccd3b246") };
  }
  const unsupported = slots.find(id => !data.correctOrder.includes(id));
  if (unsupported) return { ok: false, reason: 'unsupported', cardId: unsupported,
    message: __dialogueText("scenes/archive/CrashTimelineModel.js", "t_da486a375e2283a565b1") };
  const misplaced = slots.findIndex((id, index) => id !== data.correctOrder[index]);
  if (misplaced !== -1) return { ok: false, reason: 'order', slotIndex: misplaced,
    message: `${__dialogueText("scenes/archive/CrashTimelineModel.js", "t_66cbfad8efbf9c7a675d")}${misplaced + 1}${__dialogueText("scenes/archive/CrashTimelineModel.js", "t_851f790f95ff79359ae0")}` };
  if (!conclusion) return { ok: false, reason: 'conclusion_missing', message: __dialogueText("scenes/archive/CrashTimelineModel.js", "t_502efdb7c666e1530c63") };
  if (conclusion !== data.correctConclusion) return { ok: false, reason: 'conclusion',
    message: data.conclusions.find(item => item.id === conclusion)?.explanation ?? __dialogueText("scenes/archive/CrashTimelineModel.js", "t_a7c44f630ed40b504ae1") };
  return { ok: true, reason: 'complete', message: data.success };
}
