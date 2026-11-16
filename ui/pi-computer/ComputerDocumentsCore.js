import {
  dialogueText as __dialogueText
} from '../../dialogues/DialogueText.js';

import {
  ComputerDocuments as ComputerDocumentsBase
} from './ComputerDocumentsBase.js';

import {
  installAlibiDialogueUI
} from './AlibiDialogueUI.js';

import {
  PIMailbox
} from './PIMailbox.js';

import {
  COLORS,
  FONTS
} from './ComputerTheme.js';

export * from './ComputerDocumentsBase.js';

const SOURCE =
  'ui/pi-computer/ComputerDocumentsCore.js';

const MAIL_FONT_SIZE = 16;
const MAIL_LINE_SPACING = 3;

const t = id => __dialogueText(SOURCE, id);

function closeTo(a, b) {
  return Math.abs(a - b) < 2;
}

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

  getMailActionY() {
    const box = this.ui.window;

    if (!box) {
      return null;
    }

    /*
     * PIMailbox używa pomniejszonego contentBox:
     * y = original.y + 44
     * h = original.h - 96
     *
     * Pasek ARCHIVE / TRASH:
     * original.y + original.h - 89
     * = contentBox.y + contentBox.h - 37
     */
    if (this.mailbox?.renderingMail) {
      return box.y + box.h - 37;
    }

    return box.y + box.h - 89;
  }

  installMailButtonFilter() {
    const ui = this.ui;
    const documents = this;
    const drawing = ui.drawing;

    const originalButton = drawing.button;
    const originalPixel = drawing.pixel;

    const filteredButton = function (
      x,
      y,
      label,
      ...args
    ) {
      const normalized = String(label ?? '')
        .trim()
        .toUpperCase();

      if (ui.app === 'mail') {
        if (
          normalized === t('t_29304bf6838d0fc4a1c1') ||
          normalized === 'REVIEW'
        ) {
          return null;
        }

        const box = ui.window;

        if (
          box &&
          documents.mailbox?.renderingMail &&
          (label === '<' || label === '>')
        ) {
          const oldListPagerY =
            box.y + box.h - 77;

          const isPreviousListPage =
            label === '<' &&
            closeTo(x, box.x + 13) &&
            closeTo(y, oldListPagerY);

          const isNextListPage =
            label === '>' &&
            closeTo(x, box.x + 126) &&
            closeTo(y, oldListPagerY);

          if (
            isPreviousListPage ||
            isNextListPage
          ) {
            x = box.x + (
              isPreviousListPage ? 130 : 234
            );

            y = documents.getMailActionY();
          }
        }
      }

      return originalButton.call(
        this,
        x,
        y,
        label,
        ...args
      );
    };

    const filteredPixel = function (
      x,
      y,
      value,
      ...args
    ) {
      const box = ui.window;

      if (
        ui.app === 'mail' &&
        box &&
        documents.mailbox?.renderingMail &&
        /^\d+\/\d+$/.test(String(value)) &&
        closeTo(x, box.x + 66) &&
        closeTo(y, box.y + box.h - 67)
      ) {
        x = box.x + 184;
        y = documents.getMailActionY() + 10;
      }

      return originalPixel.call(
        this,
        x,
        y,
        value,
        ...args
      );
    };

    drawing.button = filteredButton;
    drawing.pixel = filteredPixel;

    const cleanup = () => {
      if (drawing.button === filteredButton) {
        drawing.button = originalButton;
      }

      if (drawing.pixel === filteredPixel) {
        drawing.pixel = originalPixel;
      }

      ui.scene.events.off('shutdown', cleanup);
      ui.scene.events.off('destroy', cleanup);
    };

    ui.scene.events.once('shutdown', cleanup);
    ui.scene.events.once('destroy', cleanup);
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

    const avatarR = 22;
    const avatarTop = py + 24;
    const avatarX = x0 + avatarR;
    const avatarY = avatarTop + avatarR;

    this.drawAvatar(
      avatarX,
      avatarY,
      avatarR,
      selected.from,
      true
    );

    const textX =
      x0 + avatarR * 2 + 14;

    const rightReserve = asset ? 104 : 130;

    const textWidth = Math.max(
      70,
      innerW -
      (textX - x0) -
      rightReserve
    );

    const fromLabel = d.pixel(
      textX,
      avatarTop + 3,
      'FROM',
      8,
      '#8a6d1a'
    );

    const senderX =
      textX + fromLabel.width + 10;

    const senderWidth = Math.max(
      40,
      textWidth - (senderX - textX)
    );

    const sender = d.text(
      senderX,
      avatarTop,
      selected.from ||
        t('t_615f9907b88042a4f975'),
      14,
      COLORS.muted,
      senderWidth
    ).setLineSpacing(2);

    const titleY = avatarTop +
      Math.max(
        sender.height,
        fromLabel.height,
        16
      ) + 8;

    const title = d.pixel(
      textX,
      titleY,
      selected.subject ||
        t('t_21ac0234c691bebd8b77'),
      10,
      COLORS.text,
      textWidth
    ).setLineSpacing(4);

    let rowY = Math.max(
      avatarTop + avatarR * 2,
      title.y + title.height
    ) + 10;

    const files = Array.isArray(
      selected.attachments
    )
      ? selected.attachments.length
      : 0;

    if (files > 0) {
      const filesLabel = d.pixel(
        textX,
        rowY + 3,
        'FILES',
        8,
        '#8a6d1a'
      );

      const attachmentsX =
        textX + filesLabel.width + 10;

      const attachments = d.text(
        attachmentsX,
        rowY,
        `${files}${t('t_daa870cc347fb50b985e')}${
          files === 1 ? '' : 's'
        }`,
        13,
        COLORS.muted,
        Math.max(
          40,
          textWidth - (attachmentsX - textX)
        )
      ).setLineSpacing(2);

      rowY += Math.max(
        attachments.height,
        filesLabel.height,
        14
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
    const textWidth = Math.max(1, width);

    const measure = ui.scene.add.text(
      -10000,
      -10000,
      '',
      {
        fontFamily: FONTS.body,
        fontSize: `${fontSize}px`,
        lineSpacing,
        wordWrap: {
          width: textWidth
        }
      }
    );

    const lines = measure.getWrappedText(
      String(content ?? '')
    );

    const safeHeight = Math.max(
      1,
      Number(height) || 1
    );

    /*
     * Pomiar rzeczywistej wysokości tekstu.
     * Paginacja uwzględnia ten sam font
     * i odstępy co wyświetlana wiadomość.
     */
    let low = 1;
    let high = Math.max(1, lines.length);
    let perPage = 1;

    while (low <= high) {
      const middle = Math.floor(
        (low + high) / 2
      );

      measure.setText(
        Array(middle).fill('Ag').join('\n')
      );

      if (measure.height <= safeHeight) {
        perPage = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    measure.destroy();

    const pages = Math.max(
      1,
      Math.ceil(lines.length / perPage)
    );

    const currentPage = Number.isFinite(
      Number(ui.bodyPage)
    )
      ? Math.floor(Number(ui.bodyPage))
      : 0;

    ui.bodyPage = Math.max(
      0,
      Math.min(currentPage, pages - 1)
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

    if (pages <= 1) {
      return;
    }

    const actionY = this.getMailActionY();

    const footerY = Number.isFinite(actionY)
      ? actionY
      : y + height + 8;

    const pagerWidth = 166;

    const pagerX = x + Math.max(
      0,
      (textWidth - pagerWidth) / 2
    );

    const changePage = direction => {
      if (
        ui.destroyed ||
        !ui.isOpen ||
        ui.suspended ||
        ui.app !== 'mail'
      ) {
        return;
      }

      ui.bodyPage = (
        ui.bodyPage +
        direction +
        pages
      ) % pages;

      ui.render();
    };

    d.button(
      pagerX,
      footerY,
      '<',
      () => changePage(-1)
    );

    d.pixel(
      pagerX + 56,
      footerY + 10,
      `${ui.bodyPage + 1}/${pages}`,
      9,
      COLORS.text
    );

    d.button(
      pagerX + 116,
      footerY,
      '>',
      () => changePage(1)
    );
  }
}