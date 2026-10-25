const text = value => typeof value === 'string' ? value.trim() : '';
export function buildReportForm(state, locations = []) {
  const artifact = text(typeof state.currentMission?.artifact === 'object'
    ? state.currentMission.artifact?.name : state.currentMission?.artifact);
  const suspect = text(state.currentThief?.name);
  if (!artifact || !suspect || !Array.isArray(state.escapeRoute)) {
    return { ok: false, error: 'Case data is incomplete. The report cannot be prepared.' };
  }
  const fields = [{ id: 'artifact', hint: 'ARTIFACT', answer: 'artifact:main', label: artifact }];
  for (let index = 0; index < state.escapeRoute.length; index += 1) {
    const cityId = state.escapeRoute[index];
    const city = locations.find(location => location.id === cityId);
    if (!text(city?.city)) return { ok: false, error: `City data is missing for route stop ${index + 1}.` };
    fields.push({ id: `route:${index}`, hint: `CITY ${index + 1}`, answer: `city:${index}`, label: city.city });
  }
  fields.push({ id: 'suspect', hint: 'SUSPECT', answer: 'suspect:main', label: suspect });
  return {
    ok: true, fields,
    signature: JSON.stringify(fields.map(field => [field.id, field.answer, field.label])),
    options: fields.map(field => ({ id: field.answer, label: field.label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'en'))
  };
}
export function sanitizeReportAnswers(form, input = {}) {
  const result = {};
  const used = new Set();
  const allowed = new Set(form.options.map(option => option.id));
  for (const field of form.fields) {
    const value = input && typeof input === 'object' ? input[field.id] : null;
    if (allowed.has(value) && !used.has(value)) { result[field.id] = value; used.add(value); }
  }
  return result;
}
export function validateReportAnswers(form, input = {}) {
  const answers = sanitizeReportAnswers(form, input);
  const errors = form.fields.filter(field => answers[field.id] !== field.answer).map(field => field.id);
  return { ok: errors.length === 0, errors, answers };
}
