import { ensureHud } from '../hudHelpers.js';
import { gameState, saveGameState } from '../GameData.js';

export class TravelTransitionScene extends Phaser.Scene {
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
  }

  init(data) {
    this.transitionData = data || {};
    this.canContinue = false;
    this.isLeaving = false;
    this.shouldShowPhoneCall = false;
    this.effectObjects = [];
    this.routeGraphics = null;
    this.routeTween = null;
    this.baseRoutePoints = null;
  }

  create() {
    this.scene.sleep('UIScene');

    const { width, height } = this.scale;
    const camera = this.cameras.main;

    const {
      fromCity = 'Unknown',
      toCity = 'Unknown',
      toCityId = null,
      cityId = null,
      travelHours = 0,
      baseTravelHours = travelHours,
      travelEncounter = null,
      status = 'CONTINUE'
    } = this.transitionData;

    const targetCityId = cityId || toCityId || null;
    this.registerVisitedCity(targetCityId);

    ensureHud(this);

    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }

    camera.fadeIn(400, 0, 0, 0);

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x07111a, 1);
    this.effectObjects.push(bg);

    const vignetteTop = this.add.rectangle(width / 2, 0, width, height * 0.28, 0x000000, 0.18)
      .setOrigin(0.5, 0);
    const vignetteBottom = this.add.rectangle(width / 2, height, width, height * 0.28, 0x000000, 0.22)
      .setOrigin(0.5, 1);
    this.effectObjects.push(vignetteTop, vignetteBottom);

    this.add.text(width / 2, 90, 'TRAVEL LOG', {
      fontFamily: 'PressStart2P',
      fontSize: '28px',
      color: '#f4e7c1'
    }).setOrigin(0.5);

    this.add.text(width / 2, 170, `${fromCity} → ${toCity}`, {
      fontFamily: 'Special Elite',
      fontSize: '34px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, 225, `Travel time: +${travelHours}h`, {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#ffd166'
    }).setOrigin(0.5);

    this.add.text(width / 2, 285, 'Following the trail...', {
      fontFamily: 'Special Elite',
      fontSize: '30px',
      color: '#d6e4f0'
    }).setOrigin(0.5);

    const detailText = this.getDetailText({
      baseTravelHours,
      travelHours,
      travelEncounter
    });

    this.add.text(width / 2, 355, detailText, {
      fontFamily: 'Special Elite',
      fontSize: '24px',
      color: travelEncounter ? '#ffd966' : '#d9d9d9',
      align: 'center',
      wordWrap: { width: Math.min(760, width * 0.7) }
    }).setOrigin(0.5);

    if (this.shouldShowPhoneCall) {
      this.add.text(width / 2, 420, 'Your phone starts ringing. Headquarters has thoughts.', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#ffd966',
        align: 'center',
        wordWrap: { width: Math.min(760, width * 0.7) }
      }).setOrigin(0.5);
    }

    this.drawTravelLine(width, height);
    this.renderEncounterVisual(travelEncounter, width, height);

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

    this.time.delayedCall(5000, () => {
      if (this.isLeaving || !this.continueHint) return;

      this.canContinue = true;
      this.continueHint.setText('Click to continue');
      this.continueHint.setColor('#f4e7c1');
    });

    this.input.once('pointerdown', () => {
      if (!this.canContinue || this.isLeaving) return;
      this.leaveScene();
    });

    this.time.delayedCall(4500, () => {
      if (this.isLeaving) return;
      this.leaveScene();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.cleanupEffects();
    });
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
    this.isLeaving = true;

    const { status, cityId, toCityId } = this.transitionData;
    const targetCityId = cityId || toCityId || null;

    const camera = this.cameras.main;

    camera.fadeOut(450, 0, 0, 0);

    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      console.log('TravelTransition ->', {
        destinationScene: 'CityScene',
        targetCityId,
        transitionData: this.transitionData,
        pendingPhoneCall: gameState.pendingPhoneCall
      });

      if (!targetCityId) {
        console.error('TravelTransitionScene: missing target city id', this.transitionData);
        this.scene.start('MenuScene');
        return;
      }

      this.scene.start('CityScene', {
        cityId: targetCityId,
        investigationStatus: status,
        isFinalShowdown: status === 'FINAL_SHOWDOWN',
        pendingPhoneCall: Boolean(gameState.pendingPhoneCall),
        pendingPhoneCallCityId: gameState.pendingPhoneCallCityId || targetCityId
      });
    });
  }

  drawTravelLine(width, height) {
    const startX = width * 0.22;
    const endX = width * 0.78;
    const y = height * 0.62;

    this.baseRoutePoints = {
      startX,
      endX,
      y
    };

    const graphics = this.add.graphics();
    this.routeGraphics = graphics;

    graphics.lineStyle(4, 0xd9c27a, 0.9);
    graphics.beginPath();
    graphics.moveTo(startX, y);
    graphics.lineTo(endX, y);
    graphics.strokePath();

    this.add.circle(startX, y, 10, 0xffffff, 1);
    this.add.circle(endX, y, 10, 0xd9c27a, 1);

    const plane = this.add.text(width * 0.5, y - 18, '✈', {
      fontFamily: 'Special Elite',
      fontSize: '32px',
      color: '#f4e7c1'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: plane,
      x: endX,
      duration: 1800,
      ease: 'Sine.easeInOut'
    });

    this.effectObjects.push(graphics, plane);
  }

  renderEncounterVisual(travelEncounter, width, height) {
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
        this.renderRerouteEffect(width, height);
        break;
      default:
        break;
    }
  }

  renderStormEffect(width, height) {
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x0c1c2c, 0.16);
    this.effectObjects.push(overlay);

    const rainKey = 'travel-rain-drop';
    if (!this.textures.exists(rainKey)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xb7d8ff, 0.95);
      g.fillRect(0, 0, 2, 18);
      g.generateTexture(rainKey, 2, 18);
      g.destroy();
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

    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xf4f7ff, 0)
      .setBlendMode(Phaser.BlendModes.SCREEN);
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
            this.time.delayedCall(Phaser.Math.Between(700, 1500), triggerFlash);
          }
        }
      });
    };

    this.time.delayedCall(500, triggerFlash);
  }

  renderSecurityDelayEffect(width, height) {
    const panel = this.add.rectangle(width / 2, height * 0.62, width * 0.62, 86, 0x102334, 0.45)
      .setStrokeStyle(2, 0x5fb3ff, 0.5);
    const label = this.add.text(width / 2, height * 0.56, 'SECURITY CHECK', {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: '#8fd3ff'
    }).setOrigin(0.5);

    const barBg = this.add.rectangle(width / 2, height * 0.62, width * 0.48, 16, 0x0a1118, 0.9)
      .setStrokeStyle(1, 0x8fd3ff, 0.6);

    const scanLine = this.add.rectangle(width * 0.26, height * 0.62, 18, 30, 0x8fd3ff, 0.55);
    const glowLine = this.add.rectangle(width * 0.26, height * 0.62, 48, 30, 0x8fd3ff, 0.12);

    const warningDots = [];
    for (let i = 0; i < 5; i += 1) {
      const dot = this.add.circle(width * 0.34 + i * 36, height * 0.68, 5, 0xffd166, 0.25);
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

    this.effectObjects.push(panel, label, barBg, scanLine, glowLine, ...warningDots);
  }

  renderBaggageHoldEffect(width, height) {
    const beltY = height * 0.64;

    const belt = this.add.rectangle(width / 2, beltY, width * 0.62, 42, 0x1d232b, 0.95)
      .setStrokeStyle(2, 0x5c5141, 0.75);
    const beltTop = this.add.rectangle(width / 2, beltY - 20, width * 0.62, 6, 0x44392d, 0.8);
    const beltBottom = this.add.rectangle(width / 2, beltY + 20, width * 0.62, 6, 0x44392d, 0.8);

    const baggageLabel = this.add.text(width / 2, height * 0.56, 'BAGGAGE RECHECK', {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: '#f4d4a2'
    }).setOrigin(0.5);

    const bagData = [
      { w: 34, h: 22, color: 0x9b5f3f, offset: 0 },
      { w: 28, h: 20, color: 0x6c7a89, offset: 500 },
      { w: 38, h: 24, color: 0x7d4d82, offset: 980 }
    ];

    const bags = bagData.map((bag, index) => {
      const container = this.add.container(width * 0.2 - index * 80, beltY - 4);

      const body = this.add.rectangle(0, 0, bag.w, bag.h, bag.color, 1)
        .setStrokeStyle(2, 0xe9d8c1, 0.25);
      const handle = this.add.rectangle(0, -bag.h * 0.55, bag.w * 0.35, 4, 0xd9c7a4, 0.9);

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
      padding: { left: 8, right: 8, top: 5, bottom: 5 }
    }).setAngle(-10).setAlpha(0.35);

    this.tweens.add({
      targets: stamp,
      alpha: { from: 0.15, to: 0.75 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.effectObjects.push(belt, beltTop, beltBottom, baggageLabel, stamp, ...bags);
  }

  renderRerouteEffect(width, height) {
    if (!this.baseRoutePoints) return;

    const { startX, endX, y } = this.baseRoutePoints;

    if (this.routeGraphics) {
      this.routeGraphics.clear();
    }

    const rerouteLabel = this.add.text(width / 2, y - 74, 'FLIGHT PATH REROUTE', {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: '#ffd166'
    }).setOrigin(0.5);

    const routeState = { bend: 0 };

    const drawReroute = () => {
      if (!this.routeGraphics) return;

      const g = this.routeGraphics;
      g.clear();

      g.lineStyle(3, 0xd9c27a, 0.35);
      g.beginPath();
      g.moveTo(startX, y);
      g.lineTo(endX, y);
      g.strokePath();

      const midX = (startX + endX) / 2;
      const cp1x = startX + (endX - startX) * 0.28;
      const cp2x = startX + (endX - startX) * 0.72;
      const curveY = y - routeState.bend;

      g.lineStyle(4, 0xffd166, 0.95);
      g.beginPath();
      g.moveTo(startX, y);
      g.lineTo(startX + 24, y);

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
          g.beginPath();
          g.moveTo(p1, q1);
          g.lineTo(p2, q2);
          g.strokePath();
        }

        drawSegment = !drawSegment;
        currentX += segment + gap;
      }

      g.fillStyle(0xffffff, 1);
      g.fillCircle(startX, y, 10);
      g.fillStyle(0xd9c27a, 1);
      g.fillCircle(endX, y, 10);
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

    const marker = this.add.circle((startX + endX) / 2, y - 42, 8, 0xffd166, 0.95);
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
      this.effectObjects.forEach(obj => {
        if (obj && obj.active && typeof obj.destroy === 'function') {
          obj.destroy();
        }
      });
    }

    this.effectObjects = [];
    this.routeGraphics = null;
  }

  getDetailText({ baseTravelHours = 0, travelHours = 0, travelEncounter = null }) {
    if (travelEncounter) {
      const penalty = Math.max(0, travelHours - baseTravelHours);
      const penaltyText = penalty > 0 ? ` (+${penalty}h)` : '';
      const label = travelEncounter.label || 'Unexpected delay';
      const message =
        travelEncounter.message ||
        'Something slowed the trip, but the trail is still warm.';

      return `${label}${penaltyText}. ${message}`;
    }

    return `Clear route. Estimated flight held at ${travelHours}h and the chase stays on schedule.`;
  }
}