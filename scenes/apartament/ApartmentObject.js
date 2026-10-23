export class ApartmentObject {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.state = config.state || 'default';
    this.isInteracted = false;
    this.contentsCollected = false;
    this.container = null;
    this.background = null;
    this.label = null;
    this.icon = null;
    this.restoreProgress();
    this.create();
  }

  restoreProgress() {
    const saved = this.scene.getObjectProgress?.(this.config.id);
    if (!saved) return;
    this.state = saved.state || this.state;
    this.isInteracted = saved.isInteracted === true;
    this.contentsCollected = saved.contentsCollected === true;
  }

  saveProgress() {
    this.scene?.onObjectStateChanged?.(this.config.id, {
      state: this.state, isInteracted: this.isInteracted,
      contentsCollected: this.contentsCollected
    });
  }

  create() {
    const { position = {}, size = {}, label = 'Unknown Object' } = this.config;
    const { x = 0, y = 0 } = position;
    const { w = 80, h = 80 } = size;
    this.container = this.scene.add.container(x, y).setDepth(100);
    this.background = this.scene.add.rectangle(0, 0, w, h, this.getColorForType(), 0.7)
      .setStrokeStyle(2, this.getStrokeColor()).setInteractive({ useHandCursor: true });
    this.label = this.scene.add.text(0, h / 2 + 10, label, {
      fontFamily: 'SpecialElite', fontSize: '14px', color: '#ffffff',
      align: 'center', wordWrap: { width: Math.max(30, w - 10) }
    }).setOrigin(0.5);
    this.container.add([this.background, this.label]);
    this.background.on('pointerover', () => this.onHover());
    this.background.on('pointerout', () => this.onHoverOut());
    this.background.on('pointerdown', () => this.onInteract());
    this.updateVisuals();
  }

  getColorForType() {
    return ({ furniture: 0x8b4513, decoration: 0xdaa520, container: 0x654321,
      key: 0xffd700, mirror: 0xc0c0c0 })[this.config.type] || 0x696969;
  }
  getStrokeColor() {
    return this.contentsCollected ? 0x00ff00 : this.state === 'locked' ? 0xff0000 : this.isInteracted ? 0xffd700 : 0xaaaaaa;
  }
  updateVisuals() {
    if (!this.background?.active) return;
    this.background.setStrokeStyle(2, this.getStrokeColor());
    this.background.setAlpha(this.contentsCollected ? 0.5 : 1);
  }
  onHover() {
    if (!this.background?.active || this.scene.leaveDialog) return;
    this.background.setFillStyle(this.getColorForType(), this.contentsCollected ? 0.65 : 0.9);
    this.scene.showDescription?.(this.getHoverDescription());
  }
  onHoverOut() {
    this.background?.setFillStyle(this.getColorForType(), this.contentsCollected ? 0.5 : 0.7);
  }
  getHoverDescription() {
    if (this.state === 'locked') return `${this.config.description || this.config.label} Locked.`;
    if (this.contentsCollected) return this.config.afterSearchText || `${this.config.label} has already been searched.`;
    return this.config.description || `Search the ${this.config.label}.`;
  }

  onInteract() {
    if (!this.scene || this.scene.isTransitioning || this.scene.leaveDialog || this.scene.getPlayerHudScene()?.isAnyPanelOpen()) return;
    if (this.state === 'locked') return this.handleLockedObject();
    if (this.contentsCollected) return this.showAlreadySearchedMessage();
    if (this.config.onInteract && !(this.config.unlocks || []).length) {
      this.scene.showMessage(this.config.onInteract.text || `Nothing useful in the ${this.config.label}.`, 2000);
      this.isInteracted = true;
      this.contentsCollected = true;
      this.updateVisuals();
      this.saveProgress();
      return;
    }
    if (!this.isInteracted) this.open();
    else this.showContents();
  }

  handleLockedObject() {
    const required = this.config.requiresItem;
    if (!required || !this.scene.playerInventory?.hasItem(required)) {
      this.scene.showMessage(`This ${this.config.label} is locked.${required ? ' You need the right key.' : ''}`, 2200, '#8b3030');
      return;
    }
    this.unlock();
  }
  open() {
    this.isInteracted = true;
    this.state = 'open';
    this.playConfiguredAnimation();
    this.showContents();
  }
  unlock() {
    const required = this.config.requiresItem;
    if (required && !this.scene.playerInventory?.removeItem(required, 1)) {
      this.scene.showMessage('That key does not seem to work.', 1800, '#8b3030');
      return;
    }
    this.state = 'open';
    this.isInteracted = true;
    this.playConfiguredAnimation();
    this.showContents();
  }

  showContents() {
    if (this.contentsCollected) return this.showAlreadySearchedMessage();
    const contents = (this.config.unlocks || []).filter(Boolean);
    this.isInteracted = true;
    let allCollected = true;
    if (!contents.length) {
      this.scene.showMessage(this.config.emptySearchText || `Nothing useful in the ${this.config.label}.`, 1600);
    }
    for (const item of contents) {
      // Mark searched only after the inventory/recovery operation succeeds.
      if (this.scene.collectApartmentItem(item, this.config) !== true) allCollected = false;
    }
    this.contentsCollected = allCollected;
    this.saveProgress();
    this.updateVisuals();
  }

  showAlreadySearchedMessage() {
    this.scene?.showMessage(this.config.afterSearchText || `You already searched the ${this.config.label}.`, 1400);
  }
  playConfiguredAnimation() {
    if (this.config.animation) this.playAnimation(this.config.animation);
  }
  playAnimation({ type = 'none', duration = 400 } = {}) {
    if (!this.scene?.tweens || !this.background?.active) return;
    const base = { targets: this.background, duration, ease: 'Quad.easeOut' };
    const variants = {
      slide_open_right: { x: 40 }, slide_open_down: { y: 30 },
      slide_reveal_left: { x: -30, alpha: 0.5 },
      swing_open: { rotation: Math.PI / 4, ease: 'Elastic.easeOut' },
      fade_in: { alpha: 1, ease: 'Linear' }
    };
    if (type === 'shake') {
      this.scene.tweens.add({ targets: this.container, x: this.container.x + 8,
        duration: Math.max(60, duration / 6), ease: 'Sine.easeInOut', yoyo: true, repeat: 3 });
    } else if (variants[type]) this.scene.tweens.add({ ...base, ...variants[type] });
  }
  canUseItemOn(id) { return this.config.requiresItem === id; }
  useItemOn(id) {
    if (this.state !== 'locked' || !this.canUseItemOn(id) || !this.scene.playerInventory?.hasItem(id)) return false;
    this.unlock();
    return true;
  }
  destroy() {
    this.background?.removeAllListeners();
    this.container?.destroy(true);
    this.scene = null;
    this.container = this.background = this.label = this.icon = null;
    this.config = null;
  }
}
export default ApartmentObject;
