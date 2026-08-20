import { ensureHud } from '../hudHelpers.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { audioManager } from '../AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

const TRANSPORT_VISUALS = {
  plane: {
    icon: '✈',
    logTitle: 'FLIGHT LOG',
    label: 'Plane',
    color: '#f4e7c1',
    routeColor: 0xd9c27a,
    clearRouteText: 'Clear skies. The flight remains on schedule.',
    rerouteLabel: 'FLIGHT PATH REROUTE',
    sfxKey: 'planesound',
    sfxVolume: 0.5,
    iconOffsetY: -18,
    animation: 'flight'
  },

  train: {
    icon: '🚆',
    logTitle: 'RAIL LOG',
    label: 'Train',
    color: '#b8e0d2',
    routeColor: 0x8fd3ff,
    clearRouteText: 'Clear tracks. The train remains on schedule.',
    rerouteLabel: 'RAIL ROUTE CHANGE',
    sfxKey: null,
    sfxVolume: 0,
    iconOffsetY: -20,
    animation: 'rail'
  },

  bus: {
    icon: '🚌',
    logTitle: 'ROAD LOG',
    label: 'Bus',
    color: '#ffd166',
    routeColor: 0xffb347,
    clearRouteText: 'Clear roads. The bus remains on schedule.',
    rerouteLabel: 'ROAD DETOUR',
    sfxKey: null,
    sfxVolume: 0,
    iconOffsetY: -20,
    animation: 'road'
  },

  ship: {
    icon: '🚢',
    logTitle: 'SEA LOG',
    label: 'Ship',
    color: '#a8d8ff',
    routeColor: 0x62b6cb,
    clearRouteText: 'Calm waters. The vessel remains on schedule.',
    rerouteLabel: 'SEA ROUTE CHANGE',
    sfxKey: null,
    sfxVolume: 0,
    iconOffsetY: -22,
    animation: 'sea'
  }
};

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
    this._onPointerDown = null;
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
  this._onPointerDown = null;
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

      travelEncounter = null,
      status = 'CONTINUE'
    } = this.transitionData;

    const transport = this.getTransportVisual(transportType);
    const finalTransportLabel = transportLabel || transport.label;
    const targetCityId = cityId || toCityId || null;

    this.playTransportSfx(transport);
    this.registerVisitedCity(targetCityId);

    ensureHud(this);

    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }

    const { width, height } = this.scale;
    const camera = this.cameras.main;

    camera.fadeIn(400, 0, 0, 0);

    const bg = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x07111a,
      1
    );

    const vignetteTop = this.add.rectangle(
      width / 2,
      0,
      width,
      height * 0.28,
      0x000000,
      0.18
    ).setOrigin(0.5, 0);

    const vignetteBottom = this.add.rectangle(
      width / 2,
      height,
      width,
      height * 0.28,
      0x000000,
      0.22
    ).setOrigin(0.5, 1);

    this.effectObjects.push(bg, vignetteTop, vignetteBottom);

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

    this.add.text(
      width / 2,
      278,
      this.getCostAndEnergyText(moneySpent, energyChange),
      {
        fontFamily: 'Special Elite',
        fontSize: '23px',
        color: '#d6e4f0',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.add.text(width / 2, 325, 'Following the trail...', {
      fontFamily: 'Special Elite',
      fontSize: '27px',
      color: '#d6e4f0'
    }).setOrigin(0.5);

    const detailText = this.getDetailText({
      transport,
      baseTravelHours,
      travelHours,
      travelEncounter
    });

    this.add.text(width / 2, 382, detailText, {
      fontFamily: 'Special Elite',
      fontSize: '23px',
      color: travelEncounter ? '#ffd966' : '#d9d9d9',
      align: 'center',
      wordWrap: {
        width: Math.min(760, width * 0.7)
      }
    }).setOrigin(0.5);

    if (this.shouldShowPhoneCall) {
      this.add.text(
        width / 2,
        445,
        'Your phone starts ringing. Headquarters has thoughts.',
        {
          fontFamily: 'Special Elite',
          fontSize: '23px',
          color: '#ffd966',
          align: 'center',
          wordWrap: {
            width: Math.min(760, width * 0.7)
          }
        }
      ).setOrigin(0.5);
    }

    this.drawTravelLine(width, height, transport);
    this.renderEncounterVisual(travelEncounter, width, height, transport);

    this.continueHint = this.add.text(
      width / 2,
      height - 70,
      'Please wait...',
      {
        fontFamily: 'Special Elite',
        fontSize: '22px',
        color: '#9aa6b2'
      }
    ).setOrigin(0.5);

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
      if (this.isLeaving) return;
      this.leaveScene();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.cleanupEffects();
    });
  }

  getTransportVisual(transportType) {
    return TRANSPORT_VISUALS[transportType] || TRANSPORT_VISUALS.plane;
  }

  playTransportSfx(transport) {
    if (!transport?.sfxKey) return;

    try {
      this._travelSfx = audioManager.playSfx(transport.sfxKey, {
        volume: transport.sfxVolume ?? 0.5
      });
    } catch (error) {
      console.warn('[TravelTransitionScene] Travel SFX failed:', error);
      this._travelSfx = null;
    }
  }

  getCostAndEnergyText(moneySpent, energyChange) {
    const safeMoneySpent = Number(moneySpent) || 0;
    const safeEnergyChange = Number(energyChange) || 0;

    const costText = safeMoneySpent > 0
      ? `Cost: £${safeMoneySpent}`
      : 'Cost: £0';

    const energyText = safeEnergyChange > 0
      ? `Energy: +${safeEnergyChange}`
      : `Energy: ${safeEnergyChange}`;

    return `${costText}     ${energyText}`;
  }

  registerVisitedCity(targetCityId) {
    if (!targetCityId) return;

    if (!Array.isArray(gameState.visitedCities)) {
      gameState.visitedCities = [];
    }

    if (!gameState.visitedCities.includes(targetCityId)) {
      gameState.visitedCities.push(targetCityId);
    }

    const reachedThirdCity =
      gameState.visitedCities.length >= 3 &&
      !gameState.storyPhoneCallTriggered;

    if (reachedThirdCity) {
      gameState.storyPhoneCallTriggered = true;
      gameState.pendingPhoneCall = true;
      gameState.pendingPhoneCallCityId = targetCityId;
      this.shouldShowPhoneCall = true;
    } else {
      this.shouldShowPhoneCall =
        gameState.pendingPhoneCall === true &&
        gameState.pendingPhoneCallCityId === targetCityId;
    }

    saveGameState();
  }

  leaveScene() {
  if (this.isLeaving) return;
    this.game.events.emit('setHudVisible', true);
    EventBus.emit('showHUD');
  this.isLeaving = true;

  const {
    status,
    cityId,
    toCityId,
    destinationScene,
    isCrimeSceneArrival
  } = this.transitionData;

  const targetCityId = cityId || toCityId || null;

  const targetScene =
    destinationScene ||
    (isCrimeSceneArrival
      ? 'CrimeCityScene'
      : 'CityScene');

  const camera = this.cameras.main;

  camera.fadeOut(450, 0, 0, 0);

  camera.once(
    Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
    () => {
      if (!targetCityId) {
        console.error(
          '[TravelTransitionScene] Missing target city id.',
          this.transitionData
        );

        this.scene.start('MenuScene');
        return;
      }

      if (status === 'FINAL_SHOWDOWN') {
        this.scene.start('ArrestSelectionScene', {
          cityId: targetCityId
        });

        return;
      }

      this.scene.start(targetScene, {
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
        pendingPhoneCallCityId:
          gameState.pendingPhoneCallCityId ||
          targetCityId
      });
    }
  );
}

  drawTravelLine(width, height, transport) {
    const startX = width * 0.22;
    const endX = width * 0.78;
    const y = height * 0.65;

    this.baseRoutePoints = {
      startX,
      endX,
      y,
      transport
    };

    const graphics = this.add.graphics();
    this.routeGraphics = graphics;

    graphics.lineStyle(4, transport.routeColor, 0.9);
    graphics.beginPath();
    graphics.moveTo(startX, y);
    graphics.lineTo(endX, y);
    graphics.strokePath();

    const startPoint = this.add.circle(startX, y, 10, 0xffffff, 1);
    const endPoint = this.add.circle(endX, y, 10, transport.routeColor, 1);

    const vehicle = this.add.text(
      startX,
      y + transport.iconOffsetY,
      transport.icon,
      {
        fontFamily: 'Special Elite',
        fontSize: '32px',
        color: transport.color
      }
    ).setOrigin(0.5);

    this.animateVehicle(vehicle, startX, endX, y, transport);

    this.effectObjects.push(
      graphics,
      startPoint,
      endPoint,
      vehicle
    );
  }

  animateVehicle(vehicle, startX, endX, y, transport) {
    const baseDuration = 1800;

    this.tweens.add({
      targets: vehicle,
      x: endX,
      duration: baseDuration,
      ease: 'Sine.easeInOut'
    });

    if (transport.animation === 'flight') {
      this.tweens.add({
        targets: vehicle,
        y: y + transport.iconOffsetY - 16,
        duration: 900,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut'
      });
      return;
    }

    if (transport.animation === 'rail') {
      this.tweens.add({
        targets: vehicle,
        y: y + transport.iconOffsetY - 2,
        duration: 180,
        yoyo: true,
        repeat: 8,
        ease: 'Linear'
      });
      return;
    }

    if (transport.animation === 'road') {
      this.tweens.add({
        targets: vehicle,
        y: y + transport.iconOffsetY - 6,
        duration: 220,
        yoyo: true,
        repeat: 7,
        ease: 'Sine.easeInOut'
      });
      return;
    }

    if (transport.animation === 'sea') {
      this.tweens.add({
        targets: vehicle,
        y: y + transport.iconOffsetY - 10,
        angle: 4,
        duration: 550,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut'
      });
    }
  }

  renderEncounterVisual(travelEncounter, width, height, transport) {
    if (!travelEncounter?.id) return;

    switch (travelEncounter.id) {
      case 'storm':
        this.renderStormEffect(width, height);
        break;

      case 'security_delay':
        this.renderSecurityDelayEffect(width, height);
        break;

      case 'baggage_hold':
        this.renderBaggageHoldEffect(width, height);
        break;

      case 'reroute':
        this.renderRerouteEffect(width, height, transport);
        break;

      default:
        break;
    }
  }

  renderStormEffect(width, height) {
    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x0c1c2c,
      0.16
    );

    this.effectObjects.push(overlay);

    const rainKey = 'travel-rain-drop';

    if (!this.textures.exists(rainKey)) {
      const graphics = this.make.graphics({
        x: 0,
        y: 0,
        add: false
      });

      graphics.fillStyle(0xb7d8ff, 0.95);
      graphics.fillRect(0, 0, 2, 18);
      graphics.generateTexture(rainKey, 2, 18);
      graphics.destroy();
    }

    const emitter = this.add.particles(0, -20, rainKey, {
      x: { min: -100, max: width + 100 },
      y: { min: -40, max: 0 },
      lifespan: { min: 500, max: 900 },
      quantity: 6,
      frequency: 45,
      speedX: { min: -40, max: 30 },
      speedY: { min: 720, max: 980 },
      scaleX: { start: 1, end: 1 },
      scaleY: { start: 1, end: 1 },
      alpha: { start: 0.9, end: 0.15 },
      rotate: 12,
      blendMode: 'NORMAL'
    });

    this.effectObjects.push(emitter);

    const flash = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0xf4f7ff,
      0
    ).setBlendMode(Phaser.BlendModes.SCREEN);

    this.effectObjects.push(flash);

    const triggerFlash = () => {
      if (this.isLeaving || !flash.active) return;

      this.tweens.killTweensOf(flash);
      flash.setAlpha(0);

      this.tweens.add({
        targets: flash,
        alpha: 0.45,
        duration: 80,
        yoyo: true,
        hold: 35,
        repeat: Phaser.Math.Between(0, 1),
        onComplete: () => {
          if (!this.isLeaving) {
            this.time.delayedCall(
              Phaser.Math.Between(700, 1500),
              triggerFlash
            );
          }
        }
      });
    };

    this.time.delayedCall(500, triggerFlash);
  }

  renderSecurityDelayEffect(width, height) {
    const panel = this.add.rectangle(
      width / 2,
      height * 0.65,
      width * 0.62,
      86,
      0x102334,
      0.45
    ).setStrokeStyle(2, 0x5fb3ff, 0.5);

    const label = this.add.text(width / 2, height * 0.59, 'SECURITY CHECK', {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: '#8fd3ff'
    }).setOrigin(0.5);

    const barBg = this.add.rectangle(
      width / 2,
      height * 0.65,
      width * 0.48,
      16,
      0x0a1118,
      0.9
    ).setStrokeStyle(1, 0x8fd3ff, 0.6);

    const scanLine = this.add.rectangle(
      width * 0.26,
      height * 0.65,
      18,
      30,
      0x8fd3ff,
      0.55
    );

    const glowLine = this.add.rectangle(
      width * 0.26,
      height * 0.65,
      48,
      30,
      0x8fd3ff,
      0.12
    );

    const warningDots = [];

    for (let i = 0; i < 5; i += 1) {
      const dot = this.add.circle(
        width * 0.34 + i * 36,
        height * 0.71,
        5,
        0xffd166,
        0.25
      );

      warningDots.push(dot);

      this.tweens.add({
        targets: dot,
        alpha: { from: 0.15, to: 0.95 },
        duration: 350,
        yoyo: true,
        repeat: -1,
        delay: i * 120
      });
    }

    this.tweens.add({
      targets: [scanLine, glowLine],
      x: width * 0.74,
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.effectObjects.push(
      panel,
      label,
      barBg,
      scanLine,
      glowLine,
      ...warningDots
    );
  }

  renderBaggageHoldEffect(width, height) {
    const beltY = height * 0.67;

    const belt = this.add.rectangle(
      width / 2,
      beltY,
      width * 0.62,
      42,
      0x1d232b,
      0.95
    ).setStrokeStyle(2, 0x5c5141, 0.75);

    const beltTop = this.add.rectangle(
      width / 2,
      beltY - 20,
      width * 0.62,
      6,
      0x44392d,
      0.8
    );

    const beltBottom = this.add.rectangle(
      width / 2,
      beltY + 20,
      width * 0.62,
      6,
      0x44392d,
      0.8
    );

    const baggageLabel = this.add.text(
      width / 2,
      height * 0.59,
      'BAGGAGE RECHECK',
      {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#f4d4a2'
      }
    ).setOrigin(0.5);

    const bagData = [
      { w: 34, h: 22, color: 0x9b5f3f, offset: 0 },
      { w: 28, h: 20, color: 0x6c7a89, offset: 500 },
      { w: 38, h: 24, color: 0x7d4d82, offset: 980 }
    ];

    const bags = bagData.map((bag, index) => {
      const container = this.add.container(
        width * 0.2 - index * 80,
        beltY - 4
      );

      const body = this.add.rectangle(
        0,
        0,
        bag.w,
        bag.h,
        bag.color,
        1
      ).setStrokeStyle(2, 0xe9d8c1, 0.25);

      const handle = this.add.rectangle(
        0,
        -bag.h * 0.55,
        bag.w * 0.35,
        4,
        0xd9c7a4,
        0.9
      );

      container.add([body, handle]);

      this.tweens.add({
        targets: container,
        x: width * 0.82,
        duration: 1800,
        repeat: -1,
        delay: bag.offset,
        ease: 'Linear',
        onRepeat: () => {
          container.x = width * 0.18;
        }
      });

      this.tweens.add({
        targets: container,
        y: beltY - 8,
        duration: 220,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: bag.offset
      });

      return container;
    });

    const stamp = this.add.text(width * 0.74, beltY - 56, 'RECHECK', {
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: '#ff9f68',
      backgroundColor: '#402114',
      padding: {
        left: 8,
        right: 8,
        top: 5,
        bottom: 5
      }
    }).setAngle(-10).setAlpha(0.35);

    this.tweens.add({
      targets: stamp,
      alpha: { from: 0.15, to: 0.75 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.effectObjects.push(
      belt,
      beltTop,
      beltBottom,
      baggageLabel,
      stamp,
      ...bags
    );
  }

  renderRerouteEffect(width, height, transport) {
    if (!this.baseRoutePoints) return;

    const { startX, endX, y } = this.baseRoutePoints;

    if (this.routeGraphics) {
      this.routeGraphics.clear();
    }

    const rerouteLabel = this.add.text(
      width / 2,
      y - 74,
      transport.rerouteLabel,
      {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#ffd166'
      }
    ).setOrigin(0.5);

    const routeState = { bend: 0 };

    const drawReroute = () => {
      if (!this.routeGraphics) return;

      const graphics = this.routeGraphics;

      graphics.clear();

      graphics.lineStyle(3, transport.routeColor, 0.35);
      graphics.beginPath();
      graphics.moveTo(startX, y);
      graphics.lineTo(endX, y);
      graphics.strokePath();

      const cp1x = startX + (endX - startX) * 0.28;
      const cp2x = startX + (endX - startX) * 0.72;
      const curveY = y - routeState.bend;

      graphics.lineStyle(4, 0xffd166, 0.95);
      graphics.beginPath();
      graphics.moveTo(startX, y);
      graphics.lineTo(startX + 24, y);

      let currentX = startX + 24;
      const segment = 18;
      const gap = 12;
      let drawSegment = true;

      while (currentX < endX - 24) {
        const nextX = Math.min(currentX + segment, endX - 24);

        const t1 = (currentX - startX) / (endX - startX);
        const t2 = (nextX - startX) / (endX - startX);

        const p1 = Phaser.Math.Interpolation.CubicBezier(
          t1,
          startX,
          cp1x,
          cp2x,
          endX
        );

        const q1 = Phaser.Math.Interpolation.CubicBezier(
          t1,
          y,
          curveY,
          curveY,
          y
        );

        const p2 = Phaser.Math.Interpolation.CubicBezier(
          t2,
          startX,
          cp1x,
          cp2x,
          endX
        );

        const q2 = Phaser.Math.Interpolation.CubicBezier(
          t2,
          y,
          curveY,
          curveY,
          y
        );

        if (drawSegment) {
          graphics.beginPath();
          graphics.moveTo(p1, q1);
          graphics.lineTo(p2, q2);
          graphics.strokePath();
        }

        drawSegment = !drawSegment;
        currentX += segment + gap;
      }

      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(startX, y, 10);

      graphics.fillStyle(transport.routeColor, 1);
      graphics.fillCircle(endX, y, 10);
    };

    drawReroute();

    this.routeTween = this.tweens.add({
      targets: routeState,
      bend: 90,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: drawReroute
    });

    const marker = this.add.circle(
      (startX + endX) / 2,
      y - 42,
      8,
      0xffd166,
      0.95
    );

    this.tweens.add({
      targets: marker,
      y: y - 92,
      alpha: { from: 0.95, to: 0.25 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.effectObjects.push(rerouteLabel, marker);
  }

  cleanupEffects() {
    if (this.routeTween) {
      this.routeTween.stop();
      this.routeTween = null;
    }

    if (Array.isArray(this.effectObjects)) {
      this.effectObjects.forEach((object) => {
        if (object?.active && typeof object.destroy === 'function') {
          object.destroy();
        }
      });
    }

    this.effectObjects = [];
    this.routeGraphics = null;

    if (this._travelSfx) {
      try {
        if (this._travelSfx.isPlaying) {
          this._travelSfx.stop();
        }

        if (!this._travelSfx.pendingRemove) {
          this._travelSfx.destroy();
        }
      } catch (error) {
        console.warn(
          '[TravelTransitionScene.cleanupEffects] SFX cleanup failed:',
          error
        );
      }

      this._travelSfx = null;
    }
  }

  getDetailText({
    transport,
    baseTravelHours = 0,
    travelHours = 0,
    travelEncounter = null
  }) {
    if (travelEncounter) {
      const penalty = Math.max(0, travelHours - baseTravelHours);
      const penaltyText = penalty > 0 ? ` (+${penalty}h)` : '';

      const label = travelEncounter.label || 'Unexpected delay';
      const message =
        travelEncounter.message ||
        'Something slowed the trip, but the trail is still warm.';

      return `${label}${penaltyText}. ${message}`;
    }

    return transport.clearRouteText;
  }
}