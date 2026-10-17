// ApartmentObject.js
// ============================================================
// Pojedynczy interaktywny obiekt w mieszkaniu.
//
// Odpowiada wyłącznie za:
// - rysowanie i interakcję z hotspotem;
// - stan locked/open;
// - jednokrotne ujawnienie zawartości;
// - animację obiektu.
//
// Nie zapisuje danych sprawy ani gameState.
// Każdy znaleziony item przekazuje do:
// scene.collectApartmentItem(item, sourceObject)
// ============================================================

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

    this.create();
  }

  create() {
    const {
      position = { x: 0, y: 0 },
      size = { w: 80, h: 80 },
      label = 'Unknown Object'
    } = this.config;

    const { x = 0, y = 0 } = position;
    const { w = 80, h = 80 } = size;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(100);

    this.background = this.scene.add.rectangle(
      0,
      0,
      w,
      h,
      this.getColorForType(),
      0.7
    );

    this.background.setOrigin(0.5);
    this.background.setStrokeStyle(2, this.getStrokeColor());
    this.background.setInteractive({ useHandCursor: true });

    this.container.add(this.background);

    this.label = this.scene.add.text(0, h / 2 + 10, label, {
      fontFamily: 'SpecialElite',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: Math.max(30, w - 10) }
    });

    this.label.setOrigin(0.5);
    this.container.add(this.label);

    this.background.on('pointerover', () => this.onHover());
    this.background.on('pointerout', () => this.onHoverOut());
    this.background.on('pointerdown', () => this.onInteract());

    this.updateVisuals();
  }

  getColorForType() {
    const typeColors = {
      furniture: 0x8b4513,
      decoration: 0xdaa520,
      container: 0x654321,
      key: 0xffd700,
      mirror: 0xc0c0c0,
      default: 0x696969
    };

    return typeColors[this.config.type] || typeColors.default;
  }

  getStrokeColor() {
    if (this.contentsCollected) {
      return 0x00ff00;
    }

    if (this.state === 'locked') {
      return 0xff0000;
    }

    if (this.isInteracted) {
      return 0xffd700;
    }

    return 0xaaaaaa;
  }

  updateVisuals() {
    if (!this.background?.active) {
      return;
    }

    this.background.setStrokeStyle(2, this.getStrokeColor());

    if (this.contentsCollected) {
      this.background.setAlpha(0.5);
    }
  }

  onHover() {
    if (!this.background?.active) {
      return;
    }

    this.background.setFillStyle(
      this.getColorForType(),
      this.contentsCollected ? 0.65 : 0.9
    );

    if (this.scene?.showDescription) {
      this.scene.showDescription(this.getHoverDescription());
    }
  }

  onHoverOut() {
    if (!this.background?.active) {
      return;
    }

    this.background.setFillStyle(
      this.getColorForType(),
      this.contentsCollected ? 0.5 : 0.7
    );
  }

  getHoverDescription() {
    if (this.state === 'locked') {
      return `${this.config.description || this.config.label} Locked.`;
    }

    if (this.contentsCollected) {
      return this.config.afterSearchText ||
        `${this.config.label} has already been searched.`;
    }

    return this.config.description ||
      `Search the ${this.config.label}.`;
  }

  /**
   * Gracz kliknął hotspot.
   */
  onInteract() {
    if (!this.scene || this.scene.isTransitioning) {
      return;
    }

    console.log(`[ApartmentObject] Clicked: ${this.config.id}`);

    if (this.state === 'locked') {
      this.handleLockedObject();
      return;
    }

    if (this.contentsCollected) {
      this.showAlreadySearchedMessage();
      return;
    }

    if (this.config.onInteract && !(this.config.unlocks || []).length) {
      this.scene.showMessage(
        this.config.onInteract.text ||
          `Nothing useful in the ${this.config.label}.`,
        2000,
        '#37474f'
      );

      this.isInteracted = true;
      this.contentsCollected = true;
      this.updateVisuals();
      return;
    }

    if (!this.isInteracted) {
      this.open();
      return;
    }

    this.showContents();
  }

  /**
   * Obsługa obiektu zamkniętego.
   */
  handleLockedObject() {
    const requiredItem = this.config.requiresItem;

    if (!requiredItem) {
      this.scene.showMessage(
        `This ${this.config.label} is locked.`,
        1800,
        '#ff6b6b'
      );
      return;
    }

    const hasKey = this.scene.playerInventory?.hasItem(requiredItem);

    if (!hasKey) {
      this.scene.showMessage(
        `This ${this.config.label} is locked. You need the right key.`,
        2200,
        '#ff6b6b'
      );
      return;
    }

    this.unlock();
  }

  /**
   * Otwiera obiekt, który nie wymaga klucza.
   */
  open() {
    this.isInteracted = true;
    this.state = 'open';

    this.playConfiguredAnimation();
    this.updateVisuals();
    this.showContents();
  }

  /**
   * Otwiera obiekt za pomocą klucza z inventory.
   */
  unlock() {
    const requiredItem = this.config.requiresItem;

    if (
      requiredItem &&
      !this.scene.playerInventory?.removeItem(requiredItem, 1)
    ) {
      this.scene.showMessage(
        'That key does not seem to work.',
        1800,
        '#ff6b6b'
      );
      return;
    }

    this.isInteracted = true;
    this.state = 'open';

    this.scene.showMessage(
      `${this.config.label} unlocked.`,
      1300,
      '#4caf50'
    );

    this.playConfiguredAnimation();
    this.updateVisuals();
    this.showContents();
  }

  /**
   * Zbiera zawartość wyłącznie raz.
   */
  showContents() {
    if (this.contentsCollected) {
      this.showAlreadySearchedMessage();
      return;
    }

    const contents = this.config.unlocks || [];

    this.contentsCollected = true;
    this.isInteracted = true;
    this.updateVisuals();

    if (contents.length === 0) {
      this.scene.showMessage(
        this.config.emptySearchText ||
          `Nothing useful in the ${this.config.label}.`,
        1600,
        '#37474f'
      );
      return;
    }

    for (const item of contents) {
      if (!item) {
        continue;
      }

      if (typeof this.scene.collectApartmentItem === 'function') {
        this.scene.collectApartmentItem(item, this.config);
        continue;
      }

      // Bezpieczny fallback, gdy metoda w ApartmentScene nie została
      // jeszcze dodana: obecna mechanika inventory nadal zadziała.
      this.scene.playerInventory?.addItem(item);

      this.scene.showMessage(
        `Found: ${item.label || 'Unknown Item'}`,
        1800,
        '#4caf50'
      );
    }
  }

  showAlreadySearchedMessage() {
    this.scene?.showMessage(
      this.config.afterSearchText ||
        `You already searched the ${this.config.label}.`,
      1400,
      '#37474f'
    );
  }

  playConfiguredAnimation() {
    if (!this.config.animation) {
      return;
    }

    this.playAnimation(this.config.animation);
  }

  /**
   * Animacja otwarcia / przeszukania.
   */
  playAnimation(animConfig = {}) {
    if (!this.scene?.tweens || !this.background?.active) {
      return;
    }

    const { type = 'none', duration = 400 } = animConfig;

    switch (type) {
      case 'slide_open_right':
        this.scene.tweens.add({
          targets: this.background,
          x: 40,
          duration,
          ease: 'Quad.easeOut'
        });
        break;

      case 'slide_open_down':
        this.scene.tweens.add({
          targets: this.background,
          y: 30,
          duration,
          ease: 'Quad.easeOut'
        });
        break;

      case 'slide_reveal_left':
        this.scene.tweens.add({
          targets: this.background,
          x: -30,
          alpha: 0.5,
          duration,
          ease: 'Quad.easeOut'
        });
        break;

      case 'swing_open':
        this.scene.tweens.add({
          targets: this.background,
          rotation: Math.PI / 4,
          duration,
          ease: 'Elastic.easeOut'
        });
        break;

      case 'fade_in':
        this.scene.tweens.add({
          targets: this.background,
          alpha: 1,
          duration,
          ease: 'Linear'
        });
        break;

      case 'shake':
        this.scene.tweens.add({
          targets: this.container,
          x: this.container.x + 8,
          duration: Math.max(60, duration / 6),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: 3
        });
        break;

      case 'none':
      default:
        break;
    }
  }

  /**
   * Pozostawione pod późniejsze używanie inventory na hotspotach.
   */
  canUseItemOn(itemId) {
    return this.config.requiresItem === itemId;
  }

  /**
   * Pozostawione pod późniejsze przeciąganie klucza z inventory
   * na konkretny hotspot.
   */
  useItemOn(itemId) {
    if (
      this.state === 'locked' &&
      this.config.requiresItem === itemId
    ) {
      const hasKey = this.scene?.playerInventory?.hasItem(itemId);

      if (!hasKey) {
        return false;
      }

      this.unlock();
      return true;
    }

    return false;
  }

  destroy() {
    this.background?.removeAllListeners();
    this.container?.destroy();

    this.container = null;
    this.background = null;
    this.label = null;
    this.icon = null;
    this.scene = null;
    this.config = null;
  }
}

export default ApartmentObject;