import { OfficeRoomEffectLayer } from './OfficeRoomEffectLayer.js';

export class OfficeCabinetAnimations extends OfficeRoomEffectLayer {
  constructor(scene) {
    super(scene, 'cabinet', 'backgroundset');
    this.screen = this.graphics([[615, 486, 731, 483, 731, 590, 615, 600]]);
    this.window = this.graphics([[274, 10, 550, 72, 550, 197, 274, 157]]);
    this.dust = this.graphics();
    this.glints = this.graphics();
    this.lamp = this.graphics();
    this.start();
  }

  draw() {
    const t = this.elapsed / 1000;
    const g = this.screen;
    g.clear();
    g.fillStyle(0x8bd9ae, 0.07 + (Math.sin(t * 1.1) + 1) * 0.035);
    g.fillRect(610, 480, 128, 126);
    // A moving selection band, without replacing the painted portraits and text.
    const row = Math.floor(t / 2.8) % 2;
    const y = row === 0 ? 513 : 553;
    const breathe = 0.20 + (Math.sin(t * 2) + 1) * 0.04;
    g.fillStyle(0xa1dfb4, breathe);
    g.fillRect(619, y, 108, 34);
    g.lineStyle(1, 0xc7f0ce, 0.64);
    g.strokeRect(619, y, 108, 34);
    const scan = 488 + ((t * 36) % 113);
    g.fillStyle(0xbceacb, 0.32);
    g.fillRect(610, scan, 128, 4);
    g.fillStyle(0x041910, 0.10);
    for (let yy = 485; yy < 605; yy += 4) g.fillRect(610, yy, 128, 1);
    if (Math.floor(t * 1.6) % 2 === 0) {
      g.fillStyle(0xbceacb, 0.85);
      g.fillRect(716, 589, 7, 3);
    }

    const w = this.window;
    w.clear();
    const cloudX = 260 + ((t * 16) % 420);
    for (let i = 0; i < 5; i++) {
      w.fillStyle(0x344b5a, 0.035);
      w.fillEllipse(cloudX + i * 9, 99, 130 + i * 15, 185 + i * 10);
    }
    // First bird starts after one second, then one flight every eighteen seconds.
    const flight = t % 18;
    if (flight > 1 && flight < 6) {
      const p = (flight - 1) / 5;
      const x = 255 + p * 325;
      const y = 82 - Math.sin(p * Math.PI) * 16;
      const wing = Math.sin(t * 8) * 5;
      w.lineStyle(2, 0x35454b, 0.72);
      w.beginPath(); w.moveTo(x - 9, y - wing); w.lineTo(x, y);
      w.lineTo(x + 9, y - wing); w.strokePath();
    }

    const d = this.dust;
    d.clear();
    for (let i = 0; i < 32; i++) {
      const p = ((i * 0.381966) + t * (0.023 + (i % 4) * 0.005)) % 1;
      const x = 752 + (((i * 0.618034) % 1) - 0.5) * (70 + p * 100)
        + Math.sin(t * 0.5 + i * 1.7) * 8;
      d.fillStyle(0xf0dfb9, Math.sin(p * Math.PI) * 0.42);
      d.fillCircle(x, 370 + p * 245, 1.2 + (i % 3) * 0.25);
    }
    const l = this.lamp;
    l.clear();
    l.fillStyle(0xffdc91, 0.04 + (Math.sin(t * 0.8) + 1) * 0.025);
    l.fillEllipse(756, 337, 72, 35);

    const s = this.glints;
    s.clear();
    const cycle = this.elapsed % 4200;
    if (cycle < 1800) {
      const points = [{ x: 953, y: 250 }, { x: 1393, y: 553 }, { x: 1535, y: 593 }];
      const point = points[Math.floor(this.elapsed / 4200) % points.length];
      const alpha = Math.sin((cycle / 1800) * Math.PI);
      const r = 4 + alpha * 7;
      s.fillStyle(0xffe9ae, alpha * 0.20);
      s.fillCircle(point.x, point.y, r + 3);
      s.lineStyle(1.5, 0xffedc5, alpha * 0.9);
      s.lineBetween(point.x - r, point.y, point.x + r, point.y);
      s.lineBetween(point.x, point.y - r, point.x, point.y + r);
    }
  }
}
