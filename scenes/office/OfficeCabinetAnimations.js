import { OfficeRoomEffectLayer } from './OfficeRoomEffectLayer.js';

export class OfficeCabinetAnimations extends OfficeRoomEffectLayer {
  constructor(scene) {
    super(scene, 'cabinet', 'backgroundset');
    this.screen = this.graphics([[615, 486, 731, 483, 731, 590, 615, 600]]);
    this.window = this.graphics([[274, 10, 550, 72, 550, 197, 274, 157]]);
    this.dust = this.graphics();
    this.glints = this.graphics();
    this.start();
  }

  draw() {
    const t = this.elapsed / 1000;
    const g = this.screen;
    g.clear();
    g.fillStyle(0x8bd9ae, 0.045 + (Math.sin(t * 1.1) + 1) * 0.025);
    g.fillRect(610, 480, 128, 126);
    g.fillStyle(0x051a15, 0.08);
    for (let y = 485; y < 605; y += 4) g.fillRect(610, y, 128, 1);
    // Visible within the first second, without erasing the wanted portraits.
    const scan = 490 + ((t * 24) % 110);
    g.fillStyle(0xbceacb, 0.24);
    g.fillRect(610, scan, 128, 4);
    g.fillStyle(0xa6d8ba, 0.06);
    g.fillRect(610, scan - 5, 128, 14);

    const w = this.window;
    w.clear();
    const x = 280 + ((t * 11) % 400);
    for (let i = 0; i < 5; i++) {
      w.fillStyle(0x344b5a, 0.022);
      w.fillEllipse(x + i * 9, 99, 130 + i * 15, 185 + i * 10);
    }

    const d = this.dust;
    d.clear();
    for (let i = 0; i < 20; i++) {
      const progress = ((i * 0.381966) + t * (0.016 + (i % 4) * 0.004)) % 1;
      const x = 752 + (((i * 0.618034) % 1) - 0.5) * (70 + progress * 100)
        + Math.sin(t * 0.3 + i * 1.7) * 5;
      d.fillStyle(0xead9b7, Math.sin(progress * Math.PI) * 0.34);
      d.fillCircle(x, 370 + progress * 245, 1 + (i % 3) * 0.2);
    }

    const s = this.glints;
    s.clear();
    const cycle = this.elapsed % 8000;
    if (cycle >= 900 && cycle <= 2200) {
      const points = [{ x: 953, y: 250 }, { x: 1393, y: 553 }, { x: 1535, y: 593 }];
      const point = points[Math.floor(this.elapsed / 8000) % points.length];
      const alpha = Math.sin(((cycle - 900) / 1300) * Math.PI);
      const r = 3 + alpha * 4;
      s.fillStyle(0xffe9ae, alpha * 0.13);
      s.fillCircle(point.x, point.y, r + 2);
      s.lineStyle(1.3, 0xffedc5, alpha * 0.72);
      s.lineBetween(point.x - r, point.y, point.x + r, point.y);
      s.lineBetween(point.x, point.y - r, point.x, point.y + r);
    }
  }
}
