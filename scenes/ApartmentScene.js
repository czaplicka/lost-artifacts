// scenes/ApartmentScene.js
// ============================================================
// Point-and-click investigacja w mieszkaniu podejrzanego
// Proceduralne - każdy podejrzany ma inne mieszkanie!
// ============================================================

import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { ApartmentObject } from '../ApartmentObject.js';
import { ApartmentInventoryUI } from '../ApartmentInventoryUI.js';
import { generateApartment } from '../ApartmentGenerator.js';
import { getEscapePhaseController } from '../EscapePhaseController.js';

export class ApartmentScene extends BaseScene {
  constructor() {
    super({ key: 'ApartmentScene' });

    this.suspectId = null;
    this.motive = null;
    this.apartmentConfig = null;
    this.apartmentObjects = [];
    this.playerInventory = null;
    this.messageBox = null;
    this.descriptionBox = null;
    this.isTransitioning = false;
  }

  init(data = {}) {
    const state = gameState.getState?.() || gameState;
    this.suspectId = data.suspectId || state.currentThiefId || 'suspect_001';
    this.motive = data.motive || state.currentMission?.motive || 'gambling_debt';
    
    // Generuj mieszkanie na bazie motywu (proceduralne!)
    this.apartmentConfig = generateApartment(this.suspectId, this.motive);
  }

  create() {
    super.create();

    console.log(`[ApartmentScene] Investigating ${this.suspectId}'s apartment (${this.motive})`);

    const { width, height } = this.scale;

    // ============================================================
    // Background
    // ============================================================
    this.createBackground();

    // ============================================================
    // Inventory System
    // ============================================================
    this.playerInventory = new ApartmentInventoryUI(this);

    // ============================================================
    // Header
    // ============================================================
    this.createHeader();

    // ============================================================
    // Interactive Objects (proceduralne!)
    // ============================================================
    this.createApartmentObjects();

    // ============================================================
    // UI Controls
    // ============================================================
    this.createControls();

    // ============================================================
    // Event Listeners
    // ============================================================
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    EventBus.on('itemCombined', this.onItemCombined, this);

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  createBackground() {
    const { width, height } = this.scale;
    const config = this.apartmentConfig.background;

    // Jeśli jest grafika - załaduj ją
    if (config.imageKey) {
      const bg = this.add.image(width / 2, height / 2, config.imageKey);
      bg.setDisplaySize(width, height);
      bg.setDepth(0);
    } else {
      // Proceduralne tło (living room)
      const bg = this.add.rectangle(width / 2, height / 2, width, height, config.color || 0x2c2c2c);
      bg.setDepth(0);

      // Prosty pattern (wood texture effect)
      for (let x = 0; x < width; x += 50) {
        for (let y = 0; y < height; y += 50) {
          if ((x + y) % 100 === 0) {
            this.add.rectangle(x, y, 2, 2, 0x444444, 0.3).setDepth(1);
          }
        }
      }
    }
  }

  createHeader() {
    const { width } = this.scale;
    const config = this.apartmentConfig;

    // Title
    this.add.text(20, 20, config.title || 'Apartment', {
      fontFamily: 'PressStart2P',
      fontSize: '22px',
      color: '#ffd700'
    }).setDepth(10);

    // Subtitle
    this.add.text(20, 50, config.subtitle || 'What can you find?', {
      fontFamily: 'SpecialElite',
      fontSize: '16px',
      color: '#d9d9d9'
    }).setDepth(10);

    // Inventory button
    const invBtn = this.add.text(width - 20, 20, '[INVENTORY]', {
      fontFamily: 'SpecialElite',
      fontSize: '14px',
      color: '#4caf50'
    });
    invBtn.setOrigin(1, 0);
    invBtn.setInteractive({ useHandCursor: true });
    invBtn.on('pointerdown', () => this.playerInventory.toggle());
    invBtn.setDepth(10);

    // Exit button
    const exitBtn = this.add.text(width - 20, 55, '[EXIT]', {
      fontFamily: 'SpecialElite',
      fontSize: '14px',
      color: '#ff6b6b'
    });
    exitBtn.setOrigin(1, 0);
    exitBtn.setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => this.exitApartment());
    exitBtn.setDepth(10);
  }

  createApartmentObjects() {
    const config = this.apartmentConfig;

    for (const objConfig of config.objects) {
      const obj = new ApartmentObject(this, objConfig);
      this.apartmentObjects.push(obj);
    }

    console.log(`[ApartmentScene] Created ${this.apartmentObjects.length} interactive objects`);
  }

  createControls() {
    const { width, height } = this.scale;

    // Description box (bottom)
    this.descriptionBox = this.add.text(20, height - 60, '', {
      fontFamily: 'SpecialElite',
      fontSize: '13px',
      color: '#d9d9d9',
      wordWrap: { width: width - 40 }
    });
    this.descriptionBox.setDepth(10);
  }

  /**
   * Pokaż wiadomość na ekranie
   */
  showMessage(text, duration = 2000, color = '#37474f') {
    if (!text || !this.sys.isActive()) return null;

    // Jeśli już jest message, usuń go
    if (this.messageBox) {
      this.messageBox.destroy();
    }

    const { width, height } = this.scale;
    const popup = this.add.text(width / 2, height / 2, text, {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: color,
      padding: { x: 20, y: 15 },
      align: 'center',
      wordWrap: { width: width - 60 }
    });
    popup.setOrigin(0.5);
    popup.setDepth(1000);

    this.messageBox = popup;

    this.time.delayedCall(duration, () => {
      if (popup?.active) {
        popup.destroy();
      }
      if (this.messageBox === popup) {
        this.messageBox = null;
      }
    });

    return popup;
  }

  /**
   * Pokaż description (hover)
   */
  showDescription(text) {
    if (this.descriptionBox) {
      this.descriptionBox.setText(text);
    }
  }

  /**
   * Event: item'y kombinują się
   */
  onItemCombined(data) {
    const { result } = data;

    // Sprawdź czy to escape clue
    if (result.isEscapeClue) {
      this.showMessage(
        `CRITICAL: ${result.label}\n\nThe suspect has FLED!`,
        3000,
        '#ff6b6b'
      );

      this.time.delayedCall(3500, () => {
        this.triggerEscapePhase();
      });
    }
  }

  /**
   * Trigger Escape Phase - gracz znalazł dowód ucieczki!
   */
  triggerEscapePhase() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    EventBus.emit('thiefEscaped');

    const escapeCtrl = getEscapePhaseController(gameState);
    escapeCtrl.initializeEscapePhase();

    this.cameras.main.fadeOut(400, 0, 0, 0);

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const state = gameState.getState?.() || gameState;
      if (state.escapeRoute && state.escapeRoute.length > 0) {
        this.goto('CityScene', {
          cityId: state.escapeRoute[0],
          phase: 'escape',
          fromApartmentEscape: true
        });
      } else {
        this.goto('GameOverScene', {
          reason: 'no_escape_route',
          message: 'The thief escaped, but we have no route to follow them.'
        });
      }
    });
  }

  /**
   * Opuść mieszkanie
   */
  exitApartment() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Sprawdź czy gracz znalazł wystarczająco dużo informacji
    const clueCount = this.playerInventory.getItems().filter(i => i.isClue).length;

    if (clueCount < 3) {
      this.showMessage(
        'You should search more thoroughly before leaving.',
        2500,
        '#ff9800'
      );
      this.isTransitioning = false;
      return;
    }

    this.cameras.main.fadeOut(400, 0, 0, 0);

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const state = gameState.getState?.() || gameState;
      this.goto('CrimeCityScene', {
        cityId: state.crimeCityId
      });
    });
  }

  onShutdown() {
    this.apartmentObjects.forEach(obj => obj.destroy());
    this.apartmentObjects = [];

    this.playerInventory?.destroy();
    this.playerInventory = null;

    EventBus.off('itemCombined', this.onItemCombined, this);

    this.isTransitioning = false;
  }
}

export default ApartmentScene;