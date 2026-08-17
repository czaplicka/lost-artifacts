import { EventBus } from '../EventBus.js';
import { inventoryManager } from '../InventoryManager.js';

export class InventoryUI {
    constructor(scene) {
        this.scene = scene;
        this.isVisible = false;
        this.container = null;
        this.selectedItem = null;
        this.tooltipText = null;

        // Stylizacja
        this.colors = {
            background: '#1a1a2e',
            border: '#d4af37', // Gold (Indiana Jones style)
            text: '#eaeaea',
            hover: '#f4b860',
            slot: '#2a2a3e',
            shadow: '#000000'
        };

        this.itemTypeColors = {
            clue: '#4a9eff',
            evidence: '#ff4a4a',
            key: '#ffd700',
            document: '#d4af37',
            misc: '#888888'
        };

        // Rozmiary
        this.slotSize = 70;
        this.slotPadding = 8;
        this.cols = 4;
        this.rows = 3;
        this.width = (this.slotSize + this.slotPadding) * this.cols + 40;
        this.height = (this.slotSize + this.slotPadding) * this.rows + 120;

        // Nasłuchuj zdarzeń
this.handleInventoryToggled = (isOpen) => this.handleToggle(isOpen);
this.handleInventoryUpdated = () => this.render();

EventBus.on(
  'inventoryToggled',
  this.handleInventoryToggled,
  this,
);

EventBus.on(
  'inventoryUpdated',
  this.handleInventoryUpdated,
  this,
);
    }

    /**
     * Inicjalizuj UI (uruchom raz per scena)
     */
    initialize() {
        this.createContainer();
        this.createButton();
        this.attachKeyListener();
    }

    /**
     * Stwórz główny kontener inventory
     */
    createContainer() {
        // Główny panel
        const panelX = this.scene.cameras.main.width - this.width - 20;
        const panelY = 60;

        // Tło
        const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(Phaser.Display.Color.HexStringToColor(this.colors.background).color, 0.95);
        graphics.fillRect(0, 0, this.width, this.height);

        // Ramka
        graphics.lineStyle(3, Phaser.Display.Color.HexStringToColor(this.colors.border).color);
        graphics.strokeRect(0, 0, this.width, this.height);

        const texture = graphics.generateTexture('inventoryPanel', this.width, this.height);
        graphics.destroy();

        this.panel = this.scene.add.image(panelX, panelY, 'inventoryPanel');
        this.panel.setOrigin(1, 0);
        this.panel.setDepth(1000);
        this.panel.setAlpha(0);
        this.panel.setInteractive();

        // Container dla przedmiotów
        this.container = this.scene.add.container(panelX - this.width + 20, panelY + 50);
        this.container.setDepth(1001);
        this.container.setAlpha(0);

        // Tytuł
        this.titleText = this.scene.add.text(
            panelX - this.width + 20,
            panelY + 15,
            'INVENTORY',
            { fontFamily: 'PressStart2P', fontSize: '16px', fill: this.colors.border }
        );
        this.titleText.setDepth(1001);
        this.titleText.setAlpha(0);

        // Licznik przedmiotów
        this.counterText = this.scene.add.text(
            panelX - 30,
            panelY + 15,
            `0/${inventoryManager.maxSlots}`,
            { fontFamily: 'SpecialElite', fontSize: '12px', fill: this.colors.text }
        );
        this.counterText.setOrigin(1, 0);
        this.counterText.setDepth(1001);
        this.counterText.setAlpha(0);

        // Tooltip
        this.tooltip = this.scene.add.text(
            panelX - this.width + 20,
            panelY + this.height - 50,
            '',
            { fontFamily: 'SpecialElite', fontSize: '11px', fill: this.colors.text, wordWrap: { width: this.width - 40 } }
        );
        this.tooltip.setDepth(1001);
        this.tooltip.setAlpha(0);

        // Przycisk zamknięcia
        const closeBtn = this.scene.add.text(
            panelX - 30,
            panelY + 15,
            '[X]',
            { fontFamily: 'PressStart2P', fontSize: '12px', fill: this.colors.border }
        );
        closeBtn.setOrigin(1, 0);
        closeBtn.setDepth(1001);
        closeBtn.setAlpha(0);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerup', () => inventoryManager.close());

        // Obsługa klikania na panel (aby się nie zamknął)
        this.panel.on('pointerdown', (e) => e.stopPropagation());
        this.container.on('pointerdown', (e) => e.stopPropagation());

        this.closeButton = closeBtn;
        this.panelX = panelX;
        this.panelY = panelY;
    }

    /**
     * Stwórz przycisk otwierania inventory (koło menu)
     */
    createButton() {
        const btnX = this.scene.cameras.main.width - 70;
        const btnY = this.scene.cameras.main.height - 70;

        const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        
        // Koło (bg)
        graphics.fillStyle(Phaser.Display.Color.HexStringToColor(this.colors.slot).color, 0.9);
        graphics.fillCircle(35, 35, 33);
        graphics.lineStyle(3, Phaser.Display.Color.HexStringToColor(this.colors.border).color);
        graphics.strokeCircle(35, 35, 33);

        const texture = graphics.generateTexture('inventoryBtn', 70, 70);
        graphics.destroy();

        this.button = this.scene.add.image(btnX, btnY, 'inventoryBtn');
        this.button.setDepth(999);
        this.button.setInteractive({ useHandCursor: true });

        // Ikonka plecaka
        const icon = this.scene.add.text(
            btnX,
            btnY,
            '🎒',
            { fontSize: '28px' }
        );
        icon.setOrigin(0.5);
        icon.setDepth(1000);
        this.button.icon = icon;

        // Hover efekt
        this.button.on('pointerover', () => {
            this.button.setTint(Phaser.Display.Color.HexStringToColor(this.colors.hover).color);
        });
        this.button.on('pointerout', () => {
            this.button.clearTint();
        });

        this.button.on('pointerup', () => inventoryManager.toggleInventory());
    }

    /**
     * Obsłuż toggle inventory
     */
    handleToggle(isOpen) {
        if (isOpen) {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Pokaż inventory
     */
    show() {
        if (this.isVisible) return;
        this.isVisible = true;

        // Animacja pojawiania się
        this.scene.tweens.add({
            targets: [this.panel, this.container, this.titleText, this.counterText, this.tooltip, this.closeButton],
            alpha: 1,
            duration: 200,
            ease: 'Quad.easeOut'
        });

        this.render();

        // Obsługa zamykania na klik poza inventory
        this.closeHandler = (pointer) => {
            const isInPanel = Phaser.Geom.Rectangle.Contains(
                new Phaser.Geom.Rectangle(
                    this.panelX - this.width,
                    this.panelY,
                    this.width,
                    this.height
                ),
                pointer.x,
                pointer.y
            );
            if (!isInPanel) {
                inventoryManager.close();
            }
        };
        this.scene.input.on('pointerdown', this.closeHandler);
    }

    /**
     * Ukryj inventory
     */
    hide() {
        if (!this.isVisible) return;
        this.isVisible = false;

        // Animacja znikania
        this.scene.tweens.add({
            targets: [this.panel, this.container, this.titleText, this.counterText, this.tooltip, this.closeButton],
            alpha: 0,
            duration: 150,
            ease: 'Quad.easeIn'
        });

        if (this.closeHandler) {
            this.scene.input.off('pointerdown', this.closeHandler);
        }
    }

    /**
     * Renderuj przedmioty w slotach
     */
    render() {
  if (!this.scene || !this.container || !this.counterText) {
    return;
  }

  this.container.removeAll(true);

        const items = inventoryManager.getAllItems();

        // Rysuj sloty
        for (let i = 0; i < inventoryManager.maxSlots; i++) {
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            const x = col * (this.slotSize + this.slotPadding);
            const y = row * (this.slotSize + this.slotPadding);

            const slotGraphics = this.scene.make.graphics({ x, y, add: false });
            slotGraphics.fillStyle(Phaser.Display.Color.HexStringToColor(this.colors.slot).color, 0.7);
            slotGraphics.fillRect(0, 0, this.slotSize, this.slotSize);
            slotGraphics.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.colors.border).color);
            slotGraphics.strokeRect(0, 0, this.slotSize, this.slotSize);

            const slotTexture = slotGraphics.generateTexture(`inventorySlot_${i}`, this.slotSize, this.slotSize);
            slotGraphics.destroy();

            const slot = this.scene.add.image(0, 0, `inventorySlot_${i}`);
            slot.setOrigin(0);
            this.container.add(slot);

            // Dodaj przedmiot jeśli istnieje
            if (items[i]) {
                this.renderItem(items[i], i, x, y);
            }
        }

        // Aktualizuj licznik
        const { current, max } = inventoryManager.getCapacity();
        this.counterText.setText(`${current}/${max}`);
    }

    /**
     * Renderuj pojedynczy przedmiot
     */
    renderItem(item, index, x, y) {
        const col = index % this.cols;
        const row = Math.floor(index / this.cols);
        const slotX = col * (this.slotSize + this.slotPadding);
        const slotY = row * (this.slotSize + this.slotPadding);

        // Ikona przedmiotu
        const iconText = this.scene.add.text(
            slotX + this.slotSize / 2,
            slotY + 20,
            item.icon,
            { fontSize: '32px' }
        );
        iconText.setOrigin(0.5);
        this.container.add(iconText);

        // Nazwa przedmiotu (skrócona)
        const nameText = this.scene.add.text(
            slotX + this.slotSize / 2,
            slotY + 50,
            item.name.substring(0, 8),
            { fontFamily: 'SpecialElite', fontSize: '9px', fill: this.colors.text, align: 'center' }
        );
        nameText.setOrigin(0.5);
        this.container.add(nameText);

        // Quantity badge
        if (item.quantity > 1) {
            const qtyBg = this.scene.make.graphics({ x: slotX + this.slotSize - 15, y: slotY + this.slotSize - 15, add: false });
            qtyBg.fillStyle(Phaser.Display.Color.HexStringToColor(this.itemTypeColors[item.type] || this.colors.text).color, 0.9);
            qtyBg.fillCircle(0, 0, 10);
            const qtyTexture = qtyBg.generateTexture(`itemQty_${item.id}`, 20, 20);
            qtyBg.destroy();

            const qtyImg = this.scene.add.image(0, 0, `itemQty_${item.id}`);
            this.container.add(qtyImg);

            const qtyText = this.scene.add.text(0, 0, `${item.quantity}`, { fontFamily: 'PressStart2P', fontSize: '10px', fill: '#000' });
            qtyText.setOrigin(0.5);
            this.container.add(qtyText);
        }

        // Interaktywność
        iconText.setInteractive({ useHandCursor: true });
        nameText.setInteractive({ useHandCursor: true });

        const hoverHandler = () => {
            iconText.setTint(Phaser.Display.Color.HexStringToColor(this.colors.hover).color);
            if (this.isVisible) {
                this.showTooltip(item);
            }
        };

        const outHandler = () => {
            iconText.clearTint();
            this.hideTooltip();
        };

        iconText.on('pointerover', hoverHandler);
        nameText.on('pointerover', hoverHandler);
        iconText.on('pointerout', outHandler);
        nameText.on('pointerout', outHandler);

        iconText.on('pointerup', () => {
            this.selectItem(item);
        });
        nameText.on('pointerup', () => {
            this.selectItem(item);
        });
    }

    /**
     * Pokaż tooltip
     */
    showTooltip(item) {
        const tooltipText = `${item.name}\n${item.type.toUpperCase()}\n${item.description}`;
        this.tooltip.setText(tooltipText);
    }

    /**
     * Ukryj tooltip
     */
    hideTooltip() {
        this.tooltip.setText('');
    }

    /**
     * Zaznacz przedmiot
     */
    selectItem(item) {
        this.selectedItem = item;
        EventBus.emit('inventoryItemSelected', item);
    }

    /**
     * Obsługa klawisza do otwarcia (I jak Inventory)
     */
attachKeyListener() {
  this.keyIHandler = () => {
    inventoryManager.toggleInventory();
  };

  this.keyEscHandler = () => {
    if (this.isVisible) {
      inventoryManager.close();
    }
  };

  this.scene.input.keyboard.on(
    'keydown-I',
    this.keyIHandler,
    this,
  );

  this.scene.input.keyboard.on(
    'keydown-ESC',
    this.keyEscHandler,
    this,
  );
}

    /**
     * Zniszcz UI
     */
    destroy() {
  EventBus.off(
    'inventoryToggled',
    this.handleInventoryToggled,
    this,
  );

  EventBus.off(
    'inventoryUpdated',
    this.handleInventoryUpdated,
    this,
  );

  if (this.closeHandler) {
    this.scene.input.off('pointerdown', this.closeHandler);
    this.closeHandler = null;
  }

  if (this.keyIHandler) {
    this.scene.input.keyboard.off('keydown-I', this.keyIHandler);
    this.keyIHandler = null;
  }

  if (this.keyEscHandler) {
    this.scene.input.keyboard.off('keydown-ESC', this.keyEscHandler);
    this.keyEscHandler = null;
  }

  if (this.panel) this.panel.destroy();
  if (this.container) this.container.destroy();
  if (this.titleText) this.titleText.destroy();
  if (this.counterText) this.counterText.destroy();
  if (this.tooltip) this.tooltip.destroy();
  if (this.closeButton) this.closeButton.destroy();

  if (this.button) {
    this.button.icon?.destroy();
    this.button.destroy();
  }

  this.panel = null;
  this.container = null;
  this.titleText = null;
  this.counterText = null;
  this.tooltip = null;
  this.closeButton = null;
  this.button = null;
  this.selectedItem = null;
  this.isVisible = false;
  this.scene = null;
}
}