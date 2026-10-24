import { moneyManager, MONEY_SOURCE } from '../../managers/MoneyManager.js';

export class ComputerLedger {
  constructor(ui) { this.ui = ui; }

  formatDate(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'string') {
      // Accepts YYYY-MM-DD and full ISO timestamps (YYYY-MM-DDTHH:mm...)
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      }
    }
    return String(value);
  }

  getBalance() {
    try {
      const cash = moneyManager.getState().cash;
      return Number.isFinite(cash) ? cash : null;
    } catch (error) {
      return null;
    }
  }

  getData() {
    const state = moneyManager.getState();
    const transactions = state.moneyLog.filter(t => t && t.source === MONEY_SOURCE.CASH &&
      t.type === 'expense' && Number.isFinite(t.amount) && t.amount >= 0)
      .map(t => ({
        id: t.id, type: 'expense', source: t.source, amount: t.amount,
        description: t.description || 'Unspecified expense', date: this.formatDate(t.createdAt),
        createdAt: t.createdAt, category: t.category, missionId: t.missionId
      }));
    return { balance: state.cash, transactions };
  }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const scene = ui.scene;
    const box = ui.window;
    const ledger = this.getData();
    const expenses = ledger.transactions.map(t => ({
      id: t.id,
      date: this.formatDate(t.date),
      description: t.description || 'Unspecified expense',
      expense: Math.abs(Number(t.amount))
    })).filter(t => Number.isFinite(t.expense));
    const total = expenses.reduce((sum, entry) => sum + entry.expense, 0);

    const paperX = box.x + 14;
    const paperY = box.y + 48;
    const paperW = box.w - 28;
    const paperH = box.h - 92;

    // Paper, binder strip and holes
    d.rectangle(paperX, paperY, paperW, paperH, 0xe9efdc).setStrokeStyle(1, 0x9aa88a);
    d.rectangle(paperX + 5, paperY + 4, paperW - 10, 4, 0xf7fbee);
    d.rectangle(paperX, paperY, 22, paperH, 0xb7c4a6);
    const g = scene.add.graphics();
    ui.content.add(g);
    for (let i = 0; i < 6; i++) {
      const hy = paperY + 36 + i * 62;
      g.fillStyle(0x2a2c27, 1);
      g.fillCircle(paperX + 11, hy, 6);
      g.fillStyle(0x000000, 0.35);
      g.fillCircle(paperX + 11, hy + 1, 4);
    }
    // Coffee ring
    g.lineStyle(4, 0x7a5230, 0.18);
    g.strokeCircle(paperX + paperW - 120, paperY + paperH - 70, 34);
    g.lineStyle(2, 0x7a5230, 0.12);
    g.strokeCircle(paperX + paperW - 120, paperY + paperH - 70, 30);

    d.pixel(paperX + 40, paperY + 18, 'PERSONAL EXPENSES', 14, '#35372f');
    const balance = Number.isFinite(ledger.balance) ? ui.money(ledger.balance) : 'Not connected';
    d.text(paperX + paperW - 18, paperY + 16, `Balance: ${balance}`, 17, '#2d5a3d').setOrigin(1, 0);
    d.text(paperX + 40, paperY + 46, 'Private account — agency expenses are not included.', 13, '#6d7a5e');

    const tableX = paperX + 36;
    const tableY = paperY + 77;
    const tableW = paperW - 54;
    const headerH = 30;
    const rowH = 29;
    const dateW = 135;
    const expenseW = 155;
    const descriptionW = tableW - dateW - expenseW;
    const dateX = tableX + 10;
    const descriptionX = tableX + dateW + 10;
    const expenseRight = tableX + tableW - 12;
    const perPage = Math.max(1, Math.floor((paperH - 170) / rowH));
    const pages = Math.max(1, Math.ceil(expenses.length / perPage));
    ui.listPage = Phaser.Math.Clamp(ui.listPage, 0, pages - 1);
    const visible = expenses.slice(ui.listPage * perPage, (ui.listPage + 1) * perPage);

    d.rectangle(tableX, tableY, tableW, headerH, 0xbccaa9);
    d.pixel(dateX, tableY + 10, 'DATE', 9, '#34402b');
    d.pixel(descriptionX, tableY + 10, 'DESCRIPTION', 9, '#34402b');
    d.pixel(expenseRight, tableY + 10, 'EXPENSE', 9, '#34402b').setOrigin(1, 0);

    const tableBottom = tableY + headerH + perPage * rowH;
    for (let i = 0; i < perPage; i++) {
      const rowY = tableY + headerH + i * rowH;
      const entry = visible[i];
      if (i % 2 === 0) d.rectangle(tableX, rowY, tableW, rowH, 0xdfe8cf);
      d.rectangle(tableX, rowY + rowH - 1, tableW, 1, 0xa9bb98);
      if (!entry) continue;
      const dateText = d.text(dateX, rowY + 6, entry.date, 15, '#4c5640');
      const descriptionText = d.text(descriptionX, rowY + 6, entry.description, 15, '#2c3327');
      this.fitText(dateText, entry.date, dateW - 20);
      this.fitText(descriptionText, entry.description, descriptionW - 20);
      d.text(expenseRight, rowY + 6, ui.money(entry.expense), 15, '#8b3d31').setOrigin(1, 0);
    }
    // Ledger-style dividers (red margin line is doubled)
    d.rectangle(tableX + dateW, tableY, 1, tableBottom - tableY, 0xc9625a);
    d.rectangle(tableX + dateW + 3, tableY, 1, tableBottom - tableY, 0xc9625a);
    d.rectangle(tableX + tableW - expenseW, tableY, 1, tableBottom - tableY, 0xa9bb98);
    if (!expenses.length) {
      d.text(descriptionX, tableY + headerH + 6, 'No expenses recorded. (Impressive restraint.)', 15, '#6d7a5e');
    }

    const footerY = tableBottom + 13;
    const change = direction => {
      ui.listPage = (ui.listPage + direction + pages) % pages;
      ui.render();
    };
    d.button(tableX, footerY, '<', () => change(-1), pages > 1);
    d.pixel(tableX + 58, footerY + 10, `Page ${ui.listPage + 1}/${pages}`, 9, '#55603f');
    d.button(tableX + 190, footerY, '>', () => change(1), pages > 1);
    d.pixel(expenseRight, footerY + 9, `TOTAL SPENT: ${ui.money(total)}`, 11, '#8b2f25').setOrigin(1, 0);
  }

  fitText(object, value, maxWidth) {
    return this.ui.drawing.fit(object, value, maxWidth);
  }
}