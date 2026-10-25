import { gameState } from './GameData.js';
import { inventoryManager } from './managers/InventoryManager.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { HQ_CITY, HQ_ID } from './TransportConfig.js';
import { buildReportForm, cleanReportAnswers, validateReportAnswers } from './markAgencyComputerModel.js';

const catalog = await loadJson('./assets/data/ItemsCatalog.json', import.meta.url);
export const REPORT_ITEM_ID = 'agency_mission_report';
export const RECEIPTS_KEY = 'archive_submitted_reports';
export const DRAFTS_KEY = 'mission_report_drafts';
const ISSUED_KEY = 'archive_issued_reports';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const read = key => record(MainStoryManager.getSideClue(key));

export function getArchiveCaseId(state = gameState) {
  const value = [state.currentCaseId, state.currentMission?.caseId,
    state.currentMission?.id, state.currentMission?.missionId].find(value =>
    (typeof value === 'string' && value.trim()) || (typeof value === 'number' && Number.isFinite(value)));
  return value === undefined ? null : String(value);
}
export function isSuccessfulCase(state = gameState) {
  return state.caseResolved === true && state.caseFailed !== true &&
    state.finalArrestResult === 'SUCCESS' && state.isGameActive !== true;
}
export function isArchivistPresent(state = gameState) {
  return getArchiveCaseId(state) !== null && isSuccessfulCase(state);
}
export function isReportSubmitted(state = gameState) {
  const id = getArchiveCaseId(state);
  return id !== null && own(read(RECEIPTS_KEY), `report:${id}`);
}
export function canRequestNextMission(state = gameState) {
  return isArchivistPresent(state) && isReportSubmitted(state);
}
export function getMissionReportForm(locations = [], state = gameState) {
  if (!isArchivistPresent(state)) return { ok: false, error: 'Complete a mission successfully before writing its report.' };
  const form = buildReportForm(state, locations);
  if (!form.ok) return form;
  const caseId = getArchiveCaseId(state), draft = read(DRAFTS_KEY)[`report:${caseId}`];
  const matches = draft?.signature === form.signature;
  return { ...form, caseId, answers: matches ? cleanReportAnswers(form, draft.answers) : {},
    printed: matches && draft.printed === true, submitted: isReportSubmitted(state) };
}
export function saveMissionReportDraft(answers, locations = [], state = gameState) {
  const form = getMissionReportForm(locations, state);
  if (!form.ok || form.printed || form.submitted) return { ok: false };
  MainStoryManager.setSideClue(DRAFTS_KEY, { ...read(DRAFTS_KEY), [`report:${form.caseId}`]: {
    signature: form.signature, answers: cleanReportAnswers(form, answers), printed: false
  } });
  return { ok: true, saved: saveGameState() };
}
export function printMissionReport(answers, locations = [], state = gameState) {
  const form = getMissionReportForm(locations, state);
  if (!form.ok) return { ok: false, reason: 'unavailable', error: form.error };
  if (form.submitted) return { ok: false, reason: 'submitted' };
  const validation = validateReportAnswers(form, answers);
  if (!validation.ok) return { ok: false, reason: 'incorrect', errors: validation.errors };
  const key = `report:${form.caseId}`, drafts = read(DRAFTS_KEY);
  MainStoryManager.setSideClue(DRAFTS_KEY, { ...drafts, [key]: { signature: form.signature,
    answers: validation.answers, printed: true, printedAt: drafts[key]?.printedAt ?? Date.now() } });
  const result = ensureMissionReport(state);
  return { ok: result.status === 'ready', reason: result.status, saved: saveGameState() };
}
export function ensureMissionReport(state = gameState) {
  if (!isArchivistPresent(state)) return { status: 'unavailable', changed: false };
  if (isReportSubmitted(state)) return { status: 'submitted', changed: false };
  const caseId = getArchiveCaseId(state), key = `report:${caseId}`;
  const issued = read(ISSUED_KEY), existing = inventoryManager.getItem(REPORT_ITEM_ID);
  if (existing) return { status: String(existing.metadata?.caseId) === caseId ? 'ready' : 'conflict', changed: false };
  const legacy = own(issued, key) && issued[key]?.metadata?.reportFormat !== 'fill-in-v1';
  if (!legacy && read(DRAFTS_KEY)[key]?.printed !== true) return { status: 'draft', changed: false };
  let item = own(issued, key) ? issued[key] : null, changed = false;
  if (!item) {
    const template = catalog?.documents?.agencyMissionReport;
    if (template?.id !== REPORT_ITEM_ID) throw new Error('Mission report is missing from ItemsCatalog.json.');
    item = { ...structuredClone(template), addedAt: Date.now(), quantity: 1,
      metadata: { ...template.metadata, caseId, reportId: caseId, outcome: 'SUCCESS',
        reportFormat: 'fill-in-v1', missionId: state.currentMission?.id ?? null,
        thiefName: state.currentThief?.name ?? null, artifact: state.currentMission?.artifact ?? null,
        city: state.currentMission?.city ?? null, escapeRoute: [...(state.escapeRoute ?? [])] } };
    MainStoryManager.setSideClue(ISSUED_KEY, { ...issued, [key]: item }); changed = true;
  }
  const capacity = inventoryManager.getCapacity();
  if (capacity.current >= capacity.max) return { status: 'full', changed };
  return inventoryManager.addItem(item) ? { status: 'ready', changed: true } : { status: 'blocked', changed };
}
export function submitMissionReport(itemId, addedAt, state = gameState) {
  if (!isArchivistPresent(state)) return { ok: false, reason: 'unavailable' };
  if (isReportSubmitted(state)) return { ok: false, reason: 'submitted' };
  const item = inventoryManager.getItem(itemId), caseId = getArchiveCaseId(state);
  if (item?.id !== REPORT_ITEM_ID || item.addedAt !== addedAt || String(item.metadata?.caseId) !== caseId) {
    return { ok: false, reason: 'wrong_report' };
  }
  const key = `report:${caseId}`;
  if (item.metadata?.reportFormat === 'fill-in-v1' && read(DRAFTS_KEY)[key]?.printed !== true) {
    return { ok: false, reason: 'not_printed' };
  }
  const receipts = read(RECEIPTS_KEY), snapshot = inventoryManager.serializeItem(item);
  MainStoryManager.setSideClue(RECEIPTS_KEY, { ...receipts,
    [key]: { npcId: 'archivist_drebin', report: snapshot, submittedAt: Date.now() } });
  if (!inventoryManager.removeItem(itemId)) {
    MainStoryManager.setSideClue(RECEIPTS_KEY, receipts); return { ok: false, reason: 'remove_failed' };
  }
  return { ok: true, saved: saveGameState() };
}
export function moveStateToHeadquarters(locations = [], state = gameState) {
  const hq = Array.isArray(locations) ? locations.find(location => location.id === HQ_ID || location.city === HQ_CITY) : null;
  state.updateState({ currentCity: hq?.city ?? HQ_CITY, currentCityId: HQ_ID,
    currentCityData: hq ? structuredClone(hq) : null, currentEncounterId: null,
    canonicalTravelCityId: HQ_ID, justReachedCorrectCityId: null });
}
