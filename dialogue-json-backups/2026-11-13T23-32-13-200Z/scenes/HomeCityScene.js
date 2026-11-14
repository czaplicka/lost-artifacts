import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { HomeCityRenderer } from './homeCity/HomeCityRenderer.js';
import { CEMETERY_BUILDING, enterCemeteryFromMap } from './homeCity/CemeteryMapAccess.js';

const KEY = 'HomeCityScene';
const COLS = 26, ROWS = 22, HW = 64, HH = 32, OX = 1600, OY = 240;
const INSTRUCTION = 'Arrow keys or click to walk. Enter at a door to enter.';
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const BUILDINGS = [
  { id: 'pi-office', name: 'PI Office', x: 4, y: 3, w: 3, h: 3, color: 0xc5ab79, message: '' },
  { id: 'spy-shop', name: 'Spy Shop', x: 12, y: 3, w: 3, h: 3, color: 0x688d8b,
    message: 'Closed for a discreet inventory. Even the inventory is undercover.' },
  { id: 'tavern', name: 'Tavern', x: 20, y: 5, w: 3, h: 3, color: 0xae7458, message: '' },
  { id: 'police-station', name: 'Police Station', x: 5, y: 13, w: 4, h: 3, color: 0x758aa5, message: '' },
  { id: 'your-home', name: 'Your Home', x: 16, y: 14, w: 3, h: 3, color: 0x96905c, message: '' },
  CEMETERY_BUILDING
];
// Props may be multi-cell (w/h). `variant` picks tree species / car colour (0-2).
const PROPS = [
  { x: 8, y: 6, kind: 'lamp' }, { x: 12, y: 7, kind: 'lamp' },
  { x: 8, y: 17, kind: 'lamp' }, { x: 19, y: 12, kind: 'lamp' },
  { x: 14, y: 10, kind: 'bench' }, { x: 16, y: 10, kind: 'planter' },
  { x: 13, y: 8, kind: 'board' }, { x: 17, y: 10, kind: 'bin' },
  { x: 4, y: 7, kind: 'planter' }, { x: 15, y: 6, kind: 'planter' },
  { x: 23, y: 8, kind: 'bin' }, { x: 5, y: 17, kind: 'bench' },
  { x: 19, y: 17, kind: 'planter' },
  // trees
  { x: 4, y: 1, kind: 'tree', variant: 0 }, { x: 7, y: 1, kind: 'tree', variant: 1 }, { x: 15, y: 1, kind: 'tree', variant: 2 },
{ x: 24, y: 3, kind: 'tree', variant: 1 }, { x: 24, y: 6, kind: 'tree', variant: 0 },
  { x: 13, y: 14, kind: 'tree', variant: 2 }, { x: 24, y: 15, kind: 'tree', variant: 1 }, { x: 14, y: 21, kind: 'tree', variant: 0 }, { x: 22, y: 21, kind: 'tree', variant: 1 },
  // bushes & street furniture
  { x: 7, y: 4, kind: 'bush' }, { x: 15, y: 3, kind: 'bush' }, { x: 19, y: 6, kind: 'bush' },
  { x: 4, y: 14, kind: 'bush' }, { x: 15, y: 13, kind: 'bush' }, { x: 4, y: 16, kind: 'bush' },
  { x: 8, y: 12, kind: 'hydrant' }, { x: 0, y: 12, kind: 'mailbox' }, { x: 17, y: 7, kind: 'kiosk' },
  { x: 19, y: 7, kind: 'crate' },
  // landmarks
  { x: 15, y: 9, kind: 'statue' }, { x: 18, y: 9, kind: 'signpost' }, { x: 12, y: 10, kind: 'cart' },
  { x: 12, y: 13, kind: 'phonebooth' }, { x: 12, y: 17, kind: 'clock' },
  // parked cars (2 cells long)
  { x: 4, y: 11, kind: 'car', w: 2, h: 1, variant: 0 },
  { x: 11, y: 14, kind: 'car', w: 1, h: 2, variant: 1 },
  { x: 18, y: 11, kind: 'car', w: 2, h: 1, variant: 2 }
];
// One-liners when the player clicks a prop. Cycles through the list.
const PROP_QUIPS = {
  lamp: ['A streetlamp. It has seen things. It refuses to testify.', 'This lamp has been on the case longer than I have.'],
  bench: ['Bench: 40% comfort, 60% pigeon.', 'Somebody left a newspaper. The crossword is already solved. Suspicious.'],
  planter: ['These flowers have a rock-solid alibi. Mostly water.', 'Nobody waters these. Nobody has to. They are afraid of the lady next door.'],
  board: ['MISSING: one alibi. Last seen near the tavern. Reward: a warm handshake.', 'Wanted posters. Half of them are for me. I am choosing not to look.'],
  bin: ['I am not digging through that without a warrant.', 'Smells like evidence. Or lunch. Hard to say.'],
  tree: ['A tree. Suspiciously leafy.', 'Perfect cover for a stakeout. Also perfect cover for squirrels.'],
  bush: ['Ideal hiding spot. I know. I checked. Twice.', 'Something rustled. I am pretending it was the wind.'],
  hydrant: ['A fire hydrant. Dogs treat it as a crime scene.', 'Hydrant: red, loud, and always at the wrong end of the block.'],
  mailbox: ['Mail for the dead goes in the other box.', 'Return to sender. Sender unknown. Typical.'],
  kiosk: ['Newspapers, gum, and rumours. All three are stale.', 'HOT NEWS: local detective ignores kiosk. More at eleven.'],
  crate: ['Empty bottles. The tavern calls it recycling. I call it evidence.', 'Fragile. Like my sense of justice before noon.'],
  statue: ['Monument to the Unknown Pigeon. Died as he lived: on a windowsill.', 'The plaque says: "He saw everything. Told nobody." My kind of guy.'],
  signpost: ['Four arrows. Three of them are useful. THE TRUTH points nowhere.', 'THE TRUTH: closed for lunch. Since 1987.'],
  cart: ['Sir Loin\'s Hot Dogs. Contains 0% dog. Allegedly.', 'No, I do not take bribes in sausage. ...Mustard, maybe.'],
  phonebooth: ['Out of order. The phone, not the detective.', 'Someone left a coin inside. Evidence, or a very cheap tip.'],
  clock: ['It has said ten past ten for years. Right twice a day, like me.', 'Time flies. Deadlines fly faster.'],
  car: ['Parked illegally. Not my department. Also not my car.', 'Vintage. The engine is cold. So is the case.']
};

export class HomeCityScene extends BaseScene {
  constructor() { super({ key: KEY }); }
  init(data = {}) {
    this.cols = COLS; this.rows = ROWS; this.entryPoint = data.entryPoint ?? null;
    this.buildings = BUILDINGS.map(b => ({ ...b, door: { x: b.x + Math.floor(b.w / 2), y: b.y + b.h } }));
    this.props = PROPS.map(p => ({ ...p }));
    this.path = []; this.destinationBuilding = null; this.navigating = false; this.disposed = false;
    this.runToken = Symbol(KEY); this.saveElapsed = 0; this.feedbackTimer = null;
    this.lastCameraPosition = null; this.position = null; this.cityArt = null;
    this.heldArrows = new Set(); this.movementMode = 'pointer'; this.blocked = new Set();
    this.cemeteryRefusalIndex = 0; this.quipIndex = {}; this.faceDir = 1; this.facingBack = false;
    for (const b of this.buildings) {
      for (let y = b.y; y < b.y + b.h; y++) {
        for (let x = b.x; x < b.x + b.w; x++) this.blocked.add(this.cellKey(x, y));
      }
    }
    for (const p of this.props) {
      for (let dy = 0; dy < (p.h || 1); dy++) {
        for (let dx = 0; dx < (p.w || 1); dx++) this.blocked.add(this.cellKey(p.x + dx, p.y + dy));
      }
    }
  }
  create() {
    super.create();
    this.registry.set('currentSceneKey', KEY);
    for (const key of ['PlayerHudScene', 'UIScene']) {
      if (key === 'PlayerHudScene') this.getRegisteredScene(key)?.closeAllUIPanels?.();
      this.stopSceneIfActive(key);
    }
    const news = this.getRegisteredScene('NewsHud');
    if (news) {
      news.setHudVisible?.(false); news.closeMenu?.(true);
      this.sleepSceneIfActive('NewsHud'); this.scene.setVisible(false, 'NewsHud');
    }
    this.cameras.main.setBackgroundColor('#141a12');
    this.cityArt = new HomeCityRenderer(this);
    this.cityArt.drawGround(); this.cityArt.drawBuildings(); this.cityArt.drawProps(); this.cityArt.drawAmbient();
    this.createPlayer(); this.createInterface();
    const saved = gameState.homeCity, entry = this.buildings.find(b => b.id === this.entryPoint);
    const validSaved = saved?.version === 1 && Number.isInteger(saved.player?.x) &&
      Number.isInteger(saved.player?.y) && this.walkable(saved.player.x, saved.player.y);
    this.position = entry ? { ...entry.door } : validSaved ? { ...saved.player } : { ...this.buildings[0].door };
    this.placePlayer();
    const camera = this.cameras.main;
    camera.setBounds(0, 0, 3300, 2000); camera.setZoom(1); camera.startFollow(this.player, true, 0.12, 0.12);
    if (!entry && validSaved && Number.isFinite(saved.camera?.x) && Number.isFinite(saved.camera?.y)) {
      camera.setScroll(saved.camera.x, saved.camera.y);
    } else camera.centerOn(this.player.x, this.player.y);
    this.trackInputEvent(this.input, 'pointerdown', this.onPointer);
    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard, 'keydown', this.onCityKeyDown);
      this.trackInputEvent(this.input.keyboard, 'keyup', this.onCityKeyUp);
    }
    this.trackInputEvent(this.game.events, 'blur', this.onCityBlur);
    this.events.once('shutdown', this.disposeCity, this);
    this.remember();
  }
  cellKey(x, y) { return `${x},${y}`; }
  project(x, y) { return { x: OX + (x - y) * HW, y: OY + (x + y) * HH }; }
  unproject(x, y) {
    const u = (x - OX) / HW, v = (y - OY) / HH;
    return { x: Math.round((u + v) / 2), y: Math.round((v - u) / 2) };
  }
  walkable(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 &&
      x < COLS && y < ROWS && !this.blocked.has(this.cellKey(x, y));
  }
  polygon(g, points, color, outline = 0x303e39) {
    g.fillStyle(color, 1).fillPoints(points, true);
    g.lineStyle(1, outline, 0.5).strokePoints(points, true);
  }
  diamond(x, y, z = 0) {
    const p = this.project(x, y);
    return [{ x: p.x, y: p.y - HH - z }, { x: p.x + HW, y: p.y - z },
      { x: p.x, y: p.y + HH - z }, { x: p.x - HW, y: p.y - z }];
  }
  createPlayer() {
    this.player = this.add.container(0, 0);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.18).fillEllipse(2, 1, 44, 17); shadow.fillStyle(0x000000, 0.22).fillEllipse(1, 0, 32, 12);
    this.playerBody = this.add.container(0, 0);
    if (this.textures.exists('hc_detective')) {
      // Optional real sprite: bottom-centre anchored, scaled to ~110px tall.
      this.playerFront = this.add.image(0, 0, 'hc_detective').setOrigin(0.5, 1);
      this.playerFront.setScale(110 / this.playerFront.height);
      this.playerBack = this.textures.exists('hc_detective_back')
        ? this.add.image(0, 0, 'hc_detective_back').setOrigin(0.5, 1).setVisible(false) : null;
      this.playerBack?.setScale(110 / this.playerBack.height);
      this.playerBody.add(this.playerBack ? [this.playerFront, this.playerBack] : [this.playerFront]);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x2b2724).fillRect(-9, -24, 7, 23).fillRect(2, -24, 7, 23);              // trousers
      g.fillStyle(0x1b1917).fillRoundedRect(-11, -4, 11, 6, 2).fillRoundedRect(1, -4, 12, 6, 2); // shoes
      g.fillStyle(0xc9a96e).fillPoints([{ x: -15, y: -56 }, { x: 15, y: -56 }, { x: 18, y: -16 }, { x: -18, y: -16 }], true); // trench coat
      g.fillStyle(0xb08d55).fillRect(-18, -22, 36, 6); g.fillStyle(0x8a6c3e).fillRect(-15, -37, 30, 4);   // hem + belt
      g.fillStyle(0xe9e0c8).fillTriangle(-4, -56, 4, -56, 0, -42); g.fillStyle(0x7d1f2b).fillTriangle(-2, -54, 2, -54, 0, -40);
      g.fillStyle(0xd8bb82).fillTriangle(-15, -56, -3, -56, -10, -43).fillTriangle(15, -56, 3, -56, 10, -43);
      g.fillStyle(0xb99a62).fillRoundedRect(-21, -54, 8, 30, 3).fillRoundedRect(13, -54, 8, 30, 3);
      g.fillStyle(0xe4c1a2).fillCircle(-17, -23, 4).fillCircle(17, -23, 4);
      g.lineStyle(3, 0x5a4630).lineBetween(18, -24, 27, -40); g.lineStyle(3, 0xd7b16b).strokeCircle(30, -46, 7);
      g.fillStyle(0xcfe6ee, 0.55).fillCircle(30, -46, 6);                                      // magnifying glass
      g.fillStyle(0xe4c1a2).fillCircle(0, -66, 11);
      g.fillStyle(0x4a3c2d).fillEllipse(0, -74, 38, 9); g.fillStyle(0x5a4a38).fillRoundedRect(-11, -91, 22, 18, 4);
      g.fillStyle(0x2f2620).fillRect(-11, -78, 22, 4);
      g.fillStyle(0x2a211b).fillRect(-5, -67, 2, 3).fillRect(3, -67, 2, 3);
      this.playerBody.add(g);
    }
    this.player.add([shadow, this.playerBody]);
    this.targetMarker = this.add.ellipse(0, 0, 38, 18).setStrokeStyle(3, 0xffd277).setDepth(-300).setVisible(false);
  }
  animatePlayer(time, moving) {
    const body = this.playerBody; if (!body?.active) return;
    if (moving) {
      const t = time * 0.016; body.y = -Math.abs(Math.sin(t)) * 5; body.angle = Math.sin(t) * 2.2 * this.faceDir; body.scaleY = 1;
    } else { body.y *= 0.8; body.angle *= 0.8; body.scaleY = 1 + Math.sin(time * 0.004) * 0.012; }
    body.scaleX = this.faceDir;
    if (this.playerBack) { this.playerFront.setVisible(!this.facingBack); this.playerBack.setVisible(this.facingBack); }
  }
  createInterface() {
    const body = { fontFamily: 'SpecialElite, monospace', color: '#f4e4c0', padding: { x: 18, y: 10 } };
    this.hudPanel = this.add.graphics().setScrollFactor(0).setDepth(19990);
    this.title = this.add.text(24, 20, 'YOUR NEIGHBORHOOD  /  OLD QUARTER', { fontFamily: 'PressStart2P, monospace',
      fontSize: '17px', color: '#ffe19b', padding: { x: 18, y: 12 } }).setScrollFactor(0).setDepth(20000);
    this.feedback = this.add.text(24, 78, INSTRUCTION, { ...body, fontSize: '24px',
      wordWrap: { width: this.scale.width - 100 } }).setScrollFactor(0).setDepth(20000);
    this.title.setInteractive().setData('cityUi', true);
    this.feedback.setInteractive().setData('cityUi', true);
    this.refreshHud();
  }
  refreshHud() {
    const g = this.hudPanel; if (!g?.active) return; g.clear();
    for (const t of [this.title, this.feedback]) {
      if (!t?.active) continue;
      g.fillStyle(0x000000, 0.3).fillRoundedRect(t.x + 3, t.y + 4, t.width, t.height, 8);
      g.fillStyle(0x262b26, 0.92).fillRoundedRect(t.x, t.y, t.width, t.height, 8);
      g.lineStyle(2, 0xb89a58, 1).strokeRoundedRect(t.x, t.y, t.width, t.height, 8);
      g.lineStyle(1, 0xb89a58, 0.35).strokeRoundedRect(t.x + 4, t.y + 4, t.width - 8, t.height - 8, 5);
    }
  }
  isTyping(event) {
    const focused = typeof document !== 'undefined' ? document.activeElement : null;
    return [event?.target, focused].some(el => el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName));
  }
  onCityKeyDown(event) {
    if (this.disposed || this.navigating || this.isTyping(event)) return;
    if (ARROWS.has(event.code)) {
      event.preventDefault(); this.heldArrows.add(event.code);
      if (this.movementMode !== 'keyboard') {
        this.path = this.path.slice(0, 1); this.destinationBuilding = null; this.movementMode = 'keyboard';
        this.targetMarker.setVisible(false); this.cityArt.clearRoute(); this.cityArt.selectBuilding();
      }
    } else if (event.code === 'Escape') { event.preventDefault(); this.cancelWalking(); }
    else if (event.code === 'Enter' && !event.repeat) { event.preventDefault(); this.enterNearbyBuilding(); }
  }
  onCityKeyUp(event) { this.heldArrows.delete(event.code); }
  onCityBlur() { this.heldArrows.clear(); if (!this.disposed && !this.navigating) this.cancelWalking(); }
  keyboardStep() {
    const h = Number(this.heldArrows.has('ArrowRight')) - Number(this.heldArrows.has('ArrowLeft'));
    const v = Number(this.heldArrows.has('ArrowDown')) - Number(this.heldArrows.has('ArrowUp'));
    if (!h && !v) return null;
    const dx = Math.sign(h + v), dy = Math.sign(v - h);
    const x = this.position.x + dx, y = this.position.y + dy;
    if (!this.walkable(x, y)) return null;
    if (dx && dy && (!this.walkable(this.position.x + dx, this.position.y) ||
      !this.walkable(this.position.x, this.position.y + dy))) return null;
    return { x, y };
  }
  enterNearbyBuilding() {
    if (this.path.length || this.navigating || this.disposed) return;
    const nearby = this.buildings.find(b => Math.abs(b.door.x - this.position.x) + Math.abs(b.door.y - this.position.y) <= 1);
    if (!nearby) { this.say('Move closer to a door, then press Enter.'); return; }
    this.heldArrows.clear(); this.cityArt.selectBuilding(nearby.id);
    const route = this.findPath(this.position, nearby.door);
    if (route === null) return;
    this.movementMode = 'pointer'; this.destinationBuilding = nearby; this.path = route;
    this.cityArt.showRoute(route); if (!route.length) this.arrive();
  }
  propAt(x, y) {
    return this.props.find(p => x >= p.x && x < p.x + (p.w || 1) && y >= p.y && y < p.y + (p.h || 1)) ?? null;
  }
  sayQuip(prop) {
    const lines = PROP_QUIPS[prop?.kind]; if (!lines) { this.say('That spot is occupied. Try the sidewalk or select a building.'); return; }
    const i = this.quipIndex[prop.kind] ?? 0; this.quipIndex[prop.kind] = i + 1; this.say(lines[i % lines.length]);
  }
  onPointer(pointer, objects = []) {
    if (this.disposed || this.navigating || !pointer.primaryDown) return;
    if (objects.some(o => o.getData?.('cityUi'))) return;
    const camera = this.cameras?.main; if (!camera) return;
    const propIndex = objects.find(o => o.getData?.('propIndex') !== undefined)?.getData('propIndex');
    if (propIndex !== undefined) { this.sayQuip(this.props[propIndex]); return; }
    const id = objects.find(o => o.getData?.('buildingId'))?.getData('buildingId');
    const building = this.buildings.find(b => b.id === id);
    const world = camera.getWorldPoint(pointer.x, pointer.y);
    const target = building ? building.door : this.unproject(world.x, world.y);
    if (!this.walkable(target.x, target.y)) {
      const prop = this.propAt(target.x, target.y);
      if (prop) this.sayQuip(prop); else this.say('That spot is occupied. Try the sidewalk or select a building.');
      return;
    }
    const anchor = this.path.length ? this.path[0] : this.position;
    const route = this.findPath(anchor, target);
    if (route === null) { this.say('No clear route to that spot.'); return; }
    this.heldArrows.clear(); this.movementMode = 'pointer';
    this.path = this.path.length ? [{ ...anchor }, ...route] : route;
    this.destinationBuilding = building ?? null;
    this.cityArt.selectBuilding(building?.id); this.cityArt.showRoute(this.path);
    const p = this.project(target.x, target.y);
    this.targetMarker.setPosition(p.x, p.y).setVisible(true);
    if (building) this.say(`Walking to ${building.name}...`);
    if (!this.path.length) this.arrive();
  }
  findPath(start, target) {
    if (!start || !this.walkable(start.x, start.y) || !this.walkable(target.x, target.y)) return null;
    const key = this.cellKey(target.x, target.y), queue = [{ x: start.x, y: start.y }];
    const parents = new Map([[this.cellKey(start.x, start.y), null]]);
    let head = 0;
    while (head < queue.length) {
      const cell = queue[head++];
      if (this.cellKey(cell.x, cell.y) === key) {
        const path = []; let node = cell;
        while (parents.get(this.cellKey(node.x, node.y)) !== null) {
          path.push(node); node = parents.get(this.cellKey(node.x, node.y));
        }
        return path.reverse();
      }
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const next = { x: cell.x + dx, y: cell.y + dy }, nextKey = this.cellKey(next.x, next.y);
        if (!this.walkable(next.x, next.y) || parents.has(nextKey)) continue;
        parents.set(nextKey, cell); queue.push(next);
      }
    }
    return null;
  }
  placePlayer() {
    const p = this.project(this.position.x, this.position.y);
    this.player.setPosition(p.x, p.y).setDepth((this.position.x + this.position.y) * 100 + 1);
  }
  cancelWalking() {
    if (this.disposed || this.navigating) return;
    this.heldArrows.clear(); this.destinationBuilding = null; this.path = this.path.slice(0, 1);
    this.targetMarker.setVisible(false); this.cityArt.clearRoute(); this.cityArt.selectBuilding();
  }
  update(time, delta) {
    if (this.disposed || this.navigating || !this.player) return;
    if (this.isTyping()) this.heldArrows.clear();
    let budget = 280 * Math.min(delta, 100) / 1000, moved = false;
    while (budget > 0 && !this.navigating && !this.disposed) {
      if (!this.path.length && this.movementMode === 'keyboard') {
        const next = this.keyboardStep(); if (next) this.path.push(next);
      }
      if (!this.path.length) break;
      const next = this.path[0], goal = this.project(next.x, next.y);
      const dxs = goal.x - this.player.x, dys = goal.y - this.player.y;
      if (Math.abs(dxs) > 1) this.faceDir = dxs > 0 ? 1 : -1;
      if (Math.abs(dys) > 1) this.facingBack = dys < 0;
      moved = true;
      const distance = Math.hypot(dxs, dys);
      if (distance <= budget) {
        budget -= distance; this.position = { ...next }; this.path.shift(); this.placePlayer();
        if (this.movementMode === 'pointer') this.cityArt.showRoute(this.path);
        if (!this.path.length) this.arrive();
      } else {
        const ratio = budget / distance;
        this.player.x += dxs * ratio;
        this.player.y += dys * ratio;
        this.player.setDepth((this.player.y - OY) / HH * 100 + 1); budget = 0;
      }
    }
    if (this.disposed || this.navigating) return;
    this.animatePlayer(time, moved);
    this.cityArt?.update(time, delta, { cell: this.position, idle: !this.path.length && !moved });
    this.saveElapsed += delta;
    if (this.saveElapsed >= 1500) { this.saveElapsed = 0; this.remember(); }
  }
  arrive() {
    this.targetMarker.setVisible(false); this.cityArt.clearRoute();
    if (this.movementMode !== 'keyboard' || !this.heldArrows.size) this.remember();
    const building = this.destinationBuilding; this.destinationBuilding = null;
    if (!building) return;
    if (building.id === 'pi-office') void this.openOffice();
    else if (building.id === 'spy-shop') void this.openSpyShop();
    else if (building.id === 'tavern') void this.openTavern();
    else if (building.id === 'police-station') void this.openPoliceStation();
    else if (building.id === 'cemetery') void this.openCemetery();
    else if (building.id === 'your-home') void this.openHome();
    else this.say(`${building.name}: ${building.message}`);
  }
  async openOffice() { return this.openCityInterior('DetectiveOfficeScene', 'The office could not be opened. Please try again.'); }
  async openSpyShop() { return this.openCityInterior('SpyShopScene', 'The shop could not be opened. Please try again.'); }
  async openTavern() { return this.openCityInterior('TavernScene', 'The tavern could not be opened. Please try again.'); }
  async openPoliceStation() { return this.openCityInterior('PoliceStationScene', 'The police station could not be opened. Please try again.'); }
  async openCemetery() { return enterCemeteryFromMap(this); }
  async openHome() { return this.openCityInterior('PigeonLoftScene', 'The pigeon loft could not be opened. Please try again.'); }
  async openCityInterior(sceneKey, errorMessage) {
    if (this.disposed || this.navigating) return false;
    this.navigating = true; this.heldArrows.clear();
    const token = this.runToken; this.remember();
    const moved = await this.goto(sceneKey, { entrySource: 'city', fromScene: KEY, gameState });
    if (this.disposed || this.runToken !== token) return moved !== false;
    this.navigating = false; if (moved === false) this.say(errorMessage);
    return moved !== false;
  }
  remember() {
    if (!this.position) return;
    const camera = this.cameras?.main;
    if (Number.isFinite(camera?.scrollX) && Number.isFinite(camera?.scrollY)) {
      this.lastCameraPosition = { x: camera.scrollX, y: camera.scrollY };
    }
    const previousCamera = gameState.homeCity?.version === 1 ? gameState.homeCity.camera : null;
    const fallbackCamera = Number.isFinite(previousCamera?.x) && Number.isFinite(previousCamera?.y)
      ? { x: previousCamera.x, y: previousCamera.y } : null;
    const cameraPosition = this.lastCameraPosition ?? fallbackCamera;
    gameState.homeCity = { version: 1, player: { ...this.position },
      camera: cameraPosition ? { ...cameraPosition } : null, lastEntryPoint: this.entryPoint };
    if (gameState.isGameActive) requestAutosave();
  }
  say(text) {
    if (this.disposed || !this.feedback?.active) return;
    this.feedbackTimer?.remove(false); this.feedback.setText(text); this.refreshHud();
    this.feedbackTimer = this.time.delayedCall(6000, () => {
      if (!this.disposed && this.feedback?.active) { this.feedback.setText(INSTRUCTION); this.refreshHud(); }
      this.feedbackTimer = null;
    });
  }
  disposeCity() {
    if (this.disposed) return;
    this.disposed = true; this.runToken = null; this.heldArrows.clear(); this.remember();
    this.feedbackTimer?.remove(false); this.feedbackTimer = null;
    this.path = []; this.destinationBuilding = null; this.cityArt?.destroy(); this.cityArt = null;
  }
}
