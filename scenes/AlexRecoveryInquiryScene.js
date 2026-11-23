import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { storageRoomDialogues } from '../storageRoomDialogueService.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { alexRecoveryData as DATA, getAlexRecoveryStory, storeAlexRecovery } from '../alexRecoveryInquiryService.js';
import { normalizeAlexRecovery, selectRecoveryDiscrepancy, advanceAlexRecovery } from './storage/AlexRecoveryModel.js';
const KEY = 'AlexRecoveryInquiryScene';
const T = id => __dialogueText('scenes/AlexRecoveryInquiryScene.js', id);

export class AlexRecoveryInquiryScene extends BaseScene {
  constructor() { super({ key: KEY }); }
  init(data = {}) {
    this.preview = data.preview === true; this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.progress = null; this.closing = false; this.savedOk = null; this.inputLockedUntil = 0;
    this.layerStates = []; this.parentPausedByMe = false; this.conversationPanel = null; this.disposed = false;
  }
  preload() {
    if (!this.textures.exists('portrait_magazine')) this.load.image('portrait_magazine', 'assets/portraits/magazine_manager.webp');
  }
  create() {
    super.create(); this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    const story = getAlexRecoveryStory(); this.allowed = this.preview || story.eligible;
    this.progress = normalizeAlexRecovery(DATA, this.preview ? null : story);
    this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(800, 500, 1600, 1000, 0x000000, 0.84).setInteractive());
    this.paper = this.add.rectangle(800, 500, 1480, 790, 0xeee2c4).setStrokeStyle(4, 0xa28a56); this.root.add(this.paper);
    this.text(740, 60, T('t_cdea50fc71c1d419ff4f'), 22, 1200, '#ffe2ae', this.root, 'PressStart2P');
    this.button(1420, 60, T('t_01244bcb87769b89d93f'), () => this.closeVisit(), this.root);
    this.content = this.add.container(0, 0); this.root.add(this.content);
    this.footer = this.text(800, 955, '', 19, 1450, '#ffe2ae', this.root);
    this.conversationPanel = new HomeTownDialogue(this, () => this.closeVisit());
    this.render(); this.layout(); this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.disposeInquiry, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.disposeInquiry, this);
  }
  text(x, y, value, size = 27, width = 1340, color = '#342d23', parent = this.content, font = 'SpecialElite') {
    const object = this.add.text(x, y, value, { fontFamily: `${font}, monospace`, fontSize: `${size}px`,
      color, align: 'center', wordWrap: { width }, lineSpacing: 7 }).setOrigin(0.5);
    parent.add(object); return object;
  }
  button(x, y, label, callback, parent = this.content) {
    const object = this.add.text(x, y, label, { fontFamily: 'SpecialElite', fontSize: '24px', color: '#ffe2ae',
      backgroundColor: '#294331', padding: { x: 18, y: 12 }, align: 'center' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    object.on('pointerdown', (_p, _x, _y, event) => {
      event?.stopPropagation();
      if (this.disposed || this.closing || this.time.now < this.inputLockedUntil) return;
      this.inputLockedUntil = this.time.now + 180; callback();
    }); parent.add(object); return object;
  }
  statusMessage() {
    if (this.preview) return T('t_ccebeaef7fdf313f0e21');
    return this.savedOk === false ? DATA.messages.saveFailed : T('t_42f0df3f2cdfa562ab6a');
  }
  persist() {
    if (this.preview || !this.allowed) return;
    const result = storeAlexRecovery(this.progress); this.savedOk = result.saved;
    this.footer.setText(result.success ? result.saved ? T('t_13d802933193c7b1c7af') : DATA.messages.saveFailed : T('t_14c7282de820c31e9c54'));
  }
  render() {
    if (this.disposed) return;
    this.clearConversation(); this.content.removeAll(true); this.footer.setText(this.statusMessage());
    const talking = this.allowed && this.progress.phase === 'confession';
    this.paper.setVisible(!talking); this.footer.setVisible(!talking);
    if (!this.allowed) { this.text(800, 480, T('t_567a5e8bf3956fc2a40b'), 31); return; }
    if (this.progress.phase === 'comparison') {
      this.text(800, 185, DATA.opening, 25, 1370);
      this.text(800, 310, T('t_16b233423c2b51f7c554') + DATA.reference, 26);
      this.text(400, 395, 'ITEM', 27, 540); this.text(940, 395, 'ISSUED', 27, 220);
      this.text(1320, 395, T('t_4fff6391e5130648830b'), 25, 350);
      DATA.items.forEach((item, index) => {
        const y = 480 + index * 82;
        this.button(400, y, item.label, () => this.selectItem(item.id));
        this.text(940, y, String(item.issued), 32, 200); this.text(1320, y, String(item.accounted), 32, 200);
      });
      this.notice = this.text(800, 845, T('t_416b43ab34c6a70fc275'), 23, 1380); return;
    }
    if (talking) { this.showConfession(); return; }
    this.text(800, 220, T('t_ab8b41ccb2403538ef5c'), 30);
    this.text(800, 465, T('t_86d5af1b9ceadfd0a419'), 31); this.text(800, 680, DATA.objective, 27);
    this.button(800, 815, T('t_acbd88a81a5caacdc5b8'), () => this.closeVisit());
  }
  showConfession() {
    const line = DATA.confession[this.progress.line];
    if (!line || !this.conversationPanel || this.conversationPanel.destroyed) return;
    const npc = line.speaker === storageRoomDialogues.speaker;
    const lastLine = this.progress.line === DATA.confession.length - 1;
    const text = line.text + (!this.preview && this.savedOk === false ? '\n\n' + DATA.messages.saveFailed : '');
    this.conversationPanel.show({ title: line.speaker, text,
      messages: [{ speaker: npc ? 'npc' : 'player', text }],
      npcId: 'alex_murphy', showTrust: true, scoreTrust: false, depth: 6000,
      nodeId: `alex_recovery_confession:${this.progress.line}`,
      onAdvance: () => this.commitConfessionLine(),
      choices: [{ id: `alex_recovery_continue:${this.progress.line}`,
        label: lastLine ? T('t_9b2343ff3df65010bb92') : 'Continue', attitude: 'neutral', scoreTrust: false,
        action: () => this.continueConfession() }] });
  }
  continueConfession() {
    if (this.disposed || this.closing || !this.allowed || this.progress.phase !== 'confession') return;
    this.conversationPanel?.advance();
  }
  commitConfessionLine() {
    if (this.disposed || this.closing || !this.allowed || this.progress.phase !== 'confession' || this.time.now < this.inputLockedUntil) return;
    this.inputLockedUntil = this.time.now + 180; this.advance();
  }
  clearConversation() { this.conversationPanel?.close(false); }
  selectItem(id) {
    if (this.disposed || this.closing) return;
    const result = selectRecoveryDiscrepancy(DATA, this.progress, id);
    if (result.ignored) return;
    this.progress = result.state; this.persist();
    if (result.ok) this.render(); else this.notice.setText(T('t_3a021dd76c20f18e2a42'));
  }
  advance() {
    if (this.disposed || this.closing) return;
    this.progress = advanceAlexRecovery(DATA, this.progress); this.persist(); this.render();
  }
  layout() {
    if (this.disposed || !this.root) return;
    const { width, height } = this.scale, scale = Math.min(width / 1600, height / 1000);
    this.root.setScale(scale).setPosition((width - 1600 * scale) / 2, (height - 1000 * scale) / 2);
  }
  onKey(event) {
    if (this.disposed || this.closing || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
      event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (this.conversationPanel?.root) return;
    if (event.code === 'Escape') { event.preventDefault(); this.closeVisit(); }
  }
  suspendBackground() {
    this.layerStates = ['PlayerHudScene', 'UIScene', 'NewsHud'].filter(key => this.isSceneActive(key)).map(key => {
      const visible = this.getRegisteredScene(key).sys.settings.visible;
      this.scene.setVisible(false, key); this.scene.pause(key); return { key, visible };
    });
    if (this.returnSceneKey && this.isSceneActive(this.returnSceneKey)) {
      this.parentPausedByMe = true; this.scene.pause(this.returnSceneKey);
    }
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
  closeVisit() {
    if (this.disposed || this.closing) return;
    this.closing = true; this.persist(); this.clearConversation();
    const callback = this.onFinished; this.onFinished = null; this.restoreBackground();
    try { callback?.({ preview: this.preview, completed: this.allowed && this.progress.phase === 'complete', saved: this.savedOk }); }
    finally { this.scene.stop(); }
  }
  disposeInquiry() {
    if (this.disposed) return;
    this.disposed = true; this.conversationPanel?.destroy(); this.conversationPanel = null;
    this.restoreBackground(); this.onFinished = null;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.disposeInquiry, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.disposeInquiry, this);
  }
}
