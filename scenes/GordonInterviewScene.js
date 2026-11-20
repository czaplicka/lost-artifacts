import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { LocationDialoguePanel } from '../ui/LocationDialoguePanel.js';
import { gordonInterviewData as DATA, getGordonInterviewState, beginGordonQuestion,
  completeGordonReply, completeGordonDismissal } from '../gordonInterviewService.js';
import { normalizeGordonInterview, planGordonQuestion, acknowledgeGordonReply } from '../gordonInterviewModel.js';
import { GordonHotspotDebug } from './gordon/GordonHotspotDebug.js';
import { installGordonEthicsInterview } from './gordon/GordonEthicsUI.js';

const T = id => __dialogueText('scenes/GordonInterviewScene.js', id);

function styleGordonConversation(view) {
  const scene = view.scene;
  const frame = scene.add.graphics();
  view.root.addAt(frame, view.root.getIndex(view.text));
  view.clearPortrait();
  view.portraitFrame.setVisible(false);
  view.nameText = view.makeText(0, 0, '', 10, '#ffd86b', true);
  const playerName = T('t_1e954e77ee4e5253c6c5');
  const theme = () => {
    if (view.speaker.name === playerName) return { player: true, fill: 0x263729, edge: 0x88b589, text: '#e3f0d7', name: '#9fd9a0' };
    if (view.speaker.name === DATA.speaker) return { player: false, fill: 0x2a2012, edge: 0xb58a42, text: '#f3e7c4', name: '#f0c75e' };
    return { player: false, fill: 0x201c17, edge: 0x776953, text: '#dfcfac', name: '#dfcfac' };
  };
  view.renderSpeaker = () => {
    if (!view.isOpen) return;
    const L = view.layout, colors = theme();
    view.nameText.setText(view.speaker.name || '').setPosition(L.textX, L.panelY + 22)
      .setFontSize(L.width < 700 ? 8 : 10).setColor(colors.name).setWordWrapWidth(L.textWidth, true);
  };
  const renderPage = view.renderPage.bind(view);
  view.renderPage = (instant = false) => {
    if (!view.isOpen) return;
    const L = view.layout, colors = theme();
    frame.clear().fillStyle(colors.fill, 1)
      .fillRoundedRect(L.textX - 10, L.panelY + 48, L.textWidth + 20, Math.max(1, L.panelHeight - 102), 8)
      .lineStyle(1, colors.edge, 1)
      .strokeRoundedRect(L.textX - 10, L.panelY + 48, L.textWidth + 20, Math.max(1, L.panelHeight - 102), 8);
    view.text.setColor(colors.text);
    renderPage(instant);
  };
  const repaginate = view.repaginate.bind(view);
  view.repaginate = (offset = 0) => {
    const height = view.layout.panelHeight;
    view.layout.panelHeight = height - 42;
    try { repaginate(offset); } finally { view.layout.panelHeight = height; }
  };
  view.relayout = () => {
    if (!view.isOpen) return;
    const offset = view.textPages[view.textPage]?.start || 0;
    const { width: w, height: h } = scene.scale;
    const small = w < 700, ph = Math.min(h, small ? 340 : 272), y = h - ph;
    const pad = small ? 18 : 26;
    const menu = Math.min(view.options.menuWidth, small ? Math.max(116, w * .35) : w * .28);
    const divider = w - menu - 20;
    const textWidth = Math.max(16, (divider - pad - 34) * .88);
    const textX = theme().player ? divider - 24 - textWidth : pad + 10;
    view.layout = { width: w, height: h, panelHeight: ph, panelY: y,
      portraitSize: 0, portraitX: pad, portraitY: y + 12, centerX: pad, centerY: y + 12,
      textX, textEndX: divider, menuWidth: menu, menuX: divider + 16,
      textWidth, font: small ? 17 : 22 };
    view.overlay.setSize(w, h);
    view.background.setPosition(0, y).setSize(w, ph);
    view.border.clear().lineStyle(4, 0xd4af37, 1)
      .strokeRect(6, y + 6, Math.max(1, w - 12), Math.max(1, ph - 12))
      .lineStyle(1, 0x8a6d1f, .9)
      .strokeRect(12, y + 12, Math.max(1, w - 24), Math.max(1, ph - 24));
    view.border.lineBetween(divider, y + 16, divider, h - 16);
    view.portraitFrame.clear().setVisible(false);
    view.text.setPosition(textX, y + 58).setFontSize(view.layout.font)
      .setWordWrapWidth(textWidth, true).setScale(1);
    view.footer.setPosition(textX, h - 72).setFontSize(small ? 9 : 11).setWordWrapWidth(textWidth, true);
    view.previousText.setPosition(pad + 10, h - 37);
    view.pageLabel.setPosition(pad + 38, h - 37);
    view.nextText.setPosition(divider - 24, h - 37);
    view.leaveButton.setPosition(divider + 16, h - 37).setFontSize(small ? 16 : 18).setText(view.options.leaveLabel);
    view.leaveButton.setScale(Math.min(1, Math.max(1, menu - 18) / Math.max(1, view.leaveButton.width)));
    view.renderSpeaker(); view.repaginate(offset); view.renderPage(true); view.renderTopics();
  };
  const setSpeaker = view.setSpeaker.bind(view);
  view.setSpeaker = (speaker = {}) => {
    if (!view.isOpen) return;
    setSpeaker(speaker);
    view.relayout();
  };
  view.relayout();
}

export class GordonInterviewScene extends BaseScene {
  constructor() { super({ key: 'GordonInterviewScene' }); }
  init(data = {}) {
    this.preview = data.preview !== false; this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.local = normalizeGordonInterview(DATA, {}); this.modal = null; this.dialogue = null;
    this.hotspots = []; this.definitions = DATA.hotspots.map(def => ({ ...def }));
    this.closing = false; this.introShown = false; this.savedOk = null; this.hotspotDebug = null;
    this.layerStates = []; this.parentPausedByMe = false; this.statusTimer = null;
  }
  preload() {
    for (const asset of Object.values(DATA.backgrounds)) {
      if (!this.textures.exists(asset.key)) this.load.image(asset.key, asset.url);
    }
  }
  state() { return this.preview ? { ...this.local, unlocked: true } : getGordonInterviewState(); }
  create() {
    super.create(); this.cameras.main.setBackgroundColor('#080b08'); this.root = this.add.container(0, 0);
    if (this.textures.exists(DATA.backgrounds.occupied.key)) {
      this.root.add(this.add.image(960, 540, DATA.backgrounds.occupied.key).setDisplaySize(1920, 1080));
    } else this.root.add(this.add.text(100, 150, `${T('t_f10ce971f188a51de4e6')}${DATA.backgrounds.occupied.url}`,
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
    this.hotspotDebug = new GordonHotspotDebug(this, this.hotspots);
    this.layout(); this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onConversationKey);
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.abortDialogue(); this.closeModal(); this.statusTimer?.remove(false);
      this.hotspotDebug?.destroy(); this.restoreBackground(); this.onFinished = null;
    });
    if (!this.state().unlocked) this.showStatus(T('t_688af0b65933da3d502e'));
    else if (this.state().pendingTopic) this.resumeReply();
    else if (this.state().dismissalPending) this.showDismissal();
    else if (this.state().completed) this.showStatus(T('t_5a95c071d7f7aac3f18c'));
  }
  onConversationKey(event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      if (this.hotspotDebug?.enabled) { this.hotspotDebug.setEnabled(false); return; }
      if (this.dialogue) this.abortDialogue(); else if (this.modal) this.closeModal(); else this.closeInterview();
      return;
    }
    if (this.hotspotDebug?.enabled) return;
    const view = this.dialogue?.view || (this.modal?.advance ? this.modal : null);
    if (!view?.isOpen) return;
    if (['Enter', 'Space', 'NumpadEnter'].includes(event.code)) { event.preventDefault(); view.advance(); return; }
    const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
    if (!match) return;
    event.preventDefault();
    if (view.isTyping) { view.completeTypewriter(); return; }
    const topic = view.pageTopics?.[Number(match[1]) - 1];
    if (topic && topic.state !== 'disabled' && !view.topicsLocked()) topic.onSelect?.(topic);
  }
  blocked() { return this.closing || Boolean(this.modal) || Boolean(this.dialogue); }
  label(x, y, text, size = 25) {
    const object = this.add.text(x, y, text, { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`,
      color: '#ffe2ae', backgroundColor: '#10231a', padding: { x: 12, y: 8 },
      align: 'center', wordWrap: { width: 1500 } }).setOrigin(.5);
    this.root.add(object); return object;
  }
  drawHotspots(hover = null) {
    this.outline.clear(); if (this.hotspotDebug?.enabled) return;
    for (const { def } of this.hotspots) {
      if (hover?.id !== def.id) continue;
      this.outline.lineStyle(3, 0xffd176, .9); this.outline.strokeRect(def.x, def.y, def.w, def.h);
    }
  }
  showStatus(text) {
    this.statusTimer?.remove(false); this.status.setText(text).setVisible(true); this.root.bringToTop(this.status);
    this.statusTimer = this.time.delayedCall(8500, () => this.status?.setVisible(false));
  }
  activate(id) {
    if (this.hotspotDebug?.enabled) return;
    if (id === 'door') { this.closeInterview(); return; }
    if (id === 'gordon') { this.talk(); return; }
    this.showStatus({ safe: T('t_f7295f6e9bc89b684e62'), access: T('t_b464a1bc08146bede35a'),
      folder: T('t_2ddc7b1d7a547ee534b4'), telephone: T('t_a8aba9cb629395497989') }[id]);
  }
  shield(parent) {
    const shade = this.add.rectangle(960, 540, 1920, 1080, 0, .35).setInteractive();
    shade.on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation()); parent.add(shade);
  }
  text(parent, x, y, value, size = 30, width = 1660, color = '#f1e6cf') {
    const object = this.add.text(x, y, value, { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`,
      color, align: 'center', wordWrap: { width }, lineSpacing: 8 }).setOrigin(.5);
    parent.add(object); return object;
  }
  button(parent, x, y, value, callback, width = 0) {
    const object = this.add.text(x, y, value, { fontFamily: 'SpecialElite, monospace', fontSize: '26px',
      color: '#ffe2ae', backgroundColor: '#294331', padding: { x: 22, y: 12 }, align: 'center',
      ...(width ? { fixedWidth: width } : {}) }).setOrigin(.5).setInteractive({ useHandCursor: true });
    object.on('pointerdown', (_p, _x, _y, event) => { event?.stopPropagation(); if (!this.closing) callback(); });
    parent.add(object); return object;
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
  requireSharedPanel() {
    if (typeof LocationDialoguePanel.prototype.advance !== 'function') {
      throw new Error('Gordon requires LocationDialoguePanel from dialogue migration stage 1.');
    }
  }
  portraitFor(speaker, key = null) {
    return { kind: 'texture', key: key || (speaker === DATA.speaker ? DATA.portraitKey : null) || 'portrait_fallback' };
  }
  openChoicePanel({ text = '', topics = [], onLeave = null, speaker = DATA.speaker } = {}) {
    if (this.blocked() || this.hotspotDebug?.enabled) return null;
    this.requireSharedPanel();
    const view = new LocationDialoguePanel(this, { depth: 6000, modal: true, keyboard: false,
      leaveLabel: 'Leave', onLeave: onLeave || (() => this.closeModal()) });
    this.modal = view;
    styleGordonConversation(view);
    view.setSpeaker({ name: speaker, portrait: this.portraitFor(speaker) });
    view.setText(text); view.setTopics(topics); this.tooltip?.setVisible(false);
    return view;
  }
  openTopics() {
    if (this.blocked() || this.hotspotDebug?.enabled) return;
    const state = this.state();
    if (state.pendingTopic) { this.resumeReply(); return; }
    if (state.dismissalPending) { this.showDismissal(); return; }
    this.openChoicePanel({ text: T('t_c83191c95d809121091d'),
      topics: DATA.topics.map(topic => ({ id: topic.id, label: topic.label,
        state: state.asked.includes(topic.id) ? 'disabled' : 'normal',
        onSelect: () => { if (!this.state().asked.includes(topic.id)) this.ask(topic.id); }
      })) });
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
    const state = this.state(), topic = DATA.topics.find(topic => topic.id === state.pendingTopic);
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
      if (this.preview) this.local = { ...this.local, completed: true, dismissalPending: false };
      else this.savedOk = result.saved;
      this.closeInterview();
    });
  }
  openDialogue(lines, finalLabel, onComplete) {
    if (this.blocked() || this.hotspotDebug?.enabled || !Array.isArray(lines) || !lines.length) return;
    this.requireSharedPanel();
    const view = new LocationDialoguePanel(this, { depth: 6000, modal: true, keyboard: false,
      leaveLabel: 'Leave', onLeave: () => this.abortDialogue(), onAdvance: () => this.completeDialogueLine() });
    styleGordonConversation(view);
    this.dialogue = { view, container: view.root, lines: lines.map(line => ({ ...line })),
      index: 0, finalLabel, onComplete };
    this.renderDialogueLine(); this.tooltip?.setVisible(false);
  }
  renderDialogueLine() {
    const current = this.dialogue; if (!current) return;
    const line = current.lines[current.index];
    current.view.setSpeaker({ name: line.speaker, portrait: this.portraitFor(line.speaker, line.portraitKey) });
    current.view.setText(line.text);
    current.view.setTopics([{ id: 'continue',
      label: current.index === current.lines.length - 1 ? current.finalLabel : 'Continue',
      onSelect: () => this.nextDialogue() }]);
  }
  nextDialogue() { this.dialogue?.view.advance(); }
  completeDialogueLine() {
    const current = this.dialogue; if (!current || this.closing) return;
    if (current.index < current.lines.length - 1) { current.index++; this.renderDialogueLine(); return; }
    const callback = current.onComplete; current.onComplete = null;
    this.abortDialogue(); callback?.();
  }
  abortDialogue() {
    const old = this.dialogue; this.dialogue = null;
    if (old) { old.onComplete = null; old.view.destroy(); }
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
    if (this.closing) return;
    this.closing = true;
    const result = { completed: this.state().completed, preview: this.preview, saved: this.savedOk };
    const callback = this.onFinished; this.onFinished = null;
    this.abortDialogue(); this.closeModal(); this.restoreBackground();
    try { callback?.(result); } finally { this.scene.stop(); }
  }
}
installGordonEthicsInterview(GordonInterviewScene);
