export class PlayerMenuUI {
    static _registry = new Map();

    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;

        this.isOpen = false;
        this.isAnimating = false;
        this.debugHitboxes = false;
        this.crimeBoardAvailable = false;
        this.isDestroyed = false;

        this.boundToggleHandler = this.onToggleKeyDown.bind(this);
        this.boundResizeHandler = this.handleResize.bind(this);
        this.boundDebugHandler = this.onDebugKeyDown.bind(this);
        this.boundInventoryHandler = this.onInventoryKeyDown.bind(this);

        const { width, height } = this.scene.scale;
        const isMobile = !this.scene.sys.game.device.os.desktop;

        this.config = {
            width: Math.min(1180, width * (isMobile ? 0.96 : 0.92)),
            height: isMobile ? 145 : 185,
            buttonSize: isMobile ? 52 : 72,
            slotRadius: isMobile ? 28 : 38,
            fontSize: isMobile ? '9px' : '12px'
        };

        this.closedY = height;
        this.openY = height - this.config.height;

        this.container = this.scene.add.container(
            width / 2,
            this.closedY
        ).setDepth(40);

        this.toggleContainer = null;
        this.toggleText = null;
        this.toggleArrows = null;

        this.menuButtons = [];
        this.buttonMap = new Map();
        this.debugGraphics = [];

        const existing = PlayerMenuUI._registry.get(this.scene);

        if (existing && existing !== this) {
            console.warn(
                '[PlayerMenuUI] Existing instance found in this scene. Destroying old instance.'
            );

            existing.destroy();
        }

        PlayerMenuUI._registry.set(this.scene, this);

        this.createCustomBackground();
        this.createToggleButton(width, height);
        this.createMenuButtons();

        this.bindKeyboardShortcut();
        this.bindDebugShortcut();
        this.bindInventoryShortcut();

        this.scene.scale.on(
            'resize',
            this.boundResizeHandler,
            this
        );

        this.scene.events.once(
            'shutdown',
            () => this.destroy()
        );

        this.scene.events.once(
            'destroy',
            () => this.destroy()
        );

        this.updateMenuInteractivity();
    }

    bindKeyboardShortcut() {
        if (!this.scene.input?.keyboard) {
            return;
        }

        this.scene.input.keyboard.addCapture('M');

        this.scene.input.keyboard.on(
            'keydown-M',
            this.boundToggleHandler
        );
    }

    bindInventoryShortcut() {
        if (!this.scene.input?.keyboard) {
            return;
        }

        this.scene.input.keyboard.addCapture('I');

        this.scene.input.keyboard.on(
            'keydown-I',
            this.boundInventoryHandler
        );
    }

    bindDebugShortcut() {
        if (!this.scene.input?.keyboard) {
            return;
        }

        this.scene.input.keyboard.on(
            'keydown-H',
            this.boundDebugHandler
        );
    }

    onToggleKeyDown(event) {
        if (this.isTypingInTextField() || this.isAnimating) {
            return;
        }

        event.preventDefault();
        event.stopPropagation?.();

        this.toggle();
    }

    onInventoryKeyDown(event) {
        if (this.isTypingInTextField()) {
            return;
        }

        event.preventDefault();
        event.stopPropagation?.();

        this.openInventory();
    }

    onDebugKeyDown() {
        if (this.isTypingInTextField()) {
            return;
        }

        this.toggleDebugHitboxes();
    }

    isTypingInTextField() {
        const activeElement = document.activeElement;
        const activeTag = activeElement?.tagName;

        return Boolean(
            activeTag === 'INPUT'
            || activeTag === 'TEXTAREA'
            || activeElement?.isContentEditable
        );
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
            const rect = button.hitAreaObject?.getBounds?.();

            if (!rect) {
                return;
            }

            const graphics = this.scene.add.graphics().setDepth(45);

            graphics.lineStyle(
                2,
                colors[index % colors.length],
                1
            );

            graphics.fillStyle(
                colors[index % colors.length],
                0.15
            );

            graphics.fillRect(
                rect.x,
                rect.y,
                rect.width,
                rect.height
            );

            graphics.strokeRect(
                rect.x,
                rect.y,
                rect.width,
                rect.height
            );

            const label = this.scene.add.text(
                rect.centerX,
                rect.y - 14,
                `${index}: ${button.key}`,
                {
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    color: '#ffffff',
                    backgroundColor: '#000000'
                }
            );

            label.setOrigin(0.5, 0);
            label.setDepth(46);

            this.container.add([graphics, label]);
            this.debugGraphics.push(graphics, label);
        });

        console.info(
            '[PlayerMenuUI] Debug hitboxes enabled. Press H to hide.'
        );
    }

    clearDebugHitboxes() {
        this.debugGraphics.forEach((object) => {
            object?.destroy?.();
        });

        this.debugGraphics = [];
    }

    handleResize(gameSize) {
            if (this.isDestroyed || !this.scene || !this.container) {
        return;
    }
        const { width, height } = gameSize;
        const isMobile = !this.scene.sys.game.device.os.desktop;

        this.config.width = Math.min(
            1180,
            width * (isMobile ? 0.96 : 0.92)
        );

        this.closedY = height;
        this.openY = height - this.config.height;

        this.container?.setX(width / 2);
        this.container?.setY(
            this.isOpen
                ? this.openY
                : this.closedY
        );

        if (this.toggleContainer) {
            this.toggleContainer.setX(width / 2);
            this.toggleContainer.setY(
                this.isOpen
                    ? this.openY - 18
                    : height - 19
            );
        }

        this.rebuildLayout();
    }

    rebuildLayout() {
        const wasDebug = this.debugHitboxes;

        this.clearDebugHitboxes();
        this.destroyMenuButtons();
        this.destroyBackground();

        this.createCustomBackground();
        this.createMenuButtons();

        if (wasDebug) {
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
        this.menuButtons.forEach((button) => {
            button?.hitAreaObject?.removeAllListeners?.();
            button?.hitAreaObject?.destroy?.();
            button?.container?.destroy?.(true);
        });

        this.menuButtons = [];
        this.buttonMap.clear();
    }

    createHotkeyLabel(
        x,
        y,
        fullLabel,
        hotkey,
        options = {}
    ) {
        const {
            fontSize = '15px',
            baseColor = '#dcdcdc',
            hotkeyColor = '#ffcc00',
            fontFamily = 'PressStart2P',
            align = 'center'
        } = options;

        const labelContainer = this.scene.add.container(x, y);

        const normalizedLabel = String(fullLabel || '');
        const normalizedHotkey = String(hotkey || '').toLowerCase();

        const hotkeyIndex = normalizedLabel
            .toLowerCase()
            .indexOf(normalizedHotkey);

        if (hotkeyIndex === -1 || !hotkey) {
            const fallbackText = this.scene.add.text(
                0,
                0,
                normalizedLabel,
                {
                    fontFamily,
                    fontSize,
                    color: baseColor,
                    align,
                    shadow: {
                        offsetX: 1,
                        offsetY: 1,
                        color: '#000000',
                        blur: 0,
                        fill: true
                    }
                }
            );

            fallbackText.setOrigin(0.5, 0);

            labelContainer.add(fallbackText);
            labelContainer.baseParts = [fallbackText];
            labelContainer.hotkeyParts = [];

            labelContainer.setSize(
                fallbackText.width,
                fallbackText.height
            );

            return labelContainer;
        }

        const before = normalizedLabel.slice(0, hotkeyIndex);
        const letter = normalizedLabel.charAt(hotkeyIndex);
        const after = normalizedLabel.slice(hotkeyIndex + 1);

        const beforeText = this.scene.add.text(0, 0, before, {
            fontFamily,
            fontSize,
            color: baseColor,
            align,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 0,
                fill: true
            }
        }).setOrigin(0, 0);

        const hotkeyText = this.scene.add.text(0, 0, letter, {
            fontFamily,
            fontSize,
            color: hotkeyColor,
            fontStyle: 'bold',
            align,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 0,
                fill: true
            }
        }).setOrigin(0, 0);

        const afterText = this.scene.add.text(0, 0, after, {
            fontFamily,
            fontSize,
            color: baseColor,
            align,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 0,
                fill: true
            }
        }).setOrigin(0, 0);

        const totalWidth = (
            beforeText.width
            + hotkeyText.width
            + afterText.width
        );

        beforeText.x = -totalWidth / 2;
        hotkeyText.x = beforeText.x + beforeText.width;
        afterText.x = hotkeyText.x + hotkeyText.width;

        labelContainer.add([
            beforeText,
            hotkeyText,
            afterText
        ]);

        labelContainer.baseParts = [
            beforeText,
            afterText
        ];

        labelContainer.hotkeyParts = [
            hotkeyText
        ];

        labelContainer.setSize(
            totalWidth,
            Math.max(
                beforeText.height,
                hotkeyText.height,
                afterText.height
            )
        );

        return labelContainer;
    }

    setHotkeyLabelColors(
        labelContainer,
        baseColor,
        hotkeyColor
    ) {
        if (!labelContainer) {
            return;
        }

        (labelContainer.baseParts || []).forEach((part) => {
            part.setColor(baseColor);
        });

        (labelContainer.hotkeyParts || []).forEach((part) => {
            part.setColor(hotkeyColor);
        });
    }

    setCrimeBoardAvailable(available) {
        this.crimeBoardAvailable = Boolean(available);

        const crimeBoardButton = this.buttonMap.get(
            'crime_board'
        );

        if (!crimeBoardButton) {
            return;
        }

        crimeBoardButton.container?.setVisible(
            this.crimeBoardAvailable
        );

        crimeBoardButton.hitAreaObject?.setVisible(
            this.crimeBoardAvailable
        );

        if (this.crimeBoardAvailable) {
            crimeBoardButton.hitAreaObject?.setInteractive({
                useHandCursor: true
            });
        } else {
            crimeBoardButton.hitAreaObject?.disableInteractive();
        }
    }

    createCustomBackground() {
        const width = this.config.width;
        const height = this.config.height;

        const graphics = this.scene.add.graphics();

        graphics.fillStyle(0x000000, 0.4);
        graphics.fillRoundedRect(
            -width / 2 - 4,
            -4,
            width + 8,
            height + 8,
            12
        );

        graphics.fillStyle(0x3a281c, 1);
        graphics.fillRoundedRect(
            -width / 2,
            0,
            width,
            height,
            10
        );

        graphics.lineStyle(3, 0xb5838d, 0.9);
        graphics.strokeRoundedRect(
            -width / 2 + 3,
            3,
            width - 6,
            height - 6,
            8
        );

        graphics.fillStyle(0x1e1713, 0.96);
        graphics.fillRoundedRect(
            -width / 2 + 8,
            8,
            width - 16,
            height - 16,
            6
        );

        graphics.lineStyle(2, 0x0c0a09, 0.8);
        graphics.strokeRoundedRect(
            -width / 2 + 9,
            9,
            width - 18,
            height - 18,
            5
        );

        const rivets = [
            { x: -width / 2 + 18, y: 18 },
            { x: width / 2 - 18, y: 18 },
            { x: -width / 2 + 18, y: height - 18 },
            { x: width / 2 - 18, y: height - 18 }
        ];

        rivets.forEach((rivet) => {
            graphics.fillStyle(0x8f5d26, 1);
            graphics.fillCircle(rivet.x, rivet.y, 5);

            graphics.fillStyle(0xdda15e, 0.8);
            graphics.fillCircle(
                rivet.x - 1,
                rivet.y - 1,
                2
            );

            graphics.lineStyle(1, 0x1a100c, 1);
            graphics.strokeCircle(rivet.x, rivet.y, 5);
        });

        const hitArea = this.scene.add.rectangle(
            0,
            height / 2,
            width,
            height,
            0x000000,
            0
        );

        hitArea.setInteractive();

        this.container.add([
            graphics,
            hitArea
        ]);

        this.bgGraphics = graphics;
        this.bgHitArea = hitArea;
    }

    createToggleButton(screenWidth, screenHeight) {
        const isMobile = !this.scene.sys.game.device.os.desktop;

        const buttonWidth = isMobile ? 170 : 215;
        const buttonHeight = isMobile ? 38 : 44;

        this.toggleContainer = this.scene.add.container(
            screenWidth / 2,
            screenHeight - buttonHeight / 2
        ).setDepth(41);

        const graphics = this.scene.add.graphics();

        graphics.fillStyle(0x3a281c, 1);
        graphics.fillRoundedRect(
            -buttonWidth / 2,
            -buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            {
                tl: 8,
                tr: 8,
                bl: 0,
                br: 0
            }
        );

        graphics.lineStyle(2, 0xdda15e, 0.9);
        graphics.strokeRoundedRect(
            -buttonWidth / 2 + 2,
            -buttonHeight / 2 + 2,
            buttonWidth - 4,
            buttonHeight - 2,
            {
                tl: 6,
                tr: 6,
                bl: 0,
                br: 0
            }
        );

        graphics.fillStyle(0x6b2d2d, 1);
        graphics.fillRoundedRect(
            -buttonWidth / 2 + 5,
            -buttonHeight / 2 + 5,
            buttonWidth - 10,
            buttonHeight - 5,
            {
                tl: 4,
                tr: 4,
                bl: 0,
                br: 0
            }
        );

        this.toggleText = this.createHotkeyLabel(
            0,
            -8,
            'MENU',
            isMobile ? '' : 'M',
            {
                fontFamily: 'PressStart2P',
                fontSize: isMobile ? '13px' : '16px',
                baseColor: '#f4eac1',
                hotkeyColor: '#ffcc00'
            }
        );

        const arrowSpacing = isMobile ? -38 : -50;

        const arrowLeft = this.scene.add.text(
            arrowSpacing,
            0,
            '▼',
            {
                fontFamily: 'PressStart2P',
                fontSize: isMobile ? '10px' : '12px',
                color: '#f4eac1'
            }
        ).setOrigin(0.5);

        const arrowRight = this.scene.add.text(
            -arrowSpacing,
            0,
            '▼',
            {
                fontFamily: 'PressStart2P',
                fontSize: isMobile ? '10px' : '12px',
                color: '#f4eac1'
            }
        ).setOrigin(0.5);

        this.toggleArrows = {
            left: arrowLeft,
            right: arrowRight
        };

        const hitBox = this.scene.add.rectangle(
            0,
            0,
            buttonWidth,
            buttonHeight,
            0x000000,
            0
        ).setInteractive({
            useHandCursor: true
        });

        hitBox.on('pointerdown', () => this.toggle());

        hitBox.on('pointerover', () => {
            if (!this.scene.sys.game.device.os.desktop) {
                return;
            }

            this.setHotkeyLabelColors(
                this.toggleText,
                '#ffffff',
                '#ffd54a'
            );

            this.toggleText.setScale(1.05);

            arrowLeft.setColor('#ffffff');
            arrowLeft.setScale(1.05);

            arrowRight.setColor('#ffffff');
            arrowRight.setScale(1.05);
        });

        hitBox.on('pointerout', () => {
            if (!this.scene.sys.game.device.os.desktop) {
                return;
            }

            this.setHotkeyLabelColors(
                this.toggleText,
                '#f4eac1',
                '#ffcc00'
            );

            this.toggleText.setScale(1);

            arrowLeft.setColor('#f4eac1');
            arrowLeft.setScale(1);

            arrowRight.setColor('#f4eac1');
            arrowRight.setScale(1);
        });

        this.toggleContainer.add([
            graphics,
            arrowLeft,
            this.toggleText,
            arrowRight,
            hitBox
        ]);
    }

    createMenuButtons() {
        const buttonsData = [
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
                action: () => this.openCrimeBoard(),
                restricted: true
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
                textIcon: '🎒',
                action: () => this.openInventory()
            }
        ];

        const isMobile = !this.scene.sys.game.device.os.desktop;
        const count = buttonsData.length;

        const padding = isMobile ? 22 : 42;
        const availableWidth = this.config.width - padding;
        const spacing = availableWidth / count;
        const startX = -(availableWidth / 2) + spacing / 2;

        const iconY = isMobile ? 48 : 62;
        const labelY = isMobile ? 102 : 132;
        const radius = this.config.slotRadius;

        buttonsData.forEach((buttonData, index) => {
            const xPos = startX + index * spacing;

            const buttonContainer = this.scene.add.container(
                xPos,
                0
            );

            buttonContainer.name = buttonData.key;

            const slotBackground = this.scene.add.graphics();

            slotBackground.fillStyle(0x120d0a, 0.8);
            slotBackground.fillCircle(0, iconY, radius);

            slotBackground.lineStyle(1, 0x3a281c, 1);
            slotBackground.strokeCircle(0, iconY, radius);

            const shadowWidth = isMobile ? 38 : 52;
            const shadowHeight = isMobile ? 10 : 14;

            const iconShadow = this.scene.add.ellipse(
                0,
                iconY + radius * 0.7,
                shadowWidth,
                shadowHeight,
                0x000000,
                0.6
            );

            let buttonIcon;

            if (buttonData.textIcon) {
                buttonIcon = this.scene.add.text(
                    0,
                    iconY,
                    buttonData.textIcon,
                    {
                        fontSize: isMobile ? '31px' : '42px'
                    }
                );

                buttonIcon.setOrigin(0.5);
            } else {
                buttonIcon = this.scene.add.image(
                    0,
                    iconY,
                    buttonData.key
                );

                buttonIcon.setDisplaySize(
                    this.config.buttonSize,
                    this.config.buttonSize
                );
            }

            /*
             * Kluczowa poprawka:
             * zapamiętujemy skalę po setDisplaySize().
             *
             * Nie ustawiamy nigdy scaleX / scaleY na 1,
             * bo 1 oznacza naturalny rozmiar źródłowego PNG.
             */
            buttonIcon.baseScaleX = buttonIcon.scaleX;
            buttonIcon.baseScaleY = buttonIcon.scaleY;

            const buttonLabel = this.createHotkeyLabel(
                0,
                labelY,
                buttonData.label,
                isMobile ? '' : buttonData.hotkey,
                {
                    fontFamily: 'PressStart2P',
                    fontSize: this.config.fontSize,
                    baseColor: '#dcdcdc',
                    hotkeyColor: '#ffcc00'
                }
            );

            buttonContainer.add([
                slotBackground,
                iconShadow,
                buttonIcon,
                buttonLabel
            ]);

            const hitWidth = Math.max(
                spacing * 0.92,
                this.config.buttonSize + 12
            );

            const hitHeight = this.config.height;

            const hitArea = this.scene.add.rectangle(
                xPos,
                hitHeight / 2,
                hitWidth,
                hitHeight,
                0x00ff00,
                0
            );

            hitArea.setInteractive({
                useHandCursor: true
            });

            hitArea.on('pointerover', () => {
                if (
                    buttonData.restricted
                    && !this.crimeBoardAvailable
                ) {
                    return;
                }

                if (this.scene.sys.game.device.os.desktop) {
                    this.scene.tweens.killTweensOf(
                        buttonIcon
                    );

                    this.scene.tweens.killTweensOf(
                        iconShadow
                    );

                    this.scene.tweens.add({
                        targets: buttonIcon,
                        y: iconY - 8,
                        scaleX: buttonIcon.baseScaleX * 1.08,
                        scaleY: buttonIcon.baseScaleY * 1.08,
                        duration: 150,
                        ease: 'Quad.easeOut'
                    });

                    this.scene.tweens.add({
                        targets: iconShadow,
                        scaleX: 1.25,
                        alpha: 0.3,
                        duration: 150
                    });

                    this.setHotkeyLabelColors(
                        buttonLabel,
                        '#ffffff',
                        '#ffd54a'
                    );
                }

                if (this.debugHitboxes) {
                    console.log(
                        `[PlayerMenuUI] pointerover -> ${index}: ${buttonData.key}`
                    );
                }
            });

            hitArea.on('pointerout', () => {
                if (this.scene.sys.game.device.os.desktop) {
                    this.scene.tweens.killTweensOf(
                        buttonIcon
                    );

                    this.scene.tweens.killTweensOf(
                        iconShadow
                    );

                    this.scene.tweens.add({
                        targets: buttonIcon,
                        y: iconY,
                        scaleX: buttonIcon.baseScaleX,
                        scaleY: buttonIcon.baseScaleY,
                        duration: 150,
                        ease: 'Quad.easeOut'
                    });

                    this.scene.tweens.add({
                        targets: iconShadow,
                        scaleX: 1,
                        alpha: 0.6,
                        duration: 150
                    });

                    this.setHotkeyLabelColors(
                        buttonLabel,
                        '#dcdcdc',
                        '#ffcc00'
                    );
                }
            });

            hitArea.on('pointerdown', () => {
                if (!this.isOpen || this.isAnimating) {
                    return;
                }

                if (
                    buttonData.restricted
                    && !this.crimeBoardAvailable
                ) {
                    return;
                }

                if (this.debugHitboxes) {
                    console.log(
                        `[PlayerMenuUI] pointerdown -> ${index}: ${buttonData.key}`
                    );
                }

                if (this.scene.sound.get('click_sound')) {
                    this.scene.sound.play('click_sound');
                }

                this.scene.tweens.killTweensOf(buttonContainer);

                this.scene.tweens.add({
                    targets: buttonContainer,
                    y: 3,
                    duration: 60,
                    yoyo: true,
                    onComplete: () => {
                        buttonData.action();
                        this.close();
                    }
                });
            });

            this.container.add([
                buttonContainer,
                hitArea
            ]);

            const buttonRecord = {
                key: buttonData.key,
                container: buttonContainer,
                hitAreaObject: hitArea,
                icon: buttonIcon,
                label: buttonLabel,
                restricted: Boolean(buttonData.restricted)
            };

            this.menuButtons.push(buttonRecord);
            this.buttonMap.set(
                buttonData.key,
                buttonRecord
            );
        });

        this.setCrimeBoardAvailable(
            this.crimeBoardAvailable
        );
    }

    setButtonsInteractive(enabled) {
        this.menuButtons.forEach((button) => {
            const isRestrictedAndLocked = (
                button.restricted
                && !this.crimeBoardAvailable
            );

            if (button?.hitAreaObject?.input) {
                button.hitAreaObject.input.enabled = (
                    enabled
                    && !isRestrictedAndLocked
                );
            }
        });

        if (this.bgHitArea?.input) {
            this.bgHitArea.input.enabled = enabled;
        }
    }

    updateMenuInteractivity() {
        const enabled = this.isOpen && !this.isAnimating;

        this.setButtonsInteractive(enabled);
    }

    toggle() {
        if (this.isAnimating) {
            return;
        }

        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.isOpen || this.isAnimating) {
            return;
        }

        this.isAnimating = true;
        this.isOpen = true;

        this.updateMenuInteractivity();

        if (this.toggleArrows) {
            this.toggleArrows.left.setText('▲');
            this.toggleArrows.right.setText('▲');
        }

        this.scene.tweens.add({
            targets: this.container,
            y: this.openY,
            duration: 350,
            ease: 'Back.easeOut',
            easeParams: [0.6],
            onComplete: () => {
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
        if (!this.isOpen || this.isAnimating) {
            return;
        }

        this.isAnimating = true;
        this.isOpen = false;

        this.updateMenuInteractivity();

        if (this.toggleArrows) {
            this.toggleArrows.left.setText('▼');
            this.toggleArrows.right.setText('▼');
        }

        const height = this.scene.scale.height;

        this.scene.tweens.add({
            targets: this.container,
            y: this.closedY,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.isAnimating = false;
                this.updateMenuInteractivity();
            }
        });

        this.scene.tweens.add({
            targets: this.toggleContainer,
            y: height - 19,
            duration: 300,
            ease: 'Power2'
        });
    }

    getFirstCaseTutorial() {
        const sceneManager = this.scene.scene;

        if (!sceneManager?.isActive('OfficeScene')) {
            return null;
        }

        const officeScene = sceneManager.get('OfficeScene');

        return officeScene?.firstCaseTutorial ?? null;
    }

    openCasefile() {
        const tutorial = this.getFirstCaseTutorial();

        if (tutorial && !tutorial.canUseAction('case_file')) {
            return;
        }

        if (!this.scene.caseFileUI) {
            return;
        }

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
        if (!this.scene.notesUI) {
            return;
        }

        this.scene.closeAllUIPanels();
        this.scene.notesUI.open(this.gameState);
    }

    openAtlas() {
        if (!this.scene.atlasUI) {
            return;
        }

        this.scene.closeAllUIPanels();

        const mission = this.gameState.currentMission || {};
        const missionCountry = String(
            mission.country || ''
        ).trim().toLowerCase();

        if (
            missionCountry
            && this.scene.atlasUI.openToCountry
        ) {
            this.scene.atlasUI.openToCountry(
                missionCountry
            );

            return;
        }

        this.scene.atlasUI.open();
    }

    openDestinations() {
        const tutorial = this.getFirstCaseTutorial();

        if (tutorial && !tutorial.canUseAction('travel')) {
            return;
        }

        if (!this.scene.destinationsUI) {
            return;
        }

        this.close();
        this.scene.closeAllUIPanels();

        this.scene.destinationsUI.open(this.gameState);

        tutorial?.onDestinationMapOpened();
    }

    openWarrant() {
        if (!this.scene.warrantUI) {
            return;
        }

        this.scene.closeAllUIPanels();
        this.scene.warrantUI.open(this.gameState);
    }

    async openCrimeBoard() {
        if (!this.crimeBoardAvailable) {
            return;
        }

        if (!this.scene.crimeBoardUI) {
            return;
        }

        this.scene.closeAllUIPanels();

this.scene.openCrimeBoard?.();

        const boardApi = this.scene.crimeBoardUI.boardApi;

        if (boardApi?.getData) {
            this.gameState.crimeBoardData = boardApi.getData();
        }
    }

    openPhone() {
        this.scene.closeAllUIPanels();

        if (this.scene.phoneUI) {
            this.scene.phoneUI.open(this.gameState);
            return;
        }

        if (this.scene.phoneCallUI) {
            this.scene.phoneCallUI.open(this.gameState);
            return;
        }

        if (this.scene.scene.get('PhoneScene')) {
            this.scene.scene.launch('PhoneScene', {
                gameState: this.gameState
            });
        }
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
        if (!this.scene.inventoryUI) {
            console.warn(
                '[PlayerMenuUI] inventoryUI is unavailable in PlayerHudScene.'
            );

            return;
        }

        this.scene.openInventory?.();
    }

    destroy() {
    if (this.isDestroyed) {
        return;
    }

    this.isDestroyed = true;

    const scene = this.scene;

    if (!scene) {
        return;
    }

    if (PlayerMenuUI._registry.get(scene) === this) {
        PlayerMenuUI._registry.delete(scene);
    }

    scene.scale?.off(
        'resize',
        this.boundResizeHandler,
        this
    );

    if (scene.input?.keyboard) {
        scene.input.keyboard.off(
            'keydown-M',
            this.boundToggleHandler
        );

        scene.input.keyboard.off(
            'keydown-H',
            this.boundDebugHandler
        );

        scene.input.keyboard.off(
            'keydown-I',
            this.boundInventoryHandler
        );

        scene.input.keyboard.removeCapture('M');
        scene.input.keyboard.removeCapture('I');
    }

    this.clearDebugHitboxes();

    scene.tweens?.killTweensOf(this.container);
    scene.tweens?.killTweensOf(this.toggleContainer);
    scene.tweens?.killTweensOf(this.toggleText);

    if (this.toggleArrows) {
        scene.tweens?.killTweensOf(
            this.toggleArrows.left
        );

        scene.tweens?.killTweensOf(
            this.toggleArrows.right
        );
    }

    this.destroyMenuButtons();
    this.destroyBackground();

    this.toggleContainer?.destroy?.(true);
    this.container?.destroy?.(true);

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