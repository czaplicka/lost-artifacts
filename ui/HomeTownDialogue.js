import { DialoguePanel } from './DialoguePanel.js';
import { showDialogueBubbles } from './DialogueBubbles.js';

import {
  getHomeTownTrust,
  hasHomeTownTrustChoice,
  applyHomeTownTrustChoice,
} from '../managers/HomeTownTrust.js';

function hasId(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeChoice(raw, index) {
  if (Array.isArray(raw)) {
    const [label, action, metadata = {}] = raw;

    const options =
      typeof metadata === 'string'
        ? { attitude: metadata }
        : metadata || {};

    return {
      ...options,
      label: String(label ?? ''),
      action,
      index,
    };
  }

  if (raw && typeof raw === 'object') {
    return {
      ...raw,
      label: String(raw.label ?? ''),
      action: raw.action ?? raw.onSelect,
      index,
    };
  }

  return {
    label: String(raw ?? ''),
    action: null,
    attitude: 'neutral',
    disabled: true,
    index,
  };
}

class HomeTownView extends DialoguePanel {
  constructor(scene, data, onLeave) {
    super(scene, {
      depth: 5000,
      modal: true,
    });

    this.onLeave = onLeave;
    this.topics = [];
    this.pages = [''];
    this.pageIndex = 0;
    this.isOpen = true;

    this.nameText.setText(
      String(data.title || '').toUpperCase()
    );

    this.roleText.setText(
      String(data.role ?? '')
    );

    this.numText.setVisible(false);

    this.toneObjs.forEach(object => {
      object.setVisible(false);
    });

    this.speakerText.setVisible(false);
    this._setTabsVisible(false);

    this.choiceTitle
      .setText('YOUR REPLY:')
      .setVisible(true);

    this.byeBtn.text.setText('ESC   LEAVE');

    this.pageLabel = this._txt(
      this.L.lx,
      this.L.py + this.L.ph - 30 * this.L.s,
      '',
      'SpecialElite',
      12 * this.L.s,
      '#d4af37'
    );

    this.setTrust(null);

    this._setEntries([]);
    this._show();

    const messages =
      Array.isArray(data.messages) && data.messages.length
        ? data.messages
        : [
            {
              speaker: 'npc',
              text: String(data.text ?? ''),
            },
          ];

    showDialogueBubbles(this, messages);

    // Wspólny helper używa etykiety WITNESS.
    // Tutaj pokazujemy nazwę aktualnego rozmówcy.
    const renderBubbles = this.renderTextPage.bind(this);

    this.renderTextPage = () => {
      renderBubbles();

      const current = this.pageLabel.text;

      if (current.startsWith('WITNESS  ')) {
        this.pageLabel.setText(
          current.replace(
            'WITNESS  ',
            `${String(data.title || 'NPC').toUpperCase()}  `
          )
        );
      }
    };

    const currentLabel = this.pageLabel.text;

    if (currentLabel.startsWith('WITNESS  ')) {
      this.pageLabel.setText(
        currentLabel.replace(
          'WITNESS  ',
          `${String(data.title || 'NPC').toUpperCase()}  `
        )
      );
    }
  }

  get isTyping() {
    return this.mode === 'typing';
  }

  get textPage() {
    return this.pageIndex;
  }

  get choicePage() {
    return Math.floor(
      this.scroll / this.rows.length
    );
  }

  get textPages() {
    return this.pages.map(text => ({ text }));
  }

  get pageText() {
    return this.pages[this.pageIndex] || '';
  }

  setTrust(info) {
    const visible = Boolean(info);

    this.meterObjs.forEach(object => {
      object.setVisible(visible);
    });

    this.numText.setVisible(visible);

    const nameWidth = visible
      ? this.L.lw - 205 * this.L.s
      : this.L.lw;

    this._fitWidth(
      this.nameText,
      Math.max(20 * this.L.s, nameWidth),
      14 * this.L.s,
      7 * this.L.s
    );

    if (!info) return;

    const value = info.value;
    const level = info.level;

    const filled = Math.round(
      value / 100 * this.segs.length
    );

    this.segs.forEach((segment, index) => {
      segment.setFillStyle(
        index < filled
          ? level.color
          : 0x2c2314
      );
    });

    this.levelText
      .setText(level.label)
      .setColor(level.hex);

    this.numText.setText(String(value));
  }

  renderTextPage() {
    if (!this.isOpen || this._destroyed) return;

    this._cancelTyper();

    this._full = this.pageText;
    this._idx = 0;

    this.body.setText('');
    this.contArrow.setVisible(false);

    this._setMode('typing');
    this._tick();
  }

  _afterLines() {
    this._setMode('choices');

    this.contArrow.setVisible(
      this.pageIndex < this.pages.length - 1
    );
  }

  _listActive() {
    return this.isOpen;
  }

  setTopics(
    topics,
    { preservePage = false } = {}
  ) {
    this.topics = topics;

    if (!preservePage) {
      this.scroll = 0;
    }

    this._setEntries(
      topics.map(topic => ({
        label: topic.label,
        disabled: topic.state === 'disabled',

        style:
          topic.state === 'disabled'
            ? 'locked'
            : topic.state === 'used'
              ? 'asked'
              : 'new',
      }))
    );
  }

  _pickIndex(index) {
    if (
      !this.isOpen ||
      this._destroyed ||
      this._entries[index]?.disabled
    ) {
      return;
    }

    this.topics[index]?.onSelect?.();
  }

  _advance() {
    if (!this.isOpen) return;

    if (this.isTyping) {
      this._finishTyping();
      return;
    }

    if (this.pageIndex < this.pages.length - 1) {
      this.pageIndex += 1;
      this.renderTextPage();
    }
  }

  previousPage() {
    if (!this.isOpen || this.pageIndex <= 0) return;

    this.pageIndex -= 1;
    this.renderTextPage();
  }

  _goodbye() {
    if (this.isOpen) {
      this.onLeave?.();
    }
  }

  _handleKey(event) {
    if (
      !this.isOpen ||
      this._destroyed ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        event.target?.tagName
      )
    ) {
      return;
    }

    const key = event.key;

    const handled =
      [
        'Escape',
        ' ',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
      ].includes(key) ||
      /^[0-6]$/.test(key);

    if (!handled) return;

    event.preventDefault?.();

    if (event.repeat) return;

    if (key === 'Escape' || key === '0') {
      this._goodbye();
    } else if (
      key === ' ' ||
      key === 'Enter' ||
      key === 'ArrowRight'
    ) {
      this._advance();
    } else if (key === 'ArrowLeft') {
      this.previousPage();
    } else if (
      key === 'ArrowUp' ||
      key === 'ArrowDown'
    ) {
      this._scrollBy(
        key === 'ArrowUp' ? -1 : 1
      );
    } else if (this.isTyping) {
      this._finishTyping();
    } else {
      this._pickIndex(
        this.scroll + Number(key) - 1
      );
    }
  }
}

export class HomeTownDialogue {
  constructor(scene, onClose = () => {}) {
    this.scene = scene;
    this.onClose = onClose;

    this.root = null;
    this.panel = null;
    this.data = null;

    this.seen = new Set();

    this.destroyed = false;
    this.choosing = false;

    this.dispose = () => this.destroy();
    this.resize = () => this.draw();

    scene.events.once(
      'shutdown',
      this.dispose
    );

    scene.events.once(
      'destroy',
      this.dispose
    );

    scene.scale.on(
      'resize',
      this.resize
    );
  }

  get typing() {
    return Boolean(this.panel?.isTyping);
  }

  get textPage() {
    return this.panel?.textPage || 0;
  }

  get menuPage() {
    return this.panel?.choicePage || 0;
  }

  get body() {
    return this.panel?.body || null;
  }

  get footer() {
    return this.panel?.pageLabel || null;
  }

  get pages() {
    return this.panel?.pages || [];
  }

  get pageText() {
    return this.panel?.pageText || '';
  }

  get trustEnabled() {
    return Boolean(
      this.data &&
      this.data.showTrust !== false &&
      hasId(this.data.npcId)
    );
  }

  stop() {
    if (this.panel?.isTyping) {
      this.panel._finishTyping();
    }
  }

  clear() {
    this.panel?.destroy();

    this.panel = null;
    this.root = null;
  }

  show(data = {}) {
    if (this.destroyed) return null;

    this.clear();

    this.data = {
      title: '',
      text: '',
      choices: [],
      ...data,
    };

    if (!Array.isArray(this.data.choices)) {
      this.data.choices = [];
    }

    if (hasId(this.data.npcId)) {
      this.data.npcId = this.data.npcId.trim();
    }

    this.panel = new HomeTownView(
      this.scene,
      this.data,
      () => this.close()
    );

    this.root = this.panel.root;

    this.refreshTrust();
    this.updateTopics();

    return this.root;
  }

  refreshTrust() {
    if (!this.panel?.isOpen) return;

    if (!this.trustEnabled) {
      this.panel.setTrust(null);
      return;
    }

    this.panel.setTrust(
      getHomeTownTrust(
        this.data.npcId,
        this.data.startTrust
      )
    );
  }

  getChoiceId(choice) {
    if (hasId(choice.id)) {
      return choice.id.trim();
    }

    // Zgodność ze starymi rozmowami.
    // Dla odpowiedzi punktowanych podawaj jawne, stałe id.
    return JSON.stringify([
      this.data.nodeId ?? this.data.title,
      choice.label,
    ]);
  }

  getSeenKey(choiceId) {
    return JSON.stringify([
      this.data.npcId ?? '',
      choiceId,
    ]);
  }

  updateTopics() {
    if (
      !this.data ||
      !this.panel?.isOpen
    ) {
      return;
    }

    const sourcePanel = this.panel;

    const topics = this.data.choices.map(
      (raw, index) => {
        const choice = normalizeChoice(raw, index);
        const choiceId = this.getChoiceId(choice);
        const seenKey = this.getSeenKey(choiceId);

        const used =
          this.seen.has(seenKey) ||
          (
            this.trustEnabled &&
            hasHomeTownTrustChoice(
              this.data.npcId,
              choiceId
            )
          );

        const disabled =
          choice.disabled === true ||
          choice.state === 'disabled' ||
          typeof choice.action !== 'function';

        return {
          id: choiceId,
          label: choice.label,

          state: disabled
            ? 'disabled'
            : used || choice.state === 'used'
              ? 'used'
              : 'normal',

          onSelect: () => {
            if (
              this.choosing ||
              this.destroyed ||
              this.panel !== sourcePanel ||
              !sourcePanel.isOpen ||
              disabled
            ) {
              return;
            }

            const data = this.data;

            this.choosing = true;

            try {
              if (this.trustEnabled) {
                applyHomeTownTrustChoice({
                  npcId: data.npcId,
                  choiceId,
                  attitude: choice.attitude ?? 'neutral',
                  trustDelta: choice.trustDelta,
                  reactions: data.trustReactions,
                  startTrust: data.startTrust,
                });

                this.refreshTrust();
              }

              this.seen.add(seenKey);

              const result = choice.action();

              if (
                result &&
                typeof result.catch === 'function'
              ) {
                result.catch(error => {
                  console.error(
                    '[HomeTownDialogue] Async choice failed:',
                    error
                  );
                });
              }
            } finally {
              this.choosing = false;

              if (this.panel?.isOpen) {
                this.refreshTrust();
                this.updateTopics();
              }
            }
          },
        };
      }
    );

    sourcePanel.setTopics(
      topics,
      { preservePage: true }
    );
  }

  draw() {
    if (
      this.destroyed ||
      !this.data ||
      !this.panel?.isOpen
    ) {
      return;
    }

    const page = this.textPage;
    const scroll = this.panel.scroll;
    const data = this.data;
    const wasTyping = this.typing;

    this.show(data);

    this.panel.pageIndex = Math.min(
      page,
      this.panel.pages.length - 1
    );

    this.panel.renderTextPage();

    if (!wasTyping) {
      this.panel._finishTyping();
    }

    this.panel.scroll = scroll;

    this.updateTopics();
  }

  type() {
    this.panel?.renderTextPage();
  }

  advance() {
    this.panel?._advance();
  }

  close(notify = true) {
    this.clear();
    this.data = null;

    if (notify) {
      this.onClose();
    }
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    this.close(false);

    this.scene.events.off(
      'shutdown',
      this.dispose
    );

    this.scene.events.off(
      'destroy',
      this.dispose
    );

    this.scene.scale.off(
      'resize',
      this.resize
    );
  }
}