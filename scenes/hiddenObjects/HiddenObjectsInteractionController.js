import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { audioManager } from '../../managers/AudioManager.js';

const HIDDEN_OBJECT_FOUND_POINTS = 15;
const HIDDEN_OBJECT_MISS_POINTS = -3;
const HIDDEN_OBJECT_FOUND_COLOR = '#7CFC00';
const FOUND_VERBS = ['Found:', 'Bagged:', 'Tagged:', 'Gotcha:', __dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_1253bf759a5735259d9e")];
const MISS_LINES = [
  __dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_67aed5c5606652f59790"),
  __dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_b62301f8718d6bb4eb77"),
  __dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_4af8afde8ac5a999fbd8"),
  __dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_87148da3f34a8554dbc7"),
  __dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_92beebf9a6f8a26e1204"),
  __dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_e4dc00a307a5c98c7d0a")
];

export class HiddenObjectsInteractionController {
  constructor(scene) {
    this.scene = scene;
    this.inputEmitter = null;
    this.lastMissLine = -1;
    this.handleGlobalPointerDown = this.handleGlobalPointerDown.bind(this);
  }

  canInteract() {
    const scene = this.scene;
    return Boolean(scene && !scene._cleanupDone && !scene.isShuttingDownHiddenObjects &&
      !scene.isSceneFinished && !scene.isReturning && scene.sys?.isActive());
  }

  registerMissDetection() {
    const scene = this.scene;
    this.destroy();
    if (!scene.input || typeof scene.trackInputEvent !== 'function') {
      console.warn('[HiddenObjectsInteractionController] Scene input or trackInputEvent is unavailable.');
      return false;
    }
    this.inputEmitter = scene.input;
    scene.trackInputEvent(this.inputEmitter, 'pointerdown', this.handleGlobalPointerDown);
    return true;
  }

  playEvidenceSound() {
    const scene = this.scene;
    audioManager.init(scene);
    const key = scene.cache.audio.exists('sfx_evidence_collect') ? 'sfx_evidence_collect' : 'correct';
    scene.playSfx(key, { volume: audioManager.getSfxVolume() * 0.45, overlap: true });
  }

  handleHiddenObjectClick(zone) {
    const scene = this.scene;
    if (!this.canInteract() || !zone?.active || zone.getData('found')) return false;
    const rawId = zone.getData('id');
    const id = rawId == null ? '' : String(rawId);
    const itemData = zone.getData('itemData');
    if (!id || !itemData) {
      console.warn('[HiddenObjectsInteractionController] Clicked zone has incomplete data.', { id, itemData });
      return false;
    }
    if (scene.foundItems.has(id)) { zone.setData('found', true); return false; }
    zone.setData('found', true);
    const visual = zone.getData('debugVisual');
    if (visual?.active) visual.setFillStyle(0x555555, 0.55).setStrokeStyle(2, 0x777777, 0.7);
    this.playEvidenceSound();
    this.pulseZone(zone, 0x7cfc00);
    this.flashScreen(0x7cfc00, 0.08, 140);
    scene.foundItems.add(id);
    this.recordCollectedCard(id);
    const points = HIDDEN_OBJECT_FOUND_POINTS;
    scene.score = scene.scoreManager.addHiddenObjectScore(points);
    this.markFound(zone, points, scene.foundItems.size);
    scene.ui.updateScoreAndMisses(scene.score, scene.incorrectClicks);
    scene.ui.refreshList();
    this.bumpText(scene.ui.scoreText);
    if (scene.missionRelevantItemIds.has(id)) {
      const clueType = itemData.clueType || 'soft_clue';
      this.emitClueFound(itemData);
      scene.stateManager.storeHiddenObjectClue(itemData, clueType);
    }
    const verb = FOUND_VERBS[Math.floor(Math.random() * FOUND_VERBS.length)];
    scene.ui.showMessage(`${verb}${__dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_36a9e7f1c95b82ffb997")}${itemData.item}${__dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_2df029fdd16bf06b092d")}${points}${__dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_ba5ec51d07a4ac0e9516")}`, HIDDEN_OBJECT_FOUND_COLOR);
    if (scene.activeItems.length > 0 && scene.foundItems.size >= scene.activeItems.length) this.finishScene(true);
    return true;
  }

  handleGlobalPointerDown(pointer, currentlyOver) {
    const scene = this.scene;
    if (!this.canInteract() || !pointer) return;
    if (pointer.event?.button !== undefined && pointer.event.button !== 0) return;
    if (Array.isArray(currentlyOver) && currentlyOver.length > 0) return;
    if (pointer.x < scene.sidebarWidth) return;
    scene.incorrectClicks += 1;
    scene.score = scene.scoreManager.addHiddenObjectScore(HIDDEN_OBJECT_MISS_POINTS);
    scene.ui.updateScoreAndMisses(scene.score, scene.incorrectClicks);
    scene.playSfx('wrong', { volume: 0.38 });
    this.markMiss(pointer, HIDDEN_OBJECT_MISS_POINTS);
    this.bumpText(scene.ui.missesText);
    this.bumpText(scene.ui.scoreText);
    this.flashScreen(0xff4d4d, 0.12, 120);
    scene.ui.showMessage(`${this.pickMissLine()}${__dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_4f5a2ada1166172aa174")}${HIDDEN_OBJECT_MISS_POINTS}${__dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_ba5ec51d07a4ac0e9516")}`, __dialogueText("scenes/hiddenObjects/HiddenObjectsInteractionController.js", "t_c5c9363306629d4c4527"));
  }

  pickMissLine() {
    let index = Math.floor(Math.random() * MISS_LINES.length);
    if (index === this.lastMissLine) index = (index + 1) % MISS_LINES.length;
    this.lastMissLine = index;
    return MISS_LINES[index];
  }

  recordCollectedCard(id) {
    const scene = this.scene;
    if (typeof scene.reconstructionSync?.recordCollectedCard === 'function') {
      scene.reconstructionSync.recordCollectedCard(id); return;
    }
    if (typeof scene.storeCollectedCardId === 'function') { scene.storeCollectedCardId(id); return; }
    console.warn('[HiddenObjectsInteractionController] No reconstruction card recorder is available.', { id });
  }

  emitClueFound(itemData) {
    const scene = this.scene;
    if (typeof scene.reconstructionSync?.emitClueFound === 'function') {
      scene.reconstructionSync.emitClueFound(itemData); return;
    }
    if (typeof scene.emitClueFound === 'function') { scene.emitClueFound(itemData); return; }
    console.warn('[HiddenObjectsInteractionController] No clue event emitter is available.', { itemId: itemData?.id });
  }

  finishScene(success) {
    if (!this.canInteract()) return;
    const scene = this.scene;
    if (typeof scene.finishScene === 'function') { scene.finishScene(Boolean(success)); return; }
    console.error('[HiddenObjectsInteractionController] Scene completion handler is unavailable.', {
      success, sceneKey: scene.scene.key });
  }

  markFound(zone, points, order) { this.scene.presentation?.markFound?.(zone, { points, order }); }
  markMiss(pointer, points) { this.scene.presentation?.markMiss?.(pointer, points); }

  pulseZone(zone, color) {
    const scene = this.scene;
    if (typeof scene.presentation?.pulseZone === 'function') { scene.presentation.pulseZone(zone, color); return; }
    if (typeof scene.pulseZone === 'function') scene.pulseZone(zone, color);
  }

  flashScreen(color, alpha, duration) {
    const scene = this.scene;
    if (typeof scene.presentation?.flashScreen === 'function') {
      scene.presentation.flashScreen(color, alpha, duration); return;
    }
    if (typeof scene.flashScreen === 'function') scene.flashScreen(color, alpha, duration);
  }

  bumpText(target) {
    if (!target?.active) return;
    const scene = this.scene;
    if (typeof scene.presentation?.bumpText === 'function') { scene.presentation.bumpText(target); return; }
    if (typeof scene.bumpText === 'function') scene.bumpText(target);
  }

  destroy() {
    if (this.inputEmitter) {
      this.inputEmitter.off('pointerdown', this.handleGlobalPointerDown);
      this.inputEmitter = null;
    }
  }
}
