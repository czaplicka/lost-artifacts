// managers/PIInvestigationManager.js

import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

const clone = value => JSON.parse(JSON.stringify(value));

function getState() {
  if (
    !gameState.piInvestigations ||
    typeof gameState.piInvestigations !== 'object'
  ) {
    gameState.piInvestigations = {
      version: 1,
      selectedCaseId: null,
      cases: {}
    };
  }

  const state = gameState.piInvestigations;

  state.cases ??= {};

  return state;
}

export function getPICase(caseId) {
  return getState().cases[caseId] || null;
}

export function getPICases() {
  return Object.values(getState().cases);
}

export function getSelectedPICaseId() {
  return getState().selectedCaseId;
}

export function selectPICase(caseId) {
  if (!getPICase(caseId)) return false;

  getState().selectedCaseId = caseId;
  requestAutosave();

  return true;
}

export function registerPICase(definition) {
  if (
    !definition?.id ||
    !['main', 'side'].includes(definition.kind) ||
    definition.requiresBoard !== true
  ) {
    return null;
  }

  const state = getState();

  // Never reset an existing investigation.
  if (state.cases[definition.id]) {
    return state.cases[definition.id];
  }

  const investigation = {
    id: definition.id,
    kind: definition.kind,
    title: definition.title || 'Untitled investigation',
    status: 'active',

    board: {
      meta: {
        boardId: `pi-${definition.id}`,
        caseId: definition.id,
        title: definition.title || 'PI Investigation',
        version: 1
      },

      items: clone(definition.initialItems || []),
      links: clone(definition.initialLinks || [])
    }
  };

  state.cases[definition.id] = investigation;

  requestAutosave();

  return investigation;
}

export function savePIBoard(caseId, board) {
  const investigation = getPICase(caseId);

  if (!investigation || !board) return false;

  investigation.board = clone(board);

  requestAutosave();

  return true;
}

export function addPIEvidence(caseId, item) {
  const investigation = getPICase(caseId);

  if (!investigation || !item?.id) return false;

  if (
    investigation.board.items.some(
      existing => existing.id === item.id
    )
  ) {
    return false;
  }

  const count = investigation.board.items.length;

  investigation.board.items.push({
    type: 'note',
    x: 100 + (count % 4) * 270,
    y: 100 + Math.floor(count / 4) * 230,
    discovered: true,
    createdByPlayer: false,
    editableByPlayer: false,
    ...clone(item)
  });

  requestAutosave();

  return true;
}