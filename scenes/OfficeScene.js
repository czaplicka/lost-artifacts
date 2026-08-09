import { audioManager } from '../AudioManager.js';
import { OfficeSaveUI } from '../OfficeSaveUI.js';
import { gameState } from '../GameData.js';
import { BaseScene } from './BaseScene.js';

export class OfficeScene extends BaseScene {
    constructor() {
        super('OfficeScene');

        this.currentView = 'biuro';
        this.viewPositions = {};
        this.hotspots = [];
        this.debugTexts = [];
        this.DEBUG_HOTSPOTS = true;
        this.saveUI = null;

        this.officeAmbient = null;
        this.debugGraphics = null;

        this.leftArrow = null;
        this.rightArrow = null;
        this.crimeLabArrow = null;
        this.navHint = null;
        this.introHint = null;

        this.uiLocked = false;
        this.isOpeningCrimeLab = false;
    }

init(data = {}) {
  this.gameState = data.gameState ?? gameState;
  this.fromSave = data.fromSave ?? false;
  this.saveSlotKey = data.saveSlotKey ?? null;
}

    create() {
            super.create();
        audioManager.init(this);
        audioManager.stopAllVoice();
        audioManager.stopAllSfx();

        const { width, height } = this.scale;
                  this.scene.launch('NewsHud');
this.scene.bringToTop('NewsHud');
this.scene.get('NewsHud').events.emit('setNewspaperVisible', true);
this.registry.set('currentCity', 'hq');

        this.createBackgrounds(width, height);
        this.createCameraSetup(height);
        this.createHotspots();
this.createNavigationUI();

try {
  this.saveUI = new OfficeSaveUI(this, {
    locationType: 'office',
    locationCode: 'agency_headquarters',
    cityCode: 'hq'
  });

  this.saveUI.createButton();
} catch (error) {
  console.error(
    '[OfficeScene] Failed to initialize OfficeSaveUI. ' +
    'The office will continue without save controls.',
    error
  );

  this.saveUI = null;
}
        this.setupAudioUnlock();
        this.createOptionalDebug();

        this.playOfficeAmbient();

        this.goToView('biuro', false);
        this.showIntroHint();

        this.input.keyboard.on('keydown-LEFT', this.moveLeft, this);
        this.input.keyboard.on('keydown-RIGHT', this.moveRight, this);
        this.input.keyboard.on('keydown-L', this.openCrimeLabHotkey, this);

        this.events.on(Phaser.Scenes.Events.WAKE, this.onWakeOrResume, this);
        this.events.on(Phaser.Scenes.Events.RESUME, this.onWakeOrResume, this);
        this.events.on(Phaser.Scenes.Events.SLEEP, this.onSleep, this);
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    }

    onWakeOrResume() {
        this.isOpeningCrimeLab = false;
        this.applyLock(false);
        this.updateNavVisibility();

        if (!this.officeAmbient || !this.officeAmbient.isPlaying) {
            this.playOfficeAmbient();
        }
    }

    onSleep() {
        this.hideNavHint();

        if (this.officeAmbient?.isPlaying) {
            this.officeAmbient.pause();
        }
    }

    openCrimeLabHotkey() {
        this.openCrimeLab();
    }

    openCrimeLab() {
        if (this.uiLocked || this.isOpeningCrimeLab) return;

        this.isOpeningCrimeLab = true;
        this.hideNavHint();

        audioManager.playSfx('click_sound');

        this.scene.pause();
        this.scene.launch('CrimeLabScene', { gameState: this.gameState });
    }

update() {
  const hud = this.getHudScene();

  const hudPanelOpen = !!(
    hud
    && hud.isAnyPanelOpen
    && hud.isAnyPanelOpen()
  );

  const savePanelOpen = !!this.saveUI?.isOpen;

  const shouldLockOffice = hudPanelOpen || savePanelOpen;

  if (shouldLockOffice && !this.uiLocked) {
    this.applyLock(true);
  } else if (!shouldLockOffice && this.uiLocked) {
    this.applyLock(false);
  }
}

    applyLock(locked) {
  this.uiLocked = locked;

  this.hotspots.forEach((zone) => {
    if (!zone || !zone.scene) return;

    if (locked) {
      zone.disableInteractive();
    } else {
      zone.setInteractive({ useHandCursor: true });
    }
  });

  if (this.leftArrow) {
    if (locked) {
      this.leftArrow.disableInteractive();
      this.leftArrow.setAlpha(0.35);
    } else {
      this.leftArrow.setInteractive({ useHandCursor: true });
      this.leftArrow.setAlpha(0.75);
    }
  }

  if (this.rightArrow) {
    if (locked) {
      this.rightArrow.disableInteractive();
      this.rightArrow.setAlpha(0.35);
    } else {
      this.rightArrow.setInteractive({ useHandCursor: true });
      this.rightArrow.setAlpha(0.75);
    }
  }

  this.saveUI?.setLocked(locked);

  if (locked) {
    this.hideNavHint();
  } else {
    this.updateNavVisibility();
  }
}
    createBackgrounds(gameWidth, gameHeight) {
        const leftBg = this.add.image(0, 0, 'backgroundhi').setOrigin(0, 0);
        const centerBg = this.add.image(gameWidth, 0, 'backgroundoff').setOrigin(0, 0);
        const rightBg = this.add.image(gameWidth * 2, 0, 'backgroundset').setOrigin(0, 0);

        [leftBg, centerBg, rightBg].forEach(bg => bg.setDisplaySize(gameWidth, gameHeight));

        this.rooms = {
            office: { key: 'office', bg: leftBg, x: 0, width: gameWidth },
            biuro: { key: 'biuro', bg: centerBg, x: gameWidth, width: gameWidth },
            cabinet: { key: 'cabinet', bg: rightBg, x: gameWidth * 2, width: gameWidth }
        };

        this.totalWidth = gameWidth * 3;

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
            { id: 'desk', room: 'biuro', x: this.rooms.biuro.x + 300, y: 500, width: 720, height: 250, label: 'Desk', action: () => this.openWarrant() },
            { id: 'crime-board', room: 'biuro', x: this.rooms.biuro.x + 10, y: 10, width: 800, height: 470, label: 'Crime Board', action: () => this.openCrimeBoard() },
            { id: 'globe', room: 'office', x: this.rooms.office.x + 1065, y: 490, width: 135, height: 160, label: 'Globus', action: () => this.openDestinations() },
            { id: 'cabinet-casefile', room: 'office', x: this.rooms.office.x + 1525, y: 480, width: 380, height: 450, label: 'Cabinet', action: () => this.openCasefile() },
            { id: 'book-notes', room: 'cabinet', x: this.rooms.cabinet.x + 525, y: 705, width: 190, height: 100, label: 'Book', action: () => this.openNotes() },
            { id: 'WantedDatabase', room: 'cabinet', x: this.rooms.cabinet.x + 605, y: 480, width: 130, height: 130, label: 'Wanted Database', action: () => this.openWantedDatabase() },
            { id: 'recovered-artifacts', room: 'cabinet', x: this.rooms.cabinet.x + 820, y: 150, width: 785, height: 725, label: 'Recovered Artifacts', action: () => this.openRecoveredArtifacts() },
            { id: 'atlas', room: 'cabinet', x: this.rooms.cabinet.x + 280, y: 270, width: 325, height: 270, label: 'Atlas', action: () => this.openAtlas() }
        ];

        hotspotData.forEach((data) => {
            const zone = this.add.zone(data.x, data.y, data.width, data.height)
                .setOrigin(0, 0)
                .setDepth(50)
                .setInteractive({ useHandCursor: true });

            zone.hotspotData = data;

            zone.on('pointerover', () => this.onHotspotOver(data));
            zone.on('pointerout', () => this.onHotspotOut());
            zone.on('pointerdown', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                audioManager.playSfx('click_sound');
                data.action();
            });

            this.hotspots.push(zone);
        });
    }

    openRecoveredArtifacts() {
        this.scene.pause();
        this.scene.launch('RecoveredArtifactsScene', { gameState: this.gameState });
    }

    openWantedDatabase() {
        this.scene.pause();
        this.scene.launch('WantedDatabaseScene', { gameState: this.gameState });
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

    openAtlas() {
        const hud = this.getHudScene();
        if (!hud?.atlasUI) {
            console.warn('[OfficeScene] atlasUI not found in HUD scene');
            return;
        }

        this.closeAllUIPanels();

        const mission = this.gameState.currentMission || {};

        hud.atlasUI.open({
            country: mission.country || '',
            city: mission.city || '',
            artifact: mission.artifact || '',
            gameState: this.gameState
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
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0.75).setInteractive({ useHandCursor: true });

        this.rightArrow = this.add.text(width - 46, height / 2, '▶', {
            fontFamily: 'Special Elite',
            fontSize: '54px',
            color: '#f0e6b8',
            backgroundColor: 'rgba(0,0,0,0.15)',
            padding: { left: 8, right: 8, top: 8, bottom: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0.75).setInteractive({ useHandCursor: true });

        this.navHint = this.add.text(width / 2, 84, '', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#f0e6b8',
            backgroundColor: '#000000',
            padding: { left: 10, right: 10, top: 8, bottom: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(220).setVisible(false);

        this.introHint = this.add.text(width / 2, 40, 'Explore the office — move left or right', {
            fontFamily: 'Special Elite',
            fontSize: '18px',
            color: '#fff4c7',
            backgroundColor: '#000000',
            padding: { left: 12, right: 12, top: 8, bottom: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(220).setAlpha(0);

        this.leftArrow
            .on('pointerdown', () => this.moveLeft())
            .on('pointerover', () => {
                if (this.uiLocked) return;
                this.leftArrow.setScale(1.08);
                this.leftArrow.setAlpha(1);
                this.showNavHint(this.getLeftRoomLabel());
            })
            .on('pointerout', () => {
                this.leftArrow.setScale(1);
                if (!this.uiLocked) this.leftArrow.setAlpha(0.75);
                this.hideNavHint();
            });

        this.rightArrow
            .on('pointerdown', () => this.moveRight())
            .on('pointerover', () => {
                if (this.uiLocked) return;
                this.rightArrow.setScale(1.08);
                this.rightArrow.setAlpha(1);
                this.showNavHint(this.getRightRoomLabel());
            })
            .on('pointerout', () => {
                this.rightArrow.setScale(1);
                if (!this.uiLocked) this.rightArrow.setAlpha(0.75);
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

        this.tweens.add({ targets: this.introHint, alpha: 1, duration: 350, ease: 'Power2' });

        this.time.delayedCall(2800, () => {
            if (!this.introHint) return;
            this.tweens.add({ targets: this.introHint, alpha: 0, duration: 500, ease: 'Power2' });
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
        if (this.officeAmbient && this.officeAmbient.isPlaying) return this.officeAmbient;
        this.officeAmbient = audioManager.playAmbient('officescenesound', { loop: true });
        return this.officeAmbient;
    }

    moveLeft() {
        if (this.uiLocked) return;
        if (this.currentView === 'biuro') {
            this.goToView('office');
        } else if (this.currentView === 'cabinet') {
            this.goToView('biuro');
        }
    }

    moveRight() {
        if (this.uiLocked) return;
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
        if (this.leftArrow) this.leftArrow.setVisible(this.currentView !== 'office');
        if (this.rightArrow) this.rightArrow.setVisible(this.currentView !== 'cabinet');
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
        if (!data?.label || this.uiLocked) return;
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
        this.saveUI?.destroy();
this.saveUI = null;
        if (this.input?.keyboard) {
            this.input.keyboard.off('keydown-LEFT', this.moveLeft, this);
            this.input.keyboard.off('keydown-RIGHT', this.moveRight, this);
            this.input.keyboard.off('keydown-L', this.openCrimeLabHotkey, this);
        }

        this.events.off(Phaser.Scenes.Events.WAKE, this.onWakeOrResume, this);
        this.events.off(Phaser.Scenes.Events.RESUME, this.onWakeOrResume, this);
        this.events.off(Phaser.Scenes.Events.SLEEP, this.onSleep, this);
        this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);

        if (this.input) {
            this.input.enabled = false;
        }

        this.hotspots.forEach(zone => {
            if (!zone) return;
            try {
                zone.removeAllListeners();
                if (zone.active && zone.scene) {
                    zone.destroy();
                }
            } catch (error) {
                console.warn('[OfficeScene.cleanupScene] hotspot cleanup failed:', error);
            }
        });
        this.hotspots = [];

        if (this.debugGraphics) {
            try {
                this.debugGraphics.destroy();
            } catch (error) {
                console.warn('[OfficeScene.cleanupScene] debugGraphics cleanup failed:', error);
            }
            this.debugGraphics = null;
        }

        this.debugTexts.forEach(text => {
            if (!text) return;
            try {
                if (text.active && text.scene) {
                    text.destroy();
                }
            } catch (error) {
                console.warn('[OfficeScene.cleanupScene] debugText cleanup failed:', error);
            }
        });
        this.debugTexts = [];

        if (this.leftArrow) {
            try {
                this.leftArrow.removeAllListeners();
                if (this.leftArrow.active && this.leftArrow.scene) {
                    this.leftArrow.destroy();
                }
            } catch (error) {
                console.warn('[OfficeScene.cleanupScene] leftArrow cleanup failed:', error);
            }
            this.leftArrow = null;
        }

        if (this.rightArrow) {
            try {
                this.rightArrow.removeAllListeners();
                if (this.rightArrow.active && this.rightArrow.scene) {
                    this.rightArrow.destroy();
                }
            } catch (error) {
                console.warn('[OfficeScene.cleanupScene] rightArrow cleanup failed:', error);
            }
            this.rightArrow = null;
        }

        if (this.crimeLabArrow) {
            try {
                this.crimeLabArrow.removeAllListeners();
                if (this.crimeLabArrow.active && this.crimeLabArrow.scene) {
                    this.crimeLabArrow.destroy();
                }
            } catch (error) {
                console.warn('[OfficeScene.cleanupScene] crimeLabArrow cleanup failed:', error);
            }
            this.crimeLabArrow = null;
        }

        if (this.navHint) {
            try {
                if (this.navHint.active && this.navHint.scene) {
                    this.navHint.destroy();
                }
            } catch (error) {
                console.warn('[OfficeScene.cleanupScene] navHint cleanup failed:', error);
            }
            this.navHint = null;
        }

        if (this.introHint) {
            try {
                if (this.introHint.active && this.introHint.scene) {
                    this.introHint.destroy();
                }
            } catch (error) {
                console.warn('[OfficeScene.cleanupScene] introHint cleanup failed:', error);
            }
            this.introHint = null;
        }

        if (this.officeAmbient) {
            try {
                if (this.officeAmbient.isPlaying) {
                    this.officeAmbient.stop();
                }
                this.officeAmbient.destroy();
            } catch (error) {
                console.warn('[OfficeScene.cleanupScene] officeAmbient cleanup failed:', error);
            }
            this.officeAmbient = null;
        }
    }
}