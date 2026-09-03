import { ensureHud } from '../hudHelpers.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { audioManager } from '../AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { TRANSPORT_VISUALS } from './travel/TransportVisuals.js';
import {
  playTransportSfx,
  cleanupTravelEffects,
  getCostAndEnergyText,
  getDetailText,
  registerVisitedCity
} from './travel/TravelTransitionHelpers.js';
import {
  drawTravelLine,
  renderEncounterVisual
} from './travel/TravelTransitionEffects.js';

export class TravelTransitionScene extends BaseScene {
  constructor() {
    super({ key: 'TravelTransitionScene' });

    this.transitionData = {};
    this.canContinue = false;
    this.isLeaving = false;
    this.continueHint = null;
    this.shouldShowPhoneCall = false;

    this.effectObjects = [];
    this.routeGraphics = null;
    this.routeTween = null;
    this.baseRoutePoints = null;
    this._travelSfx = null;
  }

  init(data = {}) {
    this.transitionData = {
      destinationScene: 'CityScene',
      isCrimeSceneArrival: false,
      ...data
    };

    this.canContinue = false;
    this.isLeaving = false;
    this.shouldShowPhoneCall = false;
    this.effectObjects = [];
    this.routeGraphics = null;
    this.routeTween = null;
    this.baseRoutePoints = null;
    this._travelSfx = null;
  }

  create() {
    super.create();

    this.scene.sleep('UIScene');
    this.game.events.emit('setHudVisible', false);
    EventBus.emit('hideHUD');

    if (this.scene.isActive('PlayerHudScene')) {
      this.scene.sleep('PlayerHudScene');
    }

    audioManager.init(this);
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();

    if (audioManager.isMusicPlaying('themeMusic')) {
      audioManager.stopMusic('themeMusic');
    }

    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', { loop: true });
    }

    const {
      fromCity = 'Unknown',
      toCity = 'Unknown',
      toCityId = null,
      cityId = null,
      transportType = 'plane',
      transportLabel = null,
      travelHours = 0,
      baseTravelHours = travelHours,
      moneySpent = 0,
      energyChange = 0,
      travelEncounter = null
    } = this.transitionData;

    const transport = this.getTransportVisual(transportType);
    const finalTransportLabel = transportLabel || transport.label;
    const targetCityId = cityId || toCityId || null;

    this._travelSfx = playTransportSfx(transport);
    this.shouldShowPhoneCall = registerVisitedCity(targetCityId);

    ensureHud(this);

    const hud = this.scene.get('PlayerHudScene');
    hud?.closeAllUIPanels?.();

    const { width, height } = this.scale;
    const camera = this.cameras.main;

    camera.fadeIn(400, 0, 0, 0);

    this.createBackground(width, height);
    this.createTravelHeader({
      width,
      transport,
      fromCity,
      toCity,
      finalTransportLabel,
      travelHours,
      moneySpent,
      energyChange,
      baseTravelHours,
      travelEncounter
    });

    drawTravelLine(this, width, height, transport);
    renderEncounterVisual(this, travelEncounter, width, height, transport);
    this.createContinueHint(width, height);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      cleanupTravelEffects(this);
    });
  }

  createBackground(width, height) {
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x07111a, 1);
    const vignetteTop = this.add.rectangle(width / 2, 0, width, height * 0.28, 0x000000, 0.18)
      .setOrigin(0.5, 0);
    const vignetteBottom = this.add.rectangle(width / 2, height, width, height * 0.28, 0x000000, 0.22)
      .setOrigin(0.5, 1);

    this.effectObjects.push(bg, vignetteTop, vignetteBottom);
  }

  createTravelHeader({
    width,
    transport,
    fromCity,
    toCity,
    finalTransportLabel,
    travelHours,
    moneySpent,
    energyChange,
    baseTravelHours,
    travelEncounter
  }) {
    this.add.text(width / 2, 78, transport.logTitle, {
      fontFamily: 'PressStart2P',
      fontSize: '26px',
      color: transport.color
    }).setOrigin(0.5);

    this.add.text(width / 2, 145, `${fromCity} → ${toCity}`, {
      fontFamily: 'Special Elite',
      fontSize: '34px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, 192, `${transport.icon}  ${finalTransportLabel}`, {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: transport.color,
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, 238, `Travel time: +${travelHours}h`, {
      fontFamily: 'Special Elite',
      fontSize: '26px',
      color: '#ffd166'
    }).setOrigin(0.5);

    this.add.text(width / 2, 278, getCostAndEnergyText(moneySpent, energyChange), {
      fontFamily: 'Special Elite',
      fontSize: '23px',
      color: '#d6e4f0',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, 325, 'Following the trail...', {
      fontFamily: 'Special Elite',
      fontSize: '27px',
      color: '#d6e4f0'
    }).setOrigin(0.5);

    this.add.text(width / 2, 382, getDetailText({
      transport,
      baseTravelHours,
      travelHours,
      travelEncounter
    }), {
      fontFamily: 'Special Elite',
      fontSize: '23px',
      color: travelEncounter ? '#ffd966' : '#d9d9d9',
      align: 'center',
      wordWrap: { width: Math.min(760, width * 0.7) }
    }).setOrigin(0.5);

    if (this.shouldShowPhoneCall) {
      this.add.text(width / 2, 445, 'Your phone starts ringing. Headquarters has thoughts.', {
        fontFamily: 'Special Elite',
        fontSize: '23px',
        color: '#ffd966',
        align: 'center',
        wordWrap: { width: Math.min(760, width * 0.7) }
      }).setOrigin(0.5);
    }
  }

  createContinueHint(width, height) {
    this.continueHint = this.add.text(width / 2, height - 70, 'Please wait...', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#9aa6b2'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.continueHint,
      alpha: { from: 0.35, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1
    });

    this.time.delayedCall(3000, () => {
      if (this.isLeaving || !this.continueHint) return;
      this.canContinue = true;
      this.continueHint.setText('Click to continue');
      this.continueHint.setColor('#f4e7c1');
    });

    this.input.once('pointerdown', () => {
      if (!this.canContinue || this.isLeaving) return;
      this.leaveScene();
    });

    this.time.delayedCall(6000, () => {
      if (!this.isLeaving) this.leaveScene();
    });
  }

  getTransportVisual(transportType) {
    return TRANSPORT_VISUALS[transportType] || TRANSPORT_VISUALS.plane;
  }

  leaveScene() {
    if (this.isLeaving) return;

    this.isLeaving = true;
    this.game.events.emit('setHudVisible', true);
    EventBus.emit('showHUD');

    const {
      status,
      cityId,
      toCityId,
      destinationScene,
      isCrimeSceneArrival
    } = this.transitionData;

    const targetCityId = cityId || toCityId || null;
    const targetScene = destinationScene || (isCrimeSceneArrival ? 'CrimeCityScene' : 'CityScene');

    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (!targetCityId) {
        console.error('[TravelTransitionScene] Missing target city id.', this.transitionData);
        this.goto('MenuScene');
        return;
      }

      if (status === 'FINAL_SHOWDOWN') {
        this.goto('ArrestSelectionScene', { cityId: targetCityId });
        return;
      }

      this.goto(targetScene, {
        cityId: targetCityId,
        investigationStatus: status,
        isFinalShowdown: false,
        isCrimeSceneArrival: Boolean(isCrimeSceneArrival),
        fromTravel: true,
        transportType: this.transitionData.transportType,
        transportLabel: this.transitionData.transportLabel,
        travelHours: this.transitionData.travelHours,
        moneySpent: this.transitionData.moneySpent,
        energyChange: this.transitionData.energyChange,
        pendingPhoneCall: Boolean(gameState.pendingPhoneCall),
        pendingPhoneCallCityId: gameState.pendingPhoneCallCityId || targetCityId
      });
    });
  }
}