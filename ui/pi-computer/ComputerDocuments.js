import { COLORS, FONTS } from './ComputerTheme.js';

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
      d.bevel(box.x + 9, box.y + 48, box.w - 18, box.h - 95, 0xe7e5dc, true);
      d.rectangle(box.x + 20, box.y + 58, box.w - 40, box.h - 115, 0xf2ecd6);
      d.text(box.x + 44, box.y + 90, isMail
        ? 'No messages available.\n\nInbox empty. Not even spam. Suspicious.'
        : 'No advertisements available.\n\nThe city is suspiciously honest today.', 18, COLORS.muted, box.w - 90);
      return;
    }

    const listW = 270;
    const perPage = Math.max(1, Math.floor((box.h - 150) / 64));
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    ui.listPage = Phaser.Math.Clamp(ui.listPage, 0, pages - 1);
    const visible = items.slice(ui.listPage * perPage, (ui.listPage + 1) * perPage);
    const selected = visible.find(item => item.id === ui.selectedId) || visible[0];
    ui.selectedId = selected.id;

    // ---- list pane
    d.bevel(box.x + 9, box.y + 48, listW - 8, box.h - 95, 0xe7e5dc, true);
    visible.forEach((item, index) => this.renderRow(item, index, box, listW, item.id === selected.id, isMail));

    const pageY = box.y + box.h - 77;
    d.button(box.x + 13, pageY, '<', () => this.changeListPage(-1, pages), pages > 1);
    d.pixel(box.x + 66, pageY + 10, `${ui.listPage + 1}/${pages}`, 9, COLORS.text);
    d.button(box.x + 126, pageY, '>', () => this.changeListPage(1, pages), pages > 1);

    // ---- detail pane (a sheet of paper)
    const px = box.x + listW + 14;
    const py = box.y + 48;
    const pw = box.w - listW - 27;
    const ph = box.h - 95;
    d.bevel(px, py, pw, ph, 0xe7e5dc, true);
    d.rectangle(px + 10, py + 10, pw - 20, ph - 20, 0xf2ecd6);
    d.rectangle(px + 10, py + 10, pw - 20, 3, 0xfffaf0);

    const x0 = px + 28;
    const innerW = pw - 56;
    const hasJobButton = !isMail && selected.kind === 'pi';

    const stampLabel = isMail ? 'PRIVATE' : (selected.kind === 'pi' ? 'PI JOB' : 'ODDITIES');
    const stampColor = isMail ? 0x7a5c3a : (selected.kind === 'pi' ? 0xa23232 : 0x3a4a8a);
    d.stamp(px + pw - 28, py + 18, stampLabel, stampColor, -6, 11);

    const titleStr = (isMail ? selected.subject : selected.title) || (isMail ? 'Untitled message' : 'Untitled advertisement');
    const title = d.pixel(x0, py + 26, titleStr, 13, COLORS.text, innerW - 130).setLineSpacing(7);

    const metadata = isMail
      ? [`From: ${selected.from || 'Unknown sender'}`, `Date: ${selected.date || 'Unknown'}`].join('\n')
      : [`Contact: ${selected.contact || 'Not provided'}`,
          Number.isFinite(selected.reward) ? `Offered payment: ${ui.money(selected.reward)}` : null
        ].filter(Boolean).join('\n');
    const meta = d.text(x0, title.y + title.height + 14, metadata, 15, COLORS.muted, innerW).setLineSpacing(3);
    const dividerY = meta.y + meta.height + 10;
    d.rectangle(x0, dividerY, innerW, 2, 0xcfc7aa);

    const bodyY = dividerY + 14;
    const jobY = py + ph - 54;
    const bodyBottom = hasJobButton ? jobY - 10 : py + ph - 16;
    const bodyH = Math.max(80, bodyBottom - bodyY);
    this.renderPagedText((isMail ? selected.body : selected.description) || '', x0, bodyY, innerW, bodyH);
    if (hasJobButton) this.renderJobButton(selected, x0, jobY);
  }

  renderRow(item, index, box, listW, isSelected, isMail) {
    const ui = this.ui;
    const d = ui.drawing;
    const rowX = box.x + 14;
    const rowY = box.y + 55 + index * 64;
    const rowW = listW - 24;
    const rowH = 60;
    const base = isSelected ? COLORS.titlebar : (index % 2 ? 0xdedbcf : 0xeceae1);
    const row = d.rectangle(rowX, rowY, rowW, rowH, base).setInteractive({ useHandCursor: true });
    const tag = isMail ? 0x3d6a9e : (item.kind === 'pi' ? 0xd4af37 : 0x7a8fa0);
    d.rectangle(rowX, rowY, 6, rowH, tag);

    const title = d.text(rowX + 16, rowY + 8, '', 15, isSelected ? '#ffffff' : COLORS.text);
    d.fit(title, (isMail ? item.subject : item.title) || 'Untitled', rowW - 28);
    const metaStr = isMail
      ? `${item.from || 'Unknown sender'}${item.date ? ` · ${item.date}` : ''}`
      : `${item.kind === 'pi' ? 'PI JOB' : 'ODDITIES'}${item.contact ? ` · ${item.contact}` : ''}`;
    const meta = d.text(rowX + 16, rowY + 34, '', 12, isSelected ? '#c9d8ee' : COLORS.muted);
    d.fit(meta, metaStr, rowW - 28);

    row.on('pointerover', () => { if (!isSelected) row.setFillStyle(0xf8f6ec); });
    row.on('pointerout', () => { if (!isSelected) row.setFillStyle(base); });
    row.on('pointerdown', () => {
      ui.options.onSfx?.('click');
      ui.selectedId = item.id;
      ui.bodyPage = 0;
      ui.notice = '';
      ui.viewToken += 1;
      ui.render();
    });
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
      fontFamily: FONTS.body, fontSize: `${fontSize}px`, wordWrap: { width }
    });
    const lines = measure.getWrappedText(content || '');
    const lineHeight = Math.max(fontSize, measure.getTextMetrics?.().fontSize || fontSize) + lineSpacing;
    measure.destroy();

    // Reserve room for the pager only when the text does not fit on one page.
    const fitsOnePage = lines.length <= Math.max(1, Math.floor(height / lineHeight));
    const perPage = fitsOnePage ? Math.max(1, lines.length) : Math.max(1, Math.floor((height - 44) / lineHeight));
    const pages = Math.max(1, Math.ceil(lines.length / perPage));
    ui.bodyPage = Phaser.Math.Clamp(ui.bodyPage, 0, pages - 1);
    d.text(x, y, lines.slice(ui.bodyPage * perPage, (ui.bodyPage + 1) * perPage).join('\n'), fontSize, '#2f2d27')
      .setLineSpacing(lineSpacing);
    if (pages <= 1) return;

    const footerY = y + height - 34;
    const change = direction => {
      ui.bodyPage = (ui.bodyPage + direction + pages) % pages;
      ui.render();
    };
    d.button(x, footerY, '<', () => change(-1));
    d.pixel(x + 56, footerY + 10, `${ui.bodyPage + 1}/${pages}`, 9, COLORS.text);
    d.button(x + 116, footerY, '>', () => change(1));
  }
}