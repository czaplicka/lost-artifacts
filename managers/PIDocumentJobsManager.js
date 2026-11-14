import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { getGameTimeInSeconds } from '../CaseTimeHelper.js';
import { getGameTimeManager } from './GameTimeManager.js';
import { moneyManager, ECONOMY_CATEGORY } from './MoneyManager.js';
import { requestAutosave } from '../gameStatePersistence.js';

const KEY = 'piDocumentJobs';
let busy = false;
const clone = value => JSON.parse(JSON.stringify(value));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
function state() {
  const raw = gameState[KEY];
  return { version: 1, jobs: raw?.jobs && typeof raw.jobs === 'object' && !Array.isArray(raw.jobs)
    ? clone(raw.jobs) : {} };
}
function save(value) { gameState[KEY] = clone(value); requestAutosave(); }
function clock() { return Math.max(0, getGameTimeInSeconds()); }
function day() { return Math.floor(clock() / 86400) + 1; }
export function ownsPrinter() { return own(gameState.piOfficeShop?.owned, 'office_printer'); }
export function validateDocumentCatalog(data) {
  if (data?.version !== 1 || !Number.isSafeInteger(data.dailyLimit) || data.dailyLimit < 1 || data.dailyLimit > 5 ||
      !Number.isSafeInteger(data.durationMinutes) || data.durationMinutes < 1 ||
      !Number.isSafeInteger(data.reward) || data.reward < 1 ||
      !Array.isArray(data.templates) || data.templates.length < data.dailyLimit) throw Error('Invalid document catalog.');
  const ids = new Set();
  for (const template of data.templates) {
    if (!/^[a-z][a-z0-9_]*$/.test(template?.id) || ids.has(template.id) ||
        typeof template.title !== 'string' || typeof template.description !== 'string' ||
        !Array.isArray(template.fields) || template.fields.length !== 3) throw Error('Invalid document template.');
    ids.add(template.id);
    let errors = 0;
    const labels = new Set();
    for (const field of template.fields) {
      if (typeof field?.label !== 'string' || labels.has(field.label) ||
          typeof field.source !== 'string' || typeof field.draft !== 'string' ||
          !Array.isArray(field.options) || field.options.length !== 3 ||
          field.options.some(value => typeof value !== 'string') ||
          new Set(field.options).size !== 3 || !field.options.includes(field.source)) throw Error('Invalid document field.');
      labels.add(field.label);
      if (field.source !== field.draft) errors++;
    }
    if (errors !== 1) throw Error('Exactly one print error is required.');
  }
  return data;
}
function templatesForToday(catalog) {
  const start = ((day() - 1) * catalog.dailyLimit) % catalog.templates.length;
  return Array.from({ length: catalog.dailyLimit }, (_, index) => catalog.templates[(start + index) % catalog.templates.length]);
}
export function getDocumentJobs(catalog) {
  validateDocumentCatalog(catalog);
  if (!ownsPrinter()) return [];
  const s = state();
  const active = Object.values(s.jobs).filter(job => job.status !== 'completed');
  const todays = templatesForToday(catalog).map(template => {
    const id = `day_${day()}_${template.id}`;
    return s.jobs[id] || { id, day: day(), status: 'available', title: template.title,
      templateId: template.id, reward: catalog.reward, durationMinutes: catalog.durationMinutes };
  });
  const result = new Map(active.map(job => [job.id, job]));
  todays.forEach(job => result.set(job.id, job));
  return [...result.values()];
}
export function getDocumentJob(id) { return state().jobs[id] || null; }
function chargeTime(job) {
  if (job.timeCharged) return true;
  const target = job.startedAt + job.durationMinutes * 60;
  const remaining = Math.max(0, Math.ceil((target - clock()) / 60));
  try { if (remaining > 0) getGameTimeManager().handleAdvanceTime(0, remaining); }
  catch (error) { console.error('[PIDocumentJobs] Time notification failed:', error); }
  const s = state(), current = s.jobs[job.id];
  if (!current) return false;
  current.timeCharged = clock() >= target;
  save(s);
  return current.timeCharged;
}
export function startDocumentJob(catalog, id) {
  if (busy || !ownsPrinter()) return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_87744cad9f66da686549") };
  validateDocumentCatalog(catalog);
  const offer = getDocumentJobs(catalog).find(job => job.id === id);
  if (!offer || offer.status === 'completed') return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_67835f17f9ce2d2dd5c1") };
  const s = state();
  // Finish the current document before starting another day’s offer.
  if (Object.values(s.jobs).some(job => job.id !== id && job.status !== 'completed')) {
    return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_81a2e0471896f51273ef") };
  }
  busy = true;
  try {
    if (!s.jobs[id]) {
      const template = catalog.templates.find(entry => entry.id === offer.templateId);
      // Rotate the erroneous field and answer order so the same button is not always correct.
      const fields = clone(template.fields);
      const rotation = (offer.day + catalog.templates.indexOf(template)) % fields.length;
      const rotated = fields.slice(rotation).concat(fields.slice(0, rotation));
      rotated.forEach((field, index) => {
        const shift = (offer.day + index) % field.options.length;
        field.options = field.options.slice(shift).concat(field.options.slice(0, shift));
      });
      s.jobs[id] = { ...offer, description: template.description, fields: rotated,
        status: 'active', startedAt: clock(), timeCharged: false, fieldChecked: false, corrected: false, attempts: 0 };
      save(s);
    }
    const charged = chargeTime(state().jobs[id]);
    return { ok: charged, jobId: id, message: charged
      ? __dialogueText("managers/PIDocumentJobsManager.js", "t_c8f408ec897d085ec5bf")
      : __dialogueText("managers/PIDocumentJobsManager.js", "t_0ab69b0089fa42cc7e0d") };
  } finally { busy = false; }
}
export function answerDocumentJob(id, stage, index) {
  if (busy || !ownsPrinter()) return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_817d66f28830c81b1c4c") };
  const s = state(), job = s.jobs[id];
  if (!job || job.status !== 'active' || !job.timeCharged || !Number.isInteger(index)) {
    return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_eab281f7a64eca88e37c") };
  }
  const errorIndex = job.fields.findIndex(field => field.source !== field.draft);
  const field = job.fields[errorIndex];
  if (stage === 'field' && !job.fieldChecked) {
    if (index < 0 || index >= job.fields.length) return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_bc93291692e2c86b16db") };
    job.attempts++;
    if (index !== errorIndex) { save(s); return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_e3de9eb8e3a0ee07781a") }; }
    job.fieldChecked = true;
    save(s);
    return { ok: true, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_57f8642bf78a14d3f101") };
  }
  if (stage === 'value' && job.fieldChecked && !job.corrected) {
    if (index < 0 || index >= field.options.length) return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_07d0c3ccd800ca265d95") };
    job.attempts++;
    if (field.options[index] !== field.source) { save(s); return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_579e94d525cc812cbf11") }; }
    job.corrected = true;
    save(s);
    return { ok: true, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_f34463794d122b020e58") };
  }
  return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_2c9e6cf87ba9653e83ff") };
}
export function deliverDocumentJob(id) {
  if (busy || !ownsPrinter()) return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_817d66f28830c81b1c4c") };
  const s = state(), job = s.jobs[id];
  if (!job || job.status === 'completed' || !job.corrected || !job.timeCharged) {
    return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_f6b3fdfecb6c9758a185") };
  }
  if (!Number.isSafeInteger(job.reward) || job.reward <= 0) return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_efb36270d8b4db644ca9") };
  const paymentId = `pi-document:${job.id}`;
  const recorded = () => (gameState.moneyLog || []).some(entry => entry.type === 'income' &&
    entry.source === 'cash' && entry.metadata?.documentSettlementId === paymentId);
  const before = moneyManager.getState();
  busy = true;
  try {
    job.status = 'paying';
    save(s);
    if (!job.paid && !recorded()) {
      try {
        moneyManager.addCash(job.reward, {
          category: ECONOMY_CATEGORY.SIDE_CASE, description: `${__dialogueText("managers/PIDocumentJobsManager.js", "t_be70c587735c243e73e1")}${job.title}`,
          missionId: null, metadata: { documentSettlementId: paymentId,
            documentJobId: job.id, clericalIncome: true }
        });
      } catch (error) {
        if (!recorded()) {
          gameState.cash = before.cash;
          gameState.moneyLog = before.moneyLog;
          throw error;
        }
        console.error('[PIDocumentJobs] Payment notification failed after commit:', error);
      }
    }
    job.paid = true;
    job.status = 'completed';
    job.completedAt = clock();
    save(s);
    return { ok: true, message: `${__dialogueText("managers/PIDocumentJobsManager.js", "t_09fc96082d34c2dfc129")}${job.reward}${__dialogueText("managers/PIDocumentJobsManager.js", "t_032dc125b670a4b08dca")}` };
  } catch (error) {
    console.error('[PIDocumentJobs] Delivery failed:', error);
    requestAutosave();
    return { ok: false, message: __dialogueText("managers/PIDocumentJobsManager.js", "t_e5c3749e03848527fbeb") };
  } finally { busy = false; }
}
