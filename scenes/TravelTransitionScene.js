import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { TRANSPORT_VISUALS } from './travel/TransportVisuals.js';
import {
  playTransportSfx, cleanupTravelEffects, getCostAndEnergyText,
  getDetailText, registerVisitedCity, stampPassportForArrival
} from './travel/TravelTransitionHelpers.js';
import { drawTravelLine, renderEncounterVisual } from './travel/TravelTransitionEffects.js';

export class TravelTransitionScene extends BaseScene {
  constructor() {
    super({ key: 'TravelTransitionScene' });
    this.transitionData = {};
  }

  init(data = {}) {
    this.transitionData = { destinationScene: null, isCrimeSceneArrival: false, ...data };
    if (this.transitionData.returnToPIOffice) {
      this.transitionData.destinationScene = 'DetectiveOfficeScene';
      this.transitionData.isCrimeSceneArrival = false;
    } else if (this.getTargetCityId() === 'hq') {
      this.transitionData.destinationScene = 'OfficeScene';
      this.transitionData.isCrimeSceneArrival = false;
    }
    this.canContinue = false;
    this.isLeaving = false;
    this.continueHint = null;
    this.shouldShowPhoneCall = false;
    this.effectObjects = [];
    this.routeGraphics = null;
    this.routeTween = null;
    this.baseRoutePoints = null;
    this._travelSfx = null;
    this._continueDelayTimer = null;
    this._autoContinueTimer = null;
    this._continuePointerHandler = null;
  }

  getTargetCityId() {
    return this.transitionData.cityId || this.transitionData.toCityId || null;
  }

  getTargetScene() {
    if (this.transitionData.returnToPIOffice) return 'DetectiveOfficeScene';
    if (this.getTargetCityId() === 'hq') return 'OfficeScene';
    return this.transitionData.destinationScene ||
      (this.transitionData.isCrimeSceneArrival ? 'CrimeCityScene' : 'CityScene');
  }

  create() {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this);
    this.hideTravelUi();
    audioManager.init(this);
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();
    if (audioManager.isMusicPlaying('themeMusic')) audioManager.stopMusic('themeMusic');
    if (!audioManager.isMusicPlaying('themeGame')) audioManager.playMusic('themeGame', { loop: true });
    const {
      fromCity = 'Unknown', toCity = 'Unknown', transportType = 'plane',
      transportLabel = null, travelHours = 0, baseTravelHours = travelHours,
      moneySpent = 0, energyChange = 0, travelEncounter = null
    } = this.transitionData;
    const transport = this.getTransportVisual(transportType);
    const targetCityId = this.getTargetCityId();
    this._travelSfx = playTransportSfx(transport);
    let newStamp = null;
    // A private-office return is navigation, not arrival in a mission city.
    if (!this.transitionData.returnToPIOffice) {
      this.shouldShowPhoneCall = registerVisitedCity(targetCityId);
      newStamp = stampPassportForArrival(this, fromCity, targetCityId);
      if (newStamp) EventBus.emit('passportStampEarned', newStamp);
    }
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.createBackground(width, height);
    this.createTravelHeader({
      width, transport, fromCity, toCity,
      finalTransportLabel: transportLabel || transport.label,
      travelHours, moneySpent, energyChange, baseTravelHours, travelEncounter
    });
    if (newStamp) this.createPassportStampNotice(width, newStamp);
    drawTravelLine(this, width, height, transport);
    renderEncounterVisual(this, travelEncounter, width, height, transport);
    this.createContinueHint(width, height);
  }

  hideTravelUi() {
    this.game.events.emit('setHudVisible', false);
    EventBus.emit('hideHUD');
    this.sleepPlayerHud();
    this.sleepSceneIfActive('NewsHud');
  }

  createBackground(width, height) {
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x07111a, 1);
    const top = this.add.rectangle(width / 2, 0, width, height * 0.28, 0x000000, 0.18).setOrigin(0.5, 0);
    const bottom = this.add.rectangle(width / 2, height, width, height * 0.28, 0x000000, 0.22).setOrigin(0.5, 1);
    this.effectObjects.push(bg, top, bottom);
  }

  createTravelHeader({ width, transport, fromCity, toCity, finalTransportLabel,
    travelHours, moneySpent, energyChange, baseTravelHours, travelEncounter }) {
    const text = (y, value, size, color, wrap = false, font = 'SpecialElite') => {
      return this.add.text(width / 2, y, value, {
        fontFamily: font, fontSize: `${size}px`, color, align: 'center',
        ...(wrap ? { wordWrap: { width: Math.min(760, width * 0.7) } } : {})
      }).setOrigin(0.5);
    };
    text(78, transport.logTitle, 26, transport.color, false, 'PressStart2P');
    text(145, `${fromCity} → ${toCity}`, 34, '#ffffff');
    text(192, `${transport.icon}  ${finalTransportLabel}`, 28, transport.color);
    if (this.transitionData.returnToPIOffice) {
      text(325, 'Returning to your private office...', 27, '#d6e4f0');
    } else {
      text(238, `Travel time: +${travelHours}h`, 26, '#ffd166');
      text(278, getCostAndEnergyText(moneySpent, energyChange), 23, '#d6e4f0');
      text(325, 'Following the trail...', 27, '#d6e4f0');
      text(382, getDetailText({ transport, baseTravelHours, travelHours, travelEncounter }),
        23, travelEncounter ? '#ffd966' : '#d9d9d9', true);
    }
    if (this.shouldShowPhoneCall) {
      text(445, 'Your phone starts ringing. Headquarters has thoughts.', 23, '#ffd966', true);
    }
  }

  createPassportStampNotice(width, stamp) {
    const notice = this.add.text(width / 2, 500, `📘 Passport stamped: ${stamp.country}`, {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#ffe9a8', align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    this.effectObjects.push(notice);
    this.createTrackedTween({
      targets: notice, alpha: 1, y: 480, duration: 500, ease: 'Back.easeOut', delay: 300
    });
  }

  createContinueHint(width, height) {
    this.continueHint = this.add.text(width / 2, height - 70, 'Please wait...', {
      fontFamily: 'SpecialElite', fontSize: '22px', color: '#9aa6b2'
    }).setOrigin(0.5);
    this.createTrackedTween({
      targets: this.continueHint, alpha: { from: 0.35, to: 1 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this._continueDelayTimer = this.time.delayedCall(3000, () => {
      if (this.isLeaving || !this.continueHint?.scene || !this.sys.isActive()) return;
      this.canContinue = true;
      this.continueHint.setText('Click to continue').setColor('#f4e7c1');
    });
    this._continuePointerHandler = () => {
      if (this.canContinue && !this.isLeaving) this.leaveScene();
    };
    this.trackInputEvent(this.input, 'pointerdown', this._continuePointerHandler);
    this._autoContinueTimer = this.time.delayedCall(6000, () => {
      if (!this.isLeaving && this.sys.isActive()) this.leaveScene();
    });
  }

  getTransportVisual(transportType) {
    return TRANSPORT_VISUALS[transportType] || TRANSPORT_VISUALS.plane;
  }

  leaveScene() {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (!this.sys.isActive()) return;
      const data = this.transitionData;
      // No fictional city ID, passport stamp or pursuit event for this route.
      if (data.returnToPIOffice) {
        void this.goto('DetectiveOfficeScene', {
          entrySource: data.entrySource || 'destinations',
          fromDestinations: true, fromScene: data.fromScene,
          fromTravel: true, transportType: data.transportType,
          transportLabel: data.transportLabel
        });
        return;
      }
      const targetCityId = this.getTargetCityId();
      const isHeadquarters = targetCityId === 'hq';
      if (!targetCityId) {
        console.error('[TravelTransitionScene] Missing target city id.', data);
        void this.goto('MenuScene');
        return;
      }
      if (!isHeadquarters && data.status === 'FINAL_SHOWDOWN') {
        void this.goto('ArrestSelectionScene', { cityId: targetCityId });
        return;
      }
      void this.goto(this.getTargetScene(), {
        cityId: targetCityId, investigationStatus: data.status,
        isFinalShowdown: false,
        isCrimeSceneArrival: !isHeadquarters && Boolean(data.isCrimeSceneArrival),
        fromTravel: true, transportType: data.transportType,
        transportLabel: data.transportLabel, travelHours: data.travelHours,
        moneySpent: data.moneySpent, energyChange: data.energyChange,
        pendingPhoneCall: Boolean(gameState.pendingPhoneCall),
        pendingPhoneCallCityId: gameState.pendingPhoneCallCityId || targetCityId
      });
    });
    this.cameras.main.fadeOut(450, 0, 0, 0);
  }

  onSceneShutdown() {
    this._continueDelayTimer?.remove(false);
    this._autoContinueTimer?.remove(false);
    this._continueDelayTimer = null;
    this._autoContinueTimer = null;
    this._continuePointerHandler = null;
    cleanupTravelEffects(this);
    this._travelSfx = null;
    this.continueHint = null;
    this.effectObjects = [];
    this.routeGraphics = null;
    this.routeTween = null;
    this.baseRoutePoints = null;
  }
}