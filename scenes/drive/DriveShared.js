export const Z0 = 30;
export const ROAD_HALF = 0.40;
export const DRAW_DIST = 1100;
export const BASE_SPEED = 165;
export const COIN_VALUE = 2;
export const FINE_AMOUNT = 15;
export const SPEED_DISPLAY = 0.55;
export const CAMERA_LIMIT = 1.15;
export const DRIVE = Object.freeze({
  maxSpeed: BASE_SPEED * 1.4, acceleration: BASE_SPEED * .36,
  braking: BASE_SPEED * .95, coasting: BASE_SPEED * .10,
  airResistance: BASE_SPEED * .055, offroadDrag: BASE_SPEED * .50,
  offroadMaxSpeed: BASE_SPEED * .65, steeringResponse: 13,
  steeringReturn: 18, steeringRate: 1.65, curveForce: .42,
  arrivalSpeed: BASE_SPEED * .32, arrivalResponse: BASE_SPEED * .70,
  coffeeMultiplier: 1.18
});
export const rand = (a,b) => a + Math.random() * (b-a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v,a,b) => Math.min(b, Math.max(a,v));
export const smooth = (v,target,rate,dt) => v+(target-v)*(1-Math.exp(-rate*dt));
export const approach = (v,target,amount) => v<target ? Math.min(target,v+amount) : Math.max(target,v-amount);
export function poly(g,points) {
  g.beginPath(); g.moveTo(...points[0]);
  for (let i=1;i<points.length;i++) g.lineTo(...points[i]);
  g.closePath(); g.fillPath();
}
