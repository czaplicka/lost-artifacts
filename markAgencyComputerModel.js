import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
export function buildReportForm(state, locations = []) {
  const raw = state.currentMission?.artifact;
  const artifact = typeof raw === 'string' ? raw.trim() : raw?.name?.trim?.();
  const suspect = state.currentThief?.name?.trim?.();
  if (!artifact || !suspect || !Array.isArray(state.escapeRoute)) {
    return { ok: false, error: __dialogueText("markAgencyComputerModel.js", "t_a559e5b2b10512ddbda9") };
  }
  const fields = [{ id: 'artifact', hint: __dialogueText("markAgencyComputerModel.js", "t_7fbd7ef36fdd97293aa5"), answer: __dialogueText("markAgencyComputerModel.js", "t_468edda7e41b513916df"), label: artifact }];
  for (let i = 0; i < state.escapeRoute.length; i++) {
    const city = locations.find(location => location.id === state.escapeRoute[i]);
    if (!city?.city) return { ok: false, error: `${__dialogueText("markAgencyComputerModel.js", "t_a93cdc417ade19261584")}${i + 1}${__dialogueText("markAgencyComputerModel.js", "t_cdb4ee2aea69cc6a8333")}` };
    fields.push({ id: `route:${i}`, hint: `${__dialogueText("markAgencyComputerModel.js", "t_36c352d9329d3447af0f")}${i + 1}`, answer: `${__dialogueText("markAgencyComputerModel.js", "t_c8aefa6c96fc3b0ba3be")}${i}`, label: city.city });
  }
  fields.push({ id: 'suspect', hint: __dialogueText("markAgencyComputerModel.js", "t_edfa2c31b6de69133e64"), answer: __dialogueText("markAgencyComputerModel.js", "t_758b9d51e159b04146f1"), label: suspect });
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
    if (entry.source === 'agency') return [{ ...entry, accountLabel: __dialogueText("markAgencyComputerModel.js", "t_86f357cfb8c2c1002c12"),
      displayAmount: entry.amount, prefix: entry.type === 'reset' ? '' : income.has(entry.type) ? '+' : '-' }];
    if (entry.type === 'debt') return [{ ...entry, accountLabel: __dialogueText("markAgencyComputerModel.js", "t_e296e76599d0dfd9c8a8"), displayAmount: entry.amount, prefix: __dialogueText("markAgencyComputerModel.js", "t_0aa8c9f301e65c4456f7") }];
    if (entry.type === 'mission_settled' && Number(entry.metadata?.debtPaid) > 0) {
      return [{ ...entry, accountLabel: __dialogueText("markAgencyComputerModel.js", "t_19490b115f966f0fee52"), displayAmount: Number(entry.metadata.debtPaid), prefix: __dialogueText("markAgencyComputerModel.js", "t_b19f90ae30ebba9303bb") }];
    }
    return [];
  });
}
