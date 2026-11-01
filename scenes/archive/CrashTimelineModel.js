export function evaluateCrashTimeline(data, slots, conclusion) {
  if (!Array.isArray(slots) || slots.length !== data.slotCount || slots.some(id => !id)) {
    return { ok: false, reason: 'incomplete', message: 'Fill all five timeline positions first.' };
  }
  if (new Set(slots).size !== slots.length) {
    return { ok: false, reason: 'duplicate', message: 'Each event can appear only once.' };
  }
  const unsupported = slots.find(id => !data.correctOrder.includes(id));
  if (unsupported) return { ok: false, reason: 'unsupported', cardId: unsupported,
    message: 'One event is not supported by the evidence. Select it and read its source.' };
  const misplaced = slots.findIndex((id, index) => id !== data.correctOrder[index]);
  if (misplaced !== -1) return { ok: false, reason: 'order', slotIndex: misplaced,
    message: `Position ${misplaced + 1} conflicts with the documented sequence. Follow handover, departure, radio and witness records.` };
  if (!conclusion) return { ok: false, reason: 'conclusion_missing', message: 'Choose the conclusion the available evidence supports.' };
  if (conclusion !== data.correctConclusion) return { ok: false, reason: 'conclusion',
    message: data.conclusions.find(item => item.id === conclusion)?.explanation ?? 'Choose a supported conclusion.' };
  return { ok: true, reason: 'complete', message: data.success };
}
