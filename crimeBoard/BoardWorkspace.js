import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  getKnownApartmentIdentityClues,
  getApartmentIdentityContext
} from '../scenes/apartament/ApartmentIdentityEvidence.js';

const copy = value => JSON.parse(JSON.stringify(value));
const LABELS = { features: __dialogueText("crimeBoard/BoardWorkspace.js", "t_5697d03daef4de9cf8db"), race: __dialogueText("crimeBoard/BoardWorkspace.js", "t_9667a418b91c9c8b8155"), eyes: __dialogueText("crimeBoard/BoardWorkspace.js", "t_a39e9d9816a99fc02aa4"), hair: __dialogueText("crimeBoard/BoardWorkspace.js", "t_ababed4823ab79d226ba"), gender: __dialogueText("crimeBoard/BoardWorkspace.js", "t_a04630ef8bc3da8c864a") };
const APPEARANCE_TAG = 'apartment-identity-board';

export function boardCaseKey(state) {
  const m = state.currentMission || {};
  return String(m.id ?? m.caseId ?? m.caseIndex ??
    `${state.caseSuspectCityId ?? state.crimeCityId ?? state.crimeCity ?? m.city ?? 'unknown'}_${m.artifactKey ?? m.artifact ?? 'default'}`);
}

export function savedBoard(state) {
  const key = boardCaseKey(state);
  const scoped = state.crimeBoardWorkspaces?.[key];
  if (scoped) return copy(scoped);
  const legacy = state.crimeBoardData;
  if (!legacy?.items) return null;
  const m = state.currentMission || {};
  const matches = legacy.meta?.workspaceKey === key ||
    (!legacy.meta?.workspaceKey && (!legacy.meta?.caseId || legacy.meta.caseId === m.artifactKey));
  return matches ? copy(legacy) : null;
}

function addKnownIdentityEvidence(data, state) {
  const clues = getKnownApartmentIdentityClues(state);
  const context = getApartmentIdentityContext(state);
  if (!context || !clues.length) return data;
  const subjectIds = new Set([context.caseId, context.actualId]);
  const subjects = state.caseSuspects || state.suspects || state.suspectList || [];
  const subject = subjects.find(s => subjectIds.has(s.id));
  const publicName = subject?.publicProfile?.displayName || subject?.name;
  const targetIds = [];
  for (const item of data.items) {
    if (!subjectIds.has(item.suspectId) || item.createdByPlayer) continue;
    targetIds.push(item.id);
    if (item.tags?.includes('unknown') && publicName) item.label = publicName;
    if (!String(item.label).includes(__dialogueText("crimeBoard/BoardWorkspace.js", "t_e6f8ef7ed7bd8d52a696"))) item.label += __dialogueText("crimeBoard/BoardWorkspace.js", "t_783801ce828143b78c91");
    if (item.type === 'evidence') {
      item.fields = (item.fields || []).filter(row => row.key !== __dialogueText("crimeBoard/BoardWorkspace.js", "t_999f23fcd7bec7075e54"));
      item.fields.push({ key: 'Identity', value: __dialogueText("crimeBoard/BoardWorkspace.js", "t_4b7fed18a2f0b71c5957") });
    } else if (item.type === 'photo') {
      item.caption = __dialogueText("crimeBoard/BoardWorkspace.js", "t_77fb725b33fcafef1553");
    }
  }
  clues.forEach((clue, index) => {
    const id = `board-${clue.id}`;
    const label = LABELS[clue.category] || clue.category;
    const item = {
      id, type: 'evidence', x: 820 + (index % 2) * 260,
      y: 90 + Math.floor(index / 2) * 230, z: 8, rotation: -1.2,
      pinned: false, label: __dialogueText("crimeBoard/BoardWorkspace.js", "t_16a2ea7517342961d770"),
      tag: __dialogueText("crimeBoard/BoardWorkspace.js", "t_22ed13af3b25cc97924f"),
      body: clue.text,
      fields: [
        { key: 'Photo reference', value: `${label}: ${clue.value}` },
        { key: 'Identity', value: __dialogueText("crimeBoard/BoardWorkspace.js", "t_c3431ab21b76fa4b59e8") },
        { key: 'Real name', value: __dialogueText("crimeBoard/BoardWorkspace.js", "t_b764cdc0eab713746721") }
      ],
      clueId: clue.id, tags: [APPEARANCE_TAG, 'identity-evidence'],
      discovered: true, createdByPlayer: false, editableByPlayer: false
    };
    const existing = data.items.findIndex(entry => entry.id === id);
    if (existing >= 0) {
      const old = data.items[existing];
      for (const key of ['x', 'y', 'z', 'rotation', 'pinned']) {
        if (old[key] !== undefined) item[key] = old[key];
      }
      data.items[existing] = item;
    } else data.items.push(item);
    for (const target of targetIds) {
      if (data.links.some(link => (link.from === id && link.to === target) || (link.from === target && link.to === id))) continue;
      data.links.push({ id: `identity-link-${id}-${target}`, from: target, to: id,
        fromAnchor: 'right', toAnchor: 'left', color: '#b3131b',
        createdByPlayer: false, editableByPlayer: false });
    }
  });
  return data;
}

export function installBoardWorkspace(api, state, saved) {
  const board = api.board;
  const abort = new AbortController();
  const listen = (target, type, handler, options = {}) =>
    target.addEventListener(type, handler, { ...options, signal: abort.signal });
  const originalLoad = board.loadBoard.bind(board);
  const originalSync = board.syncJsonOutput.bind(board);
  const originalDestroy = api.destroy.bind(api);
  const originalRefresh = api.refresh.bind(api);
  let activeState = state;
  let activeKey = boardCaseKey(state);
  let busy = false, dead = false, gesture = null, suppressClick = false;
  let resetClickTimer;

  const persist = () => {
    if (busy || dead) return;
    const data = api.getData();
    data.meta = { ...data.meta, workspaceKey: activeKey };
    activeState.crimeBoardWorkspaces = {
      ...(activeState.crimeBoardWorkspaces || {}), [activeKey]: copy(data)
    };
    activeState.crimeBoardData = copy(data);
  };
  const restore = (generated, previous) => {
    const data = copy(generated);
    if (!previous?.items) return data;
    const old = new Map(previous.items.map(item => [item.id, item]));
    data.items = data.items.map(item => {
      const prior = old.get(item.id);
      if (!prior) return item;
      if (prior.createdByPlayer) return copy(prior);
      for (const key of ['x', 'y', 'z', 'rotation', 'pinned', 'motiveVerdict']) {
        if (prior[key] !== undefined) item[key] = prior[key];
      }
      return item;
    });
    const ids = new Set(data.items.map(item => item.id));
    for (const item of previous.items) {
      if (item.createdByPlayer && !ids.has(item.id)) {
        data.items.push(copy(item)); ids.add(item.id);
      }
    }
    const pairs = new Set();
    data.links = [...(previous.links || []).filter(l => l.createdByPlayer), ...(data.links || [])]
      .filter(link => {
        if (!ids.has(link.from) || !ids.has(link.to) || link.from === link.to) return false;
        const pair = [link.from, link.to].sort().join('\u0000');
        if (pairs.has(pair)) return false;
        pairs.add(pair); return true;
      });
    return data;
  };
  const decorate = data => addKnownIdentityEvidence(data, activeState);
  board.loadBoard = data => {
    const merged = busy ? copy(data) : restore(data, api.getData());
    const result = originalLoad(decorate(merged));
    persist(); return result;
  };
  board.syncJsonOutput = () => { originalSync(); persist(); };
  busy = true;
  try { originalLoad(decorate(restore(api.getData(), saved))); }
  finally { busy = false; }
  persist();

  const panels = [];
  const makePanel = (key, title, host, before = null) => {
    const panel = document.createElement('details');
    panel.className = 'crime-board-workspace-panel';
    const summary = document.createElement('summary');
    summary.textContent = title;
    panel.append(summary);
    const content = document.createElement('div');
    content.className = 'crime-board-workspace-panel__content';
    panel.append(content);
    host.insertBefore(panel, before);
    panel.open = activeState.crimeBoardPanelSettings?.[activeKey]?.[key] === true;
    listen(panel, 'toggle', () => {
      if (dead) return;
      activeState.crimeBoardPanelSettings = {
        ...(activeState.crimeBoardPanelSettings || {}),
        [activeKey]: { ...(activeState.crimeBoardPanelSettings?.[activeKey] || {}), [key]: panel.open }
      };
    });
    panels.push({ panel, key });
    return { panel, content };
  };
  if (board.deductionPanel?.parentNode) {
    const { content } = makePanel('deduction', __dialogueText("crimeBoard/BoardWorkspace.js", "t_b905b8c385985cf89d95"),
      board.deductionPanel.parentNode, board.deductionPanel);
    content.append(board.deductionPanel);
  }
  const { panel: toolbar, content: tools } = makePanel('tools', __dialogueText("crimeBoard/BoardWorkspace.js", "t_3318753726f4fd2c8e48"),
    board.root.parentNode, board.root);
  const addNote = document.createElement('button');
  addNote.type = 'button'; addNote.className = 'crime-board-btn'; addNote.textContent = __dialogueText("crimeBoard/BoardWorkspace.js", "t_af053c75df708df1978a");
  const hint = document.createElement('span');
  hint.className = 'crime-board-hint';
  hint.textContent = __dialogueText("crimeBoard/BoardWorkspace.js", "t_9b00ca835676799a725d");
  tools.append(addNote, hint);
  // Functional rules only. All colours / fonts live in crime-board.css and crime-board-layout.css.
  const style = document.createElement('style');
  style.textContent = `${__dialogueText("crimeBoard/BoardWorkspace.js", "t_fb320e028a1ee220c235")}`;
  board.root.parentNode.append(style);

  api.refresh = (nextState = activeState) => {
    const nextKey = boardCaseKey(nextState);
    const sameCase = nextKey === activeKey;
    const previous = sameCase ? api.getData() : savedBoard(nextState);
    busy = true;
    try {
      activeState = nextState; activeKey = nextKey;
      if (!sameCase) originalLoad({ meta: {}, items: [], links: [] });
      originalRefresh(nextState);
      originalLoad(decorate(restore(api.getData(), previous)));
      if (!sameCase) for (const { panel, key } of panels) {
        panel.open = activeState.crimeBoardPanelSettings?.[activeKey]?.[key] === true;
      }
    } finally { busy = false; }
    persist(); return api.getData();
  };

  const dialog = document.createElement('dialog');
  dialog.className = 'cb-note-dialog';
  dialog.innerHTML = `${__dialogueText("crimeBoard/BoardWorkspace.js", "t_79925d1c1429f2eb2c18")}`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const dialogTitle = dialog.querySelector(__dialogueText("crimeBoard/BoardWorkspace.js", "t_39c6a6ade59dda18a08f"));
  let editingId = null;
  const editNote = item => {
    editingId = item?.id || null;
    dialogTitle.textContent = item ? __dialogueText("crimeBoard/BoardWorkspace.js", "t_299e604ccff332f5d5f5") : __dialogueText("crimeBoard/BoardWorkspace.js", "t_76ea482f843e76e4f8f5");
    form.elements.title.value = item?.label || __dialogueText("crimeBoard/BoardWorkspace.js", "t_2e337c5de34b6ff07d9d");
    form.elements.text.value = item?.text || '';
    form.elements.color.value = item?.color || 'yellow';
    dialog.querySelector('[data-delete]').hidden = !item;
    dialog.returnValue = ''; dialog.showModal(); form.elements.text.focus();
  };
  listen(addNote, 'click', () => editNote(null));
  listen(dialog, 'close', () => {
    if (dialog.returnValue !== 'save' || dead) return;
    const patch = { label: form.elements.title.value.trim() || __dialogueText("crimeBoard/BoardWorkspace.js", "t_2e337c5de34b6ff07d9d"),
      text: form.elements.text.value, color: form.elements.color.value };
    const item = editingId ? board.updateItem(editingId, patch) :
      board.addItem({ ...board.createDefaultItem('note'), ...patch });
    if (item) board.selectItem(item.id);
    board.syncJsonOutput();
  });
  listen(dialog.querySelector('[data-delete]'), 'click', () => {
    if (!editingId || !window.confirm(__dialogueText("crimeBoard/BoardWorkspace.js", "t_8372c964d10157dcb691"))) return;
    board.removeItem(editingId); board.refreshEditor(); board.syncJsonOutput(); dialog.close('cancel');
  });
  listen(board.root, 'dblclick', event => {
    const card = event.target.closest(__dialogueText("crimeBoard/BoardWorkspace.js", "t_5bd89b1df88527a4f1b7"));
    const item = card && board.getItemById(card.dataset.id);
    if (item?.type === 'note' && item.createdByPlayer && item.editableByPlayer) editNote(item);
  });
  const cancelGesture = () => { gesture = null; board.resetConnectionMode(); };
  listen(board.root, 'pointerdown', event => {
    const pin = event.target.closest('[data-anchor]');
    if (!pin || event.button !== 0) return;
    const card = pin.closest(__dialogueText("crimeBoard/BoardWorkspace.js", "t_5bd89b1df88527a4f1b7"));
    if (!card || !board.canStartLinkFromItem(card.dataset.id)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    board.clearDragState(); board.resetConnectionMode();
    gesture = { id: card.dataset.id, anchor: pin.dataset.anchor, pointerId: event.pointerId };
    board.startConnectionMode(gesture.id, gesture.anchor);
    suppressClick = true; clearTimeout(resetClickTimer);
  }, { capture: true });
  listen(window, 'pointerup', event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const source = gesture;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const card = hit?.closest(__dialogueText("crimeBoard/BoardWorkspace.js", "t_5bd89b1df88527a4f1b7"));
    if (card && board.root.contains(card) && card.dataset.id !== source.id) {
      const pin = hit.closest('[data-anchor]');
      const link = board.addLink({ from: source.id, to: card.dataset.id,
        fromAnchor: source.anchor, toAnchor: pin?.dataset.anchor || 'left',
        color: '#b3131b', createdByPlayer: true, editableByPlayer: true });
      if (link) board.syncJsonOutput();
    }
    cancelGesture(); resetClickTimer = setTimeout(() => { suppressClick = false; }, 0);
  }, { capture: true });
  listen(board.root, 'click', event => {
    if (!suppressClick) return;
    event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false;
  }, { capture: true });
  listen(window, 'pointercancel', () => { cancelGesture(); board.clearDragState(); persist(); });
  listen(window, 'blur', () => { cancelGesture(); board.clearDragState(); persist(); });
  listen(window, 'keydown', event => {
    if (event.key === __dialogueText("crimeBoard/BoardWorkspace.js", "t_037c968467aa3fd7c059") && gesture) {
      event.preventDefault(); event.stopImmediatePropagation(); cancelGesture();
    }
  }, { capture: true });

  api.saveWorkspace = persist;
  api.destroy = () => {
    if (dead) return;
    persist(); dead = true;
    cancelGesture(); abort.abort(); clearTimeout(resetClickTimer);
    dialog.remove(); style.remove();
    board.destroy();
    for (const { panel } of panels) panel.remove();
    originalDestroy();
  };
  return api;
}