import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { allWitnessesVisited, getWitnessTestimony, getTimelineBoardData, NO_ALIBI_LIAR } from '../alibi/AlibiEncounterSetup.js';
import { getFiledAlibiConclusion, fileAlibiConclusion } from '../alibi/AlibiConclusion.js';
import { AlibiDeductionController } from '../alibi/AlibiDeductionController.js';
import { formatNoteTime, getAlibiTimeNote, getAlibiTimeDetail, getAlibiCardBody } from '../alibi/AlibiTimeNotes.js';
import { preloadPuzzleSfx, playPuzzleSfx, playPuzzlePaperChange } from './archive/PuzzleSfx.js';

const W = 1100, H = 1040;
const FEEDBACK_ERROR = '#b3261e', FEEDBACK_NORMAL = '#594a36', FEEDBACK_SUCCESS = '#35633b';

export class AlibiTimelineScene extends BaseScene {
  constructor() { super({ key: 'AlibiTimelineScene' }); }
  init(data = {}) {
    this.caseKey = data.caseKey || null; this.suspectId = data.suspectId || null; this.cityId = data.cityId || null;
    this.returnScene = data.returnScene || 'CrimeCityScene';
    this.returnData = data.returnData || { cityId: this.cityId };
    this.cards = []; this.witnesses = []; this.slots = [null, null, null]; this.choice = null;
    this.root = null; this.modal = null; this.messageText = null;
    this.busy = false; this.solved = false; this.result = 'pending';
    this.feedback = ''; this.feedbackColor = FEEDBACK_NORMAL;
    this.deduction = new AlibiDeductionController(this);
  }
  preload() { preloadPuzzleSfx(this, ['paper', 'stamp', 'page']); }
  create() {
    super.create(); this.stopSceneIfActive('NewsHud'); this.getPlayerHudScene()?.closeAllUIPanels?.();
    this.cameras.main.resetFX(); this.cameras.main.setAlpha(1).setBackgroundColor('#171b22');
    this.trackInputEvent(this.scale, 'resize', this.fitView, this);
    try { this.loadBoard(); this.render(); }
    catch (error) {
      console.error('[AlibiTimelineScene] Cannot open board:', error); this.createRoot();
      this.text(this.root, 60, 160, __dialogueText("scenes/AlibiTimelineScene.js", "t_263ed4e760bf1b9a7025"), 960,
        { fontSize: '26px', color: FEEDBACK_ERROR });
      this.button(this.root, 30, 975, 260, 48, __dialogueText("scenes/AlibiTimelineScene.js", "t_ef5f430bcbebe3c2a89e"), () => void this.returnToCity());
    }
  }
  loadBoard() {
    if (!this.caseKey || !this.suspectId || !allWitnessesVisited(this.caseKey, this.suspectId)) {
      throw new Error('Incomplete interviews or missing case.');
    }
    const board = getTimelineBoardData(this.caseKey, this.suspectId);
    if (board.boardCards?.length !== 3 || !board.crimeWindow) throw new Error('Incomplete board data.');
    this.cards = board.boardCards; this.crimeWindow = board.crimeWindow;
    const encounters = gameState.crimeCityEncounterState?.[this.caseKey] || [];
    this.witnesses = encounters.filter(entry => entry.suspectId === this.suspectId && entry.alibiWitness === true)
      .map(entry => getWitnessTestimony(this.caseKey, this.suspectId, entry.npcId));
    if (this.witnesses.length !== 3 || this.witnesses.some(witness => !witness)) throw new Error('Missing witness statements.');
    this.suspectName = this.witnesses[0].suspectName || __dialogueText("scenes/AlibiTimelineScene.js", "t_94864ebff58640bcf9bd");
    const filed = getFiledAlibiConclusion(this.caseKey, this.suspectId);
    if (filed) {
      this.solved = true; this.result = filed.status; this.choice = filed.choice;
      if (filed.timelineIds.length === 3) this.slots = [...filed.timelineIds];
    }
  }
  createRoot() {
    this.modal = null; this.root?.destroy(true); this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(W / 2, H / 2, W - 16, H - 16, 0xede1c4).setStrokeStyle(3, 0x8a7350));
    this.fitView();
  }
  fitView() {
    if (!this.root) return;
    const scale = Math.min(this.scale.width / W, this.scale.height / H);
    this.root.setScale(scale).setPosition((this.scale.width - W * scale) / 2, (this.scale.height - H * scale) / 2);
  }
  text(parent, x, y, content, width, options = {}) {
    const object = this.add.text(x, y, content, { fontFamily: 'SpecialElite', fontSize: '19px',
      color: '#382e24', wordWrap: { width }, ...options });
    parent.add(object); return object;
  }
  fitText(object, maxHeight, minimum = 14) {
    while (object.height > maxHeight && parseInt(object.style.fontSize, 10) > minimum) {
      object.setFontSize(parseInt(object.style.fontSize, 10) - 1);
    } return object;
  }
  button(parent, x, y, width, height, label, callback, { selected = false, disabled = false } = {}) {
    const fill = selected ? 0x846a3f : 0x493d30;
    const background = this.add.rectangle(x + width / 2, y + height / 2, width, height, fill)
      .setStrokeStyle(selected ? 4 : 2, selected ? 0xe2bd71 : 0x9b815b);
    parent.add(background);
    const labelObject = this.text(parent, x + 10, y + height / 2, label, width - 20,
      { fontSize: '18px', color: '#fff3d6', align: 'center' }).setOrigin(0, 0.5);
    labelObject.setFixedSize(width - 20, 0); this.fitText(labelObject, height - 8, 14);
    if (disabled) { background.setAlpha(0.5); return; }
    background.setInteractive({ useHandCursor: true })
      .on('pointerover', () => background.setFillStyle(0x705c42))
      .on('pointerout', () => background.setFillStyle(fill))
      .on('pointerdown', () => { if (!this.busy) callback(); });
  }
  getChoices() {
    return [...this.witnesses.map(witness => ({ id: witness.npcId, label: `${witness.role}${__dialogueText("scenes/AlibiTimelineScene.js", "t_5679bfb52e114bb8ed59")}` })),
      { id: NO_ALIBI_LIAR, label: __dialogueText("scenes/AlibiTimelineScene.js", "t_c48873d09a7f05c36613") }];
  }
  cardBody(card) { return getAlibiCardBody(this.caseKey, this.suspectId, card); }
  clearFeedback() { this.feedback = ''; this.feedbackColor = FEEDBACK_NORMAL; }
  render() {
    this.createRoot();
    this.text(this.root, 30, 24, __dialogueText("scenes/AlibiTimelineScene.js", "t_3a8f8356d92ed967ab69"), 650, { fontFamily: 'PressStart2P', fontSize: '18px' });
    this.text(this.root, 30, 60, `${__dialogueText("scenes/AlibiTimelineScene.js", "t_05cf8d861256c647989d")}${this.suspectName}`, 740);
    this.text(this.root, 30, 92, `${__dialogueText("scenes/AlibiTimelineScene.js", "t_7616c02697947346991b")}${formatNoteTime(this.crimeWindow.startMinute)}${__dialogueText("scenes/AlibiTimelineScene.js", "t_d4f85d36757c12f0c6da")}${formatNoteTime(this.crimeWindow.endMinute)}`, 740);
    this.button(this.root, 815, 25, 250, 42, __dialogueText("scenes/AlibiTimelineScene.js", "t_8167e45a7d804b55d026"), () => this.openStatements(0));
    this.button(this.root, 815, 78, 250, 42, __dialogueText("scenes/AlibiTimelineScene.js", "t_24c80fc526ab3ab50d53"), () => this.openTimeComparison());
    if (this.solved) { this.renderFiledConclusion(); this.drawFooter(); return; }
    this.text(this.root, 30, 135, __dialogueText("scenes/AlibiTimelineScene.js", "t_dcde4e93bb14166ab42e"), 1030, { fontSize: '18px' });
    this.slots.forEach((id, index) => {
      const card = this.cards.find(item => item.id === id);
      this.drawCard(30 + index * 355, 175, 330, 170,
        card?.role || ['EARLIEST', 'MIDDLE', 'LATEST'][index],
        card ? this.cardBody(card) : __dialogueText("scenes/AlibiTimelineScene.js", "t_abacd1c0eff4fca04b6a"), () => {
          const before = [...this.slots]; this.slots[index] = null;
          playPuzzlePaperChange(this, before, this.slots); this.clearFeedback(); this.render();
        });
      this.button(this.root, 30 + index * 355, 355, 330, 40,
        this.deduction.label('timeline', index), () => this.deduction.run('timeline', index));
    });
    this.text(this.root, 30, 403, __dialogueText("scenes/AlibiTimelineScene.js", "t_d7b3b0fcbe68d759c6aa"), 1020, { fontSize: '17px' });
    this.cards.forEach((card, index) => {
      const placed = this.slots.includes(card.id);
      this.drawCard(30 + index * 355, 435, 330, 170, card.role,
        placed ? __dialogueText("scenes/AlibiTimelineScene.js", "t_85de7d945297a3f7758b") : this.cardBody(card), () => this.placeCard(card.id), placed);
    });
    this.text(this.root, 30, 620, __dialogueText("scenes/AlibiTimelineScene.js", "t_4fe437b11415d160d6cc"), 1000);
    this.getChoices().forEach((choice, index) => {
      this.button(this.root, 30 + (index % 2) * 535, 655 + Math.floor(index / 2) * 65, 510, 54,
        this.choice === choice.id ? `>> ${choice.label} <<` : choice.label, () => {
          this.choice = choice.id; this.clearFeedback(); this.render();
        }, { selected: this.choice === choice.id });
    });
    this.button(this.root, 30, 790, 510, 42, this.deduction.label('conclusion'), () => this.deduction.run('conclusion'));
    this.text(this.root, 560, 790, __dialogueText("scenes/AlibiTimelineScene.js", "t_461280d4a10f1cdf9ab6"), 500, { fontSize: '17px' });
    this.text(this.root, 30, 845, this.deduction.summaryText(), 1030, { fontSize: '17px' });
    this.text(this.root, 30, 878, __dialogueText("scenes/AlibiTimelineScene.js", "t_9cff3824b9819aa4ddc3"), 1030, { fontSize: '17px' });
    this.drawFooter();
  }
  renderFiledConclusion() {
    this.text(this.root, 70, 195, __dialogueText("scenes/AlibiTimelineScene.js", "t_42a1b2bdeaae77df4bf4"), 960,
      { fontFamily: 'PressStart2P', fontSize: '23px', align: 'center' });
    const choice = this.getChoices().find(item => item.id === this.choice);
    this.text(this.root, 80, 265,
      `${__dialogueText("scenes/AlibiTimelineScene.js", "t_7eda8808f2052a3cf5b8")}${this.result === 'confirmed' ? __dialogueText("scenes/AlibiTimelineScene.js", "t_0f45e964291a0355a292") : __dialogueText("scenes/AlibiTimelineScene.js", "t_b7b79f44ca8c14649150")}${__dialogueText("scenes/AlibiTimelineScene.js", "t_0673d69ff78439adfb40")}` +
      (choice ? `${__dialogueText("scenes/AlibiTimelineScene.js", "t_671cc099d6e9efb1011c")}${choice.label}${__dialogueText("scenes/AlibiTimelineScene.js", "t_0673d69ff78439adfb40")}` : '') + __dialogueText("scenes/AlibiTimelineScene.js", "t_3bb4f7d1197dbc8ebd69"), 940,
      { fontSize: '25px', align: 'center', lineSpacing: 8 });
    const ordered = this.slots.map(id => this.cards.find(card => card.id === id)).filter(Boolean);
    if (ordered.length === 3) {
      const timeline = this.text(this.root, 70, 490, __dialogueText("scenes/AlibiTimelineScene.js", "t_337ab597f2e5809dcb42") +
        ordered.map((card, index) => `${index + 1}. ${card.role}\n${this.cardBody(card)}`).join('\n\n'),
        960, { fontSize: '20px' });
      this.fitText(timeline, 380, 15);
    }
  }
  drawCard(x, y, width, height, title, body, callback, disabled = false) {
    const background = this.add.rectangle(x + width / 2, y + height / 2, width, height,
      disabled ? 0xd2c5aa : 0xfff5dc).setStrokeStyle(2, 0xa38b63);
    this.root.add(background);
    const heading = this.text(this.root, x + 15, y + 10, String(title).toUpperCase(), width - 30, { fontSize: '18px' });
    this.fitText(heading, 35, 13);
    const content = this.text(this.root, x + 15, y + 48, body, width - 30, { fontSize: '18px', lineSpacing: 3 });
    this.fitText(content, height - 58, 13);
    if (!disabled) background.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.busy && !this.solved && !this.modal) callback();
    });
  }
  drawFooter() {
    this.messageText = this.text(this.root, 30, 914, this.feedback, 1030, { fontSize: '17px', color: this.feedbackColor });
    this.button(this.root, 30, 988, 245, 42, __dialogueText("scenes/AlibiTimelineScene.js", "t_ef5f430bcbebe3c2a89e"), () => void this.returnToCity());
    if (this.solved) return;
    this.button(this.root, 425, 988, 180, 42, __dialogueText("scenes/AlibiTimelineScene.js", "t_8e9c3b1cc15dc0bd77bd"), () => {
      const before = [...this.slots]; this.slots = [null, null, null]; this.choice = null;
      playPuzzlePaperChange(this, before, this.slots); this.clearFeedback(); this.render();
    });
    this.button(this.root, 745, 988, 320, 42, __dialogueText("scenes/AlibiTimelineScene.js", "t_e3011fe4524c6c13c662"), () => this.checkDeduction());
  }
  placeCard(id) {
    if (this.solved || this.slots.includes(id)) return;
    const index = this.slots.indexOf(null);
    if (index < 0) { this.setFeedback(__dialogueText("scenes/AlibiTimelineScene.js", "t_53c0b80add54b4cb2c09"), FEEDBACK_ERROR); return; }
    const before = [...this.slots]; this.slots[index] = id;
    playPuzzlePaperChange(this, before, this.slots); this.clearFeedback(); this.render();
  }
  setFeedback(message, color = FEEDBACK_NORMAL) {
    this.feedback = message; this.feedbackColor = color;
    this.messageText?.setText(message).setColor(this.feedbackColor);
  }
  checkDeduction() {
    if (this.busy || this.solved || this.modal) return;
    this.busy = true;
    try {
      const result = fileAlibiConclusion(this.caseKey, this.suspectId, [...this.slots], this.choice);
      if (!result.accepted) { this.setFeedback(result.message, FEEDBACK_ERROR); return; }
      this.result = result.status; this.solved = true;
      if (!result.alreadyFiled) playPuzzleSfx(this, 'stamp', 0.4);
      if (result.alreadyFiled) this.loadBoard();
      if (result.status === 'contradicted') { advanceCrimeTutorial(gameState, 'find_liar'); saveGameState(); }
      this.feedback = __dialogueText("scenes/AlibiTimelineScene.js", "t_08a9e22566f94f52d6ce"); this.feedbackColor = FEEDBACK_SUCCESS; this.render();
    } catch (error) {
      console.error('[AlibiTimelineScene] Filing failed:', error);
      const filed = getFiledAlibiConclusion(this.caseKey, this.suspectId);
      if (filed) { this.result = filed.status; this.solved = true; this.loadBoard(); this.render(); }
      this.setFeedback(__dialogueText("scenes/AlibiTimelineScene.js", "t_2f258c45e5f6003f651b"), FEEDBACK_ERROR);
    } finally { this.busy = false; }
  }
  createModal() {
    this.modal?.destroy(true); this.modal = this.add.container(0, 0); this.root.add(this.modal);
    this.modal.add(this.add.rectangle(W / 2, H / 2, W, H, 0x171b22, 0.99).setInteractive());
    return this.modal;
  }
  closeModal() { this.modal?.destroy(true); this.modal = null; }
  getRevision(witness) {
    return gameState.caseData?.alibiCases?.[this.caseKey]?.cooperation?.[witness.encounterId]?.revisedStatement || null;
  }
  openStatements(index) {
    const witness = this.witnesses[index]; if (!witness) return;
    playPuzzleSfx(this, 'page', 0.25);
    const modal = this.createModal(), card = witness.timelineCard;
    this.text(modal, 55, 45, `${index + 1}/3 — ${witness.role}`, 990, { fontSize: '29px', color: '#fff0ce' });
    const timeDetail = this.text(modal, 55, 100, getAlibiTimeDetail(this.caseKey, this.suspectId, card),
      990, { fontSize: '20px', color: '#e9bd72', lineSpacing: 4 });
    this.fitText(timeDetail, 145, 16);
    const revision = this.getRevision(witness);
    const content = [__dialogueText("scenes/AlibiTimelineScene.js", "t_33b0209164f8a5558c16"), witness.statement, revision ? __dialogueText("scenes/AlibiTimelineScene.js", "t_77912493b65c5fb3365d") + revision : ''].filter(Boolean).join('\n\n');
    const statement = this.text(modal, 55, 270, content, 990, { fontSize: '25px', color: '#fff0ce', lineSpacing: 7 });
    this.fitText(statement, 605, 15);
    this.button(modal, 55, 935, 250, 55, __dialogueText("scenes/AlibiTimelineScene.js", "t_a57b08a480b822a0a572"), () => this.openStatements((index + 2) % 3));
    this.button(modal, 425, 935, 250, 55, __dialogueText("scenes/AlibiTimelineScene.js", "t_7d9eb7acb13e24625c40"), () => this.closeModal());
    this.button(modal, 795, 935, 250, 55, __dialogueText("scenes/AlibiTimelineScene.js", "t_1ff57a29d7c9d11bdf61"), () => this.openStatements((index + 1) % 3));
  }
  openTimeComparison() {
    const modal = this.createModal();
    this.text(modal, 45, 35, __dialogueText("scenes/AlibiTimelineScene.js", "t_b01dd75227a22fe415ca"), 1010,
      { fontFamily: 'PressStart2P', fontSize: '17px', color: '#fff0ce' });
    this.text(modal, 45, 85, __dialogueText("scenes/AlibiTimelineScene.js", "t_17ca864989f85806040b"), 1010,
      { fontSize: '20px', color: '#fff0ce' });
    const rows = this.witnesses.map(witness => {
      const card = witness.timelineCard;
      return { witness, card, note: getAlibiTimeNote(this.caseKey, this.suspectId, card) };
    });
    const allTimes = [this.crimeWindow.startMinute, this.crimeWindow.endMinute];
    rows.forEach(row => {
      if (row.note.eventTime !== null) allTimes.push(row.note.eventTime);
      row.note.ranges.forEach(range => allTimes.push(range.startMinute, range.endMinute));
    });
    const minimum = Math.max(0, Math.min(...allTimes) - 5), maximum = Math.min(1439, Math.max(...allTimes) + 5);
    const left = 95, right = 1015, width = right - left, top = 185, bottom = 785;
    const xFor = minute => left + ((minute - minimum) / Math.max(1, maximum - minimum)) * width;
    const crimeLeft = xFor(this.crimeWindow.startMinute), crimeRight = xFor(this.crimeWindow.endMinute);
    modal.add(this.add.rectangle((crimeLeft + crimeRight) / 2, (top + bottom) / 2,
      Math.max(2, crimeRight - crimeLeft), bottom - top, 0xa95045, 0.25));
    this.text(modal, 45, 125, __dialogueText("scenes/AlibiTimelineScene.js", "t_0e891836b007fcc4c79e") +
      `${formatNoteTime(this.crimeWindow.startMinute)}–${formatNoteTime(this.crimeWindow.endMinute)}`,
      1010, { fontSize: '20px', color: '#f0a79b' });
    for (let index = 0; index <= 6; index++) {
      const minute = Math.round(minimum + ((maximum - minimum) * index) / 6), x = xFor(minute);
      modal.add(this.add.rectangle(x, (top + bottom) / 2, 1, bottom - top, 0x897b64, 0.45));
      this.text(modal, x - 32, 165, formatNoteTime(minute), 70, { fontSize: '16px', color: '#dfd2b8' });
    }
    rows.forEach((row, index) => {
      const y = 265 + index * 190, revision = this.getRevision(row.witness);
      this.text(modal, 55, y - 48, `${index + 1}. ${row.witness.role}` + (revision ? __dialogueText("scenes/AlibiTimelineScene.js", "t_212b7e6781cac95b630a") : ''),
        990, { fontSize: '21px', color: '#fff0ce' });
      modal.add(this.add.rectangle((left + right) / 2, y, width, 2, 0x897b64));
      row.note.ranges.forEach(range => {
        const start = xFor(range.startMinute), end = xFor(range.endMinute);
        modal.add(this.add.rectangle((start + end) / 2, y, Math.max(3, end - start), 24,
          revision ? 0x8a8170 : 0xd4ac61).setStrokeStyle(1, 0xffe1a0));
      });
      if (row.note.eventTime !== null) modal.add(this.add.rectangle(xFor(row.note.eventTime), y, 12, 12, 0xfff0ce).setAngle(45));
      const detail = this.text(modal, 55, y + 30, row.note.ranges.length ? row.note.ranges.map(range =>
        `${formatNoteTime(range.startMinute)}–${formatNoteTime(range.endMinute)}: ` + range.label).join('\n') :
        `${row.note.eventLabel}${__dialogueText("scenes/AlibiTimelineScene.js", "t_3088d3c012e7ccae2e12")}`,
        990, { fontSize: '19px', color: '#dfd2b8' });
      this.fitText(detail, 90, 15);
    });
    this.text(modal, 55, 825, __dialogueText("scenes/AlibiTimelineScene.js", "t_963f3674a8d912974eb0"),
      990, { fontSize: '21px', color: '#fff0ce' });
    this.button(modal, 390, 935, 320, 55, __dialogueText("scenes/AlibiTimelineScene.js", "t_4250d0391d0e484ba87d"), () => this.closeModal());
  }
  async returnToCity() {
    if (this.busy || this._cleanupDone || this.modal) return;
    this.busy = true;
    try {
      const opened = await this.goto(this.returnScene, this.returnData);
      if (!opened && !this._cleanupDone) {
        this.busy = false; this.setFeedback(__dialogueText("scenes/AlibiTimelineScene.js", "t_0ea9229f60182a513311"), FEEDBACK_ERROR);
      }
    } catch (error) {
      console.error('[AlibiTimelineScene] Navigation failed:', error);
      if (!this._cleanupDone) {
        this.busy = false; this.setFeedback(__dialogueText("scenes/AlibiTimelineScene.js", "t_0ea9229f60182a513311"), FEEDBACK_ERROR);
      }
    }
  }
}
