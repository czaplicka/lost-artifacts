import { EventBus } from '../EventBus.js';
import { inventoryManager } from '../InventoryManager.js';

export class InventoryUI {
    constructor(scene) {
        this.scene = scene;
        this.isVisible = false;
        this.container = null;
        this.selectedItem = null;
        this.tooltipText = null;
        this.closeHandler = null;
        this._renderPending = false;  // ✅ Throttle flag

        this.colors = {
            background: '#1a1a2e',
            border: '#d4af37',
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

        this.slotSize = 70;
        this.slotPadding = 8;
        this.cols = 4;
        this.rows = 3;
        this.width = (this.slotSize + this.slotPadding) * this.cols + 40;
        this.height = (this.slotSize + this.slotPadding) * this.rows + 120;

        // ✅ Bound handlers (stable references for cleanup)
        this.handleInventoryToggled = (isOpen) => this.handleToggle(isOpen);
        this.handleInventoryUpdated = () => this.scheduleRender();
    }

    initialize() {
        this._generateStaticTextures();  // ✅ Generuj tekstury RAZ
        this.createContainer();
        this.createButton();
        this.attachKeyListener();

        // ✅ Użyj scene.eventBus (auto-cleanup na shutdown)
        if (this.scene.eventBus) {
            this.scene.eventBus.on('inventoryToggled', this.handleInventoryToggled);
            this.scene.eventBus.on('inventoryUpdated', this.handleInventoryUpdated);
        } else {
            // Fallback do globalnego z manual cleanup
            EventBus.on('inventoryToggled', this.handleInventoryToggled, this, this.scene);
            EventBus.on('inventoryUpdated', this.handleInventoryUpdated, this, this.scene);
        }
    }

    /**
     * ✅ Generuj tekstury JEDNORAZOWO — nie w każdym render()
     */
    _generateStaticTextures() {
        // Panel background
        if (!this.scene.textures.exists('inventoryPanel')) {
            const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(Phaser.Display.Color.HexStringToColor(this.colors.background).color, 0.95);
            g.fillRect(0, 0, this.width, this.height);
            g.lineStyle(3, Phaser.Display.Color.HexStringToColor(this.colors.border).color);
            g.strokeRect(0, 0, this.width, this.height);
            g.generateTexture('inventoryPanel', this.width, this.height);
            g.destroy();
        }

        // Slot texture (jedna dla wszystkich!)
        if (!this.scene.textures.exists('inventorySlot')) {
            const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(Phaser.Display.Color.HexStringToColor(this.colors.slot).color, 0.7);
            g.fillRect(0, 0, this.slotSize, this.slotSize);
            g.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.colors.border).color);
            g.strokeRect(0, 0, this.slotSize, this.slotSize);
            g.generateTexture('inventorySlot', this.slotSize, this.slotSize);
            g.destroy();
        }

        // Button texture
        if (!this.scene.textures.exists('inventoryBtn')) {
            const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(Phaser.Display.Color.HexStringToColor(this.colors.slot).color, 0.9);
            g.fillCircle(35, 35, 33);
            g.lineStyle(3, Phaser.Display.Color.HexStringToColor(this.colors.border).color);
            g.strokeCircle(35, 35, 33);
            g.generateTexture('inventoryBtn', 70, 70);
            g.destroy();
        }

        // ✅ Qty badge (jedna tekstura, reużywana)
        if (!this.scene.textures.exists('itemQtyBadge')) {
            const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xd4af37, 0.9);
            g.fillCircle(10, 10, 10);
            g.generateTexture('itemQtyBadge', 20, 20);
            g.destroy();
        }
    }

    /**
     * ✅ Throttled render — max 1x per frame
     */
    scheduleRender() {
        if (this._renderPending) return;
        this._renderPending = true;

        // ✅ Defer do następnej klatki
        this.scene.time.delayedCall(0, () => {
            this._renderPending = false;
            if (this.isVisible) this.render();
        });
    }

    createContainer() {
        const panelX = this.scene.cameras.main.width - this.width - 20;
        const panelY = 60;

        this.panel = this.scene.add.image(panelX, panelY, 'inventoryPanel');
        this.panel.setOrigin(1, 0);
        this.panel.setDepth(1000);
        this.panel.setAlpha(0);
        this.panel.setInteractive();

        this.container = this.scene.add.container(panelX - this.width + 20, panelY + 50);
        this.container.setDepth(1001);
        this.container.setAlpha(0);

        this.titleText = this.scene.add.text(
            panelX - this.width + 20,
            panelY + 15,
            'INVENTORY',
            { fontFamily: 'PressStart2P', fontSize: '16px', fill: this.colors.border }
        );
        this.titleText.setDepth(1001).setAlpha(0);

        this.counterText = this.scene.add.text(
            panelX - 30,
            panelY + 15,
            `0/${inventoryManager.maxSlots}`,
            { fontFamily: 'SpecialElite', fontSize: '12px', fill: this.colors.text }
        );
        this.counterText.setOrigin(1, 0).setDepth(1001).setAlpha(0);

        this.tooltip = this.scene.add.text(
            panelX - this.width + 20,
            panelY + this.height - 50,
            '',
            {
                fontFamily: 'SpecialElite',
                fontSize: '11px',
                fill: this.colors.text,
                wordWrap: { width: this.width - 40 }
            }
        );
        this.tooltip.setDepth(1001).setAlpha(0);

        const closeBtn = this.scene.add.text(
            panelX - 30,
            panelY + 15,
            '[X]',
            { fontFamily: 'PressStart2P', fontSize: '12px', fill: this.colors.border }
        );
        closeBtn.setOrigin(1, 0).setDepth(1001).setAlpha(0);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerup', () => inventoryManager.close());

        // ✅ stopPropagation tylko gdzie potrzeba
        this.panel.on('pointerdown', (e) => e.stopPropagation());

        this.closeButton = closeBtn;
        this.panelX = panelX;
        this.panelY = panelY;

        // ✅ Cache rect dla hitTest (nie tworzyć co klik)
        this._panelRect = new Phaser.Geom.Rectangle(
            panelX - this.width,
            panelY,
            this.width,
            this.height
        );
    }

    createButton() {
        const btnX = this.scene.cameras.main.width - 70;
        const btnY = this.scene.cameras.main.height - 70;

        this.button = this.scene.add.image(btnX, btnY, 'inventoryBtn');
        this.button.setDepth(999).setInteractive({ useHandCursor: true });

        const icon = this.scene.add.text(btnX, btnY, '🎒', { fontSize: '28px' });
        icon.setOrigin(0.5).setDepth(1000);
        this.button.icon = icon;

        const hoverColor = Phaser.Display.Color.HexStringToColor(this.colors.hover).color;
        this.button.on('pointerover', () => this.button.setTint(hoverColor));
        this.button.on('pointerout', () => this.button.clearTint());
        this.button.on('pointerup', () => inventoryManager.toggleInventory());
    }

    handleToggle(isOpen) {
        isOpen ? this.show() : this.hide();
    }

    show() {
        if (this.isVisible) return;
        this.isVisible = true;

        const targets = [
            this.panel, this.container, this.titleText,
            this.counterText, this.tooltip, this.closeButton
        ].filter(Boolean);

        // ✅ Track tween
        if (this.scene.addTrackedTween) {
            this.scene.addTrackedTween(this.scene.tweens.add({
                targets, alpha: 1, duration: 200, ease: 'Quad.easeOut'
            }));
        } else {
            this.scene.tweens.add({ targets, alpha: 1, duration: 200, ease: 'Quad.easeOut' });
        }

        this.render();

        // ✅ closeHandler tworzony raz jako bound method
        if (!this.closeHandler) {
            this.closeHandler = (pointer) => {
                if (!Phaser.Geom.Rectangle.Contains(this._panelRect, pointer.x, pointer.y)) {
                    inventoryManager.close();
                }
            };
        }

        this.scene.input.on('pointerdown', this.closeHandler);
    }

    hide() {
        if (!this.isVisible) return;
        this.isVisible = false;

        const targets = [
            this.panel, this.container, this.titleText,
            this.counterText, this.tooltip, this.closeButton
        ].filter(Boolean);

        if (this.scene.addTrackedTween) {
            this.scene.addTrackedTween(this.scene.tweens.add({
                targets, alpha: 0, duration: 150, ease: 'Quad.easeIn'
            }));
        } else {
            this.scene.tweens.add({ targets, alpha: 0, duration: 150, ease: 'Quad.easeIn' });
        }

        if (this.closeHandler) {
            this.scene.input.off('pointerdown', this.closeHandler);
        }
    }

    /**
     * ✅ render() bez generateTexture — reużywa 'inventorySlot'
     */
    render() {
        if (!this.scene || !this.container || !this.counterText) return;

        this.container.removeAll(true);

        const items = inventoryManager.getAllItems();

        for (let i = 0; i < inventoryManager.maxSlots; i++) {
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            const x = col * (this.slotSize + this.slotPadding);
            const y = row * (this.slotSize + this.slotPadding);

            // ✅ Reużyj 'inventorySlot' texture — nie generuj nowej!
            const slot = this.scene.add.image(x, y, 'inventorySlot').setOrigin(0);
            this.container.add(slot);

            if (items[i]) {
                this._renderItem(items[i], col, row, x, y);
            }
        }

        const { current, max } = inventoryManager.getCapacity();
        this.counterText.setText(`${current}/${max}`);
    }

    /**
     * ✅ Uproszczony renderItem — bez duplikatu logiki
     */
    _renderItem(item, col, row, x, y) {
        const cx = x + this.slotSize / 2;

        const iconText = this.scene.add.text(cx, y + 20, item.icon, { fontSize: '32px' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const nameText = this.scene.add.text(cx, y + 50, item.name.substring(0, 8), {
            fontFamily: 'SpecialElite',
            fontSize: '9px',
            fill: this.colors.text,
            align: 'center'
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        this.container.add([iconText, nameText]);

        // ✅ Qty badge — reużywa 'itemQtyBadge' texture
        if (item.quantity > 1) {
            const bx = x + this.slotSize - 10;
            const by = y + this.slotSize - 10;

            const qtyImg = this.scene.add.image(bx, by, 'itemQtyBadge').setOrigin(0.5);
            const qtyText = this.scene.add.text(bx, by, `${item.quantity}`, {
                fontFamily: 'PressStart2P',
                fontSize: '10px',
                fill: '#000'
            }).setOrigin(0.5);

            this.container.add([qtyImg, qtyText]);
        }

        // ✅ Handlers bez inline arrow functions (stable references)
        const onOver = () => {
            iconText.setTint(Phaser.Display.Color.HexStringToColor(this.colors.hover).color);
            if (this.isVisible) this.showTooltip(item);
        };
        const onOut = () => {
            iconText.clearTint();
            this.hideTooltip();
        };
        const onSelect = () => this.selectItem(item);

        iconText.on('pointerover', onOver).on('pointerout', onOut).on('pointerup', onSelect);
        nameText.on('pointerover', onOver).on('pointerout', onOut).on('pointerup', onSelect);
    }

    showTooltip(item) {
        this.tooltip?.setText(`${item.name}\n${item.type.toUpperCase()}\n${item.description}`);
    }

    hideTooltip() {
        this.tooltip?.setText('');
    }

    selectItem(item) {
        this.selectedItem = item;
        EventBus.emit('inventoryItemSelected', item);
    }

    attachKeyListener() {
        this.keyIHandler = () => inventoryManager.toggleInventory();
        this.keyEscHandler = () => { if (this.isVisible) inventoryManager.close(); };

        this.scene.input.keyboard.on('keydown-I', this.keyIHandler, this);
        this.scene.input.keyboard.on('keydown-ESC', this.keyEscHandler, this);
    }

    destroy() {
        // ✅ EventBus cleanup
        if (this.scene?.eventBus) {
            this.scene.eventBus.off('inventoryToggled', this.handleInventoryToggled);
            this.scene.eventBus.off('inventoryUpdated', this.handleInventoryUpdated);
        } else {
            EventBus.off('inventoryToggled', this.handleInventoryToggled, this);
            EventBus.off('inventoryUpdated', this.handleInventoryUpdated, this);
        }

        if (this.closeHandler) {
            this.scene?.input?.off('pointerdown', this.closeHandler);
            this.closeHandler = null;
        }

        if (this.keyIHandler) {
            this.scene?.input?.keyboard?.off('keydown-I', this.keyIHandler);
            this.keyIHandler = null;
        }

        if (this.keyEscHandler) {
            this.scene?.input?.keyboard?.off('keydown-ESC', this.keyEscHandler);
            this.keyEscHandler = null;
        }

        // ✅ Cleanup wygenerowanych tekstur ze sceny
        ['inventoryPanel', 'inventorySlot', 'inventoryBtn', 'itemQtyBadge'].forEach(key => {
            if (this.scene?.textures?.exists(key)) {
                this.scene.textures.remove(key);
            }
        });

        this.panel?.destroy();
        this.container?.destroy();
        this.titleText?.destroy();
        this.counterText?.destroy();
        this.tooltip?.destroy();
        this.closeButton?.destroy();
        this.button?.icon?.destroy();
        this.button?.destroy();

        this.panel = null;
        this.container = null;
        this.titleText = null;
        this.counterText = null;
        this.tooltip = null;
        this.closeButton = null;
        this.button = null;
        this.selectedItem = null;
        this.isVisible = false;
        this._panelRect = null;
        this.scene = null;
    }
}