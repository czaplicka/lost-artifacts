import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { advanceCrimeTutorial } from '../CrimeCityTutorial.js';
import {
  allWitnessesVisited, getWitnessTestimony,
  getTimelineBoardData, NO_ALIBI_LIAR
} from '../alibi/AlibiEncounterSetup.js';
import {
  getFiledAlibiConclusion, fileAlibiConclusion
} from '../alibi/AlibiConclusion.js';

const W = 1100;
const H = 900;
const time = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export class AlibiTimelineScene extends BaseScene {
  constructor() { super({ key: 'AlibiTimelineScene' }); }

  init(data = {}) {
    this.caseKey = data.caseKey || null;
    this.suspectId = data.suspectId || null;
    this.cityId = data.cityId || null;
    this.returnScene = data.returnScene || 'CrimeCityScene';
    this.returnData = data.returnData || { cityId: this.cityId };
    this.cards = [];
    this.witnesses = [];
    this.slots = [null, null, null];
    this.choice = null;
    this.root = null;
    this.modal = null;
    this.messageText = null;
    this.busy = false;
    this.solved = false;
    this.result = 'pending';
    this.feedback = '';
    this.feedbackColor = '#594a36';
  }

  create() {
    super.create();
    this.stopSceneIfActive('NewsHud');
    this.getPlayerHudScene()?.closeAllUIPanels?.();
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1).setBackgroundColor('#171b22');
    this.trackInputEvent(this.scale, 'resize', this.fitView, this);
    try { this.loadBoard(); this.render(); }
    catch (error) {
      console.error('[AlibiTimelineScene] Cannot open board:', error);
      this.createRoot();
      this.text(this.root, 60, 160, 'The alibi board is unavailable. Complete all three interviews first.', 960, { fontSize: '26px' });
      this.button(this.root, 30, 830, 260, 48, 'Return to city', () => void this.returnToCity());
    }
  }

  loadBoard() {
    if (!this.caseKey || !this.suspectId || !allWitnessesVisited(this.caseKey, this.suspectId)) {
      throw new Error('Missing case data or incomplete interviews.');
    }
    const board = getTimelineBoardData(this.caseKey, this.suspectId);
    if (board.boardCards?.length !== 3 || !board.crimeWindow) throw new Error('Incomplete board data.');
    this.cards = board.boardCards;
    this.crimeWindow = board.crimeWindow;
    const encounters = gameState.crimeCityEncounterState?.[this.caseKey] || [];
    this.witnesses = encounters.filter(entry => entry.suspectId === this.suspectId && entry.alibiWitness === true)
      .map(entry => getWitnessTestimony(this.caseKey, this.suspectId, entry.npcId));
    if (this.witnesses.length !== 3 || this.witnesses.some(w => !w)) throw new Error('Missing witness statements.');
    this.suspectName = this.witnesses[0].suspectName || 'the suspect';
    const filed = getFiledAlibiConclusion(this.caseKey, this.suspectId);
    if (filed) {
      this.solved = true;
      this.result = filed.status;
      this.choice = filed.choice;
      if (filed.timelineIds.length === 3) this.slots = [...filed.timelineIds];
    }
  }

  createRoot() {
    this.modal = null;
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);
    this.fitView();
    this.root.add(this.add.rectangle(W / 2, H / 2, W - 16, H - 16, 0xede1c4).setStrokeStyle(3, 0x8a7350));
  }

  fitView() {
    if (!this.root) return;
    const scale = Math.min(this.scale.width / W, this.scale.height / H);
    this.root.setScale(scale).setPosition((this.scale.width - W * scale) / 2, (this.scale.height - H * scale) / 2);
  }

  text(parent, x, y, content, width, options = {}) {
    const object = this.add.text(x, y, content, {
      fontFamily: 'SpecialElite', fontSize: '19px', color: '#382e24', wordWrap: { width }, ...options
    });
    parent.add(object);
    return object;
  }

  button(parent, x, y, width, height, label, callback, { selected = false, disabled = false } = {}) {
    const fill = selected ? 0x846a3f : 0x493d30;
    const bg = this.add.rectangle(x + width / 2, y + height / 2, width, height, fill)
      .setStrokeStyle(selected ? 4 : 2, selected ? 0xe2bd71 : 0x9b815b);
    parent.add(bg);
    this.text(parent, x + 10, y + height / 2, label, width - 20, {
      fontSize: '18px', color: '#fff3d6', align: 'center'
    }).setOrigin(0, 0.5).setFixedSize(width - 20, 0);
    if (disabled) { bg.setAlpha(0.5); return; }
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x705c42))
      .on('pointerout', () => bg.setFillStyle(fill))
      .on('pointerdown', () => { if (!this.busy) callback(); });
  }

  getChoices() {
    return [...this.witnesses.map(w => ({ id: w.npcId, label: `${w.role} is lying` })),
      { id: NO_ALIBI_LIAR, label: 'Nobody lies: the alibi holds' }];
  }

  render() {
    this.createRoot();
    this.text(this.root, 30, 24, 'ALIBI BOARD', 650, { fontFamily: 'PressStart2P', fontSize: '18px' });
    this.text(this.root, 30, 60, `Suspect: ${this.suspectName}`, 740);
    this.text(this.root, 30, 92, `Theft window: ${time(this.crimeWindow.startMinute)}–${time(this.crimeWindow.endMinute)}`, 740);
    this.button(this.root, 815, 30, 250, 48, 'Read statements', () => this.openStatements(0));
    if (this.solved) {
      this.text(this.root, 70, 210, 'CONCLUSION FILED', 960, {
        fontFamily: 'PressStart2P', fontSize: '23px', align: 'center'
      });
      const choice = this.getChoices().find(item => item.id === this.choice);
      this.text(this.root, 80, 290,
        `Your assessment: ${this.result === 'confirmed' ? 'alibi accepted' : 'alibi challenged'}.\n\n` +
        (choice ? `Recorded conclusion: ${choice.label}.\n\n` : '') +
        'This report is final and cannot be amended.', 940,
        { fontSize: '26px', align: 'center', lineSpacing: 10 });
      const ordered = this.slots.map(id => this.cards.find(card => card.id === id)).filter(Boolean);
      if (ordered.length === 3) this.text(this.root, 90, 540,
        'Filed timeline:\n' + ordered.map((card, index) => `${index + 1}. ${card.role}: ${card.label}`).join('\n\n'),
        920, { fontSize: '19px' });
      this.drawFooter();
      return;
    }
    this.text(this.root, 30, 130, '1. Put the three witness accounts in time order, earliest first.', 1020);
    this.slots.forEach((id, index) => {
      const card = this.cards.find(item => item.id === id);
      this.drawCard(30 + index * 355, 175, 330, 150,
        card?.role || ['EARLIEST', 'MIDDLE', 'LATEST'][index], card?.label || 'Click a witness card below.', () => {
          if (this.solved) return;
          this.slots[index] = null;
          this.feedback = '';
          this.render();
        });
    });
    this.text(this.root, 30, 345, 'Click a placed card to take it back before filing.', 1020, { fontSize: '17px' });
    this.cards.forEach((card, index) => {
      const placed = this.slots.includes(card.id);
      this.drawCard(30 + index * 355, 380, 330, 150, card.role,
        placed ? 'Placed on the timeline.' : card.label,
        () => this.placeCard(card.id), placed);
    });
    this.text(this.root, 30, 555, '2. Choose your conclusion.', 1000);
    this.getChoices().forEach((choice, index) => this.button(this.root,
      30 + (index % 2) * 535, 600 + Math.floor(index / 2) * 70, 510, 58,
      this.choice === choice.id ? `>> ${choice.label} <<` : choice.label,
      () => { if (!this.solved) { this.choice = choice.id; this.feedback = ''; this.render(); } },
      { selected: this.choice === choice.id }));
    this.text(this.root, 30, 755, 'Filing is final. Your report cannot be changed afterwards.', 1030, { fontSize: '17px' });
    this.drawFooter();
  }

  drawCard(x, y, width, height, title, body, callback, disabled = false) {
    const bg = this.add.rectangle(x + width / 2, y + height / 2, width, height, disabled ? 0xd2c5aa : 0xfff5dc)
      .setStrokeStyle(2, 0xa38b63);
    this.root.add(bg);
    this.text(this.root, x + 15, y + 12, String(title).toUpperCase(), width - 30, { fontSize: '18px' });
    const text = this.text(this.root, x + 15, y + 42, body, width - 30, { fontSize: '18px' });
    while (text.height > height - 50 && parseInt(text.style.fontSize, 10) > 13) text.setFontSize(parseInt(text.style.fontSize, 10) - 1);
    if (!disabled) bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.busy && !this.solved) callback();
    });
  }

  drawFooter() {
    this.messageText = this.text(this.root, 30, 795, this.feedback, 1030, { fontSize: '17px', color: '#594a36' });
    this.button(this.root, 30, 841, 245, 42, 'Return to city', () => void this.returnToCity());
    if (this.solved) return;
    this.button(this.root, 425, 841, 180, 42, 'Clear draft', () => {
      this.slots = [null, null, null]; this.choice = null; this.feedback = ''; this.render();
    });
    this.button(this.root, 745, 841, 320, 42, 'FILE CONCLUSION', () => this.checkDeduction());
  }

  placeCard(id) {
    if (this.solved || this.slots.includes(id)) return;
    const index = this.slots.indexOf(null);
    if (index < 0) { this.setFeedback('The timeline is full. Remove a card first.'); return; }
    this.slots[index] = id;
    this.feedback = '';
    this.render();
  }

  setFeedback(message) {
    this.feedback = message;
    this.messageText?.setText(message);
  }

  checkDeduction() {
    if (this.busy || this.solved) return;
    this.busy = true;
    try {
      const result = fileAlibiConclusion(this.caseKey, this.suspectId, [...this.slots], this.choice);
      if (!result.accepted) { this.setFeedback(result.message); return; }
      this.result = result.status;
      this.solved = true;
      if (result.alreadyFiled) this.loadBoard();
      if (result.status === 'contradicted') {
        advanceCrimeTutorial(gameState, 'find_liar');
        saveGameState();
      }
      this.feedback = 'Conclusion recorded.';
      this.render();
    } catch (error) {
      console.error('[AlibiTimelineScene] Filing failed:', error);
      // Recover the lock if persistence threw after the in-memory commit.
      const filed = getFiledAlibiConclusion(this.caseKey, this.suspectId);
      if (filed) { this.result = filed.status; this.solved = true; this.render(); }
      this.setFeedback('The report could not be fully saved. Check the console.');
    } finally { this.busy = false; }
  }

  openStatements(index) {
    this.modal?.destroy(true);
    const witness = this.witnesses[index];
    if (!witness) return;
    this.modal = this.add.container(0, 0);
    this.root.add(this.modal);
    this.modal.add(this.add.rectangle(W / 2, H / 2, W, H, 0x171b22, 0.98).setInteractive());
    this.text(this.modal, 65, 65, `${index + 1}/3 — ${witness.role}`, 970, { fontSize: '30px', color: '#fff0ce' });
    const statement = this.text(this.modal, 65, 180, witness.statement, 970, {
      fontSize: '27px', color: '#fff0ce', lineSpacing: 10
    });
    while (statement.height > 520 && parseInt(statement.style.fontSize, 10) > 16) statement.setFontSize(parseInt(statement.style.fontSize, 10) - 1);
    this.button(this.modal, 65, 775, 250, 55, 'Previous', () => this.openStatements((index + 2) % 3));
    this.button(this.modal, 425, 775, 250, 55, 'Close', () => { this.modal?.destroy(true); this.modal = null; });
    this.button(this.modal, 785, 775, 250, 55, 'Next', () => this.openStatements((index + 1) % 3));
  }

  async returnToCity() {
    if (this.busy || this._cleanupDone) return;
    this.busy = true;
    const opened = await this.goto(this.returnScene, this.returnData);
    if (!opened && !this._cleanupDone) { this.busy = false; this.setFeedback('Could not return to the city. Try again.'); }
  }
}
