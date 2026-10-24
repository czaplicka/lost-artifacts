export class HiddenObjectsInteractionController {
  constructor(scene) {
    this.scene = scene;
    this.inputEmitter = null;

    this.handleGlobalPointerDown =
      this.handleGlobalPointerDown.bind(this);
  }

  canInteract() {
    const scene = this.scene;

    return Boolean(
      scene &&
      !scene._cleanupDone &&
      !scene.isShuttingDownHiddenObjects &&
      !scene.isSceneFinished &&
      !scene.isReturning &&
      scene.sys?.isActive()
    );
  }

  registerMissDetection() {
    const scene = this.scene;

    this.destroy();

    if (
      !scene.input ||
      typeof scene.trackInputEvent !== 'function'
    ) {
      console.warn(
        '[HiddenObjectsInteractionController] ' +
        'Scene input or trackInputEvent is unavailable.'
      );

      return false;
    }

    this.inputEmitter = scene.input;

    scene.trackInputEvent(
      this.inputEmitter,
      'pointerdown',
      this.handleGlobalPointerDown
    );

    return true;
  }

  handleHiddenObjectClick(zone) {
    const scene = this.scene;

    if (
      !this.canInteract() ||
      !zone?.active ||
      zone.getData('found')
    ) {
      return false;
    }

    const rawId = zone.getData('id');
    const id = rawId == null ? '' : String(rawId);
    const itemData = zone.getData('itemData');

    if (!id || !itemData) {
      console.warn(
        '[HiddenObjectsInteractionController] ' +
        'Clicked zone has incomplete data.',
        { id, itemData }
      );

      return false;
    }

    if (scene.foundItems.has(id)) {
      zone.setData('found', true);
      return false;
    }

    zone.setData('found', true);

    const visual = zone.getData('debugVisual');

    if (visual?.active) {
      visual
        .setFillStyle(0x555555, 0.55)
        .setStrokeStyle(2, 0x777777, 0.7);
    }

    scene.playSfx('correct', { volume: 0.45 });

    this.pulseZone(zone, 0x7cfc00);
    this.flashScreen(0x7cfc00, 0.08, 140);

    scene.foundItems.add(id);
    this.recordCollectedCard(id);

    const isMissionRelevant =
      scene.missionRelevantItemIds.has(id);

    const clueType = itemData.clueType || 'soft_clue';

    const points = isMissionRelevant
      ? (clueType === 'hard_clue' ? 25 : 15)
      : 5;

    scene.score =
      scene.scoreManager.addHiddenObjectScore(points);

    scene.ui.updateScoreAndMisses(
      scene.score,
      scene.incorrectClicks
    );

    scene.ui.refreshList();
    this.bumpText(scene.ui.scoreText);

    if (isMissionRelevant) {
      this.emitClueFound(itemData);

      scene.stateManager.storeHiddenObjectClue(
        itemData,
        clueType
      );

      scene.ui.showMessage(
        `Evidence secured: ${itemData.item} (+${points})`,
        '#7CFC00'
      );
    } else {
      scene.ui.showMessage(
        `Found: ${itemData.item} (+${points})`,
        '#ffd966'
      );
    }

    if (
      scene.activeItems.length > 0 &&
      scene.foundItems.size >= scene.activeItems.length
    ) {
      this.finishScene(true);
    }

    return true;
  }

  handleGlobalPointerDown(pointer, currentlyOver) {
    const scene = this.scene;

    if (!this.canInteract() || !pointer) return;

    if (
      pointer.event?.button !== undefined &&
      pointer.event.button !== 0
    ) {
      return;
    }

    if (
      Array.isArray(currentlyOver) &&
      currentlyOver.length > 0
    ) {
      return;
    }

    if (pointer.x < scene.sidebarWidth) return;

    scene.incorrectClicks += 1;

    scene.score =
      scene.scoreManager.addHiddenObjectScore(-3);

    scene.ui.updateScoreAndMisses(
      scene.score,
      scene.incorrectClicks
    );

    scene.playSfx('wrong', { volume: 0.38 });

    this.bumpText(scene.ui.missesText);
    this.bumpText(scene.ui.scoreText);
    this.flashScreen(0xff4d4d, 0.12, 120);

    scene.ui.showMessage(
      'No useful evidence there. (-3)',
      '#ff8a8a'
    );
  }

  recordCollectedCard(id) {
    const scene = this.scene;

    if (
      typeof scene.reconstructionSync?.recordCollectedCard ===
      'function'
    ) {
      scene.reconstructionSync.recordCollectedCard(id);
      return;
    }

    if (typeof scene.storeCollectedCardId === 'function') {
      scene.storeCollectedCardId(id);
      return;
    }

    console.warn(
      '[HiddenObjectsInteractionController] ' +
      'No reconstruction card recorder is available.',
      { id }
    );
  }

  emitClueFound(itemData) {
    const scene = this.scene;

    if (
      typeof scene.reconstructionSync?.emitClueFound ===
      'function'
    ) {
      scene.reconstructionSync.emitClueFound(itemData);
      return;
    }

    if (typeof scene.emitClueFound === 'function') {
      scene.emitClueFound(itemData);
      return;
    }

    console.warn(
      '[HiddenObjectsInteractionController] ' +
      'No clue event emitter is available.',
      { itemId: itemData?.id }
    );
  }

  finishScene(success) {
    if (!this.canInteract()) return;

    const scene = this.scene;

    if (typeof scene.finishScene === 'function') {
      scene.finishScene(Boolean(success));
      return;
    }

    console.error(
      '[HiddenObjectsInteractionController] ' +
      'Scene completion handler is unavailable.',
      {
        success,
        sceneKey: scene.scene.key
      }
    );
  }

  pulseZone(zone, color) {
    const scene = this.scene;

    if (
      typeof scene.presentation?.pulseZone === 'function'
    ) {
      scene.presentation.pulseZone(zone, color);
      return;
    }

    if (typeof scene.pulseZone === 'function') {
      scene.pulseZone(zone, color);
    }
  }

  flashScreen(color, alpha, duration) {
    const scene = this.scene;

    if (
      typeof scene.presentation?.flashScreen === 'function'
    ) {
      scene.presentation.flashScreen(
        color,
        alpha,
        duration
      );
      return;
    }

    if (typeof scene.flashScreen === 'function') {
      scene.flashScreen(color, alpha, duration);
    }
  }

  bumpText(target) {
    if (!target?.active) return;

    const scene = this.scene;

    if (
      typeof scene.presentation?.bumpText === 'function'
    ) {
      scene.presentation.bumpText(target);
      return;
    }

    if (typeof scene.bumpText === 'function') {
      scene.bumpText(target);
    }
  }

  destroy() {
    if (this.inputEmitter) {
      this.inputEmitter.off(
        'pointerdown',
        this.handleGlobalPointerDown
      );

      this.inputEmitter = null;
    }
  }
}