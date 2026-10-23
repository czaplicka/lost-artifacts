import { gameState } from '../GameData.js';
import { setupNewGame } from '../gameSetup.js';
import { BaseScene } from './BaseScene.js';

export class AgainScene extends BaseScene {
  constructor() {
    super({ key: 'AgainScene' });

    this.dialogueText = null;
    this.fullIntroText = '';
    this.typingEvent = null;

    this.isStartingNewMission = false;
    this.isLeaving = false;

    this.backBtn = null;
    this.yesBtn = null;
    this.noBtn = null;
    this.yesText = null;
    this.noText = null;
  }

  init() {
    this.dialogueText = null;
    this.fullIntroText = '';
    this.typingEvent = null;

    this.isStartingNewMission = false;
    this.isLeaving = false;

    this.backBtn = null;
    this.yesBtn = null;
    this.noBtn = null;
    this.yesText = null;
    this.noText = null;
  }

  create() {
    super.create();

    this.hideGameplayInterface();

    this.createBackground();
    this.createBackButton();
    this.createDetectiveSection();
    this.createChoiceButtons();

    const detectiveName =
      gameState.playerName || 'Detective';

    this.fullIntroText =
      `${detectiveName}, the agency has reviewed your last case.\n\n` +
      'There is always another trail, another thief, ' +
      'and another artifact at risk.\n\n' +
      'Are you ready to accept a new mission?';

    this.typeText(
      this.dialogueText,
      this.fullIntroText,
      24
    );

    this.registerKeyboardShortcuts();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        this.stopTyping();

        this.dialogueText = null;
        this.backBtn = null;
        this.yesBtn = null;
        this.noBtn = null;
        this.yesText = null;
        this.noText = null;
      }
    );
  }

  hideGameplayInterface() {
    const hud =
      this.scene.manager.keys.PlayerHudScene;

    hud?.closeAllUIPanels?.();
    hud?.hideHud?.();

    const newsHud =
      this.scene.manager.keys.NewsHud;

    newsHud?.events?.emit(
      'setButtonsVisible',
      false
    );

    newsHud?.events?.emit(
      'setNewspaperVisible',
      false
    );

    newsHud?.events?.emit(
      'setTvVisible',
      false
    );

    const interfaceScenes = [
      'NewsHud',
      'PlayerHudScene',
      'UIScene'
    ];

    for (const sceneKey of interfaceScenes) {
      if (!this.hasScene(sceneKey)) continue;

      this.scene.setVisible(false, sceneKey);
      this.stopSceneIfActive(sceneKey);
    }
  }

  createBackground() {
    if (this.textures.exists('background2')) {
      this.add
        .image(
          this.scale.width / 2,
          this.scale.height / 2,
          'background2'
        )
        .setDisplaySize(
          this.scale.width,
          this.scale.height
        );
    } else {
      this.cameras.main.setBackgroundColor(
        '#000000'
      );
    }
  }

  createBackButton() {
    this.backBtn = this.add
      .image(200, 70, 'back')
      .setInteractive({
        useHandCursor: true
      })
      .setScale(0.5)
      .setDepth(30);

    this.addHoverEffect(
      this.backBtn,
      0.5,
      0.6
    );

    this.backBtn.on(
      'pointerdown',
      () => {
        void this.returnToMenu();
      }
    );
  }

  createDetectiveSection() {
    const dialogueBox = this.add.graphics();

    dialogueBox.fillStyle(
      0x000000,
      0.72
    );

    dialogueBox.fillRoundedRect(
      90,
      700,
      1180,
      300,
      20
    );

    dialogueBox.lineStyle(
      4,
      0xffff00,
      1
    );

    dialogueBox.strokeRoundedRect(
      90,
      700,
      1180,
      300,
      20
    );

    this.dialogueText = this.add.text(
      140,
      740,
      '',
      {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#ffffff',
        wordWrap: {
          width: 1080
        },
        lineSpacing: 8
      }
    );
  }

  createChoiceButtons() {
    this.yesBtn = this.add
      .rectangle(
        540,
        620,
        240,
        80,
        0x2e6b3a,
        1
      )
      .setStrokeStyle(
        4,
        0xffffff,
        1
      )
      .setInteractive({
        useHandCursor: true
      });

    this.yesText = this.add
      .text(
        540,
        620,
        'YES',
        {
          fontFamily: 'PressStart2P',
          fontSize: '24px',
          color: '#ffffff'
        }
      )
      .setOrigin(0.5);

    this.noBtn = this.add
      .rectangle(
        820,
        620,
        240,
        80,
        0x7a2f2f,
        1
      )
      .setStrokeStyle(
        4,
        0xffffff,
        1
      )
      .setInteractive({
        useHandCursor: true
      });

    this.noText = this.add
      .text(
        820,
        620,
        'NO',
        {
          fontFamily: 'PressStart2P',
          fontSize: '24px',
          color: '#ffffff'
        }
      )
      .setOrigin(0.5);

    this.yesBtn.on('pointerover', () => {
      if (this.isBusy()) return;

      this.yesBtn.setFillStyle(
        0x3d8a4c,
        1
      );
    });

    this.yesBtn.on('pointerout', () => {
      if (this.isBusy()) return;

      this.yesBtn.setFillStyle(
        0x2e6b3a,
        1
      );
    });

    this.noBtn.on('pointerover', () => {
      if (this.isBusy()) return;

      this.noBtn.setFillStyle(
        0x9a3e3e,
        1
      );
    });

    this.noBtn.on('pointerout', () => {
      if (this.isBusy()) return;

      this.noBtn.setFillStyle(
        0x7a2f2f,
        1
      );
    });

    this.yesBtn.on(
      'pointerdown',
      () => {
        void this.startNewMission();
      }
    );

    this.noBtn.on(
      'pointerdown',
      () => {
        void this.returnToMenu();
      }
    );
  }

  registerKeyboardShortcuts() {
    if (!this.input?.keyboard) return;

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ENTER',
      (event) => {
        if (event.repeat) return;

        void this.startNewMission();
      }
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ESC',
      (event) => {
        if (event.repeat) return;

        void this.returnToMenu();
      }
    );
  }

  isBusy() {
    return (
      this.isStartingNewMission ||
      this.isLeaving
    );
  }

  async startNewMission() {
    if (this.isBusy()) return;

    const suspectsData =
      this.cache.json.get('suspects') || [];

    const missionsData =
      this.cache.json.get('missions') || [];

    const locationsData =
      this.cache.json.get('locations') || [];

    this.isStartingNewMission = true;
    this.setButtonsEnabled(false);
    this.stopTyping();

    this.dialogueText?.setText(
      'Preparing a new mission file...'
    );

    try {
      await setupNewGame(
        suspectsData,
        missionsData,
        locationsData
      );

      if (this._cleanupDone) return;

      const opened = await this.goto(
        'OfficeScene'
      );

      if (!opened && !this._cleanupDone) {
        throw new Error(
          'Could not open OfficeScene.'
        );
      }
    } catch (error) {
      console.error(
        '[AgainScene] Failed to start a new mission:',
        error
      );

      if (this._cleanupDone) return;

      this.isStartingNewMission = false;
      this.setButtonsEnabled(true);

      this.dialogueText?.setText(
        'The agency could not open the new mission.\n\n' +
        'Please try again or return to the main menu.'
      );
    }
  }

  async returnToMenu() {
    if (this.isBusy()) return;

    this.isLeaving = true;
    this.setButtonsEnabled(false);
    this.stopTyping();

    const opened = await this.goto(
      'MenuScene'
    );

    if (!opened && !this._cleanupDone) {
      this.isLeaving = false;
      this.setButtonsEnabled(true);

      this.dialogueText?.setText(
        'The main menu could not be opened.\n\n' +
        'Please try again.'
      );

      console.error(
        '[AgainScene] Could not open MenuScene.'
      );
    }
  }

  setButtonsEnabled(enabled) {
    const buttons = [
      this.yesBtn,
      this.noBtn,
      this.backBtn
    ];

    for (const button of buttons) {
      if (!button) continue;

      if (enabled) {
        button.setInteractive({
          useHandCursor: true
        });
      } else {
        button.disableInteractive();
      }

      button.setAlpha(
        enabled ? 1 : 0.65
      );
    }

    this.yesBtn?.setFillStyle(
      enabled ? 0x2e6b3a : 0x35533b,
      1
    );

    this.noBtn?.setFillStyle(
      enabled ? 0x7a2f2f : 0x5a3a3a,
      1
    );

    this.yesText?.setAlpha(
      enabled ? 1 : 0.65
    );

    this.noText?.setAlpha(
      enabled ? 1 : 0.65
    );

    this.backBtn?.setScale(0.5);
  }

  stopTyping() {
    if (!this.typingEvent) return;

    this.typingEvent.remove(false);
    this.typingEvent = null;
  }

  typeText(target, text, speed = 20) {
    if (
      !target ||
      typeof text !== 'string'
    ) {
      return;
    }

    this.stopTyping();
    target.setText('');

    if (!text.length) return;

    let index = 0;

    this.typingEvent = this.time.addEvent({
      delay: speed,
      repeat: text.length - 1,

      callback: () => {
        index += 1;

        target.setText(
          text.slice(0, index)
        );

        if (index >= text.length) {
          this.typingEvent = null;
        }
      }
    });
  }

  addHoverEffect(
    button,
    baseScale = 0.8,
    hoverScale = 0.9
  ) {
    button.on('pointerover', () => {
      if (this.isBusy()) return;

      button.setScale(hoverScale);
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }
}