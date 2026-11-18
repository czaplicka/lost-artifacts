import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { warsawData as DATA, getWarsawMeeting, performWarsawAction } from '../johnWarsawMeetingService.js';
import { normalizeWarsaw, advanceWarsaw } from './pi-office/WarsawMeetingModel.js';
import { LocationDialoguePanel } from '../ui/LocationDialoguePanel.js';

const T = id => __dialogueText('scenes/WarsawMeetingScene.js', id);
export class WarsawMeetingScene extends Phaser.Scene {
  constructor(config = { key: 'WarsawMeetingScene' }) { super(config); }
  init(data = {}) {
    this.preview = data.preview === true; this.returnSceneKey = data.returnSceneKey || 'DetectiveOfficeScene';
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.closing = false; this.layers = []; this.parentPaused = false; this.sourceOpen = false;
    this.feedback = ''; this.saved = null; this.clickAfter = 0; this.reviewOpening = false;
    this.conversationPanel = null;
  }
  create() {
    const story = getWarsawMeeting(); this.allowed = this.preview || story.eligible;
    this.progress = normalizeWarsaw(DATA, this.preview ? null : story);
    this.cameras.main.setBackgroundColor('#102018'); this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(720, 490, 1440, 980, 0x192b20));
    this.text(720, 55, DATA.title, 24, 1300, '#efd299', this.root, 'PressStart2P');
    this.content = this.add.container(0, 0); this.root.add(this.content);
    this.button(1210, 910, T('t_2fcba4e453cf5cec2a50'), () => this.closeVisit(), this.root);
    this.render();
    this.resize = () => this.layout(); this.scale.on('resize', this.resize); this.layout();
    this.keyHandler = event => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        if (this.sourceOpen) { this.sourceOpen = false; this.render(); } else this.closeVisit();
        return;
      }
      if (!this.conversationPanel?.isOpen) return;
      if (['Enter', 'Space', 'NumpadEnter'].includes(event.code)) {
        event.preventDefault(); this.conversationPanel.advance();
      }
    };
    this.input.keyboard?.on('keydown', this.keyHandler);
    this.suspend();
    this.events.once('shutdown', () => {
      this.clearConversation(); this.scale.off('resize', this.resize);
      this.input.keyboard?.off('keydown', this.keyHandler); this.restore(); this.notifyFinished();
    });
  }
  text(x, y, value, size = 27, width = 1280, color = '#ece3c8', parent = this.content, font = 'SpecialElite') {
    const object = this.add.text(x, y, value, { fontFamily: `${font}, monospace`, fontSize: `${size}px`,
      color, align: 'center', wordWrap: { width }, lineSpacing: 7 }).setOrigin(.5);
    parent.add(object); return object;
  }
  button(x, y, value, callback, parent = this.content) {
    const object = this.add.text(x, y, value, { fontFamily: 'SpecialElite', fontSize: '23px',
      color: '#ffe0a3', backgroundColor: '#36543e', padding: { x: 18, y: 12 },
      align: 'center', wordWrap: { width: 1120 } }).setOrigin(.5).setInteractive({ useHandCursor: true });
    object.on('pointerdown', (_p, _x, _y, event) => {
      event?.stopPropagation(); if (this.closing || this.time.now < this.clickAfter) return;
      this.clickAfter = this.time.now + 180; callback();
    });
    parent.add(object); return object;
  }
  render() {
    this.clearConversation(); this.content.removeAll(true);
    if (!this.allowed) { this.text(720, 430, T('t_1192f6736a38d6c0a19f'), 30); return; }
    if (this.sourceOpen) {
      this.text(720, 190, T('t_0d1b230b4df50d355013'), 29, 1260, '#efd299');
      this.text(720, 400, T('t_5c0fc9881abec75c3c85'), 28, 1200);
      this.text(720, 640, T('t_3460780e2dcf4116471e'), 24);
      this.button(720, 780, T('t_6d376d69e68fc40e2318'), () => { this.sourceOpen = false; this.render(); });
      return;
    }
    const phase = this.progress.phase;
    this.text(720, 130, (this.preview ? T('t_50d1058f5474fe46bb88') : '') + phase.toUpperCase(), 21, 1250, '#b5c8a1');
    if (['contact', 'verification', 'meeting'].includes(phase)) { this.showConversation(); return; }
    this.button(235, 910, T('t_eeaa1a1d8e66e91c0c59'), () => { this.sourceOpen = true; this.render(); });
    if (phase === 'briefing' || phase === 'arrival') {
      this.text(720, 255, phase === 'briefing' ? T('t_a0485cbcb28dfbea9cb2') : T('t_0cf8ca2f2c58e4e6aa34'), 30, 1250, '#efd299');
      this.text(720, 455, phase === 'briefing' ? DATA.briefing : DATA.arrival, 30, 1230);
      this.button(720, 720, phase === 'briefing' ? T('t_bd4d193c65609dd7515c') : T('t_8c19e488ba6e683de383'), () => this.act('next'));
    } else {
      this.text(720, 240, T('t_57e557a4f77911c6ab89'), 31, 1250, '#efd299');
      this.text(720, 440, DATA.success, 30, 1230);
      this.text(720, 665, T('t_1760d63ad19fc369ae64'), 25);
      this.button(720, 770, T('t_c84e75ec8ed4a0899298'), () => { void this.openIndependentReview(); });
    }
    if (this.feedback) this.text(720, phase === 'complete' ? 840 : 830, this.feedback, 19, 1290, '#edcc8d');
    this.text(720, 955, this.saved === false ? DATA.messages.saveFailed : this.preview
      ? T('t_293352fa3c35a2696e86') : T('t_217ed405444825c5a185'), 16, 1350, '#b5c8a1');
  }
  showConversation() {
    if (typeof LocationDialoguePanel.prototype.advance !== 'function') {
      throw new Error('Install the shared LocationDialoguePanel from dialogue migration stage 1.');
    }
    const phase = this.progress.phase;
    const panel = new LocationDialoguePanel(this, {
      depth: 6000, modal: true, keyboard: false, leaveLabel: 'Leave',
      onLeave: () => this.closeVisit(), onAdvance: () => this.commitMeetingLine()
    });
    this.conversationPanel = panel;
    panel.setSpeaker({ name: phase === 'meeting' ? 'JOHN' : 'MESSAGE DESK',
      portrait: { kind: 'texture', key: 'portrait_fallback' } });
    const speech = phase === 'contact' ? DATA.contactPrompt : phase === 'verification'
      ? DATA.verificationPrompt : DATA.johnLines[this.progress.line];
    const notes = [this.feedback, this.saved === false ? DATA.messages.saveFailed : ''].filter(Boolean);
    panel.setText([speech, ...notes].filter(Boolean).join('\n\n'));
    const choices = phase === 'contact' ? DATA.contactChoices : phase === 'verification' ? DATA.verificationChoices : [];
    const topics = choices.map(choice => ({ id: choice.id, label: choice.label,
      onSelect: () => this.chooseContactAnswer(choice.id) }));
    if (phase === 'meeting') topics.push({ id: 'continue',
      label: this.progress.line === DATA.johnLines.length - 1 ? T('t_a5ec53f141005caf565f') : 'Continue',
      onSelect: () => this.conversationPanel?.advance() });
    topics.push({ id: 'source', label: T('t_eeaa1a1d8e66e91c0c59'), state: 'accent',
      onSelect: () => { this.sourceOpen = true; this.render(); } });
    panel.setTopics(topics);
  }
  chooseContactAnswer(action) {
    if (this.closing || !this.allowed || this.sourceOpen ||
      !['contact', 'verification'].includes(this.progress.phase) || this.time.now < this.clickAfter) return;
    this.clickAfter = this.time.now + 180; this.act(action);
  }
  commitMeetingLine() {
    if (this.closing || !this.allowed || this.sourceOpen || this.progress.phase !== 'meeting' || this.time.now < this.clickAfter) return;
    this.clickAfter = this.time.now + 180; this.act('next');
  }
  clearConversation() { this.conversationPanel?.destroy(); this.conversationPanel = null; }
  act(action) {
    if (!this.allowed) return;
    const result = this.preview ? advanceWarsaw(DATA, this.progress, action) : performWarsawAction(action);
    this.progress = normalizeWarsaw(DATA, result.state); this.feedback = result.message;
    if (!this.preview && typeof result.saved === 'boolean') this.saved = result.saved;
    this.render();
  }
  async openIndependentReview() {
    if (this.closing || this.reviewOpening || !this.progress.completed) return false;
    this.reviewOpening = true;
    try {
      const { openJohnAccountReview } = await import('../johnAccountReviewLauncher.js');
      if (this.closing || !this.sys.isActive()) return false;
      const opened = openJohnAccountReview(this.game, { preview: this.preview, returnSceneKey: 'WarsawMeetingScene',
        onFinished: () => { this.reviewOpening = false; if (!this.closing && this.sys.isActive()) this.render(); } });
      if (!opened) { this.reviewOpening = false; this.feedback = T('t_cfa380368146a586cf47'); this.render(); }
      return opened;
    } catch (error) {
      this.reviewOpening = false;
      if (!this.closing && this.sys.isActive()) { this.feedback = T('t_b1cbca008bafd360485d'); this.render(); }
      console.error('[John account review]', error); return false;
    }
  }
  layout() {
    if (!this.root) return;
    const { width, height } = this.scale, s = Math.min(width / 1440, height / 980);
    this.root.setScale(s).setPosition((width - 1440 * s) / 2, (height - 980 * s) / 2);
  }
  suspend() {
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const target = this.scene.manager.keys[key]; if (!target) continue;
      const active = this.scene.isActive(key), visible = target.sys.settings.visible;
      this.layers.push({ key, active, visible }); this.scene.setVisible(false, key); if (active) this.scene.pause(key);
    }
    if (this.scene.isActive(this.returnSceneKey)) { this.parentPaused = true; this.scene.pause(this.returnSceneKey); }
  }
  restore() {
    for (const { key, active, visible } of this.layers) {
      if (!this.scene.manager.keys[key]) continue;
      this.scene.setVisible(visible, key); if (active && this.scene.isPaused(key)) this.scene.resume(key);
    }
    this.layers = [];
    if (this.parentPaused && this.scene.isPaused(this.returnSceneKey)) this.scene.resume(this.returnSceneKey);
    this.parentPaused = false;
  }
  notifyFinished() {
    const callback = this.onFinished; this.onFinished = null;
    try { callback?.({ preview: this.preview, completed: this.progress?.completed === true, saved: this.saved }); }
    catch (error) { console.error('[WarsawMeetingScene] Completion callback failed:', error); }
  }
  closeVisit() {
    if (this.closing) return;
    this.closing = true; this.clearConversation(); this.restore(); this.scene.stop();
  }
}
