import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { HQ_CITY, HQ_ID } from '../TransportConfig.js';
import { getLocationById, getLocationByCity } from '../ui/LocationUI.js';
import { TRANSPORT_VISUALS, CITY_QUIPS, GENERIC_ARRIVAL_QUIPS } from './travel/TransportVisuals.js';
import {
  playTransportSfx, cleanupTravelEffects, getDetailText,
  registerVisitedCity, stampPassportForArrival
} from './travel/TravelTransitionHelpers.js';
import { ensureTravelTextures, normalizeKey, pick, fs, TRAVEL_DEPTH } from './travel/TravelTextures.js';
import { TravelRouteStage, getEncounterVisual, playEncounterEffect } from './travel/TravelTransitionEffects.js';
import {
  TravelTicket, TravelJournal, createTravelHeader,
  createPolaroid, createPassportMark, createPhoneNotice
} from './travel/TravelTicketUI.js';

const ZOOM_MS = 1300;
const SKIP_UNLOCK_MS = 1000;          // protects against the click that confirmed the trip
const AUTO_CONTINUE_MS = 4200;        // after arrival
const ENCOUNTER_AT = 0.52;            // where on the route the incident happens
const RETURN_JOURNEY_MS = 1800;       // private-office hop is quick

// If locations.json has no `map` point for headquarters, set one here, e.g. { x: 900, y: 360 }.
const HQ_MAP_POINT = null;

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
    this.arrived = false;
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

    this.stage = null;
    this.ticket = null;
    this.journal = null;
    this.polaroid = null;
    this.passportMark = null;
    this.phoneNotice = null;
    this.encounterEffect = null;
    this.midLineShown = false;
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
      travelHours = 0, baseTravelHours = travelHours,
      moneySpent = 0, energyChange = 0, travelEncounter = null
    } = this.transitionData;
    const returning = Boolean(this.transitionData.returnToPIOffice);
    const transport = this.getTransportVisual(transportType);
    const targetCityId = this.getTargetCityId();
    this._travelSfx = playTransportSfx(transport);

    let newStamp = null;
    // A private-office return is navigation, not arrival in a mission city.
    if (!returning) {
      this.shouldShowPhoneCall = registerVisitedCity(targetCityId);
      newStamp = stampPassportForArrival(this, fromCity, targetCityId);
      if (newStamp) EventBus.emit('passportStampEarned', newStamp);
    }

    const { width, height } = this.scale;
    const U = Math.min(width / 1920, height / 1080);
    ensureTravelTextures(this);

    const locations = this.getLocations();
    const fromLoc = getLocationByCity(fromCity, locations);
    const toLoc = getLocationById(targetCityId, locations) || getLocationByCity(toCity, locations);
    const fromPoint = fromLoc?.map ?? (fromCity === HQ_CITY ? HQ_MAP_POINT : null);
    const toPoint = toLoc?.map ?? (targetCityId === HQ_ID ? HQ_MAP_POINT : null);

    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.stage = new TravelRouteStage(this, { width, height, U, transport, fromPoint, toPoint, fromCity, toCity });
    createTravelHeader(this, {
      width, U, transport, vehicleKey: this.stage.vehicleKey, fromCity, toCity, returning
    });

    const penalty = Math.max(0, travelHours - baseTravelHours);
    if (!returning) {
      this.ticket = new TravelTicket(this, {
        width, height, U, transport, vehicleKey: this.stage.vehicleKey, fromCity, toCity,
        baseHours: baseTravelHours, penalty, moneySpent, energyChange
      });
    }
    this.journal = new TravelJournal(this, { width, height, U });

    const photoKey = returning ? null : this.findCityPhoto(targetCityId, toCity);
    this.polaroid = createPolaroid(this, {
      width, height, U, textureKey: photoKey, city: toCity, country: toLoc?.country || ''
    });
    if (newStamp) {
      this.passportMark = createPassportMark(this, {
        width, height, U, country: newStamp.country || toCity
      });
    }
    if (this.shouldShowPhoneCall) this.phoneNotice = createPhoneNotice(this, { width, U });

    this.createContinueHint(width, height, U);
    this.startJourney({ transport, travelEncounter, penalty, returning, targetCityId, toCity });
  }

  hideTravelUi() {
    this.game.events.emit('setHudVisible', false);
    EventBus.emit('hideHUD');
    this.sleepPlayerHud();
    this.sleepSceneIfActive('NewsHud');
  }

  getLocations() {
    const data = this.cache?.json?.get('locations');
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.locations) ? data.locations : [];
  }

  // City photo texture (assets/cities/*.webp) - only if it is already loaded.
  findCityPhoto(targetCityId, toCity) {
    if (targetCityId === HQ_ID) return null;
    for (const raw of [targetCityId, toCity]) {
      const key = normalizeKey(raw);
      if (!key || !this.textures.exists(key)) continue;
      const source = this.textures.get(key).getSourceImage?.();
      if (source && source.width >= 600) return key;
    }
    return null;
  }

  getTransportVisual(transportType) {
    return TRANSPORT_VISUALS[transportType] || TRANSPORT_VISUALS.plane;
  }

  // ---------------------------------------------------------------------------
  // Timeline
  // ---------------------------------------------------------------------------

  startJourney({ transport, travelEncounter, penalty, returning, targetCityId, toCity }) {
    const { travelHours = 0, baseTravelHours = travelHours } = this.transitionData;
    const visual = getEncounterVisual(travelEncounter);
    const travelMs = returning ? RETURN_JOURNEY_MS : (transport.journeyMs ?? 2800);

    this.ticket?.enter(250);
    this.time.delayedCall(500, () => {
      this.journal?.type(returning ? 'Returning to your private office...' : pick(transport.quips));
    });

    this.stage.playZoom(ZOOM_MS, () => {
      this.stage.run({
        travelMs,
        encounterAt: visual ? ENCOUNTER_AT : null,
        holdMs: visual ? visual.hold : 0,
        onProgress: (progress) => {
          this.ticket?.update(progress);
          // No incident: a calm status line halfway through.
          if (!visual && !returning && !this.midLineShown && progress >= 0.5) {
            this.midLineShown = true;
            this.journal?.type(transport.clearRouteText);
          }
        },
        onEncounter: () => {
          this.ticket?.slamStamp(visual.stamp);
          this.ticket?.setPenalty(900);
          this.journal?.type(getDetailText({ transport, baseTravelHours, travelHours, travelEncounter }));
          this.encounterEffect = playEncounterEffect(this, this.stage, travelEncounter, { penalty });
        },
        onEncounterEnd: () => {
          this.encounterEffect?.dismiss();
          this.encounterEffect = null;
        },
        onArrive: () => this.onArrive({ returning, targetCityId, toCity, hadEncounter: Boolean(visual) })
      });
    });
  }

  onArrive({ returning, targetCityId, toCity, hadEncounter }) {
    this.arrived = true;
    this.canContinue = true;
    this.ticket?.markArrived();

    if (!returning) {
      const quip = CITY_QUIPS[normalizeKey(targetCityId)] ||
        CITY_QUIPS[normalizeKey(toCity)] ||
        pick(GENERIC_ARRIVAL_QUIPS);
      this.journal?.type(quip);
      this.time.delayedCall(450, () => this.polaroid?.reveal());
      this.time.delayedCall(1100, () => this.passportMark?.slam());
      this.time.delayedCall(800, () => this.phoneNotice?.show());
    }

    if (this.continueHint?.active) {
      this.continueHint.setText('Click to continue').setColor('#f4e7c1');
    }

    this._autoContinueTimer = this.time.delayedCall(
      AUTO_CONTINUE_MS + (hadEncounter ? 1000 : 0),
      () => { if (!this.isLeaving && this.sys.isActive()) this.leaveScene(); }
    );
  }

  createContinueHint(width, height, U) {
    this.continueHint = this.add.text(width / 2, height - 40 * U, 'Please wait...', {
      fontFamily: 'SpecialElite', fontSize: fs(U, 22), color: '#9aa6b2'
    }).setOrigin(0.5).setDepth(TRAVEL_DEPTH.hint);
    this.effectObjects.push(this.continueHint);

    this.createTrackedTween({
      targets: this.continueHint, alpha: { from: 0.35, to: 1 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    this._continueDelayTimer = this.time.delayedCall(SKIP_UNLOCK_MS, () => {
      if (this.isLeaving || !this.continueHint?.scene || !this.sys.isActive()) return;
      this.canContinue = true;
      if (!this.arrived) this.continueHint.setText('Click to skip');
    });

    this._continuePointerHandler = () => {
      if (this.canContinue && !this.isLeaving) this.leaveScene();
    };
    this.trackInputEvent(this.input, 'pointerdown', this._continuePointerHandler);
    this.trackInputEvent(this.input.keyboard, 'keydown-SPACE', this._continuePointerHandler);
    this.trackInputEvent(this.input.keyboard, 'keydown-ENTER', this._continuePointerHandler);
  }

  // ---------------------------------------------------------------------------
  // Navigation (unchanged contract)
  // ---------------------------------------------------------------------------

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

    this.journal?.destroy();
    this.stage?.destroy();
    this.journal = null;
    this.stage = null;
    this.ticket = null;
    this.polaroid = null;
    this.passportMark = null;
    this.phoneNotice = null;
    this.encounterEffect = null;

    cleanupTravelEffects(this);
    this._travelSfx = null;
    this.continueHint = null;
    this.effectObjects = [];
    this.routeGraphics = null;
    this.routeTween = null;
    this.baseRoutePoints = null;
  }
}
