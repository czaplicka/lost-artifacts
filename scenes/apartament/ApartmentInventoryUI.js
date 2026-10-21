// ApartmentInventoryUI.js
// ============================================================
// Inventory dla ApartmentScene.
//
// Obsługuje:
// - zbieranie przedmiotów;
// - wybieranie dwóch itemów;
// - kombinowanie zgodnie z COMBINE_RULES;
// - wyświetlanie opisu przedmiotu;
// - stronicowanie listy (gdy przedmiotów jest więcej niż miejsc);
// - bezpieczne zamykanie i odświeżanie UI.
//
// Artefakt jest normalnie widoczny w inventory, ale nie podlega
// kombinowaniu. Logika zapisu artefaktu do gameState pozostaje
// w ApartmentScene.collectMissionArtifact().
// ============================================================


import { EventBus } from '../../EventBus.js';
import { COMBINE_RULES } from './ApartmentObjectsPool.js';


const ITEM_HEIGHT = 70;
const LIST_TOP = 60;
const FOOTER_HEIGHT = 70;


export class ApartmentInventoryUI {
  constructor(scene) {
    this.scene = scene;


    this.items = [];
    this.selectedItem = null;


    this.page = 0;


    this.isOpen = false;
    this.container = null;
  }


  /**
   * Dodaje item do inventory.
   *
   * Identyczne itemy są stackowane. Artefakt zwykle jest dodawany
   * tylko jeden raz przez ApartmentScene, ale ten kod pozostaje
   * bezpieczny także wtedy, gdy addItem dostanie ten sam id ponownie.
   */
  addItem(itemConfig) {
    if (!itemConfig?.id) {
      console.warn('[ApartmentInventoryUI] Cannot add item without id.');
      return false;
    }


    const existingItem = this.items.find(item => item.id === itemConfig.id);
    const quantity = Math.max(1, Number(itemConfig.quantity) || 1);


    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + quantity;
    } else {
      this.items.push({
        ...itemConfig,
        quantity
      });
    }


    this.updateDisplay();
    return true;
  }


  /**
   * Sprawdza, czy inventory zawiera przedmiot.
   */
  hasItem(itemId) {
    return this.items.some(
      item => item.id === itemId && (item.quantity || 0) > 0
    );
  }


  /**
   * Usuwa określoną liczbę sztuk itemu.
   * silent: true = bez odświeżania panelu (wywołujący odświeży sam).
   */
  removeItem(itemId, quantity = 1, { silent = false } = {}) {
    const item = this.items.find(inventoryItem => inventoryItem.id === itemId);


    if (!item || (item.quantity || 0) < quantity) {
      return false;
    }


    item.quantity -= quantity;


    if (item.quantity <= 0) {
      this.items = this.items.filter(
        inventoryItem => inventoryItem.id !== itemId
      );


      if (this.selectedItem?.id === itemId) {
        this.selectedItem = null;
      }
    }


    if (!silent) {
      this.updateDisplay();
    }


    return true;
  }


  /**
   * Otwiera/zamyka panel inventory.
   */
  toggle() {
    if (this.isOpen) {
      this.close();
      return;
    }


    this.open();
  }


  open() {
    if (this.isOpen || !this.scene?.sys?.isActive()) {
      return;
    }


    this.isOpen = true;
    this.createUI();
  }


  close() {
    this.isOpen = false;


    if (this.container?.active) {
      this.container.destroy(true);
    }


    this.container = null;
  }


  /**
   * Ile przedmiotów mieści się na jednej stronie panelu.
   */
  getItemsPerPage(panelHeight) {
    return Math.max(
      1,
      Math.floor((panelHeight - LIST_TOP - FOOTER_HEIGHT) / ITEM_HEIGHT)
    );
  }


  changePage(delta) {
    this.page += delta;
    this.updateDisplay();
  }


  /**
   * Buduje pełny panel inventory.
   */
  createUI() {
    if (!this.scene?.sys?.isActive()) {
      return;
    }


    const { width, height } = this.scene.scale;


    const panelWidth = Math.min(400, width - 40);
    const panelHeight = Math.min(500, height - 40);


    const panelX = width - panelWidth - 20;
    const panelY = height - panelHeight - 20;


    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(9999);


    const background = this.scene.add.rectangle(
      panelX + panelWidth / 2,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      0.95
    );


    background.setStrokeStyle(3, 0xffd700);
    this.container.add(background);


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


    const closeButton = this.scene.add.text(
      panelX + panelWidth - 24,
      panelY + 13,
      '[X]',
      {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#ff6b6b'
      }
    );


    closeButton.setOrigin(1, 0);
    closeButton.setInteractive({ useHandCursor: true });


    closeButton.on('pointerdown', () => this.close());
    this.container.add(closeButton);


    if (!this.items.length) {
      const emptyText = this.scene.add.text(
        panelX + 15,
        panelY + 62,
        'No items collected yet.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '15px',
          color: '#aaaaaa'
        }
      );


      this.container.add(emptyText);
    } else {
      const perPage = this.getItemsPerPage(panelHeight);
      const totalPages = Math.max(1, Math.ceil(this.items.length / perPage));


      this.page = Math.min(Math.max(0, this.page), totalPages - 1);


      if (totalPages > 1) {
        this.createPager(panelX, panelY, totalPages);
      }


      const start = this.page * perPage;
      const visibleItems = this.items.slice(start, start + perPage);


      let yOffset = LIST_TOP;


      for (const item of visibleItems) {
        this.createItemButton(
          item,
          panelX + 15,
          panelY + yOffset,
          panelWidth - 30
        );


        yOffset += ITEM_HEIGHT;
      }
    }


    const infoText = this.scene.add.text(
      panelX + 15,
      panelY + panelHeight - 48,
      this.getInstructionText(),
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
   * Przyciski stron w nagłówku panelu.
   */
  createPager(panelX, panelY, totalPages) {
    const y = panelY + 15;


    const makeArrow = (x, label, delta, enabled) => {
      const arrow = this.scene.add.text(x, y, label, {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: enabled ? '#ffd700' : '#555555'
      });


      if (enabled) {
        arrow.setInteractive({ useHandCursor: true });
        arrow.on('pointerdown', () => this.changePage(delta));
      }


      this.container.add(arrow);
    };


    makeArrow(panelX + 215, '<', -1, this.page > 0);


    const pageText = this.scene.add.text(
      panelX + 240,
      y + 2,
      `${this.page + 1}/${totalPages}`,
      {
        fontFamily: 'SpecialElite',
        fontSize: '14px',
        color: '#ffffff'
      }
    );


    this.container.add(pageText);


    makeArrow(panelX + 290, '>', 1, this.page < totalPages - 1);
  }


  /**
   * Tekst instrukcji zależny od bieżącego zaznaczenia.
   */
  getInstructionText() {
    if (this.selectedItem) {
      return `Selected: ${this.selectedItem.label}\nClick another compatible item to combine.`;
    }


    return 'Click an item to inspect or combine it.';
  }


  /**
   * Tworzy widoczny element itemu na panelu.
   */
  createItemButton(item, x, y, width) {
    const height = 60;
    const isSelected = this.selectedItem?.id === item.id;


    const buttonBackground = this.scene.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      isSelected ? 0x4a3b18 : 0x333333,
      0.9
    );


    buttonBackground.setStrokeStyle(
      isSelected ? 3 : 2,
      isSelected ? 0xffd700 : 0x888888
    );


    buttonBackground.setInteractive({ useHandCursor: true });
    this.container.add(buttonBackground);


    const nameText = this.scene.add.text(
      x + 10,
      y + 8,
      item.label || 'Unknown Item',
      {
        fontFamily: 'SpecialElite',
        fontSize: '14px',
        color: this.getItemNameColor(item),
        wordWrap: { width: width - 78 }
      }
    );


    this.container.add(nameText);


    if ((item.quantity || 1) > 1) {
      const quantityText = this.scene.add.text(
        x + width - 10,
        y + 8,
        `×${item.quantity}`,
        {
          fontFamily: 'SpecialElite',
          fontSize: '13px',
          color: '#ffd700'
        }
      );


      quantityText.setOrigin(1, 0);
      this.container.add(quantityText);
    }


    const badgeText = this.getItemTypeLabel(item);
    const badgeWidth = Math.max(54, badgeText.length * 8 + 12);


    const typeBackground = this.scene.add.rectangle(
      x + badgeWidth / 2,
      y + 43,
      badgeWidth,
      18,
      this.getTypeColor(item.type),
      0.8
    );


    typeBackground.setStrokeStyle(1, 0xffffff);
    this.container.add(typeBackground);


    const typeText = this.scene.add.text(
      x + badgeWidth / 2,
      y + 43,
      badgeText,
      {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: '#ffffff'
      }
    );


    typeText.setOrigin(0.5);
    this.container.add(typeText);


    if (isSelected) {
      const selectedText = this.scene.add.text(
        x + width - 10,
        y + 39,
        'SELECTED',
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: '#ffd700'
        }
      );


      selectedText.setOrigin(1, 0.5);
      this.container.add(selectedText);
    }


    buttonBackground.on('pointerover', () => {
      if (!buttonBackground.active) {
        return;
      }


      buttonBackground.setStrokeStyle(2, 0xffd700);
      this.showItemDescription(item);
    });


    buttonBackground.on('pointerout', () => {
      if (!buttonBackground.active) {
        return;
      }


      buttonBackground.setStrokeStyle(
        isSelected ? 3 : 2,
        isSelected ? 0xffd700 : 0x888888
      );
    });


    buttonBackground.on('pointerdown', () => {
      this.handleItemClick(item);
    });
  }


  /**
   * Obsługuje kliknięcie itemu.
   */
  handleItemClick(item) {
    if (!item?.id) {
      return;
    }


    if (!this.selectedItem) {
      this.selectItem(item);
      return;
    }


    if (this.selectedItem.id === item.id) {
      this.deselectItem();
      return;
    }


    this.tryCombine(item);
  }


  /**
   * Pokazuje opis itemu bezpośrednio w UI gry.
   */
  showItemDescription(item) {
    if (!item) {
      return;
    }


    const description = item.description ||
      item.hint ||
      'No additional information available.';


    this.scene?.showDescription?.(
      `${item.label || 'Unknown Item'}: ${description}`
    );
  }


  /**
   * Wybiera pierwszy przedmiot do kombinacji.
   */
  selectItem(item) {
    if (!this.canSelectForCombination(item)) {
      this.showItemDescription(item);


      this.scene?.showMessage(
        `${item.label} is evidence, not a craft project.`,
        1800,
        '#37474f'
      );


      return;
    }


    this.selectedItem = item;


    this.scene?.showMessage(
      `Selected: ${item.label}. Click another item to combine.`,
      1800,
      '#4caf50'
    );


    this.updateDisplay();
  }


  /**
   * Odznacza aktualnie wybrany przedmiot.
   */
  deselectItem() {
    if (!this.selectedItem) {
      return;
    }


    const previousSelection = this.selectedItem;
    this.selectedItem = null;


    this.scene?.showMessage(
      `Deselected: ${previousSelection.label}.`,
      1200,
      '#37474f'
    );


    this.updateDisplay();
  }


  /**
   * Artefakty i red herringi są dowodami / dekoracją,
   * a nie materiałami do craftingu.
   */
  canSelectForCombination(item) {
    if (!item) {
      return false;
    }


    return !item.isArtifact && !item.isRedHerring;
  }


  /**
   * Próbuje połączyć wybrany item z drugim itemem.
   */
  tryCombine(otherItem) {
    if (!this.selectedItem || !otherItem) {
      return false;
    }


    if (!this.canSelectForCombination(otherItem)) {
      this.showItemDescription(otherItem);


      this.scene?.showMessage(
        `${otherItem.label} does not combine with anything.`,
        1800,
        '#37474f'
      );


      return false;
    }


    const selectedItem = this.selectedItem;
    const itemIds = [selectedItem.id, otherItem.id];


    const matchingRule = Object.values(COMBINE_RULES).find(rule => {
      if (!Array.isArray(rule.requires) || rule.requires.length !== 2) {
        return false;
      }


      return rule.requires.every(requiredId => itemIds.includes(requiredId));
    });


    if (!matchingRule) {
      this.scene?.showMessage(
        `${selectedItem.label} and ${otherItem.label} do not seem to fit together.`,
        2000,
        '#ff6b6b'
      );


      // Celowo nie odznaczamy pierwszego itemu:
      // gracz może od razu kliknąć kolejny przedmiot.
      return false;
    }


    this.combine(matchingRule);
    return true;
  }


  /**
   * Wykonuje poprawną kombinację.
   */
  combine(rule) {
    if (!rule?.requires || !rule?.produces) {
      return false;
    }


    const hasAllRequiredItems = rule.requires.every(itemId =>
      this.hasItem(itemId)
    );


    if (!hasAllRequiredItems) {
      this.scene?.showMessage(
        'You no longer have all the items needed for that combination.',
        1800,
        '#ff6b6b'
      );


      return false;
    }


    // Składniki usuwamy po cichu, panel odświeżamy raz na końcu.
    for (const itemId of rule.requires) {
      this.removeItem(itemId, 1, { silent: true });
    }


    this.addItem({
      ...rule.produces,
      quantity: rule.produces.quantity || 1
    });


    this.selectedItem = null;


    this.scene?.showMessage(
      `Combined! You now have: ${rule.produces.label}`,
      2500,
      '#4caf50'
    );


    EventBus.emit('itemCombined', {
      result: rule.produces,
      rule
    });


    this.updateDisplay();
    return true;
  }


  /**
   * Odświeża panel, ale tylko jeśli jest aktualnie otwarty.
   */
  updateDisplay() {
    if (!this.isOpen) {
      return;
    }


    this.close();
    this.open();
  }


  /**
   * Etykieta typu wyświetlana na badge.
   */
  getItemTypeLabel(item) {
    if (item.isArtifact || item.type === 'artifact') {
      return 'ARTEFACT';
    }


    if (item.isEscapeClue) {
      return 'LEAD';
    }


    if (item.isClue) {
      return 'CLUE';
    }


    if (item.isRedHerring) {
      return 'ODD';
    }


    if (item.type === 'key') {
      return 'KEY';
    }


    return String(item.type || 'item').toUpperCase();
  }


  /**
   * Kolor tła badge.
   */
  getTypeColor(type) {
    const colors = {
      artifact: 0x7e57c2,
      key: 0xffd700,
      document: 0x8b7355,
      photo: 0x5b8db8,
      object: 0x607d8b,
      clue: 0xff6b6b,
      decoration: 0xdaa520,
      default: 0x696969
    };


    return colors[type] || colors.default;
  }


  /**
   * Kolor nazwy itemu zależny od roli.
   */
  getItemNameColor(item) {
    if (item.isArtifact || item.type === 'artifact') {
      return '#d1c4e9';
    }


    if (item.isEscapeClue) {
      return '#ffcc80';
    }


    if (item.isClue) {
      return '#ffffff';
    }


    if (item.isRedHerring) {
      return '#b0bec5';
    }


    return '#ffffff';
  }


  /**
   * Kopia listy itemów — bez możliwości podmiany tablicy.
   */
  getItems() {
    return this.items.map(item => ({ ...item }));
  }


  destroy() {
    this.close();


    this.items = [];
    this.selectedItem = null;
    this.page = 0;
    this.scene = null;
  }
}


export default ApartmentInventoryUI;