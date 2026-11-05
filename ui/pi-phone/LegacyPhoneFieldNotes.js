import {
  FONT_TEXT,
  MON_X,
  DH
} from './PhoneConfig.js';

import {
  phoneCaseProgress
} from './PhoneInvestigation.js';

export function renderPhoneFieldNotes() {
  this.clearPaper();

  const investigation = this;
  const phone = this.phone;
  const scene = phone.scene;

  const PAPER_X = 24;
  const PAPER_Y = 70;

  const PAPER_WIDTH = MON_X - PAPER_X - 18;
  const PAPER_HEIGHT = DH - PAPER_Y - 24;

  const TEXT_X = 46;
  const TEXT_WIDTH = PAPER_WIDTH - TEXT_X - 24;

  const LIST_TOP = 67;
  const PAGE_Y = PAPER_HEIGHT - 158;
  const LIST_BOTTOM = PAGE_Y - 14;

  const SELECTION_Y = PAPER_HEIGHT - 120;
  const SELECTION_HEIGHT = 62;

  const BUTTON_Y = PAPER_HEIGHT - 40;

  const root = scene.add.container(
    PAPER_X,
    PAPER_Y
  );

  this.paper = root;
  phone.ui.add(root);

  const rectangle = (
    x,
    y,
    width,
    height,
    color,
    alpha = 1
  ) => {
    const object = scene.add.rectangle(
      x,
      y,
      width,
      height,
      color,
      alpha
    ).setOrigin(0);

    root.add(object);

    return object;
  };

  const text = (
    x,
    y,
    value,
    size = 18,
    color = '#394235',
    wrapWidth = TEXT_WIDTH
  ) => {
    const object = scene.add.text(
      x,
      y,
      value,
      {
        fontFamily: FONT_TEXT,
        fontSize: `${size}px`,
        color,

        wordWrap: {
          width: wrapWidth,
          useAdvancedWrap: true
        },

        lineSpacing: 5
      }
    );

    root.add(object);

    return object;
  };

  const action = (
    x,
    y,
    label,
    callback,
    enabled = true,
    color = '#36573d'
  ) => {
    const object = text(
      x,
      y,
      label,
      18,
      enabled ? color : '#9d947c'
    );

    if (enabled) {
      object
        .setInteractive({
          useHandCursor: true
        })
        .on('pointerdown', callback);
    }

    return object;
  };

  rectangle(
    6,
    8,
    PAPER_WIDTH,
    PAPER_HEIGHT,
    0x000000,
    0.3
  );

  rectangle(
    0,
    0,
    PAPER_WIDTH,
    PAPER_HEIGHT,
    0xeee1b7
  ).setInteractive();

  rectangle(
    30,
    14,
    1,
    PAPER_HEIGHT - 28,
    0xb47161,
    0.55
  );

  for (
    let lineY = LIST_TOP + 24;
    lineY < LIST_BOTTOM;
    lineY += 29
  ) {
    rectangle(
      14,
      lineY,
      PAPER_WIDTH - 28,
      1,
      0x9bb09b,
      0.4
    );
  }

  text(
    TEXT_X,
    18,
    'FIELD NOTES',
    23
  );

  const definition = this.searchData?.cases?.find(
    item => item.id === this.active?.caseId
  );

  const keywordMap = new Map(
    (definition?.keywords || []).map(
      keyword => [keyword.id, keyword]
    )
  );

  const knownIds = this.active?.caseId
    ? this.known(this.active.caseId)
    : [];

  const entries = [...new Set(knownIds || [])]
    .map(id => keywordMap.get(id))
    .filter(Boolean);

  const selectedIds = Array.isArray(this.selected)
    ? this.selected
    : [];

  const choosing = this.phase === 'choose';

  const probe = scene.add.text(
    0,
    0,
    '',
    {
      fontFamily: FONT_TEXT,
      fontSize: '18px',

      wordWrap: {
        width: TEXT_WIDTH,
        useAdvancedWrap: true
      },

      lineSpacing: 5
    }
  ).setVisible(false);

  const availableHeight =
    LIST_BOTTOM - LIST_TOP;

  const pages = [];
  let currentPage = [];
  let usedHeight = 0;

  try {
    for (const entry of entries) {
      probe.setText(String(entry.label || ''));

      const wrappedLines =
        probe.getWrappedText();

      const lineHeight = 29;

      const maxLines = Math.max(
        1,
        Math.floor(
          (availableHeight - 8) / lineHeight
        )
      );

      for (
        let index = 0;
        index < wrappedLines.length;
        index += maxLines
      ) {
        const label = wrappedLines
          .slice(index, index + maxLines)
          .join('\n');

        probe.setText(label);

        const itemHeight = Math.max(
          lineHeight,
          probe.height + 8
        );

        if (
          currentPage.length &&
          usedHeight + itemHeight >
            availableHeight
        ) {
          pages.push(currentPage);
          currentPage = [];
          usedHeight = 0;
        }

        currentPage.push({
          id: entry.id,
          label,
          y: LIST_TOP + usedHeight,
          height: itemHeight
        });

        usedHeight += itemHeight;
      }
    }

    if (currentPage.length) {
      pages.push(currentPage);
    }
  } finally {
    probe.destroy();
  }

  if (!pages.length) {
    pages.push([]);
  }

  const pageCount = pages.length;

  this.notePage = Math.max(
    0,
    Math.min(
      Math.floor(Number(this.notePage) || 0),
      pageCount - 1
    )
  );

  const page = pages[this.notePage];

  if (!entries.length) {
    text(
      TEXT_X,
      LIST_TOP,
      'No clues recorded for this case yet.',
      18,
      '#77715c'
    );
  }

  for (const item of page) {
    const selected =
      selectedIds.includes(item.id);

    const label = text(
      TEXT_X,
      item.y,
      item.label,
      18,
      selected
        ? '#a64b32'
        : '#344b3a'
    );

    if (choosing) {
      label
        .setInteractive({
          useHandCursor: true
        })
        .on('pointerdown', () => {
          investigation.select(item.id);
        });
    }
  }

  rectangle(
    TEXT_X,
    PAGE_Y - 8,
    TEXT_WIDTH,
    1,
    0xb49e6c,
    0.6
  );

  action(
    TEXT_X,
    PAGE_Y,
    '< PAGE',
    () => {
      investigation.notePage -= 1;
      phone.render();
    },
    this.notePage > 0
  );

  text(
    PAPER_WIDTH / 2,
    PAGE_Y + 2,
    `${this.notePage + 1} / ${pageCount}`,
    15,
    '#75684c'
  ).setOrigin(0.5, 0);

  action(
    PAPER_WIDTH - 112,
    PAGE_Y,
    'PAGE >',
    () => {
      investigation.notePage += 1;
      phone.render();
    },
    this.notePage < pageCount - 1
  );

  const selectedText = selectedIds
    .map(id => keywordMap.get(id)?.label)
    .filter(Boolean)
    .join(' + ');

  const selection = text(
    TEXT_X,
    SELECTION_Y,
    selectedText || 'Select clues to ask about.',
    16,
    selectedText
      ? '#574e35'
      : '#8b8065'
  );

  let selectionFontSize = 16;

  while (
    selection.height > SELECTION_HEIGHT &&
    selectionFontSize > 11
  ) {
    selectionFontSize -= 1;

    selection.setFontSize(
      selectionFontSize
    );
  }

  const canAsk =
    choosing &&
    selectedIds.length > 0;

  action(
    TEXT_X,
    BUTTON_Y,
    '[ ASK ]',
    () => investigation.ask(),
    canAsk
  );

  action(
    TEXT_X + 140,
    BUTTON_Y,
    '[ CLEAR ]',
    () => {
      investigation.selected = [];
      phone.render();
    },
    choosing,
    '#64553c'
  );

  const transcripts = this.active?.caseId
    ? (
        phoneCaseProgress(
          this.active.caseId
        ).transcripts || []
      )
    : [];

  const canRead =
    choosing &&
    transcripts.length > 0;

  action(
    TEXT_X + 310,
    BUTTON_Y,
    '[ READ LAST ]',
    () => investigation.replay(),
    canRead
  );

  if (choosing) {
    phone.logContainer.setVisible(false);

    phone.statusText
      .setVisible(true)
      .setText(
        this.active.choicePrompt ||
        'What would you like to ask?'
      );
  }

  if (phone.directoryOpen) {
    root.setVisible(false);
    phone.ui.bringToTop(phone.dir);
  }
}