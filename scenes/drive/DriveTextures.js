import { poly } from './DriveShared.js';

export const DriveTextures = {
  gen(key, w, h, draw) {
    if (this.textures.exists(key)) {
      return;
    }

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    draw(g, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  },

  buildTextures() {
    const gen = (k, w, h, f) => this.gen(k, w, h, f);

    gen('drv_tree_round', 160, 260, g => {
      g.fillStyle(0x6b4a2b, 1); g.fillRect(68, 160, 24, 100);
      g.fillStyle(0x2c6e2f, 1);
      g.fillCircle(80, 110, 62); g.fillCircle(46, 140, 42); g.fillCircle(114, 140, 42);
      g.fillStyle(0x3f9a3d, 1);
      g.fillCircle(70, 95, 40); g.fillCircle(100, 120, 30);
    });

    const pine = (g, snow) => {
      g.fillStyle(0x5a3d22, 1); g.fillRect(60, 230, 20, 50);
      g.fillStyle(0x1f5a3a, 1);
      poly(g, [[70, 10], [125, 100], [15, 100]]);
      poly(g, [[70, 70], [130, 160], [10, 160]]);
      poly(g, [[70, 130], [135, 240], [5, 240]]);
      g.fillStyle(0x2a6b46, 1);
      poly(g, [[70, 10], [125, 100], [70, 100]]);
      poly(g, [[70, 70], [130, 160], [70, 160]]);
      if (snow) {
        g.fillStyle(0xffffff, 1);
        poly(g, [[70, 10], [100, 52], [40, 52]]);
        poly(g, [[70, 70], [106, 118], [34, 118]]);
        poly(g, [[70, 130], [112, 190], [28, 190]]);
      }
    };

    gen('drv_pine', 140, 280, g => pine(g, false));
    gen('drv_pine_snow', 140, 280, g => pine(g, true));

    gen('drv_cactus', 100, 200, g => {
      g.fillStyle(0x3c8a4a, 1);
      g.fillRoundedRect(38, 20, 26, 180, 12);
      g.fillRoundedRect(8, 80, 36, 16, 8); g.fillRoundedRect(8, 50, 16, 46, 8);
      g.fillRoundedRect(58, 100, 34, 16, 8); g.fillRoundedRect(76, 70, 16, 46, 8);
      g.fillStyle(0x5bb369, 1); g.fillRect(46, 30, 4, 160);
    });

    gen('drv_palm', 160, 280, g => {
      g.fillStyle(0x8a6a3a, 1);
      poly(g, [[72, 280], [90, 280], [96, 110], [80, 110]]);
      g.fillStyle(0x2f9a52, 1);
      poly(g, [[84, 100], [10, 70], [30, 104]]);
      poly(g, [[84, 100], [158, 70], [138, 104]]);
      poly(g, [[84, 100], [30, 20], [62, 84]]);
      poly(g, [[84, 100], [138, 20], [106, 84]]);
      poly(g, [[84, 100], [84, 4], [98, 84]]);
      g.fillStyle(0x5a3d22, 1); g.fillCircle(80, 106, 7); g.fillCircle(92, 108, 7);
    });

    gen('drv_bush', 120, 70, g => {
      g.fillStyle(0x2f7d32, 1);
      g.fillCircle(30, 45, 26); g.fillCircle(60, 38, 32); g.fillCircle(90, 46, 26);
      g.fillStyle(0x44a043, 1); g.fillCircle(55, 30, 16);
    });

    gen('drv_rock', 110, 70, g => {
      g.fillStyle(0x7d7f86, 1);
      poly(g, [[5, 70], [20, 25], [50, 8], [85, 20], [105, 70]]);
      g.fillStyle(0x9a9ca3, 1);
      poly(g, [[20, 25], [50, 8], [60, 30], [35, 42]]);
    });

    gen('drv_lamp', 60, 260, g => {
      g.fillStyle(0x2a2a30, 1);
      g.fillRect(27, 40, 6, 220); g.fillRect(27, 36, 26, 5);
      g.fillRoundedRect(42, 30, 16, 10, 3);
      g.fillStyle(0xffd27a, 0.35); g.fillCircle(50, 44, 22);
      g.fillStyle(0xfff0b0, 0.95); g.fillCircle(50, 40, 5);
    });

    gen('drv_house', 220, 200, g => {
      g.fillStyle(0xb9a27d, 1); g.fillRect(10, 70, 200, 130);
      g.fillStyle(0x8a3b2e, 1); poly(g, [[0, 75], [110, 5], [220, 75]]);
      g.fillStyle(0x5a3d22, 1); g.fillRect(95, 130, 32, 70);
      g.fillStyle(0xffe08a, 1); g.fillRect(30, 100, 40, 40); g.fillRect(150, 100, 40, 40);
      g.lineStyle(3, 0x3b2d20, 1); g.strokeRect(30, 100, 40, 40); g.strokeRect(150, 100, 40, 40);
    });

    gen('drv_pothole', 200, 50, g => {
      g.fillStyle(0x1c1c20, 1); g.fillEllipse(100, 28, 190, 40);
      g.fillStyle(0x0b0b0d, 1); g.fillEllipse(100, 28, 150, 28);
    });

    gen('drv_cone', 70, 90, g => {
      g.fillStyle(0x333338, 1); g.fillRect(5, 80, 60, 10);
      g.fillStyle(0xff7a1a, 1); poly(g, [[35, 5], [60, 82], [10, 82]]);
      g.fillStyle(0xffffff, 1); poly(g, [[28, 36], [42, 36], [46, 54], [24, 54]]);
    });

    gen('drv_cow', 220, 150, g => {
      g.fillStyle(0xe8e8e2, 1);
      g.fillRect(45, 100, 12, 45); g.fillRect(78, 100, 12, 45);
      g.fillRect(122, 100, 12, 45); g.fillRect(150, 100, 12, 45);
      g.fillStyle(0xf4f4f0, 1); g.fillRoundedRect(30, 35, 140, 70, 18);
      g.fillStyle(0x222222, 1);
      g.fillEllipse(70, 60, 34, 26); g.fillEllipse(125, 75, 30, 22); g.fillEllipse(100, 45, 20, 14);
      g.fillStyle(0xf4f4f0, 1); g.fillRoundedRect(158, 40, 50, 44, 10);
      g.fillStyle(0xf2a7b0, 1); g.fillRoundedRect(190, 66, 18, 16, 5);
      g.fillStyle(0xd9c9a0, 1); g.fillRect(162, 30, 6, 12); g.fillRect(196, 30, 6, 12);
      g.fillStyle(0x000000, 1); g.fillCircle(185, 54, 3.5);
      g.lineStyle(4, 0x333333, 1); g.lineBetween(30, 50, 14, 90);
    });

    gen('drv_chicken', 90, 100, g => {
      g.lineStyle(4, 0xf4a300, 1);
      g.lineBetween(36, 82, 34, 100); g.lineBetween(50, 82, 52, 100);
      g.fillStyle(0xfafafa, 1);
      g.fillEllipse(42, 60, 56, 48); g.fillCircle(66, 34, 14);
      poly(g, [[14, 52], [0, 32], [22, 46]]);
      g.fillStyle(0xd62828, 1); g.fillCircle(66, 19, 6);
      g.fillStyle(0xf4a300, 1); poly(g, [[78, 32], [92, 37], [78, 41]]);
      g.fillStyle(0x000000, 1); g.fillCircle(70, 31, 2.5);
    });

    gen('drv_tumble', 120, 110, g => {
      g.fillStyle(0x9a6b35, 0.55); g.fillCircle(60, 58, 46);
      g.lineStyle(3, 0x6e4a22, 1);
      g.strokeCircle(60, 58, 46); g.strokeCircle(60, 58, 30);
      g.lineBetween(20, 30, 100, 86); g.lineBetween(24, 88, 98, 28); g.lineBetween(60, 12, 60, 104);
    });

    gen('drv_crab', 160, 90, g => {
      g.lineStyle(5, 0xb52720, 1);
      g.lineBetween(40, 60, 14, 80); g.lineBetween(120, 60, 146, 80);
      g.lineBetween(50, 68, 30, 88); g.lineBetween(110, 68, 130, 88);
      g.lineBetween(46, 44, 24, 30); g.lineBetween(114, 44, 136, 30);
      g.fillStyle(0xd7322b, 1);
      g.fillEllipse(80, 54, 90, 54);
      g.fillCircle(22, 26, 17); g.fillCircle(138, 26, 17);
      g.fillStyle(0x1b1b1b, 1); g.fillTriangle(22, 26, 12, 8, 32, 10);
      g.fillStyle(0xffffff, 1); g.fillCircle(68, 30, 7); g.fillCircle(92, 30, 7);
      g.fillStyle(0x000000, 1); g.fillCircle(68, 31, 3); g.fillCircle(92, 31, 3);
    });

    gen('drv_coffee', 70, 80, g => {
      g.fillStyle(0xffd24a, 0.35); g.fillCircle(35, 45, 32);
      g.fillStyle(0xffffff, 1); poly(g, [[12, 30], [58, 30], [52, 74], [18, 74]]);
      g.fillStyle(0x5a3412, 1); g.fillEllipse(35, 30, 46, 10);
      g.lineStyle(5, 0xffffff, 1); g.strokeCircle(60, 50, 9);
      g.lineStyle(3, 0xffffff, 0.85);
      g.lineBetween(26, 22, 22, 8); g.lineBetween(38, 22, 42, 6);
    });

    gen('drv_coin', 70, 70, g => {
      g.fillStyle(0xf2b705, 1); g.fillCircle(35, 35, 28);
      g.fillStyle(0xffd84d, 1); g.fillCircle(35, 35, 22);
      g.lineStyle(5, 0xb07d00, 1);
      g.lineBetween(35, 18, 35, 52); g.strokeCircle(35, 35, 9);
    });

    gen('drv_cam', 90, 200, g => {
      g.fillStyle(0x55585f, 1); g.fillRect(40, 60, 10, 140);
      g.fillStyle(0x3b3f47, 1); g.fillRoundedRect(10, 10, 70, 60, 6);
      g.fillStyle(0x111111, 1); g.fillCircle(45, 40, 14);
      g.fillStyle(0x4aa3ff, 1); g.fillCircle(45, 40, 7);
      g.fillStyle(0xff3b3b, 1); g.fillCircle(70, 18, 4);
    });

    gen('drv_drop', 12, 16, g => {
      g.fillStyle(0xcfe6ff, 0.55); g.fillEllipse(6, 9, 9, 13);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(4, 6, 2);
    });

    gen('drv_cloud', 240, 90, g => {
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(60, 55, 32); g.fillCircle(105, 40, 40); g.fillCircle(150, 52, 34);
      g.fillRect(60, 55, 95, 32);
    });

    gen('drv_light', 512, 256, g => {
      for (let i = 0; i < 14; i++) {
        g.fillStyle(0xfff3c4, 0.05);
        g.fillEllipse(256, 256, 512 - i * 30, 512 - i * 34);
      }
    });

    gen('drv_dino', 120, 130, g => {
      g.fillStyle(0xf2a93b, 1);
      poly(g, [[40, 56], [32, 40], [50, 50]]);
      poly(g, [[52, 46], [48, 30], [64, 42]]);
      g.fillStyle(0x7ed957, 1);
      poly(g, [[26, 90], [0, 108], [30, 106]]);
      g.fillEllipse(55, 86, 70, 62);
      g.fillStyle(0xc7f0a0, 1); g.fillEllipse(60, 94, 40, 40);
      g.fillStyle(0x5fb83f, 1); g.fillRect(36, 110, 16, 18); g.fillRect(62, 110, 16, 18);
      g.fillStyle(0x7ed957, 1);
      g.fillCircle(76, 44, 26); g.fillRoundedRect(80, 40, 34, 26, 9);
      g.fillStyle(0xffffff, 1); g.fillCircle(78, 34, 9);
      g.fillStyle(0x000000, 1); g.fillCircle(81, 34, 4);
      g.fillStyle(0x3d7a26, 1); g.fillCircle(104, 46, 2.5);
      g.lineStyle(3, 0x3d7a26, 1); g.lineBetween(90, 62, 108, 60);
      g.fillStyle(0x7ed957, 1); g.fillRoundedRect(74, 80, 22, 8, 4);
    });

    gen('drv_die', 84, 84, g => {
      g.fillStyle(0xb3122a, 1); g.fillRoundedRect(2, 2, 80, 80, 16);
      g.lineStyle(4, 0xd83a52, 0.9); g.strokeRoundedRect(2, 2, 80, 80, 16);
      g.fillStyle(0x1a0a0a, 1);
      [[22, 22], [62, 22], [42, 42], [22, 62], [62, 62]].forEach(([x, y]) => g.fillCircle(x, y, 7));
    });

    this.buildWheelTexture();
    this.buildHillTextures();
  },

  buildWheelTexture() {
    const R = Math.round(this.H * 0.27);
    this.wheelR = R;

    this.gen(`drv_wheel_${R}`, R * 2, R * 2, g => {
      g.lineStyle(R * 0.17, 0x151518, 1); g.strokeCircle(R, R, R * 0.86);
      g.lineStyle(3, 0x30323a, 1); g.strokeCircle(R, R, R * 0.945);
      g.lineStyle(3, 0x30323a, 1); g.strokeCircle(R, R, R * 0.775);

      g.lineStyle(R * 0.1, 0x1a1a1f, 1);
      g.lineBetween(R, R, R * 0.2, R * 1.04);
      g.lineBetween(R, R, R * 1.8, R * 1.04);
      g.lineBetween(R, R, R, R * 1.8);

      g.fillStyle(0x1c1c21, 1); g.fillCircle(R, R, R * 0.27);
      g.lineStyle(4, 0x6b6b75, 1); g.strokeCircle(R, R, R * 0.19);
      g.fillStyle(0x8a8a95, 1); g.fillEllipse(R, R, R * 0.2, R * 0.14);

      g.fillStyle(0xd4af37, 1); g.fillRect(R - 4, R * 0.04, 8, R * 0.2);
    });
  },

  buildHillTextures() {
    const B = this.biome;
    const hH = Math.round(this.H * 0.16);
    this.hillH = hH;

    const make = (key, color, amp, k1, k2, base) => {
      this.gen(key, 1024, hH, g => {
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(0, hH);

        for (let x = 0; x <= 1024; x += 16) {
          const y =
            hH - base -
            (Math.sin((x / 1024) * Math.PI * 2 * k1) * 0.55 +
              Math.sin((x / 1024) * Math.PI * 2 * k2 + 1.3) * 0.45) * amp * B.hillAmp;
          g.lineTo(x, y);
        }

        g.lineTo(1024, hH);
        g.closePath();
        g.fillPath();
      });
    };

    this.hillKeyFar = `drv_hills_${B.id}_far_${hH}`;
    this.hillKeyNear = `drv_hills_${B.id}_near_${hH}`;

    make(this.hillKeyFar, B.hillFar, hH * 0.42, 3, 7, hH * 0.5);
    make(this.hillKeyNear, B.hill, hH * 0.34, 5, 11, hH * 0.22);
  }
};
