import { OfficeRoomEffectLayer } from './OfficeRoomEffectLayer.js';

let nextReelId = 0;
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
const REELS = [
  { x: 1768, y: 322, width: 86, height: 96, speed: 0.65 },
  { x: 1858, y: 317, width: 86, height: 96, speed: 0.59 }
];

export class OfficeStorageAnimations extends OfficeRoomEffectLayer {
  constructor(scene) {
    super(scene, 'storage', 'backgroundhi');
    this.reels = [];
    this.lastReelFrame = -1;
    this.window = this.graphics(PANES);
    this.dust = this.graphics();
    this.recorder = this.graphics();
    this.createReels();
    this.start();
  }

  createReels() {
    const bg = this.background();
    if (!bg?.texture) return;
    const source = bg.texture.getSourceImage();
    const sourceWidth = source.naturalWidth || source.width;
    const sourceHeight = source.naturalHeight || source.height;
    if (!sourceWidth || !sourceHeight) return;
    // Take the visible reel artwork from the already loaded background. No external files.
    for (const placement of REELS) {
      let texture = null;
      let image = null;
      try {
        const stamp = document.createElement('canvas');
        stamp.width = 128; stamp.height = 128;
        const ctx = stamp.getContext('2d');
        if (!ctx) continue;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(source,
          (placement.x - placement.width / 2) * sourceWidth / 1920,
          (placement.y - placement.height / 2) * sourceHeight / 1080,
          placement.width * sourceWidth / 1920,
          placement.height * sourceHeight / 1080,
          0, 0, 128, 128);
        const key = `office-spinning-reel-${++nextReelId}`;
        texture = this.scene.textures.createCanvas(key, 128, 128);
        if (!texture) continue;
        image = this.scene.add.image(0, 0, key).setOrigin(0.5).setVisible(false);
        this.objects.push(image);
        this.reels.push({ ...placement, stamp, texture, key, image });
      } catch (error) {
        image?.destroy();
        if (image) this.objects = this.objects.filter(item => item !== image);
        if (texture) this.scene.textures.remove(texture.key);
        console.warn('[OfficeStorageAnimations] Reel extraction skipped:', error);
      }
    }
  }

  layout() {
    super.layout();
    const bg = this.background();
    if (this.disposed || !bg?.active) return;
    const sx = bg.displayWidth / 1920, sy = bg.displayHeight / 1080;
    for (const reel of this.reels ?? []) {
      reel.image.setPosition(bg.x + reel.x * sx, bg.y + reel.y * sy)
        .setDisplaySize(reel.width * sx, reel.height * sy);
    }
  }

  drawReels(t) {
    const frame = Math.floor(this.elapsed / (1000 / 12));
    if (frame === this.lastReelFrame) return;
    this.lastReelFrame = frame;
    for (const reel of this.reels) {
      const ctx = reel.texture.getContext();
      ctx.clearRect(0, 0, 128, 128);
      ctx.save();
      ctx.beginPath(); ctx.arc(64, 64, 63, 0, Math.PI * 2); ctx.clip();
      ctx.translate(64, 64);
      ctx.rotate(t * reel.speed);
      ctx.drawImage(reel.stamp, -64, -64, 128, 128);
      ctx.restore();
      reel.texture.refresh();
    }
  }

  draw() {
    const t = this.elapsed / 1000;
    this.drawReels(t);
    const w = this.window;
    w.clear();
    const x = 1240 + ((t * 17) % 980);
    for (let i = 0; i < 5; i++) {
      w.fillStyle(0x485765, 0.033);
      w.fillEllipse(x + i * 12, 155, 175 + i * 22, 370);
    }
    const d = this.dust;
    d.clear();
    for (let i = 0; i < 38; i++) {
      const p = ((i * 0.381966) + t * (0.022 + (i % 5) * 0.004)) % 1;
      const px = (i * 0.618034) % 1;
      const nearLamp = i < 9;
      const x = nearLamp ? 28 + px * 125 + Math.sin(t * 0.4 + i) * 8
        : 1180 + px * 470 - p * 110 + Math.sin(t * 0.32 + i) * 12;
      const y = nearLamp ? 505 + p * 135 : 290 + p * 220;
      d.fillStyle(0xf0e3bf, Math.sin(p * Math.PI) * 0.40);
      d.fillCircle(x, y, 1.2 + (i % 3) * 0.25);
    }
    const g = this.recorder;
    g.clear();
    const pulse = (Math.sin(t * 2.2) + 1) / 2;
    g.fillStyle(0x98c783, 0.12 + pulse * 0.12);
    g.fillCircle(1748, 425, 7);
    g.fillStyle(0xb9e499, 0.7 + pulse * 0.3);
    g.fillCircle(1748, 425, 2.5);
    for (let row = 0; row < 2; row++) {
      const level = 2 + Math.floor((Math.sin(t * 3.1 + row * 1.3) + Math.sin(t * 1.4 + row) + 2) * 1.5);
      for (let i = 0; i < 8; i++) {
        g.fillStyle(i < 6 ? 0x9ebd79 : 0xd4b274, i < level ? 0.85 : 0.09);
        g.fillRect(1770 + i * 4.5, 422 + row * 5, 3, 2);
      }
    }
  }

  destroy() {
    if (this.disposed) return;
    const keys = this.reels.map(reel => reel.key);
    super.destroy();
    for (const key of keys) this.scene.textures.remove(key);
    this.reels = [];
  }
}
