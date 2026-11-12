import { canUsePhone } from './phoneAccess.js';

export class PlayerMenuUI {
    static _registry = new WeakMap();

    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;

        this.isOpen = false;
        this.isAnimating = false;
        this.debugHitboxes = false;
        this.crimeBoardAvailable = false;
        this.phoneAvailable = canUsePhone(scene);
        this.isDestroyed = false;

        this.boundToggleHandler = this.onToggleKeyDown.bind(this);
        this.boundResizeHandler = this.handleResize.bind(this);
        this.boundDebugHandler = this.onDebugKeyDown.bind(this);
        this.boundInventoryHandler = this.onInventoryKeyDown.bind(this);
        this.boundCrimeBoardHandler = this.onCrimeBoardKeyDown.bind(this);
        this.boundAccessHandler = this.refreshPhoneAvailability.bind(this);
        this.boundSceneEndHandler = () => this.destroy();

        const existing = PlayerMenuUI._registry.get(scene);

        if (existing && existing !== this) {
            existing.destroy();
        }

        PlayerMenuUI._registry.set(scene, this);

        const { width, height } = scene.scale;
        const isMobile = !scene.sys.game.device.os.desktop;

        this.config = {
            width: Math.min(1180, width * (isMobile ? 0.96 : 0.92)),
            height: isMobile ? 145 : 185,
            buttonAreaHeight: isMobile ? 145 : 185,
            buttonSize: isMobile ? 52 : 72,
            slotRadius: isMobile ? 28 : 38,
            fontSize: isMobile ? '9px' : '12px'
        };

        this.closedY = height + 12;
        this.openY = height - this.config.height;

        this.container = scene.add
            .container(width / 2, this.closedY)
            .setDepth(40);

        this.toggleContainer = null;
        this.toggleText = null;
        this.toggleArrows = null;

        this.menuButtons = [];
        this.buttonMap = new Map();
        this.debugGraphics = [];

        this.createCustomBackground();
        this.createToggleButton(width, height);
        this.createMenuButtons();

        this.bindKeyboardShortcut();
        this.bindDebugShortcut();
        this.bindInventoryShortcut();
        this.bindCrimeBoardShortcut();

        scene.scale.on('resize', this.boundResizeHandler, this);

        scene.events.on('update', this.boundAccessHandler);

        scene.events.once('shutdown', this.boundSceneEndHandler);
        scene.events.once('destroy', this.boundSceneEndHandler);

        this.updateMenuInteractivity();
    }

    bindKeyboardShortcut() {
        this.scene.input?.keyboard?.on(
            'keydown-M',
            this.boundToggleHandler
        );
    }

    bindInventoryShortcut() {
        this.scene.input?.keyboard?.on(
            'keydown-I',
            this.boundInventoryHandler
        );
    }

    bindCrimeBoardShortcut() {
        this.scene.input?.keyboard?.on(
            'keydown-C',
            this.boundCrimeBoardHandler
        );
    }

    bindDebugShortcut() {
        this.scene.input?.keyboard?.on(
            'keydown-H',
            this.boundDebugHandler
        );
    }

    shouldIgnoreShortcut(event) {
        return Boolean(
            this.isDestroyed ||
            !event ||
            event.repeat ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            this.isTypingInTextField()
        );
    }

    onToggleKeyDown(event) {
        if (
            this.shouldIgnoreShortcut(event) ||
            this.isAnimating
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation?.();
        this.toggle();
    }

    onInventoryKeyDown(event) {
        if (this.shouldIgnoreShortcut(event)) return;

        event.preventDefault();
        event.stopPropagation?.();
        this.openInventory();
    }

    onCrimeBoardKeyDown(event) {
        if (
            this.shouldIgnoreShortcut(event) ||
            !this.canOpenCrimeBoard()
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation?.();
        this.openCrimeBoard();
    }

    onDebugKeyDown(event) {
        if (this.shouldIgnoreShortcut(event)) return;
        this.toggleDebugHitboxes();
    }

    isTypingInTextField() {
        const element = document.activeElement;

        return Boolean(
            element?.tagName === 'INPUT' ||
            element?.tagName === 'TEXTAREA' ||
            element?.tagName === 'SELECT' ||
            element?.isContentEditable
        );
    }

    canOpenCrimeBoard() {
        if (this.isDestroyed || !this.scene) return false;

        const sceneKey = this.scene.currentGameplaySceneKey;

        if (
            sceneKey !== 'OfficeScene' &&
            sceneKey !== 'HotelScene'
        ) {
            return false;
        }

        return this.scene.isCrimeBoardAvailable?.() === true;
    }

    canOpenPhone() {
        return (
            !this.isDestroyed &&
            Boolean(this.scene) &&
            canUsePhone(this.scene)
        );
    }

    refreshPhoneAvailability() {
        if (this.isDestroyed || !this.scene) return;

        const available = this.canOpenPhone();

        if (available === this.phoneAvailable) return;

        this.phoneAvailable = available;

        if (!available) {
            this.scene._panelInstances
                ?.get('phoneUI')
                ?.close?.();
        }

        this.updateMenuInteractivity();

        if (this.debugHitboxes) {
            this.drawDebugHitboxes();
        }
    }

    isButtonAvailable(button) {
        if (button.key === 'telephone') {
            return this.phoneAvailable;
        }

        if (button.restricted) {
            return this.crimeBoardAvailable;
        }

        return true;
    }

    toggleDebugHitboxes() {
        this.debugHitboxes = !this.debugHitboxes;

        if (this.debugHitboxes) {
            this.drawDebugHitboxes();
        } else {
            this.clearDebugHitboxes();
        }
    }

    drawDebugHitboxes() {
        this.clearDebugHitboxes();

        const colors = [
            0xff595e,
            0xffca3a,
            0x8ac926,
            0x1982c4,
            0x6a4c93,
            0xff924c,
            0x52b788,
            0x9d4edd,
            0x00bbf9
        ];

        this.menuButtons.forEach((button, index) => {
            const hitArea = button.hitAreaObject;

            if (!hitArea || !hitArea.visible) return;

            const x = hitArea.x - hitArea.width / 2;
            const y = hitArea.y - hitArea.height / 2;
            const color = colors[index % colors.length];

            const graphics = this.scene.add.graphics();

            graphics.fillStyle(color, 0.15);
            graphics.lineStyle(2, color, 1);
            graphics.fillRect(x, y, hitArea.width, hitArea.height);
            graphics.strokeRect(x, y, hitArea.width, hitArea.height);

            const label = this.scene.add
                .text(
                    hitArea.x,
                    y + 3,
                    `${index}: ${button.key}`,
                    {
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        color: '#ffffff',
                        backgroundColor: '#000000'
                    }
                )
                .setOrigin(0.5, 0);

            this.container.add([graphics, label]);
            this.debugGraphics.push(graphics, label);
        });
    }

    clearDebugHitboxes() {
        this.debugGraphics.forEach(object => {
            object?.destroy?.();
        });

        this.debugGraphics = [];
    }

    handleResize(gameSize) {
        if (
            this.isDestroyed ||
            !this.scene ||
            !this.container
        ) {
            return;
        }

        const { width, height } = gameSize;
        const isMobile = !this.scene.sys.game.device.os.desktop;

        this.scene.tweens.killTweensOf(this.container);
        this.scene.tweens.killTweensOf(this.toggleContainer);

        this.isAnimating = false;

        this.config.width = Math.min(
            1180,
            width * (isMobile ? 0.96 : 0.92)
        );

        this.closedY = height + 12;
        this.openY = height - this.config.height;

        this.container.setPosition(
            width / 2,
            this.isOpen ? this.openY : this.closedY
        );

        this.toggleContainer?.setPosition(
            width / 2,
            this.isOpen ? this.openY - 18 : height - 19
        );

        this.rebuildLayout();
    }

    rebuildLayout() {
        this.clearDebugHitboxes();
        this.destroyMenuButtons();
        this.destroyBackground();

        this.createCustomBackground();
        this.createMenuButtons();

        if (this.debugHitboxes) {
            this.drawDebugHitboxes();
        }

        this.updateMenuInteractivity();
    }

    destroyBackground() {
        this.bgGraphics?.destroy();
        this.bgHitArea?.destroy();

        this.bgGraphics = null;
        this.bgHitArea = null;
    }

    destroyMenuButtons() {
        this.menuButtons.forEach(button => {
            this.scene?.tweens?.killTweensOf(
                [
                    button.container,
                    button.icon,
                    button.shadow
                ].filter(Boolean)
            );

            button.hitAreaObject?.removeAllListeners();
            button.hitAreaObject?.destroy();
            button.container?.destroy(true);
        });

        this.menuButtons = [];
        this.buttonMap.clear();
    }

    createHotkeyLabel(x, y, fullLabel, hotkey, options = {}) {
        const {
            fontSize = '15px',
            baseColor = '#dcdcdc',
            hotkeyColor = '#ffcc00',
            fontFamily = 'PressStart2P',
            align = 'center'
        } = options;

        const container = this.scene.add.container(x, y);
        const label = String(fullLabel || '');
        const key = String(hotkey || '').toLowerCase();
        const index = key ? label.toLowerCase().indexOf(key) : -1;

        const style = {
            fontFamily,
            fontSize,
            align,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 0,
                fill: true
            }
        };

        if (index === -1) {
            const text = this.scene.add
                .text(0, 0, label, { ...style, color: baseColor })
                .setOrigin(0.5, 0);

            container.add(text);
            container.baseParts = [text];
            container.hotkeyParts = [];
            container.setSize(text.width, text.height);

            return container;
        }

        const before = this.scene.add
            .text(
                0,
                0,
                label.slice(0, index),
                { ...style, color: baseColor }
            )
            .setOrigin(0);

        const letter = this.scene.add
            .text(
                0,
                0,
                label.charAt(index),
                {
                    ...style,
                    color: hotkeyColor,
                    fontStyle: 'bold'
                }
            )
            .setOrigin(0);

        const after = this.scene.add
            .text(
                0,
                0,
                label.slice(index + 1),
                { ...style, color: baseColor }
            )
            .setOrigin(0);

        const totalWidth = before.width + letter.width + after.width;

        before.x = -totalWidth / 2;
        letter.x = before.x + before.width;
        after.x = letter.x + letter.width;

        container.add([before, letter, after]);

        container.baseParts = [before, after];
        container.hotkeyParts = [letter];

        container.setSize(
            totalWidth,
            Math.max(before.height, letter.height, after.height)
        );

        return container;
    }

    setHotkeyLabelColors(container, baseColor, hotkeyColor) {
        if (!container) return;

        (container.baseParts || []).forEach(part => {
            part.setColor(baseColor);
        });

        (container.hotkeyParts || []).forEach(part => {
            part.setColor(hotkeyColor);
        });
    }

    setCrimeBoardAvailable(available) {
        this.crimeBoardAvailable = Boolean(available);
        this.updateMenuInteractivity();

        if (this.debugHitboxes) {
            this.drawDebugHitboxes();
        }
    }

    createCustomBackground() {
        const { width, height } = this.config;
        const graphics = this.scene.add.graphics();

        graphics.fillStyle(0x000000, 0.4);
        graphics.fillRoundedRect(
            -width / 2 - 4, -4, width + 8, height + 8, 12
        );

        graphics.fillStyle(0x3a281c, 1);
        graphics.fillRoundedRect(
            -width / 2, 0, width, height, 10
        );

        graphics.lineStyle(3, 0xb5838d, 0.9);
        graphics.strokeRoundedRect(
            -width / 2 + 3, 3, width - 6, height - 6, 8
        );

        graphics.fillStyle(0x1e1713, 0.96);
        graphics.fillRoundedRect(
            -width / 2 + 8, 8, width - 16, height - 16, 6
        );

        graphics.lineStyle(2, 0x0c0a09, 0.8);
        graphics.strokeRoundedRect(
            -width / 2 + 9, 9, width - 18, height - 18, 5
        );

        [
            { x: -width / 2 + 18, y: 18 },
            { x: width / 2 - 18, y: 18 },
            { x: -width / 2 + 18, y: height - 18 },
            { x: width / 2 - 18, y: height - 18 }
        ].forEach(({ x, y }) => {
            graphics.fillStyle(0x8f5d26, 1);
            graphics.fillCircle(x, y, 5);

            graphics.fillStyle(0xdda15e, 0.8);
            graphics.fillCircle(x - 1, y - 1, 2);

            graphics.lineStyle(1, 0x1a100c, 1);
            graphics.strokeCircle(x, y, 5);
        });

        const hitArea = this.scene.add
            .rectangle(0, height / 2, width, height, 0x000000, 0)
            .setInteractive();

        this.container.add([graphics, hitArea]);

        this.bgGraphics = graphics;
        this.bgHitArea = hitArea;
    }

    createToggleButton(screenWidth, screenHeight) {
        const isMobile = !this.scene.sys.game.device.os.desktop;
        const width = isMobile ? 170 : 215;
        const height = isMobile ? 38 : 44;

        this.toggleContainer = this.scene.add
            .container(screenWidth / 2, screenHeight - height / 2)
            .setDepth(41);

        const graphics = this.scene.add.graphics();

        graphics.fillStyle(0x3a281c, 1);
        graphics.fillRoundedRect(
            -width / 2,
            -height / 2,
            width,
            height,
            { tl: 8, tr: 8, bl: 0, br: 0 }
        );

        graphics.lineStyle(2, 0xdda15e, 0.9);
        graphics.strokeRoundedRect(
            -width / 2 + 2,
            -height / 2 + 2,
            width - 4,
            height - 2,
            { tl: 6, tr: 6, bl: 0, br: 0 }
        );

        graphics.fillStyle(0x6b2d2d, 1);
        graphics.fillRoundedRect(
            -width / 2 + 5,
            -height / 2 + 5,
            width - 10,
            height - 5,
            { tl: 4, tr: 4, bl: 0, br: 0 }
        );

        this.toggleText = this.createHotkeyLabel(
            0,
            -8,
            'MENU',
            isMobile ? '' : 'M',
            {
                fontSize: isMobile ? '13px' : '16px',
                baseColor: '#f4eac1',
                hotkeyColor: '#ffcc00'
            }
        );

        const spacing = isMobile ? -38 : -50;

        const arrowStyle = {
            fontFamily: 'PressStart2P',
            fontSize: isMobile ? '10px' : '12px',
            color: '#f4eac1'
        };

        const left = this.scene.add
            .text(spacing, 0, '▼', arrowStyle)
            .setOrigin(0.5);

        const right = this.scene.add
            .text(-spacing, 0, '▼', arrowStyle)
            .setOrigin(0.5);

        this.toggleArrows = { left, right };

        const hitBox = this.scene.add
            .rectangle(0, 0, width, height, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        hitBox.on('pointerdown', () => this.toggle());

        hitBox.on('pointerover', () => {
            if (!this.scene.sys.game.device.os.desktop) return;

            this.setHotkeyLabelColors(
                this.toggleText, '#ffffff', '#ffd54a'
            );

            this.toggleText.setScale(1.05);
            left.setColor('#ffffff').setScale(1.05);
            right.setColor('#ffffff').setScale(1.05);
        });

        hitBox.on('pointerout', () => {
            if (!this.scene.sys.game.device.os.desktop) return;

            this.setHotkeyLabelColors(
                this.toggleText, '#f4eac1', '#ffcc00'
            );

            this.toggleText.setScale(1);
            left.setColor('#f4eac1').setScale(1);
            right.setColor('#f4eac1').setScale(1);
        });

        this.toggleContainer.add([
            graphics,
            left,
            this.toggleText,
            right,
            hitBox
        ]);
    }

    createMenuButtons() {
        const data = [
            {
                key: 'filebutt',
                label: 'Case File',
                hotkey: 'f',
                action: () => this.openCasefile()
            },
            {
                key: 'note',
                label: 'Notebook',
                hotkey: 'n',
                action: () => this.openNotes()
            },
            {
                key: 'atlas',
                label: 'Atlas',
                hotkey: 'a',
                action: () => this.openAtlas()
            },
            {
                key: 'plane',
                label: 'Travel',
                hotkey: 't',
                action: () => this.openDestinations()
            },
            {
                key: 'warrant',
                label: 'Warrant',
                hotkey: 'w',
                action: () => this.openWarrant()
            },
            {
                key: 'crime_board',
                label: 'Crime Board',
                hotkey: 'c',
                restricted: true,
                action: () => this.openCrimeBoard()
            },
            {
                key: 'telephone',
                label: 'Telephone',
                hotkey: 'p',
                action: () => this.openPhone()
            },
            {
                key: 'passport',
                label: 'Passport',
                hotkey: 's',
                action: () => this.openPassport()
            },
            {
                key: 'inventory',
                label: 'Inventory',
                hotkey: 'i',
                iconKey: 'inventory_icon',
                fallbackIcon: '🎒',
                action: () => this.openInventory()
            }
        ];

        const isMobile = !this.scene.sys.game.device.os.desktop;
        const padding = isMobile ? 22 : 42;
        const availableWidth = this.config.width - padding;
        const spacing = availableWidth / data.length;
        const startX = -availableWidth / 2 + spacing / 2;

        const iconY = isMobile ? 48 : 62;
        const labelY = isMobile ? 102 : 132;
        const radius = this.config.slotRadius;

        data.forEach((item, index) => {
            const x = startX + index * spacing;

            const container = this.scene.add.container(x, 0);
            container.name = item.key;

            const background = this.scene.add.graphics();

            background.fillStyle(0x120d0a, 0.8);
            background.fillCircle(0, iconY, radius);
            background.lineStyle(1, 0x3a281c, 1);
            background.strokeCircle(0, iconY, radius);

            const shadow = this.scene.add.ellipse(
                0,
                iconY + radius * 0.7,
                isMobile ? 38 : 52,
                isMobile ? 10 : 14,
                0x000000,
                0.6
            );

            const textureKey = item.iconKey || item.key;
            let icon;

            if (this.scene.textures.exists(textureKey)) {
                icon = this.scene.add.image(0, iconY, textureKey);
                icon.setDisplaySize(
                    this.config.buttonSize,
                    this.config.buttonSize
                );
            } else {
                if (!item.fallbackIcon) {
                    console.warn(
                        `[PlayerMenuUI] Missing texture "${textureKey}".`
                    );
                }

                icon = this.scene.add
                    .text(
                        0,
                        iconY,
                        item.fallbackIcon || '❔',
                        { fontSize: isMobile ? '31px' : '42px' }
                    )
                    .setOrigin(0.5);
            }

            icon.baseScaleX = icon.scaleX;
            icon.baseScaleY = icon.scaleY;

            const label = this.createHotkeyLabel(
                0,
                labelY,
                item.label,
                isMobile ? '' : item.hotkey,
                { fontSize: this.config.fontSize }
            );

            container.add([background, shadow, icon, label]);

            const hitWidth = Math.max(
                spacing * 0.92,
                this.config.buttonSize + 12
            );

            const hitArea = this.scene.add
                .rectangle(
                    x,
                    this.config.buttonAreaHeight / 2,
                    hitWidth,
                    this.config.buttonAreaHeight,
                    0x00ff00,
                    0
                )
                .setInteractive({ useHandCursor: true });

            const actionAllowed = () => {
                if (item.key === 'telephone') {
                    return this.canOpenPhone();
                }

                if (item.restricted) {
                    return this.canOpenCrimeBoard();
                }

                return true;
            };

            hitArea.on('pointerover', () => {
                if (!actionAllowed()) return;

                if (this.scene.sys.game.device.os.desktop) {
                    this.scene.tweens.killTweensOf([icon, shadow]);

                    this.scene.tweens.add({
                        targets: icon,
                        y: iconY - 8,
                        scaleX: icon.baseScaleX * 1.08,
                        scaleY: icon.baseScaleY * 1.08,
                        duration: 150,
                        ease: 'Quad.easeOut'
                    });

                    this.scene.tweens.add({
                        targets: shadow,
                        scaleX: 1.25,
                        alpha: 0.3,
                        duration: 150
                    });

                    this.setHotkeyLabelColors(
                        label, '#ffffff', '#ffd54a'
                    );
                }

                if (this.debugHitboxes) {
                    console.log(
                        `[PlayerMenuUI] pointerover -> ${index}: ${item.key}`
                    );
                }
            });

            hitArea.on('pointerout', () => {
                if (!this.scene.sys.game.device.os.desktop) return;

                this.scene.tweens.killTweensOf([icon, shadow]);

                this.scene.tweens.add({
                    targets: icon,
                    y: iconY,
                    scaleX: icon.baseScaleX,
                    scaleY: icon.baseScaleY,
                    duration: 150,
                    ease: 'Quad.easeOut'
                });

                this.scene.tweens.add({
                    targets: shadow,
                    scaleX: 1,
                    alpha: 0.6,
                    duration: 150
                });

                this.setHotkeyLabelColors(
                    label, '#dcdcdc', '#ffcc00'
                );
            });

            hitArea.on('pointerdown', () => {
                if (
                    !this.isOpen ||
                    this.isAnimating ||
                    !actionAllowed()
                ) {
                    return;
                }

                if (this.debugHitboxes) {
                    console.log(
                        `[PlayerMenuUI] pointerdown -> ${index}: ${item.key}`
                    );
                }

                if (this.scene.sound.get('click_sound')) {
                    this.scene.sound.play('click_sound');
                }

                this.scene.tweens.killTweensOf(container);

                this.scene.tweens.add({
                    targets: container,
                    y: 3,
                    duration: 60,
                    yoyo: true,

                    onComplete: () => {
                        if (this.isDestroyed) return;

                        if (actionAllowed()) {
                            item.action();
                        }

                        this.close();
                    }
                });
            });

            this.container.add([container, hitArea]);

            const record = {
                key: item.key,
                container,
                hitAreaObject: hitArea,
                icon,
                shadow,
                label,
                restricted: Boolean(item.restricted)
            };

            this.menuButtons.push(record);
            this.buttonMap.set(item.key, record);
        });

        this.phoneAvailable = this.canOpenPhone();

        this.setCrimeBoardAvailable(
            this.crimeBoardAvailable
        );
    }

    setButtonsInteractive(enabled) {
        this.menuButtons.forEach(button => {
            const available = this.isButtonAvailable(button);

            button.container.setVisible(available);
            button.hitAreaObject.setVisible(available);

            if (button.hitAreaObject?.input) {
                button.hitAreaObject.input.enabled =
                    enabled && available;
            }
        });

        if (this.bgHitArea?.input) {
            this.bgHitArea.input.enabled = enabled;
        }
    }

    updateMenuInteractivity() {
        this.setButtonsInteractive(
            !this.isDestroyed &&
            this.isOpen &&
            !this.isAnimating
        );
    }

    toggle() {
        if (this.isDestroyed || this.isAnimating) return;

        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        if (
            this.isDestroyed ||
            this.isOpen ||
            this.isAnimating
        ) {
            return;
        }

        this.refreshPhoneAvailability();

        this.isAnimating = true;
        this.isOpen = true;

        this.updateMenuInteractivity();

        this.toggleArrows?.left.setText('▲');
        this.toggleArrows?.right.setText('▲');

        this.scene.tweens.add({
            targets: this.container,
            y: this.openY,
            duration: 350,
            ease: 'Back.easeOut',
            easeParams: [0.6],

            onComplete: () => {
                if (this.isDestroyed) return;

                this.isAnimating = false;
                this.updateMenuInteractivity();
            }
        });

        this.scene.tweens.add({
            targets: this.toggleContainer,
            y: this.openY - 18,
            duration: 350,
            ease: 'Back.easeOut',
            easeParams: [0.6]
        });
    }

    close() {
        if (this.isDestroyed || !this.isOpen) return;

        this.scene.tweens.killTweensOf(this.container);
        this.scene.tweens.killTweensOf(this.toggleContainer);

        this.isAnimating = true;
        this.isOpen = false;

        this.updateMenuInteractivity();

        this.toggleArrows?.left.setText('▼');
        this.toggleArrows?.right.setText('▼');

        this.scene.tweens.add({
            targets: this.container,
            y: this.closedY,
            duration: 300,
            ease: 'Power2',

            onComplete: () => {
                if (this.isDestroyed) return;

                this.isAnimating = false;
                this.updateMenuInteractivity();
            }
        });

        this.scene.tweens.add({
            targets: this.toggleContainer,
            y: this.scene.scale.height - 19,
            duration: 300,
            ease: 'Power2'
        });
    }

    getFirstCaseTutorial() {
        const manager = this.scene.scene;

        if (!manager?.isActive('OfficeScene')) return null;

        return manager.get('OfficeScene')?.firstCaseTutorial ?? null;
    }

    openCasefile() {
        const tutorial = this.getFirstCaseTutorial();

        if (tutorial && !tutorial.canUseAction('case_file')) return;
        if (!this.scene.caseFileUI) return;

        const mission = this.gameState.currentMission;

        if (!mission) {
            console.warn(
                '[PlayerMenuUI] No currentMission. Case File will not open.'
            );
            return;
        }

        this.close();
        this.scene.closeAllUIPanels();

        this.scene.caseFileUI.open({
            artifact: mission.artifact || 'UNKNOWN ARTIFACT',
            city: mission.city || '',
            country: mission.country || '',
            description: mission.description || 'No more data...',
            significance: mission.significance || '',
            clue: mission.clue || 'No more clues...',
            artifactKey: mission.artifactKey || 'artifact_fallback'
        });

        tutorial?.onCaseFileOpened();
    }

    openNotes() {
        if (!this.scene.notesUI) return;

        this.scene.closeAllUIPanels();
        this.scene.notesUI.open(this.gameState);
    }

    openAtlas() {
        if (!this.scene.atlasUI) return;

        this.scene.closeAllUIPanels();

        const mission = this.gameState.currentMission || {};
        const country = String(mission.country || '')
            .trim()
            .toLowerCase();

        if (country && this.scene.atlasUI.openToCountry) {
            this.scene.atlasUI.openToCountry(country);
            return;
        }

        this.scene.atlasUI.open();
    }

    openDestinations() {
        const tutorial = this.getFirstCaseTutorial();

        if (tutorial && !tutorial.canUseAction('travel')) return;
        if (!this.scene.destinationsUI) return;

        this.close();
        this.scene.closeAllUIPanels();
        this.scene.destinationsUI.open(this.gameState);

        tutorial?.onDestinationMapOpened();
    }

    openWarrant() {
        if (!this.scene.warrantUI) return;

        this.scene.closeAllUIPanels();
        this.scene.warrantUI.open(this.gameState);
    }

    openCrimeBoard() {
        if (!this.canOpenCrimeBoard()) return false;

        this.close();

        const opened = this.scene.openCrimeBoard?.() === true;

        if (opened) {
            const boardApi = this.scene.crimeBoardUI?.boardApi;

            if (boardApi?.getData) {
                this.gameState.crimeBoardData = boardApi.getData();
            }
        }

        return opened;
    }

    openPhone() {
        if (!this.canOpenPhone()) return false;

        this.scene.closeAllUIPanels();

        if (this.scene.phoneUI) {
            this.scene.phoneUI.open(this.gameState);
            return true;
        }

        if (this.scene.phoneCallUI) {
            this.scene.phoneCallUI.open(this.gameState);
            return true;
        }

        if (this.scene.scene.manager.keys.PhoneScene) {
            this.scene.scene.launch('PhoneScene', {
                gameState: this.gameState
            });

            return true;
        }

        return false;
    }

    openPassport() {
        this.scene.closeAllUIPanels();

        if (this.scene.passportUI) {
            this.scene.passportUI.open(this.gameState);
            return;
        }

        console.warn(
            '[PlayerMenuUI] passportUI is unavailable in PlayerHudScene.'
        );
    }

    openInventory() {
        const inventory = this.scene.inventoryUI;

        if (!inventory) {
            console.warn(
                '[PlayerMenuUI] inventoryUI is unavailable in PlayerHudScene.'
            );
            return;
        }

        if (inventory.isOpen) {
            inventory.close();
            return;
        }

        this.scene.openInventory?.();
    }

    destroy() {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        const scene = this.scene;

        if (!scene) return;

        if (PlayerMenuUI._registry.get(scene) === this) {
            PlayerMenuUI._registry.delete(scene);
        }

        scene.scale?.off('resize', this.boundResizeHandler, this);
        scene.events?.off('update', this.boundAccessHandler);
        scene.events?.off('shutdown', this.boundSceneEndHandler);
        scene.events?.off('destroy', this.boundSceneEndHandler);

        const keyboard = scene.input?.keyboard;

        if (keyboard) {
            keyboard.off('keydown-M', this.boundToggleHandler);
            keyboard.off('keydown-H', this.boundDebugHandler);
            keyboard.off('keydown-I', this.boundInventoryHandler);
            keyboard.off('keydown-C', this.boundCrimeBoardHandler);
        }

        this.clearDebugHitboxes();

        [
            this.container,
            this.toggleContainer,
            this.toggleText,
            this.toggleArrows?.left,
            this.toggleArrows?.right
        ].filter(Boolean).forEach(target => {
            scene.tweens?.killTweensOf(target);
        });

        this.destroyMenuButtons();
        this.destroyBackground();

        this.toggleContainer?.destroy(true);
        this.container?.destroy(true);

        this.toggleContainer = null;
        this.container = null;
        this.toggleText = null;
        this.toggleArrows = null;

        this.isOpen = false;
        this.isAnimating = false;

        this.scene = null;
        this.gameState = null;
    }
}