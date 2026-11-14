import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';

export const REPUTATION_CHANGED = 'reputation:changed';
const FAME_THRESHOLDS = [0, 20, 50, 80];
const CONTACT_THRESHOLD = 40;
const RULES = Object.freeze({
    correct_arrest: { fame: 10, integrity: 8, headline: 'Sprawca zatrzymany. Detektyw zamyka kolejną sprawę.' },
    wrong_arrest: { fame: 0, integrity: -12, headline: null },
    case_solved: { fame: 10, integrity: 0, headline: 'Kolejna zagadka rozwiązana przez prywatnego detektywa.' },
    media_coverage: { fame: 5, integrity: 0, headline: 'O działaniach detektywa mówią lokalne media.' },
    theft: { fame: 0, integrity: -8, headline: null },
    cheating: { fame: 0, integrity: -5, headline: null },
    fabricated_evidence: { fame: 0, integrity: -15, headline: null },
    framed_innocent: { fame: 0, integrity: -25, headline: null },
    returned_money: { fame: 0, integrity: 5, headline: null },
    bribe_accepted: { fame: 0, integrity: -50, headline: null },
    honest_pi_report: { fame: 0, integrity: 5, headline: null },
    concealed_pi_findings: { fame: 0, integrity: -5, headline: null }
});
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function safeNumber(value, fallback = 0) { return Number.isFinite(value) ? value : fallback; }
function normalize(raw) {
    const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    return {
        version: 1, fame: clamp(safeNumber(data.fame), 0, 100),
        integrity: clamp(safeNumber(data.integrity), -100, 100),
        appliedEventIds: Array.isArray(data.appliedEventIds)
            ? [...new Set(data.appliedEventIds.filter(id => typeof id === 'string'))] : [],
        headlines: Array.isArray(data.headlines) ? data.headlines.filter(item => item &&
            typeof item.id === 'string' && typeof item.text === 'string')
            .map(item => ({ ...item })).slice(-50) : []
    };
}
export function getReputation() { return normalize(gameState.reputationState); }
export function getFameLevel() {
    const { fame } = getReputation();
    return FAME_THRESHOLDS.reduce((level, threshold, index) => fame >= threshold ? index : level, 0);
}
export function getContactSide() {
    const { integrity } = getReputation();
    if (integrity >= CONTACT_THRESHOLD) return 'police';
    if (integrity <= -CONTACT_THRESHOLD) return 'underworld';
    return 'neutral';
}
export function getNpcAccess(npcId, { isCrimeCity = false } = {}) {
    if (isCrimeCity) return { allowed: true, reason: '' };
    const side = getContactSide();
    if (npcId === 'police' && side !== 'police') return { allowed: false,
        reason: 'Nie udostępniamy informacji osobom spoza zaufanego kręgu. Wymagana uczciwość: +40.' };
    if (npcId === 'fence' && side !== 'underworld') return { allowed: false,
        reason: 'Nie znam cię i nie zamierzam ryzykować. Wymagana uczciwość: -40 lub mniej.' };
    return { allowed: true, reason: '' };
}
export function matchesReputation(requirements = {}) {
    const { fame, integrity } = getReputation();
    const level = getFameLevel();
    if (requirements.minFame != null && fame < requirements.minFame) return false;
    if (requirements.maxFame != null && fame > requirements.maxFame) return false;
    if (requirements.minFameLevel != null && level < requirements.minFameLevel) return false;
    if (requirements.minIntegrity != null && integrity < requirements.minIntegrity) return false;
    if (requirements.maxIntegrity != null && integrity > requirements.maxIntegrity) return false;
    return true;
}
export function applyReputationEvent(type, { eventId, headline, context = {} } = {}) {
    const rule = RULES[type];
    if (!rule) throw new Error(`[Reputation] Unknown event type: ${type}`);
    if (typeof eventId !== 'string' || !eventId.trim()) {
        throw new Error('[Reputation] A stable eventId is required.');
    }
    const before = getReputation();
    if (before.appliedEventIds.includes(eventId)) return { applied: false, reason: 'already_applied', state: before };
    const text = headline === undefined ? rule.headline : headline;
    const next = {
        ...before, fame: clamp(before.fame + rule.fame, 0, 100),
        integrity: clamp(before.integrity + rule.integrity, -100, 100),
        appliedEventIds: [...before.appliedEventIds, eventId],
        headlines: typeof text === 'string' && text.trim()
            ? [...before.headlines, { id: eventId, type, text, createdAt: Date.now(), read: false }].slice(-50)
            : before.headlines
    };
    gameState.reputationState = next;
    if (rule.integrity < 0) {
  const history = Array.isArray(gameState.courtMisconductLog)
    ? gameState.courtMisconductLog
    : [];

  const id = `reputation:${eventId}`;

  if (!history.some(entry => entry.id === id)) {
    gameState.courtMisconductLog = [
      ...history,
      {
        id,
        type,
        caseId: context.caseId ?? gameState.currentCaseId,
        missionId: context.missionId ?? gameState.currentMission?.id,
        sceneId: context.sceneId ?? null,
        itemId: context.itemId ?? null,
        moralDelta: rule.integrity,
        createdAt: Date.now()
      }
    ];
  }
}
    EventBus.emit(REPUTATION_CHANGED, { type, eventId, context, before, after: getReputation() });
    return { applied: true, state: getReputation() };
}
export function markHeadlineRead(id) {
    const state = getReputation();
    if (!state.headlines.some(item => item.id === id && !item.read)) return false;
    gameState.reputationState = { ...state,
        headlines: state.headlines.map(item => item.id === id ? { ...item, read: true } : item) };
    EventBus.emit(REPUTATION_CHANGED, { type: 'headline_read', after: getReputation() });
    return true;
}
