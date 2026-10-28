import {
  getKnownApartmentIdentityClues,
  getApartmentIdentityContext
} from '../scenes/apartament/ApartmentIdentityEvidence.js';

const copy = value => JSON.parse(JSON.stringify(value));
const LABELS = { features: 'Features', race: 'Race / Skin', eyes: 'Eyes', hair: 'Hair', gender: 'Gender' };
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
    if (!String(item.label).includes('[FAKE NAME]')) item.label += ' [FAKE NAME]';
    if (item.type === 'evidence') {
      item.fields = (item.fields || []).filter(row => row.key !== 'Identity');
      item.fields.push({ key: 'Identity', value: 'False name and occupation. Real name unknown.' });
    } else if (item.type === 'photo') {
      item.caption = 'False name and occupation confirmed by recovered forged-ID paperwork. Real name unknown.';
    }
  }
  clues.forEach((clue, index) => {
    const id = `board-${clue.id}`;
    const label = LABELS[clue.category] || clue.category;
    const item = {
      id, type: 'evidence', x: 820 + (index % 2) * 260,
      y: 90 + Math.floor(index / 2) * 230, z: 8, rotation: -1.2,
      pinned: false, label: 'Recovered photograph / forged ID',
      tag: 'Apartment: identity evidence',
      body: clue.text,
      fields: [
        { key: 'Photo reference', value: `${label}: ${clue.value}` },
        { key: 'Identity', value: 'Name and occupation are false' },
        { key: 'Real name', value: 'Unknown' }
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
    const { content } = makePanel('deduction', 'Motive checks — show / hide',
      board.deductionPanel.parentNode, board.deductionPanel);
    content.append(board.deductionPanel);
  }
  const { panel: toolbar, content: tools } = makePanel('tools', 'Board tools — show / hide',
    board.root.parentNode, board.root);
  const addNote = document.createElement('button');
  addNote.type = 'button'; addNote.className = 'crime-board-btn'; addNote.textContent = '+ Add note';
  const hint = document.createElement('span');
  hint.textContent = 'Drag cards to arrange. Drag between pins to connect. Double-click your note to edit.';
  tools.append(addNote, hint);
  const style = document.createElement('style');
  style.textContent = `
    .crime-board-workspace-panel{background:#29231f;color:#f4e6cb;font:14px SpecialElite,monospace;border:1px solid #806645;margin:4px 0;position:relative;z-index:6}
    .crime-board-workspace-panel>summary{cursor:pointer;padding:9px 12px;user-select:none}
    .crime-board-workspace-panel:not([open])>.crime-board-workspace-panel__content{display:none!important}
    .crime-board-workspace-panel__content{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px}
    .crime-board-workspace-panel__content>.crime-board-deduction{width:100%;box-sizing:border-box}
    .crime-board__item,.crime-board__anchor{touch-action:none}
    .crime-board__anchor{cursor:crosshair}
    .crime-board__temp-link{pointer-events:none}
  `;
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
  dialog.style.cssText = 'background:#e8d9b8;color:#241c15;border:3px solid #5d4031;max-width:90vw;width:420px;z-index:2147483647;font-family:SpecialElite,monospace;';
  dialog.innerHTML = `<form method="dialog" style="display:grid;gap:12px">
    <label>Title<input name="title" maxlength="120" style="display:block;width:100%;box-sizing:border-box"></label>
    <label>Note<textarea name="text" rows="7" maxlength="8000" style="display:block;width:100%;box-sizing:border-box"></textarea></label>
    <label>Colour<select name="color"><option value="yellow">Yellow</option><option value="blue">Blue</option><option value="pink">Pink</option></select></label>
    <div style="display:flex;gap:12px"><button value="save">Save note</button><button value="cancel" formnovalidate>Cancel</button><button type="button" data-delete>Delete note</button></div>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  let editingId = null;
  const editNote = item => {
    editingId = item?.id || null;
    form.elements.title.value = item?.label || 'Detective note';
    form.elements.text.value = item?.text || '';
    form.elements.color.value = item?.color || 'yellow';
    dialog.querySelector('[data-delete]').hidden = !item;
    dialog.returnValue = ''; dialog.showModal(); form.elements.text.focus();
  };
  listen(addNote, 'click', () => editNote(null));
  listen(dialog, 'close', () => {
    if (dialog.returnValue !== 'save' || dead) return;
    const patch = { label: form.elements.title.value.trim() || 'Detective note',
      text: form.elements.text.value, color: form.elements.color.value };
    const item = editingId ? board.updateItem(editingId, patch) :
      board.addItem({ ...board.createDefaultItem('note'), ...patch });
    if (item) board.selectItem(item.id);
    board.syncJsonOutput();
  });
  listen(dialog.querySelector('[data-delete]'), 'click', () => {
    if (!editingId || !window.confirm('Delete this note and its connections?')) return;
    board.removeItem(editingId); board.refreshEditor(); board.syncJsonOutput(); dialog.close('cancel');
  });
  listen(board.root, 'dblclick', event => {
    const card = event.target.closest('.crime-board__item');
    const item = card && board.getItemById(card.dataset.id);
    if (item?.type === 'note' && item.createdByPlayer && item.editableByPlayer) editNote(item);
  });
  const cancelGesture = () => { gesture = null; board.resetConnectionMode(); };
  listen(board.root, 'pointerdown', event => {
    const pin = event.target.closest('[data-anchor]');
    if (!pin || event.button !== 0) return;
    const card = pin.closest('.crime-board__item');
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
    const card = hit?.closest('.crime-board__item');
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
    if (event.key === 'Escape' && gesture) {
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