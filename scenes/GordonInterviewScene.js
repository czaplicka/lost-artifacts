import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { gordonInterviewData as DATA, getGordonInterviewState, beginGordonQuestion,
  completeGordonReply, completeGordonDismissal } from '../gordonInterviewService.js';
import { normalizeGordonInterview, planGordonQuestion, acknowledgeGordonReply } from '../gordonInterviewModel.js';
import { GordonHotspotDebug } from './gordon/GordonHotspotDebug.js';
import { installGordonEthicsInterview } from './gordon/GordonEthicsUI.js';
const KEY = 'GordonInterviewScene';
const T = id => __dialogueText('scenes/GordonInterviewScene.js', id);

export class GordonInterviewScene extends BaseScene {
  constructor() { super({ key: KEY }); }
  init(data = {}) {
    this.preview = data.preview !== false; this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.local = normalizeGordonInterview(DATA, {});
    this.modal = null; this.dialogue = null; this.sharedDialogue = null;
    this.presentationHandle = null; this.presentationLeave = null; this.presentationAdvance = null;
    this.presentationVersion = 0; this.hotspots = []; this.definitions = DATA.hotspots.map(def => ({ ...def }));
    this.closing = false; this.disposed = false; this.introShown = false; this.savedOk = null;
    this.hotspotDebug = null; this.layerStates = []; this.parentPausedByMe = false; this.statusTimer = null;
  }
  preload() {
    for (const asset of Object.values(DATA.backgrounds)) {
      if (!this.textures.exists(asset.key)) this.load.image(asset.key, asset.url);
    }
  }
  state() { return this.preview ? { ...this.local, unlocked: true } : getGordonInterviewState(); }
  create() {
    super.create(); this.cameras.main.setBackgroundColor('#080b08'); this.root = this.add.container(0, 0);
    this.allowed = this.state().unlocked;
    if (this.textures.exists(DATA.backgrounds.occupied.key)) {
      this.root.add(this.add.image(960, 540, DATA.backgrounds.occupied.key).setDisplaySize(1920, 1080));
    } else this.root.add(this.add.text(100, 150, T('t_f10ce971f188a51de4e6') + DATA.backgrounds.occupied.url,
      { fontFamily: 'SpecialElite', fontSize: '30px', color: '#ffaaaa' }));
    this.label(35, 25, T('t_0ee4e045609ac508cc86'), 22).setOrigin(0, 0);
    this.outline = this.add.graphics(); this.root.add(this.outline);
    this.tooltip = this.label(0, 0, '', 20).setVisible(false);
    this.definitions.forEach(def => {
      const zone = this.add.zone(def.x, def.y, def.w, def.h).setOrigin(0).setInteractive({ useHandCursor: true });
      this.root.add(zone); const hotspot = { def, zone }; this.hotspots.push(hotspot);
      zone.on('pointerover', () => {
        if (this.blocked() || this.hotspotDebug?.enabled) return;
        this.drawHotspots(def); this.tooltip.setText(def.label)
          .setPosition(def.x + def.w / 2, Math.max(90, def.y - 12)).setVisible(true);
        this.root.bringToTop(this.tooltip);
      });
      zone.on('pointerout', () => { this.tooltip.setVisible(false); this.drawHotspots(); });
      zone.on('pointerdown', () => {
        if (this.hotspotDebug?.enabled) { this.hotspotDebug.select(hotspot); return; }
        if (!this.blocked()) this.activate(def.id);
      });
    });
    this.status = this.label(960, 80, '', 24).setVisible(false);
    this.back = this.label(175, 1028, T('t_db26b7d387791ba818bb'), 23).setInteractive({ useHandCursor: true });
    this.back.on('pointerdown', () => { if (!this.blocked() && !this.hotspotDebug?.enabled) this.closeInterview(); });
    this.mode = this.label(960, 1028, this.preview ? T('t_db1d7313ec962ed15287') : T('t_5324b7d9c4590071b905'), 19);
    this.sharedDialogue = new HomeTownDialogue(this, () => this.presentationLeave?.());
    this.hotspotDebug = new GordonHotspotDebug(this, this.hotspots);
    this.layout(); this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onConversationKey);
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.disposeInterview, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.disposeInterview, this);
    const state = this.state();
    if (!state.unlocked) this.showStatus(T('t_688af0b65933da3d502e'));
    else if (state.pendingTopic) this.resumeReply();
    else if (state.dismissalPending) this.showDismissal();
    else if (state.completed) this.showStatus(T('t_5a95c071d7f7aac3f18c'));
  }
  blocked() { return this.disposed || this.closing || Boolean(this.modal) || Boolean(this.dialogue); }
  label(x, y, text, size = 25) {
    const object = this.add.text(x, y, text, { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`,
      color: '#ffe2ae', backgroundColor: '#10231a', padding: { x: 12, y: 8 },
      align: 'center', wordWrap: { width: 1500 } }).setOrigin(0.5);
    this.root.add(object); return object;
  }
  drawHotspots(hover = null) {
    this.outline.clear(); if (this.hotspotDebug?.enabled) return;
    for (const { def } of this.hotspots) {
      if (hover?.id === def.id) this.outline.lineStyle(3, 0xffd176, 0.9).strokeRect(def.x, def.y, def.w, def.h);
    }
  }
  showStatus(text) {
    if (this.disposed || !this.status?.active) return;
    this.statusTimer?.remove(false); this.status.setText(text ?? '').setVisible(true); this.root.bringToTop(this.status);
    this.statusTimer = this.time.delayedCall(8500, () => {
      this.statusTimer = null; if (!this.disposed) this.status?.setVisible(false);
    });
  }
  activate(id) {
    if (this.hotspotDebug?.enabled) return;
    if (id === 'door') { this.closeInterview(); return; }
    if (id === 'gordon') { this.talk(); return; }
    this.showStatus({ safe: T('t_f7295f6e9bc89b684e62'), access: T('t_b464a1bc08146bede35a'),
      folder: T('t_2ddc7b1d7a547ee534b4'), telephone: T('t_a8aba9cb629395497989') }[id]);
  }
  shield(parent) {
    const shade = this.add.rectangle(960, 540, 1920, 1080, 0, 0.35).setInteractive();
    shade.on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation()); parent.add(shade);
  }
  text(parent, x, y, value, size = 30, width = 1660, color = '#f1e6cf') {
    const object = this.add.text(x, y, value, { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`,
      color, align: 'center', wordWrap: { width }, lineSpacing: 8 }).setOrigin(0.5);
    parent.add(object); return object;
  }
  button(parent, x, y, value, callback, width = 0) {
    const object = this.add.text(x, y, value, { fontFamily: 'SpecialElite, monospace', fontSize: '26px',
      color: '#ffe2ae', backgroundColor: '#294331', padding: { x: 22, y: 12 }, align: 'center',
      ...(width ? { fixedWidth: width } : {}) }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    object.on('pointerdown', (_p, _x, _y, event) => {
      event?.stopPropagation(); if (!this.disposed && !this.closing) callback();
    }); parent.add(object); return object;
  }
  talk() {
    if (this.hotspotDebug?.enabled) return;
    const state = this.state();
    if (!state.unlocked) { this.showStatus(T('t_b247af68678afdae98a3')); return; }
    if (state.completed) { this.showStatus(T('t_3b32e934b17bb81957d3')); return; }
    if (state.pendingTopic) { this.resumeReply(); return; }
    if (state.dismissalPending) { this.showDismissal(); return; }
    if (!this.introShown && !state.asked.length) {
      this.introShown = true;
      this.openDialogue(DATA.opening.map(text => ({ speaker: DATA.speaker, text })),
        T('t_a70cc5302c043cd93e8b'), () => this.openTopics());
    } else this.openTopics();
  }
  createPresentationHandle() {
    const scene = this;
    const handle = {
      get isOpen() { return scene.presentationHandle === handle && Boolean(scene.sharedDialogue?.root); },
      get root() { return scene.presentationHandle === handle ? scene.sharedDialogue?.root : null; },
      advance() { if (scene.presentationHandle === handle) scene.sharedDialogue?.advance(); },
      destroy() {
        if (scene.presentationHandle !== handle) return;
        scene.presentationVersion += 1; scene.sharedDialogue?.close(false);
        scene.presentationHandle = null; scene.presentationLeave = null; scene.presentationAdvance = null;
      },
    };
    this.presentationHandle = handle; return handle;
  }
  showPresentation({ handle, speaker, text, topics = [], onLeave, onAdvance = null, nodeId }) {
    if (this.disposed || this.closing || this.presentationHandle !== handle) return;
    this.presentationLeave = onLeave; this.presentationAdvance = onAdvance;
    const version = ++this.presentationVersion;
    this.sharedDialogue.show({ title: speaker, text,
      messages: [{ speaker: speaker === T('t_1e954e77ee4e5253c6c5') ? 'player'
        : speaker === DATA.speaker ? 'npc' : 'note', text }],
      choices: topics.map(topic => ({ id: `${nodeId}:${topic.id}`, label: topic.label,
        attitude: 'neutral', scoreTrust: false, state: topic.state || 'normal', disabled: topic.state === 'disabled',
        action: () => {
          if (this.disposed || this.closing || this.presentationHandle !== handle ||
            this.presentationVersion !== version || topic.state === 'disabled') return;
          topic.onSelect?.();
        } })), nodeId, npcId: 'gordon', showTrust: true, scoreTrust: false, depth: 6000,
      onAdvance: () => {
        if (this.presentationHandle === handle && this.presentationVersion === version) this.presentationAdvance?.();
      } });
    this.tooltip?.setVisible(false);
  }
  openChoicePanel({ text = '', topics = [], onLeave = null, speaker = DATA.speaker } = {}) {
    if (this.blocked() || this.hotspotDebug?.enabled) return null;
    const handle = this.createPresentationHandle(); this.modal = handle;
    this.showPresentation({ handle, speaker, text, topics, nodeId: 'gordon_choice_menu',
      onLeave: onLeave || (() => this.closeModal()) }); return handle;
  }
  openTopics() {
    if (this.blocked() || this.hotspotDebug?.enabled) return;
    const state = this.state();
    if (state.pendingTopic) { this.resumeReply(); return; }
    if (state.dismissalPending) { this.showDismissal(); return; }
    this.openChoicePanel({ text: T('t_c83191c95d809121091d'),
      topics: DATA.topics.map(topic => ({ id: topic.id, label: topic.label,
        state: state.asked.includes(topic.id) ? 'disabled' : 'normal',
        onSelect: () => { if (!this.state().asked.includes(topic.id)) this.ask(topic.id); } })) });
  }
  closeModal() { const old = this.modal; this.modal = null; old?.destroy(true); }
  ask(topicId) {
    if (this.hotspotDebug?.enabled) return;
    const result = this.preview ? planGordonQuestion(DATA, this.local, topicId) : beginGordonQuestion(topicId);
    if (!(result.ok || result.success)) { this.showStatus(T('t_83814c921bdaf0b38351')); return; }
    if (this.preview) this.local = result.state; else this.savedOk = result.saved;
    this.closeModal(); this.resumeReply();
  }
  resumeReply() {
    const state = this.state(), topic = DATA.topics.find(item => item.id === state.pendingTopic);
    if (!topic) return;
    this.openDialogue([{ speaker: T('t_1e954e77ee4e5253c6c5'), text: topic.question },
      ...topic.reply.map(text => ({ speaker: DATA.speaker, text }))], T('t_cb96474abe56715a0ada'), () => {
      const result = this.preview ? acknowledgeGordonReply(DATA, this.local) : completeGordonReply();
      if (!(result.ok || result.success)) { this.showStatus(T('t_5af7c548e29a53abf0ce')); return; }
      if (this.preview) this.local = result.state; else this.savedOk = result.saved;
      if (this.state().dismissalPending) this.showDismissal(); else this.openTopics();
    });
  }
  showDismissal() {
    this.openDialogue(DATA.dismissal.map(text => ({ speaker: DATA.speaker, text })), T('t_f99ff8d8fd890cd4e4e9'), () => {
      const result = this.preview ? { success: true, saved: true } : completeGordonDismissal();
      if (!result.success) { this.showStatus(T('t_654e28adde46eaa4c30d')); return; }
      if (this.preview) this.local = { ...this.local, completed: true, dismissalPending: false }; else this.savedOk = result.saved;
      this.closeInterview();
    });
  }
  openDialogue(lines, finalLabel, onComplete) {
    if (this.blocked() || this.hotspotDebug?.enabled || !Array.isArray(lines) || !lines.length) return;
    const handle = this.createPresentationHandle();
    this.dialogue = { view: handle, lines: lines.map(line => ({ ...line })), index: 0, finalLabel, onComplete };
    this.renderDialogueLine();
  }
  renderDialogueLine() {
    const current = this.dialogue; if (!current) return;
    const line = current.lines[current.index];
    this.showPresentation({ handle: current.view, speaker: line.speaker, text: line.text,
      nodeId: `gordon_statement:${current.index}`,
      topics: [{ id: 'continue', label: current.index === current.lines.length - 1 ? current.finalLabel : 'Continue',
        onSelect: () => this.nextDialogue() }], onLeave: () => this.abortDialogue(),
      onAdvance: () => { if (this.dialogue === current) this.completeDialogueLine(); } });
  }
  nextDialogue() { this.dialogue?.view.advance(); }
  completeDialogueLine() {
    const current = this.dialogue; if (!current || this.disposed || this.closing) return;
    if (current.index < current.lines.length - 1) { current.index += 1; this.renderDialogueLine(); return; }
    const callback = current.onComplete; current.onComplete = null; this.abortDialogue(); callback?.();
  }
  abortDialogue() {
    const old = this.dialogue; this.dialogue = null;
    if (old) { old.onComplete = null; old.view.destroy(); }
  }
  onConversationKey(event) {
    if (this.disposed || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
      event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (this.hotspotDebug?.enabled) {
      if (event.code === 'Escape') { event.preventDefault(); this.hotspotDebug.setEnabled(false); } return;
    }
    if (this.sharedDialogue?.root || event.code !== 'Escape') return;
    event.preventDefault();
    if (this.dialogue) this.abortDialogue(); else if (this.modal) this.closeModal(); else this.closeInterview();
  }
  layout() {
    if (this.disposed || !this.root) return;
    const { width, height } = this.scale, scale = Math.min(width / 1920, height / 1080);
    this.root.setScale(scale).setPosition((width - 1920 * scale) / 2, (height - 1080 * scale) / 2);
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
  closeInterview() {
    if (this.disposed || this.closing) return;
    this.closing = true;
    const result = { completed: this.state().completed, preview: this.preview, saved: this.savedOk };
    const callback = this.onFinished; this.onFinished = null;
    this.abortDialogue(); this.closeModal(); this.restoreBackground();
    try { callback?.(result); } finally { this.scene.stop(); }
  }
  disposeInterview() {
    if (this.disposed) return;
    this.disposed = true; this.abortDialogue(); this.closeModal(); this.sharedDialogue?.destroy(); this.sharedDialogue = null;
    this.statusTimer?.remove(false); this.statusTimer = null; this.hotspotDebug?.destroy(); this.hotspotDebug = null;
    this.presentationHandle = null; this.presentationLeave = null; this.presentationAdvance = null;
    this.restoreBackground(); this.onFinished = null;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.disposeInterview, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.disposeInterview, this);
  }
}
installGordonEthicsInterview(GordonInterviewScene);
