import { EnterScene as OriginalEnterScene } from './EnterScene.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import {
  currentChase,
  restoreLocalChaseCheckpoint,
  terminalData
} from '../systems/chasePersistence.js';
import { courtResumeTarget } from '../systems/courtLogic.js';
import { validCourt } from '../systems/courtRapport.js';
import { EnterRewardsPanel } from '../ui/EnterRewardsPanel.js';

const sameId = (a, b) =>
  a != null && b != null && String(a) === String(b);

export class EnterScene extends OriginalEnterScene {
  async create() {
    this.chaseLoadSource = null;
    this.entrySettingsOpening = false;
    this.entrySettingsBinding = null;
    this.entrySettingsRoot = null;
    this.entrySettingsHit = null;
    this.entrySettingsResize = null;
    this.entrySettingsDraw = null;
    await super.create();
  }

  _buildBackground(width, height) {
    super._buildBackground(width, height);
    this.enterRewardsPanel?.destroy();
    this.enterRewardsPanel = new EnterRewardsPanel(this);
    this.enterRewardsPanel.setUser(this.currentUser);
    this.buildEntrySettingsButton();
  }

  isBusy() {
    return super.isBusy() || Boolean(this.entrySettingsOpening || this.entrySettingsBinding);
  }

  updateEntryButtons() {
    super.updateEntryButtons();
    this.enterRewardsPanel?.setUser(this.currentUser);
    this.updateEntrySettingsButton();
  }

  canOpenEntrySettings() {
    return this.isCurrentRun() &&
      !this.entrySettingsOpening && !this.entrySettingsBinding &&
      !this.isLoadingSave && !this.isEnteringGame && !this.isHandlingAuth &&
      !this.modalElement && !this.saveSlotPicker;
  }

  buildEntrySettingsButton() {
    this.destroyEntrySettingsButton();
    const root = this.add.container(0, 0).setDepth(100).setScrollFactor(0);
    const art = this.add.graphics();
    const caption = this.add.text(32, 74, 'SETTINGS', {
      fontFamily: 'PressStart2P', fontSize: '8px', color: '#e7d7b5'
    }).setOrigin(0.5, 0).setScrollFactor(0);
    const draw = (hover = false) => {
      art.clear();
      art.fillStyle(0x000000, 0.35);
      art.fillRoundedRect(3, 5, 64, 64, 7);
      art.fillStyle(hover ? 0x355249 : 0x1b302d, 0.97);
      art.fillRoundedRect(0, 0, 64, 64, 7);
      art.lineStyle(2, hover ? 0xffdfa0 : 0xb99a57, 1);
      art.strokeRoundedRect(0, 0, 64, 64, 7);
      const points = [];
      for (let i = 0; i < 40; i++) {
        const angle = i * Math.PI * 2 / 40 - Math.PI / 2;
        const radius = i % 4 < 2 ? 20 : 16;
        points.push({ x: 32 + Math.cos(angle) * radius, y: 32 + Math.sin(angle) * radius });
      }
      art.fillStyle(hover ? 0xffdfa0 : 0xd9bd7d, 1);
      art.fillPoints(points, true);
      art.fillStyle(hover ? 0x355249 : 0x1b302d, 1);
      art.fillCircle(32, 32, 8);
      art.lineStyle(1, 0xb99a57, 1);
      art.strokeCircle(32, 32, 8);
    };
    draw(false);
    const hit = this.add.rectangle(0, 0, 64, 64, 0x000000, 0)
      .setOrigin(0).setInteractive({ useHandCursor: true });
    root.add([art, caption, hit]);
    hit.on('pointerover', () => { if (this.canOpenEntrySettings()) draw(true); });
    hit.on('pointerout', () => draw(false));
    hit.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation();
      if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
      if (this.canOpenEntrySettings()) void this.openEntrySettings();
    });
    const layout = () => {
      if (!root.active) return;
      const { width, height } = this.scale;
      const scale = Math.max(0.1, Math.min(1, width / 640, height / 480));
      const margin = Math.max(12, Math.min(28, width * 0.025));
      root.setScale(scale).setPosition(width - margin - 64 * scale, margin);
    };
    this.entrySettingsRoot = root;
    this.entrySettingsHit = hit;
    this.entrySettingsDraw = draw;
    this.entrySettingsResize = layout;
    this.scale.on('resize', layout);
    layout();
    this.updateEntrySettingsButton();
  }

  updateEntrySettingsButton() {
    if (!this.entrySettingsRoot?.active) return;
    const enabled = this.canOpenEntrySettings();
    this.entrySettingsRoot.setAlpha(enabled ? 1 : 0.5);
    if (this.entrySettingsHit?.input) this.entrySettingsHit.input.enabled = enabled;
    if (!enabled) this.entrySettingsDraw?.(false);
  }

  async openEntrySettings() {
    if (!this.canOpenEntrySettings()) return;
    const runId = this.enterRunId;
    const previousInputEnabled = this.input.enabled;
    this.entrySettingsOpening = true;
    this.input.enabled = false;
    this.updateEntryButtons();
    let child = null;
    let onShutdown = null;
    try {
      if (!this.game.scene.keys.SettingsScene) {
        if (!this.game.sceneLoader?.ensure) throw new Error('SceneLoader is unavailable.');
        await this.game.sceneLoader.ensure('SettingsScene');
      }
      if (!this.isCurrentRun(runId)) return;
      child = this.game.scene.keys.SettingsScene;
      if (!child) throw new Error('SettingsScene is unavailable.');
      if (child.sys.isActive() || child.sys.isSleeping() || child.sys.isPaused()) {
        throw new Error('Settings are already open.');
      }
      onShutdown = () => {
        if (this.entrySettingsBinding?.onShutdown !== onShutdown) return;
        this.entrySettingsBinding = null;
        this.entrySettingsOpening = false;
        if (!this.isCurrentRun(runId)) return;
        this.input.enabled = previousInputEnabled;
        audioManager.init(this);
        this.updateEntryButtons();
      };
      this.entrySettingsBinding = { child, onShutdown };
      child.events.once('shutdown', onShutdown);
      audioManager.playSfx('buttonclick');
      this.scene.launch('SettingsScene', { openedFromEntry: true });
      this.scene.bringToTop('SettingsScene');
    } catch (error) {
      if (child && onShutdown) child.events.off('shutdown', onShutdown);
      if (this.isCurrentRun(runId)) {
        this.entrySettingsBinding = null;
        this.input.enabled = previousInputEnabled;
        console.error('[EnterScene] Could not open settings:', error);
        this._showNotice('Unable to open settings. Please try again.', 4000);
      }
    } finally {
      if (this.isCurrentRun(runId)) {
        this.entrySettingsOpening = false;
        this.updateEntryButtons();
      }
    }
  }

  destroyEntrySettingsButton() {
    if (this.entrySettingsResize) this.scale.off('resize', this.entrySettingsResize);
    this.entrySettingsResize = null;
    this.entrySettingsDraw = null;
    this.entrySettingsHit = null;
    this.entrySettingsRoot?.destroy(true);
    this.entrySettingsRoot = null;
  }

  cleanupScene() {
    const binding = this.entrySettingsBinding;
    this.entrySettingsBinding = null;
    this.entrySettingsOpening = false;
    if (binding) {
      binding.child.events.off('shutdown', binding.onShutdown);
      this.game.scene.stop('SettingsScene');
    }
    this.destroyEntrySettingsButton();
    this.enterRewardsPanel?.destroy();
    this.enterRewardsPanel = null;
    super.cleanupScene();
  }

  async loadSelectedSlot(slotKey, authMode, source, root) {
    this.chaseLoadSource = source;
    return super.loadSelectedSlot(slotKey, authMode, source, root);
  }

  getCourtResumeTarget() {
    const record = gameState.courtState;
    return validCourt(record, gameState) ? courtResumeTarget(record) : null;
  }

  hasCourtForCurrentCase() {
    const record = gameState.courtState;
    return Boolean(record && sameId(record.caseId, gameState.currentCaseId) &&
      record.campaignId === gameState._createdAt);
  }

  async goto(key, data = {}) {
    if (!data.fromSave) return super.goto(key, data);
    let courtTarget = this.getCourtResumeTarget();
    if (courtTarget) return super.goto(courtTarget.key, { ...data, ...courtTarget.data });
    if (this.hasCourtForCurrentCase()) {
      throw new Error('The saved trial is inconsistent. It has not been restarted or overwritten.');
    }
    if (this.chaseLoadSource === 'local') restoreLocalChaseCheckpoint(data.saveSlotKey);
    courtTarget = this.getCourtResumeTarget();
    if (courtTarget) return super.goto(courtTarget.key, { ...data, ...courtTarget.data });
    if (this.hasCourtForCurrentCase()) {
      throw new Error('The checkpoint contains an inconsistent trial. Your checkpoint has not been deleted.');
    }
    const record = currentChase();
    if (!record) return super.goto(key, data);
    if (record.phase === 'escaped' || record.terminalScene === 'GameOverScene') {
      return super.goto('GameOverScene', { ...data, ...terminalData(record) });
    }
    if (record.terminalScene === 'CourtScene') {
      return super.goto('CourtScene', { ...data, caseId: record.caseId, suspectId: record.suspectId });
    }
    if (record.phase === 'settled' && record.terminalScene) {
      return super.goto(record.terminalScene, { ...data, caseId: record.caseId, suspectId: record.suspectId });
    }
    return super.goto('ChaseScene', {
      ...data, caseId: record.caseId, suspectId: record.suspectId,
      sourceKey: null, resumeChase: true
    });
  }
}
