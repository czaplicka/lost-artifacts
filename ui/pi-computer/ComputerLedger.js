import { moneyManager, MONEY_SOURCE } from '../../managers/MoneyManager.js';

export class ComputerLedger {
  constructor(ui) { this.ui = ui; }

  formatDate(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
    }
    return String(value);
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
    const box = ui.window;
    const ledger = this.getData();
    const expenses = ledger.transactions.filter(t => {
      if (t.amount === null || t.amount === undefined || t.amount === '') return false;
      const amount = Number(t.amount);
      return Number.isFinite(amount) && t.type === 'expense' && amount >= 0;
    }).map(t => ({
      id: t.id, date: this.formatDate(t.date),
      description: t.description || t.name || 'Unspecified expense', expense: Math.abs(Number(t.amount))
    }));
    const total = expenses.reduce((sum, entry) => sum + entry.expense, 0);
    const paperX = box.x + 14;
    const paperY = box.y + 48;
    const paperW = box.w - 28;
    const paperH = box.h - 92;
    d.rectangle(paperX, paperY, paperW, paperH, 0xeee8d4).setStrokeStyle(1, 0xa7a18b);
    d.rectangle(paperX + 5, paperY + 4, paperW - 10, 4, 0xf9f5e9);
    d.rectangle(paperX, paperY, 12, paperH, 0xc5bda3);
    for (let i = 0; i < 7; i++) d.rectangle(paperX + 3, paperY + 22 + i * 48, 4, 15, 0x807966);
    d.text(paperX + 28, paperY + 17, 'PERSONAL EXPENSES', 21, '#35372f');
    const balance = Number.isFinite(ledger.balance) ? ui.money(ledger.balance) : 'Not connected';
    d.text(paperX + paperW - 18, paperY + 20, `Balance: ${balance}`, 15, '#494d3e').setOrigin(1, 0);
    d.text(paperX + 28, paperY + 48, 'Private account — agency expenses are not included.', 12, '#77735f');
    const tableX = paperX + 25;
    const tableY = paperY + 77;
    const tableW = paperW - 42;
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
    d.rectangle(tableX, tableY, tableW, headerH, 0xc9c3aa);
    d.text(dateX, tableY + 7, 'DATE', 13, '#424536');
    d.text(descriptionX, tableY + 7, 'DESCRIPTION', 13, '#424536');
    d.text(expenseRight, tableY + 7, 'EXPENSE', 13, '#424536').setOrigin(1, 0);
    const tableBottom = tableY + headerH + perPage * rowH;
    for (let i = 0; i < perPage; i++) {
      const rowY = tableY + headerH + i * rowH;
      const entry = visible[i];
      if (i % 2 === 0) d.rectangle(tableX, rowY, tableW, rowH, 0xe4ddc5);
      d.rectangle(tableX, rowY + rowH - 1, tableW, 1, 0xc6bea5);
      if (!entry) continue;
      const dateText = d.text(dateX, rowY + 7, entry.date, 14, '#555747');
      const descriptionText = d.text(descriptionX, rowY + 7, entry.description, 14, '#33392f');
      this.fitText(dateText, entry.date, dateW - 20);
      this.fitText(descriptionText, entry.description, descriptionW - 20);
      d.text(expenseRight, rowY + 7, ui.money(entry.expense), 14, '#8b3d31').setOrigin(1, 0);
    }
    d.rectangle(tableX + dateW, tableY, 1, tableBottom - tableY, 0xb5ad94);
    d.rectangle(tableX + tableW - expenseW, tableY, 1, tableBottom - tableY, 0xb5ad94);
    if (!expenses.length) d.text(descriptionX, tableY + headerH + 8, 'No expenses recorded.', 14, '#77735f');
    const footerY = tableBottom + 13;
    const change = direction => {
      ui.listPage = (ui.listPage + direction + pages) % pages;
      ui.render();
    };
    d.button(tableX, footerY, '<', () => change(-1), pages > 1);
    d.text(tableX + 53, footerY + 8, `Page ${ui.listPage + 1} / ${pages}`, 12, '#67634f');
    d.button(tableX + 165, footerY, '>', () => change(1), pages > 1);
    d.text(expenseRight, footerY + 7, `TOTAL SPENT: ${ui.money(total)}`, 15, '#743c31').setOrigin(1, 0);
  }

  fitText(object, value, maxWidth) {
    let shortened = String(value);
    object.setText(shortened);
    while (object.width > maxWidth && shortened.length > 0) {
      shortened = shortened.slice(0, -1);
      object.setText(`${shortened}…`);
    }
  }
}
