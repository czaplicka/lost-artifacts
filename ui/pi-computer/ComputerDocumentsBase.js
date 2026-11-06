import { COLORS, FONTS } from './ComputerTheme.js';
import { BorrowedAlibiMail } from './BorrowedAlibiMail.js';
import { AlibiReportUI } from './AlibiReportUI.js';
import { installDeadMenMail } from '../../managers/DeadMenCallingService.js';
import { installDeadMenFollowupMail } from '../../managers/DeadMenCallingFollowup.js';
import { installDeadMenFinaleMail } from '../../managers/DeadMenCallingFinale.js';
import { installAlibiImprovements } from './AlibiImprovements.js';
import {
  renderDeadMailOfficeButton,
  syncDeadMailOfficeQuest
} from '../../managers/DeadMailOfficeIntegration.js';
import { installDeadMenEvidenceUI } from './DeadMenEvidenceUI.js';
import { DeadMenArtworkUI } from './DeadMenArtworkUI.js';
import { installAlibiAdvertEmailFlow } from './AlibiAdvertEmailFlow.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';

export class ComputerDocuments {
  constructor(ui) {
    this.ui = ui;
    ui.documents = this;

    this.artworkUI = new DeadMenArtworkUI(ui);
    this.alibiMail = new BorrowedAlibiMail(ui);
    this.alibiFinale = new AlibiReportUI(ui);

    installDeadMenMail(ui);
    installDeadMenFollowupMail(ui);
    installDeadMenFinaleMail(ui);

    this.alibiImprovements = installAlibiImprovements(ui, this);
    installDeadMenEvidenceUI(ui);

    this.alibiAdvertEmailFlow = installAlibiAdvertEmailFlow(ui, this);
  }

  getMail() {
    const supplied = this.ui.options.getMail?.();

    if (Array.isArray(supplied)) {
      return supplied.filter(item => item && item.id);
    }

    const data = this.ui.scene.cache.json.get('piOfficeMail');

    return Array.isArray(data?.messages)
      ? data.messages.filter(item => item && item.id)
      : [];
  }

  getClassifieds() {
    syncDeadMailOfficeQuest();

    const supplied = this.ui.options.getClassifieds?.();

    const data = Array.isArray(supplied)
      ? null
      : this.ui.scene.cache.json.get('piOfficeClassifieds');

    const items = Array.isArray(supplied)
      ? supplied
      : Array.isArray(data?.advertisements)
        ? data.advertisements
        : [];

    return items.filter(item => {
      if (!item || !item.id) return false;
      if (item.kind !== 'pi' || !item.missionId) return true;

      const quest = getPIQuest(item.missionId);
      const status = this.ui.options.getMissionStatus?.(item.missionId);

      const accepted =
        Boolean(quest) ||
        (Boolean(status) &&
          status !== 'available' &&
          status !== 'unavailable');

      if (accepted) {
        this.alibiAdvertEmailFlow?.onAccepted?.(item);
      }

      return !accepted;
    });
  }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const box = ui.window;
    const isMail = ui.app === 'mail';
    const items = isMail ? this.getMail() : this.getClassifieds();

    this.artworkUI.sync();

    if (!items.length) {
      ui.selectedId = null;
      ui.listPage = 0;
      ui.bodyPage = 0;

      d.bevel(
        box.x + 9,
        box.y + 48,
        box.w - 18,
        box.h - 95,
        0xe7e5dc,
        true
      );

      d.rectangle(
        box.x + 20,
        box.y + 58,
        box.w - 40,
        box.h - 115,
        0xf2ecd6
      );

      d.text(
        box.x + 44,
        box.y + 90,
        isMail
          ? 'No messages available.\n\nInbox empty. Not even spam. Suspicious.'
          : 'No advertisements available.\n\nThe city is suspiciously honest today.',
        18,
        COLORS.muted,
        box.w - 90
      );

      return;
    }

    const listW = 270;
    const perPage = Math.max(1, Math.floor((box.h - 150) / 64));
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    const selectedIndex = items.findIndex(
      item => item.id === ui.selectedId
    );

    if (selectedIndex >= 0) {
      ui.listPage = Math.floor(selectedIndex / perPage);
    } else {
      ui.selectedId = null;
      ui.bodyPage = 0;
    }

    ui.listPage = Phaser.Math.Clamp(ui.listPage, 0, pages - 1);

    const visible = items.slice(
      ui.listPage * perPage,
      (ui.listPage + 1) * perPage
    );

    const selected =
      visible.find(item => item.id === ui.selectedId) || visible[0];

    ui.selectedId = selected.id;

    d.bevel(
      box.x + 9,
      box.y + 48,
      listW - 8,
      box.h - 95,
      0xe7e5dc,
      true
    );

    visible.forEach((item, index) => {
      this.renderRow(
        item,
        index,
        box,
        listW,
        item.id === selected.id,
        isMail
      );
    });

    const pageY = box.y + box.h - 77;

    d.button(
      box.x + 13,
      pageY,
      '<',
      () => this.changeListPage(-1, pages),
      pages > 1
    );

    d.pixel(
      box.x + 66,
      pageY + 10,
      `${ui.listPage + 1}/${pages}`,
      9,
      COLORS.text
    );

    d.button(
      box.x + 126,
      pageY,
      '>',
      () => this.changeListPage(1, pages),
      pages > 1
    );

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

    const asset =
      isMail && innerW >= 230
        ? this.artworkUI.resolve(selected.id)
        : null;

    if (
      asset &&
      this.artworkUI.expanded(
        selected.id,
        px + 18,
        py + 18,
        pw - 36,
        ph - 36
      )
    ) {
      return;
    }

    if (!asset) {
      d.stamp(
        px + pw - 28,
        py + 18,
        isMail
          ? 'PRIVATE'
          : selected.kind === 'pi'
            ? 'PI CASE'
            : 'ODDITIES',
        isMail
          ? 0x7a5c3a
          : selected.kind === 'pi'
            ? 0xa23232
            : 0x3a4a8a,
        -6,
        11
      );
    }

    const titleStr =
      (isMail ? selected.subject : selected.title) ||
      (isMail ? 'Untitled message' : 'Untitled advertisement');

    const titleWidth = Math.max(
      70,
      innerW - (asset ? 104 : 130)
    );

    const title = d
      .pixel(x0, py + 26, titleStr, 13, COLORS.text, titleWidth)
      .setLineSpacing(7);

    const metadata = isMail
      ? [
          `From: ${selected.from || 'Unknown sender'}`,
          `Date: ${selected.date || 'Unknown'}`
        ].join('\n')
      : [
          `Contact: ${selected.contact || 'Not provided'}`,
          Number.isFinite(selected.reward)
            ? `Offered payment: ${ui.money(selected.reward)}`
            : null
        ]
          .filter(Boolean)
          .join('\n');

    const meta = d
      .text(
        x0,
        title.y + title.height + 14,
        metadata,
        15,
        COLORS.muted,
        asset ? Math.max(90, innerW - 104) : innerW
      )
      .setLineSpacing(3);

    let dividerY = meta.y + meta.height + 10;

    if (asset) {
      this.artworkUI.header(
        selected.id,
        px + pw - 110,
        py + 18,
        90,
        102
      );

      dividerY = Math.max(dividerY, py + 130);
    }

    d.rectangle(x0, dividerY, innerW, 2, 0xcfc7aa);

    const bodyY = dividerY + 14;
    const jobY = py + ph - 54;
    const bodyBottom = hasJobButton ? jobY - 10 : py + ph - 16;

    this.renderPagedText(
      (isMail ? selected.body : selected.description) || '',
      x0,
      bodyY,
      innerW,
      Math.max(80, bodyBottom - bodyY)
    );

    if (hasJobButton) {
      this.renderJobButton(selected, x0, jobY);
    }
  }

  renderRow(item, index, box, listW, isSelected, isMail) {
    const ui = this.ui;
    const d = ui.drawing;
    const rowX = box.x + 14;
    const rowY = box.y + 55 + index * 64;
    const rowW = listW - 24;
    const rowH = 60;

    const base = isSelected
      ? COLORS.titlebar
      : index % 2
        ? 0xdedbcf
        : 0xeceae1;

    const row = d
      .rectangle(rowX, rowY, rowW, rowH, base)
      .setInteractive({ useHandCursor: true });

    d.rectangle(
      rowX,
      rowY,
      6,
      rowH,
      isMail ? 0x3d6a9e : item.kind === 'pi' ? 0xd4af37 : 0x7a8fa0
    );

    const title = d.text(
      rowX + 16,
      rowY + 8,
      '',
      15,
      isSelected ? '#ffffff' : COLORS.text
    );

    d.fit(
      title,
      (isMail ? item.subject : item.title) || 'Untitled',
      rowW - 28
    );

    const metaStr = isMail
      ? `${item.from || 'Unknown sender'}${
          item.date ? ` · ${item.date}` : ''
        }`
      : `${item.kind === 'pi' ? 'PI CASE' : 'ODDITIES'}${
          item.contact ? ` · ${item.contact}` : ''
        }`;

    const meta = d.text(
      rowX + 16,
      rowY + 34,
      '',
      12,
      isSelected ? '#c9d8ee' : COLORS.muted
    );

    d.fit(meta, metaStr, rowW - 28);

    row.on('pointerover', () => {
      if (!isSelected) row.setFillStyle(0xf8f6ec);
    });

    row.on('pointerout', () => {
      if (!isSelected) row.setFillStyle(base);
    });

    row.on('pointerdown', () => {
      ui.options.onSfx?.('click');
      this.artworkUI.zoom = null;
      ui.selectedId = item.id;
      ui.bodyPage = 0;
      ui.notice = '';
      ui.viewToken += 1;
      ui.render();
    });
  }

  renderJobButton(selected, x, y) {
    const ui = this.ui;

    if (renderDeadMailOfficeButton(ui, selected, x, y)) {
      return;
    }

    const connected =
      typeof ui.options.onAcceptMission === 'function' &&
      Boolean(selected.missionId);

    const status = selected.missionId
      ? ui.options.getMissionStatus?.(selected.missionId) || 'available'
      : 'unavailable';

    const available =
      status === 'available' && !getPIQuest(selected.missionId);

    const labels = {
      active: 'CASE ACCEPTED',
      completed: 'CASE COMPLETED',
      failed: 'CASE FAILED',
      abandoned: 'CASE CLOSED'
    };

    const label = !connected
      ? 'APPLICATIONS UNAVAILABLE'
      : !available
        ? labels[status] || 'CASE UNAVAILABLE'
        : ui.accepting
          ? 'PLEASE WAIT...'
          : 'ACCEPT CASE';

    ui.drawing.button(
      x,
      y,
      label,
      () => void ui.acceptMission(selected),
      connected && available && !ui.accepting
    );
  }

  changeListPage(direction, pages) {
    const ui = this.ui;

    this.artworkUI.zoom = null;
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
      fontFamily: FONTS.body,
      fontSize: `${fontSize}px`,
      wordWrap: { width }
    });

    const lines = measure.getWrappedText(content || '');

    const lineHeight =
      Math.max(
        fontSize,
        measure.getTextMetrics?.().fontSize || fontSize
      ) + lineSpacing;

    measure.destroy();

    const fitsOnePage =
      lines.length <= Math.max(1, Math.floor(height / lineHeight));

    const perPage = fitsOnePage
      ? Math.max(1, lines.length)
      : Math.max(1, Math.floor((height - 44) / lineHeight));

    const pages = Math.max(1, Math.ceil(lines.length / perPage));

    ui.bodyPage = Phaser.Math.Clamp(ui.bodyPage, 0, pages - 1);

    d.text(
      x,
      y,
      lines
        .slice(ui.bodyPage * perPage, (ui.bodyPage + 1) * perPage)
        .join('\n'),
      fontSize,
      '#2f2d27'
    ).setLineSpacing(lineSpacing);

    if (pages <= 1) return;

    const footerY = y + height - 34;

    const change = direction => {
      ui.bodyPage = (ui.bodyPage + direction + pages) % pages;
      ui.render();
    };

    d.button(x, footerY, '<', () => change(-1));

    d.pixel(
      x + 56,
      footerY + 10,
      `${ui.bodyPage + 1}/${pages}`,
      9,
      COLORS.text
    );

    d.button(x + 116, footerY, '>', () => change(1));
  }
}