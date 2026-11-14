import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  ComputerDocuments as ComputerDocumentsBase
} from './ComputerDocumentsBase.js';

import {
  installAlibiDialogueUI
} from './AlibiDialogueUI.js';

import { PIMailbox } from './PIMailbox.js';

import {
  COLORS,
  FONTS
} from './ComputerTheme.js';

export * from './ComputerDocumentsBase.js';

const MAIL_FONT_SIZE = 20;
const MAIL_LINE_SPACING = 6;

export class ComputerDocuments extends ComputerDocumentsBase {
  constructor(ui) {
    super(ui);

    this.installMailButtonFilter();

    this.alibiDialogueUI = installAlibiDialogueUI(
      ui,
      this
    );

    this.mailbox = new PIMailbox(ui, this);
  }

  installMailButtonFilter() {
    const ui = this.ui;
    const drawing = ui.drawing;
    const originalButton = drawing.button;

    const filteredButton = function (
      x,
      y,
      label,
      ...args
    ) {
      const normalized = String(label ?? '')
        .trim()
        .toUpperCase();

      if (
        ui.app === 'mail' &&
        (
          normalized === __dialogueText("ui/pi-computer/ComputerDocumentsCore.js", "t_29304bf6838d0fc4a1c1") ||
          normalized === 'REVIEW'
        )
      ) {
        return null;
      }

      return originalButton.call(
        this,
        x,
        y,
        label,
        ...args
      );
    };

    drawing.button = filteredButton;

    ui.scene.events.once('shutdown', () => {
      if (drawing.button === filteredButton) {
        drawing.button = originalButton;
      }
    });
  }

  renderMailHeader(
    selected,
    {
      x0,
      px,
      py,
      pw,
      innerW,
      asset
    }
  ) {
    const d = this.ui.drawing;

    const avatarR = 24;
    const avatarX = x0 + avatarR;
    const avatarY = py + 26 + avatarR;

    this.drawAvatar(
      avatarX,
      avatarY,
      avatarR,
      selected.from,
      true
    );

    const titleX = x0 + avatarR * 2 + 16;
    const rightReserve = asset ? 104 : 130;

    const titleWidth = Math.max(
      70,
      innerW - (titleX - x0) - rightReserve
    );

    const title = d.pixel(
      titleX,
      py + 26,
      selected.subject || __dialogueText("ui/pi-computer/ComputerDocumentsCore.js", "t_21ac0234c691bebd8b77"),
      12,
      COLORS.text,
      titleWidth
    ).setLineSpacing(7);

    const labelWidth = 62;

    const valueWidth = Math.max(
      90,
      innerW - labelWidth - (asset ? 104 : 0)
    );

    let rowY = Math.max(
      title.y + title.height,
      avatarY + avatarR
    ) + 14;

    d.pixel(
      x0,
      rowY + 4,
      'FROM',
      8,
      '#8a6d1a'
    );

    const sender = d.text(
      x0 + labelWidth,
      rowY,
      selected.from || __dialogueText("ui/pi-computer/ComputerDocumentsCore.js", "t_615f9907b88042a4f975"),
      16,
      COLORS.muted,
      valueWidth
    );

    rowY += Math.max(sender.height, 16) + 8;

    const files = Array.isArray(
      selected.attachments
    )
      ? selected.attachments.length
      : 0;

    if (files > 0) {
      d.pixel(
        x0,
        rowY + 4,
        'FILES',
        8,
        '#8a6d1a'
      );

      const attachments = d.text(
        x0 + labelWidth,
        rowY,
        `${files}${__dialogueText("ui/pi-computer/ComputerDocumentsCore.js", "t_daa870cc347fb50b985e")}${files === 1 ? '' : 's'}`,
        16,
        COLORS.muted,
        valueWidth
      );

      rowY += Math.max(
        attachments.height,
        16
      ) + 8;
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

      dividerY = Math.max(
        dividerY,
        py + 130
      );
    }

    this.drawOrnateDivider(
      x0,
      dividerY,
      innerW
    );

    return dividerY;
  }

  renderPagedText(
    content,
    x,
    y,
    width,
    height
  ) {
    const ui = this.ui;

    if (ui.app !== 'mail') {
      return super.renderPagedText(
        content,
        x,
        y,
        width,
        height
      );
    }

    const d = ui.drawing;
    const fontSize = MAIL_FONT_SIZE;
    const lineSpacing = MAIL_LINE_SPACING;

    const measure = ui.scene.add.text(
      0,
      0,
      '',
      {
        fontFamily: FONTS.body,
        fontSize: `${fontSize}px`,
        wordWrap: {
          width
        }
      }
    );

    const lines = measure.getWrappedText(
      content || ''
    );

    const metrics = measure.getTextMetrics?.();

    const lineHeight = Math.max(
      fontSize,
      metrics?.fontSize || fontSize
    ) + lineSpacing;

    measure.destroy();

    const availableLines = Math.max(
      1,
      Math.floor(height / lineHeight)
    );

    const fitsOnePage =
      lines.length <= availableLines;

    const perPage = fitsOnePage
      ? Math.max(1, lines.length)
      : Math.max(
          1,
          Math.floor(
            (height - 44) / lineHeight
          )
        );

    const pages = Math.max(
      1,
      Math.ceil(lines.length / perPage)
    );

    ui.bodyPage = Phaser.Math.Clamp(
      ui.bodyPage,
      0,
      pages - 1
    );

    const pageText = lines.slice(
      ui.bodyPage * perPage,
      (ui.bodyPage + 1) * perPage
    ).join('\n');

    d.text(
      x,
      y,
      pageText,
      fontSize,
      '#2f2d27'
    ).setLineSpacing(lineSpacing);

    if (pages <= 1) return;

    const footerY = y + height - 34;

    const changePage = direction => {
      ui.bodyPage = (
        ui.bodyPage +
        direction +
        pages
      ) % pages;

      ui.render();
    };

    d.button(
      x,
      footerY,
      '<',
      () => changePage(-1)
    );

    d.pixel(
      x + 56,
      footerY + 10,
      `${ui.bodyPage + 1}/${pages}`,
      9,
      COLORS.text
    );

    d.button(
      x + 116,
      footerY,
      '>',
      () => changePage(1)
    );
  }
}