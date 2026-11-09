import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { BUSINESS_CENTER_CONFIG as CONFIG } from '../config/businessCenterConfig.js';

export class BusinessCenterScene extends BaseScene {
  constructor() { super({ key: CONFIG.sceneKey }); }
  init() {
    this.disposed = false;
    this.navigating = false;
    this.panelOpen = false;
    this.token = Symbol(CONFIG.sceneKey);
    this.room = null;
    this.dialogue = null;
    this.hotspots = [];
    this.hiddenHud = null;
  }
  create() {
    super.create();
    this.registry.set('currentSceneKey', CONFIG.sceneKey);
    this.events.once('shutdown', this.disposeCenter, this);
    this.events.once('destroy', this.disposeCenter, this);
    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
    const news = this.getRegisteredScene('NewsHud');
    news?.closeMenu?.(true);
    news?.setHudVisible?.(false);
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      if (this.hasScene(key)) this.scene.setVisible(false, key);
    }
    const hud = document.getElementById('hud-container');
    if (hud) {
      this.hiddenHud = hud;
      this.previousHudDisplay = hud.style.display;
      hud.style.display = 'none';
    }
    this.cameras.main.setBackgroundColor('#192127');
    this.dialogue = new HomeTownDialogue(this, () => this.closePanel());
    this.buildRoom();
    this.trackInputEvent(this.scale, 'resize', this.layoutRoom);
    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard, 'keydown-ESC', this.onEscape);
    }
    this.layoutRoom();
  }
  text(x, y, value, size = 22, color = '#f1dfaf', width = 0) {
    const object = this.add.text(x, y, value, {
      fontFamily: 'SpecialElite, monospace', fontSize: size, color,
      ...(width ? { wordWrap: { width } } : {})
    });
    this.room.add(object);
    return object;
  }
  buildRoom() {
    this.room = this.add.container(0, 0);
    const g = this.add.graphics();
    this.room.add(g);
    g.fillStyle(0xb1ada0).fillRect(0, 0, 1280, 720);
    g.fillStyle(0x78877c).fillRect(0, 260, 1280, 180);
    g.fillStyle(0x5c615b).fillRect(0, 440, 1280, 280);
    g.lineStyle(2, 0x7f847a);
    for (let y = 480; y < 720; y += 50) g.lineBetween(0, y, 1280, y);
    for (let x = 0; x <= 1280; x += 100) g.lineBetween(640 + (x - 640) * .65, 440, x, 720);
    g.fillStyle(0x414a46).fillRect(0, 0, 1280, 40);
    g.fillStyle(0xe2d7ad).fillRect(180, 66, 250, 14).fillRect(810, 66, 250, 14);
    g.fillStyle(0x4b514a).fillRect(920, 155, 215, 285);
    g.fillStyle(0x8c9790).fillRect(934, 170, 185, 270);
    g.lineStyle(3, 0x454f49).lineBetween(1026, 170, 1026, 440);
    g.fillStyle(0x373d37).fillRect(1145, 267, 28, 60);
    g.fillStyle(0xa08e60).fillCircle(1159, 286, 5).fillCircle(1159, 308, 5);
    g.fillStyle(0x4a4030).fillRect(80, 145, 260, 245);
    g.fillStyle(0x293f3d).fillRect(93, 158, 234, 218);
    g.lineStyle(1, 0x8c9279);
    for (let y = 225; y <= 340; y += 38) g.lineBetween(110, y, 310, y);
    g.fillStyle(0x493b2d).fillRect(410, 350, 420, 160);
    g.fillStyle(0x9d855a).fillRect(395, 337, 450, 22);
    g.fillStyle(0xb6a078).fillRect(432, 380, 376, 100);
    g.fillStyle(0x323a35).fillRect(695, 276, 80, 60);
    g.fillStyle(0x697765).fillRect(702, 283, 66, 43);
    g.fillStyle(0x323a35).fillRect(728, 330, 12, 11);
    g.fillStyle(0xd6c9a1).fillEllipse(480, 330, 32, 12);
    g.fillStyle(0x878c7e).fillCircle(480, 325, 12);
    g.fillStyle(0xad8d54).fillRect(60, 465, 130, 85).fillRect(183, 487, 110, 70);
    g.lineStyle(3, 0x76603b).lineBetween(125, 465, 125, 550).lineBetween(235, 487, 235, 557);
    g.fillStyle(0xddad42).fillRect(880, 385, 300, 20);
    g.lineStyle(9, 0x3b3931);
    for (let x = 885; x < 1160; x += 32) g.lineBetween(x, 404, x + 24, 386);
    g.fillStyle(0xb17a39).fillTriangle(865, 495, 885, 435, 905, 495);
    g.fillStyle(0xe4d5ac).fillRect(874, 458, 22, 9);
    g.fillStyle(0x655341).fillRect(350, 125, 12, 190).fillRect(430, 125, 12, 190);
    g.lineStyle(8, 0x655341);
    for (let y = 150; y < 300; y += 32) g.lineBetween(356, y, 436, y);
    this.text(422, 105, CONFIG.title, 30);
    this.text(443, 400, 'RECEPTION', 28, '#3b3528');
    this.text(119, 175, 'TENANT DIRECTORY', 19);
    this.text(123, 238, 'Coming soon.\nPossibly.', 23);
    this.text(944, 120, 'OFFICES', 24);
    this.text(855, 342, CONFIG.status, 20, '#ffdc7b');
    this.text(414, 533, 'Please excuse the dust.\nIt has seniority.', 23);
    this.text(28, 646, 'Click reception, the tenant directory or the lift.', 21);
    this.addHotspot(620, 402, 450, 190, 'Reception', () => this.show('Reception', CONFIG.receptionText));
    this.addHotspot(210, 268, 260, 245, 'Tenant directory', () => this.show('Tenant directory', CONFIG.directoryText));
    this.addHotspot(1028, 280, 225, 285, 'Offices / under construction', () => this.show('Under construction', CONFIG.elevatorText));
    this.exitButton = this.add.text(18, 16, '< Back to town', {
      fontFamily: 'SpecialElite, monospace', fontSize: 20,
      color: '#ffe0a0', backgroundColor: '#24352e', padding: { x: 12, y: 10 }
    }).setDepth(100).setInteractive({ useHandCursor: true });
    this.exitButton.on('pointerdown', () => void this.leave());
  }
  addHotspot(x, y, width, height, label, action) {
    const rect = this.add.rectangle(x, y, width, height, 0xffd27d, 0)
      .setInteractive({ useHandCursor: true });
    const title = this.add.text(x, y - height / 2 - 8, label, {
      fontFamily: 'SpecialElite, monospace', fontSize: 20,
      color: '#ffe4a5', backgroundColor: '#23362f', padding: { x: 8, y: 5 }
    }).setOrigin(.5, 1).setVisible(false);
    this.room.add([rect, title]);
    rect.on('pointerover', () => { if (!this.panelOpen && !this.navigating) title.setVisible(true); });
    rect.on('pointerout', () => title.setVisible(false));
    rect.on('pointerdown', () => { if (!this.panelOpen && !this.navigating) action(); });
    this.hotspots.push({ rect, title });
  }
  layoutRoom() {
    if (this.disposed || !this.room) return;
    const { width, height } = this.scale;
    const scale = Math.min(width / 1280, height / 720);
    this.room.setScale(scale).setPosition((width - 1280 * scale) / 2, (height - 720 * scale) / 2);
  }
  refreshHotspots() {
    for (const { rect, title } of this.hotspots) {
      if (rect.input) rect.input.enabled = !this.panelOpen && !this.navigating;
      title.setVisible(false);
    }
  }
  show(title, text) {
    if (this.disposed || this.navigating) return;
    this.panelOpen = true;
    this.refreshHotspots();
    this.dialogue.show({ title, text, choices: [['Back to reception.', () => this.closePanel()]] });
  }
  closePanel() {
    this.dialogue?.close(false);
    this.panelOpen = false;
    if (!this.disposed) this.refreshHotspots();
  }
  onEscape(event) {
    if (event?.repeat || this.disposed || this.navigating) return;
    event?.preventDefault();
    if (this.panelOpen) this.closePanel();
    else void this.leave();
  }
  async leave() {
    if (this.disposed || this.navigating) return false;
    this.navigating = true;
    this.refreshHotspots();
    const token = this.token;
    try {
      const result = await this.goto('HomeCityScene', {
        entryPoint: CONFIG.buildingId, fromScene: CONFIG.sceneKey, gameState
      });
      if (result === false && !this.disposed && token === this.token) this.navigationError();
      return result !== false;
    } catch (error) {
      console.error('[BusinessCenterScene]', error);
      if (!this.disposed && token === this.token) this.navigationError();
      return false;
    }
  }
  navigationError() {
    this.navigating = false;
    this.show('Exit', 'The town could not be opened. Please try again.');
  }
  disposeCenter() {
    if (this.disposed) return;
    this.disposed = true;
    this.token = null;
    this.dialogue?.destroy();
    this.dialogue = null;
    if (this.hiddenHud) this.hiddenHud.style.display = this.previousHudDisplay;
    this.hiddenHud = null;
    this.hotspots = [];
    this.events.off('shutdown', this.disposeCenter, this);
    this.events.off('destroy', this.disposeCenter, this);
  }
}
