import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { radioSpliceData as DATA, getRadioSpliceStory, storeRadioSplice } from '../radioSpliceService.js';
import { normalizeRadio, placeRadio, evaluateRadio, radioHint } from './archive/RadioSpliceModel.js';
import { TimelineHelpController } from './archive/TimelineHelpController.js';
import { preloadPaper, playPaperChange } from './archive/PaperPuzzleAudio.js';
import { audioManager } from '../managers/AudioManager.js';

export class RadioSpliceScene extends BaseScene {
  constructor() { super({ key: 'RadioSpliceScene' }); }
  init(data = {}) {
    this.preview = data.preview === true; this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.progress = null; this.finished = false; this.resolved = false; this.closing = false;
    this.selected = null; this.selectedSlot = null; this.inspected = null;
    this.cards = []; this.slotObjects = []; this.conclusionButtons = [];
    this.modal = null; this.modalIndex = 0; this.lockUntil = 0; this.timelineHelp = null; this.savedOk = null;
    this.layerStates = []; this.parentPausedByMe = false; this.playingSound = null; this.playbackRun = 0;
    this.caseKey = 'holly_missing_husband'; this.stationId = 'john_radio_splice';
    this.evidenceConfig = { id: 'john_radio_splice' };
  }
  audioKey(id) { return `john_radio_clip_${id}`; }
  preload() {
    preloadPaper(this);
    for (const clip of DATA.clips) {
      if (typeof clip.audio === 'string' && clip.audio.trim() && !this.cache.audio.exists(this.audioKey(clip.id))) {
        this.load.audio(this.audioKey(clip.id), clip.audio);
      }
    }
  }
  create() {
    super.create(); audioManager.init(this);
    const story = getRadioSpliceStory(); this.allowed = this.preview || story.eligible;
    this.progress = normalizeRadio(DATA, this.preview ? null : story);
    this.finished = this.progress.completed; this.resolved = !this.allowed;
    this.cameras.main.setBackgroundColor('#121c16'); this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(720, 510, 1440, 1020, 0x18271e));
    this.label(720, 42, DATA.title, 22, '#f0ce88', 'PressStart2P');
    this.button(1235, 972, 'BACK', () => this.closeSplice());
    this.mode = this.label(720, 1006, (this.preview ? __dialogueText("scenes/RadioSpliceScene.js", "t_50d1058f5474fe46bb88") : '') +
      (DATA.clips.some(c => this.cache.audio.exists(this.audioKey(c.id))) ?
      __dialogueText("scenes/RadioSpliceScene.js", "t_66ef8e80758f8cdbc7c9") : __dialogueText("scenes/RadioSpliceScene.js", "t_6cf25fbc0758ffee8220")), 13, '#baa98e');
    if (this.allowed) this.buildBoard();
    else this.label(720, 470, __dialogueText("scenes/RadioSpliceScene.js", "t_789e01efad23d98a1382"), 28);
    this.layout(); this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown-ESC', e => {
      if (e.repeat) return;
      if (this.modal) this.closeModal(); else if (this.timelineHelp?.modal) this.timelineHelp.close();
      else this.closeSplice();
    });
    this.suspendBackground();
    this.events.once('shutdown', () => {
      this.stopAudio(); this.timelineHelp?.destroy(); this.restoreBackground(); this.onFinished = null;
    });
  }
  label(x, y, text, size = 21, color = '#e9dfc8', font = 'SpecialElite', parent = this.root) {
    const o = this.add.text(x, y, text, { fontFamily: `${font}, monospace`, fontSize: `${size}px`,
      color, align: 'center', wordWrap: { width: 1350 }, lineSpacing: 5 }).setOrigin(.5);
    parent.add(o); return o;
  }
  button(x, y, text, callback, parent = this.root) {
    const o = this.add.text(x, y, text, { fontFamily: 'SpecialElite', fontSize: '21px', color: '#f1d89d',
      backgroundColor: '#354c39', padding: { x: 16, y: 11 } }).setOrigin(.5).setInteractive({ useHandCursor: true });
    o.on('pointerdown', (p, x, y, e) => {
      e?.stopPropagation();
      if (this.closing || this.time.now < this.lockUntil || (this.modal && parent !== this.modal)) return;
      this.lockUntil = this.time.now + 120; this.stopAudio(); callback();
    }); parent.add(o); return o;
  }
  buildBoard() {
    this.label(720, 84, __dialogueText("scenes/RadioSpliceScene.js", "t_221a0406d5d3aba45862"), 20);
    this.button(260, 122, __dialogueText("scenes/RadioSpliceScene.js", "t_dd98480f3147dd9ef671"), () => this.openSummary());
    this.playButton = this.button(720, 122, __dialogueText("scenes/RadioSpliceScene.js", "t_4ddc213de59398f0576e"), () => this.playSelected());
    this.playButton.disableInteractive();
    this.button(1160, 122, __dialogueText("scenes/RadioSpliceScene.js", "t_a665bcb34cca50ae8acb"), () => this.openSequence());
    this.label(360, 166, __dialogueText("scenes/RadioSpliceScene.js", "t_27a6d32d295f7d251c2f"), 19, '#cdbb9a');
    this.label(1080, 166, __dialogueText("scenes/RadioSpliceScene.js", "t_9cceb56fe67a392833ef"), 19, '#cdbb9a');
    Phaser.Utils.Array.Shuffle([...DATA.clips]).forEach((clip, i) => {
      const x = 193 + (i % 2) * 344, y = 245 + Math.floor(i / 2) * 135;
      const box = this.add.rectangle(x, y, 326, 112, 0xe2d4b6).setStrokeStyle(2, 0x9b8662)
        .setInteractive({ useHandCursor: true });
      const title = this.add.text(x, y - 34, clip.label, { fontFamily: 'SpecialElite', fontSize: '20px',
        color: '#3f3126' }).setOrigin(.5);
      const text = this.add.text(x, y + 12, clip.text.length > 76 ? clip.text.slice(0, 73) + __dialogueText("scenes/RadioSpliceScene.js", "t_ab5df625bc76dbd4e163") : clip.text,
        { fontFamily: 'SpecialElite', fontSize: '18px', color: '#534636', align: 'center',
          wordWrap: { width: 300 } }).setOrigin(.5);
      this.root.add([box, title, text]);
      box.on('pointerdown', () => {
        if (this.blocked()) return;
        this.inspect(clip.id); if (this.finished) return;
        this.selected = this.selected === clip.id ? null : clip.id;
        this.selectedSlot = null; this.refreshBoard();
      }); this.cards.push({ id: clip.id, box });
    });
    for (let i = 0; i < DATA.slotCount; i++) {
      const y = 220 + i * 73;
      const box = this.add.rectangle(1080, y, 630, 65, 0x304232).setStrokeStyle(2, 0x957a58)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(1080, y, '', { fontFamily: 'SpecialElite', fontSize: '20px', color: '#f0dfbd',
        align: 'center', wordWrap: { width: 600 } }).setOrigin(.5);
      this.root.add([box, text]); box.on('pointerdown', () => this.chooseSlot(i)); this.slotObjects.push({ box, text });
    }
    this.root.add(this.add.rectangle(720, 736, 1360, 116, 0xe2d4b6).setStrokeStyle(2, 0x9b8662));
    this.sourceTitle = this.label(720, 701, __dialogueText("scenes/RadioSpliceScene.js", "t_34322b80037a88324d77"), 18, '#74463a');
    this.sourceBody = this.label(720, 750, DATA.provenance, 20, '#3d332c'); this.sourceBody.setWordWrapWidth(1300);
    this.label(720, 819, __dialogueText("scenes/RadioSpliceScene.js", "t_6740bdbb740259210dbc"), 19, '#cdbb9a');
    DATA.conclusions.forEach((item, i) => {
      const button = this.button(260 + i * 460, 864, item.label, () => {
        if (this.finished) return;
        this.progress.conclusion = item.id; this.persist(); this.refreshBoard();
      }); this.conclusionButtons.push({ id: item.id, button });
    });
    this.message = this.label(720, 918, __dialogueText("scenes/RadioSpliceScene.js", "t_7d8052156f730bb5500b"), 20);
    this.checkButton = this.button(265, 972, __dialogueText("scenes/RadioSpliceScene.js", "t_773a258e7e29b83a9722"), () => this.check());
    this.clearButton = this.button(600, 972, __dialogueText("scenes/RadioSpliceScene.js", "t_dfaa13932eb9b80ee382"), () => this.clearSlot());
    this.timelineHelp = new TimelineHelpController(this); this.timelineHelp.create();
    this.refreshBoard(); if (this.finished) this.showSuccess();
  }
  blocked() { return this.closing || Boolean(this.modal) || Boolean(this.timelineHelp?.modal) || !this.allowed; }
  inspect(id) {
    this.stopAudio(); const c = DATA.clips.find(c => c.id === id); if (!c) return;
    this.inspected = id; this.sourceTitle.setText(`${c.label}${__dialogueText("scenes/RadioSpliceScene.js", "t_005e1574a2b5c8163046")}${c.speaker}`); this.sourceBody.setText(c.text);
    const available = this.cache.audio.exists(this.audioKey(id));
    this.playButton.setText(available ? __dialogueText("scenes/RadioSpliceScene.js", "t_6bce4b54636c0515c847") : __dialogueText("scenes/RadioSpliceScene.js", "t_1fb1ceab2385c243b09c"));
    if (available) this.playButton.setInteractive({ useHandCursor: true }); else this.playButton.disableInteractive();
  }
  chooseSlot(i) {
    if (this.blocked()) return;
    if (this.progress.slots[i]) this.inspect(this.progress.slots[i]);
    if (this.finished) return;
    const before = [...this.progress.slots];
    if (this.selected) {
      this.progress = placeRadio(DATA, this.progress, this.selected, i);
      this.selected = null; this.selectedSlot = i; this.persist();
    } else if (this.selectedSlot !== null && this.selectedSlot !== i) {
      const j = this.selectedSlot;
      [this.progress.slots[j], this.progress.slots[i]] = [this.progress.slots[i], this.progress.slots[j]];
      this.selectedSlot = null; this.persist();
    } else this.selectedSlot = this.selectedSlot === i ? null : i;
    playPaperChange(this, before, this.progress.slots); this.refreshBoard();
  }
  clearSlot() {
    if (this.finished || this.blocked() || this.selectedSlot === null) return;
    const before = [...this.progress.slots]; this.progress.slots[this.selectedSlot] = null;
    this.selectedSlot = null; this.selected = null; this.persist();
    playPaperChange(this, before, this.progress.slots); this.refreshBoard();
  }
  refreshBoard() {
    this.cards.forEach(c => {
      c.box.setFillStyle(this.progress.slots.includes(c.id) ? 0xc2c8ae : 0xe2d4b6);
      c.box.setStrokeStyle(this.selected === c.id ? 4 : 2, this.selected === c.id ? 0xe7ac48 : 0x9b8662);
    });
    this.slotObjects.forEach(({ box, text }, i) => {
      const clip = DATA.clips.find(c => c.id === this.progress.slots[i]);
      text.setText(`${i + 1}${__dialogueText("scenes/RadioSpliceScene.js", "t_8dccf256f6d5783e62bb")}${clip ? clip.label + __dialogueText("scenes/RadioSpliceScene.js", "t_005e1574a2b5c8163046") + clip.text.slice(0, 49) + __dialogueText("scenes/RadioSpliceScene.js", "t_ab5df625bc76dbd4e163") : __dialogueText("scenes/RadioSpliceScene.js", "t_f01546c6703d0677b4db")}`);
      box.setStrokeStyle(this.selectedSlot === i ? 4 : 2, this.selectedSlot === i ? 0xe7ac48 : 0x957a58);
    });
    this.conclusionButtons.forEach(({ id, button }) => button.setBackgroundColor(this.progress.conclusion === id ? '#725337' : '#354c39'));
  }
  getForensicHelp() {
    const h = radioHint(DATA, this.progress);
    return { ...h, targets: [h.clipId ? this.cards.find(c => c.id === h.clipId)?.box : null,
      Number.isInteger(h.slotIndex) ? this.slotObjects[h.slotIndex]?.box : null,
      h.conclusionId ? this.conclusionButtons.find(c => c.id === h.conclusionId)?.button : null].filter(Boolean) };
  }
  setDialogue(text) { this.message?.setText(`${__dialogueText("scenes/RadioSpliceScene.js", "t_e0e94082545fdad681ba")}${text}`).setFontSize(18); }
  persist() { if (!this.preview && this.allowed) this.savedOk = storeRadioSplice(this.progress).saved; }
  check() {
    if (this.finished || this.blocked()) return;
    this.progress.checks++; const result = evaluateRadio(DATA, this.progress);
    if (!result.ok) {
      if (Number.isInteger(result.slotIndex)) this.selectedSlot = result.slotIndex;
      this.message.setText(result.message).setFontSize(20); this.persist(); this.refreshBoard(); return;
    }
    this.progress.completed = true; this.finished = true; this.persist(); this.showSuccess();
  }
  showSuccess() {
    this.checkButton.setVisible(false); this.clearButton.setVisible(false);
    this.timelineHelp?.hintButton?.setVisible(false); this.conclusionButtons.forEach(c => c.button.disableInteractive());
    this.sourceTitle.setText(__dialogueText("scenes/RadioSpliceScene.js", "t_3022bf9302ef1caeb2c4"));
    this.sourceBody.setText(DATA.success);
    this.message.setText(this.preview ? __dialogueText("scenes/RadioSpliceScene.js", "t_a03d734f160f3ebabcdd") : this.savedOk === false ?
      DATA.messages.saveFailed : DATA.messages.complete).setFontSize(20); this.refreshBoard();
  }
  makeModal() {
    this.stopAudio(); this.modal = this.add.container(0, 0); this.root.add(this.modal);
    const shade = this.add.rectangle(720, 510, 1440, 1020, 0x000000, .86).setInteractive();
    shade.on('pointerdown', (p, x, y, e) => e?.stopPropagation()); this.modal.add(shade);
    this.modal.add(this.add.rectangle(720, 510, 1300, 760, 0x14251a).setStrokeStyle(3, 0xa58c56));
  }
  openSummary() {
    this.makeModal();
    this.label(720, 245, __dialogueText("scenes/RadioSpliceScene.js", "t_ade856a770c5b99c87aa"), 28, '#ffe2ae', 'SpecialElite', this.modal);
    this.label(720, 430, DATA.report, 29, '#f0e5cf', 'SpecialElite', this.modal).setWordWrapWidth(1160);
    this.label(720, 620, DATA.provenance, 23, '#c4ccb9', 'SpecialElite', this.modal).setWordWrapWidth(1160);
    this.button(720, 800, 'BACK', () => this.closeModal(), this.modal);
  }
  openSequence() {
    if (this.progress.slots.some(id => !id)) {
      this.message.setText(__dialogueText("scenes/RadioSpliceScene.js", "t_c170e1b611a1057e5f15")); return;
    }
    this.modalIndex = 0; this.makeModal(); this.renderSequence();
  }
  renderSequence() {
    const old = this.modal; this.modal = null; old.destroy(true); this.makeModal();
    const c = DATA.clips.find(c => c.id === this.progress.slots[this.modalIndex]);
    this.label(720, 230, `${__dialogueText("scenes/RadioSpliceScene.js", "t_b99dada6846254023171")}${this.modalIndex + 1}${__dialogueText("scenes/RadioSpliceScene.js", "t_8a5edab282632443219e")}${DATA.slotCount}${__dialogueText("scenes/RadioSpliceScene.js", "t_005e1574a2b5c8163046")}${c.label}`,
      27, '#ffe2ae', 'SpecialElite', this.modal);
    this.label(720, 330, c.speaker, 24, '#d7c295', 'SpecialElite', this.modal);
    this.label(720, 490, c.text, 31, '#f0e5cf', 'SpecialElite', this.modal).setWordWrapWidth(1150);
    if (this.modalIndex > 0) this.button(300, 760, 'PREVIOUS', () => { this.modalIndex--; this.renderSequence(); }, this.modal);
    if (this.modalIndex < DATA.slotCount - 1) this.button(1140, 760, 'NEXT', () => { this.modalIndex++; this.renderSequence(); }, this.modal);
    this.button(720, 820, __dialogueText("scenes/RadioSpliceScene.js", "t_e51e832d5fa933221814"), () => this.closeModal(), this.modal);
    if (this.progress.slots.every(id => this.cache.audio.exists(this.audioKey(id)))) {
      this.button(720, 700, __dialogueText("scenes/RadioSpliceScene.js", "t_7059fff4cf85ae4dce57"), () => this.playAudioOrder([...this.progress.slots]), this.modal);
    }
  }
  closeModal() {
    this.stopAudio(); const m = this.modal; this.modal = null; m?.destroy(true); this.lockUntil = this.time.now + 180;
  }
  stopAudio() {
    this.playbackRun++; const sound = this.playingSound; this.playingSound = null;
    if (sound) audioManager.releaseSound(sound);
  }
  playSelected() { if (this.inspected) this.playAudioOrder([this.inspected]); }
  playAudioOrder(ids) {
    this.stopAudio(); const token = this.playbackRun;
    const next = index => {
      if (token !== this.playbackRun || this.closing || !this.sys.isActive() || index >= ids.length) return;
      const key = this.audioKey(ids[index]); if (!this.cache.audio.exists(key)) return;
      try {
        audioManager.init(this);
        const sound = audioManager.playVoice(key);
        if (!sound) return;
        this.playingSound = sound;
        sound.once('complete', () => {
          if (this.playingSound === sound) this.playingSound = null;
          next(index + 1);
        });
      } catch (error) {
        this.stopAudio();
        this.message?.setText(__dialogueText("scenes/RadioSpliceScene.js", "t_9bad0480e3aed6291f68"));
      }
    }; next(0);
  }
  layout() {
    if (!this.root) return;
    const { width, height } = this.scale, s = Math.min(width / 1440, height / 1020);
    this.root.setScale(s).setPosition((width - 1440 * s) / 2, (height - 1020 * s) / 2);
  }
  suspendBackground() {
    this.layerStates = ['PlayerHudScene', 'UIScene', 'NewsHud'].filter(k => this.isSceneActive(k)).map(key => {
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
  closeSplice() {
    if (this.closing) return;
    this.closing = true; this.stopAudio(); this.timelineHelp?.close(); this.persist();
    const callback = this.onFinished; this.onFinished = null; this.restoreBackground();
    try { callback?.({ preview: this.preview, completed: this.finished, saved: this.savedOk }); }
    finally { this.scene.stop(); }
  }
}
