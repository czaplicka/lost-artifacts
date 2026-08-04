import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import { setupNewGame } from '../gameSetup.js';

export class AgainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AgainScene' });

    this.dialogueText = null;
    this.fullIntroText = '';
    this.typingEvent = null;

    this.isStartingNewMission = false;

    this.backBtn = null;
    this.yesBtn = null;
    this.noBtn = null;
    this.yesText = null;
    this.noText = null;

    this.handleEnterKey = null;
    this.handleEscapeKey = null;
  }

  create() {
    this.scene.wake('UIScene');
    ensureHud(this);
    this.closeAllUIPanels();

    this.createBackground();
    this.createBackButton();
    this.createDetectiveSection();
    this.createChoiceButtons();

    const detectiveName = gameState.playerName || 'Detective';
    this.fullIntroText =
      `${detectiveName}, the agency has reviewed your last case.\n\n` +
      `There is always another trail, another thief, and another artifact at risk.\n\n` +
      `Are you ready to accept a new mission?`;

    this.typeText(this.dialogueText, this.fullIntroText, 24);
    this.registerKeyboardShortcuts();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.typingEvent) {
        this.typingEvent.remove(false);
        this.typingEvent = null;
      }

      if (this.input?.keyboard) {
        if (this.handleEnterKey) {
          this.input.keyboard.off('keydown-ENTER', this.handleEnterKey, this);
        }

        if (this.handleEscapeKey) {
          this.input.keyboard.off('keydown-ESC', this.handleEscapeKey, this);
        }
      }

      this.handleEnterKey = null;
      this.handleEscapeKey = null;
    });
  }

  createBackground() {
    if (this.textures.exists('background2')) {
      this.add
        .image(this.scale.width / 2, this.scale.height / 2, 'background2')
        .setDisplaySize(this.scale.width, this.scale.height);
    } else {
      this.cameras.main.setBackgroundColor('#000000');
    }
  }

  createBackButton() {
    this.backBtn = this.add
      .image(200, 70, 'back')
      .setInteractive({ useHandCursor: true })
      .setScale(0.5)
      .setDepth(30);

    this.addHoverEffect(this.backBtn, 0.5, 0.6);

    this.backBtn.on('pointerdown', () => {
      if (this.isStartingNewMission) return;
      this.closeAllUIPanels();
      this.scene.start('MenuScene');
    });
  }

  createDetectiveSection() {
    const dialogueBox = this.add.graphics();
    dialogueBox.fillStyle(0x000000, 0.72);
    dialogueBox.fillRoundedRect(90, 700, 1180, 260, 20);
    dialogueBox.lineStyle(4, 0xffff00, 1);
    dialogueBox.strokeRoundedRect(90, 700, 1180, 260, 20);

    this.dialogueText = this.add.text(140, 748, '', {
      fontFamily: 'PressStart2P',
      fontSize: '24px',
      color: '#ffffff',
      wordWrap: { width: 1040 },
      lineSpacing: 14
    });
  }

  createChoiceButtons() {
    this.yesBtn = this.add
      .rectangle(560, 620, 260, 80, 0x2e6b3a, 1)
      .setStrokeStyle(4, 0xffffff, 1)
      .setInteractive({ useHandCursor: true });

    this.yesText = this.add
      .text(560, 620, 'YES', {
        fontFamily: 'PressStart2P',
        fontSize: '24px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.noBtn = this.add
      .rectangle(820, 620, 260, 80, 0x7a2f2f, 1)
      .setStrokeStyle(4, 0xffffff, 1)
      .setInteractive({ useHandCursor: true });

    this.noText = this.add
      .text(820, 620, 'NO', {
        fontFamily: 'PressStart2P',
        fontSize: '24px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.yesBtn.on('pointerover', () => {
      if (!this.isStartingNewMission) {
        this.yesBtn.setFillStyle(0x3d8a4c, 1);
      }
    });

    this.yesBtn.on('pointerout', () => {
      if (!this.isStartingNewMission) {
        this.yesBtn.setFillStyle(0x2e6b3a, 1);
      }
    });

    this.noBtn.on('pointerover', () => {
      if (!this.isStartingNewMission) {
        this.noBtn.setFillStyle(0x9a3e3e, 1);
      }
    });

    this.noBtn.on('pointerout', () => {
      if (!this.isStartingNewMission) {
        this.noBtn.setFillStyle(0x7a2f2f, 1);
      }
    });

    this.yesBtn.on('pointerdown', async () => {
      await this.startNewMission();
    });

    this.noBtn.on('pointerdown', () => {
      if (this.isStartingNewMission) return;
      this.closeAllUIPanels();
      this.scene.start('MenuScene');
    });
  }

  registerKeyboardShortcuts() {
    if (!this.input?.keyboard) return;

    this.handleEnterKey = async () => {
      await this.startNewMission();
    };

    this.handleEscapeKey = () => {
      if (this.isStartingNewMission) return;
      this.closeAllUIPanels();
      this.scene.start('MenuScene');
    };

    this.input.keyboard.on('keydown-ENTER', this.handleEnterKey, this);
    this.input.keyboard.on('keydown-ESC', this.handleEscapeKey, this);
  }

  async startNewMission() {
    if (this.isStartingNewMission) return;

    const suspectsData = this.cache.json.get('suspects') || [];
    const missionsData = this.cache.json.get('missions') || [];
    const locationsData = this.cache.json.get('locations') || [];

    this.isStartingNewMission = true;
    this.setButtonsEnabled(false);

    if (this.typingEvent) {
      this.typingEvent.remove(false);
      this.typingEvent = null;
    }

    if (this.dialogueText) {
      this.dialogueText.setText('Preparing a new mission file...');
    }

    try {
      await setupNewGame(suspectsData, missionsData, locationsData);
      this.scene.start('OfficeScene');
    } catch (error) {
      console.error('Failed to start a new mission:', error);

      this.isStartingNewMission = false;
      this.setButtonsEnabled(true);

      if (this.dialogueText) {
        this.dialogueText.setText('The agency could not prepare a new mission.');
      }
    }
  }

  setButtonsEnabled(enabled) {
    if (enabled) {
      this.yesBtn?.setInteractive({ useHandCursor: true });
      this.noBtn?.setInteractive({ useHandCursor: true });

      this.yesBtn?.setFillStyle(0x2e6b3a, 1);
      this.noBtn?.setFillStyle(0x7a2f2f, 1);

      this.yesBtn?.setAlpha(1);
      this.noBtn?.setAlpha(1);
      this.yesText?.setAlpha(1);
      this.noText?.setAlpha(1);

      if (this.backBtn) {
        this.backBtn.setInteractive({ useHandCursor: true });
        this.backBtn.setAlpha(1);
      }

      return;
    }

    this.yesBtn?.disableInteractive();
    this.noBtn?.disableInteractive();

    this.yesBtn?.setFillStyle(0x35533b, 1);
    this.noBtn?.setFillStyle(0x5a3a3a, 1);

    this.yesBtn?.setAlpha(0.75);
    this.noBtn?.setAlpha(0.75);
    this.yesText?.setAlpha(0.75);
    this.noText?.setAlpha(0.75);

    if (this.backBtn) {
      this.backBtn.disableInteractive();
      this.backBtn.setAlpha(0.6);
    }
  }

  closeAllUIPanels() {
    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }
  }

  typeText(target, text, speed = 20) {
    if (!target || typeof text !== 'string') return;

    if (this.typingEvent) {
      this.typingEvent.remove(false);
      this.typingEvent = null;
    }

    target.setText('');
    let index = 0;

    this.typingEvent = this.time.addEvent({
      delay: speed,
      repeat: text.length - 1,
      callback: () => {
        target.setText(text.slice(0, index + 1));
        index += 1;

        if (index >= text.length) {
          this.typingEvent = null;
        }
      }
    });
  }

  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
    button.on('pointerover', () => {
      if (!this.isStartingNewMission) {
        button.setScale(hoverScale);
      }
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }
}