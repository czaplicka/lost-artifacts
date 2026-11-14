import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { HQ_ID } from '../TransportConfig.js';
import { planTravel } from '../config/TravelNetwork.js';
import { resolveTravelLonLat } from '../config/TravelNodeCoordinates.js';
import { getLocationById, getLocationByCity } from '../ui/LocationUI.js';
import { PassportUI } from '../ui/PassportUI.js';
import {
  TRANSPORT_VISUALS,
  CITY_QUIPS,
  GENERIC_ARRIVAL_QUIPS
} from './travel/TransportVisuals.js';
import {
  playTransportSfx,
  cleanupTravelEffects,
  getDetailText,
  registerVisitedCity,
  stampPassportForArrival
} from './travel/TravelTransitionHelpers.js';
import {
  ensureTravelTextures,
  normalizeKey,
  pick,
  fs,
  TRAVEL_DEPTH
} from './travel/TravelTextures.js';
import {
  PROJECTION,
  resolveMapTheme
} from './travel/TravelMapTexture.js';
import {
  TravelRouteStage,
  getEncounterVisual,
  playEncounterEffect
} from './travel/TravelTransitionEffects.js';
import {
  TravelTicket,
  TravelJournal,
  createTravelHeader,
  createPolaroid,
  createPhoneNotice
} from './travel/TravelTicketUI.js';

const SKIP_UNLOCK_MS = 350;
const AUTO_CONTINUE_MS = 1800;

export class TravelTransitionScene extends BaseScene {
  constructor() {
    super({ key: 'TravelTransitionScene' });
    this.transitionData = {};
  }

  init(data = {}) {
    this.transitionData = {
      destinationScene: null,
      isCrimeSceneArrival: false,
      ...data
    };

    if (data.returnToPIOffice) {
      this.transitionData.destinationScene = 'DetectiveOfficeScene';
      this.transitionData.isCrimeSceneArrival = false;
    } else if (this.getTargetCityId() === HQ_ID) {
      this.transitionData.destinationScene = 'OfficeScene';
      this.transitionData.isCrimeSceneArrival = false;
    }

    this.mapTheme = resolveMapTheme(this.transitionData, this.registry);

    this.canContinue = false;
    this.isLeaving = false;
    this.arrived = false;
    this.effectObjects = [];
    this.stageObjects = [];
    this.stageTweens = new Set();
    this.timers = [];
    this.stage = null;
    this.ticket = null;
    this.journal = null;
    this.polaroid = null;
    this.passportMark = null;
    this.travelPassport = null;
    this.arrivalStamp = null;
    this.passportPresentationPending = false;
    this.phoneNotice = null;
    this.encounterEffect = null;
    this._travelSfx = null;
    this.shouldShowPhoneCall = false;
    this.legIndex = 0;
    this.completedHours = 0;
    this.itinerary = null;
    this.routeText = null;
    this.continueHint = null;
    this.headerObjects = [];
  }

  getTargetCityId() {
    return (
      this.transitionData.cityId ||
      this.transitionData.toCityId ||
      null
    );
  }

  getTargetScene() {
    if (this.transitionData.returnToPIOffice) {
      return 'DetectiveOfficeScene';
    }

    if (this.getTargetCityId() === HQ_ID) {
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

  delay(ms, callback) {
    const timer = this.time.delayedCall(ms, () => {
      if (!this.isLeaving && this.sys.isActive()) {
        callback();
      }
    });

    this.timers.push(timer);
    return timer;
  }

  create() {
    super.create();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onSceneShutdown,
      this
    );

    this.hideTravelUi();

    audioManager.init(this);
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();

    if (audioManager.isMusicPlaying('themeMusic')) {
      audioManager.stopMusic('themeMusic');
    }

    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', { loop: true });
    }

    const data = this.transitionData;
    const returning = Boolean(data.returnToPIOffice);
    const target = this.getTargetCityId();
    const locations = this.getLocations();

    const from = getLocationByCity(data.fromCity, locations);
    const to =
      getLocationById(target, locations) ||
      getLocationByCity(data.toCity, locations);

    const last = gameState.lastTravel;

    const matchingLast =
      !returning &&
      last &&
      last.from === data.fromCity &&
      last.to === data.toCity &&
      last.transportType === (data.transportType || 'plane');

    this.itinerary = returning
      ? null
      : (
        data.itinerary ||
        (matchingLast ? last.itinerary : null) ||
        planTravel(
          from,
          to,
          data.transportType || 'plane',
          locations
        )
      );

    if (!data.travelEncounter && matchingLast && last.encounter) {
      data.travelEncounter = last.encounter;
    }

    this.encounterLegIndex =
      data.encounterLegIndex ??
      (matchingLast ? last.encounterLegIndex : null) ??
      Math.floor((this.itinerary?.legs.length || 1) / 2);

    if (!this.itinerary?.legs?.length) {
      this.itinerary = {
        legs: [
          {
            fromCity: data.fromCity || 'Unknown',
            toCity: data.toCity || 'Unknown',
            fromPoint: from?.map || null,
            toPoint: to?.map || null,
            transportType: data.transportType || 'plane',
            hours: data.baseTravelHours ?? data.travelHours ?? 0,
            transferHours: 0
          }
        ]
      };
    }

    this.baseHours =
      data.baseTravelHours ??
      this.itinerary.baseTravelHours ??
      data.travelHours ??
      0;

    this.penalty = Math.max(
      0,
      (data.travelHours ?? this.baseHours) - this.baseHours
    );

    this.totalLegHours =
      this.itinerary.legs.reduce(
        (total, leg) =>
          total + leg.hours + (leg.transferHours || 0),
        0
      ) || 1;

    let newStamp = null;

    if (!returning) {
      this.shouldShowPhoneCall = registerVisitedCity(target);

      newStamp = stampPassportForArrival(
        this,
        data.fromCity,
        target
      );

      if (newStamp) {
        EventBus.emit('passportStampEarned', newStamp);
      }
    }

    this.arrivalStamp = newStamp;

    const { width, height } = this.scale;

    this.layout = {
      width,
      height,
      U: Math.min(width / 1920, height / 1080)
    };

    const { U } = this.layout;

    ensureTravelTextures(this);

    this.cameras.main.fadeIn(400, 0, 0, 0);

    const transport = this.getTransportVisual(
      this.itinerary.legs[0].transportType
    );

    this.buildStage(this.itinerary.legs[0]);

    this.headerObjects = createTravelHeader(this, {
      width,
      U,
      transport,
      vehicleKey: this.stage.vehicleKey,
      fromCity: data.fromCity || 'Unknown',
      toCity: data.toCity || 'Unknown',
      returning
    });

    if (!returning) {
      this.ticket = new TravelTicket(this, {
        width,
        height,
        U,
        transport,
        vehicleKey: this.stage.vehicleKey,
        fromCity: data.fromCity,
        toCity: data.toCity,
        baseHours: this.baseHours,
        penalty: this.penalty,
        moneySpent: data.moneySpent || 0,
        energyChange: data.energyChange || 0
      });
    }

    this.journal = new TravelJournal(this, {
      width,
      height,
      U
    });

    this.routeText = this.add.text(
      width / 2,
      140 * U,
      '',
      {
        fontFamily: 'SpecialElite',
        fontSize: fs(U, 24),
        color: '#f4e7c1',
        backgroundColor: '#241b15',
        padding: {
          x: 12 * U,
          y: 8 * U
        },
        align: 'center',
        wordWrap: {
          width: width - 120 * U
        }
      }
    )
      .setOrigin(0.5, 0)
      .setDepth(TRAVEL_DEPTH.ui + 2);

    this.effectObjects.push(this.routeText);

    const photoKey = returning
      ? null
      : this.findCityPhoto(target, data.toCity);

    this.polaroid = createPolaroid(this, {
      width,
      height,
      U,
      textureKey: photoKey,
      city: data.toCity,
      country: to?.country || ''
    });

    if (this.shouldShowPhoneCall) {
      this.phoneNotice = createPhoneNotice(this, {
        width,
        U
      });
    }

    this.createContinueHint(width, height, U);
    this.playLeg(0, true);
  }

  hideTravelUi() {
    this.game.events.emit('setHudVisible', false);
    EventBus.emit('hideHUD');
    this.sleepPlayerHud();
    this.sleepSceneIfActive('NewsHud');
  }

  getLocations() {
    const data = this.cache?.json?.get('locations');

    return Array.isArray(data)
      ? data
      : Array.isArray(data?.locations)
        ? data.locations
        : [];
  }

  projectLegPoint(leg, side) {
    const lonLat = resolveTravelLonLat(
      leg?.[`${side}Id`],
      leg?.[`${side}City`],
      this.getLocations()
    );

    return lonLat
      ? PROJECTION.project(lonLat[0], lonLat[1])
      : null;
  }

  findCityPhoto(targetCityId, toCity) {
    if (targetCityId === HQ_ID) {
      return null;
    }

    for (const raw of [targetCityId, toCity]) {
      const key = normalizeKey(raw);

      if (!key || !this.textures.exists(key)) {
        continue;
      }

      const source = this.textures
        .get(key)
        .getSourceImage?.();

      if (source && source.width >= 600) {
        return key;
      }
    }

    return null;
  }

  getTransportVisual(type) {
    return TRANSPORT_VISUALS[type] || TRANSPORT_VISUALS.plane;
  }

  clearStage() {
    this.stage?.destroy();

    for (const tween of this.stageTweens) {
      this.removeTrackedTween(tween);
    }

    this.stageTweens.clear();

    for (const object of this.stageObjects) {
      this.killTrackedTweensOf(object);

      if (object?.active) {
        object.destroy();
      }
    }

    const old = new Set(this.stageObjects);

    this.effectObjects = this.effectObjects.filter(
      object => !old.has(object)
    );

    this.stageObjects = [];
    this.stage = null;

    if (this._travelSfx) {
      audioManager.releaseSound(this._travelSfx);
    }

    this._travelSfx = null;
  }

  buildStage(leg) {
    this.clearStage();

    const start = this.effectObjects.length;
    const transport = this.getTransportVisual(leg.transportType);

    this.stage = new TravelRouteStage(this, {
      ...this.layout,
      transport,
      themeId: this.mapTheme,
      fromPoint: this.projectLegPoint(leg, 'from'),
      toPoint: this.projectLegPoint(leg, 'to'),
      fromCity: leg.fromCity,
      toCity: leg.toCity
    });

    this.stageObjects.push(
      ...this.effectObjects.slice(start)
    );

    const originalTrack = this.stage.track.bind(this.stage);

    this.stage.track = (object, depth) => {
      const tracked = originalTrack(object, depth);
      this.stageObjects.push(tracked);
      return tracked;
    };

    this._travelSfx = playTransportSfx(transport);
  }

  stageCall(callback) {
    const start = this.effectObjects.length;
    const original = this.createTrackedTween;

    this.createTrackedTween = (...args) => {
      const tween = original.apply(this, args);
      this.stageTweens.add(tween);
      return tween;
    };

    try {
      return callback();
    } finally {
      this.createTrackedTween = original;

      this.stageObjects.push(
        ...this.effectObjects.slice(start)
      );
    }
  }

  playLeg(index, first = false) {
    if (this.isLeaving) {
      return;
    }

    this.legIndex = index;

    const legs = this.itinerary.legs;
    const leg = legs[index];
    const transport = this.getTransportVisual(leg.transportType);

    if (!first) {
      this.buildStage(leg);
    }

    const mode = leg.ferry
      ? 'Ferry'
      : (
        leg.transportType[0].toUpperCase() +
        leg.transportType.slice(1)
      );

    this.routeText.setText(
      `Leg ${index + 1}/${legs.length}: ` +
      `${leg.fromCity} → ${leg.toCity} | ` +
      `${mode} | ${leg.hours}h`
    );

    this.headerObjects[1]?.setTexture(this.stage.vehicleKey);
    this.headerObjects[2]?.setText(transport.logTitle);

    if (first) {
      this.ticket?.enter(250);

      this.journal.type(
        this.transitionData.returnToPIOffice
          ? 'Returning to your private office...'
          : pick(transport.quips)
      );
    } else {
      this.journal.type(
        `Boarding for ${leg.toCity}. Same detective. Different seat.`
      );
    }

    const incident = index === this.encounterLegIndex
      ? this.transitionData.travelEncounter
      : null;

    const visual = getEncounterVisual(incident);

    const travelMs = this.transitionData.returnToPIOffice
      ? 1000
      : legs.length === 1
        ? 1600
        : Math.max(650, Math.floor(2600 / legs.length));

    const run = () => this.stageCall(() => this.stage.run({
      travelMs,
      encounterAt: visual ? 0.52 : null,
      holdMs: visual ? visual.hold : 0,

      onProgress: progress => {
        this.ticket?.update(
          Math.min(
            1,
            (
              this.completedHours +
              leg.hours * progress
            ) / this.totalLegHours
          )
        );
      },

      onEncounter: () => {
        this.ticket?.slamStamp(visual.stamp);
        this.ticket?.setPenalty(900);

        this.journal.type(
          getDetailText({
            transport,
            baseTravelHours: this.baseHours,
            travelHours: this.transitionData.travelHours,
            travelEncounter: incident
          })
        );

        this.encounterEffect = playEncounterEffect(
          this,
          this.stage,
          incident,
          { penalty: this.penalty }
        );
      },

      onEncounterEnd: () => {
        this.encounterEffect?.dismiss();
        this.encounterEffect = null;
      },

      onArrive: () => {
        if (this.isLeaving) {
          return;
        }

        this.completedHours += leg.hours;

        if (index === legs.length - 1) {
          this.onArrive({
            returning: Boolean(
              this.transitionData.returnToPIOffice
            ),
            targetCityId: this.getTargetCityId(),
            toCity: this.transitionData.toCity,
            hadEncounter: Boolean(
              this.transitionData.travelEncounter
            )
          });

          return;
        }

        const next = legs[index + 1];
        const wait = next.transferHours || 0;

        this.routeText.setText(
          `Transfer in ${leg.toCity} | Waiting: ${wait}h\n` +
          `Next: ${next.toCity}`
        );

        this.journal.type(
          'Change here. Your luggage is enjoying a separate investigation.',
          14
        );

        this.delay(400, () => {
          this.completedHours += wait;
          this.playLeg(index + 1);
        });
      }
    }));

    this.stageCall(() => {
      this.stage.playZoom(first ? 450 : 150, run);
    });
  }

  passportBlocksContinue() {
    return Boolean(
      this.passportPresentationPending ||
      this.travelPassport?.isOpen ||
      this.travelPassport?._closingContainer
    );
  }

  showArrivalPassport() {
    if (this.isLeaving || !this.arrivalStamp?.stampId) {
      this.passportPresentationPending = false;
      return;
    }

    try {
      this.travelPassport?.destroy();
      this.travelPassport = new PassportUI(this);

      this.travelPassport.open({
        highlightStampId: this.arrivalStamp.stampId
      });

      this.continueHint
        ?.setText('Close passport, then click to continue')
        .setColor('#f4e7c1');
    } catch (error) {
      console.error(
        '[TravelTransitionScene] Passport presentation failed:',
        error
      );

      this.travelPassport?.destroy();
      this.travelPassport = null;

      this.continueHint
        ?.setText('Click to continue')
        .setColor('#f4e7c1');
    } finally {
      this.passportPresentationPending = false;
    }
  }

  onArrive({
    returning,
    targetCityId,
    toCity,
    hadEncounter
  }) {
    this.arrived = true;
    this.canContinue = true;

    this.ticket?.markArrived();

    this.routeText.setText(
      `Arrived in ${toCity || 'your private office'}`
    );

    const showPassport =
      !returning &&
      Boolean(this.arrivalStamp?.stampId);

    if (!returning) {
      const quip =
        CITY_QUIPS[normalizeKey(targetCityId)] ||
        CITY_QUIPS[normalizeKey(toCity)] ||
        pick(GENERIC_ARRIVAL_QUIPS);

      this.journal.type(quip);

      this.delay(450, () => {
        this.polaroid?.reveal();
      });

      if (showPassport) {
        this.passportPresentationPending = true;

        this.delay(1100, () => {
          this.showArrivalPassport();
        });
      }

      this.delay(800, () => {
        this.phoneNotice?.show();
      });
    }

    this.continueHint
      ?.setText(
        showPassport
          ? 'Passport inspection...'
          : 'Click to continue'
      )
      .setColor('#f4e7c1');

    if (!showPassport) {
      this.delay(
        AUTO_CONTINUE_MS + (hadEncounter ? 1000 : 0),
        () => this.leaveScene()
      );
    }
  }

  createContinueHint(width, height, U) {
    this.continueHint = this.add.text(
      width / 2,
      height - 40 * U,
      'Please wait...',
      {
        fontFamily: 'SpecialElite',
        fontSize: fs(U, 22),
        color: '#9aa6b2'
      }
    )
      .setOrigin(0.5)
      .setDepth(TRAVEL_DEPTH.hint);

    this.effectObjects.push(this.continueHint);

    this.createTrackedTween({
      targets: this.continueHint,
      alpha: {
        from: 0.35,
        to: 1
      },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.delay(SKIP_UNLOCK_MS, () => {
      this.canContinue = true;

      if (!this.arrived) {
        this.continueHint.setText('Click to skip');
      }
    });

    const proceed = () => {
      if (
        this.canContinue &&
        !this.isLeaving &&
        !this.passportBlocksContinue()
      ) {
        this.leaveScene();
      }
    };

    this.trackInputEvent(
      this.input,
      'pointerdown',
      proceed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-SPACE',
      proceed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ENTER',
      proceed
    );
  }

  leaveScene() {
    if (this.isLeaving || this.passportBlocksContinue()) {
      return;
    }

    this.isLeaving = true;

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (!this.sys.isActive()) {
          return;
        }

        const data = this.transitionData;

        if (data.returnToPIOffice) {
          void this.goto('DetectiveOfficeScene', {
            entrySource: data.entrySource || 'destinations',
            fromDestinations: true,
            fromScene: data.fromScene,
            fromTravel: true,
            transportType: data.transportType,
            transportLabel: data.transportLabel
          });

          return;
        }

        const targetCityId = this.getTargetCityId();
        const isHeadquarters = targetCityId === HQ_ID;

        if (!targetCityId) {
          console.error(
            '[TravelTransitionScene] Missing target city id.',
            data
          );

          void this.goto('MenuScene');
          return;
        }

        if (
          !isHeadquarters &&
          data.status === 'FINAL_SHOWDOWN'
        ) {
          void this.goto('ArrestSelectionScene', {
            cityId: targetCityId
          });

          return;
        }

        void this.goto(this.getTargetScene(), {
          cityId: targetCityId,
          investigationStatus: data.status,
          isFinalShowdown: false,
          isCrimeSceneArrival:
            !isHeadquarters &&
            Boolean(data.isCrimeSceneArrival),
          fromTravel: true,
          transportType: data.transportType,
          transportLabel: data.transportLabel,
          travelHours: data.travelHours,
          moneySpent: data.moneySpent,
          energyChange: data.energyChange,
          pendingPhoneCall: Boolean(gameState.pendingPhoneCall),
          pendingPhoneCallCityId:
            gameState.pendingPhoneCallCityId ||
            targetCityId
        });
      }
    );

    this.cameras.main.fadeOut(450, 0, 0, 0);
  }

  onSceneShutdown() {
    this.isLeaving = true;

    this.timers.forEach(timer => {
      timer?.remove(false);
    });

    this.timers = [];

    this.travelPassport?.destroy();
    this.travelPassport = null;
    this.arrivalStamp = null;
    this.passportPresentationPending = false;

    this.encounterEffect?.dismiss();
    this.encounterEffect = null;

    this.journal?.destroy();

    this.clearStage();
    cleanupTravelEffects(this);

    this.journal = null;
    this.ticket = null;
    this.polaroid = null;
    this.passportMark = null;
    this.phoneNotice = null;
    this.continueHint = null;
    this.routeText = null;
    this.headerObjects = [];
  }
}