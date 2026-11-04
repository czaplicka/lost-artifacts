import { BaseScene } from './BaseScene.js';
import { getPigeonLoft, feedPigeon, renamePigeon, sendPigeon, collectPigeonFind, buyPigeonPerch } from '../managers/PigeonManager.js';
import { PIGEON_FINDS, PIGEON_COLLECTIONS } from '../config/pigeonConfig.js';
import { PIGEON_HOTSPOTS } from '../config/pigeonHotspots.js';

const W = 1280, H = 720, ORDER = [3, 2, 1];
const ASSETS = ['attic', 'cage1', 'cage2', 'cage3', 'p1', 'p1b', 'p2', 'p2b', 'p3', 'p3b',
  'food_empty', 'food_full', 'food', 'collection_cabinet'];
const LOCAL = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export class PigeonLoftScene extends BaseScene {
  constructor() { super({ key: 'PigeonLoftScene' }); }
  preload() {
    for (const key of ASSETS) if (!this.textures.exists(key)) this.load.image(key, `assets/pi/home/${key}.webp`);
  }
  create() {
    super.create();
    this.registry.set('currentSceneKey', 'PigeonLoftScene');
    this.leaving = false; this.modal = null; this.selectedSlot = 3;
    this.debugMode = false; this.selectedIndex = 0; this.hotspots = [];
    this.configs = PIGEON_HOTSPOTS.map(c => ({ ...c }));
    this.boundsCache = new Map(); this.signatureValue = ''; this.feedbackText = '';
    this.input.setTopOnly(true); this.cameras.main.setBackgroundColor('#151920');
    this.hideAgencyHud();
    this.renderLoft();
    this.trackInputEvent(this.scale, 'resize', this.renderLoft);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    // Hide a late-restored agency overlay only while this scene is active.
    this.tick = this.time.addEvent({ delay: 500, loop: true, callback: () => {
      this.hideAgencyHud(); this.refreshState();
    } });
    this.events.once('shutdown', () => {
      this.tick?.remove(false); this.feedbackTimer?.remove(false); this.layer?.destroy(true);
      this.layer = null;
    });
  }
  hideAgencyHud() {
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const hud = this.getRegisteredScene(key); if (!hud) continue;
      hud.closeAllUIPanels?.(); hud.closeMenu?.(true); hud.setHudVisible?.(false);
      if (this.isSceneActive(key)) this.sleepSceneIfActive(key);
      this.scene.setVisible(false, key);
    }
  }
  text(x, y, value, size = 19, width = 1140, color = '#fff1ce') {
    const object = this.add.text(x, y, value, { fontFamily: 'SpecialElite, monospace',
      fontSize: `${size}px`, color, wordWrap: { width }, lineSpacing: 3 });
    this.layer.add(object); return object;
  }
  panel(x, y, w, h) {
    const object = this.add.rectangle(x, y, w, h, 0x191b16, 0.96).setOrigin(0)
      .setStrokeStyle(2, 0x8a7a4d).setInteractive();
    this.layer.add(object); return object;
  }
  button(x, y, label, callback, enabled = true) {
    const t = this.text(x, y, label, 18, 390, enabled ? '#fff1ce' : '#858575');
    t.setBackgroundColor('#191b16').setPadding(9, 7);
    t.setInteractive({ useHandCursor: enabled });
    t.on('pointerdown', () => { if (enabled && !this.leaving && !this.debugMode) callback(); });
    return t;
  }
  frame() {
    if (!this.textures.exists('attic')) return { x: 0, y: 0, w: W, h: H };
    const source = this.textures.get('attic').getSourceImage();
    const scale = Math.min(W / source.width, H / source.height);
    return { x: (W - source.width * scale) / 2, y: (H - source.height * scale) / 2,
      w: source.width * scale, h: source.height * scale };
  }
  art(key) {
    if (!this.textures.exists(key)) return;
    const f = this.artFrame;
    this.layer.add(this.add.image(f.x, f.y, key).setOrigin(0).setDisplaySize(f.w, f.h));
  }
  alphaBounds(key) {
    if (this.boundsCache.has(key)) return this.boundsCache.get(key);
    let bounds = null;
    try {
      if (!this.textures.exists(key)) return null;
      const image = this.textures.get(key).getSourceImage();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] <= 16) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      // Fully opaque full-canvas files cannot supply useful object bounds.
      if (maxX >= minX && maxY >= minY &&
          (maxX - minX < canvas.width * 0.95 || maxY - minY < canvas.height * 0.95)) {
        bounds = { x: (minX + maxX + 1) / (2 * canvas.width), y: (minY + maxY + 1) / (2 * canvas.height),
          w: (maxX - minX + 1) / canvas.width, h: (maxY - minY + 1) / canvas.height };
      }
    } catch (error) { console.warn('[PigeonLoft] Using configured hotspot for', key, error); }
    this.boundsCache.set(key, bounds); return bounds;
  }
  resolveConfig(cfg) {
    if (cfg.auto === false) return;
    const key = cfg.id === 'feeder' ? 'food_empty' : cfg.id === 'cabinet' ? 'collection_cabinet' : cfg.id;
    const bounds = this.alphaBounds(key); if (!bounds) return;
    const f = this.artFrame;
    Object.assign(cfg, { x: f.x + bounds.x * f.w, y: f.y + bounds.y * f.h,
      w: Math.max(14, bounds.w * f.w), h: Math.max(14, bounds.h * f.h) });
  }
  signature(state) {
    return JSON.stringify({ perches: state.perches, feed: state.feed, collection: state.collection,
      birds: state.birds.map(b => [b.id, b.name, b.status, b.fed, b.flights]) });
  }
  renderLoft() {
    if (this._cleanupDone) return;
    this.layer?.destroy(true); this.hotspots = []; this.tooltip = null; this.feedbackObject = null; this.statusText = null; this.debugText = null;
    const fit = Math.min(this.scale.width / W, this.scale.height / H);
    this.layer = this.add.container((this.scale.width - W * fit) / 2, (this.scale.height - H * fit) / 2).setScale(fit);
    this.artFrame = this.frame(); this.art('attic');
    try { this.state = getPigeonLoft(); }
    catch (error) { this.text(20, 100, error.message); this.button(20, 20, '[EXIT]', () => { void this.exitLoft(); }); return; }
    for (const slot of this.state.slots) {
      if (!slot.owned) continue;
      this.art(`cage${slot.slot}`);
      if (slot.bird && slot.bird.status !== 'flying') this.art(`p${slot.slot}`);
      if (slot.bird?.status === 'ready') this.art(`p${slot.slot}b`);
    }
    this.art(this.state.feederFull ? 'food_full' : 'food_empty');
    this.art('food'); this.art('collection_cabinet');
    this.configs.forEach(cfg => { this.resolveConfig(cfg); this.createHotspot(cfg); });
    this.button(18, 16, '[EXIT]', () => { void this.exitLoft(); });
    this.button(112, 16, '[COLLECTION]', () => { this.modal = 'collection'; this.renderLoft(); });
    if (this.state.nextPerchPrice != null) {
      const slot = ORDER[this.state.perches];
      this.button(282, 16, `[BUY CAGE ${slot} / $${this.state.nextPerchPrice}]`, () => {
        this.modal = 'buy'; this.renderLoft();
      });
    }
    this.text(18, 64, `Feed: ${this.state.feed}`, 18).setBackgroundColor('#191b16').setPadding(6, 4);
    this.tooltip = this.text(0, 0, '', 17, 330).setBackgroundColor('#191b16').setPadding(8, 6).setVisible(false);
    if (this.modal) this.renderModal();
    if (this.feedbackText) this.drawFeedback();
    if (this.debugMode) this.drawEditorHelp();
    this.signatureValue = this.signature(this.state);
  }
  hotspotEnabled(cfg) {
    if (this.debugMode) return true;
    const match = cfg.id.match(/^(cage|p)([123])(b?)$/);
    if (!match) return true;
    const slot = this.state.slots.find(s => s.slot === Number(match[2]));
    if (match[1] === 'cage') return Boolean(slot?.owned);
    return Boolean(slot?.bird && slot.bird.status !== 'flying' && (!match[3] || slot.bird.status === 'ready'));
  }
  createHotspot(cfg) {
    const zone = this.add.zone(cfg.x, cfg.y, cfg.w, cfg.h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.layer.add(zone);
    const highlight = this.add.graphics(); this.layer.add(highlight);
    const hs = { cfg, zone, highlight, hovered: false };
    this.hotspots.push(hs);
    if (!this.hotspotEnabled(cfg)) zone.disableInteractive();
    zone.on('pointerover', () => {
      if (this.modal || this.leaving || this.debugMode) return;
      hs.hovered = true; this.drawHotspot(hs);
      const label = cfg.id === 'feeder' ? 'Feeder — pour grain' : cfg.label;
      this.tooltip.setText(label).setOrigin(0, 1);
      this.tooltip.setPosition(Math.max(8, Math.min(cfg.x, W - this.tooltip.width - 8)),
        Math.max(this.tooltip.height + 8, cfg.y - cfg.h / 2 - 8)).setVisible(true);
    });
    zone.on('pointerout', () => { hs.hovered = false; this.drawHotspot(hs); this.tooltip?.setVisible(false); });
    zone.on('pointerdown', () => {
      if (this.leaving || this.modal) return;
      if (this.debugMode) { this.selectedIndex = this.configs.indexOf(cfg); this.drawAllHotspots(); return; }
      this.activate(cfg.id);
    });
    zone.on('drag', pointer => {
      if (!this.debugMode || this.modal) return;
      const point = this.layer.getLocalPoint(pointer.x, pointer.y);
      cfg.x = Math.round(point.x); cfg.y = Math.round(point.y); cfg.auto = false;
      this.selectedIndex = this.configs.indexOf(cfg); this.syncHotspot(hs); this.drawAllHotspots();
    });
    this.input.setDraggable(zone, this.debugMode);
    this.drawHotspot(hs);
  }
  drawHotspot(hs) {
    const c = hs.cfg, g = hs.highlight; g.clear();
    if (this.debugMode) {
      g.fillStyle(0x00ff88, 0.2).fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
      g.lineStyle(2, this.configs[this.selectedIndex] === c ? 0xff44ff : 0x00ff88, 1)
        .strokeRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
    } else if (hs.hovered && !this.modal) {
      g.fillStyle(0xffd166, 0.18).fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
    }
  }
  syncHotspot(hs) {
    const c = hs.cfg; hs.zone.setPosition(c.x, c.y).setSize(c.w, c.h);
    hs.zone.input.hitArea.setTo(0, 0, c.w, c.h); this.drawHotspot(hs);
  }
  drawAllHotspots() {
    this.hotspots.forEach(h => this.drawHotspot(h));
    this.debugText?.setText(this.editorText());
  }
  activate(id) {
    this.tooltip?.setVisible(false);
    if (id === 'cabinet') { this.modal = 'collection'; this.renderLoft(); return; }
    if (id === 'food') { this.feedback(`Feed: ${this.state.feed}. Computer > Office Shop > Pigeon Feed ($2).`); return; }
    if (id === 'feeder') { this.modal = 'feed'; this.renderLoft(); return; }
    const match = id.match(/^(cage|p)([123])(b?)$/); if (!match) return;
    this.selectedSlot = Number(match[2]);
    const slot = this.state.slots.find(s => s.slot === this.selectedSlot);
    if (match[3] && slot?.bird) this.action(() => collectPigeonFind(slot.bird.id));
    else { this.modal = 'bird'; this.renderLoft(); }
  }
  action(callback) {
    let result;
    try { result = callback(); } catch (error) { result = { ok: false, message: error.message }; }
    if (result.ok) this.modal = null;
    this.feedbackText = result.message || ''; this.renderLoft(); this.scheduleFeedback();
  }
  feedback(message) { this.feedbackText = message; this.renderLoft(); this.scheduleFeedback(); }
  scheduleFeedback() {
    this.feedbackTimer?.remove(false);
    this.feedbackTimer = this.time.delayedCall(4000, () => {
      this.feedbackText = ''; this.feedbackObject?.destroy(); this.feedbackObject = null;
    });
  }
  drawFeedback() {
    this.feedbackObject = this.text(18, 102, this.feedbackText, 18, 510, '#f0d49a')
      .setBackgroundColor('#191b16').setPadding(8, 6);
  }
  closeModal() { this.modal = null; this.renderLoft(); }
  renderModal() {
    const collection = this.modal === 'collection';
    const x = collection ? 60 : 24, y = 170, w = collection ? 1160 : 470, h = collection ? 480 : 370;
    // Full-screen input shield exists only while a closeable window is open.
    const shield = this.add.rectangle(0, 0, W, H, 0x000000, 0.2).setOrigin(0).setInteractive();
    this.layer.add(shield); this.panel(x, y, w, h);
    this.button(x + w - 48, y + 10, 'X', () => this.closeModal());
    if (collection) { this.renderCollectionContents(x, y); return; }
    if (this.modal === 'buy') {
      this.text(x + 16, y + 18, 'EMPTY CAGE', 23, w - 80);
      this.text(x + 16, y + 75, `Buy cage ${ORDER[this.state.perches]} for $${this.state.nextPerchPrice}?
A pigeon arrives only after you add grain.`, 21, w - 36);
      this.button(x + 16, y + 220, 'CONFIRM PURCHASE', () => this.action(() => buyPigeonPerch())); return;
    }
    if (this.modal === 'feed') {
      this.text(x + 16, y + 18, 'POUR GRAIN', 23, w - 80);
      this.text(x + 16, y + 64, `Available portions: ${this.state.feed}
Choose a cage. One portion funds one flight.`, 20, w - 36);
      this.state.slots.filter(s => s.owned).forEach((s, i) => {
        const label = s.bird?.name || `Empty cage ${s.slot}`;
        const enabled = this.state.feed > 0 && (!s.bird || (s.bird.status === 'home' && !s.bird.fed));
        this.button(x + 16, y + 150 + i * 52, `CAGE ${s.slot}: ${label}`, () => {
          this.selectedSlot = s.slot; this.action(() => feedPigeon(s.slot));
        }, enabled);
      }); return;
    }
    const slot = this.state.slots.find(s => s.slot === this.selectedSlot), bird = slot?.bird;
    this.text(x + 16, y + 18, bird?.name || `Empty cage ${this.selectedSlot}`, 23, w - 80);
    if (!bird) {
      this.text(x + 16, y + 74, 'No pigeon yet. Buy grain on the office computer and pour it into the feeder.', 21, w - 36);
      this.button(x + 16, y + 225, 'OPEN FEEDER', () => { this.modal = 'feed'; this.renderLoft(); }); return;
    }
    this.statusText = this.text(x + 16, y + 74, this.status(bird), 21, w - 36);
    this.button(x + 16, y + 160, 'RENAME', () => {
      const name = window.prompt('Name your pigeon:', bird.name);
      if (name !== null) this.action(() => renamePigeon(bird.id, name));
    });
    if (bird.status === 'ready') this.button(x + 16, y + 225, 'COLLECT FIND', () => this.action(() => collectPigeonFind(bird.id)));
    else if (bird.status === 'home' && bird.fed) this.button(x + 16, y + 225, 'SEND PIGEON', () => this.action(() => sendPigeon(bird.id)));
    else if (bird.status === 'home') this.button(x + 16, y + 225, 'OPEN FEEDER', () => { this.modal = 'feed'; this.renderLoft(); });
  }
  renderCollectionContents(x, y) {
    this.text(x + 18, y + 16, 'COLLECTIONS', 23);
    PIGEON_COLLECTIONS.forEach((set, row) => {
      const top = y + 68 + row * 188;
      const count = set.ids.filter(id => (this.state.collection[id] || 0) > 0).length;
      this.text(x + 18, top, `${set.name}: ${count}/${set.ids.length}`, 22);
      set.ids.forEach((id, col) => {
        const find = PIGEON_FINDS.find(f => f.id === id), n = this.state.collection[id] || 0;
        const left = x + 18 + col * 376;
        this.text(left, top + 38, n ? `${find?.name} (x${n})` : '???', 20, 350);
        this.text(left, top + 76, n ? find?.description || '' : 'Not found yet.', 17, 350, '#b8bdbb');
      });
    });
    this.text(x + 18, y + 445, `Junk discarded: ${this.state.junkDiscarded}`, 17);
  }
  status(bird) {
    if (bird.status === 'ready') return `Back with: ${bird.find?.name || 'a surprise'}`;
    if (bird.status === 'home') return bird.fed ? 'Fed and ready for a flight.' : 'At home. Pour grain before the next flight.';
    const seconds = Math.ceil(bird.remainingMs / 1000);
    return `Returns in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  refreshState() {
    if (!this.layer || this._cleanupDone || this.debugMode) return;
    let state; try { state = getPigeonLoft(); } catch { return; }
    if (this.signature(state) !== this.signatureValue) { this.renderLoft(); return; }
    const bird = state.slots.find(s => s.slot === this.selectedSlot)?.bird;
    if (this.modal === 'bird' && bird) this.statusText?.setText(this.status(bird));
  }
  editorText() {
    const c = this.configs[this.selectedIndex];
    return `LOCAL HOTSPOTS: ${c?.id} | x:${Math.round(c?.x || 0)} y:${Math.round(c?.y || 0)} w:${Math.round(c?.w || 0)} h:${Math.round(c?.h || 0)}
Drag / Arrows: move | Shift+Arrows: resize | Alt: 1px | Tab: select | C: export | D: close. Actions disabled.`;
  }
  drawEditorHelp() {
    this.debugText = this.text(18, 565, this.editorText(), 16, 1100, '#a5ffd4')
      .setBackgroundColor('#191b16').setPadding(8, 6);
  }
  onKey(event) {
    if (event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (event.code === 'Escape') { if (this.modal) this.closeModal(); else if (this.debugMode) { this.debugMode = false; this.renderLoft(); } return; }
    if (!LOCAL || event.ctrlKey || event.metaKey || this.leaving) return;
    if (event.code === 'KeyD' && !event.repeat) {
      this.debugMode = !this.debugMode; this.modal = null; this.renderLoft(); return;
    }
    if (!this.debugMode) return;
    if (event.code === 'KeyC' && !event.repeat) {
      console.log('COPY INTO config/pigeonHotspots.js:');
      console.log('export const PIGEON_HOTSPOTS = ' + JSON.stringify(this.configs.map(c => ({ ...c, auto: false })), null, 2) + ';'); return;
    }
    if (event.code === 'Tab') {
      event.preventDefault(); this.selectedIndex = (this.selectedIndex + (event.shiftKey ? -1 : 1) + this.configs.length) % this.configs.length;
      this.drawAllHotspots(); return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
    event.preventDefault(); const c = this.configs[this.selectedIndex], step = event.altKey ? 1 : 5;
    const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.code);
    const direction = ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : 1;
    const key = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
    c[key] += direction * step; c.w = Math.max(10, c.w); c.h = Math.max(10, c.h); c.auto = false;
    const hs = this.hotspots.find(h => h.cfg === c); if (hs) this.syncHotspot(hs);
    this.drawAllHotspots();
  }
  async exitLoft() {
    if (this.leaving || this.debugMode) return;
    this.leaving = true;
    const moved = await this.goto('HomeCityScene', { entryPoint: 'your-home' });
    if (moved === false && !this._cleanupDone) { this.leaving = false; this.feedback('Could not return to town. Please try again.'); }
  }
}
