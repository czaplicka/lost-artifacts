import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { createArchiveIcon } from './archive/ArchiveCardIcons.js';
import { progressionManager } from '../managers/ProgressionManager.js';
import { preloadPuzzleSfx, playPuzzleSfx } from './archive/PuzzleSfx.js';

const STATE_KEY = 'archive_index_puzzle';
const FLAG = 'duplicate_record_found';
const XP_REWARD_ID = 'story_puzzle_small';
const XP_EVENT_ID = JSON.stringify(['reward', XP_REWARD_ID, STATE_KEY]);
const DATA = [
  { id: 'expenses_0', pairId: 'expenses', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_c625b1b8c856605191e0"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_4ce0f00d1c6e675747d9"), icon: 'receipt', type: 'DOCUMENT' },
  { id: 'expenses_1', pairId: 'expenses', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_66d9c488b5fa766b17b3"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_3b1533d20a099df1ae56"), icon: 'coins', type: 'DEPARTMENT' },
  { id: 'conservation_0', pairId: 'conservation', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_52efe945f9167296ad4b"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_6f6f938c751254087bb3"), icon: 'vase', type: 'DOCUMENT' },
  { id: 'conservation_1', pairId: 'conservation', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_7885df82014dd9253c45"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_556cf8fb012f6cc0ef4a"), icon: 'brush', type: 'DEPARTMENT' },
  { id: 'customs_0', pairId: 'customs', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_64ea71c657590ef413ba"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_c5ea58564be0c1e0f38f"), icon: 'crate', type: 'DOCUMENT' },
  { id: 'customs_1', pairId: 'customs', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_f8f2700b5e3b9b37e328"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_bd4bcaf10132b7f9d60a"), icon: 'barrier', type: 'DEPARTMENT' },
  { id: 'training_0', pairId: 'training', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_6a6f8af6e7113a780eab"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_c5a17724b8f7e9622dc1"), icon: 'key', type: 'DOCUMENT' },
  { id: 'training_1', pairId: 'training', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_25806b3b4fcf4b1659d1"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_cbb8ab7feb838abf8063"), icon: 'cap', type: 'DEPARTMENT' },
  { id: 'loan_0', pairId: 'loan', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_72e282e69b07f03cf79b"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_f3598a9dfebf52196104"), icon: 'mask', type: 'DOCUMENT' },
  { id: 'loan_1', pairId: 'loan', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_bd8e0c38e7fe662a741e"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_496c38d719087b6bd043"), icon: 'calendar', type: 'DEPARTMENT' },
  { id: 'maintenance_0', pairId: 'maintenance', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_1b46feb3a6b8a013838b"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_5d1653276a59da9934f9"), icon: 'projector', type: 'DOCUMENT' },
  { id: 'maintenance_1', pairId: 'maintenance', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_7bdba5d37c1e69519065"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_c028b044978f76129980"), icon: 'wrench', type: 'DEPARTMENT' },
  { id: 'leave_0', pairId: 'leave', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_e88cb87f9fc3ece0e096"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_69a5b8a39c83659b7dcc"), icon: 'suitcase', type: 'DOCUMENT' },
  { id: 'leave_1', pairId: 'leave', title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_3f5e2e801e62cb1756d8"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_23d60f060e21ba8a5184"), icon: 'person', type: 'DEPARTMENT' },
  { id: 'john_general', pairId: null, title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_404dde77ac060d8742e1"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_ee71193e13e1a324a85a"), icon: 'folder', type: 'INDEX' },
  { id: 'john_restricted', pairId: null, title: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_404dde77ac060d8742e1"), body: __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_c9b9ec4e3e128cf8ae39"), icon: 'lock', type: 'INDEX' }
];
const PAIR_IDS = [...new Set(DATA.map(card => card.pairId).filter(Boolean))];

export class ArchiveIndexPuzzleScene extends BaseScene {
  constructor() { super({ key: 'ArchiveIndexPuzzleScene' }); }
  init(data = {}) {
    this.preview = data.preview === true; this.returnSceneKey = data.returnSceneKey ?? null;
    this.resumeReturnScene = data.resumeReturnScene === true; this.manageBackground = data.manageBackground === true;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.selected = []; this.cards = []; this.matched = new Set(); this.mistakes = 0;
    this.finished = false; this.locked = false; this.closing = false; this.pendingReset = null;
    this.layerStates = []; this.parentPausedByMe = false; this.savedOk = null; this.xpGranted = 0;
  }
  preload() { preloadPuzzleSfx(this, ['paper', 'stamp']); }
  create() {
    super.create();
    const saved = this.preview ? null : MainStoryManager.getSideClue(STATE_KEY);
    this.finished = !this.preview && MainStoryManager.hasFlag(FLAG);
    if (Array.isArray(saved?.matchedPairIds)) this.matched = new Set(saved.matchedPairIds.filter(id => PAIR_IDS.includes(id)));
    this.mistakes = Number.isInteger(saved?.mistakes) && saved.mistakes >= 0 ? saved.mistakes : 0;
    const ids = DATA.map(card => card.id), order = saved?.order;
    const valid = Array.isArray(order) && order.length === ids.length && new Set(order).size === ids.length && order.every(id => ids.includes(id));
    this.order = valid ? [...order] : Phaser.Utils.Array.Shuffle([...ids]);
    this.cameras.main.setBackgroundColor('#171619'); this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(640, 450, 1280, 900, 0x302729));
    this.label(640, 45, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_40ed767feeede2764aa7"), 23, '#f0ce88', 'PressStart2P');
    this.label(640, 88, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_5d45e9b23a99e671c7d1"), 23);
    this.progress = this.label(640, 123, '', 20, '#bbccb2');
    this.message = this.label(640, 782, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_cab6cfda8df2ae9c4605"), 22);
    this.label(485, 850, this.preview ? __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_db1d7313ec962ed15287") : __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_e1122d1fc2343ed7d3d2"), 20, '#bbaa94');
    const back = this.add.text(1080, 850, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_639807a2e01886a2236b"), { fontFamily: 'SpecialElite, monospace', fontSize: '23px',
      color: '#f1d89d', backgroundColor: '#4a3933', padding: { x: 24, y: 13 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.root.add(back); back.on('pointerdown', () => this.closePuzzle());
    if (this.finished) this.showDiscovery(); else this.buildCards();
    this.updateProgress(); this.layout(); this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.manageBackground) this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.pendingReset?.remove(false); this.pendingReset = null; this.releaseParent(); this.onFinished = null;
    });
  }
  label(x, y, text, size = 21, color = '#e9dfc8', font = 'SpecialElite') {
    const object = this.add.text(x, y, text, { fontFamily: `${font}, monospace`, fontSize: `${size}px`,
      color, align: 'center', wordWrap: { width: 1190 } }).setOrigin(0.5);
    this.root.add(object); return object;
  }
  buildCards() {
    this.order.forEach((id, index) => {
      const data = DATA.find(card => card.id === id);
      const item = this.add.container(184 + (index % 4) * 304, 235 + Math.floor(index / 4) * 143);
      const paper = this.add.rectangle(0, 0, 286, 129, 0xe2d4b6).setStrokeStyle(2, 0x9c8969);
      const type = this.add.text(-130, -53, data.type, { fontFamily: 'SpecialElite, monospace', fontSize: '13px', color: '#79684f' });
      const badge = this.add.rectangle(-108, 4, 46, 58, 0xd3c3a2).setStrokeStyle(1, 0xb7a37d);
      const icon = createArchiveIcon(this, data.icon, -128, -17, 1.25);
      const title = this.add.text(-73, -29, data.title, { fontFamily: 'SpecialElite, monospace', fontSize: '18px',
        color: '#352c29', wordWrap: { width: 208 } }).setOrigin(0, 0.5);
      const body = this.add.text(-73, 17, data.body, { fontFamily: 'SpecialElite, monospace', fontSize: '16px',
        color: '#4d4339', lineSpacing: 2, wordWrap: { width: 208 } }).setOrigin(0, 0.5);
      const stamp = this.add.text(85, 49, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_fbf6cd7473b41ac36799"), { fontFamily: 'SpecialElite, monospace', fontSize: '19px',
        color: '#245f3e', backgroundColor: '#d3d8bc', padding: { x: 4, y: 1 } }).setOrigin(0.5).setAngle(-10).setVisible(false);
      item.add([paper, type, badge, icon, title, body, stamp]); this.root.add(item);
      const card = { ...data, item, paper, stamp, matched: this.matched.has(data.pairId) }; this.cards.push(card);
      paper.setInteractive({ useHandCursor: true }); paper.on('pointerdown', () => this.selectCard(card));
      if (card.matched) { paper.disableInteractive(); stamp.setVisible(true); }
      this.paint(card);
    });
    if (this.matched.size === PAIR_IDS.length) this.message.setText(__dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_776815a304e431a38589"));
  }
  paint(card) {
    const selected = this.selected.includes(card), ready = card.type === 'INDEX' && this.matched.size === PAIR_IDS.length;
    card.paper.setFillStyle(card.matched ? 0xc1c8ad : selected ? 0xf5e6bd : 0xe2d4b6);
    card.paper.setStrokeStyle(selected || ready ? 4 : 2, selected || ready ? 0xe7ac48 : card.matched ? 0x6a8160 : 0x9c8969);
  }
  selectCard(card) {
    if (this.locked || this.finished || this.closing || card.matched) return;
    const index = this.selected.indexOf(card);
    if (index !== -1) {
      this.selected.splice(index, 1); this.paint(card); playPuzzleSfx(this, 'paper'); return;
    }
    this.selected.push(card); this.paint(card);
    if (this.selected.length < 2) { playPuzzleSfx(this, 'paper'); return; }
    const [first, second] = this.selected;
    if (first.type === 'INDEX' && second.type === 'INDEX') {
      playPuzzleSfx(this, 'paper');
      if (this.matched.size === PAIR_IDS.length) this.finishPuzzle();
      else this.reject(__dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_3cf66bb58f86b93c923a"), false);
      return;
    }
    if (first.pairId && first.pairId === second.pairId) {
      this.matched.add(first.pairId);
      this.selected.forEach(chosen => { chosen.matched = true; chosen.stamp.setVisible(true); chosen.paper.disableInteractive(); });
      this.selected = []; this.cards.forEach(item => this.paint(item));
      playPuzzleSfx(this, 'stamp', 0.35);
      this.message.setText(this.matched.size === PAIR_IDS.length ? __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_776815a304e431a38589") :
        __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_5c9a58644e60d7e48402"));
      this.updateProgress(); this.persist(); return;
    }
    playPuzzleSfx(this, 'paper');
    this.reject(first.type === second.type && first.type !== 'INDEX' ? __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_16b416ff250bcd01027b") :
      __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_7f070af7ba9d000052fd"), true);
  }
  reject(message, count) {
    this.locked = true; if (count) this.mistakes += 1;
    this.message.setText(message); this.selected.forEach(card => card.paper.setStrokeStyle(4, 0xb45a48)); this.persist();
    this.pendingReset = this.time.delayedCall(1100, () => {
      const previous = [...this.selected]; this.selected = []; this.locked = false; this.pendingReset = null;
      previous.forEach(card => this.paint(card));
    });
  }
  updateProgress() {
    this.progress.setText(this.finished ? __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_408c4bbfd23844c2f475") : `${__dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_116837fc64775fe77c19")}${this.matched.size}${__dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_005e1574a2b5c8163046")}${PAIR_IDS.length}${__dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_323676d2440ef8e6504b")}`);
  }
  persist() {
    if (this.preview) return;
    MainStoryManager.setSideClue(STATE_KEY, { version: 2, completed: this.finished, order: [...this.order],
      matchedPairIds: [...this.matched], matchedPairs: this.matched.size, mistakes: this.mistakes,
      documentId: this.finished ? 'JM-041' : null, subject: this.finished ? __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_c6c05357000a64339920") : null,
      destinations: this.finished ? ['general_archive', 'restricted_storage'] : [] });
    if (this.finished) MainStoryManager.setFlag(FLAG, true);
    try { this.savedOk = saveGameState(); }
    catch (error) { this.savedOk = false; console.error('[ArchiveIndexPuzzle] Save failed:', error); }
  }
  grantCompletionXP() {
    let result;
    try { result = progressionManager.grantReward(XP_REWARD_ID, STATE_KEY, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_d525c7e1a7a12d9716aa")); }
    catch (error) {
      if (!progressionManager.hasReward(XP_EVENT_ID)) throw error;
      console.error('[ArchiveIndexPuzzle] XP notification failed after commit:', error);
      result = { success: false, reason: 'already_granted' };
    }
    if (!result.success && result.reason !== 'already_granted') throw new Error(`XP settlement failed: ${result.reason || 'unknown_error'}`);
    if (!progressionManager.hasReward(XP_EVENT_ID)) throw new Error('The archive puzzle XP reward was not recorded.');
    return result.success ? result.grantedXP : 0;
  }
  finishPuzzle() {
    if (this.finished || this.locked || this.closing || this.matched.size !== PAIR_IDS.length ||
        this.selected.length !== 2 || !this.selected.every(card => card.type === 'INDEX')) return;
    this.locked = true;
    if (!this.preview) {
      try { this.xpGranted = this.grantCompletionXP(); }
      catch (error) {
        console.error('[ArchiveIndexPuzzle] XP settlement failed:', error);
        this.selected = []; this.cards.forEach(card => this.paint(card)); this.locked = false;
        this.message.setText(__dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_a8d5d90409fd7cc2b82f")); return;
      }
    }
    this.finished = true; this.selected = []; this.persist();
    this.cards.forEach(card => card.item.setVisible(false)); this.showDiscovery(); this.updateProgress();
    if (!this.preview) this.emitBus('archive:indexPuzzleCompleted', { documentId: 'JM-041', flag: FLAG });
  }
  showDiscovery() {
    this.root.add(this.add.rectangle(640, 438, 1060, 500, 0xe2d4b6).setStrokeStyle(3, 0x9c8969));
    this.label(640, 240, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_529d9fd7415279c998fd"), 29, '#4c3028');
    this.label(640, 320, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_9816fbbde63a603c3e7a"), 27, '#38302b');
    this.root.add(createArchiveIcon(this, 'folder', 240, 380, 2));
    this.root.add(createArchiveIcon(this, 'lock', 750, 380, 2));
    this.label(385, 475, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_4d161c7f2d65fbdae97d"), 25, '#354c3a');
    this.label(895, 475, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_b4b3830456e2f18b77de"), 25, '#853b32');
    this.label(640, 575, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_4c9fea3ab767cdc7be3f"), 23, '#38302b');
    this.label(640, 645, __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_539886cd2e2f58ae5170"), 22, '#725747');
    if (this.preview) { this.message.setText(__dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_3347d4705417b396bbb1")); return; }
    const xpText = this.xpGranted > 0 ? `${__dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_c13f23cc27f966a4eadf")}${this.xpGranted}${__dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_a73feda6e2f76a6b740b")}` : '';
    this.message.setText(this.savedOk === false ? __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_8a0fc895da36ab65ac09") + xpText + __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_d0d65156abf04f7ac203") :
      __dialogueText("scenes/ArchiveIndexPuzzleScene.js", "t_9aa904252ae8b1252f94") + xpText);
  }
  layout() {
    if (!this.root) return;
    const { width, height } = this.scale, scale = Math.min(width / 1280, height / 900);
    this.root.setScale(scale).setPosition((width - 1280 * scale) / 2, (height - 900 * scale) / 2);
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
  releaseParent() {
    for (const { key, visible } of this.layerStates) {
      if (!this.hasScene(key)) continue;
      this.scene.setVisible(visible, key); if (this.isScenePaused(key)) this.scene.resume(key);
    }
    this.layerStates = [];
    if ((this.parentPausedByMe || this.resumeReturnScene) && this.returnSceneKey && this.isScenePaused(this.returnSceneKey)) {
      this.scene.resume(this.returnSceneKey);
    }
    this.parentPausedByMe = false; this.resumeReturnScene = false;
  }
  closePuzzle() {
    if (this.closing) return;
    this.closing = true; this.persist(); const callback = this.onFinished; this.onFinished = null; this.releaseParent();
    try { callback?.({ completed: this.finished, preview: this.preview, mistakes: this.mistakes, documentId: this.finished ? 'JM-041' : null }); }
    finally { this.scene.stop(); }
  }
}
