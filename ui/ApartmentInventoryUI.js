// ApartmentInventoryUI.js
// ============================================================
// UI do przeglądania inventory i kombinowania przedmiotów
// ============================================================

import { EventBus } from './EventBus.js';

export class ApartmentInventoryUI {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.selectedItem = null;
    this.isOpen = false;
    this.container = null;
  }

  /**
   * Dodaj item do inventory
   */
  addItem(itemConfig) {
    const existingItem = this.items.find(i => i.id === itemConfig.id);

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + (itemConfig.quantity || 1);
    } else {
      this.items.push({ ...itemConfig, quantity: itemConfig.quantity || 1 });
    }

    this.updateDisplay();
    return true;
  }

  /**
   * Sprawdź czy gracz ma item
   */
  hasItem(itemId) {
    return this.items.some(i => i.id === itemId && i.quantity > 0);
  }

  /**
   * Usuń item z inventory
   */
  removeItem(itemId, quantity = 1) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;

    item.quantity -= quantity;
    if (item.quantity <= 0) {
      this.items = this.items.filter(i => i.id !== itemId);
    }

    this.updateDisplay();
    return true;
  }

  /**
   * Otwórz/zamknij inventory UI
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    this.createUI();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  /**
   * Utwórz UI inventory
   */
  createUI() {
    const { width, height } = this.scene.scale;
    const panelWidth = 400;
    const panelHeight = 500;
    const panelX = width - panelWidth - 20;
    const panelY = height - panelHeight - 20;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(9999);

    // Background panel
    const bg = this.scene.add.rectangle(
      panelX + panelWidth / 2,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      0.95
    );
    bg.setStrokeStyle(3, 0xffd700);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(
      panelX + 15,
      panelY + 15,
      'INVENTORY',
      {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#ffd700'
      }
    );
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(
      panelX + panelWidth - 25,
      panelY + 15,
      '[X]',
      {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#ff6b6b'
      }
    );
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.container.add(closeBtn);

    // Items list
    let yOffset = 60;
    const itemHeight = 70;
    const maxItems = Math.floor((panelHeight - 100) / itemHeight);

    for (let i = 0; i < Math.min(this.items.length, maxItems); i++) {
      const item = this.items[i];
      this.createItemButton(item, panelX + 15, panelY + yOffset, panelWidth - 30);
      yOffset += itemHeight;
    }

    // Info text
    const infoText = this.scene.add.text(
      panelX + 15,
      panelY + panelHeight - 30,
      'Click items to combine or inspect',
      {
        fontFamily: 'SpecialElite',
        fontSize: '12px',
        color: '#aaaaaa',
        wordWrap: { width: panelWidth - 30 }
      }
    );
    this.container.add(infoText);
  }

  /**
   * Utwórz button dla item'a
   */
  createItemButton(item, x, y, width) {
    const height = 60;

    // Background
    const btnBg = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, 0x333333, 0.8);
    btnBg.setStrokeStyle(2, 0x888888);
    btnBg.setInteractive({ useHandCursor: true });
    this.container.add(btnBg);

    // Item name
    const nameText = this.scene.add.text(x + 10, y + 10, item.label, {
      fontFamily: 'SpecialElite',
      fontSize: '14px',
      color: '#ffffff'
    });
    this.container.add(nameText);

    // Item quantity
    if (item.quantity > 1) {
      const qtyText = this.scene.add.text(x + width - 20, y + 10, `×${item.quantity}`, {
        fontFamily: 'SpecialElite',
        fontSize: '12px',
        color: '#ffd700'
      });
      this.container.add(qtyText);
    }

    // Item type badge
    const typeBg = this.scene.add.rectangle(x + 10, y + 35, 50, 18, this.getTypeColor(item.type), 0.7);
    typeBg.setStrokeStyle(1, 0xffffff);
    this.container.add(typeBg);

    const typeText = this.scene.add.text(x + 10, y + 35, item.type.toUpperCase(), {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffffff'
    });
    typeText.setOrigin(0.5);
    this.container.add(typeText);

    // Hover effect
    btnBg.on('pointerover', () => {
      btnBg.setStrokeStyle(2, 0xffd700);
      this.showItemDescription(item);
    });

    btnBg.on('pointerout', () => {
      btnBg.setStrokeStyle(2, 0x888888);
    });

    btnBg.on('pointerdown', () => {
      this.selectItem(item);
    });
  }

  /**
   * Pokaż opis item'a
   */
  showItemDescription(item) {
    // TODO: Pokaż w tooltipie czy gdzieś
    console.log(`Item: ${item.label} - ${item.description}`);
  }

  /**
   * Wybierz item (do kombinowania)
   */
  selectItem(item) {
    this.selectedItem = item;
    this.scene.showMessage(
      `Selected: ${item.label}. Click another item to combine.`,
      2000,
      '#4caf50'
    );
  }

  /**
   * Spróbuj kombinować dwa item'y
   */
  tryCombine(otherItem) {
    if (!this.selectedItem || !otherItem) return false;

    const { COMBINE_RULES } = require('./ApartmentObjectsConfig.js');

    // Szukaj reguły kombinacji
    for (const [ruleId, rule] of Object.entries(COMBINE_RULES)) {
      const requiredIds = rule.requires;
      const itemIds = [this.selectedItem.id, otherItem.id];

      // Sprawdź czy mamy wymagane item'y
      if (
        requiredIds.every(id => itemIds.includes(id)) &&
        this.items.every(i => requiredIds.includes(i.id) || !requiredIds.includes(i.id))
      ) {
        // Kombinacja znaleziona!
        this.combine(rule);
        this.selectedItem = null;
        return true;
      }
    }

    this.scene.showMessage(
      `${this.selectedItem.label} and ${otherItem.label} don't seem to fit together.`,
      2000,
      '#ff6b6b'
    );

    return false;
  }

  /**
   * Wykonaj kombinację
   */
  combine(rule) {
    // Usuń stare item'y
    for (const itemId of rule.requires) {
      this.removeItem(itemId, 1);
    }

    // Dodaj nowy item
    this.addItem(rule.produces);

    // Animacja
    if (rule.animation) {
      // TODO: Play animation
    }

    this.scene.showMessage(
      `Combined! You now have: ${rule.produces.label}`,
      2500,
      '#4caf50'
    );

    // Emit event dla pozostałych systemów
    EventBus.emit('itemCombined', {
      result: rule.produces,
      rule
    });

    this.updateDisplay();
  }

  /**
   * Odśwież display inventory
   */
  updateDisplay() {
    if (this.isOpen) {
      this.close();
      this.open();
    }
  }

  getTypeColor(type) {
    const colors = {
      key: 0xffd700,
      document: 0x8b7355,
      clue: 0xff6b6b,
      decoration: 0xdaa520,
      default: 0x696969
    };
    return colors[type] || colors.default;
  }

  getItems() {
    return [...this.items];
  }

  destroy() {
    this.close();
    this.items = [];
    this.selectedItem = null;
  }
}

export default ApartmentInventoryUI;