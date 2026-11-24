import { dialogueText } from '../dialogues/DialogueText.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { hollyFinaleData as DATA, getHollyFinale, performHollyFinale } from '../hollyFinaleService.js';
import { normalizeFinale, finaleAction } from './pi-office/HollyFinaleModel.js';
import { getHollyTrust, HOLLY_TRUST_VIEW_ID } from './hollyIntro/HollyIntroTrust.js';
const KEY = 'HollyFinaleScene';
const T = id => dialogueText('scenes/HollyFinaleScene.js', id);

export class HollyFinaleScene extends Phaser.Scene {
  constructor() { super({ key: KEY }); }
  init(data = {}) {
    this.preview = data.preview === true; this.returnSceneKey = data.returnSceneKey || 'DetectiveOfficeScene';
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.closing = false; this.disposed = false; this.layers = []; this.parentPaused = false;
    this.feedback = ''; this.saved = null; this.clickAfter = 0; this.documentId = null; this.confirmExit = false;
    this.conversationPanel = null; this.conversationAdvance = null; this.resize = null; this.keyHandler = null;
  }
  preload() { if (!this.textures.exists('holly')) this.load.image('holly', 'assets/pi/holly.webp'); }
  create() {
    const story = getHollyFinale(); this.allowed = this.preview || story.eligible;
    this.progress = normalizeFinale(DATA, this.preview ? null : story);
    if (!this.preview && story.endingSavePending) this.saved = false;
    this.cameras.main.setBackgroundColor('#122018'); this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(720, 490, 1440, 980, 0x1b2b22));
    this.text(720, 55, T('t_61f3956708a5a8cb07f9'), 24, 1320, '#efd299', this.root, 'PressStart2P');
    this.content = this.add.container(0, 0); this.root.add(this.content);
    this.returnButton = this.button(1210, 910, 'BACK', () => this.requestBack(), this.root);
    this.conversationPanel = new HomeTownDialogue(this, () => this.requestBack());
    this.render(); this.resize = () => this.layout(); this.scale.on('resize', this.resize); this.layout();
    this.keyHandler = event => this.onKey(event); this.input.keyboard?.on('keydown', this.keyHandler);
    this.suspend(); this.events.once('shutdown', this.disposeFinale, this); this.events.once('destroy', this.disposeFinale, this);
  }
  render() {
    if (this.disposed) return;
    this.clearConversation(); this.content.removeAll(true);
    this.returnButton?.setText(this.progress.completed ? T('t_2fcba4e453cf5cec2a50') : T('t_639807a2e01886a2236b'));
    if (!this.allowed) { this.text(720, 440, T('t_05cf6d079071fa62fd69'), 29); return; }
    if (this.confirmExit) {
      this.text(720, 260, T('t_ae0f3b375dae1b0e2590'), 29, 1280, '#efd299');
      this.text(720, 450, T('t_1860d4e10ba0c6c3c0a0'), 29, 1250);
      this.button(400, 720, T('t_2b2db463584f8f8626e6'), () => { this.confirmExit = false; this.change('retry_save'); });
      this.button(1040, 720, T('t_2638758076ae840a95a3'), () => this.returnToOffice());
      this.footer(); return;
    }
    if (this.progress.completed) {
      const ending = DATA.endings[this.progress.outcome];
      this.text(720, 220, ending.title, 29, 1290, '#efd299');
      this.text(720, 435, ending.text, 29, 1260); this.text(720, 675, ending.epilogue, 25, 1260);
      if (this.saved === false) this.button(720, 810, T('t_4737fde6ff551c004b64'), () => this.change('retry_save'));
      this.footer(); return;
    }
    if (!this.progress.ready) {
      this.text(720, 125, T('t_54f470a731ce0e13820b') + this.progress.reviewed.length +
        T('t_8a5edab282632443219e') + DATA.review.length + T('t_03ec43e80c26808ecd25'), 22);
      DATA.review.forEach((record, index) => {
        const read = this.progress.reviewed.includes(record.id);
        this.button(300, 280 + index * 135, (read ? T('t_78c78dd961773adf990b') : '') + record.title, () => {
          if (this.change('read', record.id)) { this.documentId = record.id; this.render(); }
        }).setFontSize(20);
      });
      this.content.add(this.add.rectangle(990, 470, 770, 600, 0xe2d7bc).setStrokeStyle(3, 0x9f875d));
      const document = DATA.review.find(record => record.id === this.documentId);
      this.text(990, 230, document?.title || T('t_57ab7f469418af7b2669'), 25, 700, '#684a31');
      this.text(990, 485, document?.text || T('t_3ccdc1258c0e1da07445'), 28, 695, '#302b25');
      this.button(720, 820, T('t_a513713e38bde1212feb'), () => this.change('prepare'));
      this.footer(); return;
    }
    if (this.progress.line < DATA.dialogue.length) { this.showFinalSpeech(); return; }
    if (this.progress.candidate) {
      const choice = DATA.choices.find(item => item.id === this.progress.candidate);
      this.text(720, 230, choice.label, 31, 1250, '#efd299'); this.text(720, 450, choice.confirmation, 30, 1250);
      this.button(400, 730, T('t_cc6eaeda1473c39a0346'), () => this.change('cancel'));
      this.button(1040, 730, T('t_15a214b54415ce730f3d'), () => this.change('confirm', choice.id));
      this.footer(); return;
    }
    this.showFinalDecision();
  }
  makeFinalPanel(text, { speaker = 'DETECTIVE', topics = [], onAdvance = null, nodeId = 'holly_finale' } = {}) {
    if (this.disposed || this.closing || !this.conversationPanel || this.conversationPanel.destroyed) return;
    this.conversationAdvance = onAdvance;
    const fullText = [text, this.feedback, this.saved === false ? T('t_f8bcf4a6b2fed2087321') : '',
      this.preview ? T('t_c36a98bd14da8b295adf') : ''].filter(Boolean).join('\n\n');
    return this.conversationPanel.show({ title: speaker, text: fullText,
      messages: [{ speaker: speaker === 'DETECTIVE' ? 'player' : 'npc', text: fullText }],
      choices: topics.map(topic => ({ id: `${nodeId}:${topic.id}`, label: topic.label,
        attitude: 'neutral', scoreTrust: false, disabled: topic.state === 'disabled',
        state: topic.state === 'accent' ? 'normal' : topic.state || 'normal',
        action: () => { if (!this.disposed && !this.closing && topic.state !== 'disabled') topic.onSelect?.(); } })),
      nodeId, npcId: HOLLY_TRUST_VIEW_ID, showTrust: true, scoreTrust: false, startTrust: getHollyTrust(), depth: 6000,
      onAdvance: () => this.conversationAdvance?.() });
  }
  runFinalPanelAction(callback) {
    if (this.disposed || this.closing || this.time.now < this.clickAfter) return;
    this.clickAfter = this.time.now + 180; callback();
  }
  showFinalSpeech() {
    const line = DATA.dialogue[this.progress.line];
    this.makeFinalPanel(line.text, { speaker: line.speaker, nodeId: `holly_finale_speech:${this.progress.line}`,
      topics: [{ id: 'continue', label: 'Continue', onSelect: () => this.conversationPanel?.advance() }],
      onAdvance: () => this.runFinalPanelAction(() => this.change('next')) });
  }
  showFinalDecision() {
    this.makeFinalPanel(T('t_55df0fb5e1f043bd776c') + '\n\n' + T('t_b7ab572d7b723265b24e'), {
      nodeId: 'holly_finale_decision', topics: DATA.choices.map(choice => ({ id: choice.id, label: choice.label,
        onSelect: () => this.runFinalPanelAction(() => this.change('choose', choice.id)) })) });
  }
  footer() {
    this.text(720, 854, this.feedback, 19, 1320, '#e5c58e');
    this.text(720, 964, (this.preview ? T('t_c36a98bd14da8b295adf') : '') + (this.saved === false
      ? T('t_f8bcf4a6b2fed2087321') : this.progress.completed ? T('t_f95e09c23d90b2d8667d') : T('t_37055f758b668cc4a26a')), 16, 1350, '#bec7aa');
  }
  change(action, id = null) {
    if (this.disposed || this.closing || !this.allowed) return false;
    const result = this.preview && action === 'retry_save'
      ? { ok: true, state: this.progress, saved: null, message: '' }
      : this.preview ? finaleAction(DATA, this.progress, action, id) : performHollyFinale(action, id);
    this.progress = normalizeFinale(DATA, result.state); this.feedback = result.message;
    if (typeof result.saved === 'boolean') this.saved = result.saved;
    this.render(); return result.ok;
  }
  requestBack() {
    if (this.disposed || this.closing) return;
    if (this.progress.completed) {
      if (!this.preview && this.saved === false) { this.confirmExit = true; this.render(); }
      else this.returnToOffice();
    } else this.closeVisit();
  }
  returnToOffice() {
    if (this.disposed || this.closing) return;
    const office = this.scene.manager.keys.DetectiveOfficeScene;
    if (!office || (!this.scene.isActive('DetectiveOfficeScene') && !this.scene.isPaused('DetectiveOfficeScene'))) {
      this.closeVisit(); return;
    }
    const keys = ['HollyFinaleScene', 'JohnConfrontationScene', 'JohnIncidentFilesScene',
      'JohnPrimaryRecordsScene', 'JohnAccountReviewScene', 'WarsawMeetingScene'];
    const chain = keys.map(key => ({ key, target: this.scene.manager.keys[key] }))
      .filter(({ key, target }) => target && (this.scene.isActive(key) || this.scene.isPaused(key)));
    for (const { target } of chain) target.closing = true;
    for (const { key, target } of chain) { target.restore?.(); this.scene.stop(key); }
  }
  onKey(event) {
    if (this.disposed || this.closing || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
      event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (this.conversationPanel?.root || event.code !== 'Escape') return;
    event.preventDefault();
    if (this.confirmExit) { this.confirmExit = false; this.render(); }
    else if (this.progress.candidate) this.change('cancel'); else this.requestBack();
  }
  notifyFinished() {
    const callback = this.onFinished; this.onFinished = null;
    try { callback?.({ preview: this.preview, completed: this.progress?.completed === true,
      outcome: this.progress?.outcome ?? null, saved: this.saved }); }
    catch (error) { console.error('[Holly finale] Completion callback failed:', error); }
  }
  clearConversation() { this.conversationAdvance = null; this.conversationPanel?.close(false); }
  closeVisit() {
    if (this.disposed || this.closing) return;
    this.closing = true; this.clearConversation(); this.restore(); this.scene.stop();
  }
  disposeFinale() {
    if (this.disposed) return;
    this.disposed = true; this.conversationAdvance = null;
    this.conversationPanel?.destroy(); this.conversationPanel = null;
    this.scale.off('resize', this.resize); this.input.keyboard?.off('keydown', this.keyHandler);
    this.restore(); this.notifyFinished();
    this.events.off('shutdown', this.disposeFinale, this); this.events.off('destroy', this.disposeFinale, this);
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
