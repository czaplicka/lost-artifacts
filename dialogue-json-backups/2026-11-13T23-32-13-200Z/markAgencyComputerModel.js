export function buildReportForm(state, locations = []) {
  const raw = state.currentMission?.artifact;
  const artifact = typeof raw === 'string' ? raw.trim() : raw?.name?.trim?.();
  const suspect = state.currentThief?.name?.trim?.();
  if (!artifact || !suspect || !Array.isArray(state.escapeRoute)) {
    return { ok: false, error: 'Case data is incomplete. The report cannot be prepared.' };
  }
  const fields = [{ id: 'artifact', hint: 'ARTIFACT', answer: 'artifact:main', label: artifact }];
  for (let i = 0; i < state.escapeRoute.length; i++) {
    const city = locations.find(location => location.id === state.escapeRoute[i]);
    if (!city?.city) return { ok: false, error: `City data is missing for route stop ${i + 1}.` };
    fields.push({ id: `route:${i}`, hint: `CITY ${i + 1}`, answer: `city:${i}`, label: city.city });
  }
  fields.push({ id: 'suspect', hint: 'SUSPECT', answer: 'suspect:main', label: suspect });
  return { ok: true, fields, signature: JSON.stringify(fields),
    options: fields.map(field => ({ id: field.answer, label: field.label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'en')) };
}
export function cleanReportAnswers(form, input = {}) {
  const result = {}, used = new Set(), allowed = new Set(form.options.map(option => option.id));
  for (const field of form.fields) {
    const value = input && typeof input === 'object' ? input[field.id] : null;
    if (allowed.has(value) && !used.has(value)) { result[field.id] = value; used.add(value); }
  }
  return result;
}
export function validateReportAnswers(form, input = {}) {
  const answers = cleanReportAnswers(form, input);
  const errors = form.fields.filter(field => answers[field.id] !== field.answer).map(field => field.id);
  return { ok: !errors.length, errors, answers };
}
export function agencyLedgerRows(entries = []) {
  const income = new Set(['income', 'refund', 'mission_started', 'mission_settled']);
  return entries.flatMap(entry => {
    if (entry.source === 'agency') return [{ ...entry, accountLabel: 'Agency',
      displayAmount: entry.amount, prefix: entry.type === 'reset' ? '' : income.has(entry.type) ? '+' : '-' }];
    if (entry.type === 'debt') return [{ ...entry, accountLabel: 'Agency debt', displayAmount: entry.amount, prefix: 'DEBT +' }];
    if (entry.type === 'mission_settled' && Number(entry.metadata?.debtPaid) > 0) {
      return [{ ...entry, accountLabel: 'Debt repaid', displayAmount: Number(entry.metadata.debtPaid), prefix: 'DEBT -' }];
    }
    return [];
  });
}
