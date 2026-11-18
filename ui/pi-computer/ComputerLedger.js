import { moneyManager, MONEY_SOURCE } from '../../managers/MoneyManager.js';
import { prepareComputerNotebookAudio } from './ComputerNotebookAudio.js';
import { computerActionButton } from './ComputerActionButton.js';

export class ComputerLedger {
  constructor(ui) {
    this.ui = ui;
    prepareComputerNotebookAudio(ui.scene);
  }

  formatDate(value) {
    if (value === null || value === undefined || value === '') return '—';

    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${date.getFullYear()}`;
      }
    }

    return String(value);
  }

  getBalance() {
    try {
      const { cash } = moneyManager.getState();
      return Number.isFinite(cash) ? cash : null;
    } catch {
      return null;
    }
  }

  getData() {
    const state = moneyManager.getState();
    const log = Array.isArray(state.moneyLog) ? state.moneyLog : [];
    const transactions = log
      .filter(entry => entry
        && entry.source === MONEY_SOURCE.CASH
        && (entry.type === 'income' || entry.type === 'expense')
        && Number.isFinite(entry.amount))
      .map(entry => ({
        id: entry.id,
        type: entry.type,
        source: entry.source,
        amount: Math.abs(entry.amount),
        description: entry.description || (entry.type === 'income' ? 'Cash received' : 'Cash expense'),
        date: this.formatDate(entry.createdAt),
        createdAt: entry.createdAt,
        category: entry.category,
        missionId: entry.missionId
      }));

    return { balance: state.cash, transactions };
  }

  fitText(object, value, maxWidth) {
    return this.ui.drawing.fit(object, value, Math.max(10, maxWidth));
  }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const box = ui.window;
    const { balance, transactions } = this.getData();

    const paperX = box.x + 14;
    const paperY = box.y + 48;
    const paperW = box.w - 28;
    const paperH = box.h - 92;

    d.rectangle(paperX, paperY, paperW, paperH, 0xe9efdc)
      .setStrokeStyle(1, 0x9aa88a);
    d.rectangle(paperX + 5, paperY + 4, paperW - 10, 4, 0xf7fbee);
    d.rectangle(paperX, paperY, 22, paperH, 0xb7c4a6);

    const holes = ui.scene.add.graphics();
    ui.content.add(holes);

    for (let y = 36; y < paperH - 12; y += 62) {
      holes.fillStyle(0x2a2c27, 1);
      holes.fillCircle(paperX + 11, paperY + y, 6);
    }

    const amount = Number.isFinite(balance) ? ui.money(balance) : '—';
    d.pixel(paperX + 36, paperY + 18, 'PI CASH LEDGER', 12, '#35372f');
    d.text(paperX + paperW - 16, paperY + 16, `Cash: ${amount}`, 16, '#2d5a3d')
      .setOrigin(1, 0);
    d.text(paperX + 36, paperY + 44, 'Cash in and out. Receipts optional, excuses not.', 13, '#58664e');

    const x = paperX + 31;
    const y = paperY + 72;
    const w = paperW - 45;
    const headerH = 30;
    const rowH = 29;
    const dateW = Math.min(116, Math.floor(w * 0.27));
    const amountW = Math.min(123, Math.floor(w * 0.28));
    const right = x + w - 9;
    const descriptionX = x + dateW + 9;
    const descriptionW = w - dateW - amountW - 18;

    const perPage = Math.max(1, Math.floor((paperH - 151) / rowH));
    const pages = Math.max(1, Math.ceil(transactions.length / perPage));
    const requestedPage = Number.isInteger(ui.listPage) ? ui.listPage : 0;
    ui.listPage = Math.max(0, Math.min(pages - 1, requestedPage));

    const start = ui.listPage * perPage;
    const visible = transactions.slice(start, start + perPage);

    d.rectangle(x, y, w, headerH, 0xbccaa9);
    d.pixel(x + 8, y + 10, 'DATE', 9, '#34402b');
    d.pixel(descriptionX, y + 10, 'DESCRIPTION', 9, '#34402b');
    d.pixel(right, y + 10, 'AMOUNT', 9, '#34402b').setOrigin(1, 0);

    for (let i = 0; i < perPage; i++) {
      const rowY = y + headerH + i * rowH;
      const entry = visible[i];

      if (i % 2 === 0) d.rectangle(x, rowY, w, rowH, 0xdfe8cf);
      d.rectangle(x, rowY + rowH - 1, w, 1, 0xa9bb98);
      if (!entry) continue;

      this.fitText(d.text(x + 8, rowY + 6, entry.date, 14, '#4c5640'),
        entry.date, dateW - 15);

      this.fitText(d.text(descriptionX, rowY + 6, entry.description, 14, '#2c3327'),
        entry.description, descriptionW);

      const income = entry.type === 'income';
      const signed = `${income ? '+' : '−'}${ui.money(entry.amount)}`;

      const value = d.text(right, rowY + 6, signed, 14, income ? '#27613c' : '#8b3d31')
        .setOrigin(1, 0);
      this.fitText(value, signed, amountW - 14);
    }

    const bottom = y + headerH + perPage * rowH;
    d.rectangle(x + dateW, y, 1, bottom - y, 0xc9625a);
    d.rectangle(x + w - amountW, y, 1, bottom - y, 0xa9bb98);

    if (!transactions.length) {
      this.fitText(
        d.text(descriptionX, y + headerH + 6, 'No cash entries yet.', 14, '#58664e'),
        'No cash entries yet.',
        descriptionW
      );
    }

    const footerY = bottom + 10;
    const change = direction => {
      const next = (ui.listPage + direction + pages) % pages;
      if (next === ui.listPage) return;
      ui.listPage = next;
      ui.render();
      return 'page';
    };

    computerActionButton(ui, x, footerY, '<', () => change(-1), pages > 1);
    d.pixel(x + 54, footerY + 10, `${ui.listPage + 1} / ${pages}`, 9, '#55603f');
    computerActionButton(ui, x + 135, footerY, '>', () => change(1), pages > 1);
  }
}