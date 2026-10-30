import { OfficeRoomEffectLayer } from './OfficeRoomEffectLayer.js';
const PANES = [
  [1226, 173, 1267, 162, 1267, 281, 1226, 286],
  [1287, 159, 1336, 146, 1336, 275, 1287, 281],
  [1355, 141, 1381, 134, 1381, 267, 1355, 272],
  [1447, 117, 1509, 101, 1509, 256, 1447, 265],
  [1531, 96, 1593, 80, 1593, 245, 1531, 253],
  [1614, 75, 1660, 63, 1660, 232, 1614, 242],
  [1752, 44, 1836, 23, 1836, 213, 1752, 225],
  [1856, 19, 1919, 2, 1919, 199, 1856, 208]
];
export class OfficeStorageAnimations extends OfficeRoomEffectLayer {
  constructor(scene) {
    super(scene, 'storage', 'backgroundhi');
    this.window = this.graphics(PANES);
    this.dust = this.graphics();
    this.recorder = this.graphics();
    this.start();
  }

  draw() {
    const t = this.elapsed / 1000;
    const w = this.window;
    w.clear();
    const x = 1240 + ((t * 10) % 980);
    for (let i = 0; i < 5; i++) {
      w.fillStyle(0x485765, 0.021);
      w.fillEllipse(x + i * 12, 155, 175 + i * 22, 370);
    }
    const d = this.dust;
    d.clear();
    for (let i = 0; i < 28; i++) {
      const progress = ((i * 0.381966) + t * (0.014 + (i % 5) * 0.003)) % 1;
      const px = (i * 0.618034) % 1;
      const nearLamp = i < 7;
      const x = nearLamp ? 28 + px * 125 + Math.sin(t * 0.3 + i) * 6
        : 1180 + px * 470 - progress * 110 + Math.sin(t * 0.22 + i) * 8;
      const y = nearLamp ? 505 + progress * 135 : 290 + progress * 220;
      d.fillStyle(0xf0e3bf, Math.sin(progress * Math.PI) * 0.29);
      d.fillCircle(x, y, 1 + (i % 3) * 0.2);
    }
    const g = this.recorder;
    g.clear();
    const pulse = (Math.sin(t * 2.2) + 1) / 2;
    g.fillStyle(0x98c783, 0.08 + pulse * 0.08);
    g.fillCircle(1748, 425, 6);
    g.fillStyle(0xb9e499, 0.6 + pulse * 0.3);
    g.fillCircle(1748, 425, 2);
    for (let row = 0; row < 2; row++) {
      const level = 2 + Math.floor((Math.sin(t * 1.9 + row * 1.3) + Math.sin(t * 0.8 + row) + 2) * 1.5);
      for (let i = 0; i < 8; i++) {
        g.fillStyle(i < 6 ? 0x9ebd79 : 0xd4b274, i < level ? 0.65 : 0.06);
        g.fillRect(1770 + i * 4.5, 422 + row * 5, 3, 2);
      }
    }
  }
}
