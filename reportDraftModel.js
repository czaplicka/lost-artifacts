import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
const text = value => typeof value === 'string' ? value.trim() : '';
export function buildReportForm(state, locations = []) {
  const artifact = text(typeof state.currentMission?.artifact === 'object'
    ? state.currentMission.artifact?.name : state.currentMission?.artifact);
  const suspect = text(state.currentThief?.name);
  if (!artifact || !suspect || !Array.isArray(state.escapeRoute)) {
    return { ok: false, error: __dialogueText("reportDraftModel.js", "t_a559e5b2b10512ddbda9") };
  }
  const fields = [{ id: 'artifact', hint: __dialogueText("reportDraftModel.js", "t_7fbd7ef36fdd97293aa5"), answer: __dialogueText("reportDraftModel.js", "t_468edda7e41b513916df"), label: artifact }];
  for (let index = 0; index < state.escapeRoute.length; index += 1) {
    const cityId = state.escapeRoute[index];
    const city = locations.find(location => location.id === cityId);
    if (!text(city?.city)) return { ok: false, error: `${__dialogueText("reportDraftModel.js", "t_a93cdc417ade19261584")}${index + 1}${__dialogueText("reportDraftModel.js", "t_cdb4ee2aea69cc6a8333")}` };
    fields.push({ id: `route:${index}`, hint: `${__dialogueText("reportDraftModel.js", "t_36c352d9329d3447af0f")}${index + 1}`, answer: `${__dialogueText("reportDraftModel.js", "t_c8aefa6c96fc3b0ba3be")}${index}`, label: city.city });
  }
  fields.push({ id: 'suspect', hint: __dialogueText("reportDraftModel.js", "t_edfa2c31b6de69133e64"), answer: __dialogueText("reportDraftModel.js", "t_758b9d51e159b04146f1"), label: suspect });
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
