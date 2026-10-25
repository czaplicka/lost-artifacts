import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { getAgencyMail } from '../../config/markAgencyComputerConfig.js';

const READ_KEY = 'mark_agency_mail_read';
const readState = () => {
  const value = MainStoryManager.getSideClue(READ_KEY);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};
export class AgencyMailApp {
  constructor(ui) { this.ui = ui; }
  getMail() { return getAgencyMail(this.ui.state); }
  isRead(id) { return Object.prototype.hasOwnProperty.call(readState(), id) && readState()[id] === true; }
  markRead(id) {
    if (!this.getMail().some(item => item.id === id) || this.isRead(id)) return;
    MainStoryManager.setSideClue(READ_KEY, { ...readState(), [id]: true });
    if (!saveGameState()) this.ui.notice = 'Read status kept for this session; automatic saving is unavailable.';
  }
  select(id) {
    const ui = this.ui;
    ui.selectedId = id; ui.bodyPage = 0; ui.notice = ''; this.markRead(id); ui.render();
  }
  render() {
    const ui = this.ui, d = ui.drawing, b = ui.window;
    const mail = this.getMail(), perPage = 5, pages = Math.max(1, Math.ceil(mail.length / perPage));
    ui.listPage = Math.max(0, Math.min(ui.listPage, pages - 1));
    const visible = mail.slice(ui.listPage * perPage, (ui.listPage + 1) * perPage);
    const selected = visible.find(item => item.id === ui.selectedId) || visible[0];
    d.bevel(b.x + 10, b.y + 46, 270, b.h - 100, 0xc1ccc6, true);
    visible.forEach((item, i) => {
      const ry = b.y + 53 + i * 68, active = item.id === selected?.id;
      d.rectangle(b.x + 16, ry, 258, 62, active ? 0x30616c : 0xe1e1ce);
      const heading = d.text(b.x + 27, ry + 8, `${this.isRead(item.id) ? '' : '* '}${item.subject}`, 15, active ? '#fff0ba' : '#213d43');
      d.fit(heading, heading.text, 235);
      const sender = d.text(b.x + 27, ry + 34, item.from, 13, active ? '#cadcda' : '#53685f');
      d.fit(sender, item.from, 235);
      d.rectangle(b.x + 16, ry, 258, 62, 0, 0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.select(item.id));
    });
    const step = delta => {
      ui.listPage = (ui.listPage + delta + pages) % pages;
      this.select(mail[ui.listPage * perPage]?.id ?? null);
    };
    d.button(b.x + 14, b.y + b.h - 43, '<', () => step(-1), pages > 1);
    d.text(b.x + 72, b.y + b.h - 33, `${ui.listPage + 1}/${pages}`, 14, '#29454a');
    d.button(b.x + 144, b.y + b.h - 43, '>', () => step(1), pages > 1);
    if (!selected) { d.text(b.x + 310, b.y + 70, 'Inbox empty. Suspicious.', 20, '#29454a'); return; }
    const px = b.x + 298, pw = b.w - 314;
    d.rectangle(px, b.y + 46, pw, b.h - 126, 0xf2ecd6);
    d.text(px + 16, b.y + 59, `INTERNAL / ${selected.category.toUpperCase().replaceAll('_',' ')}`, 12, '#7c7049');
    const title = d.text(px + 16, b.y + 86, selected.subject, 20, '#173b49', pw - 32);
    const meta = d.text(px + 16, title.y + title.height + 10,
      `From: ${selected.from}\nDate: ${selected.date}`, 14, '#5c695e', pw - 32);
    const bodyY = meta.y + meta.height + 12;
    ui.documents.renderPagedText(selected.body, px + 16, bodyY, pw - 32,
      Math.max(70, b.y + b.h - 92 - bodyY));
    if (ui.notice) d.text(px, b.y + b.h - 73, ui.notice, 12, '#8b452b', pw);
    if (selected.action) {
      d.button(px, b.y + b.h - 43, selected.action.label,
        () => { void ui.runMailAction(selected); }, selected.actionEnabled && !ui.nextAssignmentBusy);
      if (!selected.actionEnabled) d.text(px + 270, b.y + b.h - 33,
        'Complete the current mission first.', 12, '#6e725c', Math.max(80, pw - 270));
    }
  }
}
