import { saveGameState } from '../GameStatePersistence.js';
  import { EventBus } from '../EventBus.js';

  export class NotesUI {
    constructor(scene) {
      this.scene = scene;
      this.isOpen = false;
      this.isTyping = false;
      this.currentGameState = null;

      this.boundToggleHandler = this.onToggleKeyDown.bind(this);
      this.boundGlobalKeyHandler = this.onGlobalKeyDown.bind(this);

      const { width, height } = this.scene.scale;

      this.overlay = this.scene.add
        .rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
        .setInteractive()
        .setDepth(20)
        .setVisible(false);

      this.overlay.on('pointerdown', () => this.close());

      this.container = this.scene.add.container(0, 0).setDepth(21).setVisible(false);

      const bg = this.scene.add.image(width / 2, height / 2, 'notes').setScale(1.0).setInteractive().setDisplaySize(1920, 1080);
      this.container.add(bg);

      const closeBtn = this.scene.add.text(width * 0.87, height * 0.03, 'X', {
        fontFamily: 'Special Elite',
        fontSize: '48px',
        color: '#000000'
      })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.close());

      this.container.add(closeBtn);

      this.gameNotesText = this.scene.add.text(width * 0.17, height * 0.06, '', {
        fontFamily: 'Special Elite',
        fontSize: '22px',
        color: '#000000',
        wordWrap: { width: 500 },
        lineSpacing: 8,
        padding: { top: 6, bottom: 2 }
      });

      this.container.add(this.gameNotesText);

      this.gameNotesTitleText = this.scene.add.text(width * 0.52, height * 0.13, 'Your notes', {
        fontFamily: 'Special Elite',
        fontSize: '22px',
        color: '#000000',
        wordWrap: { width: 400 },
        lineSpacing: 8,
        padding: { top: 6, bottom: 2 }
      });

      this.container.add(this.gameNotesTitleText);

      this.modeHintText = this.scene.add.text(width * 0.68, height * 0.15, '[ CLICK TO WRITE | ESC TO STOP ]', {
        fontFamily: 'Special Elite',
        fontSize: '16px',
        color: '#333333'
      }).setOrigin(0.5);

      this.container.add(this.modeHintText);

      this.playerInputDOM = this.scene.add.dom(
        width * 0.63,
        height * 0.4,
        'textarea',
        [
          'width: 400px',
          'height: 500px',
          'font-family: "IndieFlower"',
          'font-size: 22px',
          'background: transparent',
          'border: none',
          'outline: none',
          'resize: none',
          'color: #000000',
          'pointer-events: auto'
        ].join('; ') + ';',
        ''
      ).setOrigin(0.5);

      this.container.add(this.playerInputDOM);

      this.onInput = event => {
        if (this.isOpen && this.isTyping) {
          this.updateNotes(event.target.value);
        }
      };

      this.onTextAreaFocus = () => {
        if (this.isOpen) {
          this.enableTypingMode();
        }
      };

      this.onTextAreaBlur = () => {
        if (this.isOpen) {
          this.disableTypingMode();
        }
      };

      this.playerInputDOM.node.addEventListener('input', this.onInput);
      this.playerInputDOM.node.addEventListener('focus', this.onTextAreaFocus);
      this.playerInputDOM.node.addEventListener('blur', this.onTextAreaBlur);

      const clearBtn = this.scene.add.text(width * 0.68, height * 0.82, '[ CLEAR NOTES ]', {
        fontFamily: 'Special Elite',
        fontSize: '20px',
        color: '#8b0000'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

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

    bindKeyboardShortcut() {
      if (!this.scene.input?.keyboard) return;

      this.scene.input.keyboard.on('keydown-N', this.boundToggleHandler);
    }

    onToggleKeyDown(event) {
      const activeTag = document.activeElement?.tagName;
      const isTypingInAnyField =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        document.activeElement?.isContentEditable;

      if (isTypingInAnyField && !this.isOpen) return;

      event.preventDefault();
      this.toggle(this.currentGameState || this.scene.playerMenu?.gameState || this.scene.gameState);
    }

    onGlobalKeyDown(event) {
      if (!this.isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();

        if (this.isTyping) {
          this.disableTypingMode();
        } else {
          this.close();
        }
      }
    }

    enableTypingMode() {
      if (this.isTyping) return;

      this.isTyping = true;
      this.modeHintText.setText('[ WRITING... ESC TO STOP ]');

      if (this.scene.input?.keyboard) {
        this.scene.input.keyboard.enabled = false;
        this.scene.input.keyboard.disableGlobalCapture();
      }
    }

    disableTypingMode() {
      if (!this.isTyping) return;

      this.isTyping = false;
      this.modeHintText.setText('[ CLICK TO WRITE | ESC TO STOP ]');

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
      if (this.currentGameState) {
        this.currentGameState.playerNotes = newText;
      }
    }

    humanizeCategory(category) {
      const map = {
        hair: 'Hair',
        eyes: 'Eyes',
        features: 'Feature',
        accent: 'Accent',
        skills: 'Skill',
        habitus: 'Habit'
      };

      return map[category] || 'Trait';
    }

    formatSuspectClue(clue) {
      const label = this.humanizeCategory(clue.category);
      const value = clue.value || clue.key || 'unknown';

      return `${label}: ${value}`;
    }

    formatTravelClue(clue) {
      return clue.tag || clue.text || 'Travel clue recorded.';
    }

    formatGenericClue(clue) {
      if (clue.text) return clue.text;
      if (clue.tag) return clue.tag;
      if (clue.value) return String(clue.value);
      if (clue.key) return String(clue.key);
      return 'Unsorted clue';
    }

    formatClue(clue) {
      if (!clue) return 'Unknown clue';

      if (typeof clue === 'string') {
        return clue;
      }

      if (clue.type === 'travel') {
        return this.formatTravelClue(clue);
      }

      if (clue.type === 'suspect') {
        return this.formatSuspectClue(clue);
      }

      if (clue.text) {
        return clue.text;
      }

      return this.formatGenericClue(clue);
    }

buildCluesText(gameState) {
  let cluesText = 'Clues:\n\n\n';

  const visibleClues = Array.isArray(gameState?.cluesCollected)
    ? gameState.cluesCollected.filter(clue => clue?.category !== 'skills')
    : [];

  if (visibleClues.length > 0) {
    cluesText += visibleClues
      .map(clue => `- ${this.formatClue(clue)}`)
      .join('\n');
  } else {
    cluesText += 'No clues found yet...';
  }

  return cluesText;
}

    refresh(gameState = this.currentGameState) {
      if (!gameState) return;

      this.currentGameState = gameState;
      this.gameNotesText.setText(this.buildCluesText(gameState));

      if (this.playerInputDOM?.node) {
        this.playerInputDOM.node.value = gameState.playerNotes || '';
      }
    }

    open(gameState) {
      this.isOpen = true;
      EventBus.emit('hideHUD');
      this.currentGameState = gameState;
      this.overlay.setVisible(true);
      this.container.setVisible(true);
      this.refresh(gameState);
      this.disableTypingMode();
    }

    close() {
      if (!this.isOpen) return;

      if (this.currentGameState && this.playerInputDOM?.node) {
        this.currentGameState.playerNotes = this.playerInputDOM.node.value;
        saveGameState();
      }

      this.disableTypingMode();

      this.isOpen = false;
      this.overlay.setVisible(false);
      this.container.setVisible(false);
      EventBus.emit('showHUD');
    }

    toggle(gameState) {
      this.isOpen ? this.close() : this.open(gameState);
    }

    destroy() {
      EventBus.emit('showHUD');
      if (this.playerInputDOM?.node) {
        if (this.onInput) {
          this.playerInputDOM.node.removeEventListener('input', this.onInput);
        }

        if (this.onTextAreaFocus) {
          this.playerInputDOM.node.removeEventListener('focus', this.onTextAreaFocus);
        }

        if (this.onTextAreaBlur) {
          this.playerInputDOM.node.removeEventListener('blur', this.onTextAreaBlur);
        }
      }

      if (this.scene.input?.keyboard) {
        this.scene.input.keyboard.off('keydown-N', this.boundToggleHandler);
      }

      document.removeEventListener('keydown', this.boundGlobalKeyHandler);
    }
  }