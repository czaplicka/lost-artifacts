import { gameState } from '../GameData.js';
import { setupNewGame, advanceToNextCase } from '../gameSetup.js';
import { saveGameState } from '../gameStatePersistence.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { BaseScene } from './BaseScene.js';
import { canRequestNextMission, isSuccessfulCase, moveStateToHeadquarters } from '../archiveReportService.js';

export class AgainScene extends BaseScene {
  constructor() { super({ key: 'AgainScene' }); }

  init(data = {}) {
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
    this.afterReport = data.afterReport === true || isSuccessfulCase();
    this.missionPrepared = false;
  }

  create() {
    super.create();
    this.hideGameplayInterface();
    this.createBackground();
    this.createBackButton();
    this.createDetectiveSection();
    this.createChoiceButtons();
    if (this.afterReport && !canRequestNextMission()) {
      this.yesBtn.disableInteractive().setAlpha(0.45);
      this.yesText.setAlpha(0.45);
      this.dialogueText.setText('Please file your mission report with Frank Drebin first.\n\nSelect NO to return to the office.');
    } else {
      const name = gameState.playerName || 'Detective';
      this.fullIntroText = `${name}, the agency has reviewed your last case.\n\n` +
        'There is always another trail, another thief, and another artifact at risk.\n\n' +
        (this.afterReport
          ? 'Are you ready to accept a new mission?\nChoose NO to return to the office.'
          : 'Are you ready to accept a new mission?');
      this.typeText(this.dialogueText, this.fullIntroText, 24);
    }
    this.registerKeyboardShortcuts();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopTyping();
      this.dialogueText = null;
      this.backBtn = this.yesBtn = this.noBtn = this.yesText = this.noText = null;
    });
  }

  hideGameplayInterface() {
    const hud = this.scene.manager.keys.PlayerHudScene;
    hud?.closeAllUIPanels?.();
    hud?.hideHud?.();
    const news = this.scene.manager.keys.NewsHud;
    news?.events?.emit('setButtonsVisible', false);
    news?.events?.emit('setNewspaperVisible', false);
    news?.events?.emit('setTvVisible', false);
    for (const key of ['NewsHud', 'PlayerHudScene', 'UIScene']) {
      if (!this.hasScene(key)) continue;
      this.scene.setVisible(false, key);
      this.stopSceneIfActive(key);
    }
  }

  createBackground() {
    if (this.textures.exists('background2')) {
      this.add.image(this.scale.width / 2, this.scale.height / 2, 'background2')
        .setDisplaySize(this.scale.width, this.scale.height);
    } else this.cameras.main.setBackgroundColor('#000000');
  }

  createBackButton() {
    if (this.textures.exists('back')) {
      this.backBtn = this.add.image(200, 70, 'back').setScale(0.5)
        .setDepth(30).setInteractive({ useHandCursor: true });
      this.addHoverEffect(this.backBtn, 0.5, 0.6);
    } else {
      this.backBtn = this.add.text(24, 24, this.afterReport ? '< OFFICE' : '< MENU', {
        fontFamily: 'SpecialElite', fontSize: '24px', color: '#ffffff'
      }).setDepth(30).setInteractive({ useHandCursor: true });
    }
    this.backBtn.on('pointerdown', () => { void this.returnToMenu(); });
  }

  createDetectiveSection() {
    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.72);
    box.fillRoundedRect(90, 700, 1180, 300, 20);
    box.lineStyle(4, 0xffff00, 1);
    box.strokeRoundedRect(90, 700, 1180, 300, 20);
    this.dialogueText = this.add.text(140, 740, '', {
      fontFamily: 'SpecialElite', fontSize: '28px', color: '#ffffff',
      wordWrap: { width: 1080 }, lineSpacing: 8
    });
  }

  createChoiceButtons() {
    const button = (x, label, color, hover, action) => {
      const rect = this.add.rectangle(x, 620, 240, 80, color, 1)
        .setStrokeStyle(4, 0xffffff, 1).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, 620, label, {
        fontFamily: 'PressStart2P', fontSize: '24px', color: '#ffffff'
      }).setOrigin(0.5);
      rect.on('pointerover', () => { if (!this.isBusy()) rect.setFillStyle(hover, 1); });
      rect.on('pointerout', () => { if (!this.isBusy()) rect.setFillStyle(color, 1); });
      rect.on('pointerdown', () => { void action(); });
      return [rect, text];
    };
    [this.yesBtn, this.yesText] = button(540, 'YES', 0x2e6b3a, 0x3d8a4c, () => this.startNewMission());
    [this.noBtn, this.noText] = button(820, 'NO', 0x7a2f2f, 0x9a3e3e, () => this.returnToMenu());
  }

  registerKeyboardShortcuts() {
    if (!this.input?.keyboard) return;
    this.trackInputEvent(this.input.keyboard, 'keydown-ENTER', event => {
      if (!event.repeat) void this.startNewMission();
    });
    this.trackInputEvent(this.input.keyboard, 'keydown-ESC', event => {
      if (!event.repeat) void this.returnToMenu();
    });
  }

  isBusy() { return this.isStartingNewMission || this.isLeaving; }

  async startNewMission() {
    if (this.isBusy()) return;
    if (this.afterReport && !this.missionPrepared && !canRequestNextMission()) {
      this.stopTyping();
      this.dialogueText?.setText('File your report with Frank Drebin before requesting another mission.');
      return;
    }
    const suspects = this.cache.json.get('suspects') || [];
    const missions = this.cache.json.get('missions') || [];
    const locations = this.cache.json.get('locations') || [];
    this.isStartingNewMission = true;
    this.setButtonsEnabled(false);
    this.stopTyping();
    this.dialogueText?.setText('Preparing a new mission file...');
    let backup = null;
    try {
      if (!this.missionPrepared) {
        backup = {
          state: gameState.getState(), director: gameState.caseDirector,
          story: MainStoryManager.serialize(), inventory: inventoryManager.exportState()
        };
        if (this.afterReport) {
          // Continue the campaign; do not clear its story, inventory or statistics.
          await advanceToNextCase(suspects, missions, locations);
          gameState.isGameActive = true;
          gameState.scoreSaved = false;
          moveStateToHeadquarters(locations);
        } else {
          // Preserve the pre-existing retry path after a failed mission.
          await setupNewGame(suspects, missions, locations);
        }
        this.missionPrepared = true;
        saveGameState();
      }
      if (this._cleanupDone) return;
      const opened = await this.goto('OfficeScene', { gameState });
      if (opened === false && !this._cleanupDone) throw new Error('Could not open OfficeScene.');
    } catch (error) {
      console.error('[AgainScene] Failed to start a new mission:', error);
      if (!this.missionPrepared && backup) {
        try {
          if (!gameState.importFromSave(backup.state)) throw new Error('State rollback rejected.');
          gameState.caseDirector = backup.director;
          MainStoryManager.deserialize(backup.story);
          inventoryManager.importState(backup.inventory);
          saveGameState();
        } catch (rollbackError) { console.error('[AgainScene] Rollback failed:', rollbackError); }
      }
      if (this._cleanupDone) return;
      this.isStartingNewMission = false;
      this.setButtonsEnabled(true);
      this.dialogueText?.setText(this.missionPrepared
        ? 'The mission is ready, but the office could not be opened.\n\nSelect YES to retry opening it.'
        : 'The agency could not open the new mission.\n\nPlease try again or select NO to go back.');
    }
  }

  async returnToMenu() {
    if (this.isBusy()) return;
    this.isLeaving = true;
    this.setButtonsEnabled(false);
    this.stopTyping();
    const sceneKey = this.afterReport || this.missionPrepared ? 'OfficeScene' : 'MenuScene';
    try {
      const opened = await this.goto(sceneKey, { gameState });
      if (opened === false && !this._cleanupDone) throw new Error(`Could not open ${sceneKey}.`);
    } catch (error) {
      console.error('[AgainScene] Navigation failed:', error);
      if (this._cleanupDone) return;
      this.isLeaving = false;
      this.setButtonsEnabled(true);
      this.dialogueText?.setText('This screen could not be opened. Please try again.');
    }
  }

  setButtonsEnabled(enabled) {
    for (const button of [this.yesBtn, this.noBtn, this.backBtn]) {
      if (!button) continue;
      if (enabled) button.setInteractive({ useHandCursor: true });
      else button.disableInteractive();
      button.setAlpha(enabled ? 1 : 0.65);
    }
    if (enabled && this.afterReport && !this.missionPrepared && !canRequestNextMission()) {
      this.yesBtn?.disableInteractive().setAlpha(0.45);
    }
    this.yesBtn?.setFillStyle(enabled ? 0x2e6b3a : 0x35533b, 1);
    this.noBtn?.setFillStyle(enabled ? 0x7a2f2f : 0x5a3a3a, 1);
    this.yesText?.setAlpha(enabled ? 1 : 0.65);
    this.noText?.setAlpha(enabled ? 1 : 0.65);
  }

  stopTyping() {
    this.typingEvent?.remove(false);
    this.typingEvent = null;
  }

  typeText(target, text, speed = 20) {
    if (!target || typeof text !== 'string') return;
    this.stopTyping();
    target.setText('');
    if (!text.length) return;
    let index = 0;
    this.typingEvent = this.time.addEvent({ delay: speed, repeat: text.length - 1, callback: () => {
      target.setText(text.slice(0, ++index));
      if (index >= text.length) this.typingEvent = null;
    } });
  }

  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
    button.on('pointerover', () => { if (!this.isBusy()) button.setScale(hoverScale); });
    button.on('pointerout', () => { if (!this.isBusy()) button.setScale(baseScale); });
  }
}
