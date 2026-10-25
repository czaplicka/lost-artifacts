import { gameState } from './GameData.js';
import { inventoryManager } from './managers/InventoryManager.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { HQ_CITY, HQ_ID } from './TransportConfig.js';

const catalog = await loadJson('./assets/data/ItemsCatalog.json', import.meta.url);
export const REPORT_ITEM_ID = 'agency_mission_report';
export const RECEIPTS_KEY = 'archive_submitted_reports';
const ISSUED_KEY = 'archive_issued_reports';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function getArchiveCaseId(state = gameState) {
  const value = [state.currentCaseId, state.currentMission?.caseId,
    state.currentMission?.id, state.currentMission?.missionId].find(value =>
    (typeof value === 'string' && value.trim()) ||
    (typeof value === 'number' && Number.isFinite(value)));
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
  if (id === null) return false;
  return own(record(MainStoryManager.getSideClue(RECEIPTS_KEY)), `report:${id}`);
}

export function canRequestNextMission(state = gameState) {
  return isArchivistPresent(state) && isReportSubmitted(state);
}

export function ensureMissionReport(state = gameState) {
  if (!isArchivistPresent(state)) return { status: 'unavailable', changed: false };
  if (isReportSubmitted(state)) return { status: 'submitted', changed: false };
  const caseId = getArchiveCaseId(state);
  const existing = inventoryManager.getItem(REPORT_ITEM_ID);
  if (existing) {
    return { status: String(existing.metadata?.caseId) === caseId ? 'ready' : 'conflict', changed: false };
  }
  const key = `report:${caseId}`;
  const issued = record(MainStoryManager.getSideClue(ISSUED_KEY));
  let changed = false;
  let item = own(issued, key) ? issued[key] : null;
  if (!item) {
    const template = catalog?.documents?.agencyMissionReport;
    if (template?.id !== REPORT_ITEM_ID) throw new Error('Mission report is missing from ItemsCatalog.json.');
    item = {
      ...structuredClone(template),
      addedAt: Date.now(), quantity: 1,
      metadata: {
        ...template.metadata, caseId, reportId: caseId,
        outcome: 'SUCCESS', missionId: state.currentMission?.id ?? null,
        thiefName: state.currentThief?.name ?? null,
        artifact: state.currentMission?.artifact ?? null,
        city: state.currentMission?.city ?? null
      }
    };
    MainStoryManager.setSideClue(ISSUED_KEY, { ...issued, [key]: item });
    changed = true;
  }
  const capacity = inventoryManager.getCapacity();
  if (capacity.current >= capacity.max) return { status: 'full', changed };
  return inventoryManager.addItem(item)
    ? { status: 'ready', changed: true }
    : { status: 'blocked', changed };
}

export function submitMissionReport(itemId, addedAt, state = gameState) {
  if (!isArchivistPresent(state)) return { ok: false, reason: 'unavailable' };
  if (isReportSubmitted(state)) return { ok: false, reason: 'submitted' };
  const item = inventoryManager.getItem(itemId);
  const caseId = getArchiveCaseId(state);
  if (item?.id !== REPORT_ITEM_ID || item.addedAt !== addedAt ||
      String(item.metadata?.caseId) !== caseId) return { ok: false, reason: 'wrong_report' };
  const key = `report:${caseId}`;
  const receipts = record(MainStoryManager.getSideClue(RECEIPTS_KEY));
  const snapshot = inventoryManager.serializeItem(item);
  // Register first, so inventory events cannot recreate the submitted report.
  MainStoryManager.setSideClue(RECEIPTS_KEY, {
    ...receipts, [key]: { npcId: 'archivist_drebin', report: snapshot, submittedAt: Date.now() }
  });
  if (!inventoryManager.removeItem(itemId)) {
    MainStoryManager.setSideClue(RECEIPTS_KEY, receipts);
    return { ok: false, reason: 'remove_failed' };
  }
  return { ok: true, saved: saveGameState() };
}

export function moveStateToHeadquarters(locations = [], state = gameState) {
  const hq = Array.isArray(locations)
    ? locations.find(location => location.id === HQ_ID || location.city === HQ_CITY) : null;
  state.updateState({
    currentCity: hq?.city ?? HQ_CITY, currentCityId: HQ_ID,
    currentCityData: hq ? structuredClone(hq) : null,
    currentEncounterId: null, canonicalTravelCityId: HQ_ID,
    justReachedCorrectCityId: null
  });
}
