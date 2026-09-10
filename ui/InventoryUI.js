import { EventBus } from '../EventBus.js';
import { inventoryManager } from '../InventoryManager.js';

export class InventoryUI {
    constructor(scene) {
        this.scene = scene;

        this.isVisible = false;

        this.container = null;
        this.panel = null;
        this.titleText = null;
        this.counterText = null;
        this.tooltip = null;
        this.closeButton = null;
        this.button = null;
        this.selectedLabel = null;

        // Cache UI aktualnego globalnego wyboru.
        // Źródłem prawdy zawsze pozostaje InventoryManager.
        this.selectedItem = null;

        this._panelRect = null;
        this._renderPending = false;
        this._renderTimer = null;
        this._destroyed = false;
        this._initialized = false;

        this.colors = {
            background: '#1a1a2e',
            border: '#d4af37',
            text: '#eaeaea',
            hover: '#f4b860',
            selected: '#ffd700',
            slot: '#2a2a3e',
            shadow: '#000000'
        };

        this.slotSize = 70;
        this.slotPadding = 8;
        this.cols = 4;
        this.rows = 3;

        this.width = (this.slotSize + this.slotPadding) * this.cols + 40;
        this.height = (this.slotSize + this.slotPadding) * this.rows + 135;

        this.handleInventoryToggled = (isOpen) => this.handleToggle(isOpen);

        this.handleInventoryUpdated = () => {
            this.scheduleRender();
        };

        this.handleInventorySelectionChanged = (item) => {
            this.selectedItem = item || null;

            if (this.isVisible) {
                this.scheduleRender();
            }
        };

        this.handleOutsidePointerDown = (pointer) => {
            if (
                this._destroyed ||
                !this.isVisible ||
                !this._panelRect
            ) {
                return;
            }

            if (!Phaser.Geom.Rectangle.Contains(
                this._panelRect,
                pointer.x,
                pointer.y
            )) {
                inventoryManager.close();
            }
        };

        this.handleKeyI = () => {
            if (!this._destroyed) {
                inventoryManager.toggleInventory();
            }
        };

        this.handleKeyEsc = () => {
            if (!this._destroyed && this.isVisible) {
                inventoryManager.close();
            }
        };

        this.handleCloseButtonPointerUp = (pointer) => {
            pointer.event?.stopPropagation?.();

            if (!this._destroyed) {
                inventoryManager.close();
            }
        };

        this.handleInventoryButtonPointerUp = (pointer) => {
            pointer.event?.stopPropagation?.();

            if (!this._destroyed) {
                inventoryManager.toggleInventory();
            }
        };

        this.handleInventoryButtonPointerOver = () => {
            if (this._destroyed || !this.button?.active) {
                return;
            }

            const hoverColor = Phaser.Display.Color.HexStringToColor(
                this.colors.hover
            ).color;

            this.button.setTint(hoverColor);
        };

        this.handleInventoryButtonPointerOut = () => {
            if (!this._destroyed) {
                this.button?.clearTint();
            }
        };

        this.handlePanelPointerDown = (pointer) => {
            pointer.event?.stopPropagation?.();
        };

        this.handleSceneShutdown = () => this.destroy();
    }

    initialize() {
        if (
            this._initialized ||
            this._destroyed ||
            !this.scene?.sys?.isActive()
        ) {
            return;
        }

        this._initialized = true;

        this._generateStaticTextures();
        this.createContainer();
        this.createButton();
        this.attachKeyListener();

        EventBus.on(
            'inventoryToggled',
            this.handleInventoryToggled,
            this
        );

        EventBus.on(
            'inventoryUpdated',
            this.handleInventoryUpdated,
            this
        );

        EventBus.on(
            'inventorySelectionChanged',
            this.handleInventorySelectionChanged,
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

        // Odtwórz globalny wybór po przejściu do nowej sceny.
        this.selectedItem = inventoryManager.getSelectedItem();

        this.render();

        if (inventoryManager.isOpen) {
            this.show(true);
        }
    }

    _generateStaticTextures() {
        if (!this.scene?.textures) {
            return;
        }

        if (!this.scene.textures.exists('inventoryPanel')) {
            const graphics = this.scene.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(
                Phaser.Display.Color.HexStringToColor(
                    this.colors.background
                ).color,
                0.95
            );

            graphics.fillRect(0, 0, this.width, this.height);

            graphics.lineStyle(
                3,
                Phaser.Display.Color.HexStringToColor(
                    this.colors.border
                ).color
            );

            graphics.strokeRect(0, 0, this.width, this.height);
            graphics.generateTexture(
                'inventoryPanel',
                this.width,
                this.height
            );

            graphics.destroy();
        }

        if (!this.scene.textures.exists('inventorySlot')) {
            const graphics = this.scene.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(
                Phaser.Display.Color.HexStringToColor(
                    this.colors.slot
                ).color,
                0.7
            );

            graphics.fillRect(0, 0, this.slotSize, this.slotSize);

            graphics.lineStyle(
                2,
                Phaser.Display.Color.HexStringToColor(
                    this.colors.border
                ).color
            );

            graphics.strokeRect(0, 0, this.slotSize, this.slotSize);

            graphics.generateTexture(
                'inventorySlot',
                this.slotSize,
                this.slotSize
            );

            graphics.destroy();
        }

        if (!this.scene.textures.exists('inventorySlotSelected')) {
            const graphics = this.scene.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(
                Phaser.Display.Color.HexStringToColor(
                    this.colors.slot
                ).color,
                0.95
            );

            graphics.fillRect(0, 0, this.slotSize, this.slotSize);

            graphics.lineStyle(
                3,
                Phaser.Display.Color.HexStringToColor(
                    this.colors.selected
                ).color
            );

            graphics.strokeRect(1, 1, this.slotSize - 2, this.slotSize - 2);

            graphics.generateTexture(
                'inventorySlotSelected',
                this.slotSize,
                this.slotSize
            );

            graphics.destroy();
        }

        if (!this.scene.textures.exists('inventoryBtn')) {
            const graphics = this.scene.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(
                Phaser.Display.Color.HexStringToColor(
                    this.colors.slot
                ).color,
                0.9
            );

            graphics.fillCircle(35, 35, 33);

            graphics.lineStyle(
                3,
                Phaser.Display.Color.HexStringToColor(
                    this.colors.border
                ).color
            );

            graphics.strokeCircle(35, 35, 33);
            graphics.generateTexture('inventoryBtn', 70, 70);

            graphics.destroy();
        }

        if (!this.scene.textures.exists('itemQtyBadge')) {
            const graphics = this.scene.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(0xd4af37, 0.9);
            graphics.fillCircle(10, 10, 10);
            graphics.generateTexture('itemQtyBadge', 20, 20);

            graphics.destroy();
        }
    }

    scheduleRender() {
        if (
            this._destroyed ||
            this._renderPending ||
            !this.scene?.sys?.isActive()
        ) {
            return;
        }

        this._renderPending = true;

        this._renderTimer = this.scene.time.delayedCall(0, () => {
            this._renderPending = false;
            this._renderTimer = null;

            if (
                this._destroyed ||
                !this.isVisible ||
                !this.scene?.sys?.isActive()
            ) {
                return;
            }

            this.render();
        });
    }

    createContainer() {
        const panelX = this.scene.cameras.main.width - 20;
        const panelY = 60;
        const contentX = panelX - this.width + 20;

        this.panel = this.scene.add.image(
            panelX,
            panelY,
            'inventoryPanel'
        );

        this.panel.setOrigin(1, 0);
        this.panel.setDepth(1000);
        this.panel.setAlpha(0);
        this.panel.setInteractive();
        this.panel.on(
            'pointerdown',
            this.handlePanelPointerDown,
            this
        );

        this.container = this.scene.add.container(
            contentX,
            panelY + 50
        );

        this.container.setDepth(1001);
        this.container.setAlpha(0);

        this.titleText = this.scene.add.text(
            contentX,
            panelY + 15,
            'INVENTORY',
            {
                fontFamily: 'PressStart2P',
                fontSize: '16px',
                fill: this.colors.border
            }
        );

        this.titleText.setDepth(1001);
        this.titleText.setAlpha(0);

        this.counterText = this.scene.add.text(
            panelX - 52,
            panelY + 15,
            `0/${inventoryManager.maxSlots}`,
            {
                fontFamily: 'SpecialElite',
                fontSize: '12px',
                fill: this.colors.text
            }
        );

        this.counterText.setOrigin(1, 0);
        this.counterText.setDepth(1001);
        this.counterText.setAlpha(0);

        this.closeButton = this.scene.add.text(
            panelX - 18,
            panelY + 15,
            '[X]',
            {
                fontFamily: 'PressStart2P',
                fontSize: '12px',
                fill: this.colors.border
            }
        );

        this.closeButton.setOrigin(1, 0);
        this.closeButton.setDepth(1001);
        this.closeButton.setAlpha(0);
        this.closeButton.setInteractive({
            useHandCursor: true
        });

        this.closeButton.on(
            'pointerup',
            this.handleCloseButtonPointerUp,
            this
        );

        this.selectedLabel = this.scene.add.text(
            contentX,
            panelY + this.height - 53,
            '',
            {
                fontFamily: 'SpecialElite',
                fontSize: '10px',
                fill: this.colors.selected,
                wordWrap: {
                    width: this.width - 40
                }
            }
        );

        this.selectedLabel.setDepth(1001);
        this.selectedLabel.setAlpha(0);

        this.tooltip = this.scene.add.text(
            contentX,
            panelY + this.height - 34,
            '',
            {
                fontFamily: 'SpecialElite',
                fontSize: '10px',
                fill: this.colors.text,
                wordWrap: {
                    width: this.width - 40
                }
            }
        );

        this.tooltip.setDepth(1001);
        this.tooltip.setAlpha(0);

        this.panelX = panelX;
        this.panelY = panelY;

        this._panelRect = new Phaser.Geom.Rectangle(
            panelX - this.width,
            panelY,
            this.width,
            this.height
        );
    }

    createButton() {
        const buttonX = this.scene.cameras.main.width - 70;
        const buttonY = this.scene.cameras.main.height - 70;

        this.button = this.scene.add.image(
            buttonX,
            buttonY,
            'inventoryBtn'
        );

        this.button.setDepth(999);
        this.button.setInteractive({
            useHandCursor: true
        });

        this.button.on(
            'pointerover',
            this.handleInventoryButtonPointerOver,
            this
        );

        this.button.on(
            'pointerout',
            this.handleInventoryButtonPointerOut,
            this
        );

        this.button.on(
            'pointerup',
            this.handleInventoryButtonPointerUp,
            this
        );

        this.button.icon = this.scene.add.text(
            buttonX,
            buttonY,
            '🎒',
            {
                fontSize: '28px'
            }
        );

        this.button.icon.setOrigin(0.5);
        this.button.icon.setDepth(1000);
    }

    attachKeyListener() {
        if (!this.scene?.input?.keyboard) {
            return;
        }

        this.scene.input.keyboard.on(
            'keydown-I',
            this.handleKeyI,
            this
        );

        this.scene.input.keyboard.on(
            'keydown-ESC',
            this.handleKeyEsc,
            this
        );
    }

    handleToggle(isOpen) {
        if (this._destroyed) {
            return;
        }

        if (isOpen) {
            this.show();
            return;
        }

        this.hide();
    }

    show(immediate = false) {
        if (this._destroyed || this.isVisible) {
            return;
        }

        this.isVisible = true;
        this.selectedItem = inventoryManager.getSelectedItem();

        this.render();

        const targets = this._getVisibilityTargets();

        this.scene.tweens.killTweensOf(targets);

        if (immediate) {
            targets.forEach((target) => target.setAlpha(1));
        } else {
            this.scene.tweens.add({
                targets,
                alpha: 1,
                duration: 200,
                ease: 'Quad.easeOut'
            });
        }

        this.scene.input.on(
            'pointerdown',
            this.handleOutsidePointerDown,
            this
        );
    }

    hide() {
        if (this._destroyed || !this.isVisible) {
            return;
        }

        this.isVisible = false;

        this.hideTooltip();

        this.scene.input.off(
            'pointerdown',
            this.handleOutsidePointerDown,
            this
        );

        const targets = this._getVisibilityTargets();

        this.scene.tweens.killTweensOf(targets);

        this.scene.tweens.add({
            targets,
            alpha: 0,
            duration: 150,
            ease: 'Quad.easeIn'
        });
    }

    _getVisibilityTargets() {
        return [
            this.panel,
            this.container,
            this.titleText,
            this.counterText,
            this.closeButton,
            this.selectedLabel,
            this.tooltip
        ].filter(Boolean);
    }

    render() {
        if (
            this._destroyed ||
            !this.scene?.sys?.isActive() ||
            !this.container?.active ||
            !this.counterText?.active
        ) {
            return;
        }

        this.selectedItem = inventoryManager.getSelectedItem();

        this.container.removeAll(true);

        const items = inventoryManager.getAllItems();

        for (let index = 0; index < inventoryManager.maxSlots; index += 1) {
            const col = index % this.cols;
            const row = Math.floor(index / this.cols);

            const x = col * (this.slotSize + this.slotPadding);
            const y = row * (this.slotSize + this.slotPadding);

            const item = items[index] || null;

            const isSelected = (
                item &&
                this.selectedItem?.id === item.id
            );

            const slot = this.scene.add.image(
                x,
                y,
                isSelected
                    ? 'inventorySlotSelected'
                    : 'inventorySlot'
            );

            slot.setOrigin(0);

            this.container.add(slot);

            if (item) {
                this._renderItem(item, x, y, isSelected);
            }
        }

        const { current, max } = inventoryManager.getCapacity();

        this.counterText.setText(`${current}/${max}`);

        if (this.selectedItem) {
            this.selectedLabel?.setText(
                `USING: ${this.selectedItem.name}`
            );
        } else {
            this.selectedLabel?.setText('');
        }
    }

    _renderItem(item, x, y, isSelected) {
        const centerX = x + this.slotSize / 2;

        const hoverColor = Phaser.Display.Color.HexStringToColor(
            this.colors.hover
        ).color;

        const iconText = this.scene.add.text(
            centerX,
            y + 20,
            item.icon,
            {
                fontSize: '32px'
            }
        );

        iconText.setOrigin(0.5);
        iconText.setInteractive({
            useHandCursor: true
        });

        if (isSelected) {
            iconText.setTint(
                Phaser.Display.Color.HexStringToColor(
                    this.colors.selected
                ).color
            );
        }

        const itemName = item.name.length > 10
            ? `${item.name.slice(0, 9)}…`
            : item.name;

        const nameText = this.scene.add.text(
            centerX,
            y + 50,
            itemName,
            {
                fontFamily: 'SpecialElite',
                fontSize: '9px',
                fill: this.colors.text,
                align: 'center'
            }
        );

        nameText.setOrigin(0.5);
        nameText.setInteractive({
            useHandCursor: true
        });

        const handleOver = () => {
            if (this._destroyed) {
                return;
            }

            iconText.setTint(hoverColor);
            this.showTooltip(item);
        };

        const handleOut = () => {
            if (this._destroyed) {
                return;
            }

            if (isSelected) {
                iconText.setTint(
                    Phaser.Display.Color.HexStringToColor(
                        this.colors.selected
                    ).color
                );
            } else {
                iconText.clearTint();
            }

            this.hideTooltip();
        };

        const handleSelect = (pointer) => {
            pointer.event?.stopPropagation?.();

            if (!this._destroyed) {
                this.selectItem(item);
            }
        };

        iconText.on('pointerover', handleOver);
        iconText.on('pointerout', handleOut);
        iconText.on('pointerup', handleSelect);

        nameText.on('pointerover', handleOver);
        nameText.on('pointerout', handleOut);
        nameText.on('pointerup', handleSelect);

        this.container.add([iconText, nameText]);

        if (item.quantity > 1) {
            const badgeX = x + this.slotSize - 10;
            const badgeY = y + this.slotSize - 10;

            const quantityBadge = this.scene.add.image(
                badgeX,
                badgeY,
                'itemQtyBadge'
            );

            quantityBadge.setOrigin(0.5);

            const quantityText = this.scene.add.text(
                badgeX,
                badgeY,
                `${item.quantity}`,
                {
                    fontFamily: 'PressStart2P',
                    fontSize: '10px',
                    fill: '#000000'
                }
            );

            quantityText.setOrigin(0.5);

            this.container.add([
                quantityBadge,
                quantityText
            ]);
        }
    }

    showTooltip(item) {
        if (this._destroyed || !this.tooltip?.active || !item) {
            return;
        }

        const type = (item.type || 'misc').toUpperCase();

        this.tooltip.setText(
            `${item.name}\n${type}\n${item.description || ''}`
        );
    }

    hideTooltip() {
        if (!this._destroyed) {
            this.tooltip?.setText('');
        }
    }

    /**
     * UI nie emituje inventoryItemSelected samodzielnie.
     * InventoryManager zarządza selection i emituje:
     * inventorySelectionChanged, inventoryItemSelected,
     * inventoryItemDeselected.
     */
    selectItem(item) {
        if (this._destroyed || !item?.id) {
            return;
        }

        const currentlySelected = inventoryManager.getSelectedItem();

        if (currentlySelected?.id === item.id) {
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

    destroy() {
        if (this._destroyed) {
            return;
        }

        this._destroyed = true;
        this._initialized = false;
        this.isVisible = false;

        if (this._renderTimer) {
            this._renderTimer.remove(false);
            this._renderTimer = null;
        }

        this._renderPending = false;

        EventBus.off(
            'inventoryToggled',
            this.handleInventoryToggled,
            this
        );

        EventBus.off(
            'inventoryUpdated',
            this.handleInventoryUpdated,
            this
        );

        EventBus.off(
            'inventorySelectionChanged',
            this.handleInventorySelectionChanged,
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

        this.scene?.input?.off(
            'pointerdown',
            this.handleOutsidePointerDown,
            this
        );

        this.scene?.input?.keyboard?.off(
            'keydown-I',
            this.handleKeyI,
            this
        );

        this.scene?.input?.keyboard?.off(
            'keydown-ESC',
            this.handleKeyEsc,
            this
        );

        this.scene?.tweens?.killTweensOf(
            this._getVisibilityTargets()
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

        this.button?.off(
            'pointerover',
            this.handleInventoryButtonPointerOver,
            this
        );

        this.button?.off(
            'pointerout',
            this.handleInventoryButtonPointerOut,
            this
        );

        this.button?.off(
            'pointerup',
            this.handleInventoryButtonPointerUp,
            this
        );

        this.container?.removeAll(true);

        this.panel?.destroy();
        this.container?.destroy();
        this.titleText?.destroy();
        this.counterText?.destroy();
        this.tooltip?.destroy();
        this.closeButton?.destroy();
        this.button?.icon?.destroy();
        this.button?.destroy();
        this.selectedLabel?.destroy();

        this.panel = null;
        this.container = null;
        this.titleText = null;
        this.counterText = null;
        this.tooltip = null;
        this.closeButton = null;
        this.button = null;
        this.selectedLabel = null;

        this.selectedItem = null;
        this._panelRect = null;

        this.handleInventoryToggled = null;
        this.handleInventoryUpdated = null;
        this.handleInventorySelectionChanged = null;
        this.handleOutsidePointerDown = null;
        this.handleKeyI = null;
        this.handleKeyEsc = null;
        this.handleCloseButtonPointerUp = null;
        this.handleInventoryButtonPointerUp = null;
        this.handleInventoryButtonPointerOver = null;
        this.handleInventoryButtonPointerOut = null;
        this.handlePanelPointerDown = null;
        this.handleSceneShutdown = null;

        this.scene = null;
    }
}