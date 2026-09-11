import { EventBus } from '../EventBus.js';
import { inventoryManager } from '../InventoryManager.js';

export class InventoryPanelUI {
    constructor(scene) {
        this.scene = scene;

        this.isOpen = false;
        this.selectedItem = null;

        this.container = null;
        this.backdrop = null;
        this.panel = null;

        this.titleText = null;
        this.counterText = null;
        this.descriptionText = null;
        this.selectedText = null;
        this.closeButton = null;

        this.slotObjects = [];

        this._created = false;
        this._destroyed = false;
        this._renderPending = false;
        this._renderTimer = null;

        this.columns = 6;
        this.rows = 3;
        this.slotSize = 76;
        this.slotGap = 10;

        this.panelWidth = 680;
        this.panelHeight = 470;

        this.colors = {
            backdrop: 0x000000,
            panel: 0x1c1720,
            panelBorder: 0xd4af37,
            slot: 0x2a2330,
            slotBorder: 0x7e6839,
            selected: 0xffd447,
            text: '#f2eadc',
            mutedText: '#bcae99'
        };

        this.handleInventoryUpdated = () => {
            this.scheduleRender();
        };

        this.handleSelectionChanged = (item) => {
            if (this._destroyed) {
                return;
            }

            this.selectedItem = item || null;

            if (this.isOpen) {
                this.scheduleRender();
            }
        };

        this.handleToggleInventory = (isOpen) => {
            if (this._destroyed) {
                return;
            }

            if (isOpen) {
                this.openFromManager();
            } else {
                this.closeFromManager();
            }
        };

        this.handleEscape = () => {
            if (this.isOpen) {
                inventoryManager.close();
            }
        };

        this.handleBackdropPointerUp = (pointer) => {
            pointer.event?.stopPropagation?.();
            inventoryManager.close();
        };

        this.handlePanelPointerDown = (pointer) => {
            pointer.event?.stopPropagation?.();
        };

        this.handleCloseButtonPointerUp = (pointer) => {
            pointer.event?.stopPropagation?.();
            inventoryManager.close();
        };

        this.handleSceneShutdown = () => {
            this.destroy();
        };
    }

    create() {
        if (this._created || this._destroyed || !this.scene) {
            return;
        }

        this._created = true;

        this.createBackdrop();
        this.createPanel();

        EventBus.on(
            'inventoryUpdated',
            this.handleInventoryUpdated,
            this
        );

        EventBus.on(
            'inventorySelectionChanged',
            this.handleSelectionChanged,
            this
        );

        EventBus.on(
            'inventoryToggled',
            this.handleToggleInventory,
            this
        );

        this.scene.input.keyboard?.on(
            'keydown-ESC',
            this.handleEscape,
            this
        );

        this.scene.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            this.handleSceneShutdown,
            this
        );

        this.scene.events.once(
            Phaser.Scenes.Events.DESTROY,
            this.handleSceneShutdown,
            this
        );

        this.selectedItem = inventoryManager.getSelectedItem();

        this.setVisible(false);

        if (inventoryManager.isOpen) {
            this.openFromManager(true);
        }
    }

    createBackdrop() {
        const { width, height } = this.scene.scale;

        this.backdrop = this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            this.colors.backdrop,
            0.62
        );

        this.backdrop
            .setDepth(9000)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: false });

        this.backdrop.on(
            'pointerup',
            this.handleBackdropPointerUp,
            this
        );
    }

    createPanel() {
        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(
            width / 2,
            height / 2
        );

        this.container
            .setDepth(9001)
            .setScrollFactor(0);

        this.panel = this.scene.add.rectangle(
            0,
            0,
            this.panelWidth,
            this.panelHeight,
            this.colors.panel,
            0.98
        );

        this.panel.setStrokeStyle(
            4,
            this.colors.panelBorder,
            1
        );

        this.panel.setInteractive();
        this.panel.on(
            'pointerdown',
            this.handlePanelPointerDown,
            this
        );

        this.container.add(this.panel);

        this.titleText = this.scene.add.text(
            -this.panelWidth / 2 + 28,
            -this.panelHeight / 2 + 24,
            'INVENTORY',
            {
                fontFamily: 'PressStart2P',
                fontSize: '20px',
                color: '#f6d976'
            }
        );

        this.titleText.setOrigin(0, 0);

        this.counterText = this.scene.add.text(
            this.panelWidth / 2 - 72,
            -this.panelHeight / 2 + 28,
            '0 / 12',
            {
                fontFamily: 'SpecialElite',
                fontSize: '18px',
                color: this.colors.text
            }
        );

        this.counterText.setOrigin(1, 0);

        this.closeButton = this.scene.add.text(
            this.panelWidth / 2 - 26,
            -this.panelHeight / 2 + 22,
            '[X]',
            {
                fontFamily: 'PressStart2P',
                fontSize: '14px',
                color: '#f6d976'
            }
        );

        this.closeButton
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true });

        this.closeButton.on(
            'pointerup',
            this.handleCloseButtonPointerUp,
            this
        );

        const divider = this.scene.add.rectangle(
            0,
            -this.panelHeight / 2 + 64,
            this.panelWidth - 48,
            2,
            this.colors.panelBorder,
            0.75
        );

        this.selectedText = this.scene.add.text(
            -this.panelWidth / 2 + 28,
            this.panelHeight / 2 - 110,
            '',
            {
                fontFamily: 'SpecialElite',
                fontSize: '18px',
                color: '#f6d976',
                wordWrap: {
                    width: this.panelWidth - 56
                }
            }
        );

        this.selectedText.setOrigin(0, 0);

        this.descriptionText = this.scene.add.text(
            -this.panelWidth / 2 + 28,
            this.panelHeight / 2 - 76,
            'Select an item, then use it on something suspicious.',
            {
                fontFamily: 'SpecialElite',
                fontSize: '16px',
                color: this.colors.mutedText,
                wordWrap: {
                    width: this.panelWidth - 56
                }
            }
        );

        this.descriptionText.setOrigin(0, 0);

        this.container.add([
            this.titleText,
            this.counterText,
            this.closeButton,
            divider,
            this.selectedText,
            this.descriptionText
        ]);
    }

    /**
     * Publiczna metoda dla PlayerHudScene i PlayerMenuUI.
     * Zmienia stan managera, który emituje inventoryToggled.
     */
    open() {
        if (this._destroyed || !this._created) {
            console.warn(
                '[InventoryPanelUI] Cannot open: panel has not been created.'
            );

            return false;
        }

        inventoryManager.open();

        return true;
    }

    /**
     * Reakcja na EventBus: inventoryToggled(true).
     * Nie wywołuje ponownie inventoryManager.open(), więc nie ma pętli.
     */
    openFromManager(immediate = false) {
        if (
            this._destroyed
            || this.isOpen
            || !this.backdrop
            || !this.container
        ) {
            return;
        }

        this.isOpen = true;
        this.selectedItem = inventoryManager.getSelectedItem();

        this.render();
        this.setVisible(true);

        this.scene.tweens.killTweensOf([
            this.backdrop,
            this.container
        ]);

        if (immediate) {
            this.backdrop.setAlpha(1);
            this.container.setAlpha(1);
            this.container.setScale(1);

            return;
        }

        this.backdrop.setAlpha(0);
        this.container.setAlpha(0);
        this.container.setScale(0.94);

        this.scene.tweens.add({
            targets: [this.backdrop, this.container],
            alpha: 1,
            duration: 150,
            ease: 'Quad.easeOut'
        });

        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            duration: 180,
            ease: 'Back.easeOut'
        });
    }

    /**
     * Publiczna metoda dla PlayerHudScene.
     */
    close() {
        if (this._destroyed || !this._created) {
            return false;
        }

        inventoryManager.close();

        return true;
    }

    /**
     * Reakcja na EventBus: inventoryToggled(false).
     */
    closeFromManager() {
        if (
            this._destroyed
            || !this.isOpen
            || !this.backdrop
            || !this.container
        ) {
            return;
        }

        this.isOpen = false;

        this.scene.tweens.killTweensOf([
            this.backdrop,
            this.container
        ]);

        this.scene.tweens.add({
            targets: [this.backdrop, this.container],
            alpha: 0,
            duration: 120,
            ease: 'Quad.easeIn',
            onComplete: () => {
                if (!this._destroyed && !this.isOpen) {
                    this.setVisible(false);
                }
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    setVisible(visible) {
        this.backdrop?.setVisible(visible);
        this.container?.setVisible(visible);
    }

    scheduleRender() {
        if (
            this._destroyed
            || !this._created
            || this._renderPending
            || !this.scene?.sys?.isActive()
        ) {
            return;
        }

        this._renderPending = true;

        this._renderTimer = this.scene.time.delayedCall(0, () => {
            this._renderPending = false;
            this._renderTimer = null;

            if (this._destroyed || !this.isOpen) {
                return;
            }

            this.render();
        });
    }

    render() {
        if (
            this._destroyed
            || !this._created
            || !this.container?.active
        ) {
            return;
        }

        this.selectedItem = inventoryManager.getSelectedItem();

        this.slotObjects.forEach((object) => {
            object?.destroy?.();
        });

        this.slotObjects = [];

        const items = inventoryManager.getAllItems();

        const gridWidth = (
            this.columns * this.slotSize
            + (this.columns - 1) * this.slotGap
        );

        const gridStartX = -gridWidth / 2 + this.slotSize / 2;
        const gridStartY = -80;

        for (
            let index = 0;
            index < inventoryManager.maxSlots;
            index += 1
        ) {
            const col = index % this.columns;
            const row = Math.floor(index / this.columns);

            const x = gridStartX + col * (
                this.slotSize + this.slotGap
            );

            const y = gridStartY + row * (
                this.slotSize + this.slotGap
            );

            this.createSlot(x, y, items[index] || null);
        }

        const capacity = inventoryManager.getCapacity();

        this.counterText?.setText(
            `${capacity.current} / ${capacity.max}`
        );

        this.updateDescription();
    }

    createSlot(x, y, item) {
        const isSelected = Boolean(
            item
            && this.selectedItem?.id === item.id
        );

        const slot = this.scene.add.rectangle(
            x,
            y,
            this.slotSize,
            this.slotSize,
            this.colors.slot,
            0.95
        );

        slot.setStrokeStyle(
            isSelected ? 4 : 2,
            isSelected
                ? this.colors.selected
                : this.colors.slotBorder,
            1
        );

        this.container.add(slot);
        this.slotObjects.push(slot);

        if (!item) {
            return;
        }

        slot.setInteractive({
            useHandCursor: true
        });

        const icon = this.scene.add.text(
            x,
            y - 12,
            item.icon || '📦',
            {
                fontSize: '30px'
            }
        );

        icon.setOrigin(0.5);
        icon.setInteractive({
            useHandCursor: true
        });

        const itemName = item.name.length > 11
            ? `${item.name.slice(0, 10)}…`
            : item.name;

        const label = this.scene.add.text(
            x,
            y + 22,
            itemName,
            {
                fontFamily: 'SpecialElite',
                fontSize: '11px',
                color: this.colors.text,
                align: 'center',
                wordWrap: {
                    width: this.slotSize - 8
                }
            }
        );

        label.setOrigin(0.5);
        label.setInteractive({
            useHandCursor: true
        });

        const clickItem = (pointer) => {
            pointer.event?.stopPropagation?.();
            this.selectItem(item);
        };

        slot.on('pointerup', clickItem);
        icon.on('pointerup', clickItem);
        label.on('pointerup', clickItem);

        this.container.add([
            icon,
            label
        ]);

        this.slotObjects.push(
            icon,
            label
        );

        if (item.quantity > 1) {
            const quantityBackground = this.scene.add.circle(
                x + this.slotSize / 2 - 10,
                y - this.slotSize / 2 + 10,
                12,
                this.colors.selected,
                1
            );

            const quantityText = this.scene.add.text(
                quantityBackground.x,
                quantityBackground.y,
                String(item.quantity),
                {
                    fontFamily: 'PressStart2P',
                    fontSize: '10px',
                    color: '#1a1410'
                }
            );

            quantityText.setOrigin(0.5);

            this.container.add([
                quantityBackground,
                quantityText
            ]);

            this.slotObjects.push(
                quantityBackground,
                quantityText
            );
        }
    }

    selectItem(item) {
        if (!item?.id) {
            return;
        }

        const currentItem = inventoryManager.getSelectedItem();

        if (currentItem?.id === item.id) {
            inventoryManager.clearSelection();

            EventBus.emit('showDialogue', {
                speaker: 'Detective',
                text: 'Item put away. For now.'
            });

            return;
        }

        inventoryManager.selectItem(item.id);

        EventBus.emit('showDialogue', {
            speaker: 'Detective',
            text: `${item.name}. Let's see what this helps with.`
        });
    }

    updateDescription() {
        const selectedItem = inventoryManager.getSelectedItem();

        if (!selectedItem) {
            this.selectedText?.setText('');

            this.descriptionText?.setText(
                'Select an item, then use it on something suspicious.'
            );

            return;
        }

        this.selectedText?.setText(
            `USING: ${selectedItem.name}`
        );

        this.descriptionText?.setText(
            selectedItem.description
            || 'This item has no description. That is suspicious in itself.'
        );
    }

    destroy() {
        if (this._destroyed) {
            return;
        }

        this._destroyed = true;
        this._created = false;
        this.isOpen = false;

        if (inventoryManager.isOpen) {
            inventoryManager.close();
        }

        if (this._renderTimer) {
            this._renderTimer.remove(false);
            this._renderTimer = null;
        }

        this._renderPending = false;

        EventBus.off(
            'inventoryUpdated',
            this.handleInventoryUpdated,
            this
        );

        EventBus.off(
            'inventorySelectionChanged',
            this.handleSelectionChanged,
            this
        );

        EventBus.off(
            'inventoryToggled',
            this.handleToggleInventory,
            this
        );

        this.scene?.input?.keyboard?.off(
            'keydown-ESC',
            this.handleEscape,
            this
        );

        this.scene?.events?.off(
            Phaser.Scenes.Events.SHUTDOWN,
            this.handleSceneShutdown,
            this
        );

        this.scene?.events?.off(
            Phaser.Scenes.Events.DESTROY,
            this.handleSceneShutdown,
            this
        );

        this.scene?.tweens?.killTweensOf([
            this.backdrop,
            this.container
        ]);

        this.backdrop?.off(
            'pointerup',
            this.handleBackdropPointerUp,
            this
        );

        this.panel?.off(
            'pointerdown',
            this.handlePanelPointerDown,
            this
        );

        this.closeButton?.off(
            'pointerup',
            this.handleCloseButtonPointerUp,
            this
        );

        this.slotObjects.forEach((object) => {
            object?.destroy?.();
        });

        this.slotObjects = [];

        this.backdrop?.destroy();
        this.container?.destroy();

        this.backdrop = null;
        this.container = null;
        this.panel = null;
        this.titleText = null;
        this.counterText = null;
        this.descriptionText = null;
        this.selectedText = null;
        this.closeButton = null;
        this.selectedItem = null;

        this.handleInventoryUpdated = null;
        this.handleSelectionChanged = null;
        this.handleToggleInventory = null;
        this.handleEscape = null;
        this.handleBackdropPointerUp = null;
        this.handlePanelPointerDown = null;
        this.handleCloseButtonPointerUp = null;
        this.handleSceneShutdown = null;

        this.scene = null;
    }
}