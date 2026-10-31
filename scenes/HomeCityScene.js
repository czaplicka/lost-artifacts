import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { HomeCityRenderer } from './homeCity/HomeCityRenderer.js';

const KEY = 'HomeCityScene';
const COLS = 26, ROWS = 22, HW = 64, HH = 32, OX = 1600, OY = 240;
const INSTRUCTION = 'Arrow keys or click to walk. Enter at a door to enter.';
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const BUILDINGS = [
  { id: 'pi-office', name: 'PI Office', x: 4, y: 3, w: 3, h: 3, color: 0xc5ab79, message: '' },
  { id: 'spy-shop', name: 'Spy Shop', x: 12, y: 3, w: 3, h: 3, color: 0x688d8b,
    message: 'Closed for a discreet inventory. Even the inventory is undercover.' },
  { id: 'tavern', name: 'Tavern', x: 20, y: 5, w: 3, h: 3, color: 0xae7458, message: '' },
  { id: 'police-station', name: 'Police Station', x: 5, y: 13, w: 4, h: 3, color: 0x758aa5,
    message: 'Please take a number. The number dispenser is under investigation.' },
  { id: 'your-home', name: 'Your Home', x: 16, y: 14, w: 3, h: 3, color: 0x96905c,
    message: 'Home sweet home. Currently furnished with potential.' }
];
const PROPS = [
  { x: 8, y: 6, kind: 'lamp' }, { x: 12, y: 7, kind: 'lamp' },
  { x: 8, y: 17, kind: 'lamp' }, { x: 19, y: 12, kind: 'lamp' },
  { x: 14, y: 10, kind: 'bench' }, { x: 16, y: 10, kind: 'planter' },
  { x: 13, y: 8, kind: 'board' }, { x: 17, y: 10, kind: 'bin' },
  { x: 4, y: 7, kind: 'planter' }, { x: 15, y: 6, kind: 'planter' },
  { x: 23, y: 8, kind: 'bin' }, { x: 5, y: 17, kind: 'bench' },
  { x: 19, y: 17, kind: 'planter' }
];

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
    for (const b of this.buildings) {
      for (let y = b.y; y < b.y + b.h; y++) {
        for (let x = b.x; x < b.x + b.w; x++) this.blocked.add(this.cellKey(x, y));
      }
    }
    for (const p of this.props) this.blocked.add(this.cellKey(p.x, p.y));
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
    this.cameras.main.setBackgroundColor('#343e34');
    this.cityArt = new HomeCityRenderer(this);
    this.cityArt.drawGround(); this.cityArt.drawBuildings(); this.cityArt.drawProps();
    this.createPlayer(); this.createInterface();
    const saved = gameState.homeCity;
    const entry = this.buildings.find(b => b.id === this.entryPoint);
    const validSaved = saved?.version === 1 && Number.isInteger(saved.player?.x) &&
      Number.isInteger(saved.player?.y) && this.walkable(saved.player.x, saved.player.y);
    this.position = entry ? { ...entry.door } : validSaved ? { ...saved.player } : { ...this.buildings[0].door };
    this.placePlayer();
    const camera = this.cameras.main;
    camera.setBounds(0, 0, 3300, 2000); camera.setZoom(1);
    camera.startFollow(this.player, true, 0.12, 0.12);
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
    const body = this.add.graphics();
    body.fillStyle(0x000000, 0.25).fillEllipse(0, 0, 34, 14);
    body.fillStyle(0x302b2b).fillRect(-11, -20, 8, 19).fillRect(3, -20, 8, 19);
    body.fillStyle(0x252b28).fillRect(-13, -3, 12, 5).fillRect(3, -3, 12, 5);
    body.fillStyle(0xd3b37b).fillRoundedRect(-16, -51, 32, 36, 5);
    body.fillStyle(0xa88755).fillRect(-3, -47, 5, 30).fillRect(-14, -23, 28, 4);
    body.fillStyle(0xe4c1a2).fillCircle(0, -60, 12);
    body.fillStyle(0x544334).fillRect(-21, -70, 42, 7).fillRect(-12, -82, 24, 15);
    body.fillStyle(0x352e29).fillRect(-12, -70, 24, 4);
    this.player.add(body);
    this.targetMarker = this.add.ellipse(0, 0, 38, 18).setStrokeStyle(3, 0xffd277).setDepth(-300).setVisible(false);
  }
  createInterface() {
    const style = { fontFamily: 'SpecialElite, monospace', color: '#f4e4c0',
      backgroundColor: '#303630', padding: { x: 16, y: 10 } };
    this.title = this.add.text(24, 20, 'YOUR NEIGHBORHOOD  /  OLD QUARTER', { ...style, fontSize: '27px' })
      .setScrollFactor(0).setDepth(20000);
    this.feedback = this.add.text(24, 78, INSTRUCTION, { ...style, fontSize: '24px',
      wordWrap: { width: this.scale.width - 100 } }).setScrollFactor(0).setDepth(20000);
    this.title.setInteractive().setData('cityUi', true);
    this.feedback.setInteractive().setData('cityUi', true);
  }
  isTyping(event) {
    const target = event?.target;
    const focused = typeof document !== 'undefined' ? document.activeElement : null;
    return [target, focused].some(el => el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName));
  }
  onCityKeyDown(event) {
    if (this.disposed || this.navigating || this.isTyping(event)) return;
    if (ARROWS.has(event.code)) {
      event.preventDefault(); this.heldArrows.add(event.code);
      if (this.movementMode !== 'keyboard') {
        this.path = this.path.slice(0, 1); this.destinationBuilding = null; this.movementMode = 'keyboard';
        this.targetMarker.setVisible(false); this.cityArt.clearRoute(); this.cityArt.selectBuilding();
      }
    } else if (event.code === 'Escape') {
      event.preventDefault(); this.cancelWalking();
    } else if (event.code === 'Enter' && !event.repeat) {
      event.preventDefault(); this.enterNearbyBuilding();
    }
  }
  onCityKeyUp(event) { this.heldArrows.delete(event.code); }
  onCityBlur() {
    this.heldArrows.clear();
    if (!this.disposed && !this.navigating) this.cancelWalking();
  }
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
    this.cityArt.showRoute(route);
    if (!route.length) this.arrive();
  }
  onPointer(pointer, objects = []) {
    if (this.disposed || this.navigating || !pointer.primaryDown) return;
    if (objects.some(o => o.getData?.('cityUi'))) return;
    const camera = this.cameras?.main;
    if (!camera) return;
    const id = objects.find(o => o.getData?.('buildingId'))?.getData('buildingId');
    const building = this.buildings.find(b => b.id === id);
    const world = camera.getWorldPoint(pointer.x, pointer.y);
    const target = building ? building.door : this.unproject(world.x, world.y);
    if (!this.walkable(target.x, target.y)) {
      this.say('That spot is occupied. Try the sidewalk or select a building.'); return;
    }
    const anchor = this.path.length ? this.path[0] : this.position;
    const route = this.findPath(anchor, target);
    if (route === null) { this.say('No clear route to that spot.'); return; }
    this.heldArrows.clear(); this.movementMode = 'pointer';
    this.path = this.path.length ? [{ ...anchor }, ...route] : route;
    this.destinationBuilding = building ?? null; this.cityArt.selectBuilding(building?.id); this.cityArt.showRoute(this.path);
    const p = this.project(target.x, target.y); this.targetMarker.setPosition(p.x, p.y).setVisible(true);
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
  update(_time, delta) {
    if (this.disposed || this.navigating || !this.player) return;
    if (this.isTyping()) this.heldArrows.clear();
    let budget = 280 * Math.min(delta, 100) / 1000;
    while (budget > 0 && !this.navigating && !this.disposed) {
      if (!this.path.length && this.movementMode === 'keyboard') {
        const next = this.keyboardStep(); if (next) this.path.push(next);
      }
      if (!this.path.length) break;
      const next = this.path[0], goal = this.project(next.x, next.y);
      const distance = Math.hypot(goal.x - this.player.x, goal.y - this.player.y);
      if (distance <= budget) {
        budget -= distance; this.position = { ...next }; this.path.shift(); this.placePlayer();
        if (this.movementMode === 'pointer') this.cityArt.showRoute(this.path);
        if (!this.path.length) this.arrive();
      } else {
        const ratio = budget / distance;
        this.player.x += (goal.x - this.player.x) * ratio; this.player.y += (goal.y - this.player.y) * ratio;
        this.player.setDepth((this.player.y - OY) / HH * 100 + 1); budget = 0;
      }
    }
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
    else this.say(`${building.name}: ${building.message}`);
  }
  async openOffice() {
    return this.openCityInterior('DetectiveOfficeScene', 'The office could not be opened. Please try again.');
  }
  async openSpyShop() {
    return this.openCityInterior('SpyShopScene', 'The shop could not be opened. Please try again.');
  }
  async openTavern() {
    return this.openCityInterior('TavernScene', 'The tavern could not be opened. Please try again.');
  }
  async openCityInterior(sceneKey, errorMessage) {
    if (this.disposed || this.navigating) return false;
    this.navigating = true; this.heldArrows.clear();
    const token = this.runToken;
    this.remember();
    const moved = await this.goto(sceneKey, { entrySource: 'city', fromScene: KEY, gameState });
    if (this.disposed || this.runToken !== token) return moved !== false;
    this.navigating = false;
    if (moved === false) this.say(errorMessage);
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
    this.feedbackTimer?.remove(false); this.feedback.setText(text);
    this.feedbackTimer = this.time.delayedCall(6000, () => {
      if (!this.disposed && this.feedback?.active) this.feedback.setText(INSTRUCTION);
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
