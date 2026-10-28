import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { advanceCrimeTutorial } from '../CrimeCityTutorial.js';

import {
  allWitnessesVisited,
  getWitnessTestimony,
  getTimelineBoardData,
  NO_ALIBI_LIAR
} from '../alibi/AlibiEncounterSetup.js';

import {
  getFiledAlibiConclusion,
  fileAlibiConclusion
} from '../alibi/AlibiConclusion.js';

import {
  AlibiDeductionController
} from '../alibi/AlibiDeductionController.js';

import {
  formatNoteTime,
  getAlibiTimeNote,
  getAlibiTimeDetail,
  getAlibiCardBody
} from '../alibi/AlibiTimeNotes.js';

const W = 1100;
const H = 1040;

export class AlibiTimelineScene extends BaseScene {
  constructor() {
    super({ key: 'AlibiTimelineScene' });
  }

  init(data = {}) {
    this.caseKey = data.caseKey || null;
    this.suspectId = data.suspectId || null;
    this.cityId = data.cityId || null;

    this.returnScene = data.returnScene || 'CrimeCityScene';
    this.returnData = data.returnData || {
      cityId: this.cityId
    };

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

    this.deduction = new AlibiDeductionController(this);
  }

  create() {
    super.create();

    this.stopSceneIfActive('NewsHud');
    this.getPlayerHudScene()?.closeAllUIPanels?.();

    this.cameras.main.resetFX();
    this.cameras.main
      .setAlpha(1)
      .setBackgroundColor('#171b22');

    this.trackInputEvent(
      this.scale,
      'resize',
      this.fitView,
      this
    );

    try {
      this.loadBoard();
      this.render();
    } catch (error) {
      console.error(
        '[AlibiTimelineScene] Cannot open board:',
        error
      );

      this.createRoot();

      this.text(
        this.root,
        60,
        160,
        'The alibi board is unavailable. ' +
          'Complete all three interviews first.',
        960,
        { fontSize: '26px' }
      );

      this.button(
        this.root,
        30,
        975,
        260,
        48,
        'Return to city',
        () => void this.returnToCity()
      );
    }
  }

  loadBoard() {
    if (
      !this.caseKey ||
      !this.suspectId ||
      !allWitnessesVisited(this.caseKey, this.suspectId)
    ) {
      throw new Error('Incomplete interviews or missing case.');
    }

    const board = getTimelineBoardData(
      this.caseKey,
      this.suspectId
    );

    if (
      board.boardCards?.length !== 3 ||
      !board.crimeWindow
    ) {
      throw new Error('Incomplete board data.');
    }

    this.cards = board.boardCards;
    this.crimeWindow = board.crimeWindow;

    const encounters =
      gameState.crimeCityEncounterState?.[this.caseKey] || [];

    this.witnesses = encounters
      .filter(entry =>
        entry.suspectId === this.suspectId &&
        entry.alibiWitness === true
      )
      .map(entry => getWitnessTestimony(
        this.caseKey,
        this.suspectId,
        entry.npcId
      ));

    if (
      this.witnesses.length !== 3 ||
      this.witnesses.some(witness => !witness)
    ) {
      throw new Error('Missing witness statements.');
    }

    this.suspectName =
      this.witnesses[0].suspectName || 'the suspect';

    const filed = getFiledAlibiConclusion(
      this.caseKey,
      this.suspectId
    );

    if (filed) {
      this.solved = true;
      this.result = filed.status;
      this.choice = filed.choice;

      if (filed.timelineIds.length === 3) {
        this.slots = [...filed.timelineIds];
      }
    }
  }

  createRoot() {
    this.modal = null;
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);

    this.root.add(
      this.add.rectangle(
        W / 2,
        H / 2,
        W - 16,
        H - 16,
        0xede1c4
      ).setStrokeStyle(3, 0x8a7350)
    );

    this.fitView();
  }

  fitView() {
    if (!this.root) return;

    const scale = Math.min(
      this.scale.width / W,
      this.scale.height / H
    );

    this.root.setScale(scale).setPosition(
      (this.scale.width - W * scale) / 2,
      (this.scale.height - H * scale) / 2
    );
  }

  text(parent, x, y, content, width, options = {}) {
    const object = this.add.text(x, y, content, {
      fontFamily: 'SpecialElite',
      fontSize: '19px',
      color: '#382e24',
      wordWrap: { width },
      ...options
    });

    parent.add(object);
    return object;
  }

  fitText(object, maxHeight, minimum = 14) {
    while (
      object.height > maxHeight &&
      parseInt(object.style.fontSize, 10) > minimum
    ) {
      object.setFontSize(
        parseInt(object.style.fontSize, 10) - 1
      );
    }

    return object;
  }

  button(
    parent,
    x,
    y,
    width,
    height,
    label,
    callback,
    { selected = false, disabled = false } = {}
  ) {
    const fill = selected ? 0x846a3f : 0x493d30;

    const background = this.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      fill
    ).setStrokeStyle(
      selected ? 4 : 2,
      selected ? 0xe2bd71 : 0x9b815b
    );

    parent.add(background);

    const labelObject = this.text(
      parent,
      x + 10,
      y + height / 2,
      label,
      width - 20,
      {
        fontSize: '18px',
        color: '#fff3d6',
        align: 'center'
      }
    ).setOrigin(0, 0.5);

    labelObject.setFixedSize(width - 20, 0);
    this.fitText(labelObject, height - 8, 14);

    if (disabled) {
      background.setAlpha(0.5);
      return;
    }

    background
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        background.setFillStyle(0x705c42);
      })
      .on('pointerout', () => {
        background.setFillStyle(fill);
      })
      .on('pointerdown', () => {
        if (!this.busy) callback();
      });
  }

  getChoices() {
    return [
      ...this.witnesses.map(witness => ({
        id: witness.npcId,
        label: `${witness.role} is lying`
      })),
      {
        id: NO_ALIBI_LIAR,
        label: 'Nobody lies: the alibi holds'
      }
    ];
  }

  cardBody(card) {
    return getAlibiCardBody(
      this.caseKey,
      this.suspectId,
      card
    );
  }

  render() {
    this.createRoot();

    this.text(
      this.root,
      30,
      24,
      'ALIBI BOARD',
      650,
      {
        fontFamily: 'PressStart2P',
        fontSize: '18px'
      }
    );

    this.text(
      this.root,
      30,
      60,
      `Suspect: ${this.suspectName}`,
      740
    );

    this.text(
      this.root,
      30,
      92,
      `Theft: ${formatNoteTime(this.crimeWindow.startMinute)}–` +
        `${formatNoteTime(this.crimeWindow.endMinute)}`,
      740
    );

    this.button(
      this.root,
      815,
      25,
      250,
      42,
      'Read statements',
      () => this.openStatements(0)
    );

    this.button(
      this.root,
      815,
      78,
      250,
      42,
      'Compare times',
      () => this.openTimeComparison()
    );

    if (this.solved) {
      this.renderFiledConclusion();
      this.drawFooter();
      return;
    }

    this.text(
      this.root,
      30,
      135,
      '1. Order the event times, earliest first. Intervals show how long each account covers.',
      1030,
      { fontSize: '18px' }
    );

    this.slots.forEach((id, index) => {
      const card = this.cards.find(item => item.id === id);

      this.drawCard(
        30 + index * 355,
        175,
        330,
        170,
        card?.role || ['EARLIEST', 'MIDDLE', 'LATEST'][index],
        card
          ? this.cardBody(card)
          : 'Click a witness card below.',
        () => {
          this.slots[index] = null;
          this.feedback = '';
          this.render();
        }
      );

      this.button(
        this.root,
        30 + index * 355,
        355,
        330,
        40,
        this.deduction.label('timeline', index),
        () => this.deduction.run('timeline', index)
      );
    });

    this.text(
      this.root,
      30,
      403,
      'Click a placed card to take it back before filing.',
      1020,
      { fontSize: '17px' }
    );

    this.cards.forEach((card, index) => {
      const placed = this.slots.includes(card.id);

      this.drawCard(
        30 + index * 355,
        435,
        330,
        170,
        card.role,
        placed
          ? 'Placed on the timeline.'
          : this.cardBody(card),
        () => this.placeCard(card.id),
        placed
      );
    });

    this.text(
      this.root,
      30,
      620,
      '2. Choose your conclusion.',
      1000
    );

    this.getChoices().forEach((choice, index) => {
      this.button(
        this.root,
        30 + (index % 2) * 535,
        655 + Math.floor(index / 2) * 65,
        510,
        54,
        this.choice === choice.id
          ? `>> ${choice.label} <<`
          : choice.label,
        () => {
          this.choice = choice.id;
          this.feedback = '';
          this.render();
        },
        { selected: this.choice === choice.id }
      );
    });

    this.button(
      this.root,
      30,
      790,
      510,
      42,
      this.deduction.label('conclusion'),
      () => this.deduction.run('conclusion')
    );

    this.text(
      this.root,
      560,
      790,
      'Checks review the draft. They do not file a report.',
      500,
      { fontSize: '17px' }
    );

    this.text(
      this.root,
      30,
      845,
      this.deduction.summaryText(),
      1030,
      { fontSize: '17px' }
    );

    this.text(
      this.root,
      30,
      878,
      'Filing is final. Your report cannot be changed afterwards.',
      1030,
      { fontSize: '17px' }
    );

    this.drawFooter();
  }

  renderFiledConclusion() {
    this.text(
      this.root,
      70,
      195,
      'CONCLUSION FILED',
      960,
      {
        fontFamily: 'PressStart2P',
        fontSize: '23px',
        align: 'center'
      }
    );

    const choice = this.getChoices().find(
      item => item.id === this.choice
    );

    this.text(
      this.root,
      80,
      265,
      `Your assessment: ${
        this.result === 'confirmed'
          ? 'alibi accepted'
          : 'alibi challenged'
      }.\n\n` +
      (choice
        ? `Recorded conclusion: ${choice.label}.\n\n`
        : '') +
      'This report is final and cannot be amended.',
      940,
      {
        fontSize: '25px',
        align: 'center',
        lineSpacing: 8
      }
    );

    const ordered = this.slots
      .map(id => this.cards.find(card => card.id === id))
      .filter(Boolean);

    if (ordered.length === 3) {
      const timeline = this.text(
        this.root,
        70,
        490,
        'Filed timeline:\n\n' +
          ordered.map((card, index) =>
            `${index + 1}. ${card.role}\n${this.cardBody(card)}`
          ).join('\n\n'),
        960,
        { fontSize: '20px' }
      );

      this.fitText(timeline, 380, 15);
    }
  }

  drawCard(
    x,
    y,
    width,
    height,
    title,
    body,
    callback,
    disabled = false
  ) {
    const background = this.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      disabled ? 0xd2c5aa : 0xfff5dc
    ).setStrokeStyle(2, 0xa38b63);

    this.root.add(background);

    const heading = this.text(
      this.root,
      x + 15,
      y + 10,
      String(title).toUpperCase(),
      width - 30,
      { fontSize: '18px' }
    );

    this.fitText(heading, 35, 13);

    const content = this.text(
      this.root,
      x + 15,
      y + 48,
      body,
      width - 30,
      { fontSize: '18px', lineSpacing: 3 }
    );

    this.fitText(content, height - 58, 13);

    if (!disabled) {
      background
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (!this.busy && !this.solved && !this.modal) {
            callback();
          }
        });
    }
  }

  drawFooter() {
    this.messageText = this.text(
      this.root,
      30,
      914,
      this.feedback,
      1030,
      {
        fontSize: '17px',
        color: this.feedbackColor
      }
    );

    this.button(
      this.root,
      30,
      988,
      245,
      42,
      'Return to city',
      () => void this.returnToCity()
    );

    if (this.solved) return;

    this.button(
      this.root,
      425,
      988,
      180,
      42,
      'Clear draft',
      () => {
        this.slots = [null, null, null];
        this.choice = null;
        this.feedback = '';
        this.render();
      }
    );

    this.button(
      this.root,
      745,
      988,
      320,
      42,
      'FILE CONCLUSION',
      () => this.checkDeduction()
    );
  }

  placeCard(id) {
    if (this.solved || this.slots.includes(id)) return;

    const index = this.slots.indexOf(null);

    if (index < 0) {
      this.setFeedback(
        'The timeline is full. Remove a card first.'
      );
      return;
    }

    this.slots[index] = id;
    this.feedback = '';
    this.render();
  }

  setFeedback(message) {
    this.feedback = message;
    this.feedbackColor = '#594a36';

    this.messageText
      ?.setText(message)
      .setColor(this.feedbackColor);
  }

  checkDeduction() {
    if (this.busy || this.solved || this.modal) return;

    this.busy = true;

    try {
      const result = fileAlibiConclusion(
        this.caseKey,
        this.suspectId,
        [...this.slots],
        this.choice
      );

      if (!result.accepted) {
        this.setFeedback(result.message);
        return;
      }

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
      console.error(
        '[AlibiTimelineScene] Filing failed:',
        error
      );

      const filed = getFiledAlibiConclusion(
        this.caseKey,
        this.suspectId
      );

      if (filed) {
        this.result = filed.status;
        this.solved = true;
        this.loadBoard();
        this.render();
      }

      this.setFeedback(
        'The report could not be fully saved. Check the console.'
      );
    } finally {
      this.busy = false;
    }
  }

  createModal() {
    this.modal?.destroy(true);

    this.modal = this.add.container(0, 0);
    this.root.add(this.modal);

    this.modal.add(
      this.add.rectangle(
        W / 2,
        H / 2,
        W,
        H,
        0x171b22,
        0.99
      ).setInteractive()
    );

    return this.modal;
  }

  closeModal() {
    this.modal?.destroy(true);
    this.modal = null;
  }

  getRevision(witness) {
    return gameState.caseData?.alibiCases?.[this.caseKey]
      ?.cooperation?.[witness.encounterId]
      ?.revisedStatement || null;
  }

  openStatements(index) {
    const witness = this.witnesses[index];

    if (!witness) return;

    const modal = this.createModal();
    const card = witness.timelineCard;

    this.text(
      modal,
      55,
      45,
      `${index + 1}/3 — ${witness.role}`,
      990,
      {
        fontSize: '29px',
        color: '#fff0ce'
      }
    );

    const timeDetail = this.text(
      modal,
      55,
      100,
      getAlibiTimeDetail(
        this.caseKey,
        this.suspectId,
        card
      ),
      990,
      {
        fontSize: '20px',
        color: '#e9bd72',
        lineSpacing: 4
      }
    );

    this.fitText(timeDetail, 145, 16);

    const revision = this.getRevision(witness);

    const content = [
      'ORIGINAL ACCOUNT',
      witness.statement,
      revision
        ? '\nREVISED ACCOUNT\n' + revision
        : ''
    ].filter(Boolean).join('\n\n');

    const statement = this.text(
      modal,
      55,
      270,
      content,
      990,
      {
        fontSize: '25px',
        color: '#fff0ce',
        lineSpacing: 7
      }
    );

    this.fitText(statement, 605, 15);

    this.button(
      modal,
      55,
      935,
      250,
      55,
      'Previous',
      () => this.openStatements((index + 2) % 3)
    );

    this.button(
      modal,
      425,
      935,
      250,
      55,
      'Close',
      () => this.closeModal()
    );

    this.button(
      modal,
      795,
      935,
      250,
      55,
      'Next',
      () => this.openStatements((index + 1) % 3)
    );
  }

  openTimeComparison() {
    const modal = this.createModal();

    this.text(
      modal,
      45,
      35,
      'COMPARE WITNESS ACCOUNTS',
      1010,
      {
        fontFamily: 'PressStart2P',
        fontSize: '17px',
        color: '#fff0ce'
      }
    );

    this.text(
      modal,
      45,
      85,
      'Bars = stated intervals. Diamond = event used to order the cards.',
      1010,
      {
        fontSize: '20px',
        color: '#fff0ce'
      }
    );

    const rows = this.witnesses.map(witness => {
      const card = witness.timelineCard;

      return {
        witness,
        card,
        note: getAlibiTimeNote(
          this.caseKey,
          this.suspectId,
          card
        )
      };
    });

    const allTimes = [
      this.crimeWindow.startMinute,
      this.crimeWindow.endMinute
    ];

    rows.forEach(row => {
      if (row.note.eventTime !== null) {
        allTimes.push(row.note.eventTime);
      }

      row.note.ranges.forEach(range => {
        allTimes.push(
          range.startMinute,
          range.endMinute
        );
      });
    });

    const minimum = Math.max(
      0,
      Math.min(...allTimes) - 5
    );

    const maximum = Math.min(
      1439,
      Math.max(...allTimes) + 5
    );

    const left = 95;
    const right = 1015;
    const width = right - left;
    const top = 185;
    const bottom = 785;

    const xFor = minute =>
      left +
      ((minute - minimum) / Math.max(1, maximum - minimum)) *
        width;

    const crimeLeft = xFor(this.crimeWindow.startMinute);
    const crimeRight = xFor(this.crimeWindow.endMinute);

    modal.add(
      this.add.rectangle(
        (crimeLeft + crimeRight) / 2,
        (top + bottom) / 2,
        Math.max(2, crimeRight - crimeLeft),
        bottom - top,
        0xa95045,
        0.25
      )
    );

    this.text(
      modal,
      45,
      125,
      `Shaded area: theft window ` +
        `${formatNoteTime(this.crimeWindow.startMinute)}–` +
        `${formatNoteTime(this.crimeWindow.endMinute)}`,
      1010,
      {
        fontSize: '20px',
        color: '#f0a79b'
      }
    );

    for (let index = 0; index <= 6; index++) {
      const minute = Math.round(
        minimum + ((maximum - minimum) * index) / 6
      );

      const x = xFor(minute);

      modal.add(
        this.add.rectangle(
          x,
          (top + bottom) / 2,
          1,
          bottom - top,
          0x897b64,
          0.45
        )
      );

      this.text(
        modal,
        x - 32,
        165,
        formatNoteTime(minute),
        70,
        {
          fontSize: '16px',
          color: '#dfd2b8'
        }
      );
    }

    rows.forEach((row, index) => {
      const y = 265 + index * 190;
      const revision = this.getRevision(row.witness);

      this.text(
        modal,
        55,
        y - 48,
        `${index + 1}. ${row.witness.role}` +
          (revision ? ' — original account withdrawn' : ''),
        990,
        {
          fontSize: '21px',
          color: '#fff0ce'
        }
      );

      modal.add(
        this.add.rectangle(
          (left + right) / 2,
          y,
          width,
          2,
          0x897b64
        )
      );

      row.note.ranges.forEach(range => {
        const start = xFor(range.startMinute);
        const end = xFor(range.endMinute);

        modal.add(
          this.add.rectangle(
            (start + end) / 2,
            y,
            Math.max(3, end - start),
            24,
            revision ? 0x8a8170 : 0xd4ac61
          ).setStrokeStyle(1, 0xffe1a0)
        );
      });

      if (row.note.eventTime !== null) {
        modal.add(
          this.add.rectangle(
            xFor(row.note.eventTime),
            y,
            12,
            12,
            0xfff0ce
          ).setAngle(45)
        );
      }

      const detail = this.text(
        modal,
        55,
        y + 30,
        row.note.ranges.length
          ? row.note.ranges.map(range =>
              `${formatNoteTime(range.startMinute)}–` +
              `${formatNoteTime(range.endMinute)}: ` +
              `${range.label}`
            ).join('\n')
          : `${row.note.eventLabel}. ` +
            'No bounded observation interval stated.',
        990,
        {
          fontSize: '19px',
          color: '#dfd2b8'
        }
      );

      this.fitText(detail, 90, 15);
    });

    this.text(
      modal,
      55,
      825,
      'Overlapping times do not prove an account is true. ' +
        'Compare the person observed, the place and the date as well.',
      990,
      {
        fontSize: '21px',
        color: '#fff0ce'
      }
    );

    this.button(
      modal,
      390,
      935,
      320,
      55,
      'Back to alibi board',
      () => this.closeModal()
    );
  }

  async returnToCity() {
    if (this.busy || this._cleanupDone || this.modal) return;

    this.busy = true;

    try {
      const opened = await this.goto(
        this.returnScene,
        this.returnData
      );

      if (!opened && !this._cleanupDone) {
        this.busy = false;
        this.setFeedback(
          'Could not return to the city. Try again.'
        );
      }
    } catch (error) {
      console.error(
        '[AlibiTimelineScene] Navigation failed:',
        error
      );

      if (!this._cleanupDone) {
        this.busy = false;
        this.setFeedback(
          'Could not return to the city. Try again.'
        );
      }
    }
  }
}