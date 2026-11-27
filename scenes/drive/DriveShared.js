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
  offroadMaxSpeed: BASE_SPEED * .65, steeringResponse: 7,
  steeringReturn: 9, steeringRate: 1.9, curveForce: .5,
  arrivalSpeed: BASE_SPEED * .32, arrivalResponse: BASE_SPEED * .70,
  coffeeMultiplier: 1.18
});
// Track geometry: the road is a list of straights and eased bends (Test Drive style),
// sampled every TRACK.step units. `bend` turns curvature into lateral road offset.
export const TRACK = Object.freeze({step: 4, bend: 1.1e-4, startStraight: 450, endStraight: 650});
// Balance knobs, tuned with simulated trips (careful / average / reckless driving bots).
// Targets: careful driving roughly pays for its fuel, average breaks even, reckless loses money.
export const BALANCE = Object.freeze({
  obstacleLanes: [-.55, -.2, 0, .2, .55],
  pairFrom: .35, pairChance: .3,           // second obstacle in another lane, late in the trip
  coinsMin: 2, coinsMax: 3,                // coins per row
  camGap: [2600, 3600],                    // road units between speed cameras
  idleChat: [13, 19]                       // seconds between idle dino remarks
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
