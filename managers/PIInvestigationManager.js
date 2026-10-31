import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { buildReedBoardEvidence } from './ReedBoardEvidence.js';
import { buildAlibiBoardEvidence } from './AlibiBoardEvidence.js';
import { DEAD_MEN_ART_CASE, syncDeadMenArtwork } from './DeadMenArtwork.js';

const clone = value => JSON.parse(JSON.stringify(value));
const REED = 'pi_two_glasses';
const ALIBI = 'pi_stolen_alibi';
const FIELDS = ['type', 'label', 'text', 'metaText', 'color', 'image', 'caption', 'meta'];
const isLocked = item => item.createdByPlayer === false && item.editableByPlayer === false;

function getState() {
    if (!gameState.piInvestigations || typeof gameState.piInvestigations !== 'object' || Array.isArray(gameState.piInvestigations)) {
        gameState.piInvestigations = { version: 1, selectedCaseId: null, cases: {} };
    }
    const state = gameState.piInvestigations;
    if (!state.cases || typeof state.cases !== 'object' || Array.isArray(state.cases)) state.cases = {};
    return state;
}
function syncGenerated(id, generated) {
    const state = getState();
    const investigation = state.cases[id];
    if (!investigation?.board) return false;
    const byId = new Map(generated.map(item => [item.id, item]));
    let changed = false;
    const items = (Array.isArray(investigation.board.items) ? investigation.board.items : []).map(item => {
        const fresh = byId.get(item.id);
        if (!fresh || !isLocked(item)) return item;
        const next = { ...item };
        for (const field of FIELDS) {
            if (field in fresh) next[field] = clone(fresh[field]);
            else delete next[field];
        }
        if (JSON.stringify(next) !== JSON.stringify(item)) changed = true;
        return next;
    });
    const ids = new Set(items.map(item => item.id));
    for (const item of generated) {
        if (ids.has(item.id)) continue;
        const index = items.length;
        items.push({ x: 100 + (index % 4) * 270, y: 100 + Math.floor(index / 4) * 230, ...clone(item) });
        ids.add(item.id);
        changed = true;
    }
    if (!changed) return false;
    gameState.piInvestigations = {
        ...state,
        cases: { ...state.cases, [id]: { ...investigation, board: { ...investigation.board, items } } }
    };
    requestAutosave();
    return true;
}
export function syncReedBoardEvidence() {
    if (!getState().cases[REED]?.board) return false;
    return syncGenerated(REED, buildReedBoardEvidence(gameState));
}
export function syncAlibiBoardEvidence() {
    const state = getState();
    const quest = gameState.piQuests?.quests?.[ALIBI];
    if (!quest) return false;
    let changed = false;
    if (!state.cases[ALIBI]) {
        state.cases[ALIBI] = {
            id: ALIBI, kind: 'side', title: 'The Borrowed Alibi',
            status: quest.status === 'completed' ? 'completed' : 'active',
            board: {
                meta: { boardId: `pi-${ALIBI}`, caseId: ALIBI, title: 'The Borrowed Alibi', version: 1 },
                items: [], links: []
            }
        };
        changed = true;
    }
    const investigation = state.cases[ALIBI];
    if (quest.status === 'completed' && investigation.status !== 'completed') {
        investigation.status = 'completed';
        changed = true;
    }
    if (changed) requestAutosave();
    return syncGenerated(ALIBI, buildAlibiBoardEvidence(gameState)) || changed;
}
export function getPICase(id) {
    if (id === REED) syncReedBoardEvidence();
    if (id === ALIBI) syncAlibiBoardEvidence();
    if (id === DEAD_MEN_ART_CASE) syncDeadMenArtwork();
    return getState().cases[id] || null;
}
export function getPICases() {
    syncReedBoardEvidence();
    syncAlibiBoardEvidence();
    syncDeadMenArtwork();
    return Object.values(getState().cases);
}
export function getSelectedPICaseId() { return getState().selectedCaseId; }
export function selectPICase(id) {
    if (!getPICase(id)) return false;
    getState().selectedCaseId = id;
    requestAutosave();
    return true;
}
export function registerPICase(definition) {
    if (!definition?.id || !['main', 'side'].includes(definition.kind) || definition.requiresBoard !== true) return null;
    const state = getState();
    if (state.cases[definition.id]) return getPICase(definition.id);
    state.cases[definition.id] = {
        id: definition.id, kind: definition.kind,
        title: definition.title || 'Untitled investigation', status: 'active',
        board: {
            meta: { boardId: `pi-${definition.id}`, caseId: definition.id, title: definition.title || 'PI Investigation', version: 1 },
            items: clone(definition.initialItems || []), links: clone(definition.initialLinks || [])
        }
    };
    requestAutosave();
    return getPICase(definition.id);
}
export function savePIBoard(id, board) {
    const investigation = getPICase(id);
    if (!investigation || !board) return false;
    const next = clone(board);
    if (id === REED || id === ALIBI || id === DEAD_MEN_ART_CASE) {
        next.items = Array.isArray(next.items) ? next.items : [];
        const ids = new Set(next.items.map(item => item.id));
        for (const item of investigation.board.items || []) {
            if (isLocked(item) && !ids.has(item.id)) {
                next.items.push(clone(item));
                ids.add(item.id);
            }
        }
    }
    investigation.board = next;
    requestAutosave();
    if (id === REED) syncReedBoardEvidence();
    if (id === ALIBI) syncAlibiBoardEvidence();
    if (id === DEAD_MEN_ART_CASE) syncDeadMenArtwork();
    return true;
}
export function addPIEvidence(id, item) {
    const investigation = getPICase(id);
    if (!investigation || !item?.id || investigation.board.items.some(existing => existing.id === item.id)) return false;
    const index = investigation.board.items.length;
    investigation.board.items.push({
        type: 'note', x: 100 + (index % 4) * 270, y: 100 + Math.floor(index / 4) * 230,
        discovered: true, createdByPlayer: false, editableByPlayer: false, ...clone(item)
    });
    requestAutosave();
    return true;
}
