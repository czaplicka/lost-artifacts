export function createDraftSaver(save, delay = 350, maxWait = 1500) {
  let timer = null, limit = null, pending = false;
  const clear = () => { clearTimeout(timer); clearTimeout(limit); timer = limit = null; };
  const flush = () => { const needed = pending; pending = false; clear(); if (needed) save(); };
  return {
    schedule() { pending = true; clearTimeout(timer); timer = setTimeout(flush, delay); if (limit === null) limit = setTimeout(flush, maxWait); },
    flush,
    cancel() { pending = false; clear(); }
  };
}
export function checkHintEnergy(energy, cost) {
  if (typeof energy._workCheck === 'function') return energy._workCheck(cost);
  const check = energy.canAfford(cost);
  const needsSleep = typeof energy._needsSleep === 'function' && energy._needsSleep();
  return needsSleep ? { ...check, ok: false, reason: 'sleep_required' } : check;
}
export function parseSkillCatalog(data, normalize) {
  if (!Array.isArray(data)) throw Error('Skill catalog must be an array.');
  const result = new Map();
  for (const entry of data) {
    if (typeof entry?.id !== 'string' || typeof entry?.label !== 'string' || !entry.label.trim()) throw Error('Invalid skill catalog entry.');
    const id = normalize(entry.id);
    if (!id || id !== entry.id || result.has(id)) throw Error('Invalid or duplicate skill ID.');
    result.set(id, entry.label.trim());
  }
  if (!result.size) throw Error('Skill catalog is empty.');
  return [...result].sort((a,b) => a[1].localeCompare(b[1]));
}

// All manager calls here are synchronous. No energy is charged before the history entry succeeds.
export function buyPaidHint({ state, energy, manager, method, context, cost,
  commitReceipt, rollbackReceipt, persist, notifyRollback = () => {} }) {
  const quote = checkHintEnergy(energy, cost.energy);
  if (!quote.ok) return { success: false, reason: quote.reason };
  // Settle observation grants before taking rollback snapshots.
  manager.getSummary();
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const previousHint = copy(state.hintState), previousReputation = copy(state.reputationState);
  let receiptAttempted = false;
  const rollback = () => {
    const patch = { hintState: previousHint, reputationState: previousReputation };
    if (typeof state.updateState === 'function') state.updateState(patch); else Object.assign(state, patch);
    if (receiptAttempted) rollbackReceipt();
    try { persist(); } catch (error) { console.error('[CaseTheory] Rollback persistence:', error); }
    try { notifyRollback(); } catch (error) { console.error('[CaseTheory] Rollback notification:', error); }
  };
  let result;
  try {
    result = manager.recordPaidHint(method, context, { ...cost, cash: 0 });
    if (!result?.success || !result.entry?.id) { rollback(); return { success: false, reason: result?.reason || 'hint_not_recorded' }; }
    receiptAttempted = true;
    commitReceipt(result.entry);
  } catch (error) {
    rollback();
    return { success: false, reason: 'hint_not_recorded', error };
  }
  const beforeEnergy = energy.currentEnergy;
  let payment;
  try {
    payment = energy.consumeCustom(cost.energy, `Case Theory hint (${method})`,
      { requireFullAmount: true, activityType: 'case_theory_hint' });
  } catch (error) {
    // A notification may throw after EnergyManager has already debited the balance.
    // In that case keep the recorded hint and receipt: the player receives what they paid for.
    if (Number.isFinite(beforeEnergy) && energy.currentEnergy < beforeEnergy) {
      return { ...result, success: true, saved: false, paymentWarning: true, error };
    }
    rollback();
    return { success: false, reason: 'payment_failed', error };
  }
  if (!payment?.success) { rollback(); return { success: false, reason: payment?.reason || 'payment_failed', message: payment?.message }; }
  return { ...result, payment };
}
