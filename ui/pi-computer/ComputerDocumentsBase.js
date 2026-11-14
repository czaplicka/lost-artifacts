import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
import {
  checkAdvertRequirements,
  getAdvertRequiredItems,
  getRequiredItemLabel
} from '../../managers/PIAdvertRequirements.js';
/* ------------------------------------------------------------------ */
/*  Small helpers (mail look & feel)                                   */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = [
  0x3d6a9e, 0x8a4f3a, 0x4f7a4a, 0x7a5c8a,
  0x9a7b2e, 0x3a7a7a, 0x8a3a4f, 0x5a5f6a
];

const PAPER = 0xf2ecd6;
const GOLD = 0xd4af37;

function hashString(value) {
  let h = 2166136261 >>> 0;

  for (const ch of String(value ?? '')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }

  return h >>> 0;
}

function avatarColor(from) {
  return AVATAR_COLORS[
    hashString(shortSender(from)) % AVATAR_COLORS.length
  ];
}

function shortSender(from) {
  return (
    String(from ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/["']/g, '')
      .trim() || __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_615f9907b88042a4f975")
  );
}

function senderInitial(from) {
  const match = shortSender(from).match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : '?';
}

function isDraftMail(message) {
  return Boolean(
    message &&
    (
      message.id === 'alibi_box17_draft' ||
      /^Draft:/i.test(message.subject || '') ||
      /^(?:Draft|Unsent)/i.test(message.date || '')
    )
  );
}

function attachmentCount(message) {
  return Array.isArray(message?.attachments)
    ? message.attachments.length
    : 0;
}

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

  /* ---------------------------------------------------------------- */
  /*  Drawing primitives used by the mail view                         */
  /* ---------------------------------------------------------------- */

  graphics() {
    return this.ui.drawing.add(this.ui.scene.add.graphics());
  }

  drawAvatar(cx, cy, radius, from, highlighted = false) {
    const d = this.ui.drawing;
    const g = this.graphics();

    // Drop shadow
    g.fillStyle(0x1b2530, 0.35);
    g.fillCircle(cx + 2, cy + 3, radius);

    // Body
    g.fillStyle(avatarColor(from), 1);
    g.fillCircle(cx, cy, radius);

    // Gloss
    g.fillStyle(0xffffff, 0.16);
    g.fillCircle(cx - radius * 0.3, cy - radius * 0.35, radius * 0.5);

    // Rim
    g.lineStyle(2, highlighted ? GOLD : 0xfbf8ec, 1);
    g.strokeCircle(cx, cy, radius);

    const letter = d
      .pixel(
        cx,
        cy + 1,
        senderInitial(from),
        Math.max(8, Math.round(radius * 0.8)),
        '#ffffff'
      )
      .setOrigin(0.5);

    return letter;
  }

  drawEnvelope(cx, cy, w = 84, h = 56) {
    const g = this.graphics();
    const left = cx - w / 2;
    const top = cy - h / 2;

    g.fillStyle(0x1b2530, 0.15);
    g.fillRect(left + 4, top + 5, w, h);

    g.fillStyle(0xfffaf0, 1);
    g.fillRect(left, top, w, h);

    g.lineStyle(2, 0x7a5c3a, 1);
    g.strokeRect(left, top, w, h);

    // Flap
    g.beginPath();
    g.moveTo(left, top);
    g.lineTo(cx, cy + 4);
    g.lineTo(left + w, top);
    g.strokePath();

    // Lower folds
    g.lineStyle(1, 0x7a5c3a, 0.6);
    g.beginPath();
    g.moveTo(left, top + h);
    g.lineTo(cx - 10, cy - 2);
    g.moveTo(left + w, top + h);
    g.lineTo(cx + 10, cy - 2);
    g.strokePath();

    // Wax seal
    g.fillStyle(0xa23232, 1);
    g.fillCircle(cx, cy + 4, 6);
    g.lineStyle(1, 0x6d1c1c, 1);
    g.strokeCircle(cx, cy + 4, 6);
  }

  drawPaperIcon(x, y, color = 0x6d695b) {
    const g = this.graphics();

    g.lineStyle(1, color, 1);
    g.strokeRect(x + 0.5, y + 0.5, 8, 11);
    g.beginPath();
    g.moveTo(x + 2, y + 4);
    g.lineTo(x + 7, y + 4);
    g.moveTo(x + 2, y + 7);
    g.lineTo(x + 7, y + 7);
    g.strokePath();
  }

  drawOrnateDivider(x, y, width) {
    const g = this.graphics();
    const cx = x + width / 2;

    g.fillStyle(0xcfc7aa, 1);

    for (let sx = x; sx < x + width - 6; sx += 10) {
      g.fillRect(sx, y, 6, 2);
    }

    // Cut the dashes behind the diamond
    g.fillStyle(PAPER, 1);
    g.fillRect(cx - 14, y - 7, 28, 16);

    g.fillStyle(GOLD, 1);
    g.fillTriangle(cx, y - 5, cx + 6, y + 1, cx - 6, y + 1);
    g.fillTriangle(cx - 6, y + 1, cx + 6, y + 1, cx, y + 7);

    g.lineStyle(1, 0x8a6d1a, 0.9);
    g.beginPath();
    g.moveTo(cx, y - 5);
    g.lineTo(cx + 6, y + 1);
    g.lineTo(cx, y + 7);
    g.lineTo(cx - 6, y + 1);
    g.closePath();
    g.strokePath();
  }

  drawCoffeeRing(cx, cy, radius) {
    const g = this.graphics();

    g.lineStyle(5, 0x8a5a2b, 0.1);
    g.strokeCircle(cx, cy, radius);

    g.lineStyle(2, 0x8a5a2b, 0.12);
    g.strokeCircle(cx + 1, cy + 1, radius - 4);

    // Tiny drip
    g.fillStyle(0x8a5a2b, 0.1);
    g.fillCircle(cx + radius * 0.8, cy + radius * 0.9, 3);
  }

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const box = ui.window;
    const isMail = ui.app === 'mail';
    const items = isMail ? this.getMail() : this.getClassifieds();

    this.artworkUI.sync();

    if (!items.length) {
      this.renderEmpty(box, isMail);
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

    // NOTE: other modules (HINT button etc.) rely on this exact pager row.
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
    d.rectangle(px + 10, py + 10, pw - 20, ph - 20, PAPER);
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

    if (isMail) {
      this.renderPaperDecor(selected, px, py, pw, ph);
    }

    if (!asset) {
      d.stamp(
        px + pw - 28,
        py + 18,
        isMail
          ? isDraftMail(selected)
            ? 'DRAFT'
            : 'PRIVATE'
          : selected.kind === 'pi'
            ? __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_b42c0129c920e37e171a")
            : 'ODDITIES',
        isMail
          ? isDraftMail(selected)
            ? 0xa23232
            : 0x7a5c3a
          : selected.kind === 'pi'
            ? 0xa23232
            : 0x3a4a8a,
        -6,
        11
      );
    }

    const dividerY = isMail
      ? this.renderMailHeader(selected, { x0, px, py, pw, innerW, asset })
      : this.renderClassifiedHeader(selected, { x0, py, innerW });

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

  renderEmpty(box, isMail) {
    const ui = this.ui;
    const d = ui.drawing;

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
      PAPER
    );

    const cx = box.x + box.w / 2;
    const top = box.y + 58;
    const innerH = box.h - 115;

    if (isMail) {
      this.drawEnvelope(cx, top + innerH / 2 - 30);

      d.pixel(
        cx,
        top + innerH / 2 + 24,
        __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_6d2aedf776b31bfc37f0"),
        12,
        COLORS.text
      ).setOrigin(0.5, 0);

      d.text(
        cx,
        top + innerH / 2 + 54,
        __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_4d2d7a183b9ee2094c34"),
        16,
        COLORS.muted,
        Math.max(120, box.w - 120)
      )
        .setOrigin(0.5, 0)
        .setAlign('center');

      return;
    }

    d.text(
      box.x + 44,
      box.y + 90,
      __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_478fe8a93363cfb86044"),
      18,
      COLORS.muted,
      box.w - 90
    );
  }

  renderPaperDecor(selected, px, py, pw, ph) {
    const d = this.ui.drawing;

    // Red notebook margin line
    d.rectangle(px + 20, py + 14, 2, ph - 28, 0xc0614a, 0.3);

    // Deterministic coffee ring on some letters (a detective's desk, after all)
    if (hashString(selected.id) % 3 === 0) {
      this.drawCoffeeRing(px + pw - 78, py + ph - 70, 24);
    }
  }

    renderClassifiedHeader(selected, { x0, py, innerW }) {
    const ui = this.ui;
    const d = ui.drawing;

    const titleStr = selected.title || __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_59e8cfa76aa1a5c718d0");
    const titleWidth = Math.max(70, innerW - 130);

    const title = d
      .pixel(x0, py + 26, titleStr, 13, COLORS.text, titleWidth)
      .setLineSpacing(7);

    const requiredItems = getAdvertRequiredItems(selected);

    const metadata = [
      `${__dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_8fe6d397489cb24d3e49")}${selected.contact || __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_d83b9ff3c07a8390e2ea")}`,
      Number.isFinite(selected.reward)
        ? `${__dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_ca35f7159b1097361950")}${ui.money(selected.reward)}`
        : null,
      requiredItems.length
        ? `${__dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_cf483696f4c24f7876b6")}${requiredItems
            .map(getRequiredItemLabel)
            .join(', ')}`
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
        innerW
      )
      .setLineSpacing(3);

    const dividerY = meta.y + meta.height + 10;

    d.rectangle(x0, dividerY, innerW, 2, 0xcfc7aa);

    return dividerY;
  }

  renderMailHeader(selected, { x0, px, py, pw, innerW, asset }) {
    const d = this.ui.drawing;

    const avatarR = 24;
    const ax = x0 + avatarR;
    const ay = py + 26 + avatarR;

    this.drawAvatar(ax, ay, avatarR, selected.from, true);

    const tx = x0 + avatarR * 2 + 16;
    const rightReserve = asset ? 104 : 130;
    const titleWidth = Math.max(70, innerW - (tx - x0) - rightReserve);

    const title = d
      .pixel(
        tx,
        py + 26,
        selected.subject || __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_21ac0234c691bebd8b77"),
        12,
        COLORS.text,
        titleWidth
      )
      .setLineSpacing(7);

    // Metadata as tidy label / value rows
    const labelW = 62;
    const valueW = Math.max(
      90,
      innerW - labelW - (asset ? 104 : 0)
    );

    const rows = [
      ['FROM', selected.from || __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_615f9907b88042a4f975")],
      ['TO', selected.to || __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_08b041935798fbf6fd6f")],
      ['DATE', selected.date || __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_b764cdc0eab713746721")]
    ];

    const files = attachmentCount(selected);

    if (files > 0) {
      rows.push([
        'FILES',
        `${files}${__dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_daa870cc347fb50b985e")}${files === 1 ? '' : 's'}`
      ]);
    }

    let rowY = Math.max(
      title.y + title.height,
      ay + avatarR
    ) + 14;

    for (const [label, value] of rows) {
      d.pixel(x0, rowY + 4, label, 8, '#8a6d1a');

      const text = d.text(
        x0 + labelW,
        rowY,
        value,
        14,
        COLORS.muted,
        valueW
      );

      rowY += Math.max(text.height, 14) + 8;
    }

    if (files > 0) {
      this.drawPaperIcon(x0 + labelW + 150, rowY - 26, 0x6d695b);
    }

    let dividerY = rowY + 2;

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

    this.drawOrnateDivider(x0, dividerY, innerW);

    return dividerY;
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

    const accent = isMail
      ? isSelected
        ? GOLD
        : 0x3d6a9e
      : item.kind === 'pi'
        ? GOLD
        : 0x7a8fa0;

    d.rectangle(rowX, rowY, 6, rowH, accent);

    if (isMail && !isSelected) {
      d.rectangle(
        rowX + 6,
        rowY + rowH - 1,
        rowW - 6,
        1,
        0xb9b6a8,
        0.7
      );
    }

    const draft = isMail && isDraftMail(item);
    const files = isMail ? attachmentCount(item) : 0;
    const textX = isMail ? rowX + 62 : rowX + 16;

    if (isMail) {
      this.drawAvatar(rowX + 34, rowY + 30, 18, item.from, isSelected);
    }

    const title = d.text(
      textX,
      rowY + 8,
      '',
      15,
      isSelected ? '#ffffff' : COLORS.text
    );

    d.fit(
      title,
      (isMail ? item.subject : item.title) || __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_f59ab8d1331b7b16952f"),
      rowW - (textX - rowX) - 12 - (draft ? 48 : 0)
    );

    if (draft) {
      d.pixel(rowX + rowW - 48, rowY + 8, 'DRAFT', 7, '#d9534f');
    }

    const metaStr = isMail
      ? `${shortSender(item.from)}${item.date ? ` · ${item.date}` : ''}`
      : `${item.kind === 'pi' ? __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_b42c0129c920e37e171a") : 'ODDITIES'}${
          item.contact ? ` · ${item.contact}` : ''
        }`;

    const meta = d.text(
      textX,
      rowY + 34,
      '',
      12,
      isSelected ? '#c9d8ee' : COLORS.muted
    );

    d.fit(
      meta,
      metaStr,
      rowW - (textX - rowX) - 12 - (files ? 18 : 0)
    );

    if (files) {
      this.drawPaperIcon(
        rowX + rowW - 20,
        rowY + 36,
        isSelected ? 0xc9d8ee : 0x6d695b
      );
    }

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

    const requirements = checkAdvertRequirements(selected);
    const locked = !requirements.ok;

    const labels = {
      active: __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_c70cacc1f5ee8c47c3cb"),
      completed: __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_f7f37ae3f8a1d3822995"),
      failed: __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_e882a85bb9561edab220"),
      abandoned: __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_3825cb7a28815e93b278")
    };

    const label = !connected
      ? __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_51f20505963f7ee9bfd1")
      : locked
        ? __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_b65cb7f19d4a7bfb9f6f")
        : !available
          ? labels[status] || __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_5ac9f11fe6967391e56b")
          : ui.accepting
            ? __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_9dafd8f8b8d7f70bc7f6")
            : __dialogueText("ui/pi-computer/ComputerDocumentsBase.js", "t_c6d34a3f78e7d2224c67");

    ui.drawing.button(
      x,
      y,
      label,
      () => {
        if (locked) {
          ui.notice = requirements.message;
          ui.options.onSfx?.('error');
          ui.render();
          return;
        }

        return void ui.acceptMission(selected);
      },
      connected && available && !ui.accepting && !locked
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