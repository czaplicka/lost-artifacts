import { dialogueText as __dialogueText } from './dialogues/DialogueText.js';
import { EventBus } from './EventBus.js';
import { gameState } from './GameData.js';
import { inventoryManager } from './managers/InventoryManager.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { HQ_CITY, HQ_ID } from './TransportConfig.js';
import { buildReportForm, cleanReportAnswers, validateReportAnswers } from './markAgencyComputerModel.js';
import { getReportIncident, ensureReportIncident, selectReportIncident, approveReportIncident, resolveReportIncident } from './managers/ReportIncidentService.js';

const catalog = await loadJson('./assets/data/ItemsCatalog.json', import.meta.url);
export const REPORT_ITEM_ID = 'agency_mission_report';
export const RECEIPTS_KEY = 'archive_submitted_reports';
export const DRAFTS_KEY = 'mission_report_drafts';
const ISSUED_KEY = 'archive_issued_reports';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const read = key => record(MainStoryManager.getSideClue(key));
let reportBusy = false;
const recoveryBlockedCases = new Set();
const failureText = 'The report could not be saved. Check browser storage and try again.';

function unavailableChange(caseId) {
  if (reportBusy) return { ok: false, saved: false, reason: 'busy', error: 'A report operation is already in progress.' };
  if (recoveryBlockedCases.has(caseId)) return {
    ok: false, saved: false, reason: 'recovery_required',
    error: 'Report recovery was incomplete. Reload a known-good save before continuing.'
  };
  return null;
}

function takeReportSnapshot() {
  return {
    story: structuredClone(MainStoryManager.serialize()),
    inventory: structuredClone(inventoryManager.exportState()),
    selectedItemId: inventoryManager.getSelectedItem()?.id ?? null,
    inventoryOpen: inventoryManager.isOpen === true
  };
}

function restoreReportSnapshot(snapshot) {
  const errors = [];
  try {
    if (MainStoryManager.deserialize(snapshot.story) !== true) throw Error('Story restoration was rejected.');
    gameState.mainStory = MainStoryManager.serialize();
  } catch (error) { errors.push(error); }
  try {
    if (inventoryManager.importState(snapshot.inventory) !== true) throw Error('Inventory restoration was rejected.');
    if (snapshot.selectedItemId !== null && inventoryManager.selectItem(snapshot.selectedItemId) !== true) {
      throw Error('Inventory selection could not be restored.');
    }
    if (snapshot.inventoryOpen) inventoryManager.open();
  } catch (error) { errors.push(error); }
  return errors;
}

function commitReportChange(caseId, change) {
  const blocked = unavailableChange(caseId);
  if (blocked) return blocked;
  let snapshot;
  try { snapshot = takeReportSnapshot(); }
  catch (error) {
    console.error('[Archive report] Snapshot failed:', error);
    return { ok: false, saved: false, reason: 'snapshot_failed', error: failureText };
  }
  reportBusy = true;
  let result;
  let failure = null;
  try {
    result = change();
    // A full bag may still leave a successfully printed report waiting for collection.
    const { commit = false, noChange = false, ...publicResult } = result;
    if (result.ok === false && !commit) {
      failure = publicResult;
    } else {
      if (!noChange && saveGameState() !== true) throw Error('Report persistence was not confirmed.');
      return { ...publicResult, saved: true };
    }
  } catch (error) {
    console.error('[Archive report] Operation failed:', error);
    failure = { ok: false, saved: false, reason: 'save_failed', error: failureText };
  } finally {
    // Keep the gate closed while restoring, including synchronous inventory listeners.
    if (failure) {
      const rollbackErrors = restoreReportSnapshot(snapshot);
      if (rollbackErrors.length) {
        recoveryBlockedCases.add(caseId);
        console.error('[Archive report] Recovery incomplete:', rollbackErrors);
        failure = {
          ok: false, saved: false, reason: 'recovery_required',
          error: 'Report recovery was incomplete. Reload a known-good save before continuing.'
        };
      }
    }
    reportBusy = false;
  }
  return { ...failure, ok: false, saved: false };
}

// A successful complete load replaces all report state and clears recovery quarantine.
EventBus.on('gameState:restored', () => { recoveryBlockedCases.clear(); });

export function getArchiveCaseId(state = gameState) {
  const value = [state.currentCaseId, state.currentMission?.caseId, state.currentMission?.id, state.currentMission?.missionId].find(value =>
    (typeof value === 'string' && value.trim()) || (typeof value === 'number' && Number.isFinite(value)));
  return value === undefined ? null : String(value);
}
export function isSuccessfulCase(state = gameState) {
  return state.caseResolved === true && state.caseFailed !== true && state.finalArrestResult === 'SUCCESS' && state.isGameActive !== true;
}
export function isArchivistPresent(state = gameState) {
  return getArchiveCaseId(state) !== null && isSuccessfulCase(state);
}
export function isReportSubmitted(state = gameState) {
  const id = getArchiveCaseId(state);
  return !reportBusy && id !== null && !recoveryBlockedCases.has(id) && own(read(RECEIPTS_KEY), `report:${id}`);
}
export function canRequestNextMission(state = gameState) {
  return !reportBusy && isArchivistPresent(state) && isReportSubmitted(state);
}
export function getMissionReportForm(locations = [], state = gameState) {
  if (!isArchivistPresent(state)) return { ok: false, error: __dialogueText('archiveReportService.js', 't_86273f9de28a2d16b3c5') };
  const caseId = getArchiveCaseId(state);
  const blocked = unavailableChange(caseId);
  if (blocked) return blocked;
  const form = buildReportForm(state, locations);
  if (!form.ok) return form;
  const key = `report:${caseId}`, draft = read(DRAFTS_KEY)[key];
  const matches = draft?.signature === form.signature, submitted = isReportSubmitted(state);
  const legacy = submitted || draft?.printed === true || own(read(ISSUED_KEY), key) || String(inventoryManager.getItem(REPORT_ITEM_ID)?.metadata?.caseId) === caseId;
  let incident = getReportIncident(caseId);
  if (!incident) {
    const result = commitReportChange(caseId, () => {
      const allocated = ensureReportIncident(caseId, { legacy });
      return { ok: true, incident: allocated, noChange: !allocated };
    });
    if (!result.ok) return result;
    incident = result.incident;
  }
  return { ...form, caseId, answers: matches ? cleanReportAnswers(form, draft.answers) : {},
    printed: matches && draft.printed === true, submitted, incident };
}
export function saveMissionReportIncidentChoice(choiceId, locations = [], state = gameState) {
  const form = getMissionReportForm(locations, state);
  if (!form.ok) return form;
  if (form.printed || form.submitted) return { ok: false };
  return commitReportChange(form.caseId, () => {
    if (!selectReportIncident(form.caseId, choiceId)) return { ok: false };
    return { ok: true };
  });
}
export function saveMissionReportDraft(answers, locations = [], state = gameState) {
  const form = getMissionReportForm(locations, state);
  if (!form.ok) return form;
  if (form.printed || form.submitted) return { ok: false };
  return commitReportChange(form.caseId, () => {
    MainStoryManager.setSideClue(DRAFTS_KEY, { ...read(DRAFTS_KEY), [`report:${form.caseId}`]: {
      signature: form.signature, answers: cleanReportAnswers(form, answers), printed: false
    } });
    return { ok: true };
  });
}
export function printMissionReport(answers, locations = [], state = gameState) {
  const form = getMissionReportForm(locations, state);
  if (!form.ok) return { ...form, ok: false, reason: form.reason || 'unavailable' };
  if (form.submitted) return { ok: false, reason: 'submitted' };
  const validation = validateReportAnswers(form, answers);
  if (!validation.ok) return { ok: false, reason: 'incorrect', errors: validation.errors };
  const key = `report:${form.caseId}`, drafts = read(DRAFTS_KEY), existing = inventoryManager.getItem(REPORT_ITEM_ID);
  if (existing && String(existing.metadata?.caseId) !== form.caseId) return { ok: false, reason: 'conflict' };
  return commitReportChange(form.caseId, () => {
    if (!approveReportIncident(form.caseId)) return {
      ok: false, reason: 'incident_required', error: __dialogueText('archiveReportService.js', 't_ccdcdaf7f396874a50b7')
    };
    MainStoryManager.setSideClue(DRAFTS_KEY, { ...drafts, [key]: {
      signature: form.signature, answers: validation.answers, printed: true,
      printedAt: drafts[key]?.printedAt ?? Date.now()
    } });
    const result = ensureMissionReportInternal(state);
    return { ok: result.status === 'ready', reason: result.status, commit: true };
  });
}
export function ensureMissionReport(state = gameState) {
  if (reportBusy) return { status: 'blocked', changed: false };
  return ensureMissionReportInternal(state);
}
function ensureMissionReportInternal(state = gameState) {
  if (!isArchivistPresent(state) || recoveryBlockedCases.has(getArchiveCaseId(state))) return { status: 'unavailable', changed: false };
  if (isReportSubmitted(state)) return { status: 'submitted', changed: false };
  const caseId = getArchiveCaseId(state), key = `report:${caseId}`;
  const issued = read(ISSUED_KEY), existing = inventoryManager.getItem(REPORT_ITEM_ID);
  if (existing) return { status: String(existing.metadata?.caseId) === caseId ? 'ready' : 'conflict', changed: false };
  const legacy = own(issued, key) && issued[key]?.metadata?.reportFormat !== 'fill-in-v1';
  if (!legacy && read(DRAFTS_KEY)[key]?.printed !== true) return { status: 'draft', changed: false };
  let item = own(issued, key) ? issued[key] : null, changed = false;
  if (!item) {
    const template = catalog?.documents?.agencyMissionReport;
    if (template?.id !== REPORT_ITEM_ID) throw Error('Mission report is missing from ItemsCatalog.json.');
    const incident = getReportIncident(caseId);
    item = { ...structuredClone(template), addedAt: Date.now(), quantity: 1,
      metadata: { ...template.metadata, caseId, reportId: caseId, outcome: 'SUCCESS', reportFormat: 'fill-in-v1',
        missionId: state.currentMission?.id ?? null, thiefName: state.currentThief?.name ?? null,
        artifact: state.currentMission?.artifact ?? null, city: state.currentMission?.city ?? null,
        escapeRoute: [...(state.escapeRoute ?? [])],
        ...(incident ? { administrativeObservation: {
          incidentId: incident.definition.id, choiceId: incident.choiceId,
          reportText: incident.definition.choices.find(c => c.id === incident.choiceId)?.reportText ?? ''
        } } : {})
      }
    };
    MainStoryManager.setSideClue(ISSUED_KEY, { ...issued, [key]: item }); changed = true;
  }
  const capacity = inventoryManager.getCapacity();
  if (capacity.current >= capacity.max) return { status: 'full', changed };
  return inventoryManager.addItem(item) ? { status: 'ready', changed: true } : { status: 'blocked', changed };
}
export function submitMissionReport(itemId, addedAt, state = gameState) {
  const caseId = getArchiveCaseId(state), blocked = unavailableChange(caseId);
  if (blocked) return blocked;
  if (!isArchivistPresent(state)) return { ok: false, reason: 'unavailable' };
  if (isReportSubmitted(state)) return { ok: false, reason: 'submitted' };
  const item = inventoryManager.getItem(itemId);
  if (item?.id !== REPORT_ITEM_ID || item.addedAt !== addedAt || String(item.metadata?.caseId) !== caseId) return { ok: false, reason: 'wrong_report' };
  const key = `report:${caseId}`;
  if (item.metadata?.reportFormat === 'fill-in-v1' && read(DRAFTS_KEY)[key]?.printed !== true) return { ok: false, reason: 'not_printed' };
  const incident = getReportIncident(caseId);
  if (incident && incident.phase !== 'printed' && incident.phase !== 'resolved') return { ok: false, reason: 'incident_required' };
  return commitReportChange(caseId, () => {
    const snapshot = inventoryManager.serializeItem(item);
    MainStoryManager.setSideClue(RECEIPTS_KEY, { ...read(RECEIPTS_KEY), [key]: {
      npcId: 'archivist_drebin', report: snapshot, submittedAt: Date.now()
    } });
    if (!inventoryManager.removeItem(itemId)) return { ok: false, reason: 'remove_failed' };
    const resolution = resolveReportIncident(caseId);
    if (incident && resolution?.ok !== true) return { ok: false, reason: 'incident_required' };
    return { ok: true };
  });
}
export function moveStateToHeadquarters(locations = [], state = gameState) {
  const hq = Array.isArray(locations) ? locations.find(location => location.id === HQ_ID || location.city === HQ_CITY) : null;
  state.updateState({ currentCity: hq?.city ?? HQ_CITY, currentCityId: HQ_ID,
    currentCityData: hq ? structuredClone(hq) : null, currentEncounterId: null,
    canonicalTravelCityId: HQ_ID, justReachedCorrectCityId: null });
}
