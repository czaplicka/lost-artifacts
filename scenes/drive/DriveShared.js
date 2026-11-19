export const Z0 = 30;              // perspective constant: u = Z0 / distance
export const ROAD_HALF = 0.40;     // road half-width at the screen bottom (fraction of W)
export const DRAW_DIST = 1100;
export const BASE_SPEED = 165;     // scene units per second
export const COIN_VALUE = 2;
export const FINE_AMOUNT = 15;

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const poly = (g, pts) => {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);

  for (let i = 1; i < pts.length; i++) {
    g.lineTo(pts[i][0], pts[i][1]);
  }

  g.closePath();
  g.fillPath();
};
