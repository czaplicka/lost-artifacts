import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import {
  ECONOMY_CATEGORY,
  MONEY_SOURCE,
  moneyManager
} from '../../managers/MoneyManager.js';
import {
  needsOfficeMoveIn,
  ownsNewPIOffice
} from '../../managers/PIOfficeShopManager.js';

const DEVICE = 'office-expansion';
const CYCLE_MS = 120_000;
const CAP = 200;

const STATIONS = {
  frontDesk: { name: 'Front Desk', payout: 20 },
  records: { name: 'Records Room', payout: 35 }
};

const OFFERS = {
  hire: { key: 'hired', name: 'Nora Pike', price: 300 },
  room: { key: 'room', name: 'Records Room', price: 450 }
};

const clocks = new WeakMap();
const panels = new WeakSet();

function ready() {
  return ownsNewPIOffice() && !needsOfficeMoveIn();
}

function read() {
  const source = gameState.piOfficeShop?.idleOffice || {};
  const hired = source.hired === true;
  const room = source.room === true;
  const station = hired && (
    source.station === 'frontDesk' ||
    (source.station === 'records' && room)
  ) ? source.station : null;

  return {
    hired,
    room,
    station,
    progress: station && Number.isFinite(source.progress)
      ? Math.max(0, Math.min(CYCLE_MS - 1, source.progress))
      : 0,
    uncollected: Number.isSafeInteger(source.uncollected)
      ? Math.max(0, Math.min(CAP, source.uncollected))
      : 0
  };
}

function write(next) {
  gameState.piOfficeShop = {
    ...gameState.piOfficeShop,
    idleOffice: next
  };
}

function commit(next) {
  write(next);
  requestAutosave();
}

function startClock(game) {
  if (clocks.has(game)) return;

  let dirtyMs = 0;
  let skipFrame = true;

  function flush() {
    if (!dirtyMs) return;
    dirtyMs = 0;
    requestAutosave();
  }

  function visibilityChanged() {
    skipFrame = true;
    flush();
  }

  function tick(_time, delta) {
    if (document.hidden) return;
    if (skipFrame) {
      skipFrame = false;
      return;
    }

    if (!Number.isFinite(delta) || delta <= 0 || delta > 250) return;
    if (!ready()) return;

    const next = read();
    if (!next.station || next.uncollected >= CAP) return;

    next.progress += delta;
    dirtyMs += delta;

    const completed = next.progress >= CYCLE_MS;
    if (completed) {
      next.progress -= CYCLE_MS;
      next.uncollected = Math.min(
        CAP, next.uncollected + STATIONS[next.station].payout
      );
      if (next.uncollected === CAP) next.progress = 0;
    }

    write(next);
    if (completed || dirtyMs >= 5_000) flush();
  }

  function destroy() {
    game.events.off('step', tick);
    document.removeEventListener('visibilitychange', visibilityChanged);
    flush();
    clocks.delete(game);
  }

  clocks.set(game, true);
  game.events.on('step', tick);
  game.events.once('destroy', destroy);
  document.addEventListener('visibilitychange', visibilityChanged);
}

let busy = false;

function transact(next, payment, failureMessage) {
  if (busy) return 'Another transaction is in progress.';

  const previous = gameState.piOfficeShop;
  const balances = moneyManager.getState();
  busy = true;

  try {
    write(next);
    const result = payment();

    if (result?.ok === false) {
      gameState.piOfficeShop = previous;
      gameState.cash = balances.cash;
      gameState.moneyLog = balances.moneyLog;
      return failureMessage;
    }

    requestAutosave();
    return null;
  } catch (error) {
    gameState.piOfficeShop = previous;
    gameState.cash = balances.cash;
    gameState.moneyLog = balances.moneyLog;
    console.error('[OfficeExpansion]', error);
    return failureMessage;
  } finally {
    busy = false;
  }
}

function purchase(id) {
  if (!ready()) return 'Finish moving in first.';

  const offer = OFFERS[id];
  const next = read();
  if (next[offer.key]) return 'Already owned.';

  if (!moneyManager.canAfford(offer.price, MONEY_SOURCE.CASH)) {
    return 'Not enough cash.';
  }

  next[offer.key] = true;

  const error = transact(next, () => moneyManager.spend(offer.price, {
    source: MONEY_SOURCE.CASH,
    category: ECONOMY_CATEGORY.OFFICE_UPGRADE,
    description: `PI office expansion: ${offer.name}`,
    missionId: null,
    metadata: { idleOffice: true, offerId: id }
  }), 'Could not complete the purchase.');

  return error || (id === 'hire'
    ? 'Nora is hired. The stapler is now under new management.'
    : 'Records Room opened. The filing cabinets know too much.');
}

function assign(station) {
  if (!ready()) return 'Finish moving in first.';

  const next = read();
  if (!next.hired) return 'Hire Nora first.';
  if (station === 'records' && !next.room) return 'Buy the Records Room first.';
  if (next.station === station) return 'Nora already works there.';

  next.station = station;
  next.progress = 0;
  commit(next);
  return `Nora is now working at ${STATIONS[station].name}.`;
}

function collect() {
  if (!ready()) return 'Finish moving in first.';

  const next = read();
  const amount = next.uncollected;
  if (!amount) return 'No earnings to collect yet.';

  next.uncollected = 0;

  const error = transact(next, () => moneyManager.addCash(amount, {
    category: ECONOMY_CATEGORY.SIDE_CASE,
    description: 'PI office earnings',
    missionId: null,
    metadata: { idleOffice: true }
  }), 'Could not collect earnings.');

  return error || `$${amount} collected. One invoice was signed “probably”.`;
}

function text(scene, parent, x, y, value, size = 17, color = '#fff1ce') {
  const node = scene.add.text(x, y, value, {
    fontFamily: 'SpecialElite, monospace',
    fontSize: `${size}px`,
    color,
    align: 'center',
    wordWrap: { width: 444, useAdvancedWrap: true }
  }).setOrigin(0.5);

  parent.add(node);
  return node;
}

function button(scene, parent, x, y, label, action, enabled = true) {
  const node = text(scene, parent, x, y, label, 11);

  node.setStyle({
    fontFamily: 'PressStart2P, monospace',
    backgroundColor: enabled ? '#344b3d' : '#45453f',
    color: enabled ? '#fff1ce' : '#bdbbb1',
    padding: { x: 10, y: 10 }
  });

  if (enabled) {
    node.setInteractive({ useHandCursor: true });
    node.on('pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation();
      action(pointer);
    });
  }

  return node;
}

export function mountOfficeExpansion(scene) {
  if (panels.has(scene)) return;
  panels.add(scene);
  startClock(scene.game);

  const markers = scene.add.container(0, 0).setDepth(90);
  let modal = null;
  let tab = 'rooms';
  let notice = '';
  let pending = null;
  let status = null;
  let collectEnabled = false;

  function close() {
    modal?.destroy(true);
    modal = null;
    status = null;
    pending = null;
    notice = '';

    if (scene.activeDevice === DEVICE) scene.deviceClosed(DEVICE);
  }

  function open(pointer, nextTab) {
    if (!scene.bigOffice || !ready() || !scene.canUseOffice()) return;
    if (scene.pointerBlocked(pointer)) return;

    tab = nextTab;
    notice = '';
    pending = null;
    scene.deviceOpened(DEVICE);
    render();
  }

  const plan = button(scene, markers, 0, 0, 'OFFICE PLAN',
    pointer => open(pointer, 'rooms'));
  const nora = button(scene, markers, 0, 0, 'NORA PIKE',
    pointer => open(pointer, 'staff'));
  const records = button(scene, markers, 0, 0, 'RECORDS ROOM',
    pointer => open(pointer, 'rooms'));

  function layout() {
    const { width, height } = scene.scale;
    const scale = Math.min(1, width / 600);

    plan.setPosition(width * 0.78, height * 0.25).setScale(scale);
    nora.setPosition(width * 0.78, height * 0.66).setScale(scale);
    records.setPosition(width * 0.22, height * 0.50).setScale(scale);

    if (modal) render();
  }

  function render() {
    modal?.destroy(true);
    status = null;

    const state = read();
    const { width, height } = scene.scale;
    modal = scene.add.container(0, 0).setDepth(4000);

    const backdrop = scene.add.rectangle(
      width / 2, height / 2, width, height, 0x131510, 0.86
    ).setInteractive();

    backdrop.on('pointerdown', (_pointer, _x, _y, event) => {
      event?.stopPropagation();
    });
    modal.add(backdrop);

    const card = scene.add.container(width / 2, height / 2);
    card.setScale(Math.max(0.01, Math.min(
      1, (width - 16) / 500, (height - 16) / 388
    )));
    modal.add(card);

    card.add(scene.add.rectangle(0, 0, 500, 388, 0x212820)
      .setStrokeStyle(2, 0xd4af37));

    const line = (y, value, size, color) =>
      text(scene, card, 0, y, value, size, color);

    const control = (x, y, label, action, enabled = true) =>
      button(scene, card, x, y, label, action, enabled);

    const run = action => {
      notice = action();
      pending = null;
      render();
    };

    line(-165, 'Office Expansion', 26);
    line(-135, `Cash: $${moneyManager.getState().cash}`, 15);

    for (const [id, x] of [['rooms', -85], ['staff', 85]]) {
      control(x, -102, id.toUpperCase(), () => {
        tab = id;
        notice = '';
        pending = null;
        render();
      }, tab !== id);
    }

    if (pending) {
      const offer = OFFERS[pending];
      line(-47, `${offer.name} — $${offer.price}`, 21);
      line(-17, 'Confirm this purchase?', 16);
      control(-78, 21, 'CONFIRM', () => {
        const id = pending;
        if (id) run(() => purchase(id));
      });
      control(78, 21, 'CANCEL', () => {
        pending = null;
        render();
      });
    } else if (tab === 'rooms') {
      line(-48, 'Front Desk: included   •   $20 / cycle', 17);
      line(-17, state.room
        ? 'Records Room: owned   •   $35 / cycle'
        : 'Records Room: $450   •   $35 / cycle', 17);

      control(0, 21, state.room ? 'ROOM OWNED' : 'BUY RECORDS ROOM', () => {
        pending = 'room';
        render();
      }, !state.room);
    } else {
      line(-48, state.hired ? 'Nora Pike — hired' : 'Nora Pike — $300', 19);
      line(-17, state.station
        ? `Assigned: ${STATIONS[state.station].name}`
        : 'Not assigned to a workstation.', 16);

      if (state.hired) {
        control(-112, 21, 'FRONT DESK', () =>
          run(() => assign('frontDesk')), state.station !== 'frontDesk');

        control(112, 21, 'RECORDS ROOM', () =>
          run(() => assign('records')), state.room && state.station !== 'records');
      } else {
        control(0, 21, 'HIRE NORA', () => {
          pending = 'hire';
          render();
        });
      }
    }

    line(61, notice, 14, '#ffd166');
    status = line(103, '', 16);

    collectEnabled = state.uncollected > 0;
    control(-90, 157, 'COLLECT', () => run(collect), collectEnabled);
    control(90, 157, 'CLOSE', close);

    updateStatus(state);
  }

  function updateStatus(state) {
    if (!status) return;

    let detail = 'No worker assigned.';
    if (state.uncollected >= CAP) {
      detail = 'Cash tray full. Collect to resume.';
    } else if (state.station) {
      const left = Math.ceil((CYCLE_MS - state.progress) / 1000);
      const minutes = Math.floor(left / 60);
      const seconds = String(left % 60).padStart(2, '0');
      detail = `Next payout in ${minutes}:${seconds}`;
    }

    const value = `Uncollected: $${state.uncollected} / $${CAP}\n${detail}`;
    if (status.text !== value) status.setText(value);
  }

  function update() {
    const state = read();
    const visible = scene.bigOffice && ready();
    const enabled = visible && scene.canUseOffice();

    for (const [node, shown] of [
      [plan, visible],
      [nora, visible && state.hired],
      [records, visible && state.room]
    ]) {
      node.setVisible(shown);
      node.input.enabled = shown && enabled;
    }

    if (!modal) return;
    if (!visible) {
      close();
      return;
    }

    if ((state.uncollected > 0) !== collectEnabled) render();
    else updateStatus(state);
  }

  function onKey(event) {
    if (!modal || event.code !== 'Escape') return;
    event.preventDefault();
    close();
  }

  function cleanup() {
    scene.scale.off('resize', layout);
    scene.events.off('update', update);
    scene.events.off('shutdown', cleanup);
    scene.events.off('destroy', cleanup);
    scene.input.keyboard?.off('keydown', onKey);

    modal?.destroy(true);
    markers.destroy(true);
    panels.delete(scene);
  }

  scene.scale.on('resize', layout);
  scene.events.on('update', update);
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
  scene.input.keyboard?.on('keydown', onKey);

  layout();
  update();
}