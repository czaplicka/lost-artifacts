import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { escapeTimelineData as DATA, getEscapeTimelineStory, storeEscapeTimeline } from '../escapeTimelineService.js';
import { normalizeEscape, advanceEscapeClarification, placeEscapeCard, evaluateEscape, escapeHint } from './storage/EscapeTimelineModel.js';
import { TimelineHelpController } from './archive/TimelineHelpController.js';
import { preloadPaper, playPaperChange } from './archive/PaperPuzzleAudio.js';

export class EscapeTimelineScene extends BaseScene {
  constructor() { super({ key: 'EscapeTimelineScene' }); }
  init(data = {}) {
    this.preview = data.preview === true;
    this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.progress = null; this.selected = null; this.selectedSlot = null;
    this.cards = []; this.slotObjects = []; this.conclusionButtons = [];
    this.finished = false; this.resolved = false; this.closing = false;
    this.savedOk = null; this.stageSynced = null; this.timelineHelp = null;
    this.layerStates = []; this.parentPausedByMe = false; this.inputLockedUntil = 0;
    this.caseKey = 'holly_missing_husband'; this.stationId = 'john_staged_escape';
    this.evidenceConfig = { id: 'john_escape_timeline' };
  }
  preload() { preloadPaper(this); }
  create() {
    super.create();
    const story = getEscapeTimelineStory(); this.allowed = this.preview || story.eligible;
    this.progress = normalizeEscape(DATA, this.preview ? null : story);
    this.finished = this.progress.completed; this.resolved = !this.allowed;
    this.cameras.main.setBackgroundColor('#171619'); this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(720, 510, 1440, 1020, 0x302729));
    this.content = this.add.container(0, 0); this.root.add(this.content);
    this.label(720, 42, DATA.title, 24, '#f0ce88', 'PressStart2P', this.root);
    this.button(1235, 972, 'BACK', () => this.closeTimeline(), this.root);
    this.mode = this.label(720, 1006, this.preview ? __dialogueText("scenes/EscapeTimelineScene.js", "t_db1d7313ec962ed15287") :
      __dialogueText("scenes/EscapeTimelineScene.js", "t_fe7c3cd29673a481a79c"), 13, '#baa98e', 'SpecialElite', this.root);
    if (!this.allowed) this.label(720, 480, __dialogueText("scenes/EscapeTimelineScene.js", "t_21d55de9984b2a58ea4b"), 29);
    else if (!this.progress.clarificationHeard) this.buildClarification(); else this.buildBoard();
    this.layout(); this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown-ESC', event => {
      if (!event.repeat) this.closeTimeline();
    });
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.restoreBackground(); this.onFinished = null;
    });
  }
  label(x, y, text, size = 21, color = '#e9dfc8', font = 'SpecialElite', parent = this.content) {
    const object = this.add.text(x, y, text, { fontFamily: `${font}, monospace`, fontSize: `${size}px`,
      color, align: 'center', wordWrap: { width: 1350 }, lineSpacing: 6 }).setOrigin(0.5);
    parent.add(object); return object;
  }
  button(x, y, text, callback, parent = this.content) {
    const object = this.add.text(x, y, text, { fontFamily: 'SpecialElite, monospace', fontSize: '21px',
      color: '#f1d89d', backgroundColor: '#4a3933', padding: { x: 17, y: 12 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    object.on('pointerdown', (p, x, y, event) => {
      event?.stopPropagation(); if (!this.closing) callback();
    }); parent.add(object); return object;
  }
  buildClarification() {
    this.content.removeAll(true); this.label(720, 230, __dialogueText("scenes/EscapeTimelineScene.js", "t_755ee6928d36d1cb9592"), 28, '#f0ce88');
    this.label(720, 470, DATA.clarification[this.progress.clarificationLine], 30);
    this.button(720, 770, this.progress.clarificationLine === DATA.clarification.length - 1 ?
      __dialogueText("scenes/EscapeTimelineScene.js", "t_842023449004f11a1186") : 'CONTINUE', () => {
      if (this.time.now < this.inputLockedUntil) return;
      this.inputLockedUntil = this.time.now + 180;
      this.progress = advanceEscapeClarification(DATA, this.progress); this.persist();
      if (this.progress.clarificationHeard) this.buildBoard(); else this.buildClarification();
    });
  }
  buildBoard() {
    this.content.removeAll(true);
    this.label(720, 88, __dialogueText("scenes/EscapeTimelineScene.js", "t_98d71b47559a887ab145"), 21);
    this.label(720, 120, __dialogueText("scenes/EscapeTimelineScene.js", "t_24741cff7cf28e8e233f"), 20, '#c5b59a');
    this.label(360, 159, __dialogueText("scenes/EscapeTimelineScene.js", "t_ae090581dd9ad5cc19b7"), 19, '#cdbb9a');
    this.label(1080, 159, __dialogueText("scenes/EscapeTimelineScene.js", "t_386d3375ef1d41c1d1b3"), 19, '#cdbb9a');
    Phaser.Utils.Array.Shuffle([...DATA.cards]).forEach((card, index) => {
      const x = 193 + (index % 2) * 344, y = 243 + Math.floor(index / 2) * 110;
      const box = this.add.rectangle(x, y, 326, 100, 0xe2d4b6).setStrokeStyle(2, 0x9b8662)
        .setInteractive({ useHandCursor: true });
      const title = this.add.text(x, y - 29, card.title, { fontFamily: 'SpecialElite', fontSize: '20px',
        color: '#3f3126', align: 'center', wordWrap: { width: 304 } }).setOrigin(0.5);
      const body = this.add.text(x, y + 18, card.text, { fontFamily: 'SpecialElite', fontSize: '17px',
        color: '#534636', align: 'center', wordWrap: { width: 300 } }).setOrigin(0.5);
      this.content.add([box, title, body]);
      box.on('pointerdown', () => {
        if (this.closing || this.timelineHelp?.modal) return;
        this.inspect(card.id); if (!this.canEdit()) return;
        this.selected = this.selected === card.id ? null : card.id;
        this.selectedSlot = null; this.refreshBoard();
      }); this.cards.push({ id: card.id, box });
    });
    for (let index = 0; index < DATA.slotCount; index++) {
      const y = 231 + index * 85;
      const box = this.add.rectangle(1080, y, 630, 75, 0x493b35).setStrokeStyle(2, 0x957a58)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(1080, y, '', { fontFamily: 'SpecialElite', fontSize: '21px',
        color: '#f0dfbd', align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5);
      this.content.add([box, text]); box.on('pointerdown', () => this.chooseSlot(index));
      this.slotObjects.push({ box, text });
    }
    this.content.add(this.add.rectangle(720, 736, 1360, 116, 0xe2d4b6).setStrokeStyle(2, 0x9b8662));
    this.sourceTitle = this.label(720, 701, __dialogueText("scenes/EscapeTimelineScene.js", "t_108b1fd9151c8c24d764"), 18, '#74463a');
    this.sourceBody = this.label(720, 750, __dialogueText("scenes/EscapeTimelineScene.js", "t_006b078135800e361ea4"), 20, '#3d332c');
    this.sourceBody.setWordWrapWidth(1300);
    this.label(720, 819, __dialogueText("scenes/EscapeTimelineScene.js", "t_84cdca535d0221086214"), 19, '#cdbb9a');
    DATA.conclusions.forEach((item, index) => {
      const button = this.button(260 + index * 460, 864, item.label, () => {
        if (!this.canEdit()) return;
        this.progress.conclusion = item.id; this.persist(); this.refreshBoard();
      }); this.conclusionButtons.push({ id: item.id, button });
    });
    this.message = this.label(720, 918, __dialogueText("scenes/EscapeTimelineScene.js", "t_6b1c550cbaf46058f1b6"), 20);
    this.checkButton = this.button(265, 972, __dialogueText("scenes/EscapeTimelineScene.js", "t_b4493e0624ec05e17e42"), () => this.checkTimeline());
    this.clearButton = this.button(600, 972, __dialogueText("scenes/EscapeTimelineScene.js", "t_dfaa13932eb9b80ee382"), () => this.clearSlot());
    this.timelineHelp = new TimelineHelpController(this); this.timelineHelp.create();
    this.refreshBoard(); if (this.finished) this.showSuccess();
  }
  canEdit() { return this.allowed && !this.finished && !this.closing && !this.timelineHelp?.modal; }
  inspect(id) {
    const card = DATA.cards.find(item => item.id === id);
    const source = DATA.evidence.find(item => item.id === card?.evidence);
    if (source) { this.sourceTitle.setText(`${card.title}${__dialogueText("scenes/EscapeTimelineScene.js", "t_005e1574a2b5c8163046")}${source.title}`); this.sourceBody.setText(source.text); }
  }
  chooseSlot(index) {
    if (this.closing || this.timelineHelp?.modal) return;
    if (this.progress.slots[index]) this.inspect(this.progress.slots[index]);
    if (!this.canEdit()) return;
    const before = [...this.progress.slots];
    if (this.selected) {
      this.progress = placeEscapeCard(DATA, this.progress, this.selected, index);
      this.selected = null; this.selectedSlot = index; this.persist();
    } else if (this.selectedSlot !== null && this.selectedSlot !== index) {
      const first = this.selectedSlot;
      [this.progress.slots[first], this.progress.slots[index]] = [this.progress.slots[index], this.progress.slots[first]];
      this.selectedSlot = null; this.persist();
    } else this.selectedSlot = this.selectedSlot === index ? null : index;
    playPaperChange(this, before, this.progress.slots); this.refreshBoard();
  }
  clearSlot() {
    if (!this.canEdit() || this.selectedSlot === null) return;
    const before = [...this.progress.slots];
    this.progress.slots[this.selectedSlot] = null;
    this.selectedSlot = null; this.selected = null; this.persist();
    playPaperChange(this, before, this.progress.slots); this.refreshBoard();
  }
  refreshBoard() {
    this.cards.forEach(card => {
      card.box.setFillStyle(this.progress.slots.includes(card.id) ? 0xc2c8ae : 0xe2d4b6);
      card.box.setStrokeStyle(this.selected === card.id ? 4 : 2, this.selected === card.id ? 0xe7ac48 : 0x9b8662);
    });
    this.slotObjects.forEach(({ box, text }, index) => {
      const card = DATA.cards.find(item => item.id === this.progress.slots[index]);
      text.setText(`${index + 1}${__dialogueText("scenes/EscapeTimelineScene.js", "t_8dccf256f6d5783e62bb")}${card?.title ?? __dialogueText("scenes/EscapeTimelineScene.js", "t_c86957f856ebb1f781bf")}`);
      box.setStrokeStyle(this.selectedSlot === index ? 4 : 2, this.selectedSlot === index ? 0xe7ac48 : 0x957a58);
    });
    this.conclusionButtons.forEach(({ id, button }) => button.setBackgroundColor(this.progress.conclusion === id ? '#725337' : '#4a3933'));
  }
  getForensicHelp() {
    const hint = escapeHint(DATA, this.progress);
    return { ...hint, targets: [hint.cardId ? this.cards.find(card => card.id === hint.cardId)?.box : null,
      Number.isInteger(hint.slotIndex) ? this.slotObjects[hint.slotIndex]?.box : null,
      hint.conclusionId ? this.conclusionButtons.find(item => item.id === hint.conclusionId)?.button : null].filter(Boolean) };
  }
  setDialogue(text) { this.message?.setText(`${__dialogueText("scenes/EscapeTimelineScene.js", "t_e0e94082545fdad681ba")}${text}`).setFontSize(18); }
  persist() {
    if (this.preview || !this.allowed) return;
    const result = storeEscapeTimeline(this.progress);
    this.savedOk = result.saved; this.stageSynced = result.stageSynced;
  }
  checkTimeline() {
    if (!this.canEdit()) return;
    const result = evaluateEscape(DATA, this.progress); this.progress.checks++;
    if (!result.ok) {
      if (result.cardId) this.inspect(result.cardId);
      if (Number.isInteger(result.slotIndex)) this.selectedSlot = result.slotIndex;
      this.message.setText(result.message).setFontSize(20); this.persist(); this.refreshBoard(); return;
    }
    this.progress.completed = true; this.finished = true; this.selected = null; this.selectedSlot = null;
    this.persist(); this.showSuccess();
  }
  showSuccess() {
    this.checkButton.setVisible(false); this.clearButton.setVisible(false);
    this.timelineHelp?.hintButton?.setVisible(false);
    this.conclusionButtons.forEach(item => item.button.disableInteractive());
    this.sourceTitle.setText(__dialogueText("scenes/EscapeTimelineScene.js", "t_cd2088cb02151e7272f7")); this.sourceBody.setText(DATA.success);
    this.message.setText(this.preview ? __dialogueText("scenes/EscapeTimelineScene.js", "t_a291ed7256cec4187b32") : this.savedOk === false ?
      DATA.messages.saveFailed : this.stageSynced === false ?
      __dialogueText("scenes/EscapeTimelineScene.js", "t_68abfdfff6c9f05c1967") : DATA.messages.complete).setFontSize(20);
    this.refreshBoard();
  }
  layout() {
    if (!this.root) return;
    const { width, height } = this.scale, s = Math.min(width / 1440, height / 1020);
    this.root.setScale(s).setPosition((width - 1440 * s) / 2, (height - 1020 * s) / 2);
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
  closeTimeline() {
    if (this.closing) return;
    this.closing = true; this.timelineHelp?.close(); this.persist();
    const callback = this.onFinished; this.onFinished = null; this.restoreBackground();
    try { callback?.({ preview: this.preview, completed: this.finished, saved: this.savedOk, stageSynced: this.stageSynced }); }
    finally { this.scene.stop(); }
  }
}
