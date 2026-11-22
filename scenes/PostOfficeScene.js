import {
  PostOfficeScene as PostOfficeSceneBase,
} from './PostOfficeSceneBase.js';

import {
  syncPostalNotebook,
} from '../managers/PostOfficeNotebook.js';

const POSTMAN_ID = 'pi_post_office_postman';
const DIALOGUE_DEPTH = 30000;

function normalizeChoice(raw) {
  if (Array.isArray(raw)) {
    const [
      label,
      action,
      metadata = {},
    ] = raw;

    const settings =
      typeof metadata === 'string'
        ? { attitude: metadata }
        : metadata || {};

    return {
      ...settings,
      label: String(label ?? ''),
      action,
      attitude: settings.attitude ?? 'neutral',
    };
  }

  if (raw && typeof raw === 'object') {
    return {
      ...raw,
      label: String(raw.label ?? ''),
      action: raw.action ?? raw.onSelect,
      attitude: raw.attitude ?? 'neutral',
    };
  }

  return {
    label: String(raw ?? ''),
    action: null,
    attitude: 'neutral',
    disabled: true,
  };
}

export class PostOfficeScene extends PostOfficeSceneBase {
  init(...args) {
    super.init(...args);

    this.pendingPlayerLine = null;
  }

  create(...args) {
    super.create(...args);

    this.raisePostalDialogue();

    this.events.once('shutdown', () => {
      this.pendingPlayerLine = null;
    });
  }

  raisePostalDialogue() {
    this.dialogue?.root?.setDepth(
      DIALOGUE_DEPTH
    );

    this.dialogue?.panel?.blocker?.setDepth(
      DIALOGUE_DEPTH - 1
    );
  }

  resizeView(...args) {
    super.resizeView(...args);

    this.raisePostalDialogue();
  }

  closeModal(...args) {
    this.pendingPlayerLine = null;

    return super.closeModal(...args);
  }

  onKey(event) {
    const editingText =
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        event.target?.tagName
      );

    if (
      editingText ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat
    ) {
      return;
    }

    // Przy otwartym dialogu Escape obsługuje nowy panel.
    // Edytor hotspotów zachowuje własną obsługę klawiszy.
    if (
      this.modal &&
      !this.editor?.enabled &&
      (
        event.key === 'Escape' ||
        event.code === 'Escape'
      )
    ) {
      return;
    }

    return super.onKey(event);
  }

  postmanReply(
    id,
    label,
    attitude,
    action
  ) {
    return {
      id,
      label,
      attitude,

      action: () => {
        this.pendingPlayerLine = {
          npcId: POSTMAN_ID,
          text: String(label),
        };

        try {
          return action();
        } finally {
          this.pendingPlayerLine = null;
        }
      },
    };
  }

  postmanBackChoice() {
    return {
      id: 'postman_return_to_menu',
      label: 'Another question.',
      attitude: 'neutral',

      action: () => this.talk(),
    };
  }

  talk(...args) {
    super.talk(...args);

    const data = this.dialogue?.data;

    if (
      this.exiting ||
      !data ||
      data.npcId !== POSTMAN_ID ||
      !Array.isArray(data.choices)
    ) {
      return;
    }

    const additions = [
      this.postmanReply(
        'postman_appreciate_work',
        'Thanks for your help. This place would fall apart without you.',
        'nice',

        () => {
          this.panel(
            'POSTMAN',
            'It already has. I keep the pieces in alphabetical order.',
            [
              this.postmanBackChoice(),
            ],
            true
          );
        }
      ),

      this.postmanReply(
        'postman_insult_work',
        'Do you actually deliver anything, or just excuses?',
        'rude',

        () => {
          this.panel(
            'POSTMAN',
            'Both. The excuses arrive on time. They travel lighter.',
            [
              this.postmanBackChoice(),
            ],
            true
          );
        }
      ),
    ];

    const existingIds = new Set(
      data.choices
        .map(choice => choice?.id)
        .filter(Boolean)
    );

    for (const choice of additions) {
      if (!existingIds.has(choice.id)) {
        data.choices.push(choice);
      }
    }

    // Aktualizujemy ten sam obiekt danych.
    // Hook reakcji świata przechowuje jego referencję.
    this.dialogue.updateTopics();

    this.raisePostalDialogue();
    this.modal = this.dialogue.root;
  }

  panel(
    title,
    text,
    choices = [],
    portrait = false
  ) {
    if (
      this.exiting ||
      this._cleanupDone ||
      !this.dialogue ||
      this.dialogue.destroyed
    ) {
      return;
    }

    syncPostalNotebook();
    this.clearHover();

    // W istniejącej scenie rozmowy listonosza
    // używają POSTMAN i portrait=true.
    const isPostman =
      title === 'POSTMAN' &&
      portrait === true;

    const npcId = isPostman
      ? POSTMAN_ID
      : null;

    const selectedLine =
      this.pendingPlayerLine;

    this.pendingPlayerLine = null;

    const messages = [];

    if (
      isPostman &&
      selectedLine?.npcId === POSTMAN_ID
    ) {
      messages.push({
        speaker: 'player',
        text: selectedLine.text,
      });
    }

    messages.push({
      speaker: isPostman ? 'npc' : 'note',
      text: String(text ?? ''),
    });

    const guardedChoices = choices.map(raw => {
      const choice = normalizeChoice(raw);

      const disabled =
        choice.disabled === true ||
        choice.state === 'disabled' ||
        typeof choice.action !== 'function';

      return {
        ...choice,

        // Dotychczasowe wybory zadań są neutralne.
        // Tylko jawnie oznaczona odpowiedź zmienia zaufanie.
        attitude: choice.attitude ?? 'neutral',

        disabled,

        action: () => {
          if (
            disabled ||
            this.exiting ||
            this._cleanupDone ||
            this.editor?.enabled ||
            !this.modal
          ) {
            return;
          }

          return choice.action();
        },
      };
    });

    this.modal = this.dialogue.show({
      title,
      text,
      messages,

      npcId,
      showTrust: isPostman,

      nodeId: isPostman
        ? 'postman_dialogue'
        : `postal_panel:${title}`,

      choices: guardedChoices,
    });

    this.raisePostalDialogue();
  }
}