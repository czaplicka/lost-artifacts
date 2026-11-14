import { loadJson } from './loadJson.js';
import { gameState } from '../GameData.js';
import { getArchiveCaseId, isSuccessfulCase, canRequestNextMission } from '../archiveReportService.js';

const PHASES = new Set(['always', 'mission_success_pending_report', 'mission_success_report_filed']);
const ACTIONS = new Set(['reports', 'next_mission']);
export function validateAgencyMail(data) {
  if (data?.version !== 1 || !Array.isArray(data.messages)) throw new Error('agencyMail.json requires version 1 and messages.');
  const ids = new Set();
  for (const item of data.messages) {
    if (typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(item.id) ||
      ['__proto__','constructor','prototype'].includes(item.id) || ids.has(item.id)) throw new Error('Invalid or duplicate agency mail ID.');
    ids.add(item.id);
    if (!['from','subject','date','category','body'].every(key => typeof item[key] === 'string' && item[key].trim())) {
      throw new Error(`Missing mail text: ${item.id}`);
    }
    const availability = item.availability;
    if (!availability || !PHASES.has(availability.phase) || !Number.isInteger(availability.minSolvedCases) || availability.minSolvedCases < 0) {
      throw new Error(`Invalid availability: ${item.id}`);
    }
    if (!Number.isFinite(item.priority)) throw new Error(`Invalid priority: ${item.id}`);
    if (availability.phase !== 'always' && item.perCase !== true) throw new Error(`Event mail must be perCase: ${item.id}`);
    if (item.action && (!ACTIONS.has(item.action.type) || typeof item.action.label !== 'string' || !item.action.label.trim())) {
      throw new Error(`Invalid action: ${item.id}`);
    }
    if (item.action?.type === 'next_mission' && availability.phase !== 'mission_success_report_filed') {
      throw new Error('NEXT ASSIGNMENT requires a successful case and filed report.');
    }
  }
  return data;
}

export const AGENCY_MAIL_DATA = validateAgencyMail(await loadJson('../assets/data/agencyMail.json', import.meta.url));
export const MARK_AGENCY_MAIL = AGENCY_MAIL_DATA.messages.filter(item =>
  item.availability.phase === 'always' && item.availability.minSolvedCases === 0);

export function canOpenNextAssignment(state = gameState) {
  return getArchiveCaseId(state) !== null && isSuccessfulCase(state) && canRequestNextMission(state);
}
export function getAgencyMail(state = gameState) {
  const count = Number.isFinite(state.casesSolved) ? Math.max(0, Math.floor(state.casesSolved)) : 0;
  const caseId = getArchiveCaseId(state);
  const successful = caseId !== null && isSuccessfulCase(state);
  const ready = canOpenNextAssignment(state);
  const values = { agentName: state.playerName || state.agentName || 'Agent', caseId: caseId ?? 'unassigned' };
  const fill = text => text.replace(/\{\{(agentName|caseId)\}\}/g, (_, key) => String(values[key]));
  return AGENCY_MAIL_DATA.messages.filter(item => {
    const availability = item.availability;
    if (count < availability.minSolvedCases) return false;
    if (availability.phase === 'mission_success_pending_report') return successful && !ready;
    if (availability.phase === 'mission_success_report_filed') return ready;
    return true;
  }).map(item => ({ ...item,
    id: item.perCase ? `${item.id}:case:${encodeURIComponent(caseId)}` : item.id,
    templateId: item.id, subject: fill(item.subject), body: fill(item.body),
    action: item.action ? { ...item.action } : null,
    actionEnabled: item.action?.type === 'reports' ? successful : item.action?.type === 'next_mission' ? ready : false
  })).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
