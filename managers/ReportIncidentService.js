import { MainStoryManager } from './MainStoryManager.js';
import { loadJson } from '../config/loadJson.js';
import { validateIncidentCatalog, readIncidentState, allocateIncident, chooseIncident, lockIncident, settleIncident } from './ReportIncidentModel.js';
export const INCIDENTS_KEY='agency_report_incidents_v1';
let catalog=null;
try { catalog=validateIncidentCatalog(await loadJson('../assets/data/reportIncidents.json',import.meta.url)); }
catch(error) { console.error('[Report incidents] Catalog unavailable; existing reports remain usable.',error); }
const read=()=>readIncidentState(MainStoryManager.getSideClue(INCIDENTS_KEY));
const write=state=>MainStoryManager.setSideClue(INCIDENTS_KEY,state);
export function getReportIncident(caseId) { return read().entries[`report:${caseId}`] || null; }
export function ensureReportIncident(caseId,{legacy=false}={}) {
  const existing=getReportIncident(caseId);
  if (existing || legacy || !catalog) return existing;
  const result=allocateIncident(read(),caseId,catalog);
  if(result.changed)write(result.state);
  return result.entry;
}
export function selectReportIncident(caseId,choiceId) {
  const result=chooseIncident(read(),caseId,choiceId);
  if(result.ok)write(result.state);
  return result.ok;
}
export function approveReportIncident(caseId) {
  const result=lockIncident(read(),caseId);
  if(result.ok)write(result.state);
  return result.ok;
}
export function resolveReportIncident(caseId) {
  const result=settleIncident(read(),caseId);
  if(result.ok && result.changed)write(result.state);
  return result;
}
export function getReportIncidentHistory() {
  const state=read();
  return state.order.map(key=>structuredClone(state.entries[key]));
}
export function getAgencyRelationshipScores() { return structuredClone(read().relationships); }
