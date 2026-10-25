import { ComputerDrawing } from './pi-computer/ComputerDrawing.js';
import { ComputerDocuments } from './pi-computer/ComputerDocuments.js';
import { ComputerSearch } from './pi-computer/ComputerSearch.js';
import { AgencyMailApp } from './mark-agency/AgencyMailApp.js';
import { canOpenNextAssignment } from '../config/markAgencyComputerConfig.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { moneyManager } from '../managers/MoneyManager.js';
import { agencyLedgerRows } from '../markAgencyComputerModel.js';
import { getArchiveCaseId, getMissionReportForm, saveMissionReportDraft, printMissionReport } from '../archiveReportService.js';

const APPS = { mail: 'AGENCY MAIL', reports: 'MISSION REPORT', ledger: 'AGENCY LEDGER', search: 'OWL SEARCH' };
export class MarkAgencyComputerUI {
  constructor(scene, options = {}) {
    Object.assign(this, { scene, options, isOpen: false, suspended: false, destroyed: false,
      app: 'desktop', selectedId: null, listPage: 0, bodyPage: 0, notice: '', viewToken: 0,
      layout: null, window: null, content: null, ledgerPage: 0, form: null, answers: {},
      activeField: null, reportPage: 0, optionPage: 0, nextAssignmentBusy: false });
    this.state = scene.gameState ?? gameState;
    this.errors = new Set();
    this.root = scene.add.container(0, 0).setDepth(1800).setScrollFactor(0).setVisible(false);
    this.drawing = new ComputerDrawing(this);
    this.documents = new ComputerDocuments(this);
    this.mail = new AgencyMailApp(this);
    this.desktop = { render: () => this.renderDesktop(), createIcon: (...args) => this.createIcon(...args) };
    this.monitor = { renderApplication: () => this.renderApplication() };
    this.search = new ComputerSearch(this);
    this.onResize = () => { if (this.isOpen) this.render(); };
    this.onMoney = () => { if (this.isOpen && this.app === 'ledger') this.render(); };
    this.onKey = event => {
      if (!this.isOpen || this.destroyed || event.ctrlKey || event.metaKey || event.altKey) return;
      event.stopPropagation();
      if (this.nextAssignmentBusy) { event.preventDefault(); return; }
      if (event.code === 'Escape' && !event.repeat) {
        event.preventDefault();
        if (this.app !== 'desktop') this.openApp('desktop'); else this.close();
      } else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyB','KeyL'].includes(event.code)) event.preventDefault();
    };
    scene.scale.on('resize', this.onResize);
    window.addEventListener('lost-artifacts:money-changed', this.onMoney);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
    this.onSleep = () => this.close({ restoreHud: false });
    scene.events.on('sleep', this.onSleep);
  }
  open() {
    if (this.destroyed || this.isOpen || !this.scene.sys.isActive()) return false;
    this.isOpen = true; this.app = 'desktop'; this.notice = ''; this.viewToken++;
    document.addEventListener('keydown', this.onKey, true); this.root.setVisible(true);
    try { this.options.onOpen?.(); this.render(); }
    catch (error) { this.close(); throw error; }
    return true;
  }
  close({ restoreHud = true } = {}) {
    if (!this.isOpen) return;
    this.persistReport(); this.isOpen = false; this.viewToken++;
    this.root.setVisible(false); document.removeEventListener('keydown', this.onKey, true);
    this.options.onClose?.({ restoreHud });
  }
  openApp(app) {
    if (!this.isOpen || this.destroyed || this.nextAssignmentBusy || !['desktop', ...Object.keys(APPS)].includes(app)) return;
    this.persistReport(); this.app = app; this.selectedId = null; this.listPage = 0;
    this.bodyPage = 0; this.notice = ''; this.viewToken++;
    if (app === 'reports') {
      this.form = getMissionReportForm(this.locations(), this.state);
      this.answers = { ...(this.form.answers || {}) }; this.reportCaseId = getArchiveCaseId(this.state);
      this.activeField = this.form.fields?.find(field => !this.answers[field.id])?.id ?? this.form.fields?.[0]?.id;
      this.errors.clear(); this.reportPage = 0; this.optionPage = 0;
    }
    if (app === 'mail') {
      this.selectedId = this.getMail()[0]?.id ?? null;
      if (this.selectedId) this.markRead(this.selectedId);
    }
    this.render(); if (app === 'search') void this.search.load();
  }
  locations() { return this.scene.cache.json.get('locations') || []; }
  money(value) {
    return Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)) : 'Unknown';
  }
  getMail() { return this.mail.getMail(); }
  isRead(id) { return this.mail.isRead(id); }
  markRead(id) { this.mail.markRead(id); }
  renderMail() { this.mail.render(); }
  async runMailAction(message) {
    if (!this.isOpen || this.destroyed || this.nextAssignmentBusy) return false;
    const current = this.getMail().find(item => item.id === message?.id);
    if (!current?.actionEnabled) { this.notice = 'This action is not currently available.'; this.render(); return false; }
    if (current.action.type === 'reports') { this.openApp('reports'); return true; }
    if (current.action.type === 'next_mission') return this.openNextAssignment();
    return false;
  }
  async openNextAssignment() {
    if (!this.isOpen || this.destroyed || this.nextAssignmentBusy) return false;
    if (!canOpenNextAssignment(this.state)) {
      this.notice = 'Complete the mission successfully and file your report with Frank first.';
      this.render(); return false;
    }
    const caseId = getArchiveCaseId(this.state);
    this.nextAssignmentBusy = true; saveGameState(); this.close();
    this.scene.applyLock?.(true);
    try {
      const opened = await this.scene.goto('AgainScene', { afterReport: true });
      if (opened === false) throw new Error('AgainScene could not be opened.');
      return true;
    } catch (error) {
      console.error('[MarkAgencyComputerUI] Next assignment failed:', error);
      if (!this.destroyed && !this.scene._cleanupDone && this.scene.sys.isActive() && getArchiveCaseId(this.state) === caseId) {
        this.nextAssignmentBusy = false; this.open(); this.openApp('mail');
        this.notice = 'The next assignment could not be opened. Please try again.'; this.render();
      }
      return false;
    } finally {
      this.nextAssignmentBusy = false;
      if (!this.scene._cleanupDone && this.scene.sys.isActive()) this.scene.refreshPanelLock?.();
    }
  }
  pin() {
    const visit = node => { node.setScrollFactor?.(0, 0); node.list?.forEach(visit); }; visit(this.root);
  }
  render() {
    if (this.destroyed || !this.isOpen) return;
    this.content = null; this.root.removeAll(true);
    const { width, height } = this.scene.scale;
    const blocker = this.scene.add.rectangle(0, 0, width, height, 0x040b12, 0.94).setOrigin(0).setInteractive();
    blocker.on('pointerdown', (pointer, x, y, event) => event?.stopPropagation()); this.root.add(blocker);
    const scale = Math.max(0.01, Math.min((width - 16) / 1120, (height - 16) / 760));
    this.content = this.scene.add.container((width - 1120 * scale) / 2, (height - 760 * scale) / 2).setScale(scale);
    this.root.add(this.content); const d = this.drawing;
    d.rectangle(25, 15, 1070, 690, 0x202d36); d.frame(25, 15, 1070, 690, 0x788b8f, 1, 4);
    d.bevel(52, 35, 1016, 617, 0x0b151c, true); d.bevel(440, 705, 240, 24, 0x283a44); d.bevel(345, 729, 430, 21, 0x3c525b);
    this.layout = { x: 78, y: 60, w: 964, h: 572 }; this.drawWallpaper();
    if (this.app === 'desktop') this.desktop.render(); else this.monitor.renderApplication();
    this.drawTaskbar();
    for (let sy = 60; sy < 632; sy += 4) d.rectangle(78, sy, 964, 1, 0x000000, 0.10);
    d.rectangle(70, 665, 360, 27, 0x101b22); d.pixel(82, 674, 'PROPERTY OF MARK AGENCY', 9, '#dec98b');
    d.text(470, 674, 'MA-486  /  AUTHORIZED PERSONNEL ONLY', 12, '#a9bdc0');
    for (let i = 0; i < 8; i++) d.rectangle(790 + i * 12, 669, 5, 17, 0x0a161e);
    d.rectangle(900, 674, 9, 9, 0x7ac9b7); d.button(960, 661, 'OFF', () => this.close()); this.pin();
  }
  drawWallpaper() {
    const d = this.drawing, { x, y, w, h } = this.layout;
    d.rectangle(x, y, w, h, 0x143a49);
    for (let i = 0; i < 12; i++) d.rectangle(x, y + i * 45, w, 1, 0x275060, 0.5);
    for (let i = 0; i < 20; i++) d.rectangle(x + i * 50, y, 1, h - 36, 0x275060, 0.4);
    d.frame(x + 530, y + 198, 320, 170, 0xb8a56a, 0.5, 3);
    d.pixel(x + 566, y + 235, 'MARK', 38, '#bac6b9'); d.pixel(x + 572, y + 292, 'AGENCY', 22, '#d9c589');
    d.text(x + 527, y + 392, 'International problems. Internal paperwork.', 17, '#89a6a6', 365);
    if (this.app === 'desktop') {
      d.pixel(x + 24, y + 205, 'MARKNET / OPERATIONS', 13, '#eadcae');
      d.text(x + 24, y + 244, `Operator: ${this.state.playerName || this.state.agentName || 'Agent'}\n\nFour applications. No games.\nSolitaire has been classified as a security risk.`, 19, '#cbdada', 410);
      if (this.notice) d.text(x + 24, y + 390, this.notice, 17, '#ffe0a0', 440);
    }
  }
  drawTaskbar() {
    const d = this.drawing, { x, y, w, h } = this.layout, ty = y + h - 36;
    d.bevel(x, ty, w, 36, 0xaab9b7); d.button(x + 3, ty + 1, 'MARK', () => this.openApp('desktop'));
    d.text(x + 105, ty + 10, APPS[this.app] || 'MARKNET DESKTOP', 15, '#15343c');
    d.text(x + w - 340, ty + 10, `Agency: ${this.money(moneyManager.getBalances().agencyBudget)}`, 15, '#15343c');
  }
  renderDesktop() {
    const { x, y } = this.layout;
    this.createIcon(x + 16, y + 10, 128, 'Agency Mail', 'mail', 0xe3d4a4, () => this.openApp('mail'));
    this.createIcon(x + 288, y + 10, 128, 'Mission Report', 'report', 0xb7c9d1, () => this.openApp('reports'));
    this.createIcon(x + 424, y + 10, 128, 'Agency Ledger', 'ledger', 0x9bc6b8, () => this.openApp('ledger'));
    const unread = this.getMail().filter(item => !this.isRead(item.id)).length;
    this.drawing.text(x + 22, y + 132, `${unread} unread agency message${unread === 1 ? '' : 's'}`, 15, '#eadcae');
    if (canOpenNextAssignment(this.state)) this.drawing.button(x + 24, y + 460, 'NEXT ASSIGNMENT >', () => { void this.openNextAssignment(); }, !this.nextAssignmentBusy);
  }
  createIcon(x, y, width, label, kind, color, callback) {
    const d = this.drawing; d.bevel(x + (width - 60) / 2, y + 6, 60, 58, color);
    d.pixel(x + (width - 60) / 2 + 11, y + 24, ({ mail: '@', report: 'DOC', ledger: '$', globe: 'WWW' })[kind] || '?', kind === 'mail' ? 24 : 12, '#1b3e49');
    const text = d.text(x + 3, y + 76, label, 15, '#f5ecd6', width - 6).setAlign('center'); text.setFixedSize?.(width - 6, 46);
    d.rectangle(x, y, width, 123, 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', callback);
  }
  renderApplication() {
    const d = this.drawing, { x, y, w, h } = this.layout;
    this.window = { x: x + 16, y: y + 12, w: w - 32, h: h - 60 }; const b = this.window;
    d.bevel(b.x, b.y, b.w, b.h, 0xd4d8cb); d.rectangle(b.x + 4, b.y + 4, b.w - 8, 32, 0x204d5b);
    d.pixel(b.x + 16, b.y + 14, APPS[this.app] || 'MARKNET', 11, '#fff0ba');
    d.button(b.x + b.w - 46, b.y + 4, 'X', () => this.openApp('desktop'));
    if (this.app === 'mail') this.renderMail();
    if (this.app === 'ledger') this.renderLedger();
    if (this.app === 'reports') this.renderReport();
  }
  renderLedger() {
    const d = this.drawing, b = this.window, balances = moneyManager.getBalances();
    d.text(b.x + 20, b.y + 52, `Agency budget: ${this.money(balances.agencyBudget)}    Agency debt: ${this.money(balances.agencyDebt)}`, 20, '#203e47');
    d.text(b.x + 20, b.y + 88, 'Agency transactions only. Your personal shopping has its own crime scene.', 15, '#5e674d');
    const rows = agencyLedgerRows(moneyManager.getRecentTransactions(100)), pages = Math.max(1, Math.ceil(rows.length / 6));
    this.ledgerPage = Math.max(0, Math.min(this.ledgerPage, pages - 1));
    if (!rows.length) d.text(b.x + 24, b.y + 154, 'No agency receipts. Finance is cautiously optimistic.', 19, '#526756');
    rows.slice(this.ledgerPage * 6, (this.ledgerPage + 1) * 6).forEach((entry, i) => {
      const ry = b.y + 125 + i * 49; d.rectangle(b.x + 14, ry, b.w - 28, 46, i % 2 ? 0xe4e3d0 : 0xf1eddc);
      const title = d.text(b.x + 24, ry + 4, entry.description || entry.category || 'Agency transaction', 16, '#283f46');
      d.fit(title, title.text, b.w - 270); const date = new Date(entry.createdAt);
      d.text(b.x + 24, ry + 26, `${entry.accountLabel} / ${Number.isFinite(date.getTime()) ? date.toLocaleString('en-GB') : 'Undated'}`, 12, '#6b7568');
      d.text(b.x + b.w - 24, ry + 13, `${entry.prefix}${this.money(entry.displayAmount)}`, 16, entry.prefix === 'DEBT +' ? '#a33430' : '#244f40').setOrigin(1, 0);
    });
    const step = delta => { this.ledgerPage = (this.ledgerPage + delta + pages) % pages; this.render(); };
    d.button(b.x + 18, b.y + b.h - 46, '<', () => step(-1), pages > 1);
    d.text(b.x + 80, b.y + b.h - 35, `${this.ledgerPage + 1}/${pages}`, 14, '#29454a');
    d.button(b.x + 150, b.y + b.h - 46, '>', () => step(1), pages > 1);
  }
  persistReport() {
    if (this.app !== 'reports' || !this.form?.ok || this.form.printed || this.form.submitted || getArchiveCaseId(this.state) !== this.reportCaseId) return;
    const result = saveMissionReportDraft(this.answers, this.locations(), this.state);
    if (result.ok && !result.saved) this.notice = 'Draft kept for this session; automatic saving is unavailable.';
  }
  renderReport() {
    const d = this.drawing, b = this.window, form = this.form;
    if (!form?.ok) { d.text(b.x + 26, b.y + 75, form?.error || 'No report available.', 21, '#29454a', b.w - 52); return; }
    const readonly = form.printed || form.submitted, perPage = 6, pages = Math.max(1, Math.ceil(form.fields.length / perPage));
    this.reportPage = Math.max(0, Math.min(this.reportPage, pages - 1));
    d.text(b.x + 20, b.y + 48, 'THEFT INVESTIGATION // OFFICIAL SUMMARY', 15, '#374b4b');
    form.fields.slice(this.reportPage * perPage, (this.reportPage + 1) * perPage).forEach((field, i) => {
      const ry = b.y + 82 + i * 47;
      const prefix = field.id === 'artifact' ? 'Stolen artifact:' : field.id === 'suspect' ? 'Suspect arrested:' : `Escape stop ${Number(field.id.split(':')[1]) + 1}:`;
      d.text(b.x + 22, ry + 10, prefix, 16, '#28454b');
      d.bevel(b.x + 178, ry, 398, 39, this.errors.has(field.id) ? 0xf0b5a8 : field.id === this.activeField ? 0xf4df9a : 0xf4efdd, true);
      const label = form.options.find(option => option.id === this.answers[field.id])?.label || `[ ${field.hint} ]`;
      const text = d.text(b.x + 190, ry + 10, label, 17, '#223b40'); d.fit(text, label, 372);
      if (!readonly) d.rectangle(b.x + 178, ry, 398, 39, 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.activeField === field.id && this.answers[field.id]) { delete this.answers[field.id]; this.errors.delete(field.id); this.persistReport(); }
        this.activeField = field.id; this.render();
      });
    });
    if (pages > 1) {
      d.button(b.x + 20, b.y + 370, '<', () => { this.reportPage = (this.reportPage - 1 + pages) % pages; this.render(); });
      d.text(b.x + 76, b.y + 381, `${this.reportPage + 1}/${pages}`, 14, '#29454a');
      d.button(b.x + 146, b.y + 370, '>', () => { this.reportPage = (this.reportPage + 1) % pages; this.render(); });
    } else d.text(b.x + 20, b.y + 378, 'No agency stationery was harmed during this investigation.', 14, '#6d725c', 550);
    const ox = b.x + 598, ow = b.w - 614; d.text(ox, b.y + 50, readonly ? 'DOCUMENT STATUS' : 'WORD BANK', 15, '#28454b');
    if (!readonly) {
      const optionPages = Math.max(1, Math.ceil(form.options.length / 8)); this.optionPage = Math.max(0, Math.min(this.optionPage, optionPages - 1));
      form.options.slice(this.optionPage * 8, (this.optionPage + 1) * 8).forEach((option, i) => {
        const used = Object.values(this.answers).includes(option.id), oy = b.y + 80 + i * 34;
        d.bevel(ox, oy, ow, 29, used ? 0xb9c2b8 : 0xe3e4cd);
        const text = d.text(ox + 8, oy + 6, option.label, 15, used ? '#7e897e' : '#28454b'); d.fit(text, option.label, ow - 16);
        if (!used) d.rectangle(ox, oy, ow, 29, 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (getArchiveCaseId(this.state) !== this.reportCaseId) { this.openApp('reports'); return; }
          if (!this.activeField) return;
          this.answers[this.activeField] = option.id; this.errors.delete(this.activeField);
          this.activeField = form.fields.find(field => !this.answers[field.id])?.id ?? this.activeField;
          this.reportPage = Math.floor(Math.max(0, form.fields.findIndex(field => field.id === this.activeField)) / perPage);
          this.persistReport(); this.render();
        });
      });
      if (optionPages > 1) {
        d.button(ox, b.y + 358, '<', () => { this.optionPage = (this.optionPage - 1 + optionPages) % optionPages; this.render(); });
        d.button(ox + 70, b.y + 358, '>', () => { this.optionPage = (this.optionPage + 1) % optionPages; this.render(); });
      }
      d.text(ox, b.y + 400, 'Click a blank, then a word.\nClick a selected filled blank again to clear it.', 13, '#546954', ow);
    } else d.text(ox, b.y + 90, form.submitted ? 'FILED\n\nFrank has your report.' : 'PRINT APPROVED\n\nDeliver the document to Frank. If your inventory was full, use COLLECT.', 18, '#30574a', ow);
    if (!form.submitted) d.button(b.x + 20, b.y + b.h - 77, readonly ? 'COLLECT REPORT' : 'PRINT REPORT', () => this.printReport());
    d.text(b.x + 20, b.y + b.h - 32, this.notice || (form.submitted ? 'Report filed. Visit Frank for a conversation.' : readonly
      ? 'Report approved. Collect it and take it to the archive.' : 'List the thief\'s route, not every place you accidentally visited.'), 13, '#665535', b.w - 40);
  }
  printReport() {
    if (getArchiveCaseId(this.state) !== this.reportCaseId) { this.openApp('reports'); return; }
    const result = printMissionReport(this.answers, this.locations(), this.state);
    this.errors = new Set(result.errors || []); this.form = getMissionReportForm(this.locations(), this.state);
    this.notice = result.ok ? 'Printed. Mission Report added to inventory. Take it to Frank.'
      : result.reason === 'incorrect' ? 'Correct the marked blanks. No penalty. Finance makes worse mistakes.'
      : result.reason === 'full' ? 'Report ready. Free one inventory slot, then select COLLECT REPORT.'
      : result.reason === 'conflict' ? 'Another case report is still in your inventory. Nothing was replaced.'
      : result.error || 'The report could not be printed.';
    if (result.saved === false) this.notice += ' Save manually: automatic saving is unavailable.'; this.render();
  }
  destroy() {
    if (this.destroyed) return;
    this.close({ restoreHud: false }); this.destroyed = true; this.search.destroy();
    document.removeEventListener('keydown', this.onKey, true); window.removeEventListener('lost-artifacts:money-changed', this.onMoney);
    this.scene.scale.off('resize', this.onResize); this.scene.events.off('shutdown', this.destroy, this);
    this.scene.events.off('destroy', this.destroy, this); this.scene.events.off('sleep', this.onSleep);
    this.root?.destroy(true); this.root = null; this.content = null;
  }
}
