// scenes/travel/TravelTicketUI.js
// HUD pieces of the travel transition. Everything is built from Graphics/Text so no
// extra assets are required. All objects are registered in scene.effectObjects.

import { TRAVEL_DEPTH, fs, hex, pick } from './TravelTextures.js';

const INK = '#2b1d12';
const PAPER = 0xf1e4c3;

const register = (scene, object, depth = TRAVEL_DEPTH.ui) => {
  object.setDepth(depth);
  scene.effectObjects.push(object);
  return object;
};

// ---------------------------------------------------------------------------
// Header: transport badge (left) + route title (centre)
// ---------------------------------------------------------------------------

export function createTravelHeader(scene, { width, U, transport, vehicleKey, fromCity, toCity, returning }) {
  const badge = register(scene, scene.add.graphics());
  badge.fillStyle(0x0b1620, 0.88);
  badge.fillRoundedRect(56 * U, 38 * U, 372 * U, 58 * U, 10 * U);
  badge.lineStyle(2 * U, transport.routeColor, 0.9);
  badge.strokeRoundedRect(56 * U, 38 * U, 372 * U, 58 * U, 10 * U);

  const icon = register(scene, scene.add.image(92 * U, 67 * U, vehicleKey).setScale(0.42 * U));
  const logTitle = register(scene, scene.add.text(128 * U, 67 * U, transport.logTitle, {
    fontFamily: 'PressStart2P', fontSize: fs(U, 18), color: transport.color
  }).setOrigin(0, 0.5));

  const route = register(scene, scene.add.text(
    width / 2,
    70 * U,
    returning ? 'Back to the private office' : `${fromCity}  →  ${toCity}`,
    {
      fontFamily: 'SpecialElite',
      fontSize: fs(U, 40),
      color: '#f4e7c1',
      stroke: '#1a0f08',
      strokeThickness: Math.max(2, Math.round(6 * U))
    }
  ).setOrigin(0.5));

  const parts = [badge, icon, logTitle, route];
  parts.forEach((part) => part.setAlpha(0));
  scene.createTrackedTween({
    targets: parts,
    alpha: 1,
    duration: 450,
    delay: 150,
    ease: 'Sine.easeOut'
  });
  scene.createTrackedTween({
    targets: route,
    y: { from: route.y - 18 * U, to: route.y },
    duration: 450,
    delay: 150,
    ease: 'Cubic.easeOut'
  });
  return parts;
}

// ---------------------------------------------------------------------------
// Ticket
// ---------------------------------------------------------------------------

export class TravelTicket {
  constructor(scene, {
    width, height, U, transport, vehicleKey, fromCity, toCity,
    baseHours = 0, penalty = 0, moneySpent = 0, energyChange = 0
  }) {
    this.scene = scene;
    this.U = U;
    this.baseHours = Number(baseHours) || 0;
    this.penalty = Math.max(0, Number(penalty) || 0);
    this.money = Number(moneySpent) || 0;
    this.energy = Number(energyChange) || 0;
    this.progress = 0;
    this.penaltyShown = 0;

    const W = 580 * U;
    const H = 236 * U;
    this.homeX = 56 * U + W / 2;
    this.homeY = height - 330 * U + H / 2;

    const c = scene.add.container(this.homeX, this.homeY + 420 * U).setAlpha(0).setAngle(4);
    register(scene, c);
    this.container = c;

    const left = -W / 2;
    const top = -H / 2;
    const stubX = W / 2 - 128 * U;
    const stubCx = stubX + 64 * U;

    // paper
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(left + 7 * U, top + 10 * U, W, H, 12 * U);
    g.fillStyle(PAPER, 1);
    g.fillRoundedRect(left, top, W, H, 12 * U);
    g.fillStyle(transport.ticketColor, 1);
    g.fillRoundedRect(left, top, W, 46 * U, { tl: 12 * U, tr: 12 * U, bl: 0, br: 0 });
    g.fillStyle(0x0b1620, 1);
    g.fillCircle(stubX, top, 10 * U);
    g.fillCircle(stubX, top + H, 10 * U);
    g.fillStyle(0xb9a77f, 1);
    for (let y = top + 58 * U; y < top + H - 14 * U; y += 14 * U) g.fillCircle(stubX, y, 2.2 * U);
    c.add(g);

    const text = (x, y, value, size, color, config = {}) => {
      const { ox = 0, oy = 0.5, ...style } = config;
      const t = scene.add.text(x, y, value, {
        fontFamily: 'SpecialElite', fontSize: fs(U, size), color, ...style
      }).setOrigin(ox, oy);
      c.add(t);
      return t;
    };

    // header
    c.add(scene.add.text(left + 20 * U, top + 23 * U, transport.ticketTitle, {
      fontFamily: 'PressStart2P', fontSize: fs(U, 15), color: '#f4e7c1'
    }).setOrigin(0, 0.5));
    text(stubX - 16 * U, top + 23 * U, `No. ${Phaser.Math.Between(1000, 9999)}`, 16, '#c9b88e', { ox: 1 });

    // route fields
    const x0 = left + 24 * U;
    const labelColor = '#7a6648';
    const cityFont = (name) => (String(name).length > 16 ? 21 : 27);
    text(x0, top + 68 * U, 'FROM', 14, labelColor);
    text(x0, top + 90 * U, fromCity, cityFont(fromCity), INK);
    text(x0, top + 122 * U, 'TO', 14, labelColor);
    text(x0, top + 144 * U, toCity, cityFont(toCity), INK);

    // counters
    text(x0, top + 182 * U, 'TIME', 13, labelColor);
    text(x0 + 140 * U, top + 182 * U, 'COST', 13, labelColor);
    text(x0 + 280 * U, top + 182 * U, 'ENERGY', 13, labelColor);
    this.timeText = text(x0, top + 206 * U, '+0h', 25, INK);
    this.costText = text(x0 + 140 * U, top + 206 * U, '$0', 25, INK);
    this.energyText = text(x0 + 280 * U, top + 206 * U, '0', 25, INK);

    // stub
    c.add(scene.add.image(stubCx, top + 82 * U, vehicleKey).setScale(0.62 * U).setTint(0x3a2a1a));
    text(stubCx, top + 128 * U, transport.seatLabel || 'SEAT', 12, labelColor, { ox: 0.5 });
    text(stubCx, top + 152 * U, pick(transport.seats || ['1A']), 17, INK, {
      ox: 0.5, align: 'center', wordWrap: { width: 112 * U }
    });
    const bars = scene.add.graphics();
    bars.fillStyle(0x2b1d12, 1);
    for (let i = 0; i < 22; i++) {
      bars.fillRect(stubX + 16 * U + i * 4.4 * U, top + H - 52 * U, Phaser.Math.Between(1, 3) * U, 26 * U);
    }
    c.add(bars);

    this.refresh();
  }

  enter(delay = 200) {
    this.scene.createTrackedTween({
      targets: this.container,
      y: this.homeY,
      alpha: 1,
      angle: -1.4,
      duration: 650,
      delay,
      ease: 'Back.easeOut'
    });
  }

  update(progress) {
    this.progress = progress;
    this.refresh();
  }

  refresh() {
    const p = this.progress;
    const hours = Math.round(this.baseHours * p + this.penaltyShown);
    const money = Math.round(this.money * p);
    const energy = this.energy * p;
    const energyLabel = Number.isInteger(energy) ? String(energy) : energy.toFixed(1);

    this.timeText.setText(`+${hours}h`);
    this.costText.setText(`$${money}`);
    this.energyText.setText(`${energy > 0 ? '+' : ''}${energyLabel}`);
    this.energyText.setColor(this.energy < 0 ? '#8a2b1e' : this.energy > 0 ? '#2f6b3a' : INK);
  }

  // Delay from an encounter ticks onto the time counter.
  setPenalty(duration = 900) {
    if (this.penalty <= 0) return;
    this.timeText.setColor('#b3261e');
    const shown = { value: 0 };
    this.scene.createTrackedTween({
      targets: shown,
      value: this.penalty,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.penaltyShown = shown.value;
        this.refresh();
      },
      onComplete: () => {
        this.penaltyShown = this.penalty;
        this.refresh();
      }
    });
  }

  slamStamp(label, { color = 0xb3261e, x = 100 * this.U, y = 8 * this.U, angle = -10, size = 18 } = {}) {
    const { scene, U } = this;
    const txt = scene.add.text(0, 0, label, {
      fontFamily: 'PressStart2P', fontSize: fs(U, size), color: hex(color)
    }).setOrigin(0.5);
    const padX = 16 * U;
    const padY = 12 * U;
    const frame = scene.add.graphics();
    frame.lineStyle(4 * U, color, 1);
    frame.strokeRoundedRect(-txt.width / 2 - padX, -txt.height / 2 - padY, txt.width + padX * 2, txt.height + padY * 2, 6 * U);

    const stamp = scene.add.container(x, y, [frame, txt]).setAngle(angle).setScale(3).setAlpha(0);
    this.container.add(stamp);
    scene.createTrackedTween({
      targets: stamp,
      scale: 1,
      alpha: 0.9,
      duration: 170,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (!scene.isLeaving) scene.cameras.main.shake(110, 0.004);
      }
    });
    return stamp;
  }

  markArrived() {
    this.progress = 1;
    this.penaltyShown = this.penalty;
    this.refresh();
    this.timeText.setColor(INK);
    this.slamStamp('ARRIVED', { color: 0x2f6b3a, x: 226 * this.U, y: 20 * this.U, angle: 10, size: 12 });
  }
}

// ---------------------------------------------------------------------------
// Journal: typewriter line next to the ticket
// ---------------------------------------------------------------------------

export class TravelJournal {
  constructor(scene, { width, height, U }) {
    this.scene = scene;
    this.typing = null;

    const x = 700 * U;
    const y = height - 238 * U;
    this.bar = register(scene, scene.add.rectangle(x - 16 * U, y + 56 * U, 3 * U, 118 * U, 0xd4af37, 0.85));
    this.text = register(scene, scene.add.text(x, y, '', {
      fontFamily: 'SpecialElite',
      fontSize: fs(U, 27),
      color: '#f4e7c1',
      wordWrap: { width: Math.min(760 * U, width - x - 440 * U) },
      lineSpacing: Math.round(6 * U)
    }).setOrigin(0, 0));
    this.bar.setAlpha(0);
    scene.createTrackedTween({ targets: this.bar, alpha: 0.85, duration: 500, delay: 400 });
  }

  type(line, speed = 26) {
    if (!this.text?.active || this.scene.isLeaving) return;
    this.typing?.remove(false);

    let index = 0;
    this.text.setText('_');
    this.typing = this.scene.time.addEvent({
      delay: speed,
      repeat: Math.max(0, line.length - 1),
      callback: () => {
        index += 1;
        if (!this.text?.active) return;
        this.text.setText(line.slice(0, index) + (index < line.length ? '_' : ''));
      }
    });
  }

  destroy() {
    this.typing?.remove(false);
    this.typing = null;
  }
}

// ---------------------------------------------------------------------------
// Polaroid of the destination city (only when its photo texture is loaded)
// ---------------------------------------------------------------------------

export function createPolaroid(scene, { width, height, U, textureKey, city, country }) {
  if (!textureKey) return null;

  const fw = 320 * U;
  const fh = 312 * U;
  const photoW = 288 * U;
  const photoH = 196 * U;
  const cx = width - 64 * U - fw / 2;
  const cy = height - 94 * U - fh / 2;

  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.4);
  g.fillRect(-fw / 2 + 7 * U, -fh / 2 + 10 * U, fw, fh);
  g.fillStyle(0xf4efe3, 1);
  g.fillRect(-fw / 2, -fh / 2, fw, fh);

  const photo = scene.add.image(0, -fh / 2 + 16 * U + photoH / 2, textureKey);
  const sw = photo.width;
  const sh = photo.height;
  const scale = photoH / sh;
  const cropW = Math.min(sw, photoW / scale);
  photo.setScale(scale).setCrop((sw - cropW) / 2, 0, cropW, sh);

  const caption = scene.add.text(0, fh / 2 - 62 * U, city, {
    fontFamily: 'SpecialElite', fontSize: fs(U, 28), color: INK, align: 'center'
  }).setOrigin(0.5);
  const sub = scene.add.text(0, fh / 2 - 30 * U, country || '', {
    fontFamily: 'SpecialElite', fontSize: fs(U, 18), color: '#7a6648', align: 'center'
  }).setOrigin(0.5);

  const tape = scene.add.rectangle(0, -fh / 2 - 4 * U, 96 * U, 28 * U, 0xe8d9a0, 0.65).setAngle(4);
  const container = scene.add.container(cx, cy, [g, photo, caption, sub, tape]).setAlpha(0);
  register(scene, container);

  return {
    container,
    reveal() {
      container.setScale(1.5).setAngle(14);
      scene.createTrackedTween({
        targets: container,
        scale: 1,
        alpha: 1,
        angle: -3,
        duration: 520,
        ease: 'Back.easeOut'
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Passport stamp (rubber stamp slammed next to the polaroid)
// ---------------------------------------------------------------------------

export function createPassportMark(scene, { width, height, U, country }) {
  const x = width - 64 * U - 320 * U + 10 * U;
  const y = height - 94 * U - 312 * U + 6 * U;
  const color = 0x2a4d9b;

  const ring = scene.add.graphics();
  ring.lineStyle(4 * U, color, 0.9);
  ring.strokeCircle(0, 0, 64 * U);
  ring.lineStyle(2 * U, color, 0.9);
  ring.strokeCircle(0, 0, 53 * U);

  const top = scene.add.text(0, -34 * U, 'ENTRY', {
    fontFamily: 'PressStart2P', fontSize: fs(U, 10), color: hex(color)
  }).setOrigin(0.5);
  const name = scene.add.text(0, 0, country, {
    fontFamily: 'SpecialElite', fontSize: fs(U, 19), color: hex(color), align: 'center',
    wordWrap: { width: 96 * U }
  }).setOrigin(0.5);
  const bottom = scene.add.text(0, 36 * U, '* * *', {
    fontFamily: 'SpecialElite', fontSize: fs(U, 18), color: hex(color)
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [ring, top, name, bottom]).setAlpha(0).setAngle(14);
  register(scene, container, TRAVEL_DEPTH.ui + 1);

  return {
    container,
    slam() {
      container.setScale(2.6);
      scene.createTrackedTween({
        targets: container,
        scale: 1,
        alpha: 0.85,
        duration: 200,
        ease: 'Quad.easeIn',
        onComplete: () => {
          if (!scene.isLeaving) scene.cameras.main.shake(90, 0.003);
        }
      });
    }
  };
}

// ---------------------------------------------------------------------------
// "Your phone is ringing" notice
// ---------------------------------------------------------------------------

export function createPhoneNotice(scene, { width, U }) {
  const w = 420 * U;
  const h = 84 * U;
  const g = scene.add.graphics();
  g.fillStyle(0x0b1620, 0.92);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 10 * U);
  g.lineStyle(2 * U, 0xd4af37, 0.9);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10 * U);

  const title = scene.add.text(0, -16 * U, 'RING RING!', {
    fontFamily: 'PressStart2P', fontSize: fs(U, 12), color: '#d4af37'
  }).setOrigin(0.5);
  const body = scene.add.text(0, 14 * U, 'Headquarters has thoughts.', {
    fontFamily: 'SpecialElite', fontSize: fs(U, 22), color: '#f4e7c1'
  }).setOrigin(0.5);

  const container = scene.add.container(width - 64 * U - w / 2, 168 * U, [g, title, body]).setAlpha(0);
  register(scene, container);

  return {
    container,
    show() {
      scene.createTrackedTween({ targets: container, alpha: 1, duration: 250 });
      scene.createTrackedTween({
        targets: container,
        angle: { from: -2.5, to: 2.5 },
        duration: 70,
        yoyo: true,
        repeat: 9,
        onComplete: () => { if (container.active) container.setAngle(0); }
      });
    }
  };
}
