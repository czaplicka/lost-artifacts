export function drawTravelLine(scene, width, height, transport) {
  const startX = width * 0.22;
  const endX = width * 0.78;
  const y = height * 0.65;

  scene.baseRoutePoints = { startX, endX, y, transport };

  const graphics = scene.add.graphics();
  scene.routeGraphics = graphics;

  graphics.lineStyle(4, transport.routeColor, 0.9);
  graphics.beginPath();
  graphics.moveTo(startX, y);
  graphics.lineTo(endX, y);
  graphics.strokePath();

  const startPoint = scene.add.circle(startX, y, 10, 0xffffff, 1);
  const endPoint = scene.add.circle(endX, y, 10, transport.routeColor, 1);
  const vehicle = scene.add.text(startX, y + transport.iconOffsetY, transport.icon, {
    fontFamily: 'Special Elite',
    fontSize: '32px',
    color: transport.color
  }).setOrigin(0.5);

  animateVehicle(scene, vehicle, startX, endX, y, transport);
  scene.effectObjects.push(graphics, startPoint, endPoint, vehicle);
}

function animateVehicle(scene, vehicle, startX, endX, y, transport) {
  scene.tweens.add({
    targets: vehicle,
    x: endX,
    duration: 1800,
    ease: 'Sine.easeInOut'
  });

  const animations = {
    flight: { offset: -16, duration: 900, repeat: 1, ease: 'Sine.easeInOut' },
    rail: { offset: -2, duration: 180, repeat: 8, ease: 'Linear' },
    road: { offset: -6, duration: 220, repeat: 7, ease: 'Sine.easeInOut' }
  };

  if (animations[transport.animation]) {
    const config = animations[transport.animation];
    scene.tweens.add({
      targets: vehicle,
      y: y + transport.iconOffsetY + config.offset,
      duration: config.duration,
      yoyo: true,
      repeat: config.repeat,
      ease: config.ease
    });
    return;
  }

  if (transport.animation === 'sea') {
    scene.tweens.add({
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

export function renderEncounterVisual(scene, travelEncounter, width, height, transport) {
  if (!travelEncounter?.id) return;

  const renderers = {
    storm: () => renderStormEffect(scene, width, height),
    security_delay: () => renderSecurityDelayEffect(scene, width, height),
    baggage_hold: () => renderBaggageHoldEffect(scene, width, height),
    reroute: () => renderRerouteEffect(scene, width, height, transport)
  };

  renderers[travelEncounter.id]?.();
}

function renderStormEffect(scene, width, height) {
  const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x0c1c2c, 0.16);
  scene.effectObjects.push(overlay);

  const rainKey = 'travel-rain-drop';
  if (!scene.textures.exists(rainKey)) {
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xb7d8ff, 0.95);
    graphics.fillRect(0, 0, 2, 18);
    graphics.generateTexture(rainKey, 2, 18);
    graphics.destroy();
  }

  const emitter = scene.add.particles(0, -20, rainKey, {
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

  const flash = scene.add.rectangle(width / 2, height / 2, width, height, 0xf4f7ff, 0)
    .setBlendMode(Phaser.BlendModes.SCREEN);

  scene.effectObjects.push(emitter, flash);

  const triggerFlash = () => {
    if (scene.isLeaving || !flash.active) return;

    scene.tweens.killTweensOf(flash);
    flash.setAlpha(0);
    scene.tweens.add({
      targets: flash,
      alpha: 0.45,
      duration: 80,
      yoyo: true,
      hold: 35,
      repeat: Phaser.Math.Between(0, 1),
      onComplete: () => {
        if (!scene.isLeaving) {
          scene.time.delayedCall(Phaser.Math.Between(700, 1500), triggerFlash);
        }
      }
    });
  };

  scene.time.delayedCall(500, triggerFlash);
}

function renderSecurityDelayEffect(scene, width, height) {
  const panel = scene.add.rectangle(width / 2, height * 0.65, width * 0.62, 86, 0x102334, 0.45)
    .setStrokeStyle(2, 0x5fb3ff, 0.5);
  const label = scene.add.text(width / 2, height * 0.59, 'SECURITY CHECK', {
    fontFamily: 'PressStart2P', fontSize: '16px', color: '#8fd3ff'
  }).setOrigin(0.5);
  const barBg = scene.add.rectangle(width / 2, height * 0.65, width * 0.48, 16, 0x0a1118, 0.9)
    .setStrokeStyle(1, 0x8fd3ff, 0.6);
  const scanLine = scene.add.rectangle(width * 0.26, height * 0.65, 18, 30, 0x8fd3ff, 0.55);
  const glowLine = scene.add.rectangle(width * 0.26, height * 0.65, 48, 30, 0x8fd3ff, 0.12);

  const warningDots = Array.from({ length: 5 }, (_, index) => {
    const dot = scene.add.circle(width * 0.34 + index * 36, height * 0.71, 5, 0xffd166, 0.25);
    scene.tweens.add({
      targets: dot, alpha: { from: 0.15, to: 0.95 }, duration: 350,
      yoyo: true, repeat: -1, delay: index * 120
    });
    return dot;
  });

  scene.tweens.add({
    targets: [scanLine, glowLine], x: width * 0.74, duration: 1200,
    ease: 'Sine.easeInOut', yoyo: true, repeat: -1
  });

  scene.effectObjects.push(panel, label, barBg, scanLine, glowLine, ...warningDots);
}

function renderBaggageHoldEffect(scene, width, height) {
  const beltY = height * 0.67;
  const belt = scene.add.rectangle(width / 2, beltY, width * 0.62, 42, 0x1d232b, 0.95)
    .setStrokeStyle(2, 0x5c5141, 0.75);
  const beltTop = scene.add.rectangle(width / 2, beltY - 20, width * 0.62, 6, 0x44392d, 0.8);
  const beltBottom = scene.add.rectangle(width / 2, beltY + 20, width * 0.62, 6, 0x44392d, 0.8);
  const label = scene.add.text(width / 2, height * 0.59, 'BAGGAGE RECHECK', {
    fontFamily: 'PressStart2P', fontSize: '16px', color: '#f4d4a2'
  }).setOrigin(0.5);

  const bagData = [
    { w: 34, h: 22, color: 0x9b5f3f, offset: 0 },
    { w: 28, h: 20, color: 0x6c7a89, offset: 500 },
    { w: 38, h: 24, color: 0x7d4d82, offset: 980 }
  ];

  const bags = bagData.map((bag, index) => {
    const container = scene.add.container(width * 0.2 - index * 80, beltY - 4);
    const body = scene.add.rectangle(0, 0, bag.w, bag.h, bag.color, 1)
      .setStrokeStyle(2, 0xe9d8c1, 0.25);
    const handle = scene.add.rectangle(0, -bag.h * 0.55, bag.w * 0.35, 4, 0xd9c7a4, 0.9);
    container.add([body, handle]);

    scene.tweens.add({
      targets: container, x: width * 0.82, duration: 1800, repeat: -1,
      delay: bag.offset, ease: 'Linear', onRepeat: () => { container.x = width * 0.18; }
    });
    scene.tweens.add({
      targets: container, y: beltY - 8, duration: 220, yoyo: true,
      repeat: -1, ease: 'Sine.easeInOut', delay: bag.offset
    });
    return container;
  });

  const stamp = scene.add.text(width * 0.74, beltY - 56, 'RECHECK', {
    fontFamily: 'PressStart2P', fontSize: '14px', color: '#ff9f68',
    backgroundColor: '#402114', padding: { left: 8, right: 8, top: 5, bottom: 5 }
  }).setAngle(-10).setAlpha(0.35);

  scene.tweens.add({
    targets: stamp, alpha: { from: 0.15, to: 0.75 }, duration: 500, yoyo: true, repeat: -1
  });

  scene.effectObjects.push(belt, beltTop, beltBottom, label, stamp, ...bags);
}

function renderRerouteEffect(scene, width, height, transport) {
  if (!scene.baseRoutePoints) return;

  const { startX, endX, y } = scene.baseRoutePoints;
  scene.routeGraphics?.clear();

  const label = scene.add.text(width / 2, y - 74, transport.rerouteLabel, {
    fontFamily: 'PressStart2P', fontSize: '16px', color: '#ffd166'
  }).setOrigin(0.5);
  const routeState = { bend: 0 };

  const drawReroute = () => {
    if (!scene.routeGraphics) return;
    const graphics = scene.routeGraphics;
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

    let currentX = startX + 24;
    let drawSegment = true;
    while (currentX < endX - 24) {
      const nextX = Math.min(currentX + 18, endX - 24);
      const t1 = (currentX - startX) / (endX - startX);
      const t2 = (nextX - startX) / (endX - startX);
      const p1 = Phaser.Math.Interpolation.CubicBezier(t1, startX, cp1x, cp2x, endX);
      const q1 = Phaser.Math.Interpolation.CubicBezier(t1, y, curveY, curveY, y);
      const p2 = Phaser.Math.Interpolation.CubicBezier(t2, startX, cp1x, cp2x, endX);
      const q2 = Phaser.Math.Interpolation.CubicBezier(t2, y, curveY, curveY, y);

      if (drawSegment) {
        graphics.beginPath();
        graphics.moveTo(p1, q1);
        graphics.lineTo(p2, q2);
        graphics.strokePath();
      }

      drawSegment = !drawSegment;
      currentX += 30;
    }

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(startX, y, 10);
    graphics.fillStyle(transport.routeColor, 1);
    graphics.fillCircle(endX, y, 10);
  };

  drawReroute();
  scene.routeTween = scene.tweens.add({
    targets: routeState, bend: 90, duration: 900, yoyo: true,
    repeat: -1, ease: 'Sine.easeInOut', onUpdate: drawReroute
  });

  const marker = scene.add.circle((startX + endX) / 2, y - 42, 8, 0xffd166, 0.95);
  scene.tweens.add({
    targets: marker, y: y - 92, alpha: { from: 0.95, to: 0.25 },
    duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
  });

  scene.effectObjects.push(label, marker);
}