// scenes/homeCity/HomeCityRenderer.js
// Procedural art only. Navigation and scene transitions stay in HomeCityScene.

const PALETTES = {
  'pi-office': { wall: 0xc4ab83, shade: 0x9a7d5b, roof: 0x57483e, trim: 0xe3cfaa, glass: 0x35494c, accent: 0xd7b16b, height: 142 },
  'spy-shop': { wall: 0x78918a, shade: 0x4e6b66, roof: 0x343e3b, trim: 0xb8bfa4, glass: 0x233b3b, accent: 0xddd28e, height: 114 },
  tavern: { wall: 0xb58162, shade: 0x86563f, roof: 0x6c4235, trim: 0xe1bc87, glass: 0x78623d, accent: 0xe7b85c, height: 132 },
  'police-station': { wall: 0x93a1a1, shade: 0x65757c, roof: 0x3d4d56, trim: 0xd1d1b8, glass: 0x344c58, accent: 0xc3a45b, height: 156 },
  'your-home': { wall: 0xc2b491, shade: 0x95896d, roof: 0x666d51, trim: 0xebe0bd, glass: 0x486064, accent: 0x839b72, height: 120 }
};

export class HomeCityRenderer {
  constructor(scene) {
    this.scene = scene;
    this.buildingArt = new Map();
    this.routeGraphics = null;
  }

  poly(g, points, color, line = null, width = 1) {
    g.fillStyle(color, 1).fillPoints(points, true);
    if (line !== null) g.lineStyle(width, line, 1).strokePoints(points, true);
  }

  point(x, y, z = 0) {
    const p = this.scene.project(x, y);
    return { x: p.x, y: p.y - z };
  }

  quad(g, x1, y1, x2, y2, color, z = 0) {
    this.poly(g, [
      this.point(x1, y1, z), this.point(x2, y1, z),
      this.point(x2, y2, z), this.point(x1, y2, z)
    ], color);
  }

  noise(x, y, seed = 0) {
    return ((x * 173 + y * 317 + seed * 7919) % 997) / 997;
  }

  isRoad(x, y) {
    return (x >= 9 && x <= 11) || (y >= 8 && y <= 11) ||
      (y >= 18 && y <= 19) || (x >= 1 && x <= 2);
  }

  isSidewalk(x, y) {
    return [0, 3, 8, 12].includes(x) || [7, 12, 17, 20].includes(y);
  }

  drawGround() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(-1000);
    const paths = new Set();
    for (const b of s.buildings) {
      for (let y = b.door.y; y < s.rows && !this.isRoad(b.door.x, y); y++) {
        paths.add(s.cellKey(b.door.x, y));
      }
    }

    for (let y = 0; y < s.rows; y++) {
      for (let x = 0; x < s.cols; x++) {
        const road = this.isRoad(x, y);
        const plaza = x >= 13 && x <= 17 && y >= 8 && y <= 11;
        const paving = !road && (this.isSidewalk(x, y) || paths.has(s.cellKey(x, y)));
        const shade = this.noise(x, y);
        const color = plaza ? 0xa89b80 : road ? 0x555953
          : paving ? 0xa39880 : shade > 0.5 ? 0x70795b : 0x747d5e;
        s.polygon(g, s.diamond(x, y), color, color);

        if (paving || plaza) {
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              const x1 = x - 0.48 + col / 3;
              const y1 = y - 0.48 + row / 3;
              const v = this.noise(x * 3 + col, y * 3 + row, 1);
              this.quad(g, x1, y1, x1 + 0.30, y1 + 0.30,
                v > 0.65 ? 0xb8ad93 : v > 0.3 ? 0xaca187 : 0x9b917a);
            }
          }
        } else if (road) {
          for (let n = 0; n < 4; n++) {
            const p = this.point(x - 0.4 + this.noise(x, y, n + 2) * 0.8,
              y - 0.4 + this.noise(y, x, n + 8) * 0.8);
            g.fillStyle(0x77796b, 0.32).fillRect(p.x, p.y, 5, 2);
          }
        } else {
          const p = this.point(x + 0.1, y);
          g.lineStyle(1, 0x586647, 0.5);
          g.lineBetween(p.x - 4, p.y, p.x - 6, p.y - 4);
          g.lineBetween(p.x, p.y + 1, p.x + 1, p.y - 4);
        }
      }
    }

    // Thin curb strips visually separate the central avenue from the sidewalk.
    this.quad(g, 8.48, -0.5, 8.57, 7.45, 0xc0b399);
    this.quad(g, 8.48, 11.55, 8.57, 17.45, 0xc0b399);
    this.quad(g, 11.45, -0.5, 11.54, 7.45, 0xc0b399);
    this.quad(g, 11.45, 11.55, 11.54, 17.45, 0xc0b399);
    for (let x = 4; x <= 23; x += 2) {
      if (x >= 8 && x <= 12) continue;
      this.quad(g, x - 0.3, 9.45, x + 0.3, 9.49, 0xb2a98c);
    }
    // Zebra crossing near the central junction.
    for (let x = 9; x <= 11; x += 0.38) {
      this.quad(g, x - 0.10, 7.7, x + 0.10, 8.4, 0xc3bea5);
    }
    this.groundText(15, 9, 'OLD QUARTER', 19, '#6b6557');
    this.routeGraphics = s.add.graphics().setDepth(-350);
  }

  groundText(x, y, text, size, color) {
    const p = this.point(x, y);
    return this.scene.add.text(p.x, p.y, text, {
      fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`, color
    }).setOrigin(0.5).setDepth(-800);
  }

  face(g, axis, fixed, u1, u2, low, high, color) {
    const p = (u, z) => axis === 'x'
      ? this.point(u, fixed, z) : this.point(fixed, u, z);
    this.poly(g, [p(u1, low), p(u2, low), p(u2, high), p(u1, high)], color);
  }

  window(g, axis, fixed, u, low, width, height, palette, lit = false) {
    this.face(g, axis, fixed, u - width / 2 - 0.035, u + width / 2 + 0.035,
      low - 4, low + height + 4, palette.trim);
    this.face(g, axis, fixed, u - width / 2, u + width / 2,
      low, low + height, lit ? 0xc5a66b : palette.glass);
    this.face(g, axis, fixed, u - 0.017, u + 0.017,
      low, low + height, palette.trim);
    this.face(g, axis, fixed, u - width / 2, u + width / 2,
      low + height * 0.48, low + height * 0.48 + 3, palette.trim);
    this.face(g, axis, fixed, u - width / 2 - 0.06, u + width / 2 + 0.06,
      low - 6, low - 2, palette.trim);
  }

  drawBuildings() {
    const s = this.scene;
    for (const b of s.buildings) {
      const p = PALETTES[b.id];
      const right = b.x + b.w - 1;
      const front = b.y + b.h - 1;
      const fx = right + 0.5;
      const fy = front + 0.5;
      const shadow = s.add.graphics().setDepth(-700);
      this.quad(shadow, b.x - 0.3, b.y - 0.2, right + 1.1, front + 1.0, 0x4a5144);

      for (let y = b.y; y <= front; y++) {
        for (let x = b.x; x <= right; x++) {
          const g = s.add.graphics().setDepth((x + y) * 100);
          const roof = s.diamond(x, y, p.height);
          const base = s.diamond(x, y);
          if (x === right) {
            this.poly(g, [roof[1], roof[2], base[2], base[1]], p.shade);
            this.face(g, 'y', fx, y - 0.5, y + 0.5, 0, 15, 0x666459);
            this.face(g, 'y', fx, y - 0.5, y + 0.5, p.height - 13, p.height - 5, p.trim);
            this.window(g, 'y', fx, y, 45, 0.52, 40, p, b.id === 'tavern');
            if (p.height > 140) this.window(g, 'y', fx, y, 103, 0.44, 25, p);
          }
          if (y === front) {
            this.poly(g, [roof[2], roof[3], base[3], base[2]], p.wall);
            this.face(g, 'x', fy, x - 0.5, x + 0.5, 0, 15, 0x7d7563);
            this.face(g, 'x', fy, x - 0.5, x + 0.5, p.height - 13, p.height - 5, p.trim);
            if (x === b.door.x) {
              this.face(g, 'x', fy, x - 0.25, x + 0.25, 0, 77, p.trim);
              this.face(g, 'x', fy, x - 0.19, x + 0.19, 0, 72, 0x3d3931);
              this.face(g, 'x', fy, x - 0.13, x + 0.13, 33, 65, p.glass);
              this.face(g, 'x', fy, x + 0.10, x + 0.15, 26, 30, p.accent);
              this.face(g, 'x', fy, x - 0.45, x + 0.45, 79, 90, p.accent);
            } else {
              const shop = ['spy-shop', 'tavern'].includes(b.id);
              this.window(g, 'x', fy, x, shop ? 23 : 42,
                shop ? 0.77 : 0.55, shop ? 48 : 39, p, b.id === 'tavern');
              if (b.id === 'tavern') {
                this.face(g, 'x', fy, x - 0.46, x + 0.46, 77, 88, 0x6f3c2e);
              }
              if (b.id === 'spy-shop') {
                this.face(g, 'x', fy, x - 0.46, x + 0.46, 77, 88, 0x355a53);
              }
            }
            if (p.height > 140) this.window(g, 'x', fy, x, 103, 0.44, 25, p);
          }
          this.poly(g, roof, p.roof);
          // Coping outlines only the outside edges, not every roof tile.
          g.lineStyle(3, p.trim, 0.75);
          if (x === b.x) g.lineBetween(roof[0].x, roof[0].y, roof[3].x, roof[3].y);
          if (y === b.y) g.lineBetween(roof[0].x, roof[0].y, roof[1].x, roof[1].y);
          if (x === right) g.lineBetween(roof[1].x, roof[1].y, roof[2].x, roof[2].y);
          if (y === front) g.lineBetween(roof[3].x, roof[3].y, roof[2].x, roof[2].y);
          const hit = new Phaser.Geom.Polygon([
            roof[0], roof[1], base[1], base[2], base[3], roof[3]
          ]);
          g.setInteractive(hit, Phaser.Geom.Polygon.Contains);
          g.setData('buildingId', b.id);
          g.input.cursor = 'pointer';
        }
      }
      const center = this.point(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2, p.height + 24);
      const label = s.add.text(center.x, center.y, b.name, {
        fontFamily: 'SpecialElite, monospace', fontSize: '24px',
        color: '#f3e3bf', backgroundColor: '#303630', padding: { x: 12, y: 7 }
      }).setOrigin(0.5).setDepth(10000)
        .setInteractive({ useHandCursor: true }).setData('buildingId', b.id);
      const door = this.point(b.door.x, b.door.y);
      const marker = s.add.ellipse(door.x, door.y, 34, 15, 0xe1c383, 0.55)
        .setDepth(-400);
      const step = s.add.graphics().setDepth(-450);
      this.quad(step, b.door.x - 0.32, fy + 0.02, b.door.x + 0.32, fy + 0.28, 0xc3b18d);
      this.buildingArt.set(b.id, { label, marker });
    }
  }

  drawProps() {
    const s = this.scene;
    for (const prop of s.props) {
      const p = this.point(prop.x, prop.y);
      const g = s.add.graphics().setDepth((prop.x + prop.y) * 100 + 1);
      g.fillStyle(0x293329, 0.25).fillEllipse(p.x + 12, p.y + 4, 50, 16);
      if (prop.kind === 'lamp') {
        g.fillStyle(0x343d37).fillRect(p.x - 4, p.y - 91, 8, 91);
        g.fillStyle(0x3d453b).fillRect(p.x - 11, p.y - 9, 22, 10);
        g.fillStyle(0xe8ce8c, 0.15).fillCircle(p.x, p.y - 92, 25);
        g.fillStyle(0xe4cd94).fillRect(p.x - 11, p.y - 106, 22, 24);
        g.lineStyle(3, 0x343d37).strokeRect(p.x - 12, p.y - 107, 24, 26);
        this.poly(g, [
          { x: p.x - 18, y: p.y - 108 }, { x: p.x, y: p.y - 120 },
          { x: p.x + 18, y: p.y - 108 }
        ], 0x343d37);
      } else if (prop.kind === 'bench') {
        g.fillStyle(0x3d4035).fillRect(p.x - 30, p.y - 5, 7, 12)
          .fillRect(p.x + 24, p.y - 5, 7, 12);
        for (let i = 0; i < 3; i++) {
          g.fillStyle(i % 2 ? 0x98704e : 0xad8257)
            .fillRect(p.x - 39, p.y - 34 + i * 9, 78, 6);
        }
        g.fillStyle(0xb28b60).fillRect(p.x - 42, p.y - 9, 84, 9);
      } else if (prop.kind === 'board') {
        g.fillStyle(0x594735).fillRect(p.x - 29, p.y - 42, 6, 42)
          .fillRect(p.x + 23, p.y - 42, 6, 42);
        g.fillStyle(0x725d42).fillRect(p.x - 46, p.y - 101, 92, 68);
        g.fillStyle(0xb29a6d).fillRect(p.x - 41, p.y - 96, 82, 58);
        for (let i = 0; i < 3; i++) {
          g.fillStyle(i === 1 ? 0xd4b78b : 0xe5d7b4)
            .fillRect(p.x - 34 + i * 24, p.y - 87 + i * 5, 19, 33);
        }
      } else if (prop.kind === 'bin') {
        g.fillStyle(0x445449).fillRoundedRect(p.x - 15, p.y - 38, 30, 38, 3);
        g.fillStyle(0x2e3c33).fillRect(p.x - 18, p.y - 42, 36, 7);
        g.fillStyle(0x233028).fillRect(p.x - 10, p.y - 33, 20, 8);
      } else {
        g.fillStyle(0x8c7557).fillRect(p.x - 24, p.y - 17, 48, 20);
        g.fillStyle(0x506746).fillCircle(p.x - 16, p.y - 25, 18)
          .fillCircle(p.x + 14, p.y - 25, 18).fillCircle(p.x, p.y - 35, 21);
        g.fillStyle(0xc5a16e).fillCircle(p.x - 12, p.y - 32, 3)
          .fillCircle(p.x + 14, p.y - 28, 3);
      }
    }
  }

  selectBuilding(id = null) {
    for (const [key, art] of this.buildingArt) {
      const selected = key === id;
      art.label.setColor(selected ? '#ffe19b' : '#f3e3bf');
      art.label.setBackgroundColor(selected ? '#655133' : '#303630');
      art.marker.setFillStyle(selected ? 0xffdb80 : 0xe1c383, selected ? 0.95 : 0.55);
    }
  }

  showRoute(path) {
    const g = this.routeGraphics;
    g.clear();
    for (const cell of path) {
      const p = this.point(cell.x, cell.y);
      g.fillStyle(0xf1d49a, 0.55).fillEllipse(p.x, p.y, 8, 4);
    }
  }

  clearRoute() {
    this.routeGraphics?.clear();
  }

  destroy() {
    this.buildingArt.clear();
    this.routeGraphics = null;
    this.scene = null;
  }
}
