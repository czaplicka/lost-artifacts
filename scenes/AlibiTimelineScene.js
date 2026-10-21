// scenes/AlibiTimelineScene.js
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';

import {
  allWitnessesVisited,
  getWitnessTestimony,
  getTimelineBoardData,
  recordAlibiAccusation,
  recordAlibiConfirmation,
  resolveAlibiTimelineSuccess,
  NO_ALIBI_LIAR
} from '../alibi/AlibiEncounterSetup.js';

const VIEW_WIDTH = 1100;
const VIEW_HEIGHT = 900;

const ROLE_COLORS = {
  neighbor: 0x2f6f8f,
  coworker: 0xb9772b,
  receptionist: 0x7a4f9a
};

const ROLE_CSS = {
  neighbor: '#2f6f8f',
  coworker: '#a8651a',
  receptionist: '#7a4f9a'
};

function formatTime(minute) {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;

  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(minutes).padStart(2, '0')
  );
}

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
    this.solutionIds = [];
    this.slots = [null, null, null];
    this.choice = null;
    this.witnesses = [];

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
    this.cameras.main.setAlpha(1);
    this.cameras.main.setBackgroundColor('#171b22');

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
        '[AlibiTimelineScene] Cannot open alibi board.',
        error
      );

      this.renderError();
    }
  }

  loadBoard() {
    if (!this.caseKey || !this.suspectId) {
      throw new Error('Missing caseKey or suspectId.');
    }

    if (!allWitnessesVisited(this.caseKey, this.suspectId)) {
      throw new Error('All three interviews must be completed first.');
    }

    const data = getTimelineBoardData(
      this.caseKey,
      this.suspectId
    );

    if (
      data.boardCards?.length !== 3 ||
      data.trueTimeline?.length !== 3 ||
      !data.crimeWindow
    ) {
      throw new Error('Incomplete timeline board data.');
    }

    this.cards = data.boardCards;
    this.solutionIds = data.trueTimeline.map((card) => card.id);
    this.crimeWindow = data.crimeWindow;

    if (
      new Set(this.cards.map((card) => card.id)).size !== 3 ||
      this.solutionIds.some(
        (id) => !this.cards.some((card) => card.id === id)
      )
    ) {
      throw new Error('Invalid timeline card IDs.');
    }

    const encounters =
      gameState.crimeCityEncounterState?.[this.caseKey] || [];

    const relevant = encounters.filter(
      (entry) =>
        entry?.suspectId === this.suspectId &&
        entry.alibiWitness === true
    );

    this.witnesses = relevant.map((entry) =>
      getWitnessTestimony(
        this.caseKey,
        this.suspectId,
        entry.npcId
      )
    );

    if (
      this.witnesses.length !== 3 ||
      this.witnesses.some((witness) => !witness)
    ) {
      throw new Error('Expected three recorded witness statements.');
    }

    this.suspectName =
      this.witnesses[0].suspectName || 'the suspect';

    const suspects =
      gameState.caseSuspects?.length
        ? gameState.caseSuspects
        : gameState.suspects?.length
          ? gameState.suspects
          : gameState.suspectList || [];

    const suspect = suspects.find(
      (entry) => entry.id === this.suspectId
    );

    this.result =
      suspect?.deductionState?.alibiStatus || 'pending';

    this.solved = [
      'confirmed',
      'contradicted'
    ].includes(this.result);

    if (this.solved) {
      this.feedback = this.result === 'confirmed'
        ? 'Alibi confirmed. The suspect was elsewhere throughout the theft.'
        : 'Alibi contradicted. The suspect’s whereabouts remain unconfirmed.';

      this.feedbackColor = '#286244';
    }
  }

  createRoot() {
    this.modal = null;
    this.root?.destroy(true);

    this.root = this.add.container(0, 0);
    this.fitView();

    const background = this.add.rectangle(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      VIEW_WIDTH - 16,
      VIEW_HEIGHT - 16,
      0xede1c4
    ).setStrokeStyle(3, 0x8a7350);

    this.root.add(background);
  }

  fitView() {
    if (!this.root) {
      return;
    }

    const scale = Math.min(
      this.scale.width / VIEW_WIDTH,
      this.scale.height / VIEW_HEIGHT
    );

    this.root
      .setScale(scale)
      .setPosition(
        (this.scale.width - VIEW_WIDTH * scale) / 2,
        (this.scale.height - VIEW_HEIGHT * scale) / 2
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

  button(
    parent,
    x,
    y,
    width,
    height,
    label,
    callback,
    {
      selected = false,
      disabled = false,
      fontSize = '18px',
      selectedFill = 0x846a3f,
      selectedStroke = 0xe2bd71,
      selectedHover = 0x9a7d4a
    } = {}
  ) {
    const fill = selected ? selectedFill : 0x493d30;

    const background = this.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      fill
    ).setStrokeStyle(
      selected ? 5 : 2,
      selected ? selectedStroke : 0x9b815b
    );

    parent.add(background);

    const labelObject = this.text(
      parent,
      x + 10,
      y + height / 2,
      label,
      width - 20,
      {
        fontSize,
        color: selected ? '#ffffff' : '#fff3d6',
        align: 'center'
      }
    ).setOrigin(0, 0.5);

    labelObject.setFixedSize(width - 20, 0);

    if (disabled) {
      background.setAlpha(0.5);
      labelObject.setAlpha(0.6);
      return;
    }

    background
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        background.setFillStyle(selected ? selectedHover : 0x705c42);
      })
      .on('pointerout', () => {
        background.setFillStyle(fill);
      })
      .on('pointerdown', () => {
        if (!this.busy) {
          callback();
        }
      });
  }

  getChoices() {
    return [
      ...this.witnesses.map((witness) => ({
        id: witness.npcId,
        label: `${witness.role} is lying`,
        pickLabel: `${witness.role} is lying`,
        liar: true
      })),
      {
        id: NO_ALIBI_LIAR,
        label: 'Nobody lies: the alibi holds',
        pickLabel: 'Nobody lies, the alibi holds',
        liar: false
      }
    ];
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
      57,
      `Suspect: ${this.suspectName}`,
      680
    );

    this.text(
      this.root,
      30,
      87,
      'Theft window: ' +
      `${formatTime(this.crimeWindow.startMinute)}–` +
      `${formatTime(this.crimeWindow.endMinute)} ` +
      '(day of the theft)',
      730,
      { color: '#84372d' }
    );

    this.button(
      this.root,
      815,
      30,
      250,
      48,
      'Read statements',
      () => this.openStatements(0)
    );

    if (this.solved) {
      this.text(
        this.root,
        50,
        220,
        this.result === 'confirmed'
          ? 'THE ALIBI HOLDS'
          : 'THE ALIBI IS CONTRADICTED',
        1000,
        {
          fontFamily: 'PressStart2P',
          fontSize: '23px',
          color: '#286244',
          align: 'center'
        }
      );

      this.text(
        this.root,
        80,
        340,
        this.result === 'confirmed'
          ? 'The combined statements place the suspect elsewhere ' +
            'for the entire theft window.'
          : 'The claimed meeting conflicts with another witness’s ' +
            'account. A false alibi does not, by itself, prove the theft.',
        940,
        {
          fontSize: '27px',
          align: 'center',
          lineSpacing: 12
        }
      );

      this.drawFooter();
      return;
    }

    this.text(
      this.root,
      30,
      126,
      '1. Each card is one witness’s account. ' +
      'Put the three accounts in time order, earliest first.',
      1020
    );

    const slotNames = ['EARLIEST', 'MIDDLE', 'LATEST'];

    this.slots.forEach((cardId, index) => {
      const card = this.cards.find(
        (entry) => entry.id === cardId
      );

      this.drawCard(
        30 + index * 355,
        175,
        330,
        150,
        card ? card.role.toUpperCase() : slotNames[index],
        card
          ? card.label
          : 'Click a card below to place it here.',
        () => {
          if (!cardId) {
            return;
          }

          this.slots[index] = null;
          this.clearFeedback();
          this.render();
        },
        { selected: Boolean(card), roleId: card?.roleId }
      );
    });

    this.text(
      this.root,
      30,
      345,
      'Witness cards. Click a placed card to take it back.',
      1020,
      { fontSize: '17px' }
    );

    this.cards.forEach((card, index) => {
      const placed = this.slots.includes(card.id);

      this.drawCard(
        30 + index * 355,
        380,
        330,
        150,
        card.role.toUpperCase(),
        placed ? 'Placed on the timeline.' : card.label,
        () => this.placeCard(card.id),
        { disabled: placed, roleId: card.roleId }
      );
    });

    this.text(
      this.root,
      30,
      560,
      '2. Who is lying?',
      400
    );

    const choices = this.getChoices();
    const picked = choices.find((choice) => choice.id === this.choice);

    this.text(
      this.root,
      300,
      562,
      picked ? `Your pick: ${picked.pickLabel}` : 'Your pick: none yet',
      770,
      {
        fontSize: '19px',
        color: !picked
          ? '#594a36'
          : picked.liar
            ? '#a8321f'
            : '#286244'
      }
    );

    choices.forEach((choice, index) => {
      this.button(
        this.root,
        30 + (index % 2) * 535,
        600 + Math.floor(index / 2) * 70,
        510,
        58,
        this.choice === choice.id ? `>> ${choice.label} <<` : choice.label,
        () => {
          this.choice = choice.id;
          this.clearFeedback();
          this.render();
        },
        {
          selected: this.choice === choice.id,
          selectedFill: choice.liar ? 0xa8321f : 0x2f7d4f,
          selectedStroke: 0xffd37a,
          selectedHover: choice.liar ? 0xc13e27 : 0x3a9962
        }
      );
    });

    this.drawFooter();
  }

  drawCard(x, y, width, height, title, body, callback, options = {}) {
    const {
      selected = false,
      disabled = false,
      roleId = null
    } = options;

    const stripe = ROLE_COLORS[roleId] || 0xa38b63;
    const titleColor = ROLE_CSS[roleId] || '#594a36';

    const background = this.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      disabled ? 0xd2c5aa : selected ? 0xd7e0c5 : 0xfff5dc
    ).setStrokeStyle(selected ? 4 : 2, selected ? 0x667846 : 0xa38b63);

    this.root.add(background);

    const bar = this.add.rectangle(
      x + 7,
      y + height / 2,
      14,
      height,
      stripe
    );

    this.root.add(bar);

    this.text(
      this.root,
      x + 26,
      y + 10,
      title,
      width - 40,
      {
        fontFamily: 'PressStart2P',
        fontSize: '13px',
        color: titleColor
      }
    );

    const bodyObject = this.text(
      this.root,
      x + 26,
      y + 38,
      body,
      width - 42,
      {
        fontSize: '18px',
        lineSpacing: 2
      }
    );

    while (
      bodyObject.height > height - 50 &&
      parseInt(bodyObject.style.fontSize, 10) > 13
    ) {
      bodyObject.setFontSize(
        parseInt(bodyObject.style.fontSize, 10) - 1
      );
    }

    if (!disabled) {
      background
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (!this.busy && !this.solved) {
            callback();
          }
        });
    }
  }

  drawFooter() {
    this.messageText = this.text(
      this.root,
      30,
      795,
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
      841,
      245,
      42,
      'Return to city',
      () => {
        void this.returnToCity();
      }
    );

    if (!this.solved) {
      this.button(
        this.root,
        425,
        841,
        180,
        42,
        'Clear',
        () => {
          this.slots = [null, null, null];
          this.choice = null;
          this.clearFeedback();
          this.render();
        }
      );

      this.button(
        this.root,
        745,
        841,
        320,
        42,
        'Check deduction',
        () => this.checkDeduction()
      );
    }
  }

  placeCard(cardId) {
    if (
      this.solved ||
      this.slots.includes(cardId)
    ) {
      return;
    }

    const freeIndex = this.slots.indexOf(null);

    if (freeIndex === -1) {
      this.setFeedback(
        'The timeline is full. Click a placed card to remove it.'
      );
      return;
    }

    this.slots[freeIndex] = cardId;
    this.clearFeedback();
    this.render();
  }

  clearFeedback() {
    this.feedback = '';
    this.feedbackColor = '#594a36';
  }

  setFeedback(message, color = '#84372d') {
    this.feedback = message;
    this.feedbackColor = color;

    this.messageText
      ?.setText(message)
      .setColor(color);
  }

  checkDeduction() {
    if (this.busy || this.solved) {
      return;
    }

    if (this.slots.some((id) => id === null) || !this.choice) {
      this.setFeedback(
        'Place three cards and choose a conclusion first.'
      );
      return;
    }

    if (!allWitnessesVisited(this.caseKey, this.suspectId)) {
      this.setFeedback('Complete all three interviews first.');
      return;
    }

    const timelineCorrect = this.solutionIds.every(
      (id, index) => this.slots[index] === id
    );

    // Do not expose separate correctness feedback for the two puzzle parts.
    if (!timelineCorrect) {
      this.setFeedback(
        'The combined deduction does not hold. Recheck the cards and conclusion.'
      );
      return;
    }

    const answer = this.choice === NO_ALIBI_LIAR
      ? recordAlibiConfirmation(this.caseKey, this.suspectId)
      : recordAlibiAccusation(
          this.caseKey,
          this.suspectId,
          this.choice
        );

    if (!answer.correct) {
      this.setFeedback(
        'The combined deduction does not hold. Recheck the cards and conclusion.'
      );
      return;
    }

    const status = resolveAlibiTimelineSuccess(
      this.caseKey,
      this.suspectId
    );

    if (!['confirmed', 'contradicted'].includes(status)) {
      this.setFeedback(
        'The conclusion could not be saved. Please try again.'
      );
      return;
    }

    this.result = status;
    this.solved = true;
    this.feedback = status === 'confirmed'
      ? 'Alibi confirmed and recorded.'
      : 'Alibi contradicted and recorded.';
    this.feedbackColor = '#286244';

    this.render();
  }

  openStatements(index) {
    this.modal?.destroy(true);

    const witness = this.witnesses[index];

    if (!witness) {
      return;
    }

    this.modal = this.add.container(0, 0);
    this.root.add(this.modal);

    const blocker = this.add.rectangle(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      VIEW_WIDTH,
      VIEW_HEIGHT,
      0x171b22,
      0.95
    ).setInteractive();

    this.modal.add(blocker);

    this.text(
      this.modal,
      65,
      65,
      `${index + 1}/3 — ${witness.role}`,
      970,
      {
        fontSize: '30px',
        color: '#fff0ce'
      }
    );

    this.text(
      this.modal,
      65,
      125,
      `Regarding: ${this.suspectName}`,
      970,
      { color: '#ccbca0' }
    );

    const statement = this.text(
      this.modal,
      65,
      200,
      witness.statement,
      970,
      {
        fontSize: '27px',
        color: '#fff0ce',
        lineSpacing: 12
      }
    );

    while (
      statement.height > 470 &&
      parseInt(statement.style.fontSize, 10) > 16
    ) {
      statement.setFontSize(
        parseInt(statement.style.fontSize, 10) - 1
      );
    }

    this.button(
      this.modal,
      65,
      775,
      250,
      55,
      'Previous',
      () => this.openStatements((index + 2) % 3)
    );

    this.button(
      this.modal,
      425,
      775,
      250,
      55,
      'Close',
      () => {
        this.modal?.destroy(true);
        this.modal = null;
      }
    );

    this.button(
      this.modal,
      785,
      775,
      250,
      55,
      'Next',
      () => this.openStatements((index + 1) % 3)
    );
  }

  renderError() {
    this.createRoot();

    this.text(
      this.root,
      80,
      160,
      'The alibi board is unavailable.',
      940,
      {
        fontSize: '30px',
        color: '#84372d'
      }
    );

    this.text(
      this.root,
      80,
      235,
      'Complete all three interviews for this suspect. ' +
      'If they are already complete, check the console for missing case data.',
      940,
      {
        fontSize: '24px',
        lineSpacing: 10
      }
    );

    this.drawFooter();
  }

  async returnToCity() {
    if (this.busy || this._cleanupDone) {
      return;
    }

    this.busy = true;

    const opened = await this.goto(
      this.returnScene,
      this.returnData
    );

    if (!opened && !this._cleanupDone) {
      this.busy = false;
      this.setFeedback('Could not return to the city. Try again.');
    }
  }
}