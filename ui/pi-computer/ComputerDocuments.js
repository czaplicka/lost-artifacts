import { COLORS } from './ComputerTheme.js';

export class ComputerDocuments {
  constructor(ui) { this.ui = ui; }

  getMail() {
    const ui = this.ui;
    const supplied = ui.options.getMail?.();
    if (Array.isArray(supplied)) return supplied.filter(item => item && item.id);
    const data = ui.scene.cache.json.get('piOfficeMail');
    return Array.isArray(data?.messages) ? data.messages.filter(item => item && item.id) : [];
  }

  getClassifieds() {
    const ui = this.ui;
    const supplied = ui.options.getClassifieds?.();
    if (Array.isArray(supplied)) return supplied.filter(item => item && item.id);
    const data = ui.scene.cache.json.get('piOfficeClassifieds');
    return Array.isArray(data?.advertisements) ? data.advertisements.filter(item => item && item.id) : [];
  }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const box = ui.window;
    const isMail = ui.app === 'mail';
    const items = isMail ? this.getMail() : this.getClassifieds();
    if (!items.length) {
      d.text(box.x + 18, box.y + 65, isMail ? 'No messages available.' : 'No advertisements available.', 17);
      return;
    }
    const listW = 270;
    const perPage = Math.max(1, Math.floor((box.h - 150) / 64));
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    ui.listPage = Phaser.Math.Clamp(ui.listPage, 0, pages - 1);
    const visible = items.slice(ui.listPage * perPage, (ui.listPage + 1) * perPage);
    const selected = visible.find(item => item.id === ui.selectedId) || visible[0];
    ui.selectedId = selected.id;
    d.bevel(box.x + 9, box.y + 48, listW - 8, box.h - 95, 0xe7e5dc, true);
    d.rectangle(box.x + listW + 2, box.y + 48, 1, box.h - 95, COLORS.divider);
    visible.forEach((item, index) => {
      const rowY = box.y + 55 + index * 64;
      const isSelected = item.id === selected.id;
      const row = d.rectangle(box.x + 14, rowY, listW - 24, 60, isSelected ? 0x294b70 : 0xe7e5dc)
        .setInteractive({ useHandCursor: true });
      d.text(box.x + 22, rowY + 7, (isMail ? item.subject : item.title) || 'Untitled',
        14, isSelected ? '#ffffff' : COLORS.text, listW - 42);
      row.on('pointerdown', () => {
        ui.selectedId = item.id;
        ui.bodyPage = 0;
        ui.notice = '';
        ui.viewToken += 1;
        ui.render();
      });
    });
    const pageY = box.y + box.h - 77;
    d.button(box.x + 13, pageY, '<', () => this.changeListPage(-1, pages), pages > 1);
    d.text(box.x + 67, pageY + 8, `${ui.listPage + 1}/${pages}`, 13);
    d.button(box.x + 126, pageY, '>', () => this.changeListPage(1, pages), pages > 1);
    const detailX = box.x + listW + 18;
    const detailW = box.w - listW - 35;
    const metadata = isMail
      ? [`From: ${selected.from || 'Unknown sender'}`, `Date: ${selected.date || 'Unknown'}`].join('\n')
      : [selected.kind === 'pi' ? 'PI JOB' : 'ODDITIES',
          `Contact: ${selected.contact || 'Not provided'}`,
          Number.isFinite(selected.reward) ? `Offered payment: ${ui.money(selected.reward)}` : null
        ].filter(Boolean).join('\n');
    const content = [
      isMail ? selected.subject || 'Untitled message' : selected.title || 'Untitled advertisement',
      '', metadata, '', isMail ? selected.body || '' : selected.description || ''
    ].join('\n');
    const hasJobButton = !isMail && selected.kind === 'pi';
    this.renderPagedText(content, detailX, box.y + 56, detailW, box.h - (hasJobButton ? 150 : 105));
    if (hasJobButton) this.renderJobButton(selected, detailX, pageY);
  }

  renderJobButton(selected, x, y) {
    const ui = this.ui;
    const connected = typeof ui.options.onAcceptMission === 'function' && Boolean(selected.missionId);
    const status = selected.missionId
      ? (ui.options.getMissionStatus?.(selected.missionId) || 'available') : 'unavailable';
    const available = status === 'available';
    const labels = { active: 'JOB ACCEPTED', completed: 'JOB COMPLETED', failed: 'JOB FAILED', abandoned: 'JOB CLOSED' };
    const label = !connected ? 'APPLICATIONS UNAVAILABLE'
      : !available ? labels[status] || 'JOB UNAVAILABLE'
        : ui.accepting ? 'PLEASE WAIT...' : 'ACCEPT JOB';
    ui.drawing.button(x, y, label, () => void ui.acceptMission(selected), connected && available && !ui.accepting);
  }

  changeListPage(direction, pages) {
    const ui = this.ui;
    ui.listPage = (ui.listPage + direction + pages) % pages;
    ui.selectedId = null;
    ui.bodyPage = 0;
    ui.notice = '';
    ui.viewToken += 1;
    ui.render();
  }

  renderPagedText(content, x, y, width, height) {
    const ui = this.ui;
    const d = ui.drawing;
    const fontSize = 16;
    const lineSpacing = 4;
    const measure = ui.scene.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: `${fontSize}px`, wordWrap: { width }
    });
    const lines = measure.getWrappedText(content || '');
    const lineHeight = Math.max(fontSize, measure.getTextMetrics().fontSize) + lineSpacing;
    measure.destroy();
    const perPage = Math.max(1, Math.floor((height - 40) / lineHeight));
    const pages = Math.max(1, Math.ceil(lines.length / perPage));
    ui.bodyPage = Phaser.Math.Clamp(ui.bodyPage, 0, pages - 1);
    d.text(x, y, lines.slice(ui.bodyPage * perPage, (ui.bodyPage + 1) * perPage).join('\n'), fontSize)
      .setLineSpacing(lineSpacing);
    if (pages <= 1) return;
    const footerY = y + height - 31;
    const change = direction => {
      ui.bodyPage = (ui.bodyPage + direction + pages) % pages;
      ui.render();
    };
    d.button(x, footerY, '<', () => change(-1));
    d.text(x + 52, footerY + 8, `${ui.bodyPage + 1}/${pages}`, 13);
    d.button(x + 114, footerY, '>', () => change(1));
  }
}
