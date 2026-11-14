import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  saveGameState,
  requestAutosave
} from '../gameStatePersistence.js';

import { EventBus } from '../EventBus.js';

export class NotesUI {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.isTyping = false;
    this.currentGameState = null;

    this.cluePages = [__dialogueText("ui/NotesUI.js", "t_e845043e42f03687c039")];
    this.cluePageIndex = 0;
    this.lastCluesText = null;

    this.boundToggleHandler = this.onToggleKeyDown.bind(this);
    this.boundGlobalKeyHandler = this.onGlobalKeyDown.bind(this);

    const { width, height } = this.scene.scale;

    this.cluesWidth = Math.min(500, width * 0.29);
    this.cluesHeight = Math.max(80, height * 0.62);

    this.overlay = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x000000,
        0.6
      )
      .setInteractive()
      .setDepth(20)
      .setVisible(false);

    this.overlay.on('pointerdown', () => this.close());

    this.container = this.scene.add
      .container(0, 0)
      .setDepth(21)
      .setVisible(false);

    const bg = this.scene.add
      .image(width / 2, height / 2, 'notes')
      .setDisplaySize(1920, 1080)
      .setInteractive();

    this.container.add(bg);

    const closeBtn = this.scene.add
      .text(width * 0.87, height * 0.03, __dialogueText("ui/NotesUI.js", "t_4b68ab3847feda7d6c62"), {
        fontFamily: 'SpecialElite',
        fontSize: '48px',
        color: '#000000'
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.close());

    this.container.add(closeBtn);

    this.cluesTitleText = this.scene.add.text(
      width * 0.17,
      height * 0.06,
      __dialogueText("ui/NotesUI.js", "t_86aa514b105ec9eca158"),
      {
        fontFamily: 'SpecialElite',
        fontSize: '26px',
        color: '#000000'
      }
    );

    this.container.add(this.cluesTitleText);

    this.gameNotesText = this.scene.add.text(
      width * 0.17,
      height * 0.14,
      '',
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#000000',
        wordWrap: {
          width: this.cluesWidth,
          useAdvancedWrap: true
        },
        lineSpacing: 8,
        padding: { top: 6, bottom: 2 }
      }
    );

    this.container.add(this.gameNotesText);

    this.prevCluesBtn = this.createPageButton(
      width * 0.17,
      height * 0.82,
      __dialogueText("ui/NotesUI.js", "t_86af811671fe29fad1d2"),
      () => this.changeCluePage(-1)
    );

    this.cluesPageText = this.scene.add
      .text(width * 0.305, height * 0.82, '', {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#333333'
      })
      .setOrigin(0.5);

    this.container.add(this.cluesPageText);

    this.nextCluesBtn = this.createPageButton(
      width * 0.44,
      height * 0.82,
      __dialogueText("ui/NotesUI.js", "t_58b85f2ea88bf1a9ba16"),
      () => this.changeCluePage(1)
    );

    this.nextCluesBtn.setOrigin(1, 0.5);

    this.gameNotesTitleText = this.scene.add.text(
      width * 0.52,
      height * 0.13,
      __dialogueText("ui/NotesUI.js", "t_55576676783c7f797f5a"),
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#000000',
        wordWrap: { width: 400 },
        lineSpacing: 8,
        padding: { top: 6, bottom: 2 }
      }
    );

    this.container.add(this.gameNotesTitleText);

    this.modeHintText = this.scene.add
      .text(
        width * 0.68,
        height * 0.15,
        __dialogueText("ui/NotesUI.js", "t_51876a61a7c89f640704"),
        {
          fontFamily: 'SpecialElite',
          fontSize: '16px',
          color: '#333333'
        }
      )
      .setOrigin(0.5);

    this.container.add(this.modeHintText);

    this.playerInputDOM = this.scene.add
      .dom(
        width * 0.63,
        height * 0.4,
        'textarea',
        [
          __dialogueText("ui/NotesUI.js", "t_f91830934749f0910256"),
          __dialogueText("ui/NotesUI.js", "t_23927985a9d7b783fd32"),
          __dialogueText("ui/NotesUI.js", "t_9238955ee4613783b3d1"),
          __dialogueText("ui/NotesUI.js", "t_7e954fdb9f22e7efff09"),
          __dialogueText("ui/NotesUI.js", "t_8c3a5d4f399e59727106"),
          __dialogueText("ui/NotesUI.js", "t_723c9b4e31276b15c90b"),
          __dialogueText("ui/NotesUI.js", "t_1f6d5babe8d9f56a8029"),
          __dialogueText("ui/NotesUI.js", "t_f94f245916770018e5b1"),
          __dialogueText("ui/NotesUI.js", "t_f80a833bf1a2c7522f9d"),
          __dialogueText("ui/NotesUI.js", "t_07da01c9c993e83bdd1b")
        ].join('; ') + ';',
        ''
      )
      .setOrigin(0.5);

    this.container.add(this.playerInputDOM);

    this.onInput = event => {
      if (this.isOpen && this.isTyping) {
        this.updateNotes(event.target.value);
      }
    };

    this.onTextAreaFocus = () => {
      if (this.isOpen) this.enableTypingMode();
    };

    this.onTextAreaBlur = () => {
      if (this.isOpen) this.disableTypingMode();
    };

    this.playerInputDOM.node.addEventListener('input', this.onInput);
    this.playerInputDOM.node.addEventListener(
      'focus',
      this.onTextAreaFocus
    );
    this.playerInputDOM.node.addEventListener(
      'blur',
      this.onTextAreaBlur
    );

    const clearBtn = this.scene.add
      .text(width * 0.68, height * 0.82, __dialogueText("ui/NotesUI.js", "t_d6535da07e962d7840a0"), {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#8b0000'
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    clearBtn.on('pointerover', () => clearBtn.setColor('#ff0000'));
    clearBtn.on('pointerout', () => clearBtn.setColor('#8b0000'));

    clearBtn.on('pointerdown', () => {
      this.playerInputDOM.node.value = '';
      this.updateNotes('');
      saveGameState();
    });

    this.container.add(clearBtn);

    this.bindKeyboardShortcut();
    document.addEventListener('keydown', this.boundGlobalKeyHandler);
  }

  createPageButton(x, y, label, callback) {
    const button = this.scene.add
      .text(x, y, label, {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#352719'
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (button.input?.enabled) button.setColor('#8b0000');
    });

    button.on('pointerout', () => button.setColor('#352719'));

    button.on('pointerdown', () => {
      if (button.input?.enabled) callback();
    });

    this.container.add(button);
    return button;
  }

  setPageButtonEnabled(button, enabled) {
    button.setAlpha(enabled ? 1 : 0.3);
    button.setColor('#352719');

    if (button.input) button.input.enabled = enabled;
  }

  changeCluePage(direction) {
    const nextIndex = this.cluePageIndex + direction;

    if (nextIndex < 0 || nextIndex >= this.cluePages.length) return;

    this.cluePageIndex = nextIndex;
    this.renderCluePage();
  }

  renderCluePage() {
    this.cluePageIndex = Math.max(
      0,
      Math.min(this.cluePageIndex, this.cluePages.length - 1)
    );

    this.gameNotesText.setText(
      this.cluePages[this.cluePageIndex] || ''
    );

    this.cluesPageText.setText(
      `${this.cluePageIndex + 1}${__dialogueText("ui/NotesUI.js", "t_005e1574a2b5c8163046")}${this.cluePages.length}`
    );

    this.setPageButtonEnabled(
      this.prevCluesBtn,
      this.cluePageIndex > 0
    );

    this.setPageButtonEnabled(
      this.nextCluesBtn,
      this.cluePageIndex < this.cluePages.length - 1
    );
  }

  buildCluePages(gameState) {
    const clues = Array.isArray(gameState?.cluesCollected)
      ? gameState.cluesCollected.filter(
          clue => clue?.category !== 'skills'
        )
      : [];

    if (!clues.length) return [__dialogueText("ui/NotesUI.js", "t_e845043e42f03687c039")];

    const pages = [];
    let currentPage = '';

    const fits = text => {
      this.gameNotesText.setText(text);
      return this.gameNotesText.height <= this.cluesHeight;
    };

    const finishPage = () => {
      if (!currentPage) return;

      pages.push(currentPage);
      currentPage = '';
    };

    for (const clue of clues) {
      const entry = `- ${this.formatClue(clue)}`;
      const candidate = currentPage
        ? `${currentPage}\n\n${entry}`
        : entry;

      if (fits(candidate)) {
        currentPage = candidate;
        continue;
      }

      finishPage();

      if (fits(entry)) {
        currentPage = entry;
        continue;
      }

      // Wyjątkowo długą wskazówkę dzielimy między stronami.
      let fragment = '';

      for (const character of entry) {
        const candidateFragment = fragment + character;

        if (fragment && !fits(candidateFragment)) {
          pages.push(fragment.trimEnd());
          fragment = character.trimStart();
        } else {
          fragment = candidateFragment;
        }
      }

      currentPage = fragment;
    }

    finishPage();

    return pages.length ? pages : [__dialogueText("ui/NotesUI.js", "t_e845043e42f03687c039")];
  }

  bindKeyboardShortcut() {
    this.scene.input?.keyboard?.on(
      'keydown-N',
      this.boundToggleHandler
    );
  }

  onToggleKeyDown(event) {
    const activeElement = document.activeElement;
    const activeTag = activeElement?.tagName;

    const isTypingInAnyField =
      activeTag === 'INPUT' ||
      activeTag === 'TEXTAREA' ||
      activeElement?.isContentEditable;

    if (isTypingInAnyField) return;

    event.preventDefault();

    this.toggle(
      this.currentGameState ||
      this.scene.playerMenu?.gameState ||
      this.scene.gameState
    );
  }

  onGlobalKeyDown(event) {
    if (!this.isOpen || event.key !== __dialogueText("ui/NotesUI.js", "t_037c968467aa3fd7c059")) return;

    event.preventDefault();

    if (this.isTyping) {
      this.disableTypingMode();
    } else {
      this.close();
    }
  }

  enableTypingMode() {
    if (this.isTyping) return;

    this.isTyping = true;
    this.modeHintText.setText(__dialogueText("ui/NotesUI.js", "t_e756cdd23b0541d1e044"));

    if (this.scene.input?.keyboard) {
      this.scene.input.keyboard.enabled = false;
      this.scene.input.keyboard.disableGlobalCapture();
    }
  }

  disableTypingMode() {
    if (!this.isTyping) return;

    this.isTyping = false;
    this.modeHintText.setText(__dialogueText("ui/NotesUI.js", "t_51876a61a7c89f640704"));

    if (this.scene.input?.keyboard) {
      this.scene.input.keyboard.enabled = true;
      this.scene.input.keyboard.enableGlobalCapture();
      this.scene.input.keyboard.resetKeys();
    }

    if (document.activeElement === this.playerInputDOM?.node) {
      this.playerInputDOM.node.blur();
    }
  }

  updateNotes(newText) {
    if (!this.currentGameState) return;

    this.currentGameState.playerNotes = newText;
    requestAutosave();
  }

  humanizeCategory(category) {
    const map = {
      hair: __dialogueText("ui/NotesUI.js", "t_ababed4823ab79d226ba"),
      eyes: __dialogueText("ui/NotesUI.js", "t_a39e9d9816a99fc02aa4"),
      features: __dialogueText("ui/NotesUI.js", "t_3d377ae910dce03ac324"),
      accent: __dialogueText("ui/NotesUI.js", "t_a5c6fb18c9af89b22a79"),
      skills: __dialogueText("ui/NotesUI.js", "t_6df1bb18a59ab97df82e"),
      habitus: __dialogueText("ui/NotesUI.js", "t_55aa512df89ee35e7e99")
    };

    return map[category] || __dialogueText("ui/NotesUI.js", "t_28e3e479e087b8b42748");
  }

  formatSuspectClue(clue) {
    const label = this.humanizeCategory(clue.category);
    const value = clue.value || clue.key || 'unknown';

    return `${label}: ${value}`;
  }

  formatTravelClue(clue) {
    return clue.tag || clue.text || __dialogueText("ui/NotesUI.js", "t_7598bad2684e0dadd6d7");
  }

  formatGenericClue(clue) {
    if (clue.text) return clue.text;
    if (clue.tag) return clue.tag;
    if (clue.value) return String(clue.value);
    if (clue.key) return String(clue.key);

    return __dialogueText("ui/NotesUI.js", "t_fdb899912f269ea0c8af");
  }

  formatClue(clue) {
    if (!clue) return __dialogueText("ui/NotesUI.js", "t_43645ebe7316f941b093");
    if (typeof clue === 'string') return clue;

    if (clue.type === 'travel') {
      return this.formatTravelClue(clue);
    }

    if (clue.type === 'suspect') {
      return this.formatSuspectClue(clue);
    }

    if (clue.text) return clue.text;

    return this.formatGenericClue(clue);
  }

  buildCluesText(gameState) {
    const clues = Array.isArray(gameState?.cluesCollected)
      ? gameState.cluesCollected.filter(
          clue => clue?.category !== 'skills'
        )
      : [];

    return clues.length
      ? __dialogueText("ui/NotesUI.js", "t_98ff99a01683b5ddba02") +
          clues.map(clue => `- ${this.formatClue(clue)}`).join('\n\n')
      : __dialogueText("ui/NotesUI.js", "t_305b20f6fcc4dd9ae5b8");
  }

  refresh(gameState = this.currentGameState) {
    if (!gameState) return;

    const stateChanged = this.currentGameState !== gameState;
    this.currentGameState = gameState;

    const cluesText = this.buildCluesText(gameState);

    if (stateChanged || cluesText !== this.lastCluesText) {
      if (stateChanged) this.cluePageIndex = 0;

      this.cluePages = this.buildCluePages(gameState);
      this.lastCluesText = cluesText;
    }

    this.renderCluePage();

    if (this.playerInputDOM?.node && !this.isTyping) {
      this.playerInputDOM.node.value = gameState.playerNotes || '';
    }
  }

  open(gameState) {
    this.disableTypingMode();
    this.isOpen = true;

    EventBus.emit('hideHUD');

    this.overlay.setVisible(true);
    this.container.setVisible(true);
    this.refresh(gameState || this.currentGameState);
  }

  close() {
    if (!this.isOpen) return;

    if (this.currentGameState && this.playerInputDOM?.node) {
      this.currentGameState.playerNotes =
        this.playerInputDOM.node.value;

      saveGameState();
    }

    this.disableTypingMode();
    this.isOpen = false;

    this.overlay.setVisible(false);
    this.container.setVisible(false);

    EventBus.emit('showHUD');
  }

  toggle(gameState) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(gameState);
    }
  }

  destroy() {
    if (this.isOpen) this.close();

    this.disableTypingMode();

    const node = this.playerInputDOM?.node;

    if (node) {
      node.removeEventListener('input', this.onInput);
      node.removeEventListener('focus', this.onTextAreaFocus);
      node.removeEventListener('blur', this.onTextAreaBlur);
    }

    this.scene.input?.keyboard?.off(
      'keydown-N',
      this.boundToggleHandler
    );

    document.removeEventListener(
      'keydown',
      this.boundGlobalKeyHandler
    );

    this.container?.destroy(true);
    this.overlay?.destroy();
  }
}