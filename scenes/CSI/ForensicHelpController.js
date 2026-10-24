import { gameState } from '../../GameData.js';
import { hintManager } from '../../managers/HintManager.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';
import { EventBus } from '../../EventBus.js';
import { saveGameState } from '../../gameStatePersistence.js';

const COSTS = {
  cut_corners: { energy: 5, minutes: 10 },
  squad_help: { energy: 10, minutes: 30 }
};

export class ForensicHelpController {
  constructor(scene) {
    this.scene = scene;
    this.modal = null;
    this.body = null;
    this.lock = null;
    this.busy = false;
    this.destroyed = false;
    this.created = false;
    this.marks = [];
    this.markEvent = null;
    this.buttons = [];
    this.howButton = null;
    this.hintButton = null;
    this.boundRefresh = () => this.refresh();
    this.boundUpdate = () => this.update();
    this.boundDestroy = () => this.destroy();
    this.boundRecovery = null;
    this.lastKey = null;
  }

  create() {
    if (this.destroyed || this.created) return;
    this.created = true;
    const s = this.scene;
    const y = s.scale.height - 36;
    this.howButton = this.makeButton(s.scale.width / 2 - 120, y,
      'HOW TO PLAY', () => this.open(true));
    this.hintButton = this.makeButton(s.scale.width / 2 + 120, y,
      'HINT', () => this.open(false));
    this.buttons.push(this.howButton, this.hintButton);
    EventBus.on('hints:changed', this.boundRefresh);
    s.events.on('update', this.boundUpdate);
    s.events.once('shutdown', this.boundDestroy);
    s.events.once('destroy', this.boundDestroy);
    this.refresh();
  }

  makeButton(x, y, label, callback, parent = null, enabled = true) {
    const button = this.scene.add.text(x, y, label, {
      fontFamily: 'PressStart2P, Arial', fontSize: '10px',
      color: enabled ? '#fff0b5' : '#8e887a',
      backgroundColor: enabled ? '#3c4b38' : '#292923',
      padding: { left: 12, right: 12, top: 12, bottom: 12 },
      align: 'center', lineSpacing: 6
    }).setOrigin(0.5).setDepth(2000).setInteractive({ useHandCursor: enabled });
    button.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
      if (enabled && !this.busy && !this.destroyed) callback();
    });
    parent?.add(button);
    return button;
  }

  definition() {
    return this.scene.getForensicHelp?.() || null;
  }

  key(definition) {
    const s = this.scene;
    return JSON.stringify([
      s.caseKey || gameState.currentCaseId || gameState.currentMission?.id ||
        gameState.currentMission?.missionId || null,
      s.scene.key, s.stationId, s.evidenceConfig?.id || s.evidenceType,
      definition.id
    ]);
  }

  receipt(definition) {
    return gameState.forensicHintReceipts?.[this.key(definition)] || null;
  }

  refresh() {
    if (this.destroyed || !this.hintButton?.active) return;
    const definition = this.definition();
    this.hintButton.setText(definition && this.receipt(definition)
      ? 'REVIEW HINT' : `HINT (${hintManager.getAvailableCount()})`);
  }

  update() {
    if (this.destroyed) return;
    const available = !this.scene.resolved && !this.scene.finished;
    for (const button of this.buttons) {
      if (button.active) button.setVisible(available);
    }
    if (!available) return;
    const definition = this.definition();
    const key = definition ? this.key(definition) : null;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.clearMarks();
      this.refresh();
    }
  }

  pause() {
    if (this.destroyed || this.lock) return;
    const s = this.scene;
    const objects = [];
    const visit = object => {
      if (object.input) {
        objects.push({ object, enabled: object.input.enabled });
        object.input.enabled = false;
      }
      if (Array.isArray(object.list)) object.list.forEach(visit);
    };
    s.children.list.forEach(visit);
    const tweens = s.tweens.getTweens().filter(tween => !tween.isPaused());
    this.lock = {
      objects, tweens, clockPaused: s.time.paused,
      keyboardEnabled: s.input.keyboard?.enabled,
      topOnly: s.input.topOnly
    };
    s.time.paused = true;
    tweens.forEach(tween => tween.pause());
    if (s.input.keyboard) s.input.keyboard.enabled = false;
    s.input.setTopOnly(true);
  }

  restoreSceneSettings(lock) {
    if (!lock) return;
    const s = this.scene;
    // Restore configuration only; never resume game objects here.
    if (s.time) s.time.paused = lock.clockPaused;
    if (s.input) {
      s.input.setTopOnly(lock.topOnly);
      if (s.input.keyboard && lock.keyboardEnabled !== undefined) {
        s.input.keyboard.enabled = lock.keyboardEnabled;
      }
    }
  }

  resume() {
    if (this.destroyed) return;
    const lock = this.lock;
    this.lock = null;
    if (!lock) return;
    this.restoreSceneSettings(lock);
    for (const { object, enabled } of lock.objects) {
      if (object.active && object.input) object.input.enabled = enabled;
    }
    const activeTweens = new Set(this.scene.tweens.getTweens());
    for (const tween of lock.tweens) {
      if (activeTweens.has(tween)) tween.resume();
    }
  }

  panel(title, body) {
    const s = this.scene;
    const { width, height } = s.scale;
    const scale = Math.min(1, (width - 24) / 740, (height - 24) / 600);
    const root = s.add.container(width / 2, height / 2).setDepth(90000);
    this.modal = root;
    const shade = s.add.rectangle(0, 0, width / scale, height / scale, 0x000000, 0.88)
      .setInteractive();
    shade.on('pointerdown', (pointer, x, y, event) => event?.stopPropagation());
    const bg = s.add.rectangle(0, 0, 740, 600, 0x101c15, 1)
      .setStrokeStyle(2, 0xc8a75a);
    const heading = s.add.text(0, -250, title, {
      fontFamily: 'SpecialElite, Arial', fontSize: '30px', color: '#ffe8a3',
      align: 'center', wordWrap: { width: 670 }
    }).setOrigin(0.5);
    this.body = s.add.text(0, -145, body, {
      fontFamily: 'SpecialElite, Arial', fontSize: '22px', color: '#e1e9dd',
      align: 'center', lineSpacing: 8, wordWrap: { width: 660 }
    }).setOrigin(0.5);
    root.add([shade, bg, heading, this.body]);
    root.setScale(scale);
    return root;
  }

  open(instructions) {
    const s = this.scene;
    if (this.modal || this.busy || this.destroyed || s.resolved || s.finished) return;
    const energy = getEnergyManager();
    if (energy.isForcedSleepActive() || energy.isManualSleepActive()) {
      s.setDialogue('Please finish sleeping before consulting the equipment.');
      return;
    }
    const definition = this.definition();
    if (!definition) return;
    this.pause();
    const receipt = this.receipt(definition);
    if (instructions || receipt) {
      this.panel(instructions ? 'HOW TO PLAY — FREE' : 'PREVIOUSLY PURCHASED HINT',
        instructions ? definition.instructions : receipt.text);
      this.makeButton(0, 215, instructions ? 'BACK TO ANALYSIS' : 'SHOW AGAIN — FREE', () => {
        this.close();
        if (!instructions) this.showEffect(definition, receipt);
      }, this.modal);
      return;
    }
    this.panel('LAB ASSISTANCE',
      'One hint helps with this step only.\nIt does not finish the analysis.');
    this.makeButton(0, -10,
      `USE FREE HINT (${hintManager.getAvailableCount()})`,
      () => this.purchase('free_hint', definition), this.modal,
      hintManager.getAvailableCount() > 0);
    for (const [index, method] of ['cut_corners', 'squad_help'].entries()) {
      const cost = COSTS[method];
      const title = method === 'cut_corners'
        ? 'CUT CORNERS — skip the assistance checklist'
        : 'ASK LAB TECHNICIAN — documented consultation';
      this.makeButton(0, 75 + index * 85,
        `${title}\n${cost.energy} energy + ${cost.minutes} min`,
        () => this.purchase(method, definition), this.modal,
        energy.canAfford(cost.energy).ok);
    }
    this.makeButton(0, 250, 'KEEP WORKING', () => this.close(), this.modal);
  }

  purchase(method, definition) {
    if (this.busy || this.destroyed || this.receipt(definition)) return;
    this.busy = true;
    const s = this.scene;
    const energy = getEnergyManager();
    const cost = COSTS[method];
    const context = {
      caseId: s.caseKey || gameState.currentCaseId,
      sceneId: s.scene.key,
      itemId: `${s.evidenceConfig?.id || s.evidenceType}:${definition.id}`
    };
    let result;
    if (method === 'free_hint') {
      result = hintManager.useFreeHint(context);
    } else {
      if (!cost || !energy.canAfford(cost.energy).ok) {
        this.busy = false;
        this.body?.setText('Not enough energy. Close this window and rest first.');
        return;
      }
      const payment = energy.consumeCustom(cost.energy, `Lab assistance (${method})`, {
        requireFullAmount: true, activityType: 'forensic_hint'
      });
      if (!payment.success) {
        this.busy = false;
        this.body?.setText(payment.message || 'Unable to pay for assistance.');
        return;
      }
      result = hintManager.recordPaidHint(method, context, { ...cost, cash: 0 });
    }
    if (!result?.success) {
      this.busy = false;
      this.body?.setText('No free hints remain. Choose another option.');
      return;
    }
    const receipt = {
      key: this.key(definition), stepId: definition.id,
      sceneId: s.scene.key, stationId: s.stationId, caseKey: s.caseKey,
      evidenceId: s.evidenceConfig?.id || s.evidenceType,
      method, text: definition.text, excludedValue: definition.excludedValue ?? null,
      historyEntryId: result.entry.id,
      proceduralIssue: result.entry.proceduralIssue,
      createdAt: result.entry.createdAt
    };
    gameState.updateState({
      forensicHintReceipts: {
        ...(gameState.forensicHintReceipts || {}), [receipt.key]: receipt
      }
    });
    if (cost) EventBus.emit('advanceTime', 0, cost.minutes);
    const saved = saveGameState();
    if (this.destroyed || !s.sys.isActive()) return;
    const display = () => {
      if (this.destroyed || !s.sys.isActive()) return;
      this.disposeModal();
      this.busy = false;
      this.panel('LAB HINT', receipt.text + (saved ? '' :
        '\n\nAutosave failed. Reloading may lose this purchase.'));
      this.makeButton(0, 215, 'BACK TO ANALYSIS', () => {
        this.close();
        this.showEffect(definition, receipt);
      }, this.modal);
      this.refresh();
    };
    if (energy.isForcedSleepActive()) {
      this.body?.setText('You fell asleep.\nAssistance will be ready when you wake up.');
      this.cancelRecovery();
      this.boundRecovery = () => {
        this.cancelRecovery();
        if (!this.destroyed) display();
      };
      EventBus.on('energyRecovered', this.boundRecovery);
    } else display();
  }

  showEffect(definition, receipt) {
    if (this.destroyed) return;
    this.scene.setDialogue(receipt.text);
    this.scene.applyForensicHint?.(receipt);
    if (this.destroyed) return;
    this.clearMarks();
    for (const target of definition.targets || []) {
      if (!target?.active || !target.visible) continue;
      const bounds = target.getBounds();
      const marker = this.scene.add.rectangle(bounds.centerX, bounds.centerY,
        bounds.width + 18, bounds.height + 18, 0xffdc75, 0.1)
        .setStrokeStyle(3, 0xffdc75).setDepth(5000);
      this.scene.tweens.add({ targets: marker, alpha: 0.2,
        duration: 500, yoyo: true, repeat: -1 });
      this.marks.push(marker);
    }
    this.markEvent = this.scene.time.delayedCall(4500, () => this.clearMarks());
  }

  cancelRecovery() {
    if (!this.boundRecovery) return;
    EventBus.off('energyRecovered', this.boundRecovery);
    this.boundRecovery = null;
  }

  disposeModal() {
    const modal = this.modal;
    this.modal = null;
    this.body = null;
    modal?.destroy();
  }

  close() {
    if (this.destroyed) return;
    this.cancelRecovery();
    this.disposeModal();
    this.busy = false;
    this.resume();
    this.refresh();
  }

  clearMarks() {
    this.markEvent?.remove(false);
    this.markEvent = null;
    const marks = this.marks;
    this.marks = [];
    for (const mark of marks) {
      this.scene.tweens.killTweensOf(mark);
      mark.destroy();
    }
  }

  getReceipts() {
    const s = this.scene;
    return Object.values(gameState.forensicHintReceipts || {}).filter(receipt =>
      receipt.sceneId === s.scene.key && receipt.caseKey === s.caseKey &&
      receipt.stationId === s.stationId &&
      receipt.evidenceId === (s.evidenceConfig?.id || s.evidenceType));
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    EventBus.off('hints:changed', this.boundRefresh);
    this.cancelRecovery();
    this.scene.events.off('update', this.boundUpdate);
    this.scene.events.off('shutdown', this.boundDestroy);
    this.scene.events.off('destroy', this.boundDestroy);

    // Do not call close(): teardown must not resume tweens or object input.
    const lock = this.lock;
    this.lock = null;
    this.restoreSceneSettings(lock);
    this.disposeModal();
    this.clearMarks();

    for (const button of this.buttons) button.destroy();
    this.buttons = [];
    this.howButton = null;
    this.hintButton = null;
    this.busy = false;
    this.created = false;
    this.lastKey = null;
  }
}