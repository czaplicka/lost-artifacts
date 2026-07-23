export class OfficeScene extends Phaser.Scene {
    constructor() {
        super('OfficeScene');

        this.currentView = 'biuro';
        this.viewPositions = {};
        this.hotspots = [];
        this.debugTexts = [];
        this.DEBUG_HOTSPOTS = true;

        this.officeAmbient = null;
        this.debugGraphics = null;

        this.leftArrow = null;
        this.rightArrow = null;
        this.navHint = null;
        this.introHint = null;
    }

    init(data) {
        this.gameState = data?.gameState || this.gameState || {};
    }

    create() {
        const { height } = this.scale;

        this.createBackgrounds();
        this.createCameraSetup(height);
        this.createHotspots();
        this.createNavigationUI();
        this.setupAudioUnlock();
        this.createOptionalDebug();

        this.goToView('biuro', false);
        this.showIntroHint();

        this.input.keyboard.on('keydown-LEFT', this.moveLeft, this);
        this.input.keyboard.on('keydown-RIGHT', this.moveRight, this);
        this.input.keyboard.on('keydown-A', this.moveLeft, this);
        this.input.keyboard.on('keydown-D', this.moveRight, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.cleanupScene();
        });
    }

    createBackgrounds() {
        const leftBg = this.add.image(0, 0, 'backgroundhi').setOrigin(0, 0); // office
        const centerBg = this.add.image(leftBg.width, 0, 'backgroundoff').setOrigin(0, 0); // biuro
        const rightBg = this.add.image(leftBg.width + centerBg.width, 0, 'backgroundset').setOrigin(0, 0); // cabinet

        this.rooms = {
            office: {
                key: 'office',
                bg: leftBg,
                x: leftBg.x,
                width: leftBg.width
            },
            biuro: {
                key: 'biuro',
                bg: centerBg,
                x: centerBg.x,
                width: centerBg.width
            },
            cabinet: {
                key: 'cabinet',
                bg: rightBg,
                x: rightBg.x,
                width: rightBg.width
            }
        };

        this.totalWidth = leftBg.width + centerBg.width + rightBg.width;

        this.viewPositions = {
            office: this.rooms.office.x,
            biuro: this.rooms.biuro.x,
            cabinet: this.rooms.cabinet.x
        };
    }

    createCameraSetup(height) {
        this.cameras.main.setBounds(0, 0, this.totalWidth, height);
    }

    getHudScene() {
        if (this.scene.isActive('PlayerHudScene')) {
            return this.scene.get('PlayerHudScene');
        }

        if (this.scene.isActive('UIScene')) {
            return this.scene.get('UIScene');
        }

        return null;
    }

    createHotspots() {
        const hotspotData = [
            {
                id: 'desk',
                room: 'biuro',
                x: this.rooms.biuro.x + 300,
                y: 470,
                width: 220,
                height: 150,
                label: 'Desk',
                action: () => this.openWarrant()
            },
            {
                id: 'crime-board',
                room: 'biuro',
                x: this.rooms.biuro.x + 760,
                y: 210,
                width: 250,
                height: 230,
                label: 'Crime Board',
                action: () => this.openCrimeBoard()
            },
            {
                id: 'globe',
                room: 'office',
                x: this.rooms.office.x + 840,
                y: 420,
                width: 130,
                height: 150,
                label: 'Globus',
                action: () => this.openDestinations()
            },
            {
                id: 'cabinet-casefile',
                room: 'office',
                x: this.rooms.office.x + 1035,
                y: 215,
                width: 210,
                height: 355,
                label: 'Cabinet',
                action: () => this.openCasefile()
            },
            {
                id: 'book-notes',
                room: 'cabinet',
                x: this.rooms.cabinet.x + 520,
                y: 500,
                width: 180,
                height: 95,
                label: 'Book',
                action: () => this.openNotes()
            }
        ];

        hotspotData.forEach((data) => {
            const zone = this.add.zone(data.x, data.y, data.width, data.height)
                .setOrigin(0, 0)
                .setDepth(50)
                .setInteractive({ useHandCursor: true });

            zone.hotspotData = data;

            zone.on('pointerover', () => this.onHotspotOver(data));
            zone.on('pointerout', () => this.onHotspotOut());
            zone.on('pointerdown', () => {
                console.log('[OfficeScene] HOTSPOT CLICK:', data.id);

                if (this.sound.get('click_sound')) {
                    this.sound.play('click_sound');
                }

                data.action();
            });

            this.hotspots.push(zone);
        });
    }

    createNavigationUI() {
        const { width, height } = this.scale;

        this.leftArrow = this.add.text(46, height / 2, '◀', {
            fontFamily: 'Special Elite',
            fontSize: '54px',
            color: '#f0e6b8',
            backgroundColor: 'rgba(0,0,0,0.15)',
            padding: { left: 8, right: 8, top: 8, bottom: 8 }
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(200)
            .setAlpha(0.75)
            .setInteractive({ useHandCursor: true });

        this.rightArrow = this.add.text(width - 46, height / 2, '▶', {
            fontFamily: 'Special Elite',
            fontSize: '54px',
            color: '#f0e6b8',
            backgroundColor: 'rgba(0,0,0,0.15)',
            padding: { left: 8, right: 8, top: 8, bottom: 8 }
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(200)
            .setAlpha(0.75)
            .setInteractive({ useHandCursor: true });

        this.navHint = this.add.text(width / 2, 84, '', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#f0e6b8',
            backgroundColor: '#000000',
            padding: { left: 10, right: 10, top: 8, bottom: 8 }
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(220)
            .setVisible(false);

        this.introHint = this.add.text(width / 2, 40, 'Explore the office — move left or right', {
            fontFamily: 'Special Elite',
            fontSize: '18px',
            color: '#fff4c7',
            backgroundColor: '#000000',
            padding: { left: 12, right: 12, top: 8, bottom: 8 }
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(220)
            .setAlpha(0);

        this.leftArrow
            .on('pointerdown', () => this.moveLeft())
            .on('pointerover', () => {
                this.leftArrow.setScale(1.08);
                this.leftArrow.setAlpha(1);
                this.showNavHint(this.getLeftRoomLabel());
            })
            .on('pointerout', () => {
                this.leftArrow.setScale(1);
                this.leftArrow.setAlpha(0.75);
                this.hideNavHint();
            });

        this.rightArrow
            .on('pointerdown', () => this.moveRight())
            .on('pointerover', () => {
                this.rightArrow.setScale(1.08);
                this.rightArrow.setAlpha(1);
                this.showNavHint(this.getRightRoomLabel());
            })
            .on('pointerout', () => {
                this.rightArrow.setScale(1);
                this.rightArrow.setAlpha(0.75);
                this.hideNavHint();
            });

        this.tweens.add({
            targets: [this.leftArrow, this.rightArrow],
            alpha: { from: 0.55, to: 0.9 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.updateNavVisibility();
    }

    showIntroHint() {
        if (!this.introHint) return;

        this.tweens.add({
            targets: this.introHint,
            alpha: 1,
            duration: 350,
            ease: 'Power2'
        });

        this.time.delayedCall(2800, () => {
            if (!this.introHint) return;

            this.tweens.add({
                targets: this.introHint,
                alpha: 0,
                duration: 500,
                ease: 'Power2'
            });
        });
    }

    setupAudioUnlock() {
        this.input.once('pointerdown', () => {
            if (this.sound?.context?.state === 'suspended') {
                this.sound.context.resume();
            }

            this.playOfficeAmbient();
        });
    }

    playOfficeAmbient() {
        if (this.officeAmbient?.isPlaying) return;

        this.sound.volume = 1;

        this.officeAmbient = this.sound.add('officescenesound', {
            loop: true,
            volume: 1
        });

        if (this.officeAmbient) {
            this.officeAmbient.play();
            console.log('[OfficeScene] OFFICE AMBIENT STARTED:', this.officeAmbient.isPlaying);
        }
    }

    moveLeft() {
        if (this.currentView === 'biuro') {
            this.goToView('office');
        } else if (this.currentView === 'cabinet') {
            this.goToView('biuro');
        }
    }

    moveRight() {
        if (this.currentView === 'office') {
            this.goToView('biuro');
        } else if (this.currentView === 'biuro') {
            this.goToView('cabinet');
        }
    }

    goToView(viewName, animate = true) {
        const targetX = this.viewPositions[viewName];
        if (targetX === undefined) return;

        this.currentView = viewName;
        this.updateNavVisibility();
        this.hideNavHint();

        if (!animate) {
            this.cameras.main.scrollX = targetX;
            return;
        }

        this.tweens.add({
            targets: this.cameras.main,
            scrollX: targetX,
            duration: 550,
            ease: 'Sine.easeInOut'
        });
    }

    updateNavVisibility() {
        if (this.leftArrow) {
            this.leftArrow.setVisible(this.currentView !== 'office');
        }

        if (this.rightArrow) {
            this.rightArrow.setVisible(this.currentView !== 'cabinet');
        }
    }

    getLeftRoomLabel() {
        if (this.currentView === 'biuro') return 'Go to office';
        if (this.currentView === 'cabinet') return 'Go to biuro';
        return '';
    }

    getRightRoomLabel() {
        if (this.currentView === 'office') return 'Go to biuro';
        if (this.currentView === 'biuro') return 'Go to cabinet';
        return '';
    }

    showNavHint(text) {
        if (!text || !this.navHint) return;
        this.navHint.setText(text);
        this.navHint.setVisible(true);
    }

    hideNavHint() {
        if (!this.navHint) return;
        this.navHint.setVisible(false);
    }

    onHotspotOver(data) {
        if (!data?.label) return;
        this.showNavHint(data.label);
    }

    onHotspotOut() {
        this.hideNavHint();
    }

    closeAllUIPanels() {
        const hud = this.getHudScene();
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }
    }

    openCasefile() {
        const hud = this.getHudScene();
        if (!hud?.caseFileUI) {
            console.warn('[OfficeScene] caseFileUI not found in HUD scene');
            return;
        }

        this.closeAllUIPanels();

        const mission = this.gameState.currentMission || {};
        hud.caseFileUI.open({
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
        const hud = this.getHudScene();
        if (!hud?.notesUI) {
            console.warn('[OfficeScene] notesUI not found in HUD scene');
            return;
        }

        this.closeAllUIPanels();
        hud.notesUI.open(this.gameState);
    }

    openDestinations() {
        const hud = this.getHudScene();
        if (!hud?.destinationsUI) {
            console.warn('[OfficeScene] destinationsUI not found in HUD scene');
            return;
        }

        this.closeAllUIPanels();
        hud.destinationsUI.open(this.gameState);
    }

    openWarrant() {
        const hud = this.getHudScene();
        if (!hud?.warrantUI) {
            console.warn('[OfficeScene] warrantUI not found in HUD scene');
            return;
        }

        this.closeAllUIPanels();
        hud.warrantUI.open(this.gameState);
    }

    openCrimeBoard() {
        const hud = this.getHudScene();
        if (!hud?.crimeBoardUI) {
            console.warn('[OfficeScene] crimeBoardUI not found in HUD scene');
            return;
        }

        this.closeAllUIPanels();
        hud.crimeBoardUI.open(this.gameState);
    }

    createOptionalDebug() {
        if (!this.DEBUG_HOTSPOTS) return;

        this.debugGraphics = this.add.graphics();
        this.debugGraphics.lineStyle(2, 0x00ffcc, 0.95);

        this.hotspots.forEach((zone) => {
            const d = zone.hotspotData;
            this.debugGraphics.strokeRect(d.x, d.y, d.width, d.height);

            const label = this.add.text(d.x + 8, d.y + 8, d.id, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#00ffcc',
                backgroundColor: '#000000',
                padding: { left: 4, right: 4, top: 2, bottom: 2 }
            }).setDepth(999);

            this.debugTexts.push(label);
        });
    }

    cleanupScene() {
        this.input.keyboard.off('keydown-LEFT', this.moveLeft, this);
        this.input.keyboard.off('keydown-RIGHT', this.moveRight, this);
        this.input.keyboard.off('keydown-A', this.moveLeft, this);
        this.input.keyboard.off('keydown-D', this.moveRight, this);

        this.hotspots.forEach(zone => {
            zone.removeAllListeners();
            zone.disableInteractive();
            zone.destroy();
        });
        this.hotspots = [];

        if (this.debugGraphics) {
            this.debugGraphics.destroy();
            this.debugGraphics = null;
        }

        this.debugTexts.forEach(text => text.destroy());
        this.debugTexts = [];

        if (this.leftArrow) {
            this.leftArrow.removeAllListeners();
            this.leftArrow.destroy();
            this.leftArrow = null;
        }

        if (this.rightArrow) {
            this.rightArrow.removeAllListeners();
            this.rightArrow.destroy();
            this.rightArrow = null;
        }

        if (this.navHint) {
            this.navHint.destroy();
            this.navHint = null;
        }

        if (this.introHint) {
            this.introHint.destroy();
            this.introHint = null;
        }

        if (this.officeAmbient) {
            this.officeAmbient.stop();
            this.officeAmbient.destroy();
            this.officeAmbient = null;
        }
    }
}