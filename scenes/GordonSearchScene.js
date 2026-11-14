import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { loadJson } from '../config/loadJson.js';
import { GordonHotspotDebug } from './gordon/GordonHotspotDebug.js';
import { openGordonPrivacyPanel, closeGordonEthicsPanel } from './gordon/GordonEthicsUI.js';
import { readGordonEthics } from '../gordonEthicsModel.js';
import { prepareGordonPaperAudio } from './gordon/GordonPaperAudio.js';
const DATA = await loadJson('../assets/data/gordonFirstInterview.json', import.meta.url);
export class GordonSearchScene extends BaseScene {
  constructor() { super({ key: 'GordonSearchScene' }); }
  init(data = {}) {
    this.preview = data.preview === true; this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.hotspots = []; this.modal = null; this.dialogue = null; this.closing = false; this.previewEthics = readGordonEthics(null);
    this.layerStates = []; this.parentPausedByMe = false; this.statusTimer = null; this.hotspotDebug = null;
    this.definitions = DATA.hotspots.filter(def => def.id !== 'gordon').map(def => ({ ...def }));
  }
  preload() {
    prepareGordonPaperAudio(this);
    const asset = DATA.backgrounds.empty;
    if (!this.textures.exists(asset.key)) this.load.image(asset.key, asset.url);
  }
  create() {
    super.create(); this.cameras.main.setBackgroundColor('rgba(0,0,0,0)'); this.root = this.add.container(0, 0);
    this.allowed = this.preview || MainStoryManager.hasFlag('gordon_door_access_bypassed');
    if (this.allowed && this.textures.exists(DATA.backgrounds.empty.key)) {
      this.root.add(this.add.image(960, 540, DATA.backgrounds.empty.key).setDisplaySize(1920, 1080));
    }
    this.label(35, 25, __dialogueText("scenes/GordonSearchScene.js", "t_d931ccfc74e70e3ad129"), 22).setOrigin(0, 0);
    this.outline = this.add.graphics(); this.root.add(this.outline); this.tooltip = this.label(0, 0, '', 20).setVisible(false);
    for (const def of this.definitions) {
      const zone = this.add.zone(def.x, def.y, def.w, def.h).setOrigin(0).setInteractive({ useHandCursor: true });
      this.root.add(zone); const hotspot = { def, zone }; this.hotspots.push(hotspot);
      zone.on('pointerover', () => {
        if (this.closing || this.modal || this.hotspotDebug?.enabled || !this.allowed) return;
        this.tooltip.setText(def.label).setPosition(def.x + def.w / 2, Math.max(90, def.y - 12)).setVisible(true);
        this.root.bringToTop(this.tooltip);
      });
      zone.on('pointerout', () => this.tooltip.setVisible(false));
      zone.on('pointerdown', () => {
        if (this.modal) return;
        if (this.hotspotDebug?.enabled) { this.hotspotDebug.select(hotspot); return; }
        if (!this.allowed || this.closing) return;
        if (def.id === 'door') { this.closeSearch(); return; }
        if (def.id === 'folder') { openGordonPrivacyPanel(this); return; }
        const messages = {
          safe: __dialogueText("scenes/GordonSearchScene.js", "t_98036681b892cc28a31a"),
          access: __dialogueText("scenes/GordonSearchScene.js", "t_04026d76bb01b9a0596c"),
          telephone: __dialogueText("scenes/GordonSearchScene.js", "t_0d74aa11ee5a7f9dc6fd")
        };
        this.showStatus(messages[def.id] || __dialogueText("scenes/GordonSearchScene.js", "t_44bb65186bd3f77f11e3"));
      });
    }
    this.status = this.label(960, 85, '', 25).setVisible(false);
    this.back = this.label(170, 1028, __dialogueText("scenes/GordonSearchScene.js", "t_db26b7d387791ba818bb"), 23).setInteractive({ useHandCursor: true });
    this.back.on('pointerdown', () => { if (!this.modal && !this.hotspotDebug?.enabled) this.closeSearch(); });
    this.label(960, 1028, this.preview ? __dialogueText("scenes/GordonSearchScene.js", "t_db1d7313ec962ed15287") : __dialogueText("scenes/GordonSearchScene.js", "t_5113ce88552cc1067d24"), 20);
    this.hotspotDebug = new GordonHotspotDebug(this, this.hotspots); this.layout();
    this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown-ESC', event => {
      if (event.repeat) return;
      if (this.modal) closeGordonEthicsPanel(this);
      else if (this.hotspotDebug.enabled) this.hotspotDebug.setEnabled(false); else this.closeSearch();
    });
    this.suspendBackground();
    this.showStatus(this.allowed ? __dialogueText("scenes/GordonSearchScene.js", "t_cff35560974448db66a0") : __dialogueText("scenes/GordonSearchScene.js", "t_7b7624dccd9ee0badcd8"));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      closeGordonEthicsPanel(this); this.statusTimer?.remove(false); this.hotspotDebug?.destroy();
      this.restoreBackground(); this.onFinished = null;
    });
  }
  label(x, y, text, size = 23) {
    const object = this.add.text(x, y, text, { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`,
      color: '#ffe2ae', backgroundColor: '#10231a', padding: { x: 12, y: 8 }, align: 'center', wordWrap: { width: 1500 } }).setOrigin(0.5);
    this.root.add(object); return object;
  }
  showStatus(text) {
    this.statusTimer?.remove(false); this.status.setText(text).setVisible(true); this.root.bringToTop(this.status);
    this.statusTimer = this.time.delayedCall(8500, () => this.status?.setVisible(false));
  }
  layout() {
    if (!this.root) return;
    const { width, height } = this.scale, s = Math.min(width / 1920, height / 1080);
    this.root.setScale(s).setPosition((width - 1920 * s) / 2, (height - 1080 * s) / 2);
  }
  suspendBackground() {
    this.layerStates = ['PlayerHudScene', 'UIScene', 'NewsHud'].filter(key => this.isSceneActive(key)).map(key => {
      const visible = this.getRegisteredScene(key).sys.settings.visible;
      this.scene.setVisible(false, key); this.scene.pause(key); return { key, visible };
    });
    if (this.returnSceneKey && this.isSceneActive(this.returnSceneKey)) { this.parentPausedByMe = true; this.scene.pause(this.returnSceneKey); }
  }
  restoreBackground() {
    for (const { key, visible } of this.layerStates) {
      if (!this.hasScene(key)) continue;
      this.scene.setVisible(visible, key); if (this.isScenePaused(key)) this.scene.resume(key);
    }
    this.layerStates = [];
    if (this.parentPausedByMe && this.isScenePaused(this.returnSceneKey)) this.scene.resume(this.returnSceneKey);
    this.parentPausedByMe = false;
  }
  closeSearch() {
    if (this.closing) return;
    this.closing = true; closeGordonEthicsPanel(this); const callback = this.onFinished; this.onFinished = null; this.restoreBackground();
    try { callback?.({ completed: false, doorUnlocked: this.allowed, preview: this.preview, mode: 'gordon_search' }); }
    finally { this.scene.stop(); }
  }
}
