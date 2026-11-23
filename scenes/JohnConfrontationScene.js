import { dialogueText } from '../dialogues/DialogueText.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { johnConfrontationData as DATA, getJohnConfrontation, performJohnConfrontation } from '../johnConfrontationService.js';
import { normalizeConfrontation, confrontationAction } from './pi-office/JohnConfrontationModel.js';
const KEY = 'JohnConfrontationScene';
const T = id => dialogueText('scenes/JohnConfrontationScene.js', id);

export class JohnConfrontationScene extends Phaser.Scene {
  constructor() { super({ key: KEY }); }
  init(data = {}) {
    this.preview = data.preview === true; this.returnSceneKey = data.returnSceneKey || 'DetectiveOfficeScene';
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.closing = false; this.disposed = false; this.layers = []; this.parentPaused = false;
    this.sourceOpen = false; this.feedback = ''; this.saved = null; this.clickAfter = 0;
    this.replayTopic = null; this.replayCursor = 0; this.finaleOpening = false;
    this.conversationPanel = null; this.conversationAdvance = null;
    this.resize = null; this.keyHandler = null; this.runToken = Symbol(KEY);
  }
  create() {
    const story = getJohnConfrontation(); this.allowed = this.preview || story.eligible;
    this.progress = normalizeConfrontation(DATA, this.preview ? null : story);
    this.cameras.main.setBackgroundColor('#142019'); this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(720, 490, 1440, 980, 0x1a2921));
    this.text(720, 55, T('t_bcf5db403a1e1ab2b64b'), 23, 1320, '#efd299', this.root, 'PressStart2P');
    this.content = this.add.container(0, 0); this.root.add(this.content);
    this.button(1210, 910, 'BACK', () => this.closeVisit(), this.root);
    this.conversationPanel = new HomeTownDialogue(this, () => this.leaveConversation());
    this.render(); this.resize = () => this.layout(); this.scale.on('resize', this.resize); this.layout();
    this.keyHandler = event => this.onKey(event); this.input.keyboard?.on('keydown', this.keyHandler);
    this.suspend(); this.events.once('shutdown', this.disposeConfrontation, this);
    this.events.once('destroy', this.disposeConfrontation, this);
  }
  render() {
    if (this.disposed) return;
    this.clearConversation(); this.content.removeAll(true);
    if (!this.allowed) { this.text(720, 450, T('t_870badc4d9fe67513771'), 29); return; }
    if (this.sourceOpen) {
      this.text(720, 230, T('t_e43f0e982aed27a965dd'), 27, 1260, '#efd299');
      this.text(720, 455, DATA.evidenceNotes, 29, 1250);
      this.button(720, 760, T('t_3e8b939c1330f81337bc'), () => { this.sourceOpen = false; this.render(); });
      this.footer(); return;
    }
    if (this.replayTopic) {
      const topic = DATA.topics.find(item => item.id === this.replayTopic);
      if (!topic) { this.replayTopic = null; this.render(); return; }
      this.showLine(topic, topic.lines[this.replayCursor], true); return;
    }
    if (this.progress.completed) {
      this.text(720, 210, T('t_79610b7a32ef22707c53'), 31, 1250, '#efd299');
      this.text(720, 380, DATA.success, 29, 1250); this.text(720, 510, DATA.nextObjective, 24, 1250);
      DATA.topics.forEach((topic, index) => this.button(720, 590 + index * 70,
        T('t_60f03994dc870e4d48ca') + topic.title, () => this.startReplay(topic.id)));
      this.button(240, 910, T('t_eeaa1a1d8e66e91c0c59'), () => this.openSource());
      this.button(720, 820, T('t_4b519c4c965d280b9369'), () => { void this.openFinalReview(); });
      this.footer(); return;
    }
    if (!this.progress.started) {
      this.text(720, 260, T('t_741ae3f0e329f3cfb03f'), 31, 1250, '#efd299');
      this.text(720, 450, DATA.intro, 30, 1250);
      this.button(720, 730, T('t_07cc0078e8c19d56be69'), () => this.change('start'));
      this.button(240, 910, T('t_eeaa1a1d8e66e91c0c59'), () => this.openSource());
      this.footer(); return;
    }
    const topic = DATA.topics.find(item => item.id === this.progress.active);
    if (!topic) { this.showTopicMenu(); return; }
    const state = this.progress.topics[topic.id];
    if (state.evidence !== topic.evidence) { this.showEvidenceMenu(topic); return; }
    this.showLine(topic, topic.lines[state.cursor], false);
  }
  makeConversation(text, { speaker = 'JOHN', topics = [], onAdvance = null, nodeId = 'john_confrontation' } = {}) {
    if (this.disposed || this.closing || !this.conversationPanel || this.conversationPanel.destroyed) return;
    this.conversationAdvance = onAdvance;
    const fullText = [text, this.feedback, this.saved === false ? T('t_d1085e77824b8b9592f6') : '',
      this.preview ? T('t_50d1058f5474fe46bb88') : ''].filter(Boolean).join('\n\n');
    return this.conversationPanel.show({ title: speaker, text: fullText,
      messages: [{ speaker: speaker === 'DETECTIVE' ? 'player' : 'npc', text: fullText }],
      choices: topics.map(topic => ({ id: `${nodeId}:${topic.id}`, label: topic.label,
        attitude: 'neutral', scoreTrust: false,
        state: topic.state === 'accent' ? 'normal' : topic.state || 'normal', disabled: topic.state === 'disabled',
        action: () => { if (!this.disposed && !this.closing && topic.state !== 'disabled') topic.onSelect?.(); } })),
      nodeId, npcId: 'john', showTrust: true, scoreTrust: false, depth: 6000,
      onAdvance: () => this.conversationAdvance?.() });
  }
  continueConversation() { this.conversationPanel?.advance(); }
  runPanelAction(callback) {
    if (this.disposed || this.closing || this.time.now < this.clickAfter) return;
    this.clickAfter = this.time.now + 180; callback();
  }
  openSource() { if (!this.disposed && !this.closing) { this.sourceOpen = true; this.render(); } }
  sourceTopic() {
    return { id: 'source', label: T('t_eeaa1a1d8e66e91c0c59'), onSelect: () => this.runPanelAction(() => this.openSource()) };
  }
  showTopicMenu() {
    const topics = DATA.topics.map(topic => ({ id: topic.id, label: topic.title,
      state: this.progress.topics[topic.id].heard ? 'used' : 'normal',
      onSelect: () => this.runPanelAction(() => {
        if (this.progress.topics[topic.id].heard) this.startReplay(topic.id); else this.change('topic', topic.id);
      }) }));
    if (DATA.topics.every(topic => this.progress.topics[topic.id].heard)) topics.push({ id: 'finish',
      label: T('t_9ae539a35dfb4c3d1dd9'), onSelect: () => this.runPanelAction(() => this.change('finish')) });
    topics.push(this.sourceTopic());
    this.makeConversation(T('t_eb7dfdc9069bfed36996'), { nodeId: 'john_confrontation_topics', topics });
  }
  showEvidenceMenu(topic) {
    const topics = DATA.evidence.map(evidence => ({ id: evidence.id, label: evidence.label,
      onSelect: () => this.runPanelAction(() => this.change('evidence', evidence.id)) }));
    topics.push({ id: 'topics', label: 'Topics', onSelect: () => this.runPanelAction(() => this.change('menu')) }, this.sourceTopic());
    this.makeConversation(topic.title + '\n\n' + T('t_4b81d88cd17e1e472cde'), { nodeId: `john_evidence:${topic.id}`, topics });
  }
  startReplay(id) {
    if (!DATA.topics.some(topic => topic.id === id)) return;
    this.replayTopic = id; this.replayCursor = 0; this.render();
  }
  showLine(topic, line, replay) {
    if (!line) return;
    const cursor = replay ? this.replayCursor : this.progress.topics[topic.id].cursor;
    const topics = [{ id: 'continue', label: replay ? T('t_2d2eb222bfcdaca1ff31') : 'Continue',
      onSelect: () => this.continueConversation() },
      { id: 'topics', label: 'Topics', onSelect: () => this.runPanelAction(() => {
        if (replay) { this.replayTopic = null; this.render(); } else this.change('menu');
      }) }, this.sourceTopic()];
    this.makeConversation(topic.title + '\n\n' + line.text, { speaker: line.speaker,
      nodeId: `john_${replay ? 'replay' : 'statement'}:${topic.id}:${cursor}`, topics,
      onAdvance: () => this.runPanelAction(() => {
        if (replay) {
          this.replayCursor += 1;
          if (this.replayCursor >= topic.lines.length) this.replayTopic = null;
          this.render();
        } else this.change('next');
      }) });
  }
  footer() {
    this.text(720, 850, this.feedback, 20, 1320, '#e5c58e');
    this.text(720, 964, (this.preview ? T('t_50d1058f5474fe46bb88') : '') + (this.saved === false
      ? T('t_d1085e77824b8b9592f6') : T('t_a0fe8ef179b445ac8cab')), 16, 1350, '#b8c4a5');
  }
  change(action, id = null) {
    if (this.disposed || this.closing || !this.allowed) return false;
    const result = this.preview ? confrontationAction(DATA, this.progress, action, id) : performJohnConfrontation(action, id);
    this.progress = normalizeConfrontation(DATA, result.state);
    this.feedback = this.progress.completed ? '' : result.message;
    if (typeof result.saved === 'boolean') this.saved = result.saved;
    this.render(); return result.ok;
  }
  async openFinalReview() {
    if (this.disposed || this.closing || this.finaleOpening || !this.progress.completed) return false;
    this.finaleOpening = true; const token = this.runToken;
    try {
      const { openHollyFinale } = await import('../hollyFinaleLauncher.js');
      if (this.disposed || this.closing || this.runToken !== token || !this.sys.isActive()) return false;
      const opened = openHollyFinale(this.game, { preview: this.preview, returnSceneKey: KEY,
        onFinished: () => {
          if (this.disposed || this.runToken !== token) return;
          this.finaleOpening = false; if (!this.closing && this.sys.isActive()) this.render();
        } });
      if (!opened) { this.finaleOpening = false; this.feedback = T('t_fe9f3ae6373fbc3a63c2'); this.render(); }
      return opened;
    } catch (error) {
      if (!this.disposed && this.runToken === token) {
        this.finaleOpening = false;
        if (!this.closing && this.sys.isActive()) { this.feedback = T('t_b500a0e3a855d8334580'); this.render(); }
      }
      console.error('[Holly finale]', error); return false;
    }
  }
  clearConversation() { this.conversationAdvance = null; this.conversationPanel?.close(false); }
  leaveConversation() {
    if (this.disposed || this.closing) return;
    if (this.replayTopic) { this.replayTopic = null; this.render(); } else this.closeVisit();
  }
  onKey(event) {
    if (this.disposed || this.closing || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
      event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (this.conversationPanel?.root || event.code !== 'Escape') return;
    event.preventDefault();
    if (this.sourceOpen) { this.sourceOpen = false; this.render(); }
    else if (this.replayTopic) { this.replayTopic = null; this.render(); } else this.closeVisit();
  }
  notifyFinished() {
    const callback = this.onFinished; this.onFinished = null;
    try { callback?.({ preview: this.preview, completed: this.progress?.completed === true, saved: this.saved }); }
    catch (error) { console.error('[JohnConfrontationScene] Completion callback failed:', error); }
  }
  closeVisit() {
    if (this.disposed || this.closing) return;
    this.closing = true; this.clearConversation(); this.restore(); this.scene.stop();
  }
  disposeConfrontation() {
    if (this.disposed) return;
    this.disposed = true; this.runToken = null; this.conversationAdvance = null;
    this.conversationPanel?.destroy(); this.conversationPanel = null;
    this.scale.off('resize', this.resize); this.input.keyboard?.off('keydown', this.keyHandler);
    this.restore(); this.notifyFinished();
    this.events.off('shutdown', this.disposeConfrontation, this); this.events.off('destroy', this.disposeConfrontation, this);
  }

  text(x, y, value, size = 27, width = 1280, color = '#ece3c8', parent = this.content, font = 'SpecialElite') {
    const object = this.add.text(x, y, value, { fontFamily: `${font}, monospace`,
      fontSize: `${size}px`, color, align: 'center', wordWrap: { width }, lineSpacing: 7 }).setOrigin(0.5);
    parent.add(object); return object;
  }
  button(x, y, label, callback, parent = this.content) {
    const object = this.add.text(x, y, label, { fontFamily: 'SpecialElite', fontSize: '23px',
      color: '#ffe0a3', backgroundColor: '#36543e', padding: { x: 18, y: 12 },
      align: 'center', wordWrap: { width: 1120 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    object.on('pointerdown', (_p, _x, _y, event) => {
      event?.stopPropagation();
      if (this.disposed || this.closing || this.time.now < this.clickAfter) return;
      this.clickAfter = this.time.now + 180; callback();
    });
    parent.add(object); return object;
  }
  layout() {
    if (this.disposed || !this.root) return;
    const { width, height } = this.scale, scale = Math.min(width / 1440, height / 980);
    this.root.setScale(scale).setPosition((width - 1440 * scale) / 2, (height - 980 * scale) / 2);
  }
  suspend() {
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const target = this.scene.manager.keys[key];
      if (!target) continue;
      const active = this.scene.isActive(key), visible = target.sys.settings.visible;
      this.layers.push({ key, active, visible });
      this.scene.setVisible(false, key);
      if (active) this.scene.pause(key);
    }
    if (this.scene.isActive(this.returnSceneKey)) {
      this.parentPaused = true; this.scene.pause(this.returnSceneKey);
    }
  }
  restore() {
    for (const { key, active, visible } of this.layers) {
      if (!this.scene.manager.keys[key]) continue;
      this.scene.setVisible(visible, key);
      if (active && this.scene.isPaused(key)) this.scene.resume(key);
    }
    this.layers = [];
    if (this.parentPaused && this.scene.isPaused(this.returnSceneKey)) this.scene.resume(this.returnSceneKey);
    this.parentPaused = false;
  }

}
