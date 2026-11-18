import {
  DeadMailAttachment
} from './DeadMailAttachment.js';

import {
  DEAD_MAIL_MESSAGE,
  DEAD_MAIL_SEARCH,
  DEAD_MAIL_MAIL_KEYWORDS,
  getDeadMailMessages,
  isDeadMailMessage,
  markDeadMailMessageRead,
  collectDeadMailMailKeyword,
  cleanDeadMailBody
} from '../../managers/DeadMailCorrespondence.js';

import {
  getSearchProgress
} from './ComputerSearch.js';

import {
  drawEvidenceText
} from './EvidenceText.js';

const FONT_SIZE = 16;
const LINE_HEIGHT = 25;
const ACTION_HEIGHT = 48;

function canInteract(ui) {
  return (
    !ui.destroyed &&
    ui.isOpen &&
    !ui.suspended &&
    !ui.booting &&
    ui.app === 'mail' &&
    ui.selectedId === DEAD_MAIL_MESSAGE &&
    ui.scene?.sys?.isActive?.() !== false
  );
}

function escapeRegExp(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

function evidenceFragments(value) {
  const text = String(value ?? '');

  const terms = DEAD_MAIL_MAIL_KEYWORDS
    .filter(item => item.label)
    .sort((a, b) => b.label.length - a.label.length);

  if (!terms.length) return [text];

  const matcher = new RegExp(
    terms.map(item => escapeRegExp(item.label)).join('|'),
    'gi'
  );

  const fragments = [];
  let start = 0;

  for (const match of text.matchAll(matcher)) {
    if (match.index > start) {
      fragments.push(text.slice(start, match.index));
    }

    const term = terms.find(
      item =>
        item.label.toLowerCase() ===
        match[0].toLowerCase()
    );

    fragments.push({
      text: match[0],
      keywordId: term.id
    });

    start = match.index + match[0].length;
  }

  if (start < text.length) {
    fragments.push(text.slice(start));
  }

  return fragments.length ? fragments : [text];
}

function wrapFragments(ui, fragments, width) {
  const probe = ui.scene.add.text(
    -10000,
    -10000,
    '',
    {
      fontFamily: 'SpecialElite, "Special Elite", monospace',
      fontSize: `${FONT_SIZE}px`
    }
  ).setVisible(false);

  const lines = [];
  let line = [];
  let used = 0;

  const measure = text => {
    probe.setText(text);
    return probe.width;
  };

  const flush = () => {
    lines.push(line);
    line = [];
    used = 0;
  };

  const append = (part, text) => {
    const previous = line[line.length - 1];

    if (
      previous &&
      previous.keywordId === part.keywordId
    ) {
      previous.text += text;
    } else {
      line.push({
        text,
        keywordId: part.keywordId
      });
    }

    used += measure(text);
  };

  try {
    for (const fragment of fragments) {
      const part = typeof fragment === 'string'
        ? { text: fragment }
        : fragment;

      const tokens =
        String(part.text ?? '').match(
          /\n|[^\S\n]+|[^\s]+/g
        ) || [];

      for (let token of tokens) {
        if (token === '\n') {
          flush();
          continue;
        }

        const whitespace = /^\s+$/.test(token);

        if (whitespace) {
          if (!line.length) continue;
          token = ' ';
        }

        let tokenWidth = measure(token);

        if (
          line.length &&
          used + tokenWidth > width
        ) {
          flush();

          if (whitespace) continue;
        }

        if (tokenWidth <= width) {
          append(part, token);
          continue;
        }

        let chunk = '';

        for (const character of token) {
          if (
            chunk &&
            measure(chunk + character) > width
          ) {
            append(part, chunk);
            flush();
            chunk = '';
          }

          chunk += character;
        }

        if (chunk) append(part, chunk);
      }
    }

    if (line.length || !lines.length) {
      lines.push(line);
    }
  } finally {
    probe.destroy();
  }

  return lines;
}

export function installDeadMailMailbox(ui) {
  if (ui.deadMailMailbox) {
    return ui.deadMailMailbox;
  }

  const docs = ui.documents;
  const attachment = new DeadMailAttachment(ui);

  ui.deadMailAttachment = attachment;

  let dead = false;

  const originalMail = docs.getMail;
  const originalPaged = docs.renderPagedText;

  const getMail = function () {
    const items = originalMail.call(this);
    const own = getDeadMailMessages();

    const ids = new Set(
      own.map(message => message.id)
    );

    return [
      ...own,
      ...items.filter(message => !ids.has(message.id))
    ];
  };

  const paged = function (
    content,
    x,
    y,
    width,
    height
  ) {
    const isOwnMail = (
      !dead &&
      ui.app === 'mail' &&
      ui.selectedId === DEAD_MAIL_MESSAGE &&
      isDeadMailMessage({ id: ui.selectedId })
    );

    if (!isOwnMail) {
      return originalPaged.call(
        this,
        content,
        x,
        y,
        width,
        height
      );
    }

    markDeadMailMessageRead(DEAD_MAIL_MESSAGE);

    const safeWidth = Math.max(1, width);

    /*
     * Both references remain collectible even when the
     * original message uses a shortened name or signature.
     */
    const references = [
      'Correspondent: ',
      {
        text: DEAD_MAIL_MAIL_KEYWORDS[0].label,
        keywordId: 'florence_name'
      },
      '\nCase location: ',
      {
        text: DEAD_MAIL_MAIL_KEYWORDS[1].label,
        keywordId: 'blackthorn_cemetery'
      },
      '\n\n'
    ];

    const fragments = [
      ...references,
      ...evidenceFragments(
        cleanDeadMailBody(content)
      )
    ];

    const textHeight = Math.max(
      LINE_HEIGHT,
      height - ACTION_HEIGHT - 8
    );

    const lines = wrapFragments(
      ui,
      fragments,
      safeWidth
    );

    const perPage = Math.max(
      1,
      Math.floor(textHeight / LINE_HEIGHT)
    );

    const pages = Math.max(
      1,
      Math.ceil(lines.length / perPage)
    );

    ui.bodyPage = Math.max(
      0,
      Math.min(
        Math.floor(Number(ui.bodyPage) || 0),
        pages - 1
      )
    );

    const visible = lines.slice(
      ui.bodyPage * perPage,
      (ui.bodyPage + 1) * perPage
    );

    const token = ui.viewToken;

    const isKnown = id =>
      Boolean(
        getSearchProgress()
          .cases[DEAD_MAIL_SEARCH]
          ?.known?.includes(id)
      );

    visible.forEach((line, index) => {
      if (!line.length) return;

      drawEvidenceText(ui, {
        blocks: [line],
        x,
        y: y + index * LINE_HEIGHT,
        width: safeWidth,
        fontSize: FONT_SIZE,
        lineHeight: LINE_HEIGHT,
        isKnown,

        onCollect: id => {
          if (
            dead ||
            !canInteract(ui) ||
            ui.viewToken !== token
          ) {
            return;
          }

          if (collectDeadMailMailKeyword(id)) {
            ui.render();
          }
        }
      });
    });

    const actionY = y + Math.max(
      0,
      height - ACTION_HEIGHT
    );

    ui.drawing.button(
      x,
      actionY,
      'OPEN PHOTO',
      () => {
        if (
          dead ||
          !canInteract(ui) ||
          ui.viewToken !== token
        ) {
          return;
        }

        void attachment.open();
      },
      !ui._deadMailLaunching
    );

    if (pages > 1) {
      const footer = docs.getMailActionY?.();

      const pagerY = Number.isFinite(footer)
        ? footer
        : actionY + 42;

      const pagerX =
        x + Math.max(0, (safeWidth - 166) / 2);

      const changePage = direction => {
        if (
          dead ||
          !canInteract(ui) ||
          ui.viewToken !== token
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

      ui.drawing.button(
        pagerX,
        pagerY,
        '<',
        () => changePage(-1)
      );

      ui.drawing.pixel(
        pagerX + 56,
        pagerY + 10,
        `${ui.bodyPage + 1}/${pages}`,
        9,
        '#343e35'
      );

      ui.drawing.button(
        pagerX + 116,
        pagerY,
        '>',
        () => changePage(1)
      );
    }
  };

  docs.getMail = getMail;
  docs.renderPagedText = paged;

  const api = {
    destroy() {
      if (dead) return;

      dead = true;
      attachment.destroy();

      if (docs.getMail === getMail) {
        docs.getMail = originalMail;
      }

      if (docs.renderPagedText === paged) {
        docs.renderPagedText = originalPaged;
      }

      if (ui.deadMailAttachment === attachment) {
        ui.deadMailAttachment = null;
      }

      if (ui.deadMailMailbox === api) {
        ui.deadMailMailbox = null;
      }
    }
  };

  ui.deadMailMailbox = api;

  return api;
}