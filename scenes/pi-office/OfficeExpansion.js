import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import {
  needsOfficeMoveIn,
  ownsNewPIOffice
} from '../../managers/PIOfficeShopManager.js';

const DEVICE = 'office-expansion';
const HUD_RIGHT_GAP = 176;
const HUD_TOP = 14;
const ROWS = 3;
const START_COLUMNS = 3;
const MAX_COLUMNS = 5;
const CYCLE = 120_000;
const CAP = 200;

const ROOMS = [
  {
    id: 'front', name: 'Front Desk', short: 'DESK', size: 2,
    price: 150, worker: 'Nora Pike', initials: 'NP',
    hire: 300, pay: 20, color: '#bdd5bd',
    note: 'A bell, a ledger, and nowhere to hide.'
  },
  {
    id: 'records', name: 'Records Room', short: 'FILES', size: 3,
    price: 450, worker: 'Milo Finch', initials: 'MF',
    hire: 350, pay: 35, color: '#e9cd91',
    note: 'The files have requested privacy.'
  },
  {
    id: 'lab', name: 'Research Lab', short: 'LAB', size: 3,
    price: 600, worker: 'Ada Quill', initials: 'AQ',
    hire: 400, pay: 45, color: '#b8cedd',
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

function read() {
  const old = gameState.piOfficeShop?.idleOffice || {};
  const nora = old.nora === true || old.hired === true;
  const milo = old.room === true && old.milo === true;

  const legacy = {
    front: old.front === true || nora
      ? { x: 0, y: 0, vertical: false, hired: nora,
          progress: old.frontProgress ?? old.progress }
      : null,
    records: old.room === true
      ? { x: 0, y: 1, vertical: false, hired: milo,
          progress: old.recordsProgress }
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

  return {
    version: 3,
    columns: Math.min(MAX_COLUMNS, Math.max(START_COLUMNS, integer(old.columns))),
    rooms,
    seen: old.seen === true,
    fundOpened: old.fundOpened === true,
    fund: integer(old.fund),
    officeProgress: progress(old.officeProgress),
    uncollected: Math.min(CAP, integer(old.uncollected)),
    lastEntry: typeof old.lastEntry === 'string' ? old.lastEntry : ''
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
  if (state.fundOpened) return false;
  state.fundOpened = true;
  state.fund += 100;
  state.lastEntry = "+$100 — Previous tenant's unclaimed deposit";
  return true;
}

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
    if (openFund(state)) write(state, true);
    if (state.uncollected >= CAP) return;

    let earned = 0;

    state.officeProgress += delta;
    if (state.officeProgress >= CYCLE) {
      state.officeProgress -= CYCLE;
      earned += 10;
    }

    for (const spec of ROOMS) {
      const room = state.rooms[spec.id];
      if (!room?.hired) continue;

      room.progress += delta;
      if (room.progress >= CYCLE) {
        room.progress -= CYCLE;
        earned += spec.pay;
      }
    }

    state.uncollected = Math.min(CAP, state.uncollected + earned);
    write(state);
    dirty += delta;
    if (earned || dirty >= 5_000) flush();
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

function cells(spec, position) {
  return Array.from({ length: spec.size }, (_, i) => ({
    x: position.x + (position.vertical ? 0 : i),
    y: position.y + (position.vertical ? i : 0)
  }));
}

const keyOf = ({ x, y }) => `${x}:${y}`;

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

const leasePrice = state => 500 + (state.columns - START_COLUMNS) * 250;

function remaining(ms) {
  const seconds = Math.ceil((CYCLE - ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const CSS = `
.pi-expansion-dialog {
  box-sizing:border-box; width:min(760px,calc(100vw - 24px));
  max-height:calc(100dvh - 24px); padding:0; overflow:auto;
  border:2px solid #96764a; border-radius:8px;
  background:#f6e9c8; color:#263a43;
  box-shadow:0 12px 50px #0009;
  font:16px SpecialElite,monospace;
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
.pi-expansion-dialog .pi-fund {margin:10px 0 12px;padding:10px;background:#e1e7cf;border:1px solid #859a7c}
.pi-expansion-dialog .pi-grid {
  display:grid;gap:3px;padding:6px;background:#657979;
  border:2px solid #465b5d;border-radius:5px;margin:10px 0;
}
.pi-expansion-dialog .pi-tile {
  position:relative;min-width:0;min-height:48px;aspect-ratio:1.6;
  padding:2px;border-radius:2px;background:#f8edcf;color:#263a43;
  font:clamp(7px,1.8vw,11px) PressStart2P,monospace;
  overflow:hidden;
}
.pi-expansion-dialog .pi-tile small {display:block;margin-top:4px;font:13px SpecialElite,monospace}
.pi-expansion-dialog .pi-annex {background:#344b55;color:#fff1ce}
.pi-expansion-dialog .pi-tile.pi-valid {background:#83be89!important}
.pi-expansion-dialog .pi-tile.pi-invalid {background:#e28e7d!important}
.pi-expansion-dialog .pi-cards {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,195px),1fr));gap:8px}
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
  for (const line of [15, 21]) {
    glyph.lineBetween(line, 9, line, 27);
    glyph.lineBetween(9, line, 27, line);
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
    live = null;
    notice = '';

    if (previous) {
      previous.close();
      previous.remove();
    }
    if (scene.activeDevice === DEVICE) scene.deviceClosed(DEVICE);
  }

  function open(pointer) {
    if (dialog || !scene.bigOffice || !ready() || !scene.canUseOffice()) return;
    if (scene.pointerBlocked(pointer)) return;

    const state = read();
    const wasOpened = openFund(state);
    if (wasOpened || !state.seen) {
      state.seen = true;
      write(state, true);
    }

    tooltip.setVisible(false);
    scene.deviceOpened(DEVICE);

    dialog = element('dialog', '', 'pi-expansion-dialog');
    dialog.setAttribute('aria-label', 'Office Expansion');
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (placement) {
        placement = null;
        notice = '';
        render();
      } else {
        close();
      }
    });

    const fullscreen = document.fullscreenElement;
    const host = fullscreen && fullscreen.tagName !== 'CANVAS'
      ? fullscreen : document.body;
    host.append(dialog);
    dialog.showModal();
    render();
    dialog.querySelector('button')?.focus();
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
    render();
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
      state.fund -= spec.price;
      state.lastEntry = `−${money(spec.price)} — ${spec.name}`;
    }

    state.rooms[spec.id] = { ...(current || { hired: false, progress: 0 }), ...position };
    write(state, true);
    placement = null;
    notice = moving ? `${spec.name} moved. No charge.` : spec.note;
    render();
  }

  function hire(spec) {
    const state = read();
    const room = state.rooms[spec.id];
    if (!ready() || !room || room.hired || state.fund < spec.hire) return;

    room.hired = true;
    state.fund -= spec.hire;
    state.lastEntry = `−${money(spec.hire)} — Hired ${spec.worker}`;
    write(state, true);
    notice = `${spec.worker} is now working in ${spec.name}.`;
    render();
  }

  function lease() {
    const state = read();
    const price = leasePrice(state);

    if (!ready() || state.columns >= MAX_COLUMNS || state.fund < price) return;

    state.columns += 1;
    state.fund -= price;
    state.lastEntry = `−${money(price)} — Leased an annex`;
    write(state, true);
    notice = 'Three extra tiles. The landlord calls it a wing.';
    render();
  }

  function collect() {
    const state = read();
    if (!ready() || !state.uncollected) return;

    const amount = state.uncollected;
    state.fund += amount;
    state.uncollected = 0;
    state.lastEntry = `+${money(amount)} — Office earnings`;
    write(state, true);
    notice = `${money(amount)} moved to The Alibi Fund.`;
    render();
  }

  function drawGrid(body, state) {
    const showAnnex = state.columns < MAX_COLUMNS;
    const columns = state.columns + Number(showAnnex);
    const tiles = new Map();
    const occupants = new Map();
    const grid = element('div', '', 'pi-grid');
    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

    for (const spec of ROOMS) {
      const room = state.rooms[spec.id];
      if (!room || (placement?.moving && placement.spec.id === spec.id)) continue;

      cells(spec, room).forEach((cell, index) => {
        occupants.set(keyOf(cell), { spec, room, first: index === 0 });
      });
    }

    function preview(anchor) {
      for (const tile of tiles.values()) tile.classList.remove('pi-valid', 'pi-invalid');
      if (!placement || !anchor) return;

      const pos = { ...anchor, vertical: placement.vertical };
      const className = placementError(state, placement.spec, pos)
        ? 'pi-invalid' : 'pi-valid';
      for (const cell of cells(placement.spec, pos)) {
        tiles.get(keyOf(cell))?.classList.add(className);
      }
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < columns; x++) {
        const anchor = { x, y };
        const key = keyOf(anchor);

        if (x >= state.columns) {
          const annex = element('button', y === 1 ? 'NEXT DOOR' : '—', 'pi-tile pi-annex');
          annex.type = 'button';
          annex.disabled = true;
          grid.append(annex);
          continue;
        }

        const item = occupants.get(key);
        const tile = element('button', item?.first ? item.spec.short : '', 'pi-tile');
        tile.type = 'button';
        tile.setAttribute('aria-label', item
          ? `${item.spec.name}, column ${x + 1}, row ${y + 1}`
          : `Empty tile, column ${x + 1}, row ${y + 1}`);

        if (item) {
          tile.style.backgroundColor = item.spec.color;
          if (item.first && item.room.hired) tile.append(element('small', item.spec.initials));
        }

        tile.addEventListener('pointerenter', () => preview(anchor));
        tile.addEventListener('focus', () => preview(anchor));
        tile.addEventListener('click', () => {
          if (placement) {
            placement.anchor = anchor;
            notice = placementError(
              read(), placement.spec, { ...anchor, vertical: placement.vertical }
            );
            render();
          } else if (item) {
            notice = item.room.hired
              ? `${item.spec.worker} is working in ${item.spec.name}.`
              : `${item.spec.name} is vacant.`;
            render();
          }
        });

        tiles.set(key, tile);
        grid.append(tile);
      }
    }

    grid.addEventListener('pointerleave', () => preview(placement?.anchor));
    preview(placement?.anchor);
    body.append(grid);
  }

  function drawCards(body, state) {
    const cards = element('div', '', 'pi-cards');

    for (const spec of ROOMS) {
      const room = state.rooms[spec.id];
      const lock = room ? '' : roomLock(state, spec);
      const card = element('section', '', 'pi-card');
      const actions = element('div', '', 'pi-row');

      card.append(element('h3', spec.name));
      card.append(element('p',
        `${spec.size} tiles · ${room ? 'Built' : money(spec.price)}`, 'pi-small'));

      if (!room) {
        card.append(element('p', lock || spec.note, 'pi-small'));
        actions.append(control('PLACE', () => startPlacement(spec, false), {
          gold: true,
          disabled: Boolean(lock) || state.fund < spec.price
        }));
      } else {
        const status = element('p', room.hired ? '' : `Vacant · ${spec.worker}`, 'pi-small');
        card.append(status);

        if (room.hired) live.workerStatus.set(spec.id, status);
        else {
          actions.append(control(`HIRE ${money(spec.hire)}`, () => hire(spec), {
            gold: true,
            disabled: state.fund < spec.hire
          }));
        }

        actions.append(control('MOVE', () => startPlacement(spec, true)));
      }

      card.append(actions);
      cards.append(card);
    }

    body.append(cards);
  }

  function render() {
    if (!dialog) return;

    const scroll = dialog.scrollTop;
    const state = read();
    const style = element('style', CSS);
    const body = element('div', '', 'pi-body');
    const heading = element('div', '', 'pi-row pi-between');
    heading.append(element('h2', 'OFFICE EXPANSION'), control('CLOSE', close));

    const fund = element('div', '', 'pi-fund');
    fund.append(element('strong', `THE ALIBI FUND · ${money(state.fund)}`));
    fund.append(element('p', 'Every dollar has a witness.', 'pi-small'));

    const tray = element('p', '', 'pi-small');
    const collectButton = control('COLLECT', collect, {
      gold: true,
      disabled: !state.uncollected
    });

    const fundActions = element('div', '', 'pi-row');
    fundActions.append(collectButton, tray);
    fund.append(fundActions);

    live = { tray, collectButton, workerStatus: new Map() };

    body.append(heading, fund);
    body.append(element('p', `${state.columns} × ${ROWS} leased tiles`, 'pi-small'));
    drawGrid(body, state);

    if (placement) {
      const actions = element('div', '', 'pi-row');
      const pos = placement.anchor && {
        ...placement.anchor,
        vertical: placement.vertical
      };
      const valid = pos && !placementError(state, placement.spec, pos);

      body.append(element('p', `${placement.moving ? 'Move' : 'Place'} ${placement.spec.name} · ${
        placement.vertical ? 'Vertical' : 'Horizontal'
      }`));

      actions.append(
        control('ROTATE', () => {
          placement.vertical = !placement.vertical;
          notice = '';
          render();
        }),
        control(placement.moving ? 'CONFIRM MOVE' : `BUILD ${money(placement.spec.price)}`,
          confirmPlacement, { gold: true, disabled: !valid }),
        control('CANCEL', () => {
          placement = null;
          notice = '';
          render();
        })
      );

      body.append(actions);
    } else {
      drawCards(body, state);

      if (state.columns < MAX_COLUMNS) {
        const actions = element('div', '', 'pi-row');
        actions.style.marginTop = '10px';
        const price = leasePrice(state);
        const leaseButton = control(`LEASE ANNEX · ${money(price)}`, () => {
          if (window.confirm(`Lease three tiles for ${money(price)} from The Alibi Fund?`)) {
            lease();
          }
        }, { gold: true, disabled: state.fund < price });

        actions.append(leaseButton, element('p', 'Adds 3 tiles. One-time fee.', 'pi-small'));
        body.append(actions);
      }
    }

    const feedback = element('p', notice || state.lastEntry, 'pi-notice pi-small');
    feedback.setAttribute('role', 'status');
    body.append(feedback);
    dialog.replaceChildren(style, body);
    dialog.scrollTop = scroll;
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

    for (const spec of ROOMS) {
      const node = live.workerStatus.get(spec.id);
      const room = state.rooms[spec.id];
      if (!node || !room) continue;

      const text = `${spec.worker} · ${money(spec.pay)} / cycle · ${
        full ? 'Paused' : remaining(room.progress)
      }`;
      if (node.textContent !== text) node.textContent = text;
    }
  }

  function update() {
    const state = read();
    const visible = scene.bigOffice && ready();
    const enabled = visible && scene.canUseOffice();

    root.setVisible(visible);
    icon.input.enabled = enabled;
    if (!enabled) tooltip.setVisible(false);

    const value = state.uncollected
      ? money(state.uncollected)
      : state.seen ? '' : 'NEW';

    if (badge.text !== value) badge.setText(value);
    badge.setVisible(Boolean(value) && !tooltip.visible);

    if (dialog && !visible) close();
    else if (dialog) updateLive(state);
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