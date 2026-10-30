import { gameState } from '../../GameData.js';

import {
  requestAutosave
} from '../../gameStatePersistence.js';

const KEY = 'piComputerMailNotifications';

export function orderedNotebookKeywords(
  definition,
  known
) {
  const map = new Map(
    (definition?.keywords || []).map(
      keyword => [keyword.id, keyword]
    )
  );

  return [...new Set(known || [])]
    .map(id => map.get(id))
    .filter(Boolean);
}

export function incomingMail(items) {
  return items.filter(message => (
    message?.id &&
    !/^You\s*→/.test(message.from || '') &&
    !/^Unsent/i.test(message.date || '') &&
    !/^Draft:/i.test(message.subject || '')
  ));
}

export class ComputerMailNotifications {
  constructor(ui) {
    this.ui = ui;
    this.dead = false;
    this.last = -Infinity;
    this.dot = null;

    const documents = ui.documents;
    const renderDocuments =
      documents.render.bind(documents);

    documents.render = () => {
      renderDocuments();

      if (
        ui.app === 'mail' &&
        !ui.photoQuest?.contactMail?.composing &&
        ui.selectedId
      ) {
        this.markRead(ui.selectedId);
      }
    };

    const renderDesktop =
      ui.desktop.render.bind(ui.desktop);

    ui.desktop.render = () => {
      renderDesktop();

      if (this.unread().length) {
        const { x, y } = ui.layout;

        ui.drawing.add(
          ui.scene.add.circle(
            x + 102,
            y + 28,
            6,
            0xf34c3f
          )
        );
      }
    };

    this.onStep = () => this.step();
    this.onPointer = () => this.announce();

    ui.scene.game.events.on(
      'poststep',
      this.onStep
    );

    ui.scene.input.on(
      'pointerdown',
      this.onPointer
    );
  }

  state() {
    return gameState[KEY] || {
      known: [],
      read: [],
      announced: []
    };
  }

  save(next) {
    gameState[KEY] = next;
    requestAutosave();
  }

  messages() {
    return incomingMail(
      this.ui.documents.getMail()
    );
  }

  unread() {
    const read = new Set(
      this.state().read || []
    );

    return this.messages().filter(
      message => !read.has(message.id)
    );
  }

  markRead(id) {
    if (
      !this.messages().some(
        message => message.id === id
      )
    ) {
      return;
    }

    const state = this.state();

    if ((state.read || []).includes(id)) {
      return;
    }

    this.save({
      ...state,
      read: [
        ...(state.read || []),
        id
      ]
    });
  }

  step() {
    if (this.dead) return;

    const ui = this.ui;
    const now = ui.scene.time.now;

    if (now - this.last < 250) {
      return;
    }

    this.last = now;

    const state = this.state();

    const ids = this.messages().map(
      message => message.id
    );

    const fresh = ids.filter(
      id => !(state.known || []).includes(id)
    );

    if (fresh.length) {
      this.save({
        ...state,
        known: [
          ...new Set([
            ...(state.known || []),
            ...ids
          ])
        ]
      });

      if (
        ui.isOpen &&
        !ui.suspended &&
        !ui.booting
      ) {
        ui.render();
      }
    }

    this.announce();
  }

  updateOfficeDot() {
    this.dot?.destroy();
    this.dot = null;
  }

  announce() {
    if (this.dead) return;

    const ui = this.ui;
    const state = this.state();

    const pending = this.messages().filter(
      message => (
        !(state.announced || [])
          .includes(message.id)
      )
    );

    if (!pending.length) return;

    const sound = ui.scene.sound;

    if (
      !sound ||
      sound.mute ||
      sound.volume === 0 ||
      sound.locked
    ) {
      return;
    }

    const context = sound.context;

    if (
      !context ||
      context.state !== 'running'
    ) {
      return;
    }

    try {
      const now = context.currentTime;
      const gain = context.createGain();

      gain.gain.setValueAtTime(
        0.0001,
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        0.12,
        now + 0.015
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.55
      );

      gain.connect(
        sound.masterVolumeNode ||
        context.destination
      );

      [660, 880].forEach(
        (frequency, index) => {
          const oscillator =
            context.createOscillator();

          oscillator.type = 'sine';
          oscillator.frequency.value =
            frequency;

          oscillator.connect(gain);

          oscillator.start(
            now + index * 0.16
          );

          oscillator.stop(
            now + index * 0.16 + 0.22
          );

          oscillator.onended = () => {
            oscillator.disconnect();
          };
        }
      );

      setTimeout(() => {
        try {
          gain.disconnect();
        } catch (_) {
          // The audio context may already be closed.
        }
      }, 850);

      this.save({
        ...this.state(),

        announced: [
          ...new Set([
            ...(this.state().announced || []),
            ...pending.map(
              message => message.id
            )
          ])
        ]
      });
    } catch (error) {
      console.warn(
        '[ComputerMailNotifications] ' +
        'Notification sound unavailable',
        error
      );
    }
  }

  destroy() {
    this.dead = true;

    this.ui.scene.game.events.off(
      'poststep',
      this.onStep
    );

    this.ui.scene.input.off(
      'pointerdown',
      this.onPointer
    );

    this.updateOfficeDot();
  }
}

export function installComputerNotebook(ui) {
  const search = ui.search;

  let notebookRoot = null;
  let renderedForContent = null;
  let notebookCaseId = null;

  const casePages = new Map();

  const getKnown = definition => (
    gameState.piKeywordSearch
      ?.cases?.[definition.id]?.known || []
  );

  const getNotebookCases = () => (
    (search.data?.cases || []).filter(
      definition => (
        orderedNotebookKeywords(
          definition,
          getKnown(definition)
        ).length > 0
      )
    )
  );

  const getNotebookDefinition = () => {
    const cases = getNotebookCases();

    return (
      cases.find(
        definition =>
          definition.id === notebookCaseId
      ) ||
      cases.find(
        definition =>
          definition.id === search.definition?.id
      ) ||
      cases[0] ||
      null
    );
  };

  const changeNotebookCase = direction => {
    const cases = getNotebookCases();

    if (cases.length < 2) return;

    const definition =
      getNotebookDefinition();

    const currentIndex = Math.max(
      0,
      cases.findIndex(
        item => item.id === definition?.id
      )
    );

    const nextIndex = (
      currentIndex +
      direction +
      cases.length
    ) % cases.length;

    notebookCaseId = cases[nextIndex].id;

    ui.render();
  };

  const selectNotebookKeyword = (
    definition,
    keywordId
  ) => {
    if (ui.app === 'search') {
      if (
        search.definition?.id !== definition.id
      ) {
        search.selectCase(definition.id);
      }

      search.selectKeyword(keywordId);
      return;
    }

    const composing = Boolean(
      ui.app === 'mail' &&
      ui.photoQuest?.contactMail?.composing
    );

    if (!composing) return;

    const contactMail =
      ui.photoQuest.contactMail;

    if (
      contactMail.service?.data?.searchCaseId !==
      definition.id
    ) {
      return;
    }

    search.selectKeyword(keywordId);
  };

  search.renderNotebook = () => {
    if (
      ui.destroyed ||
      !ui.isOpen ||
      ui.suspended ||
      !ui.content?.scene ||
      !ui.computerWorkspace
    ) {
      return;
    }

    if (
      renderedForContent === ui.content &&
      notebookRoot?.scene
    ) {
      return;
    }

    notebookRoot?.destroy(true);

    renderedForContent = ui.content;

    const workspace = ui.computerWorkspace;
    const bounds = workspace.notebook;

    notebookRoot = ui.scene.add.container(
      bounds.x,
      bounds.y
    ).setScale(workspace.scale);

    ui.root.add(notebookRoot);

    const width = bounds.w;
    const height = bounds.h;

    const rectangle = (
      x,
      y,
      w,
      h,
      color,
      alpha = 1
    ) => {
      const object = ui.scene.add.rectangle(
        x,
        y,
        w,
        h,
        color,
        alpha
      ).setOrigin(0);

      notebookRoot.add(object);

      return object;
    };

    const text = (
      x,
      y,
      value,
      size = 17,
      color = '#384b43',
      wrapWidth = null
    ) => {
      const style = {
        fontFamily:
          '"Special Elite", "SpecialElite", monospace',

        fontSize: `${size}px`,
        color
      };

      if (wrapWidth) {
        style.wordWrap = {
          width: wrapWidth,
          useAdvancedWrap: true
        };
      }

      const object = ui.scene.add.text(
        x,
        y,
        value,
        style
      );

      notebookRoot.add(object);

      return object;
    };

    const action = (
      x,
      y,
      label,
      callback,
      enabled = true
    ) => {
      const object = text(
        x,
        y,
        label,
        16,
        enabled ? '#8c493a' : '#a39b82'
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
      5, 7, width, height,
      0x000000, 0.3
    );

    rectangle(
      0, 0, width, height,
      0xeee3b8
    ).setInteractive();

    rectangle(
      34,
      12,
      1,
      height - 24,
      0xbc7466,
      0.55
    );

    text(
      46,
      18,
      'FIELD NOTES',
      21
    );

    if (ui.booting) {
      text(
        46,
        76,
        'Ready when you are.',
        16,
        '#77715c',
        width - 62
      );

      return;
    }

    if (!search.data) {
      text(
        46,
        76,
        search.error
          ? 'Notes unavailable.'
          : 'Opening notes...',
        16,
        '#77715c',
        width - 62
      );

      if (search.error) {
        action(
          46,
          120,
          '[ RETRY ]',
          () => {
            search.error = '';
            void search.load();
          }
        );
      } else if (!search.loading) {
        void search.load();
      }

      return;
    }

    const cases = getNotebookCases();
    const definition =
      getNotebookDefinition();

    if (!definition) {
      text(
        46,
        76,
        'No clues recorded yet.',
        16,
        '#77715c',
        width - 62
      );

      return;
    }

    notebookCaseId = definition.id;

    const caseIndex = cases.findIndex(
      item => item.id === definition.id
    );

    action(
      46,
      55,
      '< CASE',
      () => changeNotebookCase(-1),
      cases.length > 1
    );

    action(
      width - 91,
      55,
      'CASE >',
      () => changeNotebookCase(1),
      cases.length > 1
    );

    const caseCounter = text(
      width / 2,
      58,
      `${caseIndex + 1}/${cases.length}`,
      13,
      '#77715c'
    );

    caseCounter.setOrigin(0.5, 0);

    const title = text(
      46,
      88,
      definition.title ||
        definition.name ||
        definition.id.replace(/_/g, ' '),
      18,
      '#294b70',
      width - 62
    );

    const headerBottom =
      title.y + title.height;

    const legend = text(
      46,
      headerBottom + 10,
      'Recorded clues',
      14,
      '#355c43'
    );

    const firstLineY =
      legend.y + legend.height + 22;

    const footerY = height - 48;
    const lineHeight = 27;

    for (
      let lineY = firstLineY + 22;
      lineY < footerY - 8;
      lineY += lineHeight
    ) {
      rectangle(
        12,
        lineY,
        width - 24,
        1,
        0x9baf9a,
        0.35
      );
    }

    const keywords = orderedNotebookKeywords(
      definition,
      getKnown(definition)
    );

    const lines = [];

    const measure = ui.scene.add.text(
      0,
      0,
      '',
      {
        fontFamily:
          '"Special Elite", "SpecialElite", monospace',

        fontSize: '17px'
      }
    ).setVisible(false);

    const maxLineWidth = width - 78;

    try {
      for (const keyword of keywords) {
        const words = String(
          keyword.label
        ).split(/\s+/);

        const wrapped = [];
        let current = '';

        for (const word of words) {
          const candidate = current
            ? `${current} ${word}`
            : word;

          measure.setText(candidate);

          if (
            current &&
            measure.width > maxLineWidth
          ) {
            wrapped.push(current);
            current = '';
          }

          for (const character of word) {
            const next = current
              ? (
                  character === word[0]
                    ? `${current} ${character}`
                    : current + character
                )
              : character;

            // Long labels, including email addresses,
            // must also fit inside the notebook.
            measure.setText(next);

            if (
              current &&
              measure.width > maxLineWidth
            ) {
              wrapped.push(current);
              current = character;
            } else {
              current = next;
            }
          }
        }

        if (current) {
          wrapped.push(current);
        }

        wrapped.forEach(
          (label, index) => {
            lines.push({
              id: keyword.id,
              label,
              first: index === 0
            });
          }
        );
      }
    } finally {
      measure.destroy();
    }

    const rows = Math.max(
      1,
      Math.floor(
        (footerY - firstLineY - 12) /
          lineHeight
      )
    );

    const pageCount = Math.max(
      1,
      Math.ceil(lines.length / rows)
    );

    const pageIndex = Math.max(
      0,
      Math.min(
        casePages.get(definition.id) || 0,
        pageCount - 1
      )
    );

    casePages.set(
      definition.id,
      pageIndex
    );

    const composing = Boolean(
      ui.app === 'mail' &&
      ui.photoQuest?.contactMail?.composing
    );

    const canSelect =
      ui.app === 'search' ||
      (
        composing &&
        ui.photoQuest.contactMail
          .service?.data?.searchCaseId ===
            definition.id
      );

    const start = pageIndex * rows;

    lines
      .slice(start, start + rows)
      .forEach((item, index) => {
        const selected = (
          ui.app === 'search' &&
          search.definition?.id === definition.id &&
          search.terms.includes(item.id)
        );

        if (item.first) {
          text(
            43,
            firstLineY +
              index * lineHeight + 2,
            '•',
            16,
            '#355c43'
          );
        }

        const label = text(
          58,
          firstLineY + index * lineHeight,
          item.label,
          17,
          selected
            ? '#a14d35'
            : '#355c43'
        );

        if (canSelect) {
          label
            .setInteractive({
              useHandCursor: true
            })
            .on('pointerdown', () => {
              selectNotebookKeyword(
                definition,
                item.id
              );
            });
        }
      });

    action(
      46,
      footerY,
      '< PAGE',
      () => {
        casePages.set(
          definition.id,
          pageIndex - 1
        );

        ui.render();
      },
      pageIndex > 0
    );

    text(
      width / 2,
      footerY + 3,
      `${pageIndex + 1}/${pageCount}`,
      14,
      '#77715c'
    ).setOrigin(0.5, 0);

    action(
      width - 91,
      footerY,
      'PAGE >',
      () => {
        casePages.set(
          definition.id,
          pageIndex + 1
        );

        ui.render();
      },
      pageIndex < pageCount - 1
    );
  };

  const renderMonitor =
    ui.monitor.render.bind(ui.monitor);

  ui.monitor.render = () => {
    renderMonitor();

    if (
      !ui.destroyed &&
      ui.isOpen &&
      !ui.suspended
    ) {
      search.renderNotebook();
    }
  };

  search.refresh = () => {
    if (
      !search.dead &&
      !ui.destroyed &&
      ui.isOpen &&
      !ui.suspended
    ) {
      ui.render();
    }
  };
}