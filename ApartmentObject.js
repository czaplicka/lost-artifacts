// ApartmentObject.js
// ============================================================
// Pojedyncze interaktywne obiekty w mieszkaniu
// Obsługuje: stan, animacje, klikanie, kombinowanie
// ============================================================

export class ApartmentObject {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    
    // Stan
    this.state = config.state || 'default';
    this.isInteracted = false;
    this.inventory = []; // Items unlocked z tego obiektu
    
    // Graphics
    this.container = null;
    this.background = null;
    this.label = null;
    this.icon = null;
    
    this.create();
  }

  create() {
    const { position, size, label, icon } = this.config;
    const { x, y } = position;
    const { w, h } = size;

    // Container
    this.container = this.scene.add.container(x, y);
    this.container.setDepth(100);

    // Background (proceduralne)
    this.background = this.scene.add.rectangle(0, 0, w, h, this.getColorForType(), 0.7);
    this.background.setOrigin(0.5);
    this.background.setStrokeStyle(2, this.getStrokeColor());
    this.background.setInteractive({ useHandCursor: true });
    
    this.container.add(this.background);

    // Label
    this.label = this.scene.add.text(0, h / 2 + 10, label, {
      fontFamily: 'SpecialElite',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: w - 10 }
    });
    this.label.setOrigin(0.5);
    this.container.add(this.label);

    // Events
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
    if (this.isInteracted) return 0x00ff00;
    if (this.state === 'locked') return 0xff0000;
    return 0xaaaaaa;
  }

  updateVisuals() {
    if (this.background) {
      this.background.setStrokeStyle(2, this.getStrokeColor());
    }
  }

  onHover() {
    this.background.setFillStyle(this.getColorForType(), 0.9);
    
    // Pokaż description
    if (this.scene.showDescription) {
      this.scene.showDescription(this.config.description);
    }
  }

  onHoverOut() {
    this.background.setFillStyle(this.getColorForType(), 0.7);
  }

  /**
   * Gracz kliknął obiekt
   */
  onInteract() {
    console.log(`[ApartmentObject] Clicked: ${this.config.id}`);

    // Jeśli zamknięty i wymaga klucza
    if (this.state === 'locked' && this.config.requiresItem) {
      const playerHasKey = this.scene.playerInventory.hasItem(this.config.requiresItem);
      
      if (!playerHasKey) {
        this.scene.showMessage(
          `This ${this.config.label} is locked. You need a key.`,
          2000,
          '#ff6b6b'
        );
        return;
      }

      // Gracz ma klucz - otwórz!
      this.unlock();
      return;
    }

    // Jeśli ma custom interaction (red herring)
    if (this.config.onInteract && !this.config.unlocks) {
      this.scene.showMessage(this.config.onInteract.text, 2500);
      return;
    }

    // Jeśli już otwarte - pokaż co jest wewnątrz
    if (this.isInteracted && this.config.unlocks) {
      this.showContents();
      return;
    }

    // Normalny click - otwórz
    if (!this.isInteracted && this.config.unlocks) {
      this.open();
    }
  }

  /**
   * Otwórz/interactive element
   */
  open() {
    this.isInteracted = true;
    this.state = 'open';

    // Animacja
    if (this.config.animation) {
      this.playAnimation(this.config.animation);
    }

    this.updateVisuals();

    // Pokaż co jest wewnątrz
    this.showContents();
  }

  /**
   * Odblokuj za pomocą itemów
   */
  unlock() {
    this.isInteracted = true;
    this.state = 'open';

    // Konsumuj klucz (opcjonalnie)
    if (this.config.requiresItem) {
      this.scene.playerInventory.removeItem(this.config.requiresItem, 1);
      this.scene.showMessage('Key used! Drawer opens.', 1500, '#4caf50');
    }

    // Animacja
    if (this.config.animation) {
      this.playAnimation(this.config.animation);
    }

    this.updateVisuals();
    this.showContents();
  }

  /**
   * Pokaż zawartość obiektu (unlocks items)
   */
  showContents() {
    if (!this.config.unlocks || this.config.unlocks.length === 0) {
      return;
    }

    for (const item of this.config.unlocks) {
      // Dodaj do inventory
      this.scene.playerInventory.addItem(item);

      // Pokaż popup
      this.scene.showMessage(
        `Found: ${item.label}`,
        2000,
        '#4caf50'
      );
    }
  }

  /**
   * Animacja otwarcia
   */
  playAnimation(animConfig) {
    const { type, duration } = animConfig;

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
    }
  }

  /**
   * Można użyć tego obiektu na innym obiekcie (klucz na drzwiach)
   */
  canUseItemOn(itemId) {
    return this.config.requiresItem === itemId;
  }

  /**
   * Używanie itemów na obiekcie
   */
  useItemOn(itemId) {
    if (this.state === 'locked' && this.config.requiresItem === itemId) {
      this.unlock();
      return true;
    }
    return false;
  }

  destroy() {
    if (this.container) {
      this.container.destroy();
    }
    this.scene = null;
  }
}

export default ApartmentObject;