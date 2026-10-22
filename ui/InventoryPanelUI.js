import { EventBus } from '../EventBus.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { useItem, canUseItem } from '../managers/ItemUseService.js';

const DEFAULT_HINT = 'Select an item, then use it on something suspicious.';
const NO_DESCRIPTION = 'This item has no description. That is suspicious in itself.';
const MAX_NAME_LENGTH = 11;
const CONFIRM_RESET_MS = 4000;

const say = (text) => EventBus.emit('showDialogue', { speaker: 'Detective', text });

function normalizeItem(item) {
    if (!item || item.id === undefined || item.id === null) {
        return null;
    }

    return {
        ...item,
        id: item.id,
        name: String(item.name ?? 'Unknown'),
        icon: String(item.icon || '📦'),
        description: item.description ? String(item.description) : '',
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1))
    };
}

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

        this.useButton = null;
        this.useButtonBg = null;
        this.useButtonText = null;
        this._confirmItemId = null;
        this._confirmTimer = null;

        this.slotObjects = [];

        this._created = false;
        this._destroyed = false;
        this._renderPending = false;
        this._renderTimer = null;
        this._warnedSlotOverflow = false;

        this.columns = 6;
        this.rows = 3;
        this.slotSize = 76;
        this.slotGap = 10;

        this.panelWidth = 680;
        this.panelHeight = 470;

        this.useButtonWidth = 120;
        this.useButtonHeight = 40;

        this.colors = {
            backdrop: 0x000000,
            panel: 0x1c1720,
            panelBorder: 0xd4af37,
            slot: 0x2a2330,
            slotBorder: 0x7e6839,
            selected: 0xffd447,
            useActive: 0x3f6b3a,
            useHover: 0x4f8a49,
            useDisabled: 0x3a3340,
            text: '#f2eadc',
            mutedText: '#bcae99'
        };

        this.handleInventoryUpdated = () => this.scheduleRender();

        this.handleSelectionChanged = (item) => {
            if (this._destroyed) return;
            this.selectedItem = item || null;
            if (this._confirmItemId && this._confirmItemId !== item?.id) {
                this.clearConfirm();
            }
            if (this.isOpen) this.scheduleRender();
        };

        this.handleToggleInventory = (isOpen) => {
            if (this._destroyed) return;
            if (isOpen) this.openFromManager();
            else this.closeFromManager();
        };

        this.handleEscape = () => {
            if (this.isOpen) inventoryManager.close();
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

        this.handleUsePointerUp = (pointer) => {
            pointer.event?.stopPropagation?.();
            this.useSelectedItem();
        };

        this.handleUsePointerOver = () => {
            if (this.isUseEnabled()) {
                this.useButtonBg?.setFillStyle(this.colors.useHover, 1);
            }
        };

        this.handleUsePointerOut = () => this.updateUseButton();

        this.handleResize = (gameSize) => {
            if (this._destroyed || !this.backdrop || !this.container) return;
            const width = gameSize?.width ?? this.scene.scale.width;
            const height = gameSize?.height ?? this.scene.scale.height;

            this.backdrop.setPosition(width / 2, height / 2).setSize(width, height);
            this.backdrop.input?.hitArea?.setSize?.(width, height);
            this.container.setPosition(width / 2, height / 2);
        };

        this.handleSceneShutdown = () => this.destroy();
    }

    create() {
        if (this._created || this._destroyed || !this.scene) {
            return;
        }

        this._created = true;

        this.createBackdrop();
        this.createPanel();
        this.createUseButton();

        EventBus.on('inventoryUpdated', this.handleInventoryUpdated, this);
        EventBus.on('inventorySelectionChanged', this.handleSelectionChanged, this);
        EventBus.on('inventoryToggled', this.handleToggleInventory, this);

        this.scene.input.keyboard?.on('keydown-ESC', this.handleEscape, this);
        this.scene.scale.on('resize', this.handleResize, this);
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
        this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);

        this.selectedItem = inventoryManager.getSelectedItem();
        this.setVisible(false);

        if (inventoryManager.isOpen) {
            this.openFromManager(true);
        }
    }

    createBackdrop() {
        const { width, height } = this.scene.scale;

        this.backdrop = this.scene.add.rectangle(
            width / 2, height / 2, width, height, this.colors.backdrop, 0.62
        );

        this.backdrop
            .setDepth(9000)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: false });

        this.backdrop.on('pointerup', this.handleBackdropPointerUp, this);
    }

    createPanel() {
        const { width, height } = this.scene.scale;
        const left = -this.panelWidth / 2;
        const top = -this.panelHeight / 2;
        const textWidth = this.panelWidth - 56 - this.useButtonWidth - 24;

        this.container = this.scene.add.container(width / 2, height / 2);
        this.container.setDepth(9001).setScrollFactor(0);

        this.panel = this.scene.add.rectangle(
            0, 0, this.panelWidth, this.panelHeight, this.colors.panel, 0.98
        );
        this.panel.setStrokeStyle(4, this.colors.panelBorder, 1);
        this.panel.setInteractive();
        this.panel.on('pointerdown', this.handlePanelPointerDown, this);

        this.container.add(this.panel);

        this.titleText = this.scene.add
            .text(left + 28, top + 24, 'INVENTORY', {
                fontFamily: 'PressStart2P',
                fontSize: '20px',
                color: '#f6d976'
            })
            .setOrigin(0, 0);

        this.counterText = this.scene.add
            .text(this.panelWidth / 2 - 72, top + 28, '0 / 0', {
                fontFamily: 'SpecialElite',
                fontSize: '18px',
                color: this.colors.text
            })
            .setOrigin(1, 0);

        this.closeButton = this.scene.add
            .text(this.panelWidth / 2 - 26, top + 22, '[X]', {
                fontFamily: 'PressStart2P',
                fontSize: '14px',
                color: '#f6d976'
            })
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true });

        this.closeButton.on('pointerup', this.handleCloseButtonPointerUp, this);

        const divider = this.scene.add.rectangle(
            0, top + 64, this.panelWidth - 48, 2, this.colors.panelBorder, 0.75
        );

        this.selectedText = this.scene.add
            .text(left + 28, this.panelHeight / 2 - 110, '', {
                fontFamily: 'SpecialElite',
                fontSize: '18px',
                color: '#f6d976',
                wordWrap: { width: textWidth }
            })
            .setOrigin(0, 0);

        this.descriptionText = this.scene.add
            .text(left + 28, this.panelHeight / 2 - 76, DEFAULT_HINT, {
                fontFamily: 'SpecialElite',
                fontSize: '16px',
                color: this.colors.mutedText,
                wordWrap: { width: textWidth }
            })
            .setOrigin(0, 0);

        this.container.add([
            this.titleText,
            this.counterText,
            this.closeButton,
            divider,
            this.selectedText,
            this.descriptionText
        ]);
    }

    createUseButton() {
        const x = this.panelWidth / 2 - 28 - this.useButtonWidth / 2;
        const y = this.panelHeight / 2 - 28 - this.useButtonHeight / 2;

        this.useButtonBg = this.scene.add
            .rectangle(0, 0, this.useButtonWidth, this.useButtonHeight, this.colors.useDisabled, 1)
            .setStrokeStyle(3, this.colors.panelBorder, 1);

        this.useButtonText = this.scene.add
            .text(0, 0, 'USE', {
                fontFamily: 'PressStart2P',
                fontSize: '14px',
                color: '#f2eadc'
            })
            .setOrigin(0.5);

        this.useButton = this.scene.add.container(x, y, [this.useButtonBg, this.useButtonText]);

        this.useButtonBg.setInteractive({ useHandCursor: true });
        this.useButtonBg.on('pointerup', this.handleUsePointerUp, this);
        this.useButtonBg.on('pointerover', this.handleUsePointerOver, this);
        this.useButtonBg.on('pointerout', this.handleUsePointerOut, this);

        this.container.add(this.useButton);
        this.updateUseButton();
    }

    isUseEnabled() {
        return canUseItem(inventoryManager.getSelectedItem());
    }

    updateUseButton() {
        if (this._destroyed || !this.useButtonBg || !this.useButtonText) return;

        const selected = inventoryManager.getSelectedItem();
        const enabled = canUseItem(selected);
        const confirming = enabled && this._confirmItemId === selected.id;

        this.useButtonBg.setFillStyle(
            enabled ? this.colors.useActive : this.colors.useDisabled,
            1
        );
        this.useButtonBg.setAlpha(enabled ? 1 : 0.45);
        this.useButtonText.setText(confirming ? 'CONFIRM' : 'USE');
        this.useButtonText.setFontSize(confirming ? '11px' : '14px');
    }

    clearConfirm() {
        this._confirmItemId = null;
        this._confirmTimer?.remove(false);
        this._confirmTimer = null;
    }

    useSelectedItem() {
        if (this._destroyed || !this.isOpen) return;

        const selected = inventoryManager.getSelectedItem();

        if (!selected) {
            say('Select an item first. Detective work is not telepathy.');
            return;
        }

        if (!canUseItem(selected)) {
            say(`You can't use ${selected.name} that way. Believe me, you'd know.`);
            return;
        }

        const result = useItem(selected.id);

        if (result?.message) say(result.message);

        this.clearConfirm();

        if (result?.needsConfirm) {
            this._confirmItemId = selected.id;
            this._confirmTimer = this.scene.time.delayedCall(CONFIRM_RESET_MS, () => {
                this._confirmTimer = null;
                this._confirmItemId = null;
                this.updateUseButton();
            });
        }

        this.updateUseButton();
        this.scheduleRender();
    }

    /** Dla PlayerHudScene i PlayerMenuUI. Stan zmienia manager i emituje inventoryToggled. */
    open() {
        if (this._destroyed || !this._created) {
            console.warn('[InventoryPanelUI] Cannot open: panel has not been created.');
            return false;
        }

        inventoryManager.open();
        return true;
    }

    openFromManager(immediate = false) {
        if (this._destroyed || this.isOpen || !this.backdrop || !this.container) {
            return;
        }

        this.isOpen = true;
        this.selectedItem = inventoryManager.getSelectedItem();

        this.render();
        this.setVisible(true);

        this.scene.tweens.killTweensOf([this.backdrop, this.container]);

        if (immediate) {
            this.backdrop.setAlpha(1);
            this.container.setAlpha(1).setScale(1);
            return;
        }

        this.backdrop.setAlpha(0);
        this.container.setAlpha(0).setScale(0.94);

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

    close() {
        if (this._destroyed || !this._created) {
            return false;
        }

        inventoryManager.close();
        return true;
    }

    closeFromManager() {
        if (this._destroyed || !this.isOpen || !this.backdrop || !this.container) {
            return;
        }

        this.isOpen = false;
        this.clearConfirm();

        this.scene.tweens.killTweensOf([this.backdrop, this.container]);

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
        if (this.isOpen) this.close();
        else this.open();
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

            if (this._destroyed || !this.isOpen) return;

            this.render();
        });
    }

    clearSlots() {
        this.slotObjects.forEach((object) => object?.destroy?.());
        this.slotObjects = [];
    }

    render() {
        if (this._destroyed || !this._created || !this.container?.active) {
            return;
        }

        this.selectedItem = inventoryManager.getSelectedItem();
        this.clearSlots();

        const items = inventoryManager.getAllItems().map(normalizeItem);
        const visibleSlots = this.columns * this.rows;
        const totalSlots = inventoryManager.maxSlots;

        if (totalSlots > visibleSlots && !this._warnedSlotOverflow) {
            this._warnedSlotOverflow = true;
            console.warn(
                `[InventoryPanelUI] maxSlots (${totalSlots}) exceeds the grid ` +
                `(${visibleSlots}). Extra slots are not shown.`
            );
        }

        const slotCount = Math.min(totalSlots, visibleSlots);
        const step = this.slotSize + this.slotGap;
        const gridWidth = this.columns * this.slotSize + (this.columns - 1) * this.slotGap;
        const gridStartX = -gridWidth / 2 + this.slotSize / 2;
        const gridStartY = -80;

        for (let index = 0; index < slotCount; index += 1) {
            const col = index % this.columns;
            const row = Math.floor(index / this.columns);

            this.createSlot(
                gridStartX + col * step,
                gridStartY + row * step,
                items[index] || null
            );
        }

        const capacity = inventoryManager.getCapacity();
        this.counterText?.setText(`${capacity.current} / ${capacity.max}`);

        this.updateDescription();
        this.updateUseButton();
    }

    createSlot(x, y, item) {
        const isSelected = Boolean(item && this.selectedItem?.id === item.id);

        const slot = this.scene.add.rectangle(
            x, y, this.slotSize, this.slotSize, this.colors.slot, 0.95
        );

        slot.setStrokeStyle(
            isSelected ? 4 : 2,
            isSelected ? this.colors.selected : this.colors.slotBorder,
            1
        );

        this.container.add(slot);
        this.slotObjects.push(slot);

        if (!item) {
            return;
        }

        slot.setInteractive({ useHandCursor: true });

        const icon = this.scene.add
            .text(x, y - 12, item.icon, { fontSize: '30px' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const itemName = item.name.length > MAX_NAME_LENGTH
            ? `${item.name.slice(0, MAX_NAME_LENGTH - 1)}…`
            : item.name;

        const label = this.scene.add
            .text(x, y + 22, itemName, {
                fontFamily: 'SpecialElite',
                fontSize: '11px',
                color: this.colors.text,
                align: 'center',
                wordWrap: { width: this.slotSize - 8 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const clickItem = (pointer) => {
            pointer.event?.stopPropagation?.();
            this.selectItem(item);
        };

        slot.on('pointerup', clickItem);
        icon.on('pointerup', clickItem);
        label.on('pointerup', clickItem);

        this.container.add([icon, label]);
        this.slotObjects.push(icon, label);

        if (item.quantity > 1) {
            const badge = this.scene.add.circle(
                x + this.slotSize / 2 - 10,
                y - this.slotSize / 2 + 10,
                12,
                this.colors.selected,
                1
            );

            const quantityText = this.scene.add
                .text(badge.x, badge.y, String(item.quantity), {
                    fontFamily: 'PressStart2P',
                    fontSize: '10px',
                    color: '#1a1410'
                })
                .setOrigin(0.5);

            this.container.add([badge, quantityText]);
            this.slotObjects.push(badge, quantityText);
        }
    }

    selectItem(item) {
        if (!item?.id) {
            return;
        }

        if (inventoryManager.getSelectedItem()?.id === item.id) {
            inventoryManager.clearSelection();
            say('Item put away. For now.');
            return;
        }

        inventoryManager.selectItem(item.id);
        say(`${item.name}. Let's see what this helps with.`);
    }

    updateDescription() {
        const selected = normalizeItem(inventoryManager.getSelectedItem());

        if (!selected) {
            this.selectedText?.setText('');
            this.descriptionText?.setText(DEFAULT_HINT);
            return;
        }

        this.selectedText?.setText(`USING: ${selected.name}`);
        this.descriptionText?.setText(selected.description || NO_DESCRIPTION);
    }

    destroy() {
        if (this._destroyed) {
            return;
        }

        const scene = this.scene;

        this._destroyed = true;
        this._created = false;
        this.isOpen = false;

        if (inventoryManager.isOpen) {
            inventoryManager.close();
        }

        this._renderTimer?.remove(false);
        this._renderTimer = null;
        this._renderPending = false;
        this.clearConfirm();

        EventBus.off('inventoryUpdated', this.handleInventoryUpdated, this);
        EventBus.off('inventorySelectionChanged', this.handleSelectionChanged, this);
        EventBus.off('inventoryToggled', this.handleToggleInventory, this);

        scene?.input?.keyboard?.off('keydown-ESC', this.handleEscape, this);
        scene?.scale?.off('resize', this.handleResize, this);
        scene?.events?.off(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
        scene?.events?.off(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);

        if (this.backdrop || this.container) {
            scene?.tweens?.killTweensOf([this.backdrop, this.container].filter(Boolean));
        }

        this.backdrop?.off('pointerup', this.handleBackdropPointerUp, this);
        this.panel?.off('pointerdown', this.handlePanelPointerDown, this);
        this.closeButton?.off('pointerup', this.handleCloseButtonPointerUp, this);
        this.useButtonBg?.off('pointerup', this.handleUsePointerUp, this);
        this.useButtonBg?.off('pointerover', this.handleUsePointerOver, this);
        this.useButtonBg?.off('pointerout', this.handleUsePointerOut, this);

        this.clearSlots();

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
        this.useButton = null;
        this.useButtonBg = null;
        this.useButtonText = null;
        this.selectedItem = null;
        this.scene = null;
    }
}