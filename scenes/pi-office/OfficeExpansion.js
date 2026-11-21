import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { needsOfficeMoveIn, ownsNewPIOffice } from '../../managers/PIOfficeShopManager.js';
import {
  ANNEX_RENT, advanceAnnexRent, ensureAlibiHistory, formatRentTime,
  isRentDue, postAlibi, readAlibiData, startAnnexLease
} from './AlibiFund.js';
import { ComputerDesktop } from '../../ui/pi-computer/ComputerDesktop.js';
import { ComputerThiefdokuArt } from '../../ui/pi-computer/ComputerThiefdokuArt.js';

const APP = 'office-expansion';
const ROWS = 3, START_COLUMNS = 3, MAX_COLUMNS = 5;
const CYCLE = 120000, CAP = 200;
const mounted = new WeakSet(), clocks = new WeakSet(), installed = new WeakSet();
const ready = () => ownsNewPIOffice() && !needsOfficeMoveIn();
const cash = n => `$${n}`;
const integer = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
const progress = n => Number.isFinite(n) ? Math.max(0, Math.min(CYCLE - 0.001, n)) : 0;
const remaining = n => formatRentTime(Math.max(0, CYCLE - n));
const keyOf = p => `${p.x}:${p.y}`;

const ROOMS = [
  { id:'front', name:'Front Desk', size:2, price:150, worker:'Nora Pike', hire:300, pay:20,
    gender:'f', skin:0xeab18d, hair:0x56353b, shirt:0xa65473, floor:'reception',
    furniture:['desk','plant'], station:0, note:'A bell, a ledger, and nowhere to hide.' },
  { id:'records', name:'Records Room', size:3, price:450, worker:'Milo Finch', hire:350, pay:35,
    gender:'m', skin:0xb87d5e, hair:0x352b35, shirt:0x526c84, floor:'archive',
    furniture:['shelf','cabinet','desk'], station:2, note:'The files have requested privacy.' },
  { id:'lab', name:'Research Lab', size:3, price:600, worker:'Ada Quill', hire:400, pay:45,
    gender:'f', skin:0xd69a72, hair:0x3f3034, shirt:0x557b68, floor:'restoration_lab',
    furniture:['table','computer','cabinet'], station:1,
    note:'It says laboratory. It means three magnifying glasses.' }
];

function read() {
  const old = gameState.piOfficeShop?.idleOffice || {};
  const nora = old.nora === true || old.hired === true;
  const legacy = {
    front: old.front === true || nora
      ? { x:0, y:0, vertical:false, hired:nora, progress:old.frontProgress ?? old.progress } : null,
    records: old.room === true
      ? { x:0, y:1, vertical:false, hired:old.milo === true, progress:old.recordsProgress } : null
  };
  const rooms = {};
  for (const spec of ROOMS) {
    const room = old.rooms?.[spec.id] ?? legacy[spec.id];
    if (!room) continue;
    rooms[spec.id] = {
      x:integer(room.x), y:integer(room.y), vertical:room.vertical === true,
      hired:room.hired === true, progress:progress(room.progress)
    };
  }
  const columns = Math.min(MAX_COLUMNS, Math.max(START_COLUMNS, integer(old.columns)));
  return {
    ...old, version:4, columns, rooms, seen:old.seen === true,
    fundOpened:old.fundOpened === true, fund:integer(old.fund),
    officeProgress:progress(old.officeProgress), uncollected:Math.min(CAP, integer(old.uncollected)),
    lastEntry:typeof old.lastEntry === 'string' ? old.lastEntry : '',
    ...readAlibiData({ ...old, columns })
  };
}
function write(state, save = false) {
  gameState.piOfficeShop = { ...gameState.piOfficeShop, idleOffice:state };
  if (save) requestAutosave();
}
function openFund(state) {
  const changed = ensureAlibiHistory(state);
  if (state.fundOpened) return changed;
  if (!postAlibi(state, 100, "Previous tenant's unclaimed deposit")) return changed;
  state.fundOpened = true;
  state.lastEntry = "+$100 — Previous tenant's unclaimed deposit";
  return true;
}
function cells(spec, room) {
  return Array.from({ length:spec.size }, (_, i) => ({
    x:room.x + (room.vertical ? 0 : i), y:room.y + (room.vertical ? i : 0)
  }));
}
const suspended = (state, spec, room) => cells(spec, room).some(p => isRentDue(state, p.x));
const rentKey = state => state.leases.map(l => Number(l.remaining <= 0)).join(',');
function roomLock(state, spec) {
  if (spec.id === 'records' && !state.rooms.front?.hired) return 'Hire Nora first.';
  if (spec.id === 'lab') {
    if (state.columns < 4) return 'Lease the first annex.';
    if (!state.rooms.records?.hired) return 'Hire Milo first.';
  }
  return '';
}
function placementError(state, spec, position) {
  const occupied = new Set();
  for (const other of ROOMS) {
    if (other.id === spec.id || !state.rooms[other.id]) continue;
    for (const p of cells(other, state.rooms[other.id])) occupied.add(keyOf(p));
  }
  for (const p of cells(spec, position)) {
    if (p.x < 0 || p.x >= state.columns || p.y < 0 || p.y >= ROWS)
      return 'That room would stick out past the leased floor.';
    if (isRentDue(state, p.x)) return 'Pay the annex rent first.';
    if (occupied.has(keyOf(p))) return 'That space is already occupied.';
  }
  return '';
}

function startClock(game) {
  if (clocks.has(game)) return;
  clocks.add(game);
  let dirty = 0, skip = true;
  const flush = () => {
    if (!dirty) return;
    dirty = 0;
    requestAutosave();
  };
  const visibility = () => { skip = true; flush(); };
  const tick = (_time, delta) => {
    if (document.hidden) return;
    if (skip) { skip = false; return; }
    if (!Number.isFinite(delta) || delta <= 0 || delta > 250 || !ready()) return;
    const state = read(), initialized = openFund(state), before = rentKey(state);
    const rentRunning = state.leases.some(l => l.remaining > 0);
    const paid = advanceAnnexRent(state, delta), changed = before !== rentKey(state);
    const producing = state.uncollected < CAP;
    let earned = 0;
    if (producing) {
      state.officeProgress += delta;
      if (state.officeProgress >= CYCLE) { state.officeProgress -= CYCLE; earned += 10; }
      for (const spec of ROOMS) {
        const room = state.rooms[spec.id];
        if (!room?.hired || suspended(state, spec, room)) continue;
        room.progress += delta;
        if (room.progress >= CYCLE) { room.progress -= CYCLE; earned += spec.pay; }
      }
      state.uncollected = Math.min(CAP, state.uncollected + earned);
    }
    if (initialized || paid || changed || rentRunning || producing) {
      write(state); dirty += delta;
    }
    if (initialized || paid || changed || earned || dirty >= 5000) flush();
  };
  game.events.on('step', tick);
  document.addEventListener('visibilitychange', visibility);
  game.events.once('destroy', () => {
    game.events.off('step', tick);
    document.removeEventListener('visibilitychange', visibility);
    flush(); clocks.delete(game);
  });
}

class ExpansionApp {
  constructor(ui) {
    this.ui = ui;
    this.tab = 'floor';
    this.placement = null;
    this.notice = '';
    this.preview = null;
    this.leasePending = false;
    this.labels = null;
    this.art = new ComputerThiefdokuArt(ui);
    this.elapsed = 0;
    this.onUpdate = (_time, delta) => {
      if (!this.labels || !ui.isOpen || ui.suspended || ui.booting || ui.destroyed) return;
      this.elapsed += delta || 0;
      if (this.elapsed < 300) return;
      this.elapsed = 0;
      const state = read();
      if (this.signature !== this.stateSignature(state)) {
        const win = ui.shell.byId(APP);
        if (win && !win.minimized) ui.render();
      } else this.updateLabels(state);
    };
    ui.scene.events.on('update', this.onUpdate);
    ui.scene.events.once('shutdown', () => ui.scene.events.off('update', this.onUpdate));
  }
  stateSignature(state) {
    return JSON.stringify([ready(), state.fund, rentKey(state), state.columns,
      state.uncollected, ROOMS.map(s => state.rooms[s.id]?.hired)]);
  }
  refresh() { this.ui.render(); }
  button(x, y, w, label, action, enabled = true, gold = false) {
    const d = this.ui.drawing;
    d.bevel(x, y, w, 29, enabled ? (gold ? 0xe2bd67 : 0xc8c9bd) : 0xb5b4aa);
    const t = d.text(x + w / 2, y + 6, label, 14, enabled ? '#263a43' : '#72746b');
    t.setOrigin(0.5, 0);
    if (t.width > w - 10) t.setScale((w - 10) / t.width, 1);
    if (enabled) d.rectangle(x, y, w, 29, 0xffffff, 0)
      .setInteractive({ useHandCursor:true }).on('pointerdown', () => {
        this.ui.options.onSfx?.('click'); action();
      });
  }
  open() {
    if (!ready()) return;
    const state = read();
    const changed = openFund(state);
    if (changed || !state.seen) { state.seen = true; write(state, true); }
    this.ui.menuOpen = false;
    this.ui.photoQuest.galleryViewer.active = false;
    this.ui.photoQuest.contactMail.composing = false;
    this.ui.shell.open(APP);
    this.ui.viewToken++;
    this.refresh();
  }
  begin(spec, moving = false) {
    const room = read().rooms[spec.id];
    this.tab = 'floor';
    this.leasePending = false;
    this.placement = {
      spec, moving, vertical:room?.vertical ?? false,
      anchor:room ? { x:room.x, y:room.y } : null
    };
    this.notice = 'Choose the first tile, then confirm.';
    this.refresh();
  }
  build() {
    const p = this.placement;
    if (!p?.anchor || !ready()) return;
    const state = read(), old = state.rooms[p.spec.id];
    const position = { ...p.anchor, vertical:p.vertical };
    const error = placementError(state, p.spec, position)
      || (p.moving && !old ? 'Room not found.' : '')
      || (!p.moving && old ? 'You already own this room.' : '')
      || (!p.moving ? roomLock(state, p.spec) : '')
      || (!p.moving && state.fund < p.spec.price ? 'Not enough in The Alibi Fund.' : '');
    if (error) { this.notice = error; this.refresh(); return; }
    if (!p.moving && !postAlibi(state, -p.spec.price, p.spec.name)) return;
    if (!p.moving) state.lastEntry = `−${cash(p.spec.price)} — ${p.spec.name}`;
    state.rooms[p.spec.id] = { ...(old || { hired:false, progress:0 }), ...position };
    write(state, true);
    this.notice = p.moving ? `${p.spec.name} moved. No charge.` : `${p.spec.name} built. Open STAFF to hire ${p.spec.worker}.`;
    this.placement = null;
    this.refresh();
  }
  hire(spec) {
    if (!ready()) return;
    const state = read(), room = state.rooms[spec.id];
    if (!room || room.hired || suspended(state, spec, room) || state.fund < spec.hire) return;
    if (!postAlibi(state, -spec.hire, `Hired ${spec.worker}`)) return;
    room.hired = true;
    state.lastEntry = `−${cash(spec.hire)} — Hired ${spec.worker}`;
    write(state, true);
    this.notice = `${spec.worker} is now working in ${spec.name}.`;
    this.refresh();
  }
  collect() {
    if (!ready()) return;
    const state = read(), amount = state.uncollected;
    if (!amount || !postAlibi(state, amount, 'Collected office earnings')) return;
    state.uncollected = 0;
    const before = state.fund;
    advanceAnnexRent(state, 0);
    const paid = before - state.fund;
    state.lastEntry = paid ? `+${cash(amount)} collected · −${cash(paid)} overdue rent`
      : `+${cash(amount)} — Office earnings`;
    write(state, true);
    this.notice = state.lastEntry;
    this.refresh();
  }
  lease() {
    if (!ready()) return;
    const state = read();
    if (state.columns >= MAX_COLUMNS || !startAnnexLease(state)) return;
    state.lastEntry = `−${cash(ANNEX_RENT)} — Annex rent · column ${state.columns}`;
    write(state, true);
    this.leasePending = false;
    this.notice = 'Three extra tiles. The landlord calls it a wing.';
    this.refresh();
  }
  render() {
    const ui = this.ui, d = ui.drawing;
    const box = ui.shell.rectFor({ x:72, y:58, w:976, h:618 });
    ui.window = box;
    this.preview = null;
    this.labels = null;
    d.rectangle(box.x + 6, box.y + 6, box.w, box.h, 0x050a10, 0.45);
    d.bevel(box.x, box.y, box.w, box.h, 0xe8dfc8);
    d.rectangle(box.x + 4, box.y + 4, box.w - 8, 34, 0x294b70);
    d.pixel(box.x + 15, box.y + 16, 'OFFICE EXPANSION', 11, '#fff1cc');
    this.button(box.x + box.w - 48, box.y + 6, 38, 'X', () => {
      this.placement = null;
      this.leasePending = false;
      ui.shell.close(APP); this.refresh();
    });
    if (!ready()) {
      d.text(box.x + 25, box.y + 65, 'Move into the new PI office to use Office Expansion.', 20, '#263a43');
      return;
    }
    const state = read(), x = box.x + 16, w = box.w - 32;
    this.signature = this.stateSignature(state);
    d.bevel(x, box.y + 47, w, 88, 0xdce5cc, true);
    const fund = d.text(x + 12, box.y + 55, '', 20, '#294532');
    const tray = d.text(x + 12, box.y + 81, '', 15, '#354638');
    const rent = d.text(x + 12, box.y + 107, '', 14, '#744434', w - 25);
    this.button(x + w - 122, box.y + 61, 108, 'COLLECT', () => this.collect(),
      state.uncollected > 0 && !this.placement, true);
    this.labels = { fund, tray, rent, staff:new Map() };
    this.button(x, box.y + 146, 150, 'FLOOR PLAN', () => {
      this.tab = 'floor'; this.leasePending = false; this.refresh();
    }, true, this.tab === 'floor');
    this.button(x + 158, box.y + 146, 120, 'STAFF', () => {
      this.tab = 'staff'; this.placement = null; this.leasePending = false; this.refresh();
    }, true, this.tab === 'staff');
    d.text(x + 295, box.y + 153, 'Every dollar has a witness.', 15, '#615c50');
    if (this.tab === 'staff') this.renderStaff(state, x, box.y + 190, w);
    else this.renderFloor(state, x, box.y + 187, w);
    d.bevel(x, box.y + box.h - 38, w, 28, 0xd0cdbb, true);
    const message = this.notice || state.lastEntry || 'Build a room. Hire a professional. Blame the paperwork.';
    const status = d.text(x + 9, box.y + box.h - 32, message, 14, '#683d33');
    d.fit(status, message, w - 18);
    this.updateLabels(state);
  }
  updateLabels(state) {
    const l = this.labels;
    if (!l?.fund?.scene) return;
    const full = state.uncollected >= CAP;
    l.fund.setText(`THE ALIBI FUND · ${cash(state.fund)}`);
    l.tray.setText(`${cash(state.uncollected)} / ${cash(CAP)} ready · ${full ? 'Tray full' : `Base $10 in ${remaining(state.officeProgress)}`}`);
    const due = state.leases.filter(a => a.remaining <= 0).length;
    l.rent.setText(due ? `RENT DUE: ${cash(due * ANNEX_RENT)} · Collect to cover overdue rent.`
      : state.leases.length ? `Annex: ${cash(ANNEX_RENT)} per column · Next rent ${formatRentTime(Math.min(...state.leases.map(a => a.remaining)))}`
      : 'No annex rent. Your landlord is unusually quiet.');
    for (const spec of ROOMS) {
      const node = l.staff.get(spec.id), room = state.rooms[spec.id];
      if (!node?.scene || !room?.hired) continue;
      node.setText(suspended(state, spec, room) ? 'PAUSED · RENT DUE'
        : full ? 'PAUSED · TRAY FULL' : `WORKING · Next payment ${remaining(room.progress)}`);
    }
  }
  renderStaff(state, x, y, w) {
    const d = this.ui.drawing;
    ROOMS.forEach((spec, i) => {
      const top = y + i * 110, room = state.rooms[spec.id];
      const due = room && suspended(state, spec, room);
      d.bevel(x, top, w, 101, 0xf1e9d5);
      this.art.portrait(spec, x + 10, top + 10, 64, 79);
      d.text(x + 90, top + 9, spec.worker, 22, '#293d49');
      d.text(x + 90, top + 37, `${spec.name} · ${cash(spec.pay)} every 2 minutes of active play`, 16, '#4e584b');
      const text = !room ? `Build ${spec.name} first.`
        : room.hired ? '' : due ? 'Pay the annex rent before hiring.'
        : state.fund < spec.hire ? `Hiring fee: ${cash(spec.hire)} · Not enough in The Alibi Fund.`
        : `Available · Hiring fee ${cash(spec.hire)}`;
      const status = d.text(x + 90, top + 66, text, 15, '#744a3d', w - 280);
      if (room?.hired) this.labels.staff.set(spec.id, status);
      if (room?.hired) {
        this.button(x + w - 150, top + 35, 135, 'EMPLOYED', () => {}, false);
      } else if (!room) {
        this.button(x + w - 150, top + 35, 135, 'FLOOR PLAN', () => {
          this.tab = 'floor'; this.notice = roomLock(read(), spec) || `Place ${spec.name} first.`; this.refresh();
        });
      } else {
        this.button(x + w - 150, top + 35, 135, `HIRE ${cash(spec.hire)}`,
          () => this.hire(spec), !due && state.fund >= spec.hire, true);
      }
    });
  }
  renderFloor(state, x, y, w) {
    const ui = this.ui, d = ui.drawing, cols = state.columns + Number(state.columns < MAX_COLUMNS);
    const cell = Math.min(90, Math.floor((w * 0.53) / cols));
    const bx = x + 4, by = y + 4;
    const g = d.add(ui.scene.add.graphics());
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < cols; col++) {
      g.fillStyle(col >= state.columns ? 0x435763 : isRentDue(state, col) ? 0xd7a59b : 0xe5d9bd, 1);
      g.fillRect(bx + col * cell, by + row * cell, cell, cell);
      g.lineStyle(1, 0x8b8175); g.strokeRect(bx + col * cell, by + row * cell, cell, cell);
    }
    const occupants = new Map();
    for (const spec of ROOMS) {
      const room = state.rooms[spec.id];
      if (!room || (this.placement?.moving && this.placement.spec.id === spec.id)) continue;
      const group = ui.scene.add.container(0, 0);
      d.add(group);
      this.art.parent = group;
      try {
        for (const p of cells(spec, room)) {
          occupants.set(keyOf(p), spec);
          this.art.floor(this.art.graphic(), bx + p.x * cell, by + p.y * cell, cell, spec.floor, p.y, p.x);
        }
        spec.furniture.forEach((kind, i) => {
          const fx = bx + (room.x + (room.vertical ? 0 : i)) * cell;
          const fy = by + (room.y + (room.vertical ? i : 0)) * cell;
          this.art.furniture({ kind }, fx + cell * 0.08, fy + cell * 0.08, cell * 0.76, cell * 0.66);
        });
        if (room.hired) {
          const px = bx + (room.x + (room.vertical ? 0 : spec.station)) * cell + cell * 0.53;
          const py = by + (room.y + (room.vertical ? spec.station : 0)) * cell + cell * 0.35;
          this.art.pawn(spec, px, py, cell * 0.44);
        }
        const rw = cell * (room.vertical ? 1 : spec.size), rh = cell * (room.vertical ? spec.size : 1);
        const outline = this.art.graphic();
        outline.lineStyle(3, 0x372e3c); outline.strokeRect(bx + room.x * cell + 2, by + room.y * cell + 2, rw - 4, rh - 4);
        this.art.nameTag(bx + room.x * cell + rw / 2, by + room.y * cell + rh - 12,
          spec.name, rw - 8, 11);
      } finally { this.art.parent = null; }
      if (suspended(state, spec, room)) {
        group.setAlpha(0.48);
        d.text(bx + room.x * cell + 5, by + room.y * cell + 5, 'RENT DUE', 11, '#8e342b');
      }
    }
    if (cols > state.columns) {
      d.text(bx + state.columns * cell + cell / 2, by + cell * 1.3, 'NEXT\nDOOR', 14, '#f8e5ba')
        .setOrigin(0.5, 0).setAlign('center');
    }
    this.preview = d.add(ui.scene.add.graphics());
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < state.columns; col++) {
      const anchor = { x:col, y:row };
      const hit = d.rectangle(bx + col * cell, by + row * cell, cell, cell, 0xffffff, 0)
        .setInteractive({ useHandCursor:true });
      if (this.placement) {
        const outline = d.add(ui.scene.add.graphics());
        outline.lineStyle(1, 0xfff5dc, 0.6);
        outline.strokeRect(bx + col * cell + 1, by + row * cell + 1, cell - 2, cell - 2);
      }
      hit.on('pointerover', () => this.drawPreview(state, anchor, bx, by, cell));
      hit.on('pointerout', () => this.drawPreview(state, this.placement?.anchor, bx, by, cell));
      hit.on('pointerdown', () => {
        if (this.placement) {
          this.placement.anchor = anchor;
          this.notice = placementError(read(), this.placement.spec, { ...anchor, vertical:this.placement.vertical });
        } else {
          const spec = occupants.get(keyOf(anchor));
          this.notice = spec ? `${spec.name} · ${state.rooms[spec.id].hired ? spec.worker : 'Vacant. Open STAFF to hire.'}`
            : isRentDue(state, col) ? 'Rent is due on this column.' : 'Choose PLACE to build a room here.';
        }
        this.refresh();
      });
    }
    this.drawPreview(state, this.placement?.anchor, bx, by, cell);
    const sideX = x + Math.floor(w * 0.56), sideW = w - Math.floor(w * 0.56);
    if (this.placement) {
      const p = this.placement;
      d.text(sideX, by + 8, `${p.moving ? 'Move' : 'Build'} ${p.spec.name}`, 22, '#293d49', sideW);
      d.text(sideX, by + 44, `${p.vertical ? 'Vertical' : 'Horizontal'} · ${p.spec.size} tiles\nChoose the first tile on the plan.`, 17, '#565748', sideW);
      this.button(sideX, by + 115, 125, 'ROTATE', () => {
        p.vertical = !p.vertical; this.refresh();
      });
      const pos = p.anchor && { ...p.anchor, vertical:p.vertical };
      const valid = pos && !placementError(state, p.spec, pos);
      this.button(sideX, by + 155, Math.min(sideW, 220), p.moving ? 'CONFIRM MOVE' : `BUILD ${cash(p.spec.price)}`,
        () => this.build(), Boolean(valid && (p.moving || state.fund >= p.spec.price)), true);
      this.button(sideX, by + 195, 125, 'CANCEL', () => {
        this.placement = null; this.notice = ''; this.refresh();
      });
    } else {
      ROOMS.forEach((spec, i) => {
        const top = by + i * 86, room = state.rooms[spec.id], lock = room ? '' : roomLock(state, spec);
        d.text(sideX, top + 2, spec.name, 21, '#293d49');
        const desc = room ? `${spec.size} tiles · ${room.hired ? spec.worker : 'Vacant · Hire in STAFF'}`
          : lock || `${spec.size} tiles · ${cash(spec.price)}`;
        d.text(sideX, top + 29, desc, 14, '#615548', sideW - 5);
        this.button(sideX, top + 49, 130, room ? 'MOVE' : `PLACE ${cash(spec.price)}`,
          () => this.begin(spec, Boolean(room)), Boolean(room) || (!lock && state.fund >= spec.price), !room);
      });
    }
    const footerY = by + 284;
    if (!this.placement && state.columns < MAX_COLUMNS) {
      this.button(bx, footerY, 150, this.leasePending ? 'CONFIRM LEASE' : 'LEASE ANNEX', () => {
        if (this.leasePending) this.lease();
        else { this.leasePending = true; this.refresh(); }
      }, state.fund >= ANNEX_RENT, true);
      d.text(bx, footerY + 35, `+3 tiles · ${cash(ANNEX_RENT)} every 10 minutes of play`, 14, '#68513e');
      if (this.leasePending) {
        this.button(bx + 160, footerY, 90, 'CANCEL', () => { this.leasePending = false; this.refresh(); });
        this.notice = 'The first rent payment is due now. Confirm to lease the annex.';
      }
    } else if (!this.placement) {
      d.text(bx, footerY + 5, 'Maximum floor area leased. The landlord is delighted.', 14, '#68513e', w);
    }
  }
  drawPreview(state, anchor, bx, by, cell) {
    this.preview?.clear();
    if (!anchor || !this.placement || !this.preview?.scene) return;
    const p = this.placement, pos = { ...anchor, vertical:p.vertical };
    const color = placementError(state, p.spec, pos) ? 0xd5544b : 0x52ad63;
    for (const tile of cells(p.spec, pos)) {
      if (tile.x < 0 || tile.x >= state.columns || tile.y < 0 || tile.y >= ROWS) continue;
      this.preview.fillStyle(color, 0.55);
      this.preview.fillRect(bx + tile.x * cell + 2, by + tile.y * cell + 2, cell - 4, cell - 4);
      this.preview.lineStyle(2, color, 1);
      this.preview.strokeRect(bx + tile.x * cell + 2, by + tile.y * cell + 2, cell - 4, cell - 4);
    }
  }
}

function install(ui) {
  if (installed.has(ui)) return;
  installed.add(ui);
  startClock(ui.scene.game);
  const app = new ExpansionApp(ui);
  ui.officeExpansionApp = app;
  ui.shell.cfg.apps = { ...ui.shell.cfg.apps,
    [APP]:{ title:'Office Expansion', color:0xb9c99b, kind:'board' } };
  const open = ui.openApp.bind(ui);
  ui.openApp = id => {
    if (id !== APP) return open(id);
    if (ui.destroyed || !ui.isOpen || ui.suspended || ui.booting) return;
    app.open();
  };
  const renderApplication = ui.monitor.renderApplication.bind(ui.monitor);
  ui.monitor.renderApplication = () => ui.app === APP ? app.render() : renderApplication();
  const startMenu = ui.shell.drawStartMenu.bind(ui.shell);
  ui.shell.drawStartMenu = (layout, items, select, brand) => {
    if (!ready() || items.some(item => item.app === APP)) return startMenu(layout, items, select, brand);
    const next = [...items];
    const index = next.findIndex(item => item.app === 'alibi-books');
    next.splice(index < 0 ? 0 : index + 1, 0,
      { app:APP, label:'Office Expansion', color:0xb9c99b, kind:'board' });
    return startMenu(layout, next, select, brand);
  };
}

// The PI computer already uses instance wrappers for its extra applications.
// Install this app at the same point, before the shell renders its windows.
const renderDesktop = ComputerDesktop.prototype.render;
ComputerDesktop.prototype.render = function (...args) {
  install(this.ui);
  const result = renderDesktop.apply(this, args);
  if (ready()) {
    const { x, y } = this.ui.layout;
    this.createIcon(x + 292, y + 310, 128, 'Office Expansion', 'board', 0xb9c99b,
      () => this.ui.openApp(APP));
  }
  return result;
};

export function mountOfficeExpansion(scene) {
  if (mounted.has(scene)) return;
  mounted.add(scene);
  startClock(scene.game);
  // Keep the existing scene import and mount call, but no separate HUD icon.
  scene.events.once('shutdown', () => mounted.delete(scene));
}
