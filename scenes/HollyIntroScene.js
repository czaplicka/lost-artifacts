import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { moneyManager, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';

const OPENING_LINES = [
  { speaker: 'HOLLY', text: 'Mark Agency says my husband is gone.' },
  { speaker: 'DETECTIVE', text: 'Gone as in missing, or gone as in paperwork already gave up?' },
  { speaker: 'HOLLY', text: 'They used careful words. That is how institutions lie politely.' },
  { speaker: 'DETECTIVE', text: 'Start from the beginning.' },
  { speaker: 'HOLLY', text: 'John worked recovery. Stolen artefacts, private contracts, bad coffee, worse secrets.' },
  { speaker: 'DETECTIVE', text: 'Mark Agency.' },
  { speaker: 'HOLLY', text: 'Yes. He vanished during a job tied to the Black Lady.' },
  { speaker: 'DETECTIVE', text: 'And the Agency buried it?' },
  { speaker: 'HOLLY', text: 'They buried the questions. The man came after.' },
  { speaker: 'DETECTIVE', text: 'That line almost makes me want to charge extra.' },
  { speaker: 'HOLLY', text: 'I can help with that.' },
  { speaker: 'DETECTIVE', text: 'Now you are speaking my language.' },
  { speaker: 'HOLLY', text: 'Take the case. Find John. Find out what Mark Agency is hiding.' }
];

const CLOSING_LINES = [
  { speaker: 'HOLLY', text: 'There is one more thing. Someone in Mark Agency still expects updates.' },
  { speaker: 'DETECTIVE', text: 'That sounds less like a lead and more like a trap with office furniture.' },
  { speaker: 'HOLLY', text: 'I never said it was a safe case.' },
  { speaker: 'DETECTIVE', text: 'Good. Safe cases are usually boring.' }
];

const CHOICES = [
  {
    id: 'cash',
    label: 'Cash advance',
    desc: '+250 cash'
  },
  {
    id: 'rest',
    label: 'Rest voucher',
    desc: '+2 rest vouchers'
  },
  {
    id: 'kit',
    label: 'Field kit',
    desc: '+2 investigation assists'
  },
  {
    id: 'travel',
    label: 'Travel fund',
    desc: '+2 free transfers'
  }
];

export class HollyIntroScene extends BaseScene {
  constructor() {
    super('HollyIntroScene');

    this.returnScene = 'HotelScene';
    this.returnData = {};

    this.phase = 'idle';
    this.dialogIndex = 0;
    this.currentLines = [];
    this.nextPhaseAfterDialogue = null;
    this.choiceNodes = [];
    this.video = null;
    this.hollyPortrait = null;

    this.boundAdvanceDialogue = this.handleDialogueAdvance.bind(this);
  }

  init(data = {}) {
    this.returnScene = data.returnScene || 'HotelScene';
    this.returnData =
      data.returnData && typeof data.returnData === 'object'
        ? { ...data.returnData }
        : {};
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#000000');

    this.bg = this.add
      .rectangle(0, 0, width, height, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(0);

    this.overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setDepth(8)
      .setVisible(false);

    this.dialogPanel = this.add
      .rectangle(width / 2, height - 138, width - 56, 220, 0x111111, 0.96)
      .setStrokeStyle(3, 0x8b6b3f, 1)
      .setDepth(10)
      .setVisible(false);

    this.nameText = this.add
      .text(42, height - 236, '', {
        fontFamily: 'SpecialElite',
        fontSize: '30px',
        color: '#d7c29a'
      })
      .setDepth(11)
      .setVisible(false);

    this.dialogText = this.add
      .text(42, height - 190, '', {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#f4ead7',
        wordWrap: { width: width - 320 }
      })
      .setDepth(11)
      .setVisible(false);

    this.continueText = this.add
      .text(width - 40, height - 30, 'CLICK TO CONTINUE', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#c9b78c'
      })
      .setOrigin(1, 1)
      .setDepth(11)
      .setVisible(false);

    this.playIntroVideo();
  }

  playIntroVideo() {
    const { width, height } = this.scale;

    this.phase = 'intro-video';

    this.video = this.add.video(width / 2, height / 2, 'in').setDepth(2);

    this.video.once('complete', () => {
      if (this.video?.active) {
        this.video.destroy();
      }

      this.video = null;
      this.startDialogueBlock(OPENING_LINES, 'choices');
    });

    this.video.play(false);
  }

  showDialogueLayout() {
    const { width, height } = this.scale;

    this.overlay.setVisible(true);
    this.dialogPanel.setVisible(true);
    this.nameText.setVisible(true);
    this.dialogText.setVisible(true);
    this.continueText.setVisible(true);

    if (!this.hollyPortrait) {
      this.hollyPortrait = this.add
        .image(width - 165, height - 362, 'holly')
        .setOrigin(0.5)
        .setScale(0.42)
        .setDepth(9);
    }

    this.hollyPortrait.setVisible(true);
  }

  hideDialogueLayout() {
    this.overlay.setVisible(false);
    this.dialogPanel.setVisible(false);
    this.nameText.setVisible(false);
    this.dialogText.setVisible(false);
    this.continueText.setVisible(false);

    if (this.hollyPortrait) {
      this.hollyPortrait.setVisible(false);
    }
  }

  startDialogueBlock(lines, nextPhase) {
    this.phase = 'dialogue';
    this.currentLines = lines;
    this.nextPhaseAfterDialogue = nextPhase;
    this.dialogIndex = 0;

    this.showDialogueLayout();
    this.renderCurrentLine();

    this.input.off('pointerdown', this.boundAdvanceDialogue);
    this.input.on('pointerdown', this.boundAdvanceDialogue);
  }

  handleDialogueAdvance(pointer) {
    if (this.phase !== 'dialogue') {
      return;
    }

    const clickedChoice = this.choiceNodes.some((node) => {
      if (!node?.getBounds) {
        return false;
      }

      return Phaser.Geom.Rectangle.Contains(
        node.getBounds(),
        pointer.x,
        pointer.y
      );
    });

    if (clickedChoice) {
      return;
    }

    this.dialogIndex += 1;

    if (this.dialogIndex >= this.currentLines.length) {
      this.input.off('pointerdown', this.boundAdvanceDialogue);

      if (this.nextPhaseAfterDialogue === 'choices') {
        this.showChoices();
        return;
      }

      if (this.nextPhaseAfterDialogue === 'outro') {
        this.playOutroVideo();
        return;
      }

      return;
    }

    this.renderCurrentLine();
  }

  renderCurrentLine() {
    const line = this.currentLines[this.dialogIndex];

    this.nameText.setText(line.speaker);
    this.dialogText.setText(line.text);
  }

  showChoices() {
    this.phase = 'choices';
    this.continueText.setVisible(false);

    this.nameText.setText('HOLLY');
    this.dialogText.setText(
      'Pick one favor. I can help with money, travel, rest, or field prep.'
    );

    const { width } = this.scale;
    const startY = this.scale.height - 104;
    const spacing = 54;

    CHOICES.forEach((choice, index) => {
      const y = startY + (index * spacing);

      const box = this.add
        .rectangle(width / 2, y, width - 120, 40, 0x2a2a2a, 0.97)
        .setStrokeStyle(2, 0x8b6b3f, 1)
        .setInteractive({ useHandCursor: true })
        .setDepth(12);

      const text = this.add
        .text(60, y - 11, `${choice.label} — ${choice.desc}`, {
          fontFamily: 'SpecialElite',
          fontSize: '24px',
          color: '#f4ead7'
        })
        .setDepth(13);

      box.on('pointerover', () => {
        box.setFillStyle(0x3a3126, 1);
      });

      box.on('pointerout', () => {
        box.setFillStyle(0x2a2a2a, 0.97);
      });

      box.on('pointerdown', () => {
        this.selectChoice(choice);
      });

      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        this.selectChoice(choice);
      });

      this.choiceNodes.push(box, text);
    });
  }

  clearChoices() {
    this.choiceNodes.forEach((node) => {
      if (node?.active) {
        node.destroy();
      }
    });

    this.choiceNodes = [];
  }

  selectChoice(choice) {
    if (this.phase !== 'choices') {
      return;
    }

    this.clearChoices();
    this.applyChoice(choice);
    this.startDialogueBlock(CLOSING_LINES, 'outro');
  }

applyChoice(choice) {
  this.grantHollyChoiceReward(choice.id);

  gameState.updateState({
    hollyIntroSeen: true,
    hollyIntroPending: false,
    hollyIntroChoice: choice.id,
    johnCaseAccepted: true,
    blackLadyCaseAccepted: true
  });

  EventBus.emit('hollyIntroChoiceMade', {
    choice: choice.id
  });
}

grantHollyChoiceReward(choiceId) {
  const fullState = gameState.getState ? gameState.getState() : {};

  switch (choiceId) {
    case 'cash':
      moneyManager.addCash(250, {
        category: ECONOMY_CATEGORY.AGENCY_ADVANCE,
        description: 'Holly case advance',
        missionId: 'black-lady-main-case',
        metadata: {
          source: 'holly_intro_choice',
          choiceId
        }
      });
      break;

    case 'rest': {
      const restVouchers = Number(fullState.restVouchers || 0);
      gameState.updateState({
        restVouchers: restVouchers + 2
      });
      break;
    }

    case 'kit': {
      const investigationAssists = Number(fullState.investigationAssists || 0);
      gameState.updateState({
        investigationAssists: investigationAssists + 2
      });
      break;
    }

    case 'travel': {
      const freeTransfers = Number(fullState.freeTransfers || 0);
      gameState.updateState({
        freeTransfers: freeTransfers + 2
      });
      break;
    }

    default:
      console.warn('[HollyIntroScene] Unknown reward choice:', choiceId);
      break;
  }
}

  playOutroVideo() {
    const { width, height } = this.scale;

    this.phase = 'outro-video';

    this.hideDialogueLayout();

    this.video = this.add.video(width / 2, height / 2, 'out').setDepth(2);

    this.video.once('complete', () => {
      if (this.video?.active) {
        this.video.destroy();
      }

      this.video = null;
      this.finishScene();
    });

    this.video.play(false);
  }

  finishScene() {
    EventBus.emit('hollyIntroFinished', {
      choice: gameState.getState?.().hollyIntroChoice || null
    });

    if (this.returnScene === 'HotelScene') {
      EventBus.emit('hollySleepFinished', {
        sleepHours: this.returnData?.sleepHours || 8
      });
      return;
    }

    this.scene.start(this.returnScene, this.returnData);
  }

  shutdown() {
    this.input.off('pointerdown', this.boundAdvanceDialogue);
    this.clearChoices();

    if (this.video?.active) {
      this.video.destroy();
    }

    this.video = null;
  }
}