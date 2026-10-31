import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';

const KEY = 'archive_shredded_report';
const FLAG = 'shredded_report_reconstructed';
const COLS = 4, ROWS = 3, PW = 960, PH = 600;
const TW = PW / COLS, TH = PH / ROWS;
const LEFT = 160, TOP = 180;
const IDS = Array.from({ length: COLS * ROWS }, (_, index) => index);
const valid = value => Array.isArray(value) && value.length === IDS.length &&
  new Set(value).size === IDS.length && value.every(id => IDS.includes(id));
const complete = order => order.every((id, index) => id === index);

export class ShreddedReportScene extends BaseScene {
  constructor() { super({ key: 'ShreddedReportScene' }); }

  init(data = {}) {
    this.preview = data.preview !== false;
    this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.tiles = [];
    this.layerStates = [];
    this.parentPausedByMe = false;
    this.selected = null;
    this.dragged = null;
    this.finished = false;
    this.closing = false;
    this.checks = 0;
    this.savedOk = null;
    this.textureKey = null;
  }

  create() {
    super.create();
    this.cameras.main.setBackgroundColor('#171619');
    this.order = Phaser.Utils.Array.Shuffle([...IDS]);
    if (complete(this.order)) this.order.reverse();
    if (!this.preview) {
      const saved = MainStoryManager.getSideClue(KEY);
      if (saved?.version === 2 && valid(saved.order)) this.order = [...saved.order];
      if (Number.isInteger(saved?.checks) && saved.checks >= 0) this.checks = saved.checks;
      this.finished = MainStoryManager.hasFlag(FLAG);
      if (this.finished) this.order = [...IDS];
    }
    this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(640, 450, 1280, 900, 0x302729));
    this.root.add(this.add.rectangle(640, 480, 984, 624, 0x171416).setStrokeStyle(3, 0x957551));
    this.label(640, 45, 'THE PAPER TRAIL', 23, '#f0ce88', 'PressStart2P');
    this.label(640, 94, 'Join the broken stamp, ruled lines and torn words. No reading-order guesswork.', 22);
    this.label(640, 128, 'Drag one piece onto another to swap them. Or click two pieces.', 20, '#c6bba6');
    this.message = this.label(640, 813, '', 21);
    this.checkButton = this.button(380, 861, 'CHECK DOCUMENT', () => this.checkDocument());
    this.label(650, 861, this.preview ? 'PREVIEW / no story changes' : 'ARCHIVE / JM-041', 17, '#b9aa94');
    this.button(1025, 861, 'BACK', () => this.closeDocument());
    this.makeDocumentTexture();
    this.buildTiles();
    this.placeTiles();
    this.paint();
    this.message.setText('The red seal belongs to one document. Its fragments must meet.');
    if (this.finished) this.showSuccess();
    this.layout();
    this.trackInputEvent(this.scale, 'resize', this.layout);
    this.trackInputEvent(this.input, 'dragstart', this.dragStart);
    this.trackInputEvent(this.input, 'drag', this.dragMove);
    this.trackInputEvent(this.input, 'dragend', this.dragEnd);
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.restoreBackground();
      this.tiles.forEach(tile => tile.item.destroy());
      this.tiles = [];
      if (this.textureKey && this.textures.exists(this.textureKey)) this.textures.remove(this.textureKey);
      this.textureKey = null;
      this.onFinished = null;
    });
  }

  label(x, y, text, size = 21, color = '#eee2c8', font = 'SpecialElite') {
    const object = this.add.text(x, y, text, {
      fontFamily: `${font}, monospace`, fontSize: `${size}px`, color,
      align: 'center', wordWrap: { width: 1200 }
    }).setOrigin(0.5);
    this.root.add(object);
    return object;
  }

  button(x, y, text, callback) {
    const object = this.add.text(x, y, text, {
      fontFamily: 'SpecialElite, monospace', fontSize: '21px', color: '#f1d89d',
      backgroundColor: '#4a3933', padding: { x: 18, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    object.on('pointerdown', callback);
    this.root.add(object);
    return object;
  }

  makeDocumentTexture() {
    this.textureKey = `shredded-document-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const texture = this.textures.createCanvas(this.textureKey, PW, PH);
    const c = texture.getContext();
    c.fillStyle = '#e4d4ad';
    c.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 3800; i++) {
      c.fillStyle = i % 2 ? 'rgba(92,66,35,0.055)' : 'rgba(255,250,220,0.12)';
      c.fillRect((i * 137) % PW, (i * 83) % PH, 2, 1);
    }
    c.strokeStyle = '#8e7959'; c.lineWidth = 3;
    c.strokeRect(24, 24, PW - 48, PH - 48);
    c.strokeStyle = '#ad9671'; c.lineWidth = 1;
    c.strokeRect(32, 32, PW - 64, PH - 64);
    c.strokeStyle = 'rgba(165,66,54,0.45)';
    c.beginPath(); c.moveTo(61, 142); c.lineTo(61, 564); c.stroke();
    c.fillStyle = '#3c342a';
    c.font = 'bold 35px SpecialElite, monospace';
    c.fillText('MARK AGENCY', 78, 77);
    c.font = '22px SpecialElite, monospace';
    c.fillText('FIELD OPERATIONS / INTERNAL COPY', 78, 112);
    c.font = 'bold 27px SpecialElite, monospace';
    c.fillText('JM-041', 756, 76);
    c.strokeStyle = '#77664c'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(55, 140); c.lineTo(905, 140); c.stroke();
    const lines = [
      ['SUBJECT: John McClane', 180],
      ['Recovered object cleared for transport.', 228],
      ['Handover completed before departure.', 276],
      ['Contact lost during the transport operation.', 324],
      ['Supporting records: restricted circulation.', 372]
    ];
    c.font = '24px SpecialElite, monospace';
    for (const [text, y] of lines) {
      c.fillStyle = '#44392c'; c.fillText(text, 80, y);
      c.strokeStyle = 'rgba(91,105,114,0.38)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(77, y + 12); c.lineTo(890, y + 12); c.stroke();
    }
    c.save();
    c.translate(696, 402); c.rotate(-0.19);
    c.strokeStyle = 'rgba(151,44,37,0.82)'; c.fillStyle = 'rgba(151,44,37,0.82)';
    c.lineWidth = 5; c.beginPath(); c.ellipse(0, 0, 150, 85, 0, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 138, 74, 0, 0, Math.PI * 2); c.stroke();
    c.textAlign = 'center'; c.font = 'bold 29px monospace'; c.fillText('RESTRICTED', 0, -5);
    c.font = '19px monospace'; c.fillText('MARK AGENCY', 0, 25);
    c.restore();
    c.fillStyle = '#453b31'; c.font = '21px SpecialElite, monospace';
    c.fillText('Supporting annex filed separately.', 80, 465);
    c.fillText('Report prepared by:', 80, 520);
    c.save(); c.translate(361, 520); c.rotate(-0.045);
    c.fillStyle = '#324c69'; c.font = 'italic 43px cursive'; c.fillText('Marcus', 0, 0);
    c.strokeStyle = '#324c69'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-12, 10); c.bezierCurveTo(58, -3, 107, 26, 199, 3); c.stroke(); c.restore();
    c.fillStyle = '#5d5141'; c.font = '17px SpecialElite, monospace';
    c.fillText('Distribution: Records Office / sealed annex', 80, 557);
    c.strokeStyle = 'rgba(100,69,32,0.17)'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(844, 220, 43, 49, 0.2, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(99,75,43,0.20)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 95); c.bezierCurveTo(280, 105, 580, 87, 960, 102); c.stroke();
    c.beginPath(); c.moveTo(112, 0); c.bezierCurveTo(103, 210, 129, 390, 115, 600); c.stroke();
    c.beginPath(); c.moveTo(0, 490); c.bezierCurveTo(290, 503, 620, 479, 960, 493); c.stroke();
    texture.refresh();
    IDS.forEach(id => texture.add(`piece-${id}`, 0,
      (id % COLS) * TW, Math.floor(id / COLS) * TH, TW, TH));
  }

  buildTiles() {
    IDS.forEach(id => {
      const item = this.add.container(0, 0).setSize(TW, TH);
      const image = this.add.image(0, 0, this.textureKey, `piece-${id}`).setDisplaySize(TW - 3, TH - 3);
      const border = this.add.rectangle(0, 0, TW - 2, TH - 2).setStrokeStyle(3, 0xe8b65b).setVisible(false);
      item.add([image, border]); this.root.add(item);
      item.setData('pieceId', id).setInteractive({ useHandCursor: true });
      this.input.setDraggable(item);
      item.on('pointerdown', () => item.setData('moved', false));
      item.on('pointerup', pointer => {
        if (!this.finished && !this.closing && !item.getData('moved') && pointer.getDistance() <= 8) this.select(id);
      });
      this.tiles[id] = { item, image, border };
    });
  }

  position(index) {
    return { x: LEFT + (index % COLS) * TW + TW / 2,
      y: TOP + Math.floor(index / COLS) * TH + TH / 2 };
  }

  placeTiles() {
    this.order.forEach((id, index) => {
      const p = this.position(index);
      this.tiles[id].item.setPosition(p.x, p.y).setAlpha(1);
    });
  }

  paint() { this.tiles.forEach((tile, id) => tile.border.setVisible(this.selected === id)); }

  swap(first, second) {
    if (first !== second) [this.order[first], this.order[second]] = [this.order[second], this.order[first]];
    this.placeTiles();
    this.persist();
  }

  select(id) {
    if (this.dragged?.getData('moved')) return;
    if (this.selected === id) this.selected = null;
    else if (this.selected === null) this.selected = id;
    else {
      this.swap(this.order.indexOf(this.selected), this.order.indexOf(id));
      this.selected = null;
    }
    this.paint();
  }

  dragStart(_pointer, item) {
    if (this.finished || this.closing || !item?.data?.has('pieceId')) return;
    this.dragged = item;
    item.setData('moved', false);
    this.root.bringToTop(item);
  }

  dragMove(pointer, item) {
    if (item !== this.dragged || pointer.getDistance() <= 8) return;
    item.setData('moved', true);
    this.selected = null; this.paint();
    item.setAlpha(0.85);
    item.setPosition((pointer.x - this.root.x) / this.root.scaleX,
      (pointer.y - this.root.y) / this.root.scaleY);
  }

  dragEnd(pointer, item) {
    if (item !== this.dragged) return;
    const moved = item.getData('moved');
    this.dragged = null;
    if (moved) {
      const x = (pointer.x - this.root.x) / this.root.scaleX - LEFT;
      const y = (pointer.y - this.root.y) / this.root.scaleY - TOP;
      if (x >= 0 && x < PW && y >= 0 && y < PH) {
        this.swap(this.order.indexOf(item.getData('pieceId')), Math.floor(y / TH) * COLS + Math.floor(x / TW));
      } else this.placeTiles();
    } else this.placeTiles();
  }

  checkDocument() {
    if (this.finished || this.closing || this.dragged?.getData('moved')) return;
    this.checks += 1;
    if (!complete(this.order)) {
      this.message.setText('Not aligned yet. Follow the red seal, the blue signature and the ruled lines.');
      this.persist();
      return;
    }
    this.finished = true; this.selected = null;
    this.persist(); this.showSuccess();
    if (!this.preview) this.emitBus('archive:shreddedReportCompleted', { documentId: 'JM-041', author: 'Marcus' });
  }

  persist() {
    if (this.preview) return;
    MainStoryManager.setSideClue(KEY, {
      version: 2, order: [...this.order], checks: this.checks, completed: this.finished,
      documentId: 'JM-041', author: this.finished ? 'Marcus' : null,
      lead: this.finished ? 'supporting_annex_filed_separately' : null
    });
    if (this.finished) MainStoryManager.setFlag(FLAG, true);
    this.savedOk = saveGameState();
  }

  showSuccess() {
    this.checkButton.setVisible(false); this.paint();
    this.tiles.forEach(tile => {
      tile.item.disableInteractive(); tile.image.setDisplaySize(TW, TH);
    });
    this.message.setText(this.preview ? 'RESTORED / Marcus signed the report. The annex was filed separately. / PREVIEW' :
      this.savedOk === false ? 'RESTORED / Saving failed. Save manually before leaving the game.' :
      'RESTORED / Marcus signed the report. The annex was filed separately.');
  }

  layout() {
    if (!this.root) return;
    if (this.dragged) {
      this.dragged.setData('moved', true); this.dragged = null; this.placeTiles();
    }
    const { width, height } = this.scale;
    const s = Math.min(width / 1280, height / 900);
    this.root.setScale(s).setPosition((width - 1280 * s) / 2, (height - 900 * s) / 2);
  }

  suspendBackground() {
    this.layerStates = ['PlayerHudScene', 'UIScene', 'NewsHud'].filter(key => this.isSceneActive(key)).map(key => {
      const visible = this.getRegisteredScene(key).sys.settings.visible;
      this.scene.setVisible(false, key); this.scene.pause(key);
      return { key, visible };
    });
    if (this.returnSceneKey && this.isSceneActive(this.returnSceneKey)) {
      this.parentPausedByMe = true; this.scene.pause(this.returnSceneKey);
    }
  }

  restoreBackground() {
    for (const { key, visible } of this.layerStates) {
      if (!this.hasScene(key)) continue;
      this.scene.setVisible(visible, key);
      if (this.isScenePaused(key)) this.scene.resume(key);
    }
    this.layerStates = [];
    if (this.parentPausedByMe && this.isScenePaused(this.returnSceneKey)) this.scene.resume(this.returnSceneKey);
    this.parentPausedByMe = false;
  }

  closeDocument() {
    if (this.closing) return;
    this.closing = true;
    this.persist();
    const callback = this.onFinished;
    this.onFinished = null;
    this.restoreBackground();
    try { callback?.({ completed: this.finished, preview: this.preview, saved: this.savedOk }); }
    finally { this.scene.stop(); }
  }
}
