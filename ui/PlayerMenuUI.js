export class PlayerMenuUI {
    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.isOpen = false;
        this.isAnimating = false;

        this.boundToggleHandler = this.onToggleKeyDown.bind(this);

        const { width, height } = this.scene.scale;

        this.config = {
            width: Math.min(1180, width * 0.92),
            height: 185,
            buttonSize: 72
        };

        this.closedY = height;
        this.openY = height - this.config.height;

        this.container = this.scene.add.container(width / 2, this.closedY).setDepth(40);
        this.toggleContainer = null;
        this.toggleText = null;
        this.toggleArrows = null;
        this.menuButtons = [];

        this.createCustomBackground();
        this.createToggleButton(width, height);
        this.createMenuButtons();
        this.bindKeyboardShortcut();
    }

    bindKeyboardShortcut() {
        if (!this.scene.input?.keyboard) return;

        this.scene.input.keyboard.addCapture('M');
        this.scene.input.keyboard.on('keydown-M', this.boundToggleHandler);
    }

    onToggleKeyDown(event) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            document.activeElement?.isContentEditable;

        if (isTyping || this.isAnimating) return;

        event.preventDefault();
        event.stopPropagation?.();
        this.toggle();
    }

    createHotkeyLabel(x, y, fullLabel, hotkey, options = {}) {
        const {
            fontSize = '15px',
            baseColor = '#dcdcdc',
            hotkeyColor = '#ffcc00',
            fontFamily = 'Special Elite',
            align = 'center'
        } = options;

        const labelContainer = this.scene.add.container(x, y);

        const normalizedLabel = String(fullLabel || '');
        const normalizedHotkey = String(hotkey || '').toLowerCase();
        const hotkeyIndex = normalizedLabel.toLowerCase().indexOf(normalizedHotkey);

        if (hotkeyIndex === -1) {
            const fallbackText = this.scene.add.text(0, 0, normalizedLabel, {
                fontFamily,
                fontSize,
                color: baseColor,
                align
            }).setOrigin(0.5, 0);

            labelContainer.add(fallbackText);
            labelContainer.baseParts = [fallbackText];
            labelContainer.hotkeyParts = [];
            labelContainer.setSize(fallbackText.width, fallbackText.height);
            return labelContainer;
        }

        const before = normalizedLabel.slice(0, hotkeyIndex);
        const letter = normalizedLabel.charAt(hotkeyIndex);
        const after = normalizedLabel.slice(hotkeyIndex + 1);

        const beforeText = this.scene.add.text(0, 0, before, {
            fontFamily,
            fontSize,
            color: baseColor,
            align
        }).setOrigin(0, 0);

        const hotkeyText = this.scene.add.text(0, 0, letter, {
            fontFamily,
            fontSize,
            color: hotkeyColor,
            fontStyle: 'bold',
            align
        }).setOrigin(0, 0);

        const afterText = this.scene.add.text(0, 0, after, {
            fontFamily,
            fontSize,
            color: baseColor,
            align
        }).setOrigin(0, 0);

        const totalWidth = beforeText.width + hotkeyText.width + afterText.width;

        beforeText.x = -totalWidth / 2;
        hotkeyText.x = beforeText.x + beforeText.width;
        afterText.x = hotkeyText.x + hotkeyText.width;

        labelContainer.add([beforeText, hotkeyText, afterText]);
        labelContainer.baseParts = [beforeText, afterText];
        labelContainer.hotkeyParts = [hotkeyText];
        labelContainer.setSize(totalWidth, Math.max(beforeText.height, hotkeyText.height, afterText.height));

        return labelContainer;
    }

    setHotkeyLabelColors(labelContainer, baseColor, hotkeyColor) {
        if (!labelContainer) return;

        (labelContainer.baseParts || []).forEach(part => part.setColor(baseColor));
        (labelContainer.hotkeyParts || []).forEach(part => part.setColor(hotkeyColor));
    }

    createCustomBackground() {
        const w = this.config.width;
        const h = this.config.height;
        const graphics = this.scene.add.graphics();

        graphics.fillStyle(0x000000, 0.5);
        graphics.fillRoundedRect(-w / 2 - 4, -4, w + 8, h + 8, 12);

        graphics.fillStyle(0x2b1e18, 1);
        graphics.fillRoundedRect(-w / 2, 0, w, h, 10);

        graphics.lineStyle(3, 0xb8860b, 0.8);
        graphics.strokeRoundedRect(-w / 2 + 3, 3, w - 6, h - 6, 8);

        graphics.fillStyle(0x161311, 0.96);
        graphics.fillRoundedRect(-w / 2 + 8, 8, w - 16, h - 16, 6);

        graphics.lineStyle(2, 0x000000, 0.7);
        graphics.strokeRoundedRect(-w / 2 + 9, 9, w - 18, h - 18, 5);

        const rivets = [
            { x: -w / 2 + 18, y: 18 },
            { x: w / 2 - 18, y: 18 },
            { x: -w / 2 + 18, y: h - 18 },
            { x: w / 2 - 18, y: h - 18 }
        ];

        rivets.forEach(r => {
            graphics.fillStyle(0x8b6508, 1);
            graphics.fillCircle(r.x, r.y, 4);
            graphics.fillStyle(0xffd700, 0.6);
            graphics.fillCircle(r.x - 1, r.y - 1, 1.5);
            graphics.lineStyle(1, 0x1a100c, 1);
            graphics.strokeCircle(r.x, r.y, 4);
        });

        const bgHitArea = this.scene.add.rectangle(0, h / 2, w, h, 0x000000, 0)
            .setInteractive();

        this.container.add([graphics, bgHitArea]);
    }

    createToggleButton(screenWidth, screenHeight) {
        const btnW = 180;
        const btnH = 38;

        this.toggleContainer = this.scene.add.container(screenWidth / 2, screenHeight - (btnH / 2)).setDepth(41);

        const graphics = this.scene.add.graphics();

        graphics.fillStyle(0x2b1e18, 1);
        graphics.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, { tl: 8, tr: 8, bl: 0, br: 0 });

        graphics.lineStyle(2, 0xb8860b, 0.9);
        graphics.strokeRoundedRect(-btnW / 2 + 2, -btnH / 2 + 2, btnW - 4, btnH - 2, { tl: 6, tr: 6, bl: 0, br: 0 });

        graphics.fillStyle(0x4a0e0e, 1);
        graphics.fillRoundedRect(-btnW / 2 + 5, -btnH / 2 + 5, btnW - 10, btnH - 5, { tl: 4, tr: 4, bl: 0, br: 0 });

        this.toggleText = this.createHotkeyLabel(0, -8, 'MENU', 'M', {
            fontFamily: 'Special Elite',
            fontSize: '15px',
            baseColor: '#f0e68c',
            hotkeyColor: '#ffcc00'
        });

        const arrowLeft = this.scene.add.text(-46, 0, '▼', {
            fontFamily: 'Special Elite',
            fontSize: '15px',
            color: '#f0e68c',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const arrowRight = this.scene.add.text(46, 0, '▼', {
            fontFamily: 'Special Elite',
            fontSize: '15px',
            color: '#f0e68c',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.toggleArrows = { left: arrowLeft, right: arrowRight };

        const hitBox = this.scene.add.rectangle(0, 0, btnW, btnH, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        hitBox.on('pointerdown', () => this.toggle());

        hitBox.on('pointerover', () => {
            this.setHotkeyLabelColors(this.toggleText, '#ffffff', '#ffd54a');
            this.toggleText.setScale(1.05);
            arrowLeft.setColor('#ffffff').setScale(1.05);
            arrowRight.setColor('#ffffff').setScale(1.05);
        });

        hitBox.on('pointerout', () => {
            this.setHotkeyLabelColors(this.toggleText, '#f0e68c', '#ffcc00');
            this.toggleText.setScale(1.0);
            arrowLeft.setColor('#f0e68c').setScale(1.0);
            arrowRight.setColor('#f0e68c').setScale(1.0);
        });

        this.toggleContainer.add([graphics, arrowLeft, this.toggleText, arrowRight, hitBox]);
    }

    createMenuButtons() {
        const buttonsData = [
            { key: 'filebutt', label: 'Case File', hotkey: 'f', action: () => this.openCasefile() },
            { key: 'note', label: 'Notebook', hotkey: 'n', action: () => this.openNotes() },
            { key: 'atlas', label: 'Atlas', hotkey: 'a', action: () => this.openAtlas() },
            { key: 'plane', label: 'Travel', hotkey: 't', action: () => this.openDestinations() },
            { key: 'warrant', label: 'Warrant', hotkey: 'w', action: () => this.openWarrant() },
            { key: 'crime_board', label: 'Crime Board', hotkey: 'c', action: () => this.openCrimeBoard() },
            { key: 'telephone', label: 'Telephone', hotkey: 'p', action: () => this.openPhone() }
        ];

        const count = buttonsData.length;
        const availableWidth = this.config.width - 80;
        const spacing = availableWidth / count;
        const startX = -(availableWidth / 2) + (spacing / 2);

        const iconY = 65;
        const labelY = 132;

        buttonsData.forEach((btn, index) => {
            const xPos = startX + (index * spacing);
            const btnContainer = this.scene.add.container(xPos, 0);

            const iconShadow = this.scene.add.ellipse(0, iconY + 30, 60, 16, 0x000000, 0.5);

            const btnIcon = this.scene.add.image(0, iconY, btn.key)
                .setDisplaySize(this.config.buttonSize, this.config.buttonSize);

            const btnLabel = this.createHotkeyLabel(0, labelY, btn.label, btn.hotkey, {
                fontFamily: 'Special Elite',
                fontSize: '15px',
                baseColor: '#dcdcdc',
                hotkeyColor: '#ffcc00'
            });

            btnContainer.add([iconShadow, btnIcon, btnLabel]);

            btnContainer.setSize(spacing - 8, 150);
            btnContainer.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(
                    -(spacing / 2) + 4,
                    15,
                    spacing - 8,
                    150
                ),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                useHandCursor: true
            });

            btnContainer.on('pointerover', () => {
                this.scene.tweens.add({
                    targets: btnIcon,
                    y: iconY - 6,
                    scaleX: (this.config.buttonSize / btnIcon.width) * 1.08,
                    scaleY: (this.config.buttonSize / btnIcon.height) * 1.08,
                    duration: 150,
                    ease: 'Quad.easeOut'
                });

                this.scene.tweens.add({
                    targets: iconShadow,
                    scaleX: 1.2,
                    alpha: 0.3,
                    duration: 150
                });

                this.setHotkeyLabelColors(btnLabel, '#ffffff', '#ffd54a');
            });

            btnContainer.on('pointerout', () => {
                this.scene.tweens.add({
                    targets: btnIcon,
                    y: iconY,
                    scaleX: this.config.buttonSize / btnIcon.width,
                    scaleY: this.config.buttonSize / btnIcon.height,
                    duration: 150,
                    ease: 'Quad.easeOut'
                });

                this.scene.tweens.add({
                    targets: iconShadow,
                    scaleX: 1.0,
                    alpha: 0.5,
                    duration: 150
                });

                this.setHotkeyLabelColors(btnLabel, '#dcdcdc', '#ffcc00');
            });

            btnContainer.on('pointerdown', () => {
                if (this.scene.sound.get('click_sound')) {
                    this.scene.sound.play('click_sound');
                }

                this.scene.tweens.add({
                    targets: btnContainer,
                    y: 3,
                    duration: 60,
                    yoyo: true,
                    onComplete: () => {
                        btn.action();
                        this.close();
                    }
                });
            });

            this.menuButtons.push(btnContainer);
            this.container.add(btnContainer);
        });
    }

    toggle() {
        if (this.isAnimating) return;
        this.isOpen ? this.close() : this.open();
    }

    open() {
        if (this.isOpen || this.isAnimating) return;

        this.isAnimating = true;
        this.isOpen = true;

        if (this.toggleArrows) {
            this.toggleArrows.left.setText('▲');
            this.toggleArrows.right.setText('▲');
        }

        this.scene.tweens.add({
            targets: this.container,
            y: this.openY,
            duration: 350,
            ease: 'Back.easeOut',
            easeParams: [0.7],
            onComplete: () => {
                this.isAnimating = false;
            }
        });

        this.scene.tweens.add({
            targets: this.toggleContainer,
            y: this.openY - 18,
            duration: 350,
            ease: 'Back.easeOut',
            easeParams: [0.7]
        });
    }

    close() {
        if (!this.isOpen || this.isAnimating) return;

        this.isAnimating = true;
        this.isOpen = false;

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
            }
        });

        this.scene.tweens.add({
            targets: this.toggleContainer,
            y: height - 19,
            duration: 300,
            ease: 'Power2'
        });
    }

    openCasefile() {
        if (!this.scene.caseFileUI) return;

        const mission = this.gameState.currentMission;

        if (!mission) {
            console.warn('Brak currentMission — nie otwieram case file.');
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
    }

    openNotes() {
        if (this.scene.notesUI) {
            this.scene.closeAllUIPanels();
            this.scene.notesUI.open(this.gameState);
        }
    }

    openAtlas() {
        if (!this.scene.atlasUI) return;

        this.scene.closeAllUIPanels();

        const mission = this.gameState.currentMission || {};
        const missionCountry = String(mission.country || '').trim().toLowerCase();

        if (missionCountry && this.scene.atlasUI.openToCountry) {
            this.scene.atlasUI.openToCountry(missionCountry);
            return;
        }

        this.scene.atlasUI.open();
    }

    openDestinations() {
        if (this.scene.destinationsUI) {
            this.scene.closeAllUIPanels();
            this.scene.destinationsUI.open(this.gameState);
        }
    }

    openWarrant() {
        if (this.scene.warrantUI) {
            this.scene.closeAllUIPanels();
            this.scene.warrantUI.open(this.gameState);
        }
    }

    async openCrimeBoard() {
        if (!this.scene.crimeBoardUI) return;

        this.scene.closeAllUIPanels();
        await this.scene.crimeBoardUI.open(this.gameState);

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
            this.scene.scene.launch('PhoneScene', { gameState: this.gameState });
        }
    }

    destroy() {
        if (this.scene.input?.keyboard) {
            this.scene.input.keyboard.off('keydown-M', this.boundToggleHandler);
            this.scene.input.keyboard.removeCapture('M');
        }

        this.scene.tweens.killTweensOf(this.container);
        this.scene.tweens.killTweensOf(this.toggleContainer);
        this.scene.tweens.killTweensOf(this.toggleText);

        if (this.toggleArrows) {
            this.scene.tweens.killTweensOf(this.toggleArrows.left);
            this.scene.tweens.killTweensOf(this.toggleArrows.right);
        }

        this.menuButtons.forEach(btn => btn?.removeAllListeners?.());
        this.menuButtons = [];

        this.toggleContainer?.destroy(true);
        this.container?.destroy(true);

        this.toggleContainer = null;
        this.container = null;
        this.toggleText = null;
        this.toggleArrows = null;
        this.isOpen = false;
        this.isAnimating = false;
    }
}