import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { TRANSPORT_VISUALS } from './travel/TransportVisuals.js';


import {
  playTransportSfx,
  cleanupTravelEffects,
  getCostAndEnergyText,
  getDetailText,
  registerVisitedCity,
  stampPassportForArrival
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


    this._continueDelayTimer = null;
    this._autoContinueTimer = null;
    this._continuePointerHandler = null;
  }


  init(data = {}) {
    this.transitionData = {
      destinationScene: null,
      isCrimeSceneArrival: false,
      ...data
    };


    // HQ ma pierwszeństwo przed sceną przekazaną z mapy.
    if (this.getTargetCityId() === 'hq') {
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
    return (
      this.transitionData.cityId ||
      this.transitionData.toCityId ||
      null
    );
  }


  getTargetScene() {
    if (this.getTargetCityId() === 'hq') {
      return 'OfficeScene';
    }


    return (
      this.transitionData.destinationScene ||
      (
        this.transitionData.isCrimeSceneArrival
          ? 'CrimeCityScene'
          : 'CityScene'
      )
    );
  }


  create() {
    super.create();


    this.hideTravelUi();


    audioManager.init(this);
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();


    if (audioManager.isMusicPlaying('themeMusic')) {
      audioManager.stopMusic('themeMusic');
    }


    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', {
        loop: true
      });
    }


    const {
      fromCity = 'Unknown',
      toCity = 'Unknown',
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
    const targetCityId = this.getTargetCityId();


    this._travelSfx = playTransportSfx(transport);


    this.shouldShowPhoneCall = registerVisitedCity(targetCityId);


    const newStamp = stampPassportForArrival(
      this,
      fromCity,
      targetCityId
    );


    if (newStamp) {
      EventBus.emit('passportStampEarned', newStamp);
    }


    const { width, height } = this.scale;


    this.cameras.main.fadeIn(400, 0, 0, 0);


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


    if (newStamp) {
      this.createPassportStampNotice(width, newStamp);
    }


    drawTravelLine(this, width, height, transport);


    renderEncounterVisual(
      this,
      travelEncounter,
      width,
      height,
      transport
    );


    this.createContinueHint(width, height);


    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onSceneShutdown,
      this
    );
  }


  /**
   * Standardowy HUD pozostaje ukryty podczas podróży.
   * Jego przywrócenie pozostaje po stronie sceny docelowej.
   */
  hideTravelUi() {
    this.game.events.emit('setHudVisible', false);
    EventBus.emit('hideHUD');


    this.sleepPlayerHud();
    this.sleepSceneIfActive('NewsHud');
  }


  createBackground(width, height) {
    const bg = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x07111a,
      1
    );


    const vignetteTop = this.add
      .rectangle(
        width / 2,
        0,
        width,
        height * 0.28,
        0x000000,
        0.18
      )
      .setOrigin(0.5, 0);


    const vignetteBottom = this.add
      .rectangle(
        width / 2,
        height,
        width,
        height * 0.28,
        0x000000,
        0.22
      )
      .setOrigin(0.5, 1);


    this.effectObjects.push(
      bg,
      vignetteTop,
      vignetteBottom
    );
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
    this.add
      .text(width / 2, 78, transport.logTitle, {
        fontFamily: 'PressStart2P',
        fontSize: '26px',
        color: transport.color
      })
      .setOrigin(0.5);


    this.add
      .text(width / 2, 145, `${fromCity} → ${toCity}`, {
        fontFamily: 'SpecialElite',
        fontSize: '34px',
        color: '#ffffff',
        align: 'center'
      })
      .setOrigin(0.5);


    this.add
      .text(
        width / 2,
        192,
        `${transport.icon}  ${finalTransportLabel}`,
        {
          fontFamily: 'SpecialElite',
          fontSize: '28px',
          color: transport.color,
          align: 'center'
        }
      )
      .setOrigin(0.5);


    this.add
      .text(
        width / 2,
        238,
        `Travel time: +${travelHours}h`,
        {
          fontFamily: 'SpecialElite',
          fontSize: '26px',
          color: '#ffd166'
        }
      )
      .setOrigin(0.5);


    this.add
      .text(
        width / 2,
        278,
        getCostAndEnergyText(moneySpent, energyChange),
        {
          fontFamily: 'SpecialElite',
          fontSize: '23px',
          color: '#d6e4f0',
          align: 'center'
        }
      )
      .setOrigin(0.5);


    this.add
      .text(
        width / 2,
        325,
        'Following the trail...',
        {
          fontFamily: 'SpecialElite',
          fontSize: '27px',
          color: '#d6e4f0'
        }
      )
      .setOrigin(0.5);


    this.add
      .text(
        width / 2,
        382,
        getDetailText({
          transport,
          baseTravelHours,
          travelHours,
          travelEncounter
        }),
        {
          fontFamily: 'SpecialElite',
          fontSize: '23px',
          color: travelEncounter ? '#ffd966' : '#d9d9d9',
          align: 'center',
          wordWrap: {
            width: Math.min(760, width * 0.7)
          }
        }
      )
      .setOrigin(0.5);


    if (this.shouldShowPhoneCall) {
      this.add
        .text(
          width / 2,
          445,
          'Your phone starts ringing. Headquarters has thoughts.',
          {
            fontFamily: 'SpecialElite',
            fontSize: '23px',
            color: '#ffd966',
            align: 'center',
            wordWrap: {
              width: Math.min(760, width * 0.7)
            }
          }
        )
        .setOrigin(0.5);
    }
  }


  createPassportStampNotice(width, stamp) {
    const notice = this.add
      .text(
        width / 2,
        500,
        `📘 Passport stamped: ${stamp.country}`,
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#ffe9a8',
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setAlpha(0);


    this.effectObjects.push(notice);


    this.addTrackedTween(
      this.tweens.add({
        targets: notice,
        alpha: 1,
        y: 480,
        duration: 500,
        ease: 'Back.easeOut',
        delay: 300
      })
    );
  }


  createContinueHint(width, height) {
    this.continueHint = this.add
      .text(
        width / 2,
        height - 70,
        'Please wait...',
        {
          fontFamily: 'SpecialElite',
          fontSize: '22px',
          color: '#9aa6b2'
        }
      )
      .setOrigin(0.5);


    this.addTrackedTween(
      this.tweens.add({
        targets: this.continueHint,
        alpha: {
          from: 0.35,
          to: 1
        },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    );


    this._continueDelayTimer = this.time.delayedCall(
      3000,
      () => {
        if (
          this.isLeaving ||
          !this.continueHint?.scene ||
          !this.sys.isActive()
        ) {
          return;
        }


        this.canContinue = true;
        this.continueHint.setText('Click to continue');
        this.continueHint.setColor('#f4e7c1');
      }
    );


    this._continuePointerHandler = () => {
      if (!this.canContinue || this.isLeaving) {
        return;
      }


      this.leaveScene();
    };


    this.trackInputEvent(
      this.input,
      'pointerdown',
      this._continuePointerHandler
    );


    this._autoContinueTimer = this.time.delayedCall(
      6000,
      () => {
        if (!this.isLeaving && this.sys.isActive()) {
          this.leaveScene();
        }
      }
    );
  }


  getTransportVisual(transportType) {
    return (
      TRANSPORT_VISUALS[transportType] ||
      TRANSPORT_VISUALS.plane
    );
  }


  leaveScene() {
    if (this.isLeaving) {
      return;
    }


    this.isLeaving = true;


    const { status } = this.transitionData;


    const targetCityId = this.getTargetCityId();
    const targetScene = this.getTargetScene();
    const isHeadquarters = targetCityId === 'hq';


    const isCrimeSceneArrival =
      !isHeadquarters &&
      Boolean(this.transitionData.isCrimeSceneArrival);


    this.cameras.main.fadeOut(450, 0, 0, 0);


    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (!this.sys.isActive()) {
          return;
        }


        if (!targetCityId) {
          console.error(
            '[TravelTransitionScene] Missing target city id.',
            this.transitionData
          );


          void this.goto('MenuScene');
          return;
        }


        // Powrót do HQ zawsze prowadzi do biura,
        // niezależnie od statusu przekazanego przez podróż.
        if (!isHeadquarters && status === 'FINAL_SHOWDOWN') {
          void this.goto('ArrestSelectionScene', {
            cityId: targetCityId
          });


          return;
        }


        void this.goto(targetScene, {
          cityId: targetCityId,
          investigationStatus: status,
          isFinalShowdown: false,
          isCrimeSceneArrival,
          fromTravel: true,
          transportType: this.transitionData.transportType,
          transportLabel: this.transitionData.transportLabel,
          travelHours: this.transitionData.travelHours,
          moneySpent: this.transitionData.moneySpent,
          energyChange: this.transitionData.energyChange,
          pendingPhoneCall: Boolean(gameState.pendingPhoneCall),
          pendingPhoneCallCityId:
            gameState.pendingPhoneCallCityId || targetCityId
        });
      }
    );
  }


  onSceneShutdown() {
    this._continueDelayTimer?.remove(false);
    this._autoContinueTimer?.remove(false);


    this._continueDelayTimer = null;
    this._autoContinueTimer = null;
    this._continuePointerHandler = null;


    // cleanupTravelEffects zatrzymuje też dźwięk podróży
    // (przez audioManager.releaseSound).
    cleanupTravelEffects(this);


    this._travelSfx = null;
    this.continueHint = null;


    this.effectObjects = [];
    this.routeGraphics = null;
    this.routeTween = null;
    this.baseRoutePoints = null;
  }
}