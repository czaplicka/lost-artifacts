import { saveGameState } from '../GameData.js';

export class NotesUI {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.currentGameState = null;

    const { width, height } = this.scene.scale;

    this.overlay = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setInteractive()
      .setDepth(20)
      .setVisible(false);

    this.overlay.on('pointerdown', () => this.close());

    this.container = this.scene.add.container(0, 0).setDepth(21).setVisible(false);

    const bg = this.scene.add.image(width / 2, height / 2, 'notes').setInteractive();
    this.container.add(bg);

    const closeBtn = this.scene.add.text(width * 0.82, height * 0.09, 'X', {
      fontFamily: 'Special Elite',
      fontSize: '48px',
      color: '#000000'
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.close());

    this.container.add(closeBtn);

    this.gameNotesText = this.scene.add.text(width * 0.21, height * 0.16, '', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#000000',
      wordWrap: { width: 400 },
      lineSpacing: 8,
      padding: { top: 6, bottom: 2 }
    });

    this.container.add(this.gameNotesText);

    this.gameNotesTitleText = this.scene.add.text(width * 0.52, height * 0.14, 'Your notes', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#000000',
      wordWrap: { width: 400 },
      lineSpacing: 8,
      padding: { top: 6, bottom: 2 }
    });

    this.container.add(this.gameNotesTitleText);

    this.playerInputDOM = this.scene.add.dom(
      width * 0.8,
      height * 0.6,
      'textarea',
      'width: 400px; height: 500px; font-family: "Special Elite"; font-size: 22px; background: transparent; border: none; outline: none; resize: none; color: #000000;',
      ''
    ).setOrigin(0.5);

    this.container.add(this.playerInputDOM);

    this.onInput = event => {
      if (this.isOpen) {
        this.updateNotes(event.target.value);
      }
    };

    this.playerInputDOM.node.addEventListener('input', this.onInput);

    const clearBtn = this.scene.add.text(width * 0.68, height * 0.72, '[ CLEAR NOTES ]', {
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

    if (Array.isArray(gameState?.cluesCollected) && gameState.cluesCollected.length > 0) {
      cluesText += gameState.cluesCollected
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
    this.currentGameState = gameState;
    this.overlay.setVisible(true);
    this.container.setVisible(true);
    this.refresh(gameState);
  }

  close() {
    if (!this.isOpen) return;

    if (this.currentGameState) {
      this.currentGameState.playerNotes = this.playerInputDOM.node.value;
      saveGameState();
    }

    this.isOpen = false;
    this.overlay.setVisible(false);
    this.container.setVisible(false);
  }

  toggle(gameState) {
    this.isOpen ? this.close() : this.open(gameState);
  }

  destroy() {
    if (this.playerInputDOM?.node && this.onInput) {
      this.playerInputDOM.node.removeEventListener('input', this.onInput);
    }
  }
}