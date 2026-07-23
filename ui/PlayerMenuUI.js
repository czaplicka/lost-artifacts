export class PlayerMenuUI {
    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.isOpen = false;
        this.isAnimating = false;

        const { width, height } = this.scene.scale;

        this.config = {
            width: Math.min(1180, width * 0.92),
            height: 185,
            buttonSize: 72
        };

        this.closedY = height;
        this.openY = height - this.config.height;

        // Główny kontener menu
        this.container = this.scene.add.container(width / 2, this.closedY).setDepth(40);

        // --- GENEROWANIE KLIMATYCZNEGO PANELA MENU ---
        this.createCustomBackground();

        // --- PRZYCISK TOGGLE (MOSIĘŻNA TABLICZKA) ---
        this.createToggleButton(width, height);

        // --- TWORZENIE PRZYCISKÓW Z IKONAMI ---
        this.createMenuButtons();
    }

    createCustomBackground() {
        const w = this.config.width;
        const h = this.config.height;
        const graphics = this.scene.add.graphics();

        // 1. Zewnętrzny cień pod całym panelem
        graphics.fillStyle(0x000000, 0.5);
        graphics.fillRoundedRect(-w / 2 - 4, -4, w + 8, h + 8, 12);

        // 2. Mosiężna / drewniana zewnętrzna rama
        graphics.fillStyle(0x2b1e18, 1); // Ciemny, ciepły brąz
        graphics.fillRoundedRect(-w / 2, 0, w, h, 10);

        // 3. Wewnętrzny złoto-mosiężny profil ramy
        graphics.lineStyle(3, 0xb8860b, 0.8); // Dark Goldenrod
        graphics.strokeRoundedRect(-w / 2 + 3, 3, w - 6, h - 6, 8);

        // 4. Ciemne skórzane/aksamitne tło wewnętrzne
        graphics.fillStyle(0x161311, 0.96); 
        graphics.fillRoundedRect(-w / 2 + 8, 8, w - 16, h - 16, 6);

        // 5. Cień wewnętrzny (Inset Shadow) dla efektu głębi
        graphics.lineStyle(2, 0x000000, 0.7);
        graphics.strokeRoundedRect(-w / 2 + 9, 9, w - 18, h - 18, 5);

        // 6. Mosiężne nity/śruby w 4 rogach menu
        const rivets = [
            { x: -w / 2 + 18, y: 18 },
            { x: w / 2 - 18, y: 18 },
            { x: -w / 2 + 18, y: h - 18 },
            { x: w / 2 - 18, y: h - 18 }
        ];

        rivets.forEach(r => {
            graphics.fillStyle(0x8b6508, 1); // Złoty mosiądz
            graphics.fillCircle(r.x, r.y, 4);
            graphics.fillStyle(0xffd700, 0.6); // Błysk na śrubie
            graphics.fillCircle(r.x - 1, r.y - 1, 1.5);
            graphics.lineStyle(1, 0x1a100c, 1);
            graphics.strokeCircle(r.x, r.y, 4);
        });

        // Włączenie interakcji na tle, aby kliknięcia nie „przebijały” do gry
        const bgHitArea = this.scene.add.rectangle(0, h / 2, w, h, 0x000000, 0).setInteractive();
        
        this.container.add([graphics, bgHitArea]);
    }

    createToggleButton(screenWidth, screenHeight) {
        const btnW = 180;
        const btnH = 38;

        this.toggleContainer = this.scene.add.container(screenWidth / 2, screenHeight - (btnH / 2)).setDepth(41);

        const graphics = this.scene.add.graphics();

        // Mosiężna tabliczka przycisku
        graphics.fillStyle(0x2b1e18, 1);
        graphics.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, { tl: 8, tr: 8, bl: 0, br: 0 });
        
        graphics.lineStyle(2, 0xb8860b, 0.9);
        graphics.strokeRoundedRect(-btnW / 2 + 2, -btnH / 2 + 2, btnW - 4, btnH - 2, { tl: 6, tr: 6, bl: 0, br: 0 });

        graphics.fillStyle(0x4a0e0e, 1); // Ciemny, elegancki burgund zamiast jasnego czerwonego
        graphics.fillRoundedRect(-btnW / 2 + 5, -btnH / 2 + 5, btnW - 10, btnH - 5, { tl: 4, tr: 4, bl: 0, br: 0 });

        this.toggleText = this.scene.add.text(0, 0, '▼ MENU ▼', {
            fontFamily: 'Special Elite', // Stylizowany czcionką maszyny do pisania / detektywistyczną
            fontSize: '15px',
            color: '#f0e68c', // Khaki / złotawe
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Strefa kliknięcia
        const hitBox = this.scene.add.rectangle(0, 0, btnW, btnH, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        hitBox.on('pointerdown', () => this.toggle());
        
        // Hover efekt dla tabliczki
        hitBox.on('pointerover', () => {
            this.toggleText.setColor('#ffffff');
            this.toggleText.setScale(1.05);
        });
        hitBox.on('pointerout', () => {
            this.toggleText.setColor('#f0e68c');
            this.toggleText.setScale(1.0);
        });

        this.toggleContainer.add([graphics, this.toggleText, hitBox]);
    }

    createMenuButtons() {
        const buttonsData = [
            { key: 'filebutt', label: 'Case File', action: () => this.openCasefile() },
            { key: 'note', label: 'Notes', action: () => this.openNotes() },
            { key: 'plane', label: 'Travel', action: () => this.openDestinations() },
            { key: 'warrant', label: 'Warrent', action: () => this.openWarrant() },
            { key: 'crime_board', label: 'Crime Board', action: () => this.openCrimeBoard() },
            { key: 'telephone', label: 'Telephone', action: () => this.openPhone() }
        ];

        const count = buttonsData.length;
        const availableWidth = this.config.width - 80; // Odstęp od krawędzi ramy
        const spacing = availableWidth / count;
        const startX = -(availableWidth / 2) + (spacing / 2);

        const iconY = 65;
        const labelY = 132;

        buttonsData.forEach((btn, index) => {
            const xPos = startX + (index * spacing);

            const btnContainer = this.scene.add.container(xPos, 0);

            // Cień pod ikona
            const iconShadow = this.scene.add.ellipse(0, iconY + 30, 60, 16, 0x000000, 0.5);

            // Ikona
            const btnIcon = this.scene.add.image(0, iconY, btn.key)
                .setDisplaySize(this.config.buttonSize, this.config.buttonSize);

            // Podpis
            const btnLabel = this.scene.add.text(0, labelY, btn.label, {
                fontFamily: 'Special Elite',
                fontSize: '15px',
                color: '#dcdcdc',
                align: 'center',
                wordWrap: { width: spacing - 10 }
            }).setOrigin(0.5, 0);

            btnContainer.add([iconShadow, btnIcon, btnLabel]);

            // Trójwymiarowy obszar trafienia wokół ikony i tekstu
            const hitArea = new Phaser.Geom.Rectangle(
                -(spacing / 2) + 4,
                15,
                spacing - 8,
                150
            );

            btnContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, true);
            btnContainer.useHandCursor = true;

            // Efekty animacji po najechaniu myszką
            btnContainer.on('pointerover', () => {
                this.scene.tweens.add({
                    targets: btnIcon,
                    y: iconY - 6, // Lekkie uniesienie ikony do góry
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

                btnLabel.setColor('#ffcc00');
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

                btnLabel.setColor('#dcdcdc');
            });

            btnContainer.on('pointerdown', () => {
                if (this.scene.sound.get('click_sound')) {
                    this.scene.sound.play('click_sound');
                }

                // Efekt kliknięcia (wciśnięcie)
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

            this.container.add(btnContainer);
        });
    }

    toggle() {
        if (this.isAnimating) return;
        this.isOpen ? this.close() : this.open();
    }

    open() {
        if (this.isOpen) return;

        this.isAnimating = true;
        this.isOpen = true;
        this.toggleText.setText('▲ CLOSE ▲');

        this.scene.tweens.add({
            targets: this.container,
            y: this.openY,
            duration: 350,
            ease: 'Back.easeOut', // Lekki efekt sprężynowania przy wyjeździe
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
        if (!this.isOpen) return;

        this.isAnimating = true;
        this.isOpen = false;
        this.toggleText.setText('▼ MENU ▼');

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

    // --- LOGIKA OBSŁUGI ZDAREŃ ---

    openCasefile() {
        if (!this.scene.caseFileUI) return;
        this.scene.closeAllUIPanels();
        const mission = this.gameState.currentMission || {};
        this.scene.caseFileUI.open({
            artifact: mission.artifact,
            city: mission.city,
            country: mission.country,
            description: mission.description,
            significance: mission.significance,
            clue: mission.clue,
            artifactKey: mission.artifactKey
        });
    }

    openNotes() {
        if (this.scene.notesUI) {
            this.scene.closeAllUIPanels();
            this.scene.notesUI.open(this.gameState);
        }
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

    // crimeBoardUI.open zrobi: wczyta HTML, zawoła initCrimeBoard(...)
    await this.scene.crimeBoardUI.open(this.gameState);

    // po otwarciu, jeśli boardApi jest, zapisujemy jego stan do gameState
    const boardApi = this.scene.crimeBoardUI.boardApi;
    if (boardApi?.getData) {
        this.gameState.crimeBoardData = boardApi.getData();
    }

    this.close();
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
}