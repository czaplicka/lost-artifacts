import { BaseScene } from './BaseScene.js';
import { getPigeonLoft, renamePigeon, sendPigeon, collectPigeonFind, buyPigeonPerch } from '../managers/PigeonManager.js';
import { PIGEON_FINDS, PIGEON_COLLECTIONS } from '../config/pigeonConfig.js';

export class PigeonLoftScene extends BaseScene {
  constructor() { super({ key: 'PigeonLoftScene' }); }
  create() {
    super.create();
    this.registry.set('currentSceneKey', 'PigeonLoftScene');
    this.notice = ''; this.tab = 'birds'; this.leaving = false;
    for (const key of ['PlayerHudScene', 'UIScene']) {
      this.getRegisteredScene(key)?.closeAllUIPanels?.();
      this.stopSceneIfActive(key);
    }
    const news = this.getRegisteredScene('NewsHud');
    if (news) {
      news.setHudVisible?.(false); news.closeMenu?.(true);
      this.sleepSceneIfActive('NewsHud'); this.scene.setVisible(false, 'NewsHud');
    }
    this.cameras.main.setBackgroundColor('#262a33');
    this.renderLoft();
    this.tick = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updateStatus() });
    this.trackInputEvent(this.scale, 'resize', this.renderLoft);
    this.events.once('shutdown', () => {
      this.tick?.remove(false); this.layer?.destroy(true); this.layer = null;
    });
  }
  text(x, y, value, size = 22, color = '#eadcba', width = 1160) {
    const object = this.add.text(x, y, value, { fontFamily: size === 27 ? 'PressStart2P, monospace' : 'SpecialElite, monospace',
      fontSize: `${size}px`, color, wordWrap: { width }, lineSpacing: 5 });
    this.layer.add(object); return object;
  }
  rect(x, y, w, h, color, outline = 0x8d795a) {
    const object = this.add.rectangle(x, y, w, h, color).setOrigin(0).setStrokeStyle(2, outline);
    this.layer.add(object); return object;
  }
  button(x, y, w, label, callback, enabled = true) {
    const bg = this.rect(x, y, w, 44, enabled ? 0x6b5439 : 0x383c40);
    this.text(x + 12, y + 11, label, 18, enabled ? '#fff0cc' : '#8e9293', w - 20);
    if (enabled) bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.leaving) callback();
    });
  }
  drawBird(x, y, index, away) {
    const g = this.add.graphics(); this.layer.add(g);
    g.setPosition(x, y).setAlpha(away ? 0.25 : 1);
    const colors = [0x9babb5, 0xc5b5a3, 0x737f94];
    g.fillStyle(colors[index % colors.length]).fillEllipse(0, 0, 105, 65).fillCircle(33, -35, 25);
    g.fillStyle(0x4a7978).fillEllipse(24, -13, 30, 30);
    g.fillStyle(0x637586).fillEllipse(-14, 5, 65, 35);
    g.fillStyle(0xd4aa60).fillTriangle(53, -36, 74, -28, 53, -23);
    g.fillStyle(0xf4e6ca).fillCircle(41, -42, 6);
    g.fillStyle(0x171b24).fillCircle(43, -42, 3);
    g.lineStyle(4, 0xb67b67).lineBetween(-9, 29, -9, 47).lineBetween(12, 29, 12, 47);
    g.lineBetween(-18, 47, 1, 47).lineBetween(3, 47, 23, 47);
  }
  action(callback) {
    try { const result = callback(); this.notice = result.message || ''; }
    catch (error) { this.notice = error.message; }
    this.renderLoft();
  }
  async exitLoft() {
    if (this.leaving) return;
    this.leaving = true;
    const moved = await this.goto('HomeCityScene', { entryPoint: 'your-home' });
    if (moved === false && !this._cleanupDone) {
      this.leaving = false; this.notice = 'The door appears to be experiencing paperwork. Try again.'; this.renderLoft();
    }
  }
  renderLoft() {
    if (this._cleanupDone) return;
    this.layer?.destroy(true);
    const w = this.scale.width, h = this.scale.height;
    const scale = Math.min(w / 1280, h / 720);
    this.layer = this.add.container((w - 1280 * scale) / 2, (h - 720 * scale) / 2).setScale(scale);
    this.statusTexts = []; this.statusSignature = '';
    this.rect(0, 0, 1280, 720, 0x303541);
    this.rect(20, 20, 1240, 675, 0x3d4149);
    this.text(45, 38, 'HOME / THE PIGEON BUREAU', 27);
    this.text(45, 78, 'Independent investigators. Paid in seeds.', 20, '#b9c6c8');
    this.button(1040, 40, 190, 'BACK TO TOWN', () => { void this.exitLoft(); });
    this.button(45, 120, 185, 'YOUR PIGEONS', () => { this.tab = 'birds'; this.renderLoft(); });
    this.button(245, 120, 185, 'COLLECTIONS', () => { this.tab = 'collection'; this.renderLoft(); });
    let state;
    try { state = getPigeonLoft(); }
    catch (error) { this.text(45, 205, error.message, 24, '#efb6a0'); return; }
    this.text(470, 131, `Feed in inventory: ${state.feed}`, 21);
    if (this.tab === 'collection') this.renderCollections(state);
    else this.renderBirds(state);
    this.text(45, 610, this.notice || 'Feed a pigeon, then return later. Flights continue while the game is closed.', 21, '#f0d49a', 1180);
    this.text(45, 668, 'No deadlines. No hungry-pigeon penalties. No refunds on macaroni.', 16, '#b8bdbb');
  }
  renderBirds(state) {
    for (let index = 0; index < state.birds.length; index++) {
      const bird = state.birds[index], x = 45 + index * 405;
      this.rect(x, 185, 380, 355, 0x292f39);
      this.text(x + 18, 202, bird.name, 25, '#f3e3b8', 344);
      this.drawBird(x + 180, 305, index, bird.status === 'flying');
      const status = this.text(x + 18, 367, '', 20, '#a9c6c0', 340);
      this.statusTexts.push({ id: bird.id, object: status });
      this.button(x + 18, 420, 135, 'RENAME', () => {
        const value = window.prompt('Name your pigeon (up to 24 characters):', bird.name);
        if (value !== null) this.action(() => renamePigeon(bird.id, value));
      });
      if (bird.status === 'home') {
        this.button(x + 165, 420, 195, 'FEED & SEND', () => this.action(() => sendPigeon(bird.id)), state.feed > 0);
        this.text(x + 18, 484, 'One portion. One flight.', 17, '#b8bdbb', 340);
      } else if (bird.status === 'ready') {
        this.button(x + 165, 420, 195, 'COLLECT FIND', () => this.action(() => collectPigeonFind(bird.id)));
        this.text(x + 18, 484, bird.find?.name || 'A suspicious surprise.', 18, '#eadcba', 340);
      } else {
        this.text(x + 18, 484, 'Working remotely. Extremely remotely.', 17, '#b8bdbb', 340);
      }
    }
    if (state.nextPerchPrice != null) {
      this.button(45, 552, 560, `EXTRA PERCH + PIGEON / $${state.nextPerchPrice}`, () => this.action(() => buyPigeonPerch()));
      this.text(635, 565, 'Paid from personal cash. Up to 3 pigeons.', 18, '#b8bdbb', 580);
    } else this.text(45, 566, 'The bureau is fully staffed. Nobody has signed a contract.', 20);
    this.updateStatus();
  }
  updateStatus() {
    if (!this.layer || this._cleanupDone || this.tab !== 'birds') return;
    let state;
    try { state = getPigeonLoft(); } catch { return; }
    const signature = state.birds.map(b => `${b.id}:${b.status}`).join('|');
    if (this.statusSignature && this.statusSignature !== signature) { this.renderLoft(); return; }
    this.statusSignature = signature;
    for (const row of this.statusTexts) {
      const bird = state.birds.find(b => b.id === row.id);
      if (!bird) continue;
      const seconds = Math.ceil(bird.remainingMs / 1000);
      const text = bird.status === 'home' ? `At home / Flights: ${bird.flights || 0}`
        : bird.status === 'ready' ? 'Back with a find!'
        : `Returns in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      row.object.setText(text);
    }
  }
  renderCollections(state) {
    let row = 0;
    for (const set of PIGEON_COLLECTIONS) {
      const y = 190 + row * 195;
      const count = set.ids.filter(id => (state.collection[id] || 0) > 0).length;
      this.text(45, y, `${set.name} / ${count}/${set.ids.length}${count === set.ids.length ? ' / COMPLETE!' : ''}`, 23);
      set.ids.forEach((id, index) => {
        const find = PIGEON_FINDS.find(f => f.id === id), number = state.collection[id] || 0;
        const x = 45 + index * 405;
        this.rect(x, y + 40, 380, 130, number ? 0x484b46 : 0x292f39);
        this.text(x + 16, y + 53, number ? find.name : '???', 21, number ? '#f3e3b8' : '#8c949c', 345);
        this.text(x + 16, y + 87, number ? find.description : 'Your pigeons have not found this yet.', 17, '#b8bdbb', 345);
        if (number > 1) this.text(x + 16, y + 139, `Duplicates: ${number - 1}`, 16);
      });
      row++;
    }
    this.text(45, 587, `Junk responsibly discarded: ${state.junkDiscarded}`, 18, '#b8bdbb');
  }
}
