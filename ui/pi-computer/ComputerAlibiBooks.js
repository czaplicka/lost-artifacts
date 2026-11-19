import { gameState } from '../../GameData.js';
import {
  ANNEX_RENT,
  formatRentTime,
  readAlibiData
} from '../../scenes/pi-office/AlibiFund.js';
import { computerActionButton } from './ComputerActionButton.js';

export function renderAlibiBooks(ui) {
  const d = ui.drawing;
  const box = ui.window;
  const raw = gameState.piOfficeShop?.idleOffice || {};
  const { entries, leases } = readAlibiData(raw);
  const balance = Number.isSafeInteger(raw.fund) ? raw.fund : 0;

  const history = entries ?? (raw.fundOpened ? [{
    amount: balance,
    balance,
    label: 'Opening balance'
  }] : []);
  const rows = [...history].reverse();

  const x = box.x + 14;
  const y = box.y + 48;
  const w = box.w - 28;
  const h = box.h - 92;
  const right = x + w - 12;

  d.rectangle(x, y, w, h, 0xedecd7).setStrokeStyle(1, 0x9aa88a);
  d.pixel(x + 12, y + 12, 'ALIBI BOOKS', 11, '#354337');
  d.text(right, y + 9, ui.money(balance), 17, '#2d5a3d').setOrigin(1, 0);

  const overdue = leases.filter(lease => lease.remaining <= 0).length;
  const next = leases.length ? Math.min(...leases.map(lease => lease.remaining)) : 0;
  const rent = overdue
    ? `RENT DUE: ${ui.money(overdue * ANNEX_RENT)}`
    : leases.length
      ? `Next rent: ${ui.money(ANNEX_RENT)} per column · ${formatRentTime(next)}`
      : 'No rented annexes.';

  d.fit(d.text(x + 12, y + 35, rent, 14, '#52634e'), rent, w - 24);

  const tableY = y + 60;
  const header = 25;
  const rowH = 25;
  const balanceW = Math.min(106, Math.floor(w * 0.23));
  const amountW = Math.min(106, Math.floor(w * 0.23));
  const amountRight = right - balanceW;
  const perPage = Math.max(1, Math.floor((h - 131) / rowH));
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const previousPage = Number.isInteger(ui.listPage) ? ui.listPage : 0;
  ui.listPage = Math.min(pages - 1, Math.max(0, previousPage));

  d.rectangle(x + 6, tableY, w - 12, header, 0xc5d1b8);
  d.pixel(x + 12, tableY + 8, 'ENTRY', 8, '#354337');
  d.pixel(amountRight, tableY + 8, 'AMOUNT', 8, '#354337').setOrigin(1, 0);
  d.pixel(right, tableY + 8, 'BALANCE', 8, '#354337').setOrigin(1, 0);

  const visible = rows.slice(ui.listPage * perPage, (ui.listPage + 1) * perPage);

  for (const [i, entry] of visible.entries()) {
    const rowY = tableY + header + i * rowH;

    if (i % 2 === 0) d.rectangle(x + 6, rowY, w - 12, rowH, 0xe1e7d2);
    d.fit(
      d.text(x + 12, rowY + 5, entry.label, 14, '#263b31'),
      entry.label,
      Math.max(20, w - balanceW - amountW - 28)
    );

    const signed = `${entry.amount < 0 ? '−' : '+'}${ui.money(Math.abs(entry.amount))}`;
    d.text(amountRight, rowY + 5, signed, 14, entry.amount < 0 ? '#913f34' : '#29603c')
      .setOrigin(1, 0);
    d.text(right, rowY + 5, ui.money(entry.balance), 14, '#263b31').setOrigin(1, 0);
  }

  if (!rows.length) {
    d.text(x + 12, tableY + header + 5, 'No company transactions yet.', 13, '#52634e');
  }

  const footerY = tableY + header + perPage * rowH + 6;
  const turn = step => {
    ui.listPage = (ui.listPage + step + pages) % pages;
    ui.render();
    return 'page';
  };

  computerActionButton(ui, x + 8, footerY, '<', () => turn(-1), pages > 1);
  d.pixel(x + 57, footerY + 10, `${ui.listPage + 1} / ${pages}`, 8, '#52634e');
  computerActionButton(ui, x + 133, footerY, '>', () => turn(1), pages > 1);
}