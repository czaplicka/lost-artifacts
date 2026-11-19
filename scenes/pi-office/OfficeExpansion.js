import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import {
  needsOfficeMoveIn,
  ownsNewPIOffice
} from '../../managers/PIOfficeShopManager.js';
import {
  ANNEX_RENT,
  advanceAnnexRent,
  ensureAlibiHistory,
  formatRentTime,
  isRentDue,
  postAlibi,
  readAlibiData,
  startAnnexLease
} from './AlibiFund.js';

const DEVICE = 'office-expansion';
const HUD_RIGHT_GAP = 233;
const HUD_TOP = 26;
const ROWS = 3;
const START_COLUMNS = 3;
const MAX_COLUMNS = 5;
const CYCLE = 120_000;
const CAP = 200;
const CELL = 100;

const ROOMS = [
  {
    id: 'front', name: 'Front Desk', short: 'FRONT DESK', size: 2,
    price: 150, worker: 'Nora Pike', hire: 300, pay: 20,
    skin: '#eab18d', hair: '#56353b', shirt: '#a65473', longHair: true,
    note: 'A bell, a ledger, and nowhere to hide.'
  },
  {
    id: 'records', name: 'Records Room', short: 'RECORDS', size: 3,
    price: 450, worker: 'Milo Finch', hire: 350, pay: 35,
    skin: '#b87d5e', hair: '#352b35', shirt: '#526c84',
    note: 'The files have requested privacy.'
  },
  {
    id: 'lab', name: 'Research Lab', short: 'RESEARCH LAB', size: 3,
    price: 600, worker: 'Ada Quill', hire: 400, pay: 45,
    skin: '#d69a72', hair: '#3f3034', shirt: '#557b68', longHair: true,
    note: 'It says laboratory. It means three magnifying glasses.'
  }
];

const mounted = new WeakSet();
const clocks = new WeakSet();
const ready = () => ownsNewPIOffice() && !needsOfficeMoveIn();
const money = value => `$${value}`;
const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const progress = value => Number.isFinite(value)
  ? Math.max(0, Math.min(CYCLE - 0.001, value))
  : 0;
const remaining = ms => formatRentTime(Math.max(0, CYCLE - ms));

function read() {
  const old = gameState.piOfficeShop?.idleOffice || {};
  const nora = old.nora === true || old.hired === true;

  const legacy = {
    front: old.front === true || nora
      ? {
          x: 0, y: 0, vertical: false, hired: nora,
          progress: old.frontProgress ?? old.progress
        }
      : null,
    records: old.room === true
      ? {
          x: 0, y: 1, vertical: false, hired: old.milo === true,
          progress: old.recordsProgress
        }
      : null
  };

  const rooms = {};

  for (const spec of ROOMS) {
    const room = old.rooms?.[spec.id] ?? legacy[spec.id];
    if (!room) continue;

    rooms[spec.id] = {
      x: integer(room.x),
      y: integer(room.y),
      vertical: room.vertical === true,
      hired: room.hired === true,
      progress: progress(room.progress)
    };
  }

  const columns = Math.min(MAX_COLUMNS, Math.max(START_COLUMNS, integer(old.columns)));

  return {
    version: 4,
    columns,
    rooms,
    seen: old.seen === true,
    fundOpened: old.fundOpened === true,
    fund: integer(old.fund),
    officeProgress: progress(old.officeProgress),
    uncollected: Math.min(CAP, integer(old.uncollected)),
    lastEntry: typeof old.lastEntry === 'string' ? old.lastEntry : '',
    ...readAlibiData({ ...old, columns })
  };
}

function write(state, save = false) {
  gameState.piOfficeShop = {
    ...gameState.piOfficeShop,
    idleOffice: state
  };

  if (save) requestAutosave();
}

function openFund(state) {
  const historyCreated = ensureAlibiHistory(state);
  if (state.fundOpened) return historyCreated;

  if (!postAlibi(state, 100, "Previous tenant's unclaimed deposit")) {
    return historyCreated;
  }

  state.fundOpened = true;
  state.lastEntry = "+$100 — Previous tenant's unclaimed deposit";
  return true;
}

function cells(spec, position) {
  return Array.from({ length: spec.size }, (_, i) => ({
    x: position.x + (position.vertical ? 0 : i),
    y: position.y + (position.vertical ? i : 0)
  }));
}

const keyOf = ({ x, y }) => `${x}:${y}`;
const roomSuspended = (state, spec, room) =>
  cells(spec, room).some(cell => isRentDue(state, cell.x));
const rentStatusKey = state =>
  state.leases.map(lease => Number(lease.remaining <= 0)).join(',');

function startClock(game) {
  if (clocks.has(game)) return;
  clocks.add(game);

  let dirty = 0;
  let skip = true;

  function flush() {
    if (!dirty) return;
    dirty = 0;
    requestAutosave();
  }

  function visibility() {
    skip = true;
    flush();
  }

  function tick(_time, delta) {
    if (document.hidden) return;
    if (skip) {
      skip = false;
      return;
    }
    if (!Number.isFinite(delta) || delta <= 0 || delta > 250 || !ready()) return;

    const state = read();
    const initialized = openFund(state);
    const beforeRent = rentStatusKey(state);
    const rentRunning = state.leases.some(lease => lease.remaining > 0);
    const rentPaid = advanceAnnexRent(state, delta);
    const rentChanged = beforeRent !== rentStatusKey(state);
    const producing = state.uncollected < CAP;
    let earned = 0;

    if (producing) {
      state.officeProgress += delta;

      if (state.officeProgress >= CYCLE) {
        state.officeProgress -= CYCLE;
        earned += 10;
      }

      for (const spec of ROOMS) {
        const room = state.rooms[spec.id];
        if (!room?.hired || roomSuspended(state, spec, room)) continue;

        room.progress += delta;

        if (room.progress >= CYCLE) {
          room.progress -= CYCLE;
          earned += spec.pay;
        }
      }

      state.uncollected = Math.min(CAP, state.uncollected + earned);
    }

    if (initialized || rentPaid || rentChanged || rentRunning || producing) {
      write(state);
      dirty += delta;
    }

    if (initialized || rentPaid || rentChanged || earned || dirty >= 5_000) flush();
  }

  game.events.on('step', tick);
  document.addEventListener('visibilitychange', visibility);

  game.events.once('destroy', () => {
    game.events.off('step', tick);
    document.removeEventListener('visibilitychange', visibility);
    flush();
    clocks.delete(game);
  });
}

function placementError(state, spec, position) {
  const occupied = new Set();

  for (const other of ROOMS) {
    const room = state.rooms[other.id];
    if (!room || other.id === spec.id) continue;
    for (const cell of cells(other, room)) occupied.add(keyOf(cell));
  }

  for (const cell of cells(spec, position)) {
    if (cell.x < 0 || cell.x >= state.columns || cell.y < 0 || cell.y >= ROWS) {
      return 'That room would stick out past the leased floor.';
    }
    if (isRentDue(state, cell.x)) return 'Pay the annex rent first.';
    if (occupied.has(keyOf(cell))) return 'That space is already occupied.';
  }

  return '';
}

function roomLock(state, spec) {
  if (spec.id === 'records' && !state.rooms.front?.hired) return 'Hire Nora first.';

  if (spec.id === 'lab') {
    if (state.columns < 4) return 'Lease the first annex.';
    if (!state.rooms.records?.hired) return 'Hire Milo first.';
  }

  return '';
}

const CSS = `
.pi-expansion-dialog {
  box-sizing:border-box;width:min(760px,calc(100vw - 24px));
  max-height:calc(100dvh - 24px);padding:0;overflow:auto;
  border:2px solid #96764a;border-radius:8px;
  background:#f6e9c8;color:#263a43;
  box-shadow:0 12px 50px #0009;font:16px SpecialElite,monospace;
}
.pi-expansion-dialog::backdrop {background:#101923cb}
.pi-expansion-dialog * {box-sizing:border-box}
.pi-expansion-dialog .pi-body {padding:clamp(12px,3vw,23px)}
.pi-expansion-dialog h2 {font:clamp(12px,2.4vw,17px) PressStart2P,monospace;margin:0}
.pi-expansion-dialog h3 {margin:0 0 6px;font:700 17px SpecialElite,monospace}
.pi-expansion-dialog p {margin:5px 0;overflow-wrap:anywhere}
.pi-expansion-dialog .pi-row {display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pi-expansion-dialog .pi-between {justify-content:space-between}
.pi-expansion-dialog button {
  border:1px solid #294752;border-radius:4px;padding:8px 10px;
  color:#fff4d7;background:#294752;font:inherit;cursor:pointer;line-height:1.15;
}
.pi-expansion-dialog button:focus-visible {outline:3px solid #81543a;outline-offset:2px}
.pi-expansion-dialog button:disabled {opacity:.55;cursor:not-allowed}
.pi-expansion-dialog .pi-gold {background:#f1c66c;color:#28383d}
.pi-expansion-dialog .pi-fund {
  margin:10px 0 12px;padding:10px;background:#e1e7cf;border:1px solid #859a7c;
}
.pi-expansion-dialog .pi-board {
  position:relative;width:min(100%,560px);margin:10px auto;
  border:3px solid #3c4345;border-radius:6px;overflow:hidden;background:#40545a;
}
.pi-expansion-dialog .pi-board svg {display:block;width:100%;height:auto;pointer-events:none}
.pi-expansion-dialog .pi-hit-grid {position:absolute;inset:0;display:grid}
.pi-expansion-dialog .pi-hit-grid .pi-tile {
  position:relative;min-width:0;min-height:0;padding:0;border:0;border-radius:0;
  background:transparent;box-shadow:none;outline-offset:-4px;
}
.pi-expansion-dialog .pi-hit-grid .pi-tile:disabled {opacity:1}
.pi-expansion-dialog .pi-hit-grid .pi-tile:not(:disabled):hover {
  box-shadow:inset 0 0 0 2px #fff5d7;
}
.pi-expansion-dialog .pi-hit-grid .pi-tile.pi-valid {
  background:#52ad6380;box-shadow:inset 0 0 0 2px #235b33;
}
.pi-expansion-dialog .pi-hit-grid .pi-tile.pi-invalid {
  background:#d44d4b85;box-shadow:inset 0 0 0 2px #863639;
}
.pi-expansion-dialog .pi-cards {
  display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,195px),1fr));gap:8px;
}
.pi-expansion-dialog .pi-card {padding:11px;border:1px solid #aa9971;background:#fff4d8}
.pi-expansion-dialog .pi-card .pi-row {margin-top:8px}
.pi-expansion-dialog .pi-small {font-size:14px}
.pi-expansion-dialog .pi-notice {color:#823f34;min-height:1.3em}
`;

function element(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function control(text, action, { gold = false, disabled = false } = {}) {
  const node = element('button', text, gold ? 'pi-gold' : '');
  node.type = 'button';
  node.disabled = disabled;
  node.addEventListener('click', action);
  return node;
}

function svg(parent, tag, attrs = {}, text = '') {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text) node.textContent = text;
  parent.append(node);
  return node;
}

function rect(parent, x, y, w, h, fill, options = {}) {
  return svg(parent, 'rect', { x, y, width: w, height: h, fill, ...options });
}

function line(parent, x1, y1, x2, y2, stroke, width = 1) {
  return svg(parent, 'line', { x1, y1, x2, y2, stroke, 'stroke-width': width });
}

function artText(parent, x, y, text, size, fill = '#332d38') {
  return svg(parent, 'text', {
    x, y, fill, 'font-size': size, 'font-family': 'SpecialElite, monospace',
    'font-weight': 'bold', 'text-anchor': 'middle'
  }, text);
}

function furniture(parent, kind, x, y) {
  const g = svg(parent, 'g', { transform: `translate(${x} ${y})` });
  const ink = '#3d3342';
  const box = (xx, yy, w, h, fill, rx = 3) =>
    rect(g, xx, yy, w, h, fill, { rx, stroke: ink, 'stroke-width': 2 });

  if (kind === 'plant') {
    svg(g, 'ellipse', { cx: 33, cy: 48, rx: 15, ry: 5, fill: '#30242d', opacity: 0.22 });
    box(22, 34, 20, 15, '#ad718c');
    for (const [xx, yy] of [[14, 15], [24, 9], [37, 8], [49, 17]]) {
      line(g, 32, 36, xx, yy, '#426346', 2);
      svg(g, 'ellipse', { cx: xx, cy: yy, rx: 8, ry: 5, fill: '#83aa69', stroke: '#426346' });
    }
    return;
  }

  rect(g, 7, 11, 57, 39, '#30242d', { rx: 5, opacity: 0.2 });

  if (kind === 'desk' || kind === 'bench') {
    box(7, 38, 7, 12, '#755456');
    box(49, 38, 7, 12, '#755456');
    box(4, 8, 56, 34, kind === 'desk' ? '#b78c6b' : '#9b858c');
    rect(g, 8, 12, 48, 25, 'none', { rx: 2, stroke: '#ebceb3' });

    if (kind === 'desk') {
      box(13, 13, 23, 15, '#525367');
      rect(g, 16, 16, 17, 9, '#b9d8bd');
      box(19, 30, 17, 5, '#ded8c8', 1);
      rect(g, 41, 20, 11, 12, '#f4e9cd', { rx: 1 });
    } else {
      svg(g, 'circle', { cx: 23, cy: 23, r: 8, fill: '#c1dce0', stroke: '#63566c', 'stroke-width': 2 });
      line(g, 29, 29, 36, 35, '#63566c', 4);
      rect(g, 42, 16, 10, 16, '#efe2c4', { rx: 1 });
    }
  } else if (kind === 'shelf') {
    box(7, 5, 50, 43, '#a46887');
    rect(g, 12, 10, 40, 31, '#503748');
    const colors = ['#e0c487', '#a7becb', '#c6d2aa', '#d29298'];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        rect(g, 15 + col * 8, 12 + row * 14, 6, 10, colors[(row + col) % colors.length]);
      }
      line(g, 12, 23 + row * 14, 52, 23 + row * 14, '#d497ac', 2);
    }
  } else {
    box(8, 5, 49, 44, '#87999b');
    for (let row = 0; row < 3; row++) {
      box(12, 9 + row * 12, 41, 10, '#b7c3ba', 2);
      line(g, 27, 14 + row * 12, 38, 14 + row * 12, '#596572', 2);
    }
  }
}

function pawn(parent, spec, x, y) {
  const g = svg(parent, 'g', { transform: `translate(${x} ${y})` });
  const ink = '#302833';

  svg(g, 'ellipse', { cx: 18, cy: 42, rx: 16, ry: 6, fill: ink, opacity: 0.24 });
  rect(g, 4, 22, 27, 21, spec.shirt, { rx: 6, stroke: ink, 'stroke-width': 2 });
  rect(g, 8, 26, 4, 12, '#fff3dc', { rx: 2, opacity: 0.25 });

  if (spec.longHair) {
    rect(g, 6, 11, 23, 16, spec.hair, { rx: 6 });
  }

  svg(g, 'circle', {
    cx: 17.5, cy: 16, r: 10, fill: spec.skin, stroke: ink, 'stroke-width': 2
  });
  svg(g, 'ellipse', { cx: 17, cy: 10, rx: 10, ry: 5, fill: spec.hair });
  svg(g, 'circle', { cx: 14, cy: 17, r: 1.4, fill: ink });
  svg(g, 'circle', { cx: 21, cy: 17, r: 1.4, fill: ink });
  line(g, 16, 21, 19, 21, ink);
}

function drawRoom(parent, state, spec, room) {
  const w = CELL * (room.vertical ? 1 : spec.size);
  const h = CELL * (room.vertical ? spec.size : 1);
  const suspended = roomSuspended(state, spec, room);

  const g = svg(parent, 'g', {
    transform: `translate(${room.x * CELL} ${room.y * CELL})`
  });

  const interior = svg(g, 'g', { opacity: suspended ? 0.5 : 1 });
  rect(interior, 3, 3, w - 6, h - 6, `url(#pi-floor-${spec.id})`, { rx: 4 });

  const furnitureKinds = spec.id === 'front' ? ['desk', 'plant']
    : spec.id === 'records' ? ['shelf', 'cabinet', 'desk']
    : ['bench', 'desk', 'cabinet'];

  furnitureKinds.forEach((kind, i) => {
    const x = room.vertical ? 9 : i * CELL + 12;
    const y = room.vertical ? i * CELL + 22 : 13;
    furniture(interior, kind, x, y);
  });

  if (room.hired) {
    const station = spec.id === 'records' ? 2 : 0;
    const x = room.vertical ? 54 : station * CELL + 54;
    const y = room.vertical ? station * CELL + 31 : 34;
    pawn(interior, spec, x, y);
  }

  rect(g, 3, 3, w - 6, h - 6, 'none', {
    rx: 4, stroke: suspended ? '#974638' : '#372e3c', 'stroke-width': 5
  });

  const tag = suspended ? 'RENT DUE' : spec.short;
  const tagWidth = Math.min(w - 12, tag.length * 6 + 18);

  rect(g, (w - tagWidth) / 2, h - 22, tagWidth, 16,
    suspended ? '#974638' : '#fff1d0',
    { rx: 3, stroke: '#493946' });
  artText(g, w / 2, h - 10, tag, 10, suspended ? '#fff1d0' : '#332d38');
}

function drawBoardArt(board, state, columns, movingId, selecting) {
  const picture = svg(board, 'svg', {
    viewBox: `0 0 ${columns * CELL} ${ROWS * CELL}`,
    'aria-hidden': 'true', focusable: 'false'
  });

  const defs = svg(picture, 'defs');
  const pattern = (id, width, height) => svg(defs, 'pattern', {
    id: `pi-floor-${id}`, width, height, patternUnits: 'userSpaceOnUse'
  });

  const checker = pattern('front', 28, 28);
  rect(checker, 0, 0, 28, 28, '#c2d6be');
  rect(checker, 0, 0, 14, 14, '#a7c2a8');
  rect(checker, 14, 14, 14, 14, '#a7c2a8');

  const wood = pattern('records', 40, 40);
  rect(wood, 0, 0, 40, 40, '#dfb78e');
  rect(wood, 0, 0, 40, 10, '#e9c59d');
  rect(wood, 0, 20, 40, 10, '#edc9a5');
  for (const y of [0, 10, 20, 30]) {
    line(wood, 0, y, 40, y, '#ad846e');
    line(wood, y % 20 ? 28 : 12, y, y % 20 ? 28 : 12, y + 10, '#ad846e');
  }

  const tile = pattern('lab', 20, 20);
  rect(tile, 0, 0, 20, 20, '#b7cddc');
  rect(tile, 1, 1, 18, 18, '#cbdce5', { stroke: '#8eacbd' });
  line(tile, 3, 3, 16, 3, '#edf3ef');

  const annex = pattern('annex', 12, 12);
  rect(annex, 0, 0, 12, 12, '#435763');
  line(annex, 0, 12, 12, 0, '#617781', 2);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < columns; x++) {
      const locked = x >= state.columns;
      const fill = locked ? 'url(#pi-floor-annex)' : isRentDue(state, x)
        ? '#d7a59b' : (x + y) % 2 ? '#ded5bc' : '#f0e6cb';
      rect(picture, x * CELL, y * CELL, CELL, CELL, fill, { stroke: '#8a8179' });
    }
  }

  for (const spec of ROOMS) {
    const room = state.rooms[spec.id];
    if (room && spec.id !== movingId) drawRoom(picture, state, spec, room);
  }

  if (selecting) {
    for (let x = 1; x < columns; x++) {
      const gridLine = line(picture, x * CELL, 0, x * CELL, ROWS * CELL, '#fff4da', 1.5);
      gridLine.setAttribute('stroke-dasharray', '4 4');
    }
    for (let y = 1; y < ROWS; y++) {
      const gridLine = line(picture, 0, y * CELL, columns * CELL, y * CELL, '#fff4da', 1.5);
      gridLine.setAttribute('stroke-dasharray', '4 4');
    }
  }

  for (let x = START_COLUMNS; x < state.columns; x++) {
    if (!isRentDue(state, x)) continue;
    rect(picture, x * CELL + 2, 2, CELL - 4, ROWS * CELL - 4, 'none', {
      stroke: '#a54636', 'stroke-width': 4
    });
  }

  if (columns > state.columns) {
    const cx = state.columns * CELL + CELL / 2;
    artText(picture, cx, 145, 'NEXT', 14, '#fff1d0');
    artText(picture, cx, 163, 'DOOR', 14, '#fff1d0');
  }
}

export function mountOfficeExpansion(scene) {
  if (mounted.has(scene)) return;
  mounted.add(scene);
  startClock(scene.game);

  const root = scene.add.container(0, 0).setDepth(155);
  const icon = scene.add.rectangle(0, 0, 36, 36, 0x294752)
    .setOrigin(0)
    .setStrokeStyle(2, 0xe3bb66)
    .setInteractive({ useHandCursor: true });

  const glyph = scene.add.graphics();
  glyph.lineStyle(1, 0xffe3a0);
  glyph.strokeRect(9, 9, 18, 18);

  for (const offset of [15, 21]) {
    glyph.lineBetween(offset, 9, offset, 27);
    glyph.lineBetween(9, offset, 27, offset);
  }

  const badge = scene.add.text(36, 37, '', {
    fontFamily: 'PressStart2P, monospace',
    fontSize: '8px',
    color: '#fff4d8',
    backgroundColor: '#934739',
    padding: { x: 4, y: 3 }
  }).setOrigin(1, 0);

  const tooltip = scene.add.text(0, 38, 'Office Expansion', {
    fontFamily: 'SpecialElite, monospace',
    fontSize: '14px',
    color: '#fff4d8',
    backgroundColor: '#294752',
    padding: { x: 7, y: 4 }
  }).setOrigin(1, 0).setVisible(false);

  root.add([icon, glyph, badge, tooltip]);

  let dialog = null;
  let placement = null;
  let notice = '';
  let live = null;

  function layout() {
    root.setPosition(Math.max(10, scene.scale.width - HUD_RIGHT_GAP), HUD_TOP);
  }

  function close() {
    const previous = dialog;
    dialog = null;
    placement = null;
    notice = '';
    live = null;

    if (previous?.open) previous.close();
    previous?.remove();

    if (scene.activeDevice === DEVICE) scene.deviceClosed(DEVICE);
  }

  function open(pointer) {
    if (dialog || !scene.bigOffice || !ready() || !scene.canUseOffice()) return;
    if (scene.pointerBlocked(pointer)) return;

    const state = read();
    const changed = openFund(state);

    if (changed || !state.seen) {
      state.seen = true;
      write(state, true);
    }

    tooltip.setVisible(false);
    scene.deviceOpened(DEVICE);

    dialog = element('dialog', '', 'pi-expansion-dialog');
    dialog.setAttribute('aria-label', 'Office Expansion');
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (placement) cancelPlacement();
      else close();
    });

    const fullscreen = document.fullscreenElement;
    const host = fullscreen && fullscreen.tagName !== 'CANVAS' ? fullscreen : document.body;
    host.append(dialog);

    try {
      dialog.showModal();
      render('close');
    } catch (error) {
      close();
      console.error('[OfficeExpansion] Could not open the floor plan:', error);
    }
  }

  icon.on('pointerover', () => {
    if (scene.canUseOffice()) tooltip.setVisible(true);
  });
  icon.on('pointerout', () => tooltip.setVisible(false));
  icon.on('pointerdown', (pointer, _x, _y, event) => {
    event?.stopPropagation();
    open(pointer);
  });

  function startPlacement(spec, moving) {
    const current = read().rooms[spec.id];
    placement = {
      spec,
      moving,
      vertical: current?.vertical ?? false,
      anchor: current ? { x: current.x, y: current.y } : null
    };
    notice = moving ? 'Choose the new position.' : 'Choose the first tile.';
    render(`tile-${current ? keyOf(current) : '0:0'}`);
  }

  function cancelPlacement() {
    const focusKey = placement ? `room-${placement.spec.id}` : 'close';
    placement = null;
    notice = '';
    render(focusKey);
  }

  function confirmPlacement() {
    if (!placement?.anchor || !ready()) return;

    const { spec, moving, vertical, anchor } = placement;
    const state = read();
    const current = state.rooms[spec.id];
    const position = { ...anchor, vertical };

    const error = placementError(state, spec, position)
      || (moving && !current ? 'Room not found.' : '')
      || (!moving && current ? 'You already own this room.' : '')
      || (!moving ? roomLock(state, spec) : '')
      || (!moving && state.fund < spec.price ? 'Not enough in The Alibi Fund.' : '');

    if (error) {
      notice = error;
      render();
      return;
    }

    if (!moving) {
      if (!postAlibi(state, -spec.price, spec.name)) return;
      state.lastEntry = `−${money(spec.price)} — ${spec.name}`;
    }

    state.rooms[spec.id] = {
      ...(current || { hired: false, progress: 0 }),
      ...position
    };

    write(state, true);
    placement = null;
    notice = moving ? `${spec.name} moved. No charge.` : spec.note;
    render(`room-${spec.id}`);
  }

  function hire(spec) {
    const state = read();
    const room = state.rooms[spec.id];

    if (!ready() || !room || room.hired || roomSuspended(state, spec, room)) return;
    if (!postAlibi(state, -spec.hire, `Hired ${spec.worker}`)) return;

    room.hired = true;
    state.lastEntry = `−${money(spec.hire)} — Hired ${spec.worker}`;
    write(state, true);
    notice = `${spec.worker} is now working in ${spec.name}.`;
    render(`room-${spec.id}`);
  }

  function lease() {
    const state = read();
    if (!ready() || state.columns >= MAX_COLUMNS) return;
    if (!startAnnexLease(state)) return;

    state.lastEntry = `−${money(ANNEX_RENT)} — Annex rent · column ${state.columns}`;
    write(state, true);
    notice = 'Three extra tiles. The landlord calls it a wing.';
    render('lease');
  }

  function collect() {
    const state = read();
    if (!ready() || !state.uncollected) return;

    const amount = state.uncollected;
    if (!postAlibi(state, amount, 'Collected office earnings')) return;

    state.uncollected = 0;
    const beforeRent = state.fund;
    advanceAnnexRent(state, 0);
    const paid = beforeRent - state.fund;

    state.lastEntry = paid
      ? `+${money(amount)} collected · −${money(paid)} overdue rent`
      : `+${money(amount)} — Office earnings`;

    write(state, true);
    notice = paid
      ? `${money(amount)} collected. ${money(paid)} paid towards overdue rent.`
      : `${money(amount)} moved to The Alibi Fund.`;
    render('close');
  }

  function drawGrid(body, state) {
    const columns = state.columns + Number(state.columns < MAX_COLUMNS);
    const board = element('div', '', 'pi-board');
    const grid = element('div', '', 'pi-hit-grid');
    const tiles = new Map();
    const occupants = new Map();
    const movingId = placement?.moving ? placement.spec.id : null;

    drawBoardArt(board, state, columns, movingId, Boolean(placement));

    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${ROWS}, minmax(0, 1fr))`;
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Office floor plan');

    for (const spec of ROOMS) {
      const room = state.rooms[spec.id];
      if (!room || spec.id === movingId) continue;
      for (const cell of cells(spec, room)) occupants.set(keyOf(cell), spec);
    }

    function preview(anchor) {
      for (const tile of tiles.values()) tile.classList.remove('pi-valid', 'pi-invalid');
      if (!placement || !anchor) return;

      const position = { ...anchor, vertical: placement.vertical };
      const name = placementError(state, placement.spec, position) ? 'pi-invalid' : 'pi-valid';

      for (const cell of cells(placement.spec, position)) {
        tiles.get(keyOf(cell))?.classList.add(name);
      }
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < columns; x++) {
        const anchor = { x, y };
        const key = keyOf(anchor);
        const spec = occupants.get(key);
        const tile = element('button', '', 'pi-tile');
        const locked = x >= state.columns;
        const due = !locked && isRentDue(state, x);

        tile.type = 'button';
        tile.disabled = locked;
        tile.dataset.focusKey = `tile-${key}`;
        tile.setAttribute('aria-label',
          `${locked ? 'Unleased annex' : spec?.name || 'Empty tile'}, ` +
          `column ${x + 1}, row ${y + 1}${due ? ', rent due' : ''}`
        );

        if (!locked) {
          tile.addEventListener('pointerenter', () => preview(anchor));
          tile.addEventListener('focus', () => {
            if (placement) preview(placement.anchor || anchor);
          });

          tile.addEventListener('click', () => {
            const current = read();

            if (placement) {
              placement.anchor = anchor;
              notice = placementError(current, placement.spec, {
                ...anchor, vertical: placement.vertical
              });
            } else if (spec) {
              const room = current.rooms[spec.id];
              if (!room) return;

              notice = roomSuspended(current, spec, room)
                ? `${spec.name} is paused. Rent is due.`
                : room.hired
                  ? `${spec.worker} is working in ${spec.name}.`
                  : `${spec.name} is vacant.`;
            } else if (due) {
              notice = 'Rent is due on this column.';
            } else {
              return;
            }

            render(`tile-${key}`);
          });
        }

        tiles.set(key, tile);
        grid.append(tile);
      }
    }

    grid.addEventListener('pointerleave', () => preview(placement?.anchor));
    preview(placement?.anchor);
    board.append(grid);
    body.append(board);
  }

  function drawCards(body, state) {
    const cards = element('div', '', 'pi-cards');

    for (const spec of ROOMS) {
      const room = state.rooms[spec.id];
      const lock = room ? '' : roomLock(state, spec);
      const suspended = room && roomSuspended(state, spec, room);
      const card = element('section', '', 'pi-card');
      const actions = element('div', '', 'pi-row');

      card.append(
        element('h3', spec.name),
        element('p', `${spec.size} tiles · ${room ? 'Built' : money(spec.price)}`, 'pi-small')
      );

      if (!room) {
        card.append(element('p', lock || spec.note, 'pi-small'));

        const place = control('PLACE', () => startPlacement(spec, false), {
          gold: true, disabled: Boolean(lock) || state.fund < spec.price
        });
        place.dataset.focusKey = `room-${spec.id}`;
        actions.append(place);
      } else {
        const status = element('p', room.hired ? '' : `Vacant · ${spec.worker}`, 'pi-small');
        card.append(status);

        if (room.hired) {
          live.workerStatus.set(spec.id, status);
        } else {
          if (suspended) card.append(element('p', 'RENT DUE', 'pi-small'));

          const hireButton = control(`HIRE ${money(spec.hire)}`, () => hire(spec), {
            gold: true, disabled: Boolean(suspended) || state.fund < spec.hire
          });
          hireButton.dataset.focusKey = `hire-${spec.id}`;
          actions.append(hireButton);
        }

        const move = control('MOVE', () => startPlacement(spec, true));
        move.dataset.focusKey = `room-${spec.id}`;
        actions.append(move);
      }

      card.append(actions);
      cards.append(card);
    }

    body.append(cards);
  }

  function render(focusKey) {
    if (!dialog) return;

    const scroll = dialog.scrollTop;
    const activeKey = focusKey || document.activeElement?.dataset?.focusKey;
    const state = read();
    const body = element('div', '', 'pi-body');
    const heading = element('div', '', 'pi-row pi-between');
    const closeButton = control('CLOSE', close);
    closeButton.dataset.focusKey = 'close';
    heading.append(element('h2', 'OFFICE EXPANSION'), closeButton);

    const fund = element('div', '', 'pi-fund');
    fund.append(
      element('strong', `THE ALIBI FUND · ${money(state.fund)}`),
      element('p', 'Every dollar has a witness.', 'pi-small')
    );

    const tray = element('p', '', 'pi-small');
    const rentLine = element('p', '', 'pi-small');
    const collectButton = control('COLLECT', collect, {
      gold: true, disabled: !state.uncollected || Boolean(placement)
    });
    collectButton.dataset.focusKey = 'collect';

    const fundActions = element('div', '', 'pi-row');
    fundActions.append(collectButton, tray);
    fund.append(fundActions, rentLine);

    live = {
      tray, rentLine, collectButton, workerStatus: new Map(),
      fund: state.fund, rentKey: rentStatusKey(state)
    };

    body.append(heading, fund);
    body.append(element('p', `${state.columns} × ${ROWS} floor plan`, 'pi-small'));
    drawGrid(body, state);

    if (placement) {
      const actions = element('div', '', 'pi-row');
      const position = placement.anchor && {
        ...placement.anchor, vertical: placement.vertical
      };
      const valid = position && !placementError(state, placement.spec, position);
      const affordable = placement.moving || state.fund >= placement.spec.price;

      body.append(element('p', `${placement.moving ? 'Move' : 'Place'} ${placement.spec.name} · ${
        placement.vertical ? 'Vertical' : 'Horizontal'
      }`));

      const rotate = control('ROTATE', () => {
        placement.vertical = !placement.vertical;
        notice = placement.anchor
          ? placementError(read(), placement.spec, {
              ...placement.anchor, vertical: placement.vertical
            })
          : 'Choose the first tile.';
        render('rotate');
      });
      rotate.dataset.focusKey = 'rotate';

      const confirm = control(
        placement.moving ? 'CONFIRM MOVE' : `BUILD ${money(placement.spec.price)}`,
        confirmPlacement,
        { gold: true, disabled: !valid || !affordable }
      );
      confirm.dataset.focusKey = 'confirm';

      actions.append(rotate, confirm, control('CANCEL', cancelPlacement));
      if (!affordable) body.append(element('p', 'Not enough in The Alibi Fund.', 'pi-small'));
      body.append(actions);
    } else {
      drawCards(body, state);

      if (state.columns < MAX_COLUMNS) {
        const actions = element('div', '', 'pi-row');
        actions.style.marginTop = '10px';

        const leaseButton = control('LEASE ANNEX', () => {
          if (window.confirm(
            `Lease three tiles for ${money(ANNEX_RENT)} every 10 minutes of play? ` +
            'The first payment is due now.'
          )) lease();
        }, { gold: true, disabled: state.fund < ANNEX_RENT });

        leaseButton.dataset.focusKey = 'lease';
        actions.append(
          leaseButton,
          element('p', `+3 tiles · ${money(ANNEX_RENT)} every 10 minutes of play.`, 'pi-small')
        );
        body.append(actions);
      }
    }

    const feedback = element('p', notice || state.lastEntry, 'pi-notice pi-small');
    feedback.setAttribute('role', 'status');
    body.append(feedback);

    dialog.replaceChildren(element('style', CSS), body);
    dialog.scrollTop = scroll;

    if (activeKey) {
      const next = [...dialog.querySelectorAll('[data-focus-key]')]
        .find(node => node.dataset.focusKey === activeKey && !node.disabled);
      (next || closeButton).focus({ preventScroll: true });
    }

    updateLive(state);
  }

  function updateLive(state) {
    if (!live) return;

    const full = state.uncollected >= CAP;
    const trayText = `${money(state.uncollected)} / ${money(CAP)} ready · ${
      full ? 'Tray full' : `Next base $10 in ${remaining(state.officeProgress)}`
    }`;

    if (live.tray.textContent !== trayText) live.tray.textContent = trayText;
    live.collectButton.disabled = !state.uncollected || Boolean(placement);

    const dueCount = state.leases.filter(lease => lease.remaining <= 0).length;
    const nextRent = state.leases.length
      ? Math.min(...state.leases.map(lease => lease.remaining))
      : 0;

    const rentText = dueCount
      ? `RENT DUE: ${money(dueCount * ANNEX_RENT)} · Collect to cover overdue rent.`
      : state.leases.length
        ? `Next annex rent: ${money(ANNEX_RENT)} per column · ${formatRentTime(nextRent)}`
        : 'No annex rent. Your landlord is unusually quiet.';

    if (live.rentLine.textContent !== rentText) live.rentLine.textContent = rentText;

    for (const spec of ROOMS) {
      const node = live.workerStatus.get(spec.id);
      const room = state.rooms[spec.id];
      if (!node || !room) continue;

      const status = roomSuspended(state, spec, room) ? 'RENT DUE'
        : full ? 'Paused — tray full' : remaining(room.progress);
      const text = `${spec.worker} · ${money(spec.pay)} / cycle · ${status}`;
      if (node.textContent !== text) node.textContent = text;
    }
  }

  function update() {
    const visible = scene.bigOffice && ready();
    const enabled = visible && scene.canUseOffice();
    root.setVisible(visible);
    icon.input.enabled = enabled;
    if (!enabled) tooltip.setVisible(false);

    if (!visible) {
      if (dialog) close();
      return;
    }

    const state = read();
    const due = state.leases.some(lease => lease.remaining <= 0);
    const value = due ? 'RENT' : state.uncollected
      ? money(state.uncollected)
      : state.seen ? '' : 'NEW';

    if (badge.text !== value) badge.setText(value);
    badge.setVisible(Boolean(value) && !tooltip.visible);

    if (!dialog) return;
    if (live && (live.fund !== state.fund || live.rentKey !== rentStatusKey(state))) {
      render();
    } else {
      updateLive(state);
    }
  }

  function cleanup() {
    close();
    scene.scale.off('resize', layout);
    scene.events.off('update', update);
    scene.events.off('shutdown', cleanup);
    scene.events.off('destroy', cleanup);
    root.destroy(true);
    mounted.delete(scene);
  }

  scene.scale.on('resize', layout);
  scene.events.on('update', update);
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);

  layout();
  update();
}